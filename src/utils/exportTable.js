import XLSX from 'xlsx-js-style'

const escHtml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export function exportExcelGeneric({ title, headers, rows, totalLabel, totalValue, moneyCols = [1], subtitle }) {
  const cols = headers.length
  const today = new Date().toLocaleDateString('pt-BR')

  const sTitle = { font: { bold: true, sz: 16, color: { rgb: 'B45309' } }, alignment: { horizontal: 'left' } }
  const sSub = { font: { sz: 10, color: { rgb: '6B7280' } }, alignment: { horizontal: 'left' } }
  const sHeader = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'B45309' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: '92400E' } } } }
  const sCell = { font: { sz: 10, color: { rgb: '1F2937' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'hair', color: { rgb: 'E5E7EB' } } } }
  const sMoney = { ...sCell, numFmt: '#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } }
  const sTotal = { font: { bold: true, sz: 11, color: { rgb: '1F2937' } }, fill: { fgColor: { rgb: 'F3F0EB' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'B45309' } } } }
  const sTotalVal = { ...sTotal, numFmt: '#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } }
  const sStripe = { fill: { fgColor: { rgb: 'FAF7F2' } } }

  const moneyTotalCol = moneyCols[moneyCols.length - 1] ?? 1

  const aoa = []
  aoa.push([{ v: 'Transportadora Triunfo', s: sTitle }])
  aoa.push([{ v: title, s: sSub }])
  if (subtitle) aoa.push([{ v: subtitle, s: sSub }])
  aoa.push([{ v: `Emitido em: ${today}`, s: sSub }])
  aoa.push([])
  aoa.push(headers.map(h => ({ v: h, s: sHeader })))

  const headerRows = aoa.length - 1
  const merges = []
  for (let r = 0; r < headerRows - 1; r++) {
    merges.push({ s: { r, c: 0 }, e: { r, c: cols - 1 } })
  }

  let dataIdx = 0
  rows.forEach(item => {
    if (item.type === 'group') {
      const groupRow = []
      const rowIdx = aoa.length
      const sGroup = { font: { bold: true, sz: 10, color: { rgb: '92400E' } }, fill: { fgColor: { rgb: 'FDE68A' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: 'B45309' } } } }
      const sGroupVal = { ...sGroup, numFmt: '#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } }
      for (let i = 0; i < cols; i++) {
        if (i === 0) groupRow.push({ v: item.label, s: sGroup })
        else if (i === moneyTotalCol) groupRow.push({ v: item.value, t: 'n', s: sGroupVal })
        else groupRow.push({ v: '', s: sGroup })
      }
      merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: moneyTotalCol - 1 } })
      aoa.push(groupRow)
      dataIdx = 0
    } else {
      const isStripe = dataIdx % 2 === 1
      aoa.push(item.data.map((cell, ci) => {
        const isMoney = moneyCols.includes(ci)
        const base = isMoney ? sMoney : sCell
        const style = isStripe ? { ...base, fill: { ...sStripe.fill } } : base
        return { v: cell, t: isMoney ? 'n' : (typeof cell === 'number' ? 'n' : 's'), s: style }
      }))
      dataIdx++
    }
  })

  aoa.push([])
  const totalRow = []
  for (let i = 0; i < cols; i++) {
    if (i === 0) totalRow.push({ v: totalLabel, s: sTotal })
    else if (i === moneyTotalCol) totalRow.push({ v: totalValue, t: 'n', s: sTotalVal })
    else totalRow.push({ v: '', s: sTotal })
  }
  aoa.push(totalRow)

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!merges'] = merges
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 22 : 16 }))
  ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '-')}-${stamp()}.xlsx`)
}

export function exportWordGeneric({ title, headers, rows, totalLabel, totalValue, moneyCols = [1], subtitle }) {
  const today = new Date().toLocaleDateString('pt-BR')
  const moneyTotalCol = moneyCols[moneyCols.length - 1] ?? 1

  const thead = headers.map(h => `<th>${escHtml(h)}</th>`).join('')
  const tbody = rows.map(item => {
    if (item.type === 'group') {
      const labelSpan = moneyTotalCol || 1
      const remaining = headers.length - labelSpan - 1
      return `<tr><td colspan="${labelSpan}" style="background:#fde68a;font-weight:bold;color:#92400e;border:1px solid #b45309;">${escHtml(item.label)}</td><td align="right" style="background:#fde68a;font-weight:bold;color:#92400e;border:1px solid #b45309;">${brl(item.value)}</td>${remaining > 0 ? `<td colspan="${remaining}" style="background:#fde68a;border:1px solid #b45309;"></td>` : ''}</tr>`
    }
    const tds = item.data.map((cell, i) => {
      const isMoney = moneyCols.includes(i)
      const val = isMoney ? brl(cell) : escHtml(cell)
      return `<td${isMoney ? ' align="right"' : ''}>${val}</td>`
    }).join('')
    return `<tr>${tds}</tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1f2937; }
  h1 { font-size: 18pt; margin: 0; color: #b45309; }
  .sub { font-size: 10pt; color: #6b7280; margin: 2px 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 14px; font-size: 9pt; }
  th { background: #b45309; color: #fff; text-align: left; padding: 6px 8px; border: 1px solid #92400e; }
  td { padding: 5px 8px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #faf7f2; }
  .total { margin-top: 12px; font-size: 12pt; font-weight: bold; }
</style></head>
<body>
  <h1>Transportadora Triunfo</h1>
  <div class="sub">${escHtml(title)}</div>
  ${subtitle ? `<div class="sub">${escHtml(subtitle)}</div>` : ''}
  <div class="sub">Emitido em ${escHtml(today)}</div>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
  <div class="total">${escHtml(totalLabel)}: ${brl(totalValue)}</div>
</body></html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${stamp()}.doc`
  a.click()
  URL.revokeObjectURL(url)
}
