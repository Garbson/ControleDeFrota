const { query } = require('../config/database')

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const RESOURCE_TABLES = {
  drivers: 'drivers',
  vehicles: 'vehicles',
  payable: 'accounts_payable',
  receivable: 'accounts_receivable',
  fuel: 'fuel_records',
  fines: 'fines',
  trips: 'trips',
  users: 'users',
  suppliers: 'suppliers',
}

const SENSITIVE_KEYS = new Set([
  'password', 'currentPassword', 'newPassword', 'token', 'accessToken', 'refreshToken',
])

function sanitize(value) {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(sanitize)
  if (typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_KEYS.has(key) ? '[PROTEGIDO]' : sanitize(item),
  ]))
}

function resourceFromRequest(req) {
  const parts = req.baseUrl.split('/').filter(Boolean)
  const entity = parts[parts.length - 1] || 'desconhecido'
  const pathParts = req.path.split('/').filter(Boolean)
  const entityId = /^\d+$/.test(pathParts[0] || '') ? pathParts[0] : null
  return { entity, entityId, table: RESOURCE_TABLES[entity] || null }
}

function actionFromRequest(req) {
  const suffix = req.path.split('/').filter(Boolean).slice(1).join('_')
  const base = {
    POST: 'criou',
    PUT: 'editou',
    PATCH: 'alterou',
    DELETE: 'removeu',
  }[req.method] || req.method.toLowerCase()
  return suffix ? `${base}_${suffix}` : base
}

async function readRecord(table, id) {
  if (!table || !id) return null
  const [record] = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id])
  return record ? sanitize(record) : null
}

async function prepareAudit(req, res) {
  if (!MUTATION_METHODS.has(req.method) || process.env.NODE_ENV === 'test') return

  const { entity, entityId: pathId, table } = resourceFromRequest(req)
  const before = await readRecord(table, pathId).catch(() => null)
  const originalJson = res.json.bind(res)

  res.json = function auditedJson(body) {
    if (res.statusCode < 400) {
      const entityId = pathId || body?.id || null
      setImmediate(async () => {
        try {
          const after = req.method === 'DELETE'
            ? null
            : (await readRecord(table, entityId).catch(() => null)) || sanitize(req.body)

          await query(
            `INSERT INTO audit_logs
              (user_id, user_name, action, entity, entity_id, method, route, before_data, after_data, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user?.id || null,
              req.user?.name || null,
              actionFromRequest(req),
              entity,
              entityId ? String(entityId) : null,
              req.method,
              `${req.baseUrl}${req.path}`,
              before ? JSON.stringify(before) : null,
              after ? JSON.stringify(after) : null,
              req.ip || null,
              req.get('user-agent')?.slice(0, 500) || null,
            ]
          )
        } catch (err) {
          console.error('[audit]', err.message)
        }
      })
    }
    return originalJson(body)
  }
}

module.exports = { prepareAudit, sanitize, resourceFromRequest, actionFromRequest }
