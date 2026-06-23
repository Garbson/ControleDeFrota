const { query } = require('../config/database')

/**
 * Retorna o id da viagem ativa de um motorista em uma data específica.
 * Considera ativa: start_date <= data E (end_date >= data OU end_date IS NULL).
 */
async function findActiveTrip(driverId, date) {
  if (!driverId || !date) return null
  const [trip] = await query(
    `SELECT id FROM trips
     WHERE driver_id = ? AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)
     ORDER BY start_date DESC
     LIMIT 1`,
    [driverId, date, date]
  )
  return trip?.id || null
}

module.exports = { findActiveTrip }
