const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /fines — listar com filtros
router.get('/', async (req, res) => {
  try {
    const { status, driver_id, description } = req.query
    let sql = `
      SELECT f.*, d.name AS driver_name, d.color AS driver_color
      FROM fines f
      LEFT JOIN drivers d ON d.id = f.driver_id
      WHERE 1=1
    `
    const params = []
    if (status)      { sql += ' AND f.status = ?';      params.push(status) }
    if (driver_id)   { sql += ' AND f.driver_id = ?';   params.push(driver_id) }
    if (description) { sql += ' AND f.description = ?'; params.push(description) }
    sql += ' ORDER BY f.fine_date DESC'
    res.json(await query(sql, params))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar multas' })
  }
})

// GET /fines/summary
router.get('/summary', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        COUNT(*)                                          AS total,
        SUM(value)                                        AS total_value,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS count_pendente,
        SUM(CASE WHEN status = 'pendente' THEN value ELSE 0 END) AS value_pendente,
        SUM(CASE WHEN status = 'pago'     THEN 1 ELSE 0 END) AS count_pago,
        SUM(CASE WHEN status = 'pago'     THEN value ELSE 0 END) AS value_pago,
        SUM(CASE WHEN status = 'recurso'  THEN 1 ELSE 0 END) AS count_recurso
      FROM fines
    `)
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resumo' })
  }
})

// GET /fines/descriptions — códigos de multa distintos para filtro dinâmico
router.get('/descriptions', async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT description FROM fines WHERE description IS NOT NULL AND description != '' ORDER BY description`
    )
    res.json(rows.map(r => r.description))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar descrições' })
  }
})

// POST /fines — criar multa
router.post('/', [
  body('value').isFloat({ min: 0.01 }).withMessage('Valor obrigatório'),
  body('fine_date').isDate().withMessage('Data da multa obrigatória'),
  body('vehicle_plate').notEmpty().withMessage('Placa obrigatória'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { driver_id, vehicle_plate, value, fine_date, due_date, description, category, obs } = req.body
  try {
    const result = await query(
      `INSERT INTO fines (driver_id, vehicle_plate, value, fine_date, due_date, description, category, obs)
       VALUES (?,?,?,?,?,?,?,?)`,
      [driver_id || null, vehicle_plate.toUpperCase(), value, fine_date, due_date || null,
       description || null, category || 'outros', obs || null]
    )
    res.status(201).json({ id: result.insertId, message: 'Multa registrada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao registrar multa' })
  }
})

// PUT /fines/:id — editar multa
router.put('/:id', async (req, res) => {
  const { driver_id, vehicle_plate, value, fine_date, due_date, description, category, obs } = req.body
  try {
    await query(
      `UPDATE fines SET driver_id=?, vehicle_plate=?, value=?, fine_date=?, due_date=?, description=?, category=?, obs=? WHERE id=?`,
      [driver_id || null, vehicle_plate?.toUpperCase(), value, fine_date, due_date || null, description || null, category || 'outros', obs || null, req.params.id]
    )
    res.json({ message: 'Multa atualizada' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar multa' })
  }
})

// PATCH /fines/:id/pay — marcar como pago
router.patch('/:id/pay', async (req, res) => {
  const { paid_date } = req.body
  try {
    await query(
      `UPDATE fines SET status = 'pago', paid_date = ? WHERE id = ?`,
      [paid_date || new Date().toISOString().split('T')[0], req.params.id]
    )
    res.json({ message: 'Multa paga' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar multa' })
  }
})

// PATCH /fines/:id/appeal — marcar em recurso
router.patch('/:id/appeal', async (req, res) => {
  try {
    await query(`UPDATE fines SET status = 'recurso' WHERE id = ?`, [req.params.id])
    res.json({ message: 'Multa em recurso' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar multa' })
  }
})

// DELETE /fines/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM fines WHERE id = ?', [req.params.id])
    res.json({ message: 'Multa removida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover multa' })
  }
})

module.exports = router
