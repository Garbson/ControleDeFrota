const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { attachAccessUrls } = require('../services/r2Storage')
const { saveUploadedFile, removeStoredFile, storedFileResponse } = require('../utils/storedFile')

router.use(authenticate)

const invoicesDir = path.join(__dirname, '..', '..', 'uploads', 'stock-invoices')
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true })
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, invoicesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `stock_invoice_${req.params.id}_${Date.now()}${ext}`)
  },
})
const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf|webp)$/i
    if (allowed.test(path.extname(file.originalname))) cb(null, true)
    else cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou PDF.'))
  },
})

router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT si.*, s.name AS supplier_name
      FROM stock_items si
      LEFT JOIN suppliers s ON s.id = si.supplier_id
      WHERE 1=1
    `
    const params = []
    if (status) { sql += ' AND si.status = ?'; params.push(status) }
    sql += ' ORDER BY si.qty DESC'
    const rows = await query(sql, params)
    res.json(await attachAccessUrls(rows, ['invoice_url']))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estoque' })
  }
})

router.post(
  '/',
  [
    body('description').notEmpty(),
    body('qty').isInt({ min: 0 }),
    body('status').isIn(['novo', 'recapado', 'usado']),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { description, brand, nf_number, status, qty, unit_price, supplier_id, entry_date } = req.body
    try {
      const result = await query(
        'INSERT INTO stock_items (description, brand, nf_number, status, qty, unit_price, supplier_id, entry_date) VALUES (?,?,?,?,?,?,?,?)',
        [description, brand || null, nf_number || null, status, qty, unit_price || null, supplier_id || null, entry_date || null]
      )
      res.status(201).json({ id: result.insertId, message: 'Item criado' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar item' })
    }
  }
)

router.put('/:id', async (req, res) => {
  const { description, brand, nf_number, status, qty, unit_price } = req.body
  try {
    await query(
      'UPDATE stock_items SET description=?, brand=?, nf_number=?, status=?, qty=?, unit_price=? WHERE id=?',
      [description, brand || null, nf_number || null, status, qty, unit_price || null, req.params.id]
    )
    res.json({ message: 'Item atualizado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar item' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const [item] = await query('SELECT invoice_url FROM stock_items WHERE id = ?', [req.params.id])
    await query('DELETE FROM movements WHERE stock_item_id = ?', [req.params.id])
    await query('DELETE FROM stock_items WHERE id = ?', [req.params.id])
    if (item?.invoice_url) {
      await removeStoredFile(item.invoice_url).catch(err => console.error('[stock:delete:cleanup]', err.message))
    }
    res.json({ message: 'Item removido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover item' })
  }
})

// GET /stock/movements
router.get('/movements', async (req, res) => {
  try {
    const { type } = req.query
    let sql = `
      SELECT m.*, d.name AS driver_name, v.plate AS vehicle_plate, si.description AS item_name
      FROM movements m
      LEFT JOIN drivers d ON d.id = m.driver_id
      LEFT JOIN vehicles v ON v.id = m.vehicle_id
      LEFT JOIN stock_items si ON si.id = m.stock_item_id
      WHERE 1=1
    `
    const params = []
    if (type) { sql += ' AND m.type = ?'; params.push(type) }
    if (req.query.stock_item_id) { sql += ' AND m.stock_item_id = ?'; params.push(req.query.stock_item_id) }
    sql += ' ORDER BY m.mov_date DESC LIMIT 50'
    res.json(await query(sql, params))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar movimentações' })
  }
})

// POST /stock/movements
router.post(
  '/movements',
  [
    body('type').isIn(['entrada', 'saida']),
    body('qty').isInt({ min: 1 }),
    body('mov_date').isDate(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { type, driver_id, vehicle_id, stock_item_id, qty, unit_value, mov_date, obs } = req.body
    const total = unit_value ? parseFloat(unit_value) * parseInt(qty) : null

    try {
      const result = await query(
        'INSERT INTO movements (type, driver_id, vehicle_id, stock_item_id, qty, unit_value, total_value, mov_date, obs) VALUES (?,?,?,?,?,?,?,?,?)',
        [type, driver_id || null, vehicle_id || null, stock_item_id || null, qty, unit_value || null, total, mov_date, obs || null]
      )

      // Atualizar estoque
      if (stock_item_id) {
        const op = type === 'entrada' ? '+' : '-'
        await query(`UPDATE stock_items SET qty = qty ${op} ? WHERE id = ?`, [qty, stock_item_id])
      }

      // Vincular pneus ao motorista na saída
      if (type === 'saida' && driver_id && stock_item_id) {
        const [item] = await query('SELECT description, brand, status FROM stock_items WHERE id = ?', [stock_item_id])
        if (item) {
          await query(
            'INSERT INTO tire_assignments (driver_id, vehicle_id, brand, qty, type, stock_item_id, assigned_at, obs) VALUES (?,?,?,?,?,?,?,?)',
            [driver_id, vehicle_id || null, item.brand || item.description, qty, item.status || 'novo', stock_item_id, mov_date, obs || null]
          )
        }
      }

      res.status(201).json({ id: result.insertId, message: 'Movimentação registrada' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao registrar movimentação' })
    }
  }
)

// DELETE /stock/movements/:id
router.delete('/movements/:id', async (req, res) => {
  try {
    const [mov] = await query('SELECT * FROM movements WHERE id = ?', [req.params.id])
    if (!mov) return res.status(404).json({ error: 'Movimentação não encontrada' })

    if (mov.stock_item_id) {
      const op = mov.type === 'entrada' ? '-' : '+'
      await query(`UPDATE stock_items SET qty = GREATEST(qty ${op} ?, 0) WHERE id = ?`, [mov.qty, mov.stock_item_id])
    }

    if (mov.type === 'saida' && mov.driver_id && mov.stock_item_id) {
      await query('DELETE FROM tire_assignments WHERE driver_id = ? AND stock_item_id = ? AND qty = ? AND assigned_at = ? LIMIT 1', [mov.driver_id, mov.stock_item_id, mov.qty, mov.mov_date])
    }

    await query('DELETE FROM movements WHERE id = ?', [req.params.id])
    res.json({ message: 'Movimentação excluída' })
  } catch (err) {
    console.error('Delete movement error:', err)
    res.status(500).json({ error: 'Erro ao excluir movimentação' })
  }
})

// POST /stock/:id/invoice — upload de nota fiscal do pneu
router.post('/:id/invoice', invoiceUpload.single('invoice'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  const localReference = `/uploads/stock-invoices/${req.file.filename}`
  let storedReference = null
  try {
    const [current] = await query('SELECT invoice_url FROM stock_items WHERE id = ?', [req.params.id])
    storedReference = await saveUploadedFile(req.file, 'stock/invoices', localReference)
    await query('UPDATE stock_items SET invoice_url = ? WHERE id = ?', [storedReference, req.params.id])
    if (current?.invoice_url && current.invoice_url !== storedReference) {
      await removeStoredFile(current.invoice_url).catch(err => console.error('[stock-invoice:cleanup]', err.message))
    }
    const file = await storedFileResponse(storedReference)
    res.json({ invoice_url: file.reference, invoice_access_url: file.access_url, message: 'Nota fiscal enviada' })
  } catch (err) {
    await removeStoredFile(storedReference || localReference).catch(() => {})
    console.error('[stock-invoice:upload]', err.message)
    res.status(500).json({ error: 'Erro ao salvar nota fiscal' })
  }
})

// DELETE /stock/:id/invoice — remover nota fiscal do pneu
router.delete('/:id/invoice', async (req, res) => {
  try {
    const [current] = await query('SELECT invoice_url FROM stock_items WHERE id = ?', [req.params.id])
    await query('UPDATE stock_items SET invoice_url = NULL WHERE id = ?', [req.params.id])
    await removeStoredFile(current?.invoice_url).catch(err => console.error('[stock-invoice:delete]', err.message))
    res.json({ message: 'Nota fiscal removida' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover nota fiscal' })
  }
})

module.exports = router
