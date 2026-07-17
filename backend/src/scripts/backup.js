require('dotenv').config()

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')
const { once } = require('events')
const { pipeline } = require('stream/promises')
const { createGzip } = require('zlib')
const mysql = require('mysql2')
const mysqlPromise = require('mysql2/promise')
const {
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3')
const { getClient } = require('../services/r2Storage')

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${command} terminou com código ${code}: ${stderr.trim()}`))
    })
  })
}

async function createDatabaseDump(destination) {
  const database = process.env.DB_NAME || 'controlefrota'
  const connection = await mysqlPromise.createConnection({
    host: process.env.DB_HOST || 'controlefrota-mysql',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database,
    charset: 'utf8mb4',
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  })

  const gzip = createGzip({ level: 9 })
  const completed = pipeline(gzip, fs.createWriteStream(destination))
  const write = async chunk => {
    if (!gzip.write(chunk)) await once(gzip, 'drain')
  }

  try {
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT')
    const [tableRows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
    const tables = tableRows.map(row => Object.values(row)[0]).sort()

    await write(`-- ControleDeFrota backup\n-- Created: ${new Date().toISOString()}\n`)
    await write('SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n')
    await write(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '``')}\` CHARACTER SET utf8mb4;\n`)
    await write(`USE \`${database.replace(/`/g, '``')}\`;\n\n`)

    for (const table of tables) {
      const escapedTable = `\`${table.replace(/`/g, '``')}\``
      const [createRows] = await connection.query(`SHOW CREATE TABLE ${escapedTable}`)
      const createStatement = createRows[0]['Create Table']
      await write(`DROP TABLE IF EXISTS ${escapedTable};\n${createStatement};\n`)

      const [rows] = await connection.query(`SELECT * FROM ${escapedTable}`)
      if (rows.length) {
        const columns = Object.keys(rows[0])
        const escapedColumns = columns.map(column => `\`${column.replace(/`/g, '``')}\``).join(',')
        for (let index = 0; index < rows.length; index += 250) {
          const values = rows.slice(index, index + 250).map(row =>
            `(${columns.map(column => mysql.escape(row[column])).join(',')})`
          ).join(',\n')
          await write(`INSERT INTO ${escapedTable} (${escapedColumns}) VALUES\n${values};\n`)
        }
      }
      await write('\n')
    }

    await connection.query('COMMIT')
    await write('SET FOREIGN_KEY_CHECKS=1;\n-- Dump completed\n')
    gzip.end()
    await completed
    await run('gzip', ['-t', destination])
  } catch (err) {
    gzip.destroy(err)
    await completed.catch(() => {})
    await connection.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await connection.end()
  }
}

async function createUploadsArchive(destination) {
  const uploadsPath = process.env.UPLOADS_PATH || '/app/uploads'
  if (!fs.existsSync(uploadsPath)) {
    await pipeline(fs.createReadStream('/dev/null'), createGzip(), fs.createWriteStream(destination))
    return
  }
  await run('tar', ['-czf', destination, '-C', uploadsPath, '.'])
  await run('tar', ['-tzf', destination])
}

function sha256(file) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(file))
  return hash.digest('hex')
}

async function uploadAndVerify(s3, bucket, key, file, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(file),
    ContentType: contentType,
    Metadata: { sha256: sha256(file) },
  }))
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  if (Number(head.ContentLength) !== fs.statSync(file).size) {
    throw new Error(`Tamanho divergente após upload de ${key}`)
  }
}

async function pruneOldBackups(s3, bucket, retentionDays) {
  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  let continuationToken
  let removed = 0

  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'daily/',
      ContinuationToken: continuationToken,
    }))
    const expired = (page.Contents || [])
      .filter(item => item.LastModified && item.LastModified.getTime() < threshold)
      .map(item => ({ Key: item.Key }))

    if (expired.length) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: expired, Quiet: true } }))
      removed += expired.length
    }
    continuationToken = page.NextContinuationToken
  } while (continuationToken)

  return removed
}

async function backup() {
  const s3 = getClient()
  const bucket = process.env.R2_BACKUP_BUCKET
  if (!s3 || !bucket) throw new Error('Credenciais ou bucket de backup do R2 não configurados')

  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace('Z', '')
  const prefix = `daily/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'controlefrota-backup-'))
  const databaseFile = path.join(tempDir, `controlefrota-${stamp}.sql.gz`)
  const uploadsFile = path.join(tempDir, `legacy-uploads-${stamp}.tar.gz`)

  try {
    await createDatabaseDump(databaseFile)
    await createUploadsArchive(uploadsFile)

    await uploadAndVerify(s3, bucket, `${prefix}/${path.basename(databaseFile)}`, databaseFile, 'application/gzip')
    await uploadAndVerify(s3, bucket, `${prefix}/${path.basename(uploadsFile)}`, uploadsFile, 'application/gzip')

    const manifest = {
      created_at: now.toISOString(),
      database: { file: path.basename(databaseFile), bytes: fs.statSync(databaseFile).size, sha256: sha256(databaseFile) },
      legacy_uploads: { file: path.basename(uploadsFile), bytes: fs.statSync(uploadsFile).size, sha256: sha256(uploadsFile) },
      retention_days: Number(process.env.BACKUP_RETENTION_DAYS || 35),
    }
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/manifest-${stamp}.json`,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json',
    }))

    const removed = await pruneOldBackups(s3, bucket, manifest.retention_days)
    console.log(`✅ Backup concluído: ${prefix} (${removed} objeto(s) antigo(s) removido(s))`)
    return manifest
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

if (require.main === module) {
  backup().catch(err => {
    console.error('❌ Erro no backup:', err.message)
    process.exit(1)
  })
}

module.exports = { backup, createDatabaseDump, createUploadsArchive, pruneOldBackups }
