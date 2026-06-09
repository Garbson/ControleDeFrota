require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
  })

  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  console.log(`📦 Executando ${files.length} migration(s)...`)

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`  ▶ ${file}`)
    await conn.query(sql)
    console.log(`  ✅ ${file} — OK`)
  }

  await conn.end()
  console.log('🎉 Migrations concluídas!')
  process.exit(0)
}

migrate().catch(err => {
  console.error('❌ Erro na migration:', err.message)
  process.exit(1)
})
