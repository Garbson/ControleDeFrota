const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/trips/summary
router.get('/summary', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        COUNT(*)                                                                    AS total_trips,
        COALESCE(SUM(CASE WHEN final_km > initial_km THEN final_km - initial_km ELSE 0 END), 0) AS total_km,
        COALESCE(SUM(freight_value), 0)                                             AS total_freight,
        COALESCE(SUM(CASE WHEN freight_status = 'pago'       THEN freight_value ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN freight_status = 'a_receber'  THEN freight_value ELSE 0 END), 0) AS total_pending
      FROM trips
    `)
    res.json(row)
  } catch (err) {
    console.error('Trips summary error:', err)
    res.status(500).json({ error: 'Erro ao carregar resumo' })
  }
})

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    const { driver_id, from, to } = req.query
    const params = []
    let sql = `
      SELECT
        t.*,
        d.name  AS driver_name,
        v2.plate AS truck_plate,
        v3.plate AS trailer_plate,
        (CASE WHEN t.final_km > t.initial_km THEN t.final_km - t.initial_km ELSE 0 END) AS distance
      FROM trips t
      JOIN  drivers  d  ON d.id  = t.driver_id
      LEFT JOIN vehicles v2 ON v2.id = t.truck_id
      LEFT JOIN vehicles v3 ON v3.id = t.trailer_id
      WHERE 1=1
    `
    if (driver_id) { params.push(driver_id); sql += ` AND t.driver_id = ?` }
    if (from)      { params.push(from);      sql += ` AND t.start_date >= ?` }
    if (to)        { params.push(to);        sql += ` AND t.start_date <= ?` }
    sql += ` ORDER BY t.start_date DESC`

    const trips = await query(sql, params)

    for (const trip of trips) {
      const endDate = trip.end_date || trip.start_date

      const [fuelRow] = await query(
        `SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(liters), 0) AS liters
         FROM fuel_records
         WHERE driver_id = ? AND fuel_date >= ? AND fuel_date <= ?`,
        [trip.driver_id, trip.start_date, endDate]
      )
      const [expRow] = await query(
        `SELECT COALESCE(SUM(value * qty), 0) AS total
         FROM expenses
         WHERE driver_id = ? AND exp_date >= ? AND exp_date <= ?`,
        [trip.driver_id, trip.start_date, endDate]
      )

      trip.fuel_total      = Number(fuelRow.total)
      trip.fuel_liters     = Number(fuelRow.liters)
      trip.expenses_total  = Number(expRow.total)
      trip.total_cost      = trip.fuel_total + trip.expenses_total
      trip.revenue         = Number(trip.freight_value || 0)
      trip.profit          = trip.revenue - trip.total_cost
      trip.avg_consumption = trip.fuel_liters > 0 && trip.distance > 0
        ? (trip.distance / trip.fuel_liters).toFixed(2)
        : null
    }

    res.json(trips)
  } catch (err) {
    console.error('Trips list error:', err)
    res.status(500).json({ error: 'Erro ao carregar viagens' })
  }
})

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  try {
    const [trip] = await query(`
      SELECT
        t.*,
        d.name     AS driver_name,
        v2.plate   AS truck_plate,
        v2.brand   AS truck_brand,
        v2.model   AS truck_model,
        v3.plate   AS trailer_plate,
        (CASE WHEN t.final_km > t.initial_km THEN t.final_km - t.initial_km ELSE 0 END) AS distance
      FROM trips t
      JOIN  drivers  d  ON d.id  = t.driver_id
      LEFT JOIN vehicles v2 ON v2.id = t.truck_id
      LEFT JOIN vehicles v3 ON v3.id = t.trailer_id
      WHERE t.id = ?
    `, [req.params.id])

    if (!trip) return res.status(404).json({ error: 'Viagem não encontrada' })

    const endDate    = trip.end_date || trip.start_date
    trip.distance    = Number(trip.distance)

    trip.fuel_records = await query(
      `SELECT * FROM fuel_records
       WHERE driver_id = ? AND fuel_date >= ? AND fuel_date <= ?
       ORDER BY fuel_date`,
      [trip.driver_id, trip.start_date, endDate]
    )
    trip.fuel_total  = trip.fuel_records.reduce((s, f) => s + Number(f.total), 0)
    trip.fuel_liters = trip.fuel_records.reduce((s, f) => s + Number(f.liters), 0)

    trip.expenses = await query(
      `SELECT * FROM expenses
       WHERE driver_id = ? AND exp_date >= ? AND exp_date <= ?
       ORDER BY exp_date`,
      [trip.driver_id, trip.start_date, endDate]
    )
    trip.expenses_total = trip.expenses.reduce((s, e) => s + (Number(e.value) * e.qty), 0)

    // Frete vinculado diretamente pelo receivable_id
    if (trip.receivable_id) {
      const [rec] = await query(
        `SELECT ar.*, v.plate AS vehicle_plate FROM accounts_receivable ar
         LEFT JOIN vehicles v ON v.id = ar.vehicle_id
         WHERE ar.id = ?`,
        [trip.receivable_id]
      )
      trip.receivable = rec || null
    } else {
      trip.receivable = null
    }

    trip.total_cost      = trip.fuel_total + trip.expenses_total
    trip.revenue         = Number(trip.freight_value || 0)
    trip.profit          = trip.revenue - trip.total_cost
    trip.avg_consumption = trip.fuel_liters > 0 && trip.distance > 0
      ? Number((trip.distance / trip.fuel_liters).toFixed(2))
      : null

    res.json(trip)
  } catch (err) {
    console.error('Trip detail error:', err)
    res.status(500).json({ error: 'Erro ao carregar viagem' })
  }
})

// POST /api/trips
router.post('/', [
  body('driver_id').isInt({ gt: 0 }).withMessage('Motorista obrigatório'),
  body('origin').notEmpty().withMessage('Origem obrigatória'),
  body('destination').notEmpty().withMessage('Destino obrigatório'),
  body('initial_km').isFloat({ gt: 0 }).withMessage('KM inicial obrigatório'),
  body('start_date').isDate().withMessage('Data de início obrigatória'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const {
    driver_id, truck_id, trailer_id,
    origin, destination, cargo, client,
    initial_km, final_km, start_date, end_date,
    freight_value, freight_status,
    obs,
  } = req.body

  const fv     = Number(freight_value) || 0
  const fstatus = fv > 0 ? (freight_status || 'a_receber') : 'sem_frete'

  try {
    const result = await query(
      `INSERT INTO trips
         (driver_id, truck_id, trailer_id, origin, destination, cargo, client,
          initial_km, final_km, start_date, end_date,
          freight_value, freight_status, obs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        driver_id,
        truck_id   || null,
        trailer_id || null,
        origin, destination,
        cargo  || null,
        client || null,
        initial_km,
        final_km   || null,
        start_date,
        end_date   || null,
        fv, fstatus,
        obs        || null,
      ]
    )
    const tripId = result.insertId

    // Criar conta a receber se houver frete
    if (fv > 0) {
      const recStatus   = fstatus === 'pago' ? 'recebido' : 'pendente'
      const receivedDate = fstatus === 'pago' ? (end_date || start_date) : null
      const dueDate      = end_date || start_date

      const [driverRow] = await query('SELECT name FROM drivers WHERE id = ?', [driver_id])
      const driverName  = driverRow?.name || ''

      const recResult = await query(
        `INSERT INTO accounts_receivable
           (client, description, driver_id, vehicle_id, type, value,
            issue_date, due_date, received_date, status, obs)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          client || driverName,
          `Frete: ${origin} → ${destination}${cargo ? ' (' + cargo + ')' : ''}`,
          driver_id,
          truck_id || null,
          'frete',
          fv,
          start_date,
          dueDate,
          receivedDate,
          recStatus,
          `Viagem #${tripId}`,
        ]
      )
      await query('UPDATE trips SET receivable_id = ? WHERE id = ?', [recResult.insertId, tripId])
    }

    res.status(201).json({ id: tripId, message: 'Viagem registrada' })
  } catch (err) {
    console.error('Create trip error:', err)
    res.status(500).json({ error: 'Erro ao registrar viagem' })
  }
})

// PUT /api/trips/:id
router.put('/:id', [
  body('driver_id').isInt({ gt: 0 }).withMessage('Motorista obrigatório'),
  body('origin').notEmpty().withMessage('Origem obrigatória'),
  body('destination').notEmpty().withMessage('Destino obrigatório'),
  body('initial_km').isFloat({ gt: 0 }).withMessage('KM inicial obrigatório'),
  body('start_date').isDate().withMessage('Data de início obrigatória'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const {
    driver_id, truck_id, trailer_id,
    origin, destination, cargo, client,
    initial_km, final_km, start_date, end_date,
    freight_value, freight_status,
    obs,
  } = req.body

  const fv      = Number(freight_value) || 0
  const fstatus = fv > 0 ? (freight_status || 'a_receber') : 'sem_frete'

  try {
    const result = await query(
      `UPDATE trips SET
         driver_id=?, truck_id=?, trailer_id=?,
         origin=?, destination=?, cargo=?, client=?,
         initial_km=?, final_km=?, start_date=?, end_date=?,
         freight_value=?, freight_status=?, obs=?
       WHERE id=?`,
      [
        driver_id,
        truck_id   || null,
        trailer_id || null,
        origin, destination,
        cargo  || null,
        client || null,
        initial_km,
        final_km   || null,
        start_date,
        end_date   || null,
        fv, fstatus,
        obs        || null,
        req.params.id,
      ]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Viagem não encontrada' })
    res.json({ message: 'Viagem atualizada' })
  } catch (err) {
    console.error('Update trip error:', err)
    res.status(500).json({ error: 'Erro ao atualizar viagem' })
  }
})

// DELETE /api/trips/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM trips WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Viagem não encontrada' })
    res.json({ message: 'Viagem excluída' })
  } catch (err) {
    console.error('Delete trip error:', err)
    res.status(500).json({ error: 'Erro ao excluir viagem' })
  }
})

module.exports = router
