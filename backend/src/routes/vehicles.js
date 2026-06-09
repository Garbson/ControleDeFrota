const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    let sql = 'SELECT * FROM vehicles WHERE active = 1'
    const params = []
    if (type) { sql += ' AND type = ?'; params.push(type) }
    sql += ' ORDER BY plate'
    res.json(await query(sql, params))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar veículos' })
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

module.exports = router
