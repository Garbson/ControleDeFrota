const router = require('express').Router()
const { query } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.use(authenticate)
router.use(requireAdmin)

// GET /audit — histórico paginado e filtrável (somente administradores)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const offset = (page - 1) * limit
    const params = []
    let where = 'WHERE 1=1'

    if (req.query.entity) {
      where += ' AND entity = ?'
      params.push(req.query.entity)
    }
    if (req.query.user_id) {
      where += ' AND user_id = ?'
      params.push(req.query.user_id)
    }
    if (req.query.from) {
      where += ' AND created_at >= ?'
      params.push(`${req.query.from} 00:00:00`)
    }
    if (req.query.to) {
      where += ' AND created_at <= ?'
      params.push(`${req.query.to} 23:59:59`)
    }

    const [countRow] = await query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params)
    const items = await query(
      `SELECT id, user_id, user_name, action, entity, entity_id, method, route,
              before_data, after_data, ip_address, created_at
       FROM audit_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )

    res.json({ items, total: Number(countRow.total), page, limit })
  } catch (err) {
    console.error('[GET /audit]', err.message)
    res.status(500).json({ error: 'Erro ao buscar histórico de auditoria' })
  }
})

module.exports = router
