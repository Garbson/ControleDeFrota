require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { query, getPool } = require('../config/database')
const { uploadFile, isConfigured } = require('../services/r2Storage')
const { localPath } = require('../utils/storedFile')

const targets = [
  { table: 'accounts_payable', field: 'receipt_url', folder: 'payable/receipts' },
  { table: 'accounts_payable', field: 'invoice_url', folder: 'payable/invoices' },
  { table: 'accounts_receivable', field: 'receipt_url', folder: 'receivable/receipts' },
]

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase()
  return {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.pdf': 'application/pdf',
  }[ext] || 'application/octet-stream'
}

async function migrateLocalFiles() {
  if (!isConfigured()) throw new Error('R2 não configurado')
  const summary = { migrated: 0, missing: 0, failed: 0 }

  for (const target of targets) {
    const rows = await query(
      `SELECT id, \`${target.field}\` AS reference FROM \`${target.table}\`
       WHERE \`${target.field}\` LIKE '/uploads/%'`
    )

    for (const row of rows) {
      const filePath = localPath(row.reference)
      if (!filePath || !fs.existsSync(filePath)) {
        console.warn(`⚠️ Arquivo não encontrado: ${target.table}#${row.id} ${row.reference}`)
        summary.missing += 1
        continue
      }

      try {
        const filename = path.basename(filePath)
        const r2Reference = await uploadFile({
          path: filePath,
          filename,
          originalname: filename,
          mimetype: mimeType(filename),
        }, target.folder)
        const result = await query(
          `UPDATE \`${target.table}\` SET \`${target.field}\` = ? WHERE id = ? AND \`${target.field}\` = ?`,
          [r2Reference, row.id, row.reference]
        )
        if (result.affectedRows === 1) {
          summary.migrated += 1
          console.log(`✅ ${target.table}#${row.id} → ${r2Reference}`)
        }
      } catch (err) {
        summary.failed += 1
        console.error(`❌ ${target.table}#${row.id}: ${err.message}`)
      }
    }
  }

  console.log('Migração de arquivos concluída:', summary)
  return summary
}

if (require.main === module) {
  migrateLocalFiles()
    .then(summary => {
      if (summary.failed) process.exitCode = 1
    })
    .catch(err => {
      console.error('❌ Erro na migração de arquivos:', err.message)
      process.exitCode = 1
    })
    .finally(async () => {
      await getPool().end()
    })
}

module.exports = { migrateLocalFiles, mimeType }
