<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

onMounted(() => applyFilter())
</script>

<template>
  <div>
    <!-- Filtro de período -->
    <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-4 flex gap-3 items-center flex-wrap print:hidden">
      <span class="text-xs font-bold text-slate-500">PERÍODO:</span>

      <button class="sbtn" @click="setPreset('mes')">Este mês</button>
      <button class="sbtn" @click="setPreset('mes-ant')">Mês anterior</button>
      <button class="sbtn" @click="setPreset('ano')">Este ano</button>
      <button class="sbtn" @click="setPreset('tudo')">Tudo</button>

      <div class="w-px h-5 bg-slate-200 mx-1" />

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

      <div class="w-px h-5 bg-slate-200 mx-1" />

      <span class="text-xs font-bold text-slate-500">STATUS:</span>
      <button class="sbtn" :class="{ on: statusFilter === 'all' }"      @click="statusFilter = 'all'">Todas</button>
      <button class="sbtn" :class="{ on: statusFilter === 'pendente' }" @click="statusFilter = 'pendente'">Não pagas</button>
      <button class="sbtn" :class="{ on: statusFilter === 'pago' }"     @click="statusFilter = 'pago'">Pagas</button>

      <div class="ml-auto text-[11px] text-slate-400 font-medium">{{ periodoLabel }}</div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <!-- Screen Header -->
      <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] rounded-xl p-[22px_26px] mb-5 flex justify-between items-center screen-only">
        <div>
          <div class="text-slate-400 text-[11px] font-bold uppercase tracking-[0.06em]">Relatório</div>
          <div class="text-white text-xl font-extrabold mt-1">
            <template v-if="activeTab === 'payable'">Contas a Pagar</template>
            <template v-else-if="activeTab === 'driver'">Despesas por Motorista</template>
            <template v-else>Combustível por Motorista</template>
          </div>
          <div class="text-slate-500 text-xs mt-0.5">{{ periodoLabel }} · Emitido em {{ today }}</div>
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
        <button class="sbtn" :class="{ on: activeTab === 'payable' }" @click="activeTab = 'payable'">Contas a Pagar</button>
        <button class="sbtn" :class="{ on: activeTab === 'driver' }"  @click="activeTab = 'driver'">Por Motorista</button>
        <button class="sbtn" :class="{ on: activeTab === 'fuel' }"    @click="activeTab = 'fuel'">Combustível</button>
      </div>

      <!-- ═══════════ CONTAS A PAGAR ═══════════ -->
      <div v-if="activeTab === 'payable'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="grid grid-cols-3 gap-3.5 p-5 pb-0 screen-only">
          <div class="kpi-card border-t-[3px]" style="border-top-color: #ef4444">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total a Pagar</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fmt(payableTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Lançamentos</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ payableItems.length }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #2563eb">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ payableItems.filter(c => c.status === 'pendente').length }} em aberto</div>
          </div>
        </div>

        <div v-if="!payableItems.length" class="text-center text-slate-400 text-xs py-10">Nenhuma conta no período selecionado</div>
        <table v-else class="w-full border-collapse mt-4">
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
              <tr class="bg-slate-100">
                <td class="td font-extrabold text-slate-800 text-xs" colspan="6">
                  {{ fmtDate(group.date) }} — Total: R$ {{ fmt(group.total) }}
                </td>
              </tr>
              <tr class="trow" v-for="c in group.items" :key="c.id">
                <td class="td text-xs text-slate-500">{{ fmtDate(c.due_date) }}</td>
                <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
                <td class="td text-[11px] max-w-[320px] truncate">{{ c.description || c.document || '—' }}</td>
                <td class="td">
                  <span v-if="c.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
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
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fmt(payableTotal) }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motoristas</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ byDriver.length }} com gastos</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #f59e0b">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Média por Motorista</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ byDriver.length ? fmt(payableTotal / byDriver.length) : '0,00' }}</div>
          </div>
        </div>

        <div v-if="!byDriver.length" class="text-center text-slate-400 text-xs py-10">Nenhuma despesa no período selecionado</div>
        <table v-else class="w-full border-collapse mt-4">
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
              <tr class="bg-blue-100">
                <td class="td font-extrabold text-blue-900 text-sm" colspan="5">
                  {{ group.motorista }} — Total: R$ {{ fmt(group.total) }}
                </td>
              </tr>
              <tr class="trow" v-for="c in group.items" :key="c.id">
                <td class="td text-xs font-semibold text-slate-700 pl-8">{{ c.driver_name || '—' }}</td>
                <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
                <td class="td text-[11px] max-w-[300px] truncate">{{ c.description || c.document || '—' }}</td>
                <td class="td">
                  <span v-if="c.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
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
              <td class="td font-extrabold text-slate-900 text-sm" colspan="5">Total Geral: R$ {{ fmt(payableTotal) }}</td>
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
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">R$ {{ fuelLitrosTotal > 0 ? fmt(fuelTotal / fuelLitrosTotal) : '0,00' }}</div>
          </div>
          <div class="kpi-card border-t-[3px]" style="border-top-color: #7c3aed">
            <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Abastecimentos</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1.5">{{ fuelRecords.length }}</div>
          </div>
        </div>

        <div v-if="!fuelRecords.length" class="text-center text-slate-400 text-xs py-10">Nenhum abastecimento no período selecionado</div>
        <table v-else class="w-full border-collapse mt-4">
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
              <tr class="bg-amber-100">
                <td class="td font-extrabold text-amber-900 text-sm" colspan="7">
                  {{ group.motorista }} — {{ group.litros.toLocaleString('pt-BR') }} L · Total: R$ {{ fmt(group.total) }}
                </td>
              </tr>
              <tr class="trow" v-for="f in group.items" :key="f.id">
                <td class="td text-xs font-semibold text-slate-700 pl-8">{{ f.driver_name || '—' }}</td>
                <td class="td text-xs text-slate-500">{{ fmtDate(f.fuel_date) }}</td>
                <td class="td">
                  <span v-if="f.vehicle_plate" class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ f.vehicle_plate }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="td font-bold text-slate-900 text-xs">{{ f.liters }} L</td>
                <td class="td text-xs text-slate-500">R$ {{ Number(f.price_liter).toFixed(3) }}</td>
                <td class="td font-bold text-slate-900 text-xs whitespace-nowrap">R$ {{ fmt(f.total) }}</td>
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
      </div>
    </template>
  </div>
</template>
