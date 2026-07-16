const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { findActiveTrip } = require('../utils/findActiveTrip')

router.use(authenticate)

// ── Configuração do multer para comprovantes
const receiptsDir = path.join(__dirname, '..', '..', 'uploads', 'receipts')
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, receiptsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `receipt_${req.params.id}_${Date.now()}${ext}`
    cb(null, name)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf|webp)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou PDF.'))
    }
  },
})

// ── Configuração do multer para notas fiscais
const invoicesDir = path.join(__dirname, '..', '..', 'uploads', 'invoices')
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true })
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, invoicesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `invoice_${req.params.id}_${Date.now()}${ext}`)
  },
})
const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf|webp)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou PDF.'))
    }
  },
})

// GET /payable
router.get('/', async (req, res) => {
  try {
    const { status, category, from, to } = req.query
    let sql = `
      SELECT ap.*, d.name AS driver_name, v.plate AS vehicle_plate,
             COALESCE(s.name, ap.supplier_name_free) AS supplier_name,
             CONCAT(t.origin, ' → ', t.destination) AS trip_label
      FROM accounts_payable ap
      LEFT JOIN drivers d ON d.id = ap.driver_id
      LEFT JOIN vehicles v ON v.id = ap.vehicle_id
      LEFT JOIN suppliers s ON s.id = ap.supplier_id
      LEFT JOIN trips t ON t.id = ap.trip_id
      WHERE 1=1
    `
    const params = []

    if (status)   { sql += ' AND ap.status = ?';   params.push(status) }
    if (category) { sql += ' AND ap.category = ?'; params.push(category) }
    if (from)     { sql += ' AND ap.due_date >= ?'; params.push(from) }
    if (to)       { sql += ' AND ap.due_date <= ?'; params.push(to) }

    sql += ' ORDER BY ap.due_date ASC'

    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar contas a pagar' })
  }
})

// GET /payable/summary
router.get('/summary', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        SUM(value) AS total,
        SUM(CASE WHEN status = 'pendente' THEN value ELSE 0 END) AS pendente,
        SUM(CASE WHEN status = 'pago'     THEN value ELSE 0 END) AS pago,
        SUM(CASE WHEN status = 'vencido'  THEN value ELSE 0 END) AS vencido,
        COUNT(*) AS count_total,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS count_pendente
      FROM accounts_payable
    `)
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular resumo' })
  }
})

// POST /payable
router.post(
  '/',
  [
    body('value').isFloat({ gt: 0 }).withMessage('Valor inválido'),
    body('due_date').isDate().withMessage('Data de vencimento inválida'),
    body('category').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { document, description, supplier_id, supplier_name_free, driver_id, vehicle_id, trip_id, category, value, issue_date, due_date, obs } = req.body
    try {
      // Auto-detecta viagem ativa se não vier trip_id explícito
      const refDate = issue_date || due_date
      const resolvedTripId = trip_id || await findActiveTrip(driver_id, refDate)
      // supplier_name_free só é salvo quando não há supplier_id
      const resolvedFree = supplier_id ? null : (supplier_name_free || null)

      const result = await query(
        `INSERT INTO accounts_payable
          (document, description, supplier_id, supplier_name_free, driver_id, vehicle_id, trip_id, category, value, issue_date, due_date, obs)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [document || null, description || null, supplier_id || null, resolvedFree,
         driver_id || null, vehicle_id || null, resolvedTripId || null, category, value, issue_date || null, due_date, obs || null]
      )
      res.status(201).json({ id: result.insertId, message: 'Conta criada' })
    } catch (err) {
      console.error('[POST /payable]', err.message)
      res.status(500).json({ error: 'Erro ao criar conta' })
    }
  }
)

// PATCH /payable/:id/pay — marcar como pago
router.patch('/:id/pay', async (req, res) => {
  const paid_date = req.body.paid_date || new Date().toISOString().split('T')[0]
  try {
    await query(
      "UPDATE accounts_payable SET status = 'pago', paid_date = ? WHERE id = ?",
      [paid_date, req.params.id]
    )
    res.json({ message: 'Conta marcada como paga' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta' })
  }
})

// PUT /payable/:id
router.put('/:id', async (req, res) => {
  const { document, description, supplier_id, supplier_name_free, driver_id, vehicle_id, trip_id, category, value, issue_date, due_date, status, obs } = req.body
  const resolvedFree = supplier_id ? null : (supplier_name_free || null)
  try {
    await query(
      `UPDATE accounts_payable SET
        document=?, description=?, supplier_id=?, supplier_name_free=?, driver_id=?, vehicle_id=?, trip_id=?,
        category=?, value=?, issue_date=?, due_date=?, status=?, obs=?
       WHERE id=?`,
      [document || null, description || null, supplier_id || null, resolvedFree, driver_id || null,
       vehicle_id || null, trip_id || null, category, value, issue_date || null, due_date, status, obs || null, req.params.id]
    )
    res.json({ message: 'Conta atualizada' })
  } catch (err) {
    console.error('[PUT /payable]', err.message, err.stack)
    res.status(500).json({ error: 'Erro ao atualizar conta' })
  }
})

// DELETE /payable/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM accounts_payable WHERE id = ?', [req.params.id])
    res.json({ message: 'Conta removida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover conta' })
  }
})

// POST /payable/:id/receipt — upload de comprovante
router.post('/:id/receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  }
  const receiptUrl = `/uploads/receipts/${req.file.filename}`

  try {
    // Remove comprovante antigo se existir
    const [current] = await query('SELECT receipt_url FROM accounts_payable WHERE id = ?', [req.params.id])
    if (current?.receipt_url) {
      const oldPath = path.join(__dirname, '..', '..', current.receipt_url)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    await query('UPDATE accounts_payable SET receipt_url = ? WHERE id = ?', [receiptUrl, req.params.id])
    res.json({ receipt_url: receiptUrl, message: 'Comprovante enviado' })
  } catch (err) {
    // Remove arquivo se falhou ao atualizar banco
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: 'Erro ao salvar comprovante' })
  }
})

// DELETE /payable/:id/receipt — remover comprovante
router.delete('/:id/receipt', async (req, res) => {
  try {
    const [current] = await query('SELECT receipt_url FROM accounts_payable WHERE id = ?', [req.params.id])
    if (current?.receipt_url) {
      const filePath = path.join(__dirname, '..', '..', current.receipt_url)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await query('UPDATE accounts_payable SET receipt_url = NULL WHERE id = ?', [req.params.id])
    res.json({ message: 'Comprovante removido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover comprovante' })
  }
})

// POST /payable/:id/invoice — upload de nota fiscal
router.post('/:id/invoice', invoiceUpload.single('invoice'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  }
  const invoiceUrl = `/uploads/invoices/${req.file.filename}`
  try {
    const [current] = await query('SELECT invoice_url FROM accounts_payable WHERE id = ?', [req.params.id])
    if (current?.invoice_url) {
      const oldPath = path.join(__dirname, '..', '..', current.invoice_url)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }
    await query('UPDATE accounts_payable SET invoice_url = ? WHERE id = ?', [invoiceUrl, req.params.id])
    res.json({ invoice_url: invoiceUrl, message: 'Nota fiscal enviada' })
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: 'Erro ao salvar nota fiscal' })
  }
})

// DELETE /payable/:id/invoice — remover nota fiscal
router.delete('/:id/invoice', async (req, res) => {
  try {
    const [current] = await query('SELECT invoice_url FROM accounts_payable WHERE id = ?', [req.params.id])
    if (current?.invoice_url) {
      const filePath = path.join(__dirname, '..', '..', current.invoice_url)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await query('UPDATE accounts_payable SET invoice_url = NULL WHERE id = ?', [req.params.id])
    res.json({ message: 'Nota fiscal removida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover nota fiscal' })
  }
})

module.exports = router
