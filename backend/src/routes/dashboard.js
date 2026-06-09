const router = require('express').Router()
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /dashboard — dados consolidados para o dashboard
router.get('/', async (req, res) => {
  try {
    const [drivers]      = await query('SELECT COUNT(*) AS total FROM drivers WHERE active = 1')
    const [stockTotal]   = await query('SELECT COALESCE(SUM(qty), 0) AS total FROM stock_items')
    const [tiresTotal]   = await query('SELECT COALESCE(SUM(qty), 0) AS total FROM tire_assignments')
    const [cpSummary]    = await query(`
      SELECT
        SUM(value) AS total,
        SUM(CASE WHEN status='pendente' THEN value ELSE 0 END) AS pendente
      FROM accounts_payable
    `)
    const [crSummary]    = await query(`
      SELECT
        SUM(value) AS total,
        SUM(CASE WHEN status='pendente' THEN value ELSE 0 END) AS pendente
      FROM accounts_receivable
    `)
    const [fuelSummary]  = await query(`
      SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(liters), 0) AS liters
      FROM fuel_records
      WHERE MONTH(fuel_date) = MONTH(CURDATE()) AND YEAR(fuel_date) = YEAR(CURDATE())
    `)

    // Top motoristas por pneus
    const topDrivers = await query(`
      SELECT d.name, d.color, COALESCE(SUM(ta.qty), 0) AS tires
      FROM drivers d
      LEFT JOIN tire_assignments ta ON ta.driver_id = d.id
      WHERE d.active = 1
      GROUP BY d.id
      ORDER BY tires DESC
      LIMIT 7
    `)

    // Movimentações recentes
    const recentMovements = await query(`
      SELECT m.*, d.name AS driver_name, v.plate AS vehicle_plate, si.description AS item_name
      FROM movements m
      LEFT JOIN drivers d ON d.id = m.driver_id
      LEFT JOIN vehicles v ON v.id = m.vehicle_id
      LEFT JOIN stock_items si ON si.id = m.stock_item_id
      ORDER BY m.mov_date DESC
      LIMIT 10
    `)

    res.json({
      kpis: {
        activeDrivers:  drivers.total,
        stockTires:     stockTotal.total,
        totalTires:     tiresTotal.total,
        cpTotal:        cpSummary.total,
        cpPendente:     cpSummary.pendente,
        crTotal:        crSummary.total,
        crPendente:     crSummary.pendente,
        fuelMonth:      fuelSummary.total,
        fuelLiters:     fuelSummary.liters,
      },
      topDrivers,
      recentMovements,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao carregar dashboard' })
  }
})

module.exports = router
