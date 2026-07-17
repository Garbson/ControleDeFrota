require('dotenv').config()

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')
const { pipeline } = require('stream/promises')
const { createGzip } = require('zlib')
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
  const args = [
    '--single-transaction',
    '--no-tablespaces',
    '--skip-lock-tables',
    `--host=${process.env.DB_HOST || 'controlefrota-mysql'}`,
    `--port=${process.env.DB_PORT || '3306'}`,
    `--user=${process.env.DB_USER}`,
    '--default-character-set=utf8mb4',
    process.env.DB_NAME || 'controlefrota',
  ]

  const child = spawn('mysqldump', args, {
    env: { ...process.env, MYSQL_PWD: process.env.DB_PASS },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr += chunk.toString() })
  const completed = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', code => code === 0
      ? resolve()
      : reject(new Error(`mysqldump falhou (${code}): ${stderr.trim()}`)))
  })

  await pipeline(child.stdout, createGzip({ level: 9 }), fs.createWriteStream(destination))
  await completed
  await run('gzip', ['-t', destination])
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
