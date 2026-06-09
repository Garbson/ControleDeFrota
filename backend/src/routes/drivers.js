const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /drivers — listar todos
router.get('/', async (req, res) => {
  try {
    const drivers = await query(`
      SELECT
        d.id, d.name, d.cpf, d.cnh, d.cnh_category, d.cnh_expiry,
        d.phone, d.active, d.color,
        dv.trailer_type,
        t.plate  AS truck_plate,
        tr.plate AS trailer_plate,
        COALESCE(SUM(ta.qty), 0) AS total_tires
      FROM drivers d
      LEFT JOIN driver_vehicles dv ON dv.driver_id = d.id AND dv.active = 1
      LEFT JOIN vehicles t  ON t.id = dv.truck_id
      LEFT JOIN vehicles tr ON tr.id = dv.trailer_id
      LEFT JOIN tire_assignments ta ON ta.driver_id = d.id
      GROUP BY d.id, dv.id, t.id, tr.id
      ORDER BY d.name
    `)
    res.json(drivers)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar motoristas' })
  }
})

// GET /drivers/:id — detalhe + histórico de pneus
router.get('/:id', async (req, res) => {
  try {
    const [driver] = await query(`
      SELECT d.*, dv.trailer_type,
        t.plate AS truck_plate, tr.plate AS trailer_plate
      FROM drivers d
      LEFT JOIN driver_vehicles dv ON dv.driver_id = d.id AND dv.active = 1
      LEFT JOIN vehicles t  ON t.id = dv.truck_id
      LEFT JOIN vehicles tr ON tr.id = dv.trailer_id
      WHERE d.id = ?
    `, [req.params.id])

    if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' })

    const tireHistory = await query(`
      SELECT ta.id, ta.brand, ta.qty, ta.type, ta.assigned_at, ta.obs,
             v.plate AS vehicle_plate
      FROM tire_assignments ta
      LEFT JOIN vehicles v ON v.id = ta.vehicle_id
      WHERE ta.driver_id = ?
      ORDER BY ta.assigned_at DESC
    `, [req.params.id])

    res.json({ ...driver, tireHistory })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar motorista' })
  }
})

// POST /drivers — criar
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nome obrigatório'),
    body('color').optional().isHexColor(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, cpf, cnh, cnh_category, cnh_expiry, phone, color } = req.body
    try {
      const result = await query(
        'INSERT INTO drivers (name, cpf, cnh, cnh_category, cnh_expiry, phone, color) VALUES (?,?,?,?,?,?,?)',
        [name, cpf || null, cnh || null, cnh_category || null, cnh_expiry || null, phone || null, color || '#2563eb']
      )
      res.status(201).json({ id: result.insertId, message: 'Motorista criado' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar motorista' })
    }
  }
)

// PUT /drivers/:id — atualizar
router.put('/:id', async (req, res) => {
  const { name, cpf, cnh, cnh_category, cnh_expiry, phone, color, active } = req.body
  try {
    await query(
      'UPDATE drivers SET name=?, cpf=?, cnh=?, cnh_category=?, cnh_expiry=?, phone=?, color=?, active=? WHERE id=?',
      [name, cpf || null, cnh || null, cnh_category || null, cnh_expiry || null, phone || null, color || '#2563eb', active ?? 1, req.params.id]
    )
    res.json({ message: 'Motorista atualizado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar motorista' })
  }
})

// DELETE /drivers/:id — desativar (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE drivers SET active = 0 WHERE id = ?', [req.params.id])
    res.json({ message: 'Motorista desativado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar motorista' })
  }
})

module.exports = router
