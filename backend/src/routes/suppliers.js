const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET — listar todos os fornecedores
router.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM suppliers ORDER BY name'
    res.json(await query(sql))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fornecedores' })
  }
})

// POST — criar fornecedor
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nome obrigatório'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, cnpj, phone, email, obs } = req.body
    try {
      const result = await query(
        'INSERT INTO suppliers (name, cnpj, phone, email, obs) VALUES (?,?,?,?,?)',
        [name.trim(), cnpj || null, phone || null, email || null, obs || null]
      )
      res.status(201).json({ id: result.insertId, message: 'Fornecedor criado' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar fornecedor' })
    }
  }
)

// PUT — atualizar fornecedor
router.put('/:id', async (req, res) => {
  const { name, cnpj, phone, email, obs } = req.body
  try {
    await query(
      'UPDATE suppliers SET name=?, cnpj=?, phone=?, email=?, obs=? WHERE id=?',
      [name.trim(), cnpj || null, phone || null, email || null, obs || null, req.params.id]
    )
    res.json({ message: 'Fornecedor atualizado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' })
  }
})

// DELETE — remover fornecedor
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM suppliers WHERE id=?', [req.params.id])
    res.json({ message: 'Fornecedor removido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover fornecedor' })
  }
})

module.exports = router
