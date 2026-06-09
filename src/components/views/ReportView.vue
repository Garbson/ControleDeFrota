<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayable } from '../../composables/usePayable'
import { useFuel } from '../../composables/useFuel'

const activeTab = ref('payable')
const today = new Date().toLocaleDateString('pt-BR')

const { items: payableItems, loading: payableLoading, fetchAll: fetchPayable } = usePayable()
const { records: fuelRecords, loading: fuelLoading, fetchAll: fetchFuel } = useFuel()

const loading = computed(() => payableLoading.value || fuelLoading.value)

// ── Contas a Pagar (agrupado por vencimento)
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

const driverTotal = computed(() => payableTotal.value)

// ── Por Combustível (agrupado por motorista)
const byFuel = computed(() => {
  const groups = {}
  fuelRecords.value.forEach(f => {
    const key = f.driver_name || 'Sem motorista'
    if (!groups[key]) groups[key] = { motorista: key, items: [], total: 0, litros: 0 }
    groups[key].items.push(f)
    groups[key].total += Number(f.total || 0)
    groups[key].litros += Number(f.liters || 0)
  })
  return Object.values(groups).sort((a, b) => b.total - a.total)
})

const fuelTotal = computed(() => fuelRecords.value.reduce((s, f) => s + Number(f.total || 0), 0))
const fuelLitrosTotal = computed(() => fuelRecords.value.reduce((s, f) => s + Number(f.liters || 0), 0))

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

onMounted(() => {
  fetchPayable()
  fetchFuel()
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <!-- Screen Header -->
      <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] rounded-xl p-[22px_26px] mb-5 flex justify-between items-center screen-only">
        <div>
          <div class="text-slate-400 text-[11px] font-bold uppercase tracking-[0.06em]">Relatório</div>
          <div class="text-white text-xl font-extrabold mt-1">
            <template v-if="activeTab === 'payable'">Relatório — Contas a Pagar</template>
            <template v-else-if="activeTab === 'driver'">Relatório de Despesas por Motorista</template>
            <template v-else>Relatório de Combustível por Motorista</template>
          </div>
          <div class="text-slate-500 text-xs mt-0.5">Emitido em {{ today }}</div>
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
        <button class="sbtn" :class="{ on: activeTab === 'payable' }" @click="activeTab = 'payable'">📋 Contas a Pagar</button>
        <button class="sbtn" :class="{ on: activeTab === 'driver' }" @click="activeTab = 'driver'">👤 Por Motorista</button>
        <button class="sbtn" :class="{ on: activeTab === 'fuel' }" @click="activeTab = 'fuel'">⛽ Por Combustível</button>
      </div>

      <!-- ═══════════ CONTAS A PAGAR ═══════════ -->
      <div v-if="activeTab === 'payable'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total a Pagar</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fmt(payableTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Contas</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ payableItems.length }} lançamentos</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ payableItems.filter(c => c.status === 'pendente').length }} em aberto</div>
          </div>
        </div>
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Vencimento</th>
              <th class="th">Valor</th>
              <th class="th">Documento</th>
              <th class="th">Placa</th>
              <th class="th">Motorista</th>
              <th class="th">Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in payableByDate" :key="group.date">
              <tr class="bg-slate-300">
                <td class="td font-extrabold text-slate-800 text-xs" colspan="6">
                  {{ group.date }} — Total: R$ {{ fmt(group.total) }}
                </td>
              </tr>
              <tr class="trow" v-for="c in group.items" :key="c.id">
                <td class="td text-xs text-slate-400">{{ c.due_date || '—' }}</td>
                <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
                <td class="td text-[11px] max-w-[320px] truncate">{{ c.description || c.document || '—' }}</td>
                <td class="td"><span v-if="c.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ c.vehicle_plate }}</span><span v-else>—</span></td>
                <td class="td text-xs font-semibold text-slate-700">{{ c.driver_name || '—' }}</td>
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
            <tr class="bg-slate-100">
              <td class="td font-extrabold text-slate-900 text-sm" colspan="6">Total Geral: R$ {{ fmt(payableTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ═══════════ POR MOTORISTA ═══════════ -->
      <div v-else-if="activeTab === 'driver'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Despesas</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fmt(driverTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motoristas</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ byDriver.length }} com gastos</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média por Motorista</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ byDriver.length ? fmt(driverTotal / byDriver.length) : '0,00' }}</div>
          </div>
        </div>
        <table class="w-full border-collapse">
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
              <tr class="bg-blue-200">
                <td class="td font-extrabold text-blue-900 text-sm" colspan="5">
                  {{ group.motorista }} — Total: R$ {{ fmt(group.total) }}
                </td>
              </tr>
              <tr class="trow" v-for="c in group.items" :key="c.id">
                <td class="td text-xs font-semibold text-slate-700 pl-8">{{ c.driver_name || '—' }}</td>
                <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
                <td class="td text-[11px] max-w-[300px] truncate">{{ c.description || c.document || '—' }}</td>
                <td class="td"><span v-if="c.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ c.vehicle_plate }}</span><span v-else>—</span></td>
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
            <tr class="bg-slate-100">
              <td class="td font-extrabold text-slate-900 text-sm" colspan="5">Total Geral: R$ {{ fmt(driverTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ═══════════ POR COMBUSTÍVEL ═══════════ -->
      <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="grid grid-cols-4 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Gasto Total</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fmt(fuelTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Litros</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ fuelLitrosTotal.toLocaleString('pt-BR') }} L</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #10b981">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média R$/L</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fuelLitrosTotal > 0 ? (fuelTotal / fuelLitrosTotal).toFixed(2) : '0,00' }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Abastecimentos</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ fuelRecords.length }}</div>
          </div>
        </div>
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Motorista</th>
              <th class="th">Data</th>
              <th class="th">Placa</th>
              <th class="th">Litros</th>
              <th class="th">Preço/L</th>
              <th class="th">Total</th>
              <th class="th">Posto</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in byFuel" :key="group.motorista">
              <tr class="bg-amber-200">
                <td class="td font-extrabold text-amber-900 text-sm" colspan="7">
                  {{ group.motorista }} — {{ group.litros }} L · Total: R$ {{ fmt(group.total) }}
                </td>
              </tr>
              <tr class="trow" v-for="f in group.items" :key="f.id">
                <td class="td text-xs font-semibold text-slate-700 pl-8">{{ f.driver_name || '—' }}</td>
                <td class="td text-xs text-slate-400">{{ f.fuel_date }}</td>
                <td class="td"><span v-if="f.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ f.vehicle_plate }}</span><span v-else>—</span></td>
                <td class="td font-bold text-slate-900 text-xs">{{ f.liters }} L</td>
                <td class="td text-xs text-slate-500">R$ {{ Number(f.price_liter).toFixed(2) }}</td>
                <td class="td font-bold text-slate-900 text-xs">R$ {{ fmt(f.total) }}</td>
                <td class="td text-[11px] text-slate-400 max-w-[200px] truncate">{{ f.station || '—' }}</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="bg-slate-100">
              <td class="td font-extrabold text-slate-900 text-sm" colspan="7">
                Total Geral: R$ {{ fmt(fuelTotal) }} · {{ fuelLitrosTotal.toLocaleString('pt-BR') }} litros
              </td>
            </tr>
          </tfoot>
        </table>
        <div v-if="!fuelRecords.length" class="text-center text-slate-400 text-xs py-8">Nenhum abastecimento registrado</div>
      </div>
    </template>
  </div>
</template>
