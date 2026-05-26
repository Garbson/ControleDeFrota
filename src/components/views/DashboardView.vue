<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { drivers } from '../../data/drivers.js'
import { movements } from '../../data/movements.js'
import KPICard from '../ui/KPICard.vue'

Chart.register(...registerables)

const chartOrder = ref('desc')
const mvFilter = ref('all')
const chartCanvas = ref(null)
let chartInst = null

const topDrivers = computed(() =>
  [...drivers].filter(d => d.tires > 0).sort((a, b) => b.tires - a.tires).slice(0, 10)
)

const filteredMovements = computed(() => {
  if (mvFilter.value === 'all') return movements
  return movements.filter(m => m.type === mvFilter.value)
})

function chartData() {
  let list = drivers.filter(d => d.tires > 0)
  if (chartOrder.value === 'desc') list.sort((a, b) => b.tires - a.tires)
  else if (chartOrder.value === 'asc') list.sort((a, b) => a.tires - b.tires)
  else list.sort((a, b) => a.name.localeCompare(b.name))
  return {
    labels: list.map(d => d.name),
    data: list.map(d => d.tires),
    colors: list.map(d => d.color),
  }
}

function initChart() {
  if (!chartCanvas.value) return
  if (chartInst) { chartInst.destroy(); chartInst = null }
  const cd = chartData()
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
          grid: { color: '#f1f5f9' },
          ticks: { color: '#94a3b8', font: { size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } },
        },
      },
    },
  })
}

function setChartOrder(o) {
  chartOrder.value = o
  nextTick(initChart)
}

onMounted(() => nextTick(initChart))
watch(() => chartOrder.value, () => {})
</script>

<template>
  <div>
    <!-- KPIs -->
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Motoristas Ativos" :value="13" subtitle="Todos operacionais" color="#22c55e" border-color="#2563eb" icon="👥" />
      <KPICard title="Pneus Distribuídos" :value="139" subtitle="Total no período 2025–2026" color="#f59e0b" border-color="#f59e0b" icon="🔄" />
      <KPICard title="Em Estoque Agora" :value="55" subtitle="Nível adequado" color="#10b981" border-color="#10b981" icon="📦" />
      <KPICard title="Investimento em Pneus" value="R$ 79.730" subtitle="3 NFs com valor registrado" color="#7c3aed" border-color="#7c3aed" icon="💰" />
    </div>

    <!-- Chart + Ranking -->
    <div class="grid grid-cols-[1fr_340px] gap-3.5 mb-5">
      <div class="bg-white rounded-xl p-[22px] border border-slate-200">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="m-0 text-sm font-bold text-slate-900">Consumo de Pneus por Motorista</h3>
            <p class="m-0 mt-0.5 text-[11.5px] text-slate-400">Total distribuído no período</p>
          </div>
          <div class="flex gap-1">
            <button class="sbtn" :class="{ on: chartOrder === 'desc' }" @click="setChartOrder('desc')">↓ Maior</button>
            <button class="sbtn" :class="{ on: chartOrder === 'asc' }" @click="setChartOrder('asc')">↑ Menor</button>
            <button class="sbtn" :class="{ on: chartOrder === 'name' }" @click="setChartOrder('name')">A–Z</button>
          </div>
        </div>
        <canvas ref="chartCanvas" class="!max-h-[260px]" />
      </div>

      <!-- Ranking -->
      <div class="bg-white rounded-xl p-[22px] border border-slate-200 flex flex-col">
        <h3 class="m-0 mb-3.5 text-sm font-bold text-slate-900">Ranking de Consumo</h3>
        <div v-for="(d, i) in topDrivers" :key="d.id" class="mb-[13px]">
          <div class="flex justify-between items-center mb-1">
            <div class="flex items-center gap-2">
              <div
                class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                :style="{
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#f1f5f9',
                  color: i < 3 ? 'white' : '#64748b'
                }"
              >
                {{ i + 1 }}
              </div>
              <div>
                <div class="text-xs font-semibold text-slate-700 leading-tight">{{ d.name }}</div>
                <div class="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-px rounded inline-block mt-0.5">{{ d.truck || d.trailer }}</div>
              </div>
            </div>
            <span class="text-[13px] font-extrabold text-slate-900">{{ d.tires }}</span>
          </div>
          <div class="pbg">
            <div class="pfill" :style="{ width: `${(d.tires / 24) * 100}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#2563eb' : i === 2 ? '#10b981' : '#94a3b8' }" />
          </div>
        </div>
        <div class="mt-auto pt-3 border-t border-slate-50 text-[11.5px] text-slate-400 text-center">
          Máx. registrado: <strong class="text-amber-500">MATHEUS — 24 pneus</strong>
        </div>
      </div>
    </div>

    <!-- Recent Movements -->
    <div class="bg-white rounded-xl border border-slate-200">
      <div class="px-[22px] py-[18px] border-b border-slate-50 flex justify-between items-center">
        <h3 class="m-0 text-sm font-bold text-slate-900">Últimas Movimentações</h3>
        <div class="flex gap-1">
          <button class="sbtn" :class="{ on: mvFilter === 'all' }" @click="mvFilter = 'all'">Todas</button>
          <button class="sbtn" :class="{ on: mvFilter === 'entrada' }" @click="mvFilter = 'entrada'">↓ Entradas</button>
          <button class="sbtn" :class="{ on: mvFilter === 'saida' }" @click="mvFilter = 'saida'">↑ Saídas</button>
        </div>
      </div>
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th><th class="th">Tipo</th><th class="th">Motorista</th>
            <th class="th">Item</th><th class="th">Qtd</th><th class="th">Valor</th><th class="th">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="m in filteredMovements" :key="m.id">
            <td class="td font-medium whitespace-nowrap">{{ m.date }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="m.type === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600'">
                {{ m.type === 'entrada' ? '↓ Entrada' : '↑ Saída' }}
              </span>
            </td>
            <td class="td">
              <div class="font-semibold text-slate-900 text-xs">{{ m.driver }}</div>
              <div class="text-[10.5px] text-slate-400">{{ m.vehicle }}</div>
            </td>
            <td class="td text-xs">{{ m.item }}</td>
            <td class="td font-bold text-slate-900">{{ m.qty }}</td>
            <td class="td font-bold text-slate-900 whitespace-nowrap">{{ m.value }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">Registrado</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
