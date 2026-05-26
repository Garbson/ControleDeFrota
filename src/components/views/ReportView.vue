<script setup>
import { ref, computed } from 'vue'
import { accountsPayable } from '../../data/accounts-payable.js'
import { fuelRecords } from '../../data/fuel.js'
const activeTab = ref('payable')

const today = new Date().toLocaleDateString('pt-BR')

// ── Contas a Pagar (agrupado por vencimento) ──
const payableByDate = computed(() => {
  const groups = {}
  const sorted = [...accountsPayable].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  sorted.forEach(c => {
    if (!groups[c.vencimento]) groups[c.vencimento] = { items: [], total: 0 }
    groups[c.vencimento].items.push(c)
    groups[c.vencimento].total += c.valor
  })
  return Object.entries(groups).map(([date, group]) => ({ date, ...group }))
})

const payableTotal = computed(() => accountsPayable.reduce((s, c) => s + c.valor, 0))

// ── Por Motorista (despesas agrupadas) ──
const byDriver = computed(() => {
  const groups = {}
  accountsPayable.forEach(c => {
    const key = c.motorista
    if (!groups[key]) groups[key] = { motorista: key, items: [], total: 0 }
    groups[key].items.push(c)
    groups[key].total += c.valor
  })
  return Object.values(groups).sort((a, b) => b.total - a.total)
})

const driverTotal = computed(() => accountsPayable.reduce((s, c) => s + c.valor, 0))

// ── Por Combustível (agrupado por motorista) ──
const byFuel = computed(() => {
  const groups = {}
  fuelRecords.forEach(f => {
    const key = f.motorista
    if (!groups[key]) groups[key] = { motorista: key, items: [], total: 0, litros: 0 }
    groups[key].items.push(f)
    groups[key].total += f.total
    groups[key].litros += f.litros
  })
  return Object.values(groups).sort((a, b) => b.total - a.total)
})

const fuelTotal = computed(() => fuelRecords.reduce((s, f) => s + f.total, 0))
const fuelLitrosTotal = computed(() => fuelRecords.reduce((s, f) => s + f.litros, 0))
</script>

<template>
  <div>
    <!-- ═══════════ PRINT HEADER ═══════════ -->
    <div class="print-header" style="display:none; align-items:center; justify-content:space-between; border-bottom:2px solid #1a1f2e; padding-bottom:12px; margin-bottom:16px">
      <div>
        <div style="font-size:18px; font-weight:800; color:#0f172a;">ControleFrota</div>
        <div style="font-size:10px; color:#64748b; letter-spacing:0.1em; text-transform:uppercase;">Gestão de Frota</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:14px; font-weight:700; color:#0f172a;">
          <template v-if="activeTab === 'payable'">Relatório 16 — Contas a Pagar</template>
          <template v-else-if="activeTab === 'driver'">Relatório de Despesas por Motorista</template>
          <template v-else>Relatório de Combustível por Motorista</template>
        </div>
        <div style="font-size:9px; color:#64748b;">Período: Mai/2026 · Emitido em {{ today }}</div>
      </div>
    </div>

    <!-- Screen Header -->
    <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] rounded-xl p-[22px_26px] mb-5 flex justify-between items-center screen-only">
      <div>
        <div class="text-slate-400 text-[11px] font-bold uppercase tracking-[0.06em]">Relatório</div>
        <div class="text-white text-xl font-extrabold mt-1">
          <template v-if="activeTab === 'payable'">Relatório 16 — Contas a Pagar</template>
          <template v-else-if="activeTab === 'driver'">Relatório de Despesas por Motorista</template>
          <template v-else>Relatório de Combustível por Motorista</template>
        </div>
        <div class="text-slate-500 text-xs mt-0.5">Período: Mai/2026 · Emitido em {{ today }}</div>
      </div>
      <div class="flex gap-2">
        <button onclick="window.print()" class="btn-p !bg-white/10 !border !border-white/20 print:hidden">
          <svg width="15" height="15" fill="white" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
          Imprimir
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1.5 mb-5 screen-only">
      <button class="sbtn" :class="{ on: activeTab === 'payable' }" @click="activeTab = 'payable'">
        📋 Contas a Pagar
      </button>
      <button class="sbtn" :class="{ on: activeTab === 'driver' }" @click="activeTab = 'driver'">
        👤 Por Motorista
      </button>
      <button class="sbtn" :class="{ on: activeTab === 'fuel' }" @click="activeTab = 'fuel'">
        ⛽ Por Combustível
      </button>
    </div>

    <!-- ═══════════ CONTAS A PAGAR ═══════════ -->
    <div v-if="activeTab === 'payable'" class="bg-white rounded-xl border border-slate-200 overflow-hidden print:rounded-none print:border-none print:shadow-none">
      <!-- KPIs -->
      <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
        <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total a Pagar</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ payableTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Contas</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ accountsPayable.length }} lançamentos</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ accountsPayable.filter(c => c.status === 'pendente').length }} em aberto</div>
        </div>
      </div>

      <!-- Table -->
      <table class="w-full border-collapse">
        <thead>
          <tr class="print:bg-slate-100">
            <th class="th" style="width:120px">Vencimento</th>
            <th class="th" style="width:110px">Valor</th>
            <th class="th" style="width:90px">Emissão</th>
            <th class="th">Documento</th>
            <th class="th" style="width:100px">Placa</th>
            <th class="th" style="width:120px">Motorista</th>
            <th class="th" style="width:80px">Status</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in payableByDate" :key="group.date">
            <tr class="bg-slate-300 print-group-row">
              <td class="td font-extrabold text-slate-800 text-xs" colspan="7">
                {{ group.date }} — Total: R$ {{ group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </td>
            </tr>
            <tr class="trow" v-for="c in group.items" :key="c.id">
              <td class="td text-xs text-slate-400">{{ c.vencimento }}</td>
              <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">
                R$ {{ c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="td text-[11px] text-slate-400">{{ c.emissao }}</td>
              <td class="td text-[11px] max-w-[320px] truncate" :title="c.documento">{{ c.documento }}</td>
              <td class="td">
                <span class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ c.placa }}</span>
              </td>
              <td class="td text-xs font-semibold text-slate-700">{{ c.motorista }}</td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="c.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
                >
                  {{ c.status === 'pago' ? 'Pago' : 'Pendente' }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="bg-slate-100 print:bg-slate-200">
            <td class="td font-extrabold text-slate-900 text-sm" colspan="7">
              Total Geral: R$ {{ payableTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ═══════════ POR MOTORISTA ═══════════ -->
    <div v-else-if="activeTab === 'driver'" class="bg-white rounded-xl border border-slate-200 overflow-hidden print:rounded-none print:border-none print:shadow-none">
      <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
        <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Despesas</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ driverTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motoristas</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ byDriver.length }} com gastos</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média por Motorista</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ (driverTotal / byDriver.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
        </div>
      </div>

      <table class="w-full border-collapse">
        <thead>
          <tr class="print:bg-slate-100">
            <th class="th">Motorista</th>
            <th class="th" style="width:110px">Valor</th>
            <th class="th" style="width:90px">Emissão</th>
            <th class="th">Documento</th>
            <th class="th" style="width:100px">Placa</th>
            <th class="th" style="width:80px">Status</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in byDriver" :key="group.motorista">
            <tr class="bg-blue-200 print-group-row">
              <td class="td font-extrabold text-blue-900 text-sm" colspan="6">
                {{ group.motorista }} — Total: R$ {{ group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </td>
            </tr>
            <tr class="trow" v-for="c in group.items" :key="c.id">
              <td class="td text-xs font-semibold text-slate-700 pl-8">{{ c.motorista }}</td>
              <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">
                R$ {{ c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="td text-[11px] text-slate-400">{{ c.emissao }}</td>
              <td class="td text-[11px] max-w-[300px] truncate" :title="c.documento">{{ c.documento }}</td>
              <td class="td"><span class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ c.placa }}</span></td>
              <td class="td">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="c.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'">
                  {{ c.status === 'pago' ? 'Pago' : 'Pendente' }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="bg-slate-100 print:bg-slate-200">
            <td class="td font-extrabold text-slate-900 text-sm" colspan="6">
              Total Geral: R$ {{ driverTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ═══════════ POR COMBUSTÍVEL ═══════════ -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden print:rounded-none print:border-none print:shadow-none">
      <div class="grid grid-cols-4 gap-3.5 p-5 pb-0 screen-only">
        <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Gasto Total</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fuelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Litros</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ fuelLitrosTotal.toLocaleString('pt-BR') }} L</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #10b981">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média R$/L</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ (fuelTotal / fuelLitrosTotal).toFixed(2) }}</div>
        </div>
        <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Abastecimentos</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ fuelRecords.length }}</div>
        </div>
      </div>

      <table class="w-full border-collapse">
        <thead>
          <tr class="print:bg-slate-100">
            <th class="th">Motorista</th>
            <th class="th" style="width:90px">Data</th>
            <th class="th" style="width:100px">Placa</th>
            <th class="th" style="width:80px">Litros</th>
            <th class="th" style="width:90px">Preço/L</th>
            <th class="th" style="width:110px">Total</th>
            <th class="th">Posto</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in byFuel" :key="group.motorista">
            <tr class="bg-amber-200 print-group-row">
              <td class="td font-extrabold text-amber-900 text-sm" colspan="7">
                {{ group.motorista }} — {{ group.litros }} L · Total: R$ {{ group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </td>
            </tr>
            <tr class="trow" v-for="f in group.items" :key="f.id">
              <td class="td text-xs font-semibold text-slate-700 pl-8">{{ f.motorista }}</td>
              <td class="td text-xs text-slate-400">{{ f.data }}</td>
              <td class="td"><span class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ f.placa }}</span></td>
              <td class="td font-bold text-slate-900 text-xs">{{ f.litros }} L</td>
              <td class="td text-xs text-slate-500">R$ {{ f.preco.toFixed(2) }}</td>
              <td class="td font-bold text-slate-900 text-xs">R$ {{ f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</td>
              <td class="td text-[11px] text-slate-400 max-w-[200px] truncate">{{ f.posto }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="bg-slate-100 print:bg-slate-200">
            <td class="td font-extrabold text-slate-900 text-sm" colspan="7">
              Total Geral: R$ {{ fuelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }} · {{ fuelLitrosTotal.toLocaleString('pt-BR') }} litros
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
