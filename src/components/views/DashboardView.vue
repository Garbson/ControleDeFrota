<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboard } from '../../composables/useDashboard'
import { useStock } from '../../composables/useStock'
import KPICard from '../ui/KPICard.vue'

Chart.register(...registerables)

const props = defineProps({ showToast: Function })

const { kpis, topDrivers, recentMovements, loading, fetchDashboard } = useDashboard()
const { removeMovement } = useStock()

async function deleteMovement(m) {
  if (!confirm(`Excluir movimentação de ${m.qty} un de "${m.item_name || 'item'}"?`)) return
  try {
    await removeMovement(m.id)
    await fetchDashboard()
    props.showToast?.('Movimentação excluída')
  } catch {
    props.showToast?.('❌ Erro ao excluir movimentação')
  }
}

const chartOrder = ref('desc')
const mvFilter = ref('all')
const chartCanvas = ref(null)
let chartInst = null

const filteredMovements = computed(() => {
  if (mvFilter.value === 'all') return recentMovements.value
  return recentMovements.value.filter(m => m.type === mvFilter.value)
})

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
function fmtDate(raw) {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function chartData() {
  let list = [...topDrivers.value].filter(d => d.tires > 0)
  if (chartOrder.value === 'desc') list.sort((a, b) => b.tires - a.tires)
  else if (chartOrder.value === 'asc') list.sort((a, b) => a.tires - b.tires)
  else list.sort((a, b) => a.name.localeCompare(b.name))
  return {
    labels: list.map(d => d.name),
    data: list.map(d => d.tires),
    colors: list.map(d => d.color || '#2563eb'),
  }
}

function initChart() {
  if (!chartCanvas.value) return
  if (chartInst) { chartInst.destroy(); chartInst = null }
  const cd = chartData()
  if (!cd.labels.length) return
  chartInst = new Chart(chartCanvas.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels: cd.labels,
      datasets: [{
        label: 'Pneus',
        data: cd.data,
        backgroundColor: cd.colors.map(c => c + 'cc'),
        borderColor: cd.colors,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          padding: 10,
          callbacks: { label: (ctx) => `${ctx.raw} pneus` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#78716c', font: { size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#78716c', font: { size: 11 } },
        },
      },
    },
  })
}

function setChartOrder(o) {
  chartOrder.value = o
  nextTick(initChart)
}

const maxTires = computed(() => Math.max(...topDrivers.value.map(d => d.tires), 1))

onMounted(async () => {
  await fetchDashboard()
  nextTick(initChart)
})

watch(topDrivers, () => nextTick(initChart))
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">
      Carregando dados...
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-4 gap-3.5 mb-5">
        <KPICard
          title="Motoristas Ativos"
          :value="kpis.activeDrivers"
          subtitle="Todos operacionais"
          color="#22c55e"
          border-color="#2563eb"
          icon="👥"
        />
        <KPICard
          title="Pneus Distribuídos"
          :value="kpis.totalTires"
          subtitle="Total acumulado"
          color="#f59e0b"
          border-color="#f59e0b"
          icon="🔄"
        />
        <KPICard
          title="Em Estoque Agora"
          :value="kpis.stockTires"
          subtitle="Pneus disponíveis"
          color="#10b981"
          border-color="#10b981"
          icon="📦"
        />
        <KPICard
          title="CP Pendente"
          :value="`R$ ${fmt(kpis.cpPendente)}`"
          subtitle="Contas a pagar em aberto"
          color="#7c3aed"
          border-color="#7c3aed"
          icon="💰"
        />
      </div>

      <!-- Chart + Ranking -->
      <div class="grid grid-cols-[1fr_340px] gap-3.5 mb-5">
        <div class="glass rounded-xl p-[22px]">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="m-0 text-sm font-bold text-stone-800">Consumo de Pneus por Motorista</h3>
              <p class="m-0 mt-0.5 text-[11.5px]" style="color:#78716c">Total distribuído no período</p>
            </div>
            <div class="flex gap-1">
              <button class="sbtn" :class="{ on: chartOrder === 'desc' }" @click="setChartOrder('desc')">↓ Maior</button>
              <button class="sbtn" :class="{ on: chartOrder === 'asc' }" @click="setChartOrder('asc')">↑ Menor</button>
              <button class="sbtn" :class="{ on: chartOrder === 'name' }" @click="setChartOrder('name')">A–Z</button>
            </div>
          </div>
          <canvas ref="chartCanvas" class="!max-h-[260px]" />
          <div v-if="!topDrivers.length" class="text-center text-xs py-8" style="color:#a8a29e">Nenhum dado disponível</div>
        </div>

        <!-- Ranking -->
        <div class="glass rounded-xl p-[22px] flex flex-col">
          <h3 class="m-0 mb-3.5 text-sm font-bold text-stone-800">Ranking de Consumo</h3>
          <div v-for="(d, i) in topDrivers" :key="d.name" class="mb-[13px]">
            <div class="flex justify-between items-center mb-1">
              <div class="flex items-center gap-2">
                <div
                  class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  :style="{
                    background: i === 0 ? '#f59e0b' : i === 1 ? 'rgba(100,116,139,0.2)' : i === 2 ? '#d97706' : 'rgba(0,0,0,0.06)',
                    color: i < 3 ? 'white' : '#78716c'
                  }"
                >
                  {{ i + 1 }}
                </div>
                <div>
                  <div class="text-xs font-semibold leading-tight" style="color:#1c1917">{{ d.name }}</div>
                </div>
              </div>
              <span class="text-[13px] font-extrabold text-stone-800">{{ d.tires }}</span>
            </div>
            <div class="pbg">
              <div class="pfill" :style="{ width: `${(d.tires / maxTires) * 100}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#2563eb' : i === 2 ? '#10b981' : 'rgba(148,163,184,0.4)' }" />
            </div>
          </div>
          <div v-if="!topDrivers.length" class="text-xs text-center py-8" style="color:#a8a29e">Nenhum motorista com pneus distribuídos</div>
          <div v-if="topDrivers.length" class="mt-auto pt-3 text-[11.5px] text-center" style="border-top:1px solid rgba(0,0,0,0.06);color:#78716c">
            Máx. registrado: <strong class="text-amber-400">{{ topDrivers[0]?.name }} — {{ topDrivers[0]?.tires }} pneus</strong>
          </div>
        </div>
      </div>

      <!-- Recent Movements -->
      <div class="glass rounded-xl">
        <div class="px-[22px] py-[18px] flex justify-between items-center" style="border-bottom:1px solid rgba(0,0,0,0.06)">
          <h3 class="m-0 text-sm font-bold text-stone-800">Últimas Movimentações</h3>
          <div class="flex gap-1">
            <button class="sbtn" :class="{ on: mvFilter === 'all' }" @click="mvFilter = 'all'">Todas</button>
            <button class="sbtn" :class="{ on: mvFilter === 'entrada' }" @click="mvFilter = 'entrada'">↓ Entradas</button>
            <button class="sbtn" :class="{ on: mvFilter === 'saida' }" @click="mvFilter = 'saida'">↑ Saídas</button>
          </div>
        </div>
        <div v-if="!filteredMovements.length" class="text-center text-xs py-8" style="color:#a8a29e">Nenhuma movimentação encontrada</div>
        <table v-else class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Data</th><th class="th">Tipo</th><th class="th">Motorista</th>
              <th class="th">Item</th><th class="th">Qtd</th><th class="th">Valor</th><th class="th">Status</th><th class="th w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="m in filteredMovements" :key="m.id">
              <td class="td font-medium whitespace-nowrap">{{ fmtDate(m.mov_date) }}</td>
              <td class="td">
                <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :style="m.type === 'entrada' ? 'background:rgba(16,185,129,0.12);color:#059669' : 'background:rgba(249,115,22,0.12);color:#c2410c'">
                  {{ m.type === 'entrada' ? '↓ Entrada' : '↑ Saída' }}
                </span>
              </td>
              <td class="td">
                <div class="font-semibold text-xs text-stone-800">{{ m.driver_name || '—' }}</div>
                <div class="text-[10.5px]" style="color:#a8a29e">{{ m.vehicle_plate || '—' }}</div>
              </td>
              <td class="td text-xs">{{ m.item_name || '—' }}</td>
              <td class="td font-bold text-stone-800">{{ m.qty }}</td>
              <td class="td font-bold text-stone-800 whitespace-nowrap">
                {{ m.total_value ? `R$ ${Number(m.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—' }}
              </td>
              <td class="td">
                <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style="background:rgba(37,99,235,0.10);color:#1d4ed8">Registrado</span>
              </td>
              <td class="td text-center">
                <button
                  @click.stop="deleteMovement(m)"
                  title="Excluir"
                  class="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
