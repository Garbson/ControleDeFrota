require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const { testConnection } = require('./config/database')

const authRoutes      = require('./routes/auth')
const driversRoutes   = require('./routes/drivers')
const vehiclesRoutes  = require('./routes/vehicles')
const stockRoutes     = require('./routes/stock')
const payableRoutes   = require('./routes/payable')
const receivableRoutes = require('./routes/receivable')
const fuelRoutes      = require('./routes/fuel')
const dashboardRoutes = require('./routes/dashboard')

const app = express()

// ── Segurança
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

// ── Rate limiting
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
}))
app.use('/api', rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 300,
}))

// ── Parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Logs (só em não-produção)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ── Health check (sem auth)
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Rotas
app.use('/api/auth',       authRoutes)
app.use('/api/drivers',    driversRoutes)
app.use('/api/vehicles',   vehiclesRoutes)
app.use('/api/stock',      stockRoutes)
app.use('/api/payable',    payableRoutes)
app.use('/api/receivable', receivableRoutes)
app.use('/api/fuel',       fuelRoutes)
app.use('/api/dashboard',  dashboardRoutes)

// ── 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// ── Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

// ── Start (não iniciar em modo test — supertest gerencia a porta)
const PORT = parseInt(process.env.PORT) || 4000

if (process.env.NODE_ENV !== 'test') {
  async function start() {
    await testConnection()
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`)
    })
  }
  start()
}

module.exports = app // para testes
