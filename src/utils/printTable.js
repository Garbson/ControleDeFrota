export function printTable({ title, headers, rows, totals, subtitle }) {
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const now = new Date().toLocaleString('pt-BR')
  const headerCells = headers.map(h => `<th>${esc(h)}</th>`).join('')
  const bodyRows = rows.map(r => {
    if (r.type === 'group') {
      const span = headers.length - 1
      return `<tr class="group-row"><td colspan="${span}">${esc(r.label)}</td><td class="val">${brl(r.value)}</td></tr>`
    }
    return `<tr>${r.data.map((c, i) => {
      const isNum = typeof c === 'number'
      return `<td${isNum ? ' class="val"' : ''}>${isNum ? brl(c) : esc(c)}</td>`
    }).join('')}</tr>`
  }).join('')

  let totalRow = ''
  if (totals) {
    totalRow = `<tr class="total-row"><td colspan="${totals.colspan || headers.length - 1}">${esc(totals.label)}</td><td class="val">${brl(totals.value)}</td></tr>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: landscape; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 10px; }
  .header h1 { font-size: 16px; color: #1e3a5f; font-weight: 800; }
  .header .meta { font-size: 9px; color: #666; text-align: right; }
  .subtitle { font-size: 10px; color: #666; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
  tr:nth-child(even):not(.group-row):not(.total-row) { background: #f8f9fa; }
  .val { text-align: right; font-variant-numeric: tabular-nums; }
  .group-row td { background: #fde68a; font-weight: 700; color: #92400e; border-bottom: 1px solid #b45309; font-size: 10px; }
  .total-row td { background: #1e3a5f; color: #fff; font-weight: 800; font-size: 11px; border: none; }
  .footer { margin-top: 10px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #ddd; padding-top: 5px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div><h1>TRANSPORTADORA TRIUNFO</h1><div style="font-size:12px;color:#333;font-weight:600;margin-top:2px;">${esc(title)}</div></div>
  <div class="meta">Impresso em: ${now}</div>
</div>
${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalRow}</tbody></table>
<div class="footer">Controle de Frota — Transportadora Triunfo</div>
</body></html>`

  const win = window.open('', '_blank', 'width=1100,height=700')
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.print() }
}
