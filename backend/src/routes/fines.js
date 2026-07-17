const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query, transaction } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

function payableDescription(description, category) {
  return `Multa: ${description || category || 'Infração de trânsito'}`
}

async function findVehicleId(tx, plate) {
  const [vehicle] = await tx('SELECT id FROM vehicles WHERE UPPER(plate) = UPPER(?) LIMIT 1', [plate])
  return vehicle?.id || null
}

async function createLinkedPayable(tx, fineId, fine) {
  const vehicleId = await findVehicleId(tx, fine.vehicle_plate)
  const payable = await tx(
    `INSERT INTO accounts_payable
      (document, description, driver_id, vehicle_id, category, value, issue_date, due_date, paid_date, status, obs)
     VALUES (?, ?, ?, ?, 'multas', ?, ?, ?, ?, ?, ?)`,
    [
      `MULTA-${fineId}`,
      payableDescription(fine.description, fine.category),
      fine.driver_id || null,
      vehicleId,
      fine.value,
      fine.fine_date,
      fine.due_date || fine.fine_date,
      fine.status === 'pago' ? fine.paid_date : null,
      fine.status === 'pago' ? 'pago' : fine.status === 'recurso' ? 'cancelado' : 'pendente',
      fine.obs || null,
    ]
  )
  await tx('UPDATE fines SET account_payable_id = ? WHERE id = ?', [payable.insertId, fineId])
  return payable.insertId
}

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
    const fine = {
      driver_id: driver_id || null,
      vehicle_plate: vehicle_plate.toUpperCase(),
      value,
      fine_date,
      due_date: due_date || null,
      description: description || null,
      category: category || 'outros',
      obs: obs || null,
      status: 'pendente',
    }
    const id = await transaction(async tx => {
      const result = await tx(
        `INSERT INTO fines (driver_id, vehicle_plate, value, fine_date, due_date, description, category, obs)
         VALUES (?,?,?,?,?,?,?,?)`,
        [fine.driver_id, fine.vehicle_plate, fine.value, fine.fine_date, fine.due_date,
         fine.description, fine.category, fine.obs]
      )
      await createLinkedPayable(tx, result.insertId, fine)
      return result.insertId
    })
    res.status(201).json({ id, message: 'Multa registrada e adicionada às contas a pagar' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao registrar multa' })
  }
})

// PUT /fines/:id — editar multa
router.put('/:id', async (req, res) => {
  const { driver_id, vehicle_plate, value, fine_date, due_date, description, category, obs } = req.body
  try {
    const updated = await transaction(async tx => {
      const [current] = await tx('SELECT * FROM fines WHERE id = ? FOR UPDATE', [req.params.id])
      if (!current) return false

      const normalizedPlate = vehicle_plate?.toUpperCase()
      await tx(
        `UPDATE fines SET driver_id=?, vehicle_plate=?, value=?, fine_date=?, due_date=?, description=?, category=?, obs=? WHERE id=?`,
        [driver_id || null, normalizedPlate, value, fine_date, due_date || null,
         description || null, category || 'outros', obs || null, req.params.id]
      )

      const fine = {
        ...current,
        driver_id: driver_id || null,
        vehicle_plate: normalizedPlate,
        value,
        fine_date,
        due_date: due_date || null,
        description: description || null,
        category: category || 'outros',
        obs: obs || null,
      }
      if (!current.account_payable_id) {
        await createLinkedPayable(tx, req.params.id, fine)
      } else {
        const vehicleId = await findVehicleId(tx, normalizedPlate)
        await tx(
          `UPDATE accounts_payable SET description=?, driver_id=?, vehicle_id=?, category='multas',
             value=?, issue_date=?, due_date=?, obs=? WHERE id=?`,
          [payableDescription(fine.description, fine.category), fine.driver_id, vehicleId, fine.value,
           fine.fine_date, fine.due_date || fine.fine_date, fine.obs, current.account_payable_id]
        )
      }
      return true
    })
    if (!updated) return res.status(404).json({ error: 'Multa não encontrada' })
    res.json({ message: 'Multa e conta a pagar atualizadas' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar multa' })
  }
})

// PATCH /fines/:id/pay — marcar como pago
router.patch('/:id/pay', async (req, res) => {
  const { paid_date } = req.body
  try {
    const date = paid_date || new Date().toISOString().split('T')[0]
    const updated = await transaction(async tx => {
      const [fine] = await tx('SELECT * FROM fines WHERE id = ? FOR UPDATE', [req.params.id])
      if (!fine) return false
      await tx(`UPDATE fines SET status = 'pago', paid_date = ? WHERE id = ?`, [date, req.params.id])
      let payableId = fine.account_payable_id
      if (!payableId) payableId = await createLinkedPayable(tx, req.params.id, { ...fine, status: 'pago', paid_date: date })
      await tx("UPDATE accounts_payable SET status = 'pago', paid_date = ? WHERE id = ?", [date, payableId])
      return true
    })
    if (!updated) return res.status(404).json({ error: 'Multa não encontrada' })
    res.json({ message: 'Multa e conta a pagar marcadas como pagas' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar multa' })
  }
})

// PATCH /fines/:id/appeal — marcar em recurso
router.patch('/:id/appeal', async (req, res) => {
  try {
    const updated = await transaction(async tx => {
      const [fine] = await tx('SELECT * FROM fines WHERE id = ? FOR UPDATE', [req.params.id])
      if (!fine) return false
      await tx(`UPDATE fines SET status = 'recurso', paid_date = NULL WHERE id = ?`, [req.params.id])
      let payableId = fine.account_payable_id
      if (!payableId) payableId = await createLinkedPayable(tx, req.params.id, { ...fine, status: 'recurso' })
      await tx("UPDATE accounts_payable SET status = 'cancelado', paid_date = NULL WHERE id = ?", [payableId])
      return true
    })
    if (!updated) return res.status(404).json({ error: 'Multa não encontrada' })
    res.json({ message: 'Multa em recurso e conta a pagar suspensa' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar multa' })
  }
})

// DELETE /fines/:id
router.delete('/:id', async (req, res) => {
  try {
    const removed = await transaction(async tx => {
      const [fine] = await tx('SELECT account_payable_id FROM fines WHERE id = ? FOR UPDATE', [req.params.id])
      if (!fine) return false
      await tx('DELETE FROM fines WHERE id = ?', [req.params.id])
      if (fine.account_payable_id) {
        await tx('DELETE FROM accounts_payable WHERE id = ?', [fine.account_payable_id])
      }
      return true
    })
    if (!removed) return res.status(404).json({ error: 'Multa não encontrada' })
    res.json({ message: 'Multa removida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover multa' })
  }
})

module.exports = router
