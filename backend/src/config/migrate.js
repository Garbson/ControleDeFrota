require('dotenv').config()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const BASELINE_VERSION = 16

function migrationNumber(file) {
  const match = file.match(/^(\d+)_/)
  return match ? Number(match[1]) : 0
}

function checksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex')
}

async function runMigrations() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'controlefrota',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort()

  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('controlefrota_schema_migrations', 60) AS acquired")
    if (!lock.acquired) throw new Error('Não foi possível obter o lock das migrations')

    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum CHAR(64) NOT NULL,
        execution_ms INT UNSIGNED NOT NULL DEFAULT 0,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    const [appliedRows] = await conn.query('SELECT filename, checksum FROM schema_migrations ORDER BY filename')

    // Instalações anteriores não possuíam controle de versão. Marcamos apenas o
    // legado conhecido (001–016); migrations novas continuam sendo executadas.
    if (appliedRows.length === 0) {
      const [legacyTables] = await conn.query("SHOW TABLES LIKE 'users'")
      if (legacyTables.length > 0) {
        for (const file of files.filter(name => migrationNumber(name) <= BASELINE_VERSION)) {
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
          await conn.query(
            'INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES (?, ?, 0)',
            [file, checksum(sql)]
          )
        }
        console.log(`📌 Banco existente identificado: baseline 001–${String(BASELINE_VERSION).padStart(3, '0')} registrado`)
      }
    }

    const [trackedRows] = await conn.query('SELECT filename, checksum FROM schema_migrations')
    const tracked = new Map(trackedRows.map(row => [row.filename, row.checksum]))

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      const currentChecksum = checksum(sql)

      if (tracked.has(file)) {
        if (tracked.get(file) !== currentChecksum) {
          throw new Error(`A migration já aplicada ${file} foi alterada. Crie uma nova migration.`)
        }
        continue
      }

      const startedAt = Date.now()
      console.log(`  ▶ ${file}`)
      await conn.query(sql)
      await conn.query(
        'INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES (?, ?, ?)',
        [file, currentChecksum, Date.now() - startedAt]
      )
      console.log(`  ✅ ${file}`)
    }

    console.log('✅ Banco de dados atualizado')
  } finally {
    await conn.query("SELECT RELEASE_LOCK('controlefrota_schema_migrations')").catch(() => {})
    await conn.end()
  }
}

if (require.main === module) {
  runMigrations().catch(err => {
    console.error('❌ Erro na migration:', err.message)
    process.exit(1)
  })
}

module.exports = { runMigrations, migrationNumber, checksum }
