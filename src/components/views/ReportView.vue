<script setup>
import { ref, computed, onMounted } from 'vue'
import XLSX from 'xlsx-js-style'
import { usePayable } from '../../composables/usePayable'
import { useFuel } from '../../composables/useFuel'

const activeTab = ref('payable')

// Período padrão: mês atual
const now = new Date()
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const lastOfMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

const dateFrom    = ref(firstOfMonth)
const dateTo      = ref(lastOfMonth)
const statusFilter = ref('all') // 'all' | 'pendente' | 'pago'

const today = now.toLocaleDateString('pt-BR')

const { items: payableItemsRaw, loading: payableLoading, fetchAll: fetchPayable } = usePayable()
const { records: fuelRecords, loading: fuelLoading, fetchAll: fetchFuel } = useFuel()

const loading = computed(() => payableLoading.value || fuelLoading.value)

// Filtra status no lado cliente (o backend já filtra por data)
const payableItems = computed(() => {
  if (statusFilter.value === 'all') return payableItemsRaw.value
  return payableItemsRaw.value.filter(c => c.status === statusFilter.value)
})

function applyFilter() {
  fetchPayable({ from: dateFrom.value, to: dateTo.value })
  fetchFuel({ from: dateFrom.value, to: dateTo.value })
}

function setPreset(preset) {
  const d = new Date()
  if (preset === 'mes') {
    dateFrom.value = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    dateTo.value   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  } else if (preset === 'mes-ant') {
    dateFrom.value = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]
    dateTo.value   = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]
  } else if (preset === 'ano') {
    dateFrom.value = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]
    dateTo.value   = new Date(d.getFullYear(), 11, 31).toISOString().split('T')[0]
  } else if (preset === 'tudo') {
    dateFrom.value = ''
    dateTo.value   = ''
  }
  applyFilter()
}

// Label do período selecionado para o cabeçalho do relatório
const periodoLabel = computed(() => {
  if (!dateFrom.value && !dateTo.value) return 'Todo o período'
  const f = dateFrom.value ? new Date(dateFrom.value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'
  const t = dateTo.value   ? new Date(dateTo.value).toLocaleDateString('pt-BR',   { timeZone: 'UTC' }) : '—'
  return `${f} até ${t}`
})

// ── Contas a Pagar agrupado por vencimento
const payableByDate = computed(() => {
  const groups = {}
  const sorted = [...payableItems.value].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
  sorted.forEach(c => {
    const key = c.due_date || 'Sem vencimento'
    if (!groups[key]) groups[key] = { items: [], total: 0 }
    groups[key].items.push(c)
    groups[key].total += Number(c.value || 0)
  })
  return Object.entries(groups).map(([date, group]) => ({ date, ...group }))
})

const payableTotal = computed(() => payableItems.value.reduce((s, c) => s + Number(c.value || 0), 0))

// ── Por Motorista
const byDriver = computed(() => {
  const groups = {}
  payableItems.value.forEach(c => {
    const key = c.driver_name || 'Sem motorista'
    if (!groups[key]) groups[key] = { motorista: key, items: [], total: 0 }
    groups[key].items.push(c)
    groups[key].total += Number(c.value || 0)
  })
  return Object.values(groups).sort((a, b) => b.total - a.total)
})

// ── Por Combustível agrupado por motorista
const byFuel = computed(() => {
  const groups = {}
  fuelRecords.value.forEach(f => {
    const key = f.driver_name || 'Sem motorista'
    if (!groups[key]) groups[key] = { motorista: key, items: [], total: 0, litros: 0 }
    groups[key].items.push(f)
    groups[key].total  += Number(f.total  || 0)
    groups[key].litros += Number(f.liters || 0)
  })
  return Object.values(groups).sort((a, b) => b.total - a.total)
})

const fuelTotal       = computed(() => fuelRecords.value.reduce((s, f) => s + Number(f.total  || 0), 0))
const fuelLitrosTotal = computed(() => fuelRecords.value.reduce((s, f) => s + Number(f.liters || 0), 0))

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function fmtDate(raw) {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// ─────────────────────────────────────────────
// Exportação (Excel / Word)
// ─────────────────────────────────────────────

// Monta título, cabeçalho e linhas de acordo com a aba ativa
// Cada item em `rows` é { type: 'group' | 'row', data: [...], groupTotal?: number, groupLabel?: string }
function buildReportData() {
  if (activeTab.value === 'payable') {
    const header = ['Vencimento', 'Valor (R$)', 'Documento', 'Placa', 'Motorista', 'Fornecedor', 'Status']
    const rows = []
    payableByDate.value.forEach(group => {
      group.items.forEach(c => {
        rows.push({ type: 'row', data: [
          fmtDate(c.due_date),
          Number(c.value || 0),
          c.description || c.document || '',
          c.vehicle_plate || '',
          c.driver_name || '',
          c.supplier_name || '',
          c.status === 'pago' ? 'Pago' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente',
        ]})
      })
      rows.push({ type: 'group', groupLabel: `Subtotal ${fmtDate(group.date)}`, groupTotal: group.total, cols: header.length })
    })
    return { title: 'Contas a Pagar', header, rows, totalLabel: 'Total Geral (R$)', total: payableTotal.value }
  }
  if (activeTab.value === 'driver') {
    const header = ['Motorista', 'Valor (R$)', 'Documento', 'Placa', 'Status']
    const rows = []
    byDriver.value.forEach(group => {
      group.items.forEach(c => {
        rows.push({ type: 'row', data: [
          c.driver_name || 'Sem motorista',
          Number(c.value || 0),
          c.description || c.document || '',
          c.vehicle_plate || '',
          c.status === 'pago' ? 'Pago' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente',
        ]})
      })
      rows.push({ type: 'group', groupLabel: `Subtotal ${group.motorista}`, groupTotal: group.total, cols: header.length })
    })
    return { title: 'Despesas por Motorista', header, rows, totalLabel: 'Total Geral (R$)', total: payableTotal.value }
  }
  // fuel
  const header = ['Motorista', 'Data', 'Placa', 'Litros', 'R$/L', 'Total (R$)', 'Posto']
  const rows = []
  byFuel.value.forEach(group => {
    group.items.forEach(f => {
      rows.push({ type: 'row', data: [
        f.driver_name || 'Sem motorista',
        fmtDate(f.fuel_date),
        f.vehicle_plate || '',
        Number(f.liters || 0),
        Number(f.price_liter || 0),
        Number(f.total || 0),
        f.station || '',
      ]})
    })
    rows.push({ type: 'group', groupLabel: `Subtotal ${group.motorista} — ${group.litros.toLocaleString('pt-BR')} L`, groupTotal: group.total, cols: header.length })
  })
  return { title: 'Combustível por Motorista', header, rows, totalLabel: 'Total Geral (R$)', total: fuelTotal.value }
}

function reportFileName(ext) {
  const slug = activeTab.value === 'payable' ? 'contas-a-pagar'
    : activeTab.value === 'driver' ? 'despesas-por-motorista'
    : 'combustivel'
  const stamp = new Date().toISOString().split('T')[0]
  return `relatorio-${slug}-${stamp}.${ext}`
}

function exportExcel() {
  const { title, header, rows, totalLabel, total } = buildReportData()
  const cols = header.length

  const sTitle = { font: { bold: true, sz: 16, color: { rgb: 'B45309' } }, alignment: { horizontal: 'left' } }
  const sSub = { font: { sz: 10, color: { rgb: '6B7280' } }, alignment: { horizontal: 'left' } }
  const sHeader = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'B45309' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: '92400E' } } } }
  const sCell = { font: { sz: 10, color: { rgb: '1F2937' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'hair', color: { rgb: 'E5E7EB' } } } }
  const sMoney = { ...sCell, numFmt: '#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } }
  const sTotal = { font: { bold: true, sz: 11, color: { rgb: '1F2937' } }, fill: { fgColor: { rgb: 'F3F0EB' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'B45309' } } } }
  const sTotalVal = { ...sTotal, numFmt: '#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } }
  const sStripe = { fill: { fgColor: { rgb: 'FAF7F2' } } }

  const sGroup = { font: { bold: true, sz: 10, color: { rgb: '92400E' } }, fill: { fgColor: { rgb: 'FDE68A' } }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: 'B45309' } } } }
  const sGroupVal = { ...sGroup, numFmt: '#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } }

  const moneyCols = activeTab.value === 'fuel' ? [4, 5] : [1]
  const numCols = activeTab.value === 'fuel' ? [3] : []
  const moneyTotalCol = activeTab.value === 'fuel' ? 5 : 1

  const aoa = []
  aoa.push([{ v: 'Transportadora Triunfo', s: sTitle }])
  aoa.push([{ v: `Relatório: ${title}`, s: sSub }])
  aoa.push([{ v: `Período: ${periodoLabel.value}`, s: sSub }])
  aoa.push([{ v: `Emitido em: ${today}`, s: sSub }])
  aoa.push([])
  aoa.push(header.map(h => ({ v: h, s: sHeader })))

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: cols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: cols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: cols - 1 } },
  ]

  let dataIdx = 0
  rows.forEach(item => {
    if (item.type === 'group') {
      const groupRow = []
      const rowIdx = aoa.length
      for (let i = 0; i < cols; i++) {
        if (i === 0) groupRow.push({ v: `${item.groupLabel}`, s: sGroup })
        else if (i === moneyTotalCol) groupRow.push({ v: item.groupTotal, t: 'n', s: sGroupVal })
        else groupRow.push({ v: '', s: sGroup })
      }
      merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: moneyTotalCol - 1 } })
      aoa.push(groupRow)
      dataIdx = 0
    } else {
      const isStripe = dataIdx % 2 === 1
      aoa.push(item.data.map((cell, ci) => {
        const isMoney = moneyCols.includes(ci)
        const isNum = numCols.includes(ci)
        const base = isMoney ? sMoney : sCell
        const style = isStripe ? { ...base, fill: { ...sStripe.fill } } : base
        return { v: cell, t: (isMoney || isNum) ? 'n' : 's', s: style }
      }))
      dataIdx++
    }
  })

  aoa.push([])
  const totalRow = []
  for (let i = 0; i < cols; i++) {
    if (i === 0) totalRow.push({ v: totalLabel, s: sTotal })
    else if (i === moneyTotalCol) totalRow.push({ v: total, t: 'n', s: sTotalVal })
    else totalRow.push({ v: '', s: sTotal })
  }
  aoa.push(totalRow)

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  ws['!merges'] = merges

  // Largura das colunas
  const descCol = activeTab.value === 'fuel' ? 6 : 2
  ws['!cols'] = header.map((_, i) => ({ wch: i === descCol ? 45 : i === 0 ? 20 : 16 }))

  // Altura das linhas
  ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, reportFileName('xlsx'))
}

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function exportWord() {
  const { title, header, rows, totalLabel, total } = buildReportData()
  const brl = (v) => 'R$ ' + fmt(v)
  // Índices de colunas numéricas de moeda por aba
  const moneyCols = activeTab.value === 'fuel' ? [4, 5] : [1]
  const litrosCol = activeTab.value === 'fuel' ? 3 : -1

  const moneyTotalCol = activeTab.value === 'fuel' ? 5 : 1
  const thead = header.map(h => `<th>${esc(h)}</th>`).join('')
  const tbody = rows.map(item => {
    if (item.type === 'group') {
      const labelSpan = moneyTotalCol || 1
      const remaining = header.length - labelSpan - 1
      return `<tr class="group-row"><td colspan="${labelSpan}" style="background:#fde68a;font-weight:bold;color:#92400e;border:1px solid #b45309;">${esc(item.groupLabel)}</td><td align="right" style="background:#fde68a;font-weight:bold;color:#92400e;border:1px solid #b45309;">${brl(item.groupTotal)}</td>${remaining > 0 ? `<td colspan="${remaining}" style="background:#fde68a;border:1px solid #b45309;"></td>` : ''}</tr>`
    }
    const tds = item.data.map((cell, i) => {
      let val
      if (moneyCols.includes(i)) val = brl(cell)
      else if (i === litrosCol) val = fmt(cell) + ' L'
      else val = esc(cell)
      const align = (moneyCols.includes(i) || i === litrosCol) ? ' align="right"' : ''
      return `<td${align}>${val}</td>`
    }).join('')
    return `<tr>${tds}</tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(title)}</title>
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
  <div class="sub">Relatório: ${esc(title)}</div>
  <div class="sub">Período: ${esc(periodoLabel.value)} &nbsp;·&nbsp; Emitido em ${esc(today)}</div>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
  <div class="total">${esc(totalLabel.replace(' (R$)', ''))}: ${brl(total)}</div>
</body></html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = reportFileName('doc')
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => applyFilter())
</script>

<template>
  <div>
    <!-- Cabeçalho de impressão: oculto na tela, aparece em cada página impressa -->
    <div class="print-logo-header">
      <img src="/logo-triunfo.png" alt="Transportadora Triunfo" class="print-logo-img" />
      <div>
        <div class="print-logo-name">Transportadora Triunfo</div>
        <div class="print-logo-sub">Relatório Gerencial · {{ periodoLabel }}</div>
      </div>
      <div class="print-logo-date">Emitido em {{ today }}</div>
    </div>

    <!-- Filtro de período -->
    <div class="glass rounded-[11px] py-3.5 px-[18px] mb-4 flex gap-3 items-center flex-wrap print:hidden">
      <span class="text-xs font-bold text-slate-500">PERÍODO:</span>

      <button class="sbtn" @click="setPreset('mes')">Este mês</button>
      <button class="sbtn" @click="setPreset('mes-ant')">Mês anterior</button>
      <button class="sbtn" @click="setPreset('ano')">Este ano</button>
      <button class="sbtn" @click="setPreset('tudo')">Tudo</button>

      <div class="w-px h-5 bg-stone-200 mx-1" />

      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold text-slate-500">De</label>
        <input v-model="dateFrom" type="date" class="finput !w-auto !py-1.5 text-xs" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold text-slate-500">até</label>
        <input v-model="dateTo" type="date" class="finput !w-auto !py-1.5 text-xs" />
      </div>

      <button @click="applyFilter" class="btn-p !py-1.5 !px-4 text-xs">
        Aplicar
      </button>

      <div class="w-px h-5 bg-stone-200 mx-1" />

      <span class="text-xs font-bold text-slate-500">STATUS:</span>
      <button class="sbtn" :class="{ on: statusFilter === 'all' }"      @click="statusFilter = 'all'">Todas</button>
      <button class="sbtn" :class="{ on: statusFilter === 'pendente' }" @click="statusFilter = 'pendente'">Não pagas</button>
      <button class="sbtn" :class="{ on: statusFilter === 'pago' }"     @click="statusFilter = 'pago'">Pagas</button>

      <div class="ml-auto text-[11px] text-slate-400 font-medium">{{ periodoLabel }}</div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <!-- Screen Header -->
      <div class="glass rounded-xl p-[22px_26px] mb-5 flex justify-between items-center screen-only">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-[0.06em]" style="color:#92806a">Relatório</div>
          <div class="text-stone-800 text-xl font-extrabold mt-1">
            <template v-if="activeTab === 'payable'">Contas a Pagar</template>
            <template v-else-if="activeTab === 'driver'">Despesas por Motorista</template>
            <template v-else>Combustível por Motorista</template>
          </div>
          <div class="text-stone-400 text-xs mt-0.5">{{ periodoLabel }} · Emitido em {{ today }}</div>
        </div>
        <div class="flex gap-2 print:hidden">
          <button @click="exportExcel" class="sbtn !bg-green-600 !text-white !border-green-600 hover:!bg-green-700 flex items-center gap-1.5">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 12.5l-1.5 2.5H10l2-3-2-3h1.5l1.5 2.5L14.5 11H16l-2 3 2 3h-1.5L13 14.5zM13 9V3.5L18.5 9H13z"/></svg>
            Excel
          </button>
          <button @click="exportWord" class="sbtn !bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 flex items-center gap-1.5">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2.5 9l-1.25 6h-1.4L12 12.6 10.15 17h-1.4L7.5 11h1.4l.8 4.2L11.4 11h1.2l1.7 4.2.8-4.2h1.4zM13 9V3.5L18.5 9H13z"/></svg>
            Word
          </button>
          <button onclick="window.print()" class="btn-p">
            <svg width="15" height="15" fill="white" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
            Imprimir
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1.5 mb-5 screen-only">
        <button class="sbtn" :class="{ on: activeTab === 'payable' }" @click="activeTab = 'payable'">Contas a Pagar</button>
        <button class="sbtn" :class="{ on: activeTab === 'driver' }"  @click="activeTab = 'driver'">Por Motorista</button>
        <button class="sbtn" :class="{ on: activeTab === 'fuel' }"    @click="activeTab = 'fuel'">Combustível</button>
      </div>

      <!-- ═══════════ CONTAS A PAGAR ═══════════ -->
      <div v-if="activeTab === 'payable'" class="glass rounded-xl overflow-hidden">
        <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total a Pagar</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">R$ {{ fmt(payableTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Lançamentos</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">{{ payableItems.length }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">{{ payableItems.filter(c => c.status === 'pendente').length }} em aberto</div>
          </div>
        </div>

        <div v-if="!payableItems.length" class="text-center text-slate-400 text-xs py-10">Nenhuma conta no período selecionado</div>
        <table v-else class="w-full border-collapse mt-4 report-table">
          <colgroup>
            <col style="width:10%">
            <col style="width:56%">
            <col style="width:10%">
            <col style="width:12%">
            <col style="width:12%">
          </colgroup>
          <thead>
            <tr>
              <th class="th">Valor</th>
              <th class="th">Documento</th>
              <th class="th">Placa</th>
              <th class="th">Motorista</th>
              <th class="th">Fornecedor</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in payableByDate" :key="group.date">
              <tr class="trow" v-for="c in group.items" :key="c.id">
                <td class="td font-bold text-stone-800 text-xs whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
                <td class="td text-[11px]">{{ c.description || c.document || '—' }}</td>
                <td class="td">
                  <span v-if="c.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-stone-100/70 px-1.5 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                  <span v-else class="text-stone-600">—</span>
                </td>
                <td class="td text-xs font-semibold text-stone-600">{{ c.driver_name || '—' }}</td>
                <td class="td text-xs text-stone-500">{{ c.supplier_name || '—' }}</td>
              </tr>
              <tr class="bg-stone-100/70">
                <td class="td font-extrabold text-slate-800 text-xs" colspan="5">
                  Subtotal {{ fmtDate(group.date) }}: R$ {{ fmt(group.total) }}
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="bg-stone-100/70">
              <td class="td font-extrabold text-stone-800 text-sm" colspan="5">Total Geral: R$ {{ fmt(payableTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ═══════════ POR MOTORISTA ═══════════ -->
      <div v-else-if="activeTab === 'driver'" class="glass rounded-xl overflow-hidden">
        <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Despesas</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">R$ {{ fmt(payableTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motoristas</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">{{ byDriver.length }} com gastos</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média por Motorista</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">R$ {{ byDriver.length ? fmt(payableTotal / byDriver.length) : '0,00' }}</div>
          </div>
        </div>

        <div v-if="!byDriver.length" class="text-center text-slate-400 text-xs py-10">Nenhuma despesa no período selecionado</div>
        <table v-else class="w-full border-collapse mt-4 report-table">
          <thead>
            <tr>
              <th class="th">Motorista</th>
              <th class="th">Valor</th>
              <th class="th">Documento</th>
              <th class="th">Placa</th>
              <th class="th">Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in byDriver" :key="group.motorista">
              <tr class="trow" v-for="c in group.items" :key="c.id">
                <td class="td text-xs font-semibold text-stone-600 pl-8">{{ c.driver_name || '—' }}</td>
                <td class="td font-bold text-stone-800 text-xs whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
                <td class="td text-[11px] max-w-[300px] truncate">{{ c.description || c.document || '—' }}</td>
                <td class="td">
                  <span v-if="c.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-stone-100/70 px-1.5 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                  <span v-else class="text-stone-600">—</span>
                </td>
                <td class="td">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    :class="c.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'">
                    {{ c.status === 'pago' ? 'Pago' : 'Pendente' }}
                  </span>
                </td>
              </tr>
              <tr class="bg-blue-100">
                <td class="td font-extrabold text-blue-900 text-sm" colspan="5">
                  Subtotal {{ group.motorista }}: R$ {{ fmt(group.total) }}
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="bg-stone-100/70">
              <td class="td font-extrabold text-stone-800 text-sm" colspan="5">Total Geral: R$ {{ fmt(payableTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ═══════════ POR COMBUSTÍVEL ═══════════ -->
      <div v-else class="glass rounded-xl overflow-hidden">
        <div class="grid grid-cols-4 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Gasto Total</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">R$ {{ fmt(fuelTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Litros</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">{{ fuelLitrosTotal.toLocaleString('pt-BR') }} L</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #10b981">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média R$/L</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">R$ {{ fuelLitrosTotal > 0 ? fmt(fuelTotal / fuelLitrosTotal) : '0,00' }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Abastecimentos</div>
            <div class="text-2xl font-extrabold text-stone-800 mt-1.5">{{ fuelRecords.length }}</div>
          </div>
        </div>

        <div v-if="!fuelRecords.length" class="text-center text-slate-400 text-xs py-10">Nenhum abastecimento no período selecionado</div>
        <table v-else class="w-full border-collapse mt-4 report-table">
          <thead>
            <tr>
              <th class="th">Motorista</th>
              <th class="th">Data</th>
              <th class="th">Placa</th>
              <th class="th">Litros</th>
              <th class="th">R$/L</th>
              <th class="th">Total</th>
              <th class="th">Posto</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in byFuel" :key="group.motorista">
              <tr class="trow" v-for="f in group.items" :key="f.id">
                <td class="td text-xs font-semibold text-stone-600 pl-8">{{ f.driver_name || '—' }}</td>
                <td class="td text-xs text-slate-500">{{ fmtDate(f.fuel_date) }}</td>
                <td class="td">
                  <span v-if="f.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-stone-100/70 px-1.5 py-0.5 rounded">{{ f.vehicle_plate }}</span>
                  <span v-else class="text-stone-600">—</span>
                </td>
                <td class="td font-bold text-stone-800 text-xs">{{ f.liters }} L</td>
                <td class="td text-xs text-slate-500">R$ {{ Number(f.price_liter).toFixed(3) }}</td>
                <td class="td font-bold text-stone-800 text-xs whitespace-nowrap">R$ {{ fmt(f.total) }}</td>
                <td class="td text-[11px] text-slate-400 max-w-[200px] truncate">{{ f.station || '—' }}</td>
              </tr>
              <tr class="bg-amber-100">
                <td class="td font-extrabold text-amber-900 text-sm" colspan="7">
                  Subtotal {{ group.motorista }}: {{ group.litros.toLocaleString('pt-BR') }} L · R$ {{ fmt(group.total) }}
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="bg-stone-100/70">
              <td class="td font-extrabold text-stone-800 text-sm" colspan="7">
                Total Geral: R$ {{ fmt(fuelTotal) }} · {{ fuelLitrosTotal.toLocaleString('pt-BR') }} litros
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>
