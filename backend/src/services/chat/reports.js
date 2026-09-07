const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const PDFDocument = require('pdfkit')
const ExcelJS = require('exceljs')

const CHAT_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'chat')

function ensureDir() {
  if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true })
}

function sanitizeSlug(str) {
  return String(str || 'relatorio')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase() || 'relatorio'
}

function formatCell(value) {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function gerarPdf({ filePath, titulo, colunas, linhas, resumo }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    doc.fontSize(16).text(titulo, { align: 'left' })
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor('#666')
       .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`)
    doc.fillColor('#000').moveDown(0.8)

    if (resumo) {
      doc.fontSize(10).text(resumo, { align: 'justify' })
      doc.moveDown(0.8)
    }

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const colWidth = pageWidth / colunas.length
    const startX = doc.page.margins.left

    // Cabeçalho
    doc.fontSize(9).fillColor('#fff')
    const headerY = doc.y
    doc.rect(startX, headerY, pageWidth, 18).fill('#1f2937')
    doc.fillColor('#fff')
    colunas.forEach((c, i) => {
      doc.text(c.rotulo, startX + i * colWidth + 4, headerY + 5, { width: colWidth - 8, ellipsis: true })
    })
    doc.fillColor('#000').y = headerY + 20

    // Linhas
    doc.fontSize(8)
    linhas.forEach((linha, idx) => {
      if (doc.y > doc.page.height - 60) doc.addPage()
      const rowY = doc.y
      if (idx % 2 === 1) {
        doc.rect(startX, rowY - 2, pageWidth, 16).fill('#f3f4f6').fillColor('#000')
      }
      colunas.forEach((c, i) => {
        doc.text(formatCell(linha[c.chave]), startX + i * colWidth + 4, rowY + 2, {
          width: colWidth - 8,
          ellipsis: true,
        })
      })
      doc.y = rowY + 16
    })

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

async function gerarXlsx({ filePath, titulo, colunas, linhas, resumo }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ControleDeFrota'
  wb.created = new Date()
  const ws = wb.addWorksheet(titulo.slice(0, 30) || 'Relatório')

  let rowIdx = 1
  ws.getCell(`A${rowIdx}`).value = titulo
  ws.getCell(`A${rowIdx}`).font = { size: 14, bold: true }
  ws.mergeCells(rowIdx, 1, rowIdx, colunas.length)
  rowIdx++

  ws.getCell(`A${rowIdx}`).value = `Gerado em ${new Date().toLocaleString('pt-BR')}`
  ws.getCell(`A${rowIdx}`).font = { size: 9, color: { argb: 'FF888888' } }
  ws.mergeCells(rowIdx, 1, rowIdx, colunas.length)
  rowIdx += 2

  if (resumo) {
    ws.getCell(`A${rowIdx}`).value = resumo
    ws.getCell(`A${rowIdx}`).alignment = { wrapText: true, vertical: 'top' }
    ws.mergeCells(rowIdx, 1, rowIdx, colunas.length)
    rowIdx += 2
  }

  // Cabeçalho
  const headerRow = ws.getRow(rowIdx)
  colunas.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = c.rotulo
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
  headerRow.height = 20
  rowIdx++

  // Dados
  linhas.forEach((linha) => {
    const row = ws.getRow(rowIdx++)
    colunas.forEach((c, i) => {
      row.getCell(i + 1).value = linha[c.chave] ?? ''
    })
  })

  // Auto-fit razoável
  colunas.forEach((c, i) => {
    const maxLen = Math.max(
      c.rotulo.length,
      ...linhas.slice(0, 200).map(l => formatCell(l[c.chave]).length),
    )
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
  })

  await wb.xlsx.writeFile(filePath)
}

async function criarArquivo({ formato, titulo, colunas, linhas, resumo, userId }) {
  ensureDir()
  const ext = formato === 'xlsx' ? 'xlsx' : 'pdf'
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const rand = crypto.randomBytes(3).toString('hex')
  const filename = `${sanitizeSlug(titulo)}-${ts}-${rand}.${ext}`
  const filePath = path.join(CHAT_DIR, filename)

  if (ext === 'pdf') await gerarPdf({ filePath, titulo, colunas, linhas, resumo })
  else               await gerarXlsx({ filePath, titulo, colunas, linhas, resumo })

  const stat = fs.statSync(filePath)
  return {
    url: `/uploads/chat/${filename}`,
    nome: filename,
    formato: ext,
    tamanho_bytes: stat.size,
    linhas: linhas.length,
    gerado_em: new Date().toISOString(),
    gerado_por_user_id: userId || null,
  }
}

module.exports = { criarArquivo }
