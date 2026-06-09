const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, name: user.name, role: user.role }

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
  return { accessToken, refreshToken }
}

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('E-mail inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, password } = req.body

    try {
      const [user] = await query(
        'SELECT id, name, email, password, role, active FROM users WHERE email = ?',
        [email]
      )

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Credenciais inválidas' })
      }

      const match = await bcrypt.compare(password, user.password)
      if (!match) return res.status(401).json({ error: 'Credenciais inválidas' })

      const { accessToken, refreshToken } = generateTokens(user)

      // Salvar refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, refreshToken, expiresAt]
      )

      res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      })
    } catch (err) {
      console.error('Login error:', err)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
)

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token obrigatório' })

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const [stored] = await query(
      'SELECT rt.id, u.id as uid, u.name, u.email, u.role, u.active FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = ? AND rt.expires_at > NOW()',
      [refreshToken]
    )

    if (!stored || !stored.active) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' })
    }

    // Rotacionar token
    await query('DELETE FROM refresh_tokens WHERE id = ?', [stored.id])

    const user = { id: stored.uid, name: stored.name, email: stored.email, role: stored.role }
    const tokens = generateTokens(user)

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, tokens.refreshToken, expiresAt]
    )

    res.json({ ...tokens, user })
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' })
  }
})

// POST /auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]).catch(() => {})
  }
  res.json({ message: 'Logout realizado' })
})

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [user] = await query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [req.user.id]
    )
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /auth/change-password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { currentPassword, newPassword } = req.body

    try {
      const [user] = await query('SELECT password FROM users WHERE id = ?', [req.user.id])
      const match = await bcrypt.compare(currentPassword, user.password)
      if (!match) return res.status(400).json({ error: 'Senha atual incorreta' })

      const hash = await bcrypt.hash(newPassword, 12)
      await query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id])
      // Revogar todos os refresh tokens
      await query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id])

      res.json({ message: 'Senha alterada com sucesso' })
    } catch (err) {
      res.status(500).json({ error: 'Erro interno' })
    }
  }
)

module.exports = router
