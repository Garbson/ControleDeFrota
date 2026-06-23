const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { findActiveTrip } = require('../utils/findActiveTrip')

router.use(authenticate)

// GET /payable
router.get('/', async (req, res) => {
  try {
    const { status, category, from, to } = req.query
    let sql = `
      SELECT ap.*, d.name AS driver_name, v.plate AS vehicle_plate, s.name AS supplier_name,
             CONCAT(t.origin, ' → ', t.destination) AS trip_label
      FROM accounts_payable ap
      LEFT JOIN drivers d ON d.id = ap.driver_id
      LEFT JOIN vehicles v ON v.id = ap.vehicle_id
      LEFT JOIN suppliers s ON s.id = ap.supplier_id
      LEFT JOIN trips t ON t.id = ap.trip_id
      WHERE 1=1
    `
    const params = []

    if (status)   { sql += ' AND ap.status = ?';   params.push(status) }
    if (category) { sql += ' AND ap.category = ?'; params.push(category) }
    if (from)     { sql += ' AND ap.due_date >= ?'; params.push(from) }
    if (to)       { sql += ' AND ap.due_date <= ?'; params.push(to) }

    sql += ' ORDER BY ap.due_date ASC'

    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar contas a pagar' })
  }
})

// GET /payable/summary
router.get('/summary', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        SUM(value) AS total,
        SUM(CASE WHEN status = 'pendente' THEN value ELSE 0 END) AS pendente,
        SUM(CASE WHEN status = 'pago'     THEN value ELSE 0 END) AS pago,
        SUM(CASE WHEN status = 'vencido'  THEN value ELSE 0 END) AS vencido,
        COUNT(*) AS count_total,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS count_pendente
      FROM accounts_payable
    `)
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular resumo' })
  }
})

// POST /payable
router.post(
  '/',
  [
    body('value').isFloat({ gt: 0 }).withMessage('Valor inválido'),
    body('due_date').isDate().withMessage('Data de vencimento inválida'),
    body('category').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { document, description, supplier_id, driver_id, vehicle_id, trip_id, category, value, issue_date, due_date, obs } = req.body
    try {
      // Auto-detecta viagem ativa se não vier trip_id explícito
      const refDate = issue_date || due_date
      const resolvedTripId = trip_id || await findActiveTrip(driver_id, refDate)

      const result = await query(
        `INSERT INTO accounts_payable
          (document, description, supplier_id, driver_id, vehicle_id, trip_id, category, value, issue_date, due_date, obs)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [document || null, description || null, supplier_id || null, driver_id || null,
         vehicle_id || null, resolvedTripId || null, category, value, issue_date || null, due_date, obs || null]
      )
      res.status(201).json({ id: result.insertId, message: 'Conta criada' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar conta' })
    }
  }
)

// PATCH /payable/:id/pay — marcar como pago
router.patch('/:id/pay', async (req, res) => {
  const paid_date = req.body.paid_date || new Date().toISOString().split('T')[0]
  try {
    await query(
      "UPDATE accounts_payable SET status = 'pago', paid_date = ? WHERE id = ?",
      [paid_date, req.params.id]
    )
    res.json({ message: 'Conta marcada como paga' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta' })
  }
})

// PUT /payable/:id
router.put('/:id', async (req, res) => {
  const { document, description, supplier_id, driver_id, vehicle_id, trip_id, category, value, issue_date, due_date, status, obs } = req.body
  try {
    await query(
      `UPDATE accounts_payable SET
        document=?, description=?, supplier_id=?, driver_id=?, vehicle_id=?, trip_id=?,
        category=?, value=?, issue_date=?, due_date=?, status=?, obs=?
       WHERE id=?`,
      [document || null, description || null, supplier_id || null, driver_id || null,
       vehicle_id || null, trip_id || null, category, value, issue_date || null, due_date, status, obs || null, req.params.id]
    )
    res.json({ message: 'Conta atualizada' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta' })
  }
})

// DELETE /payable/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM accounts_payable WHERE id = ?', [req.params.id])
    res.json({ message: 'Conta removida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover conta' })
  }
})

module.exports = router
