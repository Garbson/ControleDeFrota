const mysql = require('mysql2/promise')

let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'controlefrota',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '-04:00', // Horário de Brasília (ACT/AMT)
      charset: 'utf8mb4',
    })
  }
  return pool
}

async function query(sql, params = []) {
  const db = getPool()
  const [rows] = await db.execute(sql, params)
  return rows
}

async function testConnection() {
  try {
    await query('SELECT 1')
    console.log('✅ MySQL conectado com sucesso')
  } catch (err) {
    console.error('❌ Erro ao conectar no MySQL:', err.message)
    process.exit(1)
  }
}

async function transaction(callback) {
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    const tx = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params)
      return rows
    }
    const result = await callback(tx)
    await connection.commit()
    return result
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

module.exports = { getPool, query, testConnection, transaction }
