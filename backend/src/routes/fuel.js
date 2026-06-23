const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { driver_id, from, to } = req.query
    let sql = `
      SELECT fr.*, d.name AS driver_name, v.plate AS vehicle_plate
      FROM fuel_records fr
      LEFT JOIN drivers d ON d.id = fr.driver_id
      LEFT JOIN vehicles v ON v.id = fr.vehicle_id
      WHERE 1=1
    `
    const params = []
    if (driver_id) { sql += ' AND fr.driver_id = ?'; params.push(driver_id) }
    if (from)      { sql += ' AND fr.fuel_date >= ?'; params.push(from) }
    if (to)        { sql += ' AND fr.fuel_date <= ?'; params.push(to) }
    sql += ' ORDER BY fr.fuel_date DESC'
    res.json(await query(sql, params))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar combustível' })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        COUNT(*) AS total_records,
        SUM(liters) AS total_liters,
        SUM(total) AS total_value,
        AVG(total) AS avg_per_fill,
        AVG(price_liter) AS avg_price_liter
      FROM fuel_records
    `)
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular resumo' })
  }
})

router.post(
  '/',
  [
    body('liters').isFloat({ gt: 0 }),
    body('price_liter').isFloat({ gt: 0 }),
    body('fuel_date').isDate(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { driver_id, vehicle_id, liters, price_liter, station, fuel_date, obs } = req.body
    const total = parseFloat(liters) * parseFloat(price_liter)

    try {
      const result = await query(
        'INSERT INTO fuel_records (driver_id, vehicle_id, liters, price_liter, total, station, fuel_date, obs) VALUES (?,?,?,?,?,?,?,?)',
        [driver_id || null, vehicle_id || null, liters, price_liter, total.toFixed(2), station || null, fuel_date, obs || null]
      )
      res.status(201).json({ id: result.insertId, total, message: 'Abastecimento registrado' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao registrar abastecimento' })
    }
  }
)

router.put('/:id', async (req, res) => {
  const { driver_id, vehicle_id, liters, price_liter, station, fuel_date, obs } = req.body
  const total = parseFloat(liters) * parseFloat(price_liter)
  try {
    await query(
      'UPDATE fuel_records SET driver_id=?, vehicle_id=?, liters=?, price_liter=?, total=?, station=?, fuel_date=?, obs=? WHERE id=?',
      [driver_id || null, vehicle_id || null, liters, price_liter, total.toFixed(2), station || null, fuel_date, obs || null, req.params.id]
    )
    res.json({ message: 'Abastecimento atualizado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar abastecimento' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM fuel_records WHERE id = ?', [req.params.id])
    res.json({ message: 'Removido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover' })
  }
})

module.exports = router
