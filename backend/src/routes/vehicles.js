const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    let sql = `
      SELECT v.*,
        COALESCE((SELECT SUM(m.qty) FROM movements m WHERE m.vehicle_id = v.id AND m.type = 'saida' AND m.stock_item_id IS NOT NULL), 0) AS total_tires
      FROM vehicles v
      WHERE v.active = 1
    `
    const params = []
    if (type) { sql += ' AND v.type = ?'; params.push(type) }
    sql += ' ORDER BY v.plate'
    res.json(await query(sql, params))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar veículos' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [vehicle] = await query('SELECT * FROM vehicles WHERE id = ?', [req.params.id])
    if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado' })

    const tireHistory = await query(`
      SELECT m.id, m.qty, m.mov_date, m.obs,
             si.description AS item_name, si.brand, si.status AS tire_status,
             d.name AS driver_name
      FROM movements m
      LEFT JOIN stock_items si ON si.id = m.stock_item_id
      LEFT JOIN drivers d ON d.id = m.driver_id
      WHERE m.vehicle_id = ? AND m.type = 'saida' AND m.stock_item_id IS NOT NULL
      ORDER BY m.mov_date DESC
    `, [req.params.id])

    const totalTires = tireHistory.reduce((s, h) => s + Number(h.qty), 0)
    res.json({ ...vehicle, tireHistory, total_tires: totalTires })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar veículo' })
  }
})

router.post(
  '/',
  [
    body('plate').notEmpty().withMessage('Placa obrigatória'),
    body('type').isIn(['truck', 'trailer']),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { plate, type, brand, model, year, color, renavam } = req.body
    try {
      const result = await query(
        'INSERT INTO vehicles (plate, type, brand, model, year, color, renavam) VALUES (?,?,?,?,?,?,?)',
        [plate.toUpperCase(), type, brand || null, model || null, year || null, color || null, renavam || null]
      )
      res.status(201).json({ id: result.insertId, message: 'Veículo criado' })
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Placa já cadastrada' })
      res.status(500).json({ error: 'Erro ao criar veículo' })
    }
  }
)

router.put('/:id', async (req, res) => {
  const { plate, type, brand, model, year, color, renavam, active } = req.body
  try {
    await query(
      'UPDATE vehicles SET plate=?, type=?, brand=?, model=?, year=?, color=?, renavam=?, active=? WHERE id=?',
      [plate?.toUpperCase(), type, brand || null, model || null, year || null, color || null, renavam || null, active ?? 1, req.params.id]
    )
    res.json({ message: 'Veículo atualizado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar veículo' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM vehicles WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Veículo não encontrado' })
    res.json({ message: 'Veículo excluído' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir veículo' })
  }
})

module.exports = router
