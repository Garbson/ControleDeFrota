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

// ── Configuração do multer para comprovantes
const receiptsDir = path.join(__dirname, '..', '..', 'uploads', 'receipts')
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, receiptsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `receivable_receipt_${req.params.id}_${Date.now()}${ext}`
    cb(null, name)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf|webp)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou PDF.'))
    }
  },
})

router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT ar.*, d.name AS driver_name, v.plate AS vehicle_plate
      FROM accounts_receivable ar
      LEFT JOIN drivers d ON d.id = ar.driver_id
      LEFT JOIN vehicles v ON v.id = ar.vehicle_id
      WHERE 1=1
    `
    const params = []
    if (status) { sql += ' AND ar.status = ?'; params.push(status) }
    sql += ' ORDER BY ar.due_date ASC'
    const rows = await query(sql, params)
    res.json(await attachAccessUrls(rows, ['receipt_url']))
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contas a receber' })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        SUM(value) AS total,
        SUM(CASE WHEN status = 'pendente'  THEN value ELSE 0 END) AS pendente,
        SUM(CASE WHEN status = 'recebido'  THEN value ELSE 0 END) AS recebido
      FROM accounts_receivable
    `)
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular resumo' })
  }
})

router.post(
  '/',
  [
    body('client').notEmpty().withMessage('Cliente obrigatório'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { document, description, carga, client, driver_id, vehicle_id, type, value, issue_date, due_date, obs, weight, unit_price, installments } = req.body
    try {
      const ids = []
      if (installments?.length) {
        const groupId = Date.now()
        const totalParcelas = installments.filter(i => !i.is_entrada).length
        let parcelaNum = 0
        for (const inst of installments) {
          if (!inst.amount || !inst.due_date) continue
          let label = null
          if (inst.is_entrada) {
            label = 'Entrada'
          } else {
            parcelaNum++
            label = totalParcelas > 1 ? `Parcela ${parcelaNum}/${totalParcelas}` : 'Parcela'
          }
          const result = await query(
            `INSERT INTO accounts_receivable
              (document, description, carga, client, driver_id, vehicle_id, type, value, issue_date, due_date, obs, weight, unit_price, group_id, installment_label)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [document || null, description || null, carga || null, client, driver_id || null,
             vehicle_id || null, type || 'frete', inst.amount, issue_date || null, inst.due_date, obs || null, weight || null, unit_price || null, groupId, label]
          )
          ids.push(result.insertId)
        }
      } else {
        const result = await query(
          `INSERT INTO accounts_receivable
            (document, description, carga, client, driver_id, vehicle_id, type, value, issue_date, due_date, obs, weight, unit_price)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [document || null, description || null, carga || null, client, driver_id || null,
           vehicle_id || null, type || 'frete', value, issue_date || null, due_date, obs || null, weight || null, unit_price || null]
        )
        ids.push(result.insertId)
      }
      res.status(201).json({ ids, message: 'Conta criada' })
    } catch (err) {
      console.error('[receivable:create]', err.message)
      res.status(500).json({ error: 'Erro ao criar conta' })
    }
  }
)

router.put('/:id', async (req, res) => {
  const { document, description, carga, client, driver_id, vehicle_id, type, value, issue_date, due_date, obs, weight, unit_price } = req.body
  try {
    await query(
      `UPDATE accounts_receivable SET document=?, description=?, carga=?, client=?, driver_id=?, vehicle_id=?, type=?, value=?, issue_date=?, due_date=?, obs=?, weight=?, unit_price=? WHERE id=?`,
      [document || null, description || null, carga || null, client, driver_id || null, vehicle_id || null, type || 'frete', value, issue_date || null, due_date, obs || null, weight || null, unit_price || null, req.params.id]
    )
    res.json({ message: 'Conta atualizada' })
  } catch (err) {
    console.error('[receivable:update]', err.message)
    res.status(500).json({ error: 'Erro ao atualizar conta' })
  }
})

router.patch('/:id/receive', async (req, res) => {
  const received_date = req.body.received_date || new Date().toISOString().split('T')[0]
  try {
    await query(
      "UPDATE accounts_receivable SET status = 'recebido', received_date = ? WHERE id = ?",
      [received_date, req.params.id]
    )
    res.json({ message: 'Recebimento confirmado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao confirmar recebimento' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT group_id FROM accounts_receivable WHERE id = ?', [req.params.id])
    if (row?.group_id && req.query.group === 'true') {
      await query('DELETE FROM accounts_receivable WHERE group_id = ?', [row.group_id])
    } else {
      await query('DELETE FROM accounts_receivable WHERE id = ?', [req.params.id])
    }
    res.json({ message: 'Removido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover' })
  }
})

// POST /receivable/:id/receipt — upload de comprovante
router.post('/:id/receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  }
  const localReference = `/uploads/receipts/${req.file.filename}`
  let storedReference = null
  try {
    const [current] = await query('SELECT receipt_url FROM accounts_receivable WHERE id = ?', [req.params.id])
    storedReference = await saveUploadedFile(req.file, 'receivable/receipts', localReference)
    await query('UPDATE accounts_receivable SET receipt_url = ? WHERE id = ?', [storedReference, req.params.id])
    if (current?.receipt_url && current.receipt_url !== storedReference) {
      await removeStoredFile(current.receipt_url).catch(err => console.error('[receivable-receipt:cleanup]', err.message))
    }
    const file = await storedFileResponse(storedReference)
    res.json({ receipt_url: file.reference, receipt_access_url: file.access_url, message: 'Comprovante enviado' })
  } catch (err) {
    await removeStoredFile(storedReference || localReference).catch(() => {})
    console.error('[receivable-receipt:upload]', err.message)
    res.status(500).json({ error: 'Erro ao salvar comprovante' })
  }
})

// DELETE /receivable/:id/receipt — remover comprovante
router.delete('/:id/receipt', async (req, res) => {
  try {
    const [current] = await query('SELECT receipt_url FROM accounts_receivable WHERE id = ?', [req.params.id])
    await query('UPDATE accounts_receivable SET receipt_url = NULL WHERE id = ?', [req.params.id])
    await removeStoredFile(current?.receipt_url).catch(err => console.error('[receivable-receipt:delete]', err.message))
    res.json({ message: 'Comprovante removido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover comprovante' })
  }
})

module.exports = router
