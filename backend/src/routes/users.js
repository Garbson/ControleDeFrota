const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.use(authenticate)
router.use(requireAdmin)

// GET /users — listar todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, active, created_at FROM users ORDER BY role DESC, name ASC'
    )
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// POST /users — criar novo acesso
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nome obrigatório'),
    body('email').isEmail().withMessage('E-mail inválido'),
    body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    body('role').isIn(['admin', 'operador']).withMessage('Role inválida'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, email, password, role } = req.body
    try {
      const hash = await bcrypt.hash(password, 12)
      const result = await query(
        'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
        [name, email, hash, role || 'operador']
      )
      res.status(201).json({ id: result.insertId, message: 'Usuário criado' })
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'E-mail já cadastrado' })
      res.status(500).json({ error: 'Erro ao criar usuário' })
    }
  }
)

// PUT /users/:id — atualizar nome/email/role
router.put('/:id', async (req, res) => {
  const { name, email, role } = req.body
  try {
    await query(
      'UPDATE users SET name=?, email=?, role=? WHERE id=?',
      [name, email, role || 'operador', req.params.id]
    )
    res.json({ message: 'Usuário atualizado' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'E-mail já cadastrado' })
    res.status(500).json({ error: 'Erro ao atualizar usuário' })
  }
})

// PATCH /users/:id/password — redefinir senha
router.patch('/:id/password', [
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const hash = await bcrypt.hash(req.body.password, 12)
    await query('UPDATE users SET password=? WHERE id=?', [hash, req.params.id])
    await query('DELETE FROM refresh_tokens WHERE user_id=?', [req.params.id])
    res.json({ message: 'Senha redefinida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao redefinir senha' })
  }
})

// PATCH /users/:id/toggle — ativar/desativar
router.patch('/:id/toggle', async (req, res) => {
  try {
    const [user] = await query('SELECT active FROM users WHERE id=?', [req.params.id])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    const newActive = user.active ? 0 : 1
    await query('UPDATE users SET active=? WHERE id=?', [newActive, req.params.id])
    if (!newActive) {
      await query('DELETE FROM refresh_tokens WHERE user_id=?', [req.params.id])
    }
    res.json({ active: newActive })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' })
  }
})

module.exports = router
