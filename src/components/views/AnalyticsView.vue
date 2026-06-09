<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDrivers } from '../../composables/useDrivers'
import KPICard from '../ui/KPICard.vue'

Chart.register(...registerables)

const { drivers, loading, fetchAll } = useDrivers()

const costSort = ref('desc')
const pieCanvas = ref(null)
let pieInst = null

const topConsumer = computed(() => [...drivers.value].sort((a, b) => Number(b.total_tires) - Number(a.total_tires))[0])
const bottomConsumer = computed(() => [...drivers.value].filter(d => Number(d.total_tires) > 0).sort((a, b) => Number(a.total_tires) - Number(b.total_tires))[0])
const avgTires = computed(() => {
  if (!drivers.value.length) return 0
  return Math.round((drivers.value.reduce((s, d) => s + Number(d.total_tires), 0) / drivers.value.length) * 10) / 10
})

const costRanking = computed(() => {
  let list = drivers.value.map(d => ({ ...d, tires: Number(d.total_tires), cost: Number(d.total_tires) * 1246 }))
  if (costSort.value === 'desc') list.sort((a, b) => b.cost - a.cost)
  else list.sort((a, b) => a.cost - b.cost)
  return list
})

const vehicleTypes = computed(() => {
  const map = {}
  drivers.value.forEach(d => {
    const type = d.trailer_type || 'Sem carroceria'
    if (!map[type]) map[type] = { label: type, count: 0, color: d.color || '#2563eb' }
    map[type].count++
  })
  return Object.values(map)
})

function initPie() {
  if (!pieCanvas.value || !vehicleTypes.value.length) return
  if (pieInst) { pieInst.destroy(); pieInst = null }
  pieInst = new Chart(pieCanvas.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: vehicleTypes.value.map(t => t.label),
      datasets: [{
        data: vehicleTypes.value.map(t => t.count),
        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#ec4899', '#f97316'],
        borderWidth: 2,
        borderColor: 'white',
      }],
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: { legend: { display: false } },
    },
  })
}

const maxTires = computed(() => Math.max(...costRanking.value.map(d => d.tires), 1))

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR')

onMounted(async () => {
  await fetchAll()
  nextTick(initPie)
})

watch(vehicleTypes, () => nextTick(initPie))
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <div class="grid grid-cols-4 gap-3.5 mb-5">
        <KPICard
          title="Maior Consumidor"
          :value="topConsumer?.name || '—'"
          :subtitle="`${topConsumer?.total_tires || 0} pneus · ≈ R$ ${fmt((topConsumer?.total_tires || 0) * 1246)}`"
          color="#ef4444"
          border-color="#ef4444"
        />
        <KPICard
          title="Menor Consumidor"
          :value="bottomConsumer?.name || '—'"
          :subtitle="`${bottomConsumer?.total_tires || 0} pneus · ≈ R$ ${fmt((bottomConsumer?.total_tires || 0) * 1246)}`"
          color="#10b981"
          border-color="#10b981"
        />
        <KPICard title="Média por Motorista" :value="avgTires" subtitle="pneus em média" color="#2563eb" border-color="#2563eb" />
        <KPICard title="Custo Médio/Pneu" value="R$ 1.246" subtitle="com base nas NFs" color="#f59e0b" border-color="#f59e0b" />
      </div>

      <div class="grid grid-cols-2 gap-3.5 mb-5">
        <!-- Cost Ranking -->
        <div class="bg-white rounded-xl p-[22px] border border-slate-200">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="m-0 text-sm font-bold text-slate-900">Custo Estimado por Motorista</h3>
              <p class="m-0 mt-0.5 text-[11.5px] text-slate-400">Base: R$ 1.246/pneu (média das NFs)</p>
            </div>
            <div class="flex gap-1">
              <button class="sbtn" :class="{ on: costSort === 'desc' }" @click="costSort = 'desc'">↓ Maior</button>
              <button class="sbtn" :class="{ on: costSort === 'asc' }" @click="costSort = 'asc'">↑ Menor</button>
            </div>
          </div>
          <div v-for="d in costRanking" :key="d.id" class="mb-[11px]">
            <div class="flex justify-between items-center mb-[3px]">
              <span class="text-xs font-semibold text-slate-700">{{ d.name }}</span>
              <div class="text-right">
                <span class="text-xs font-extrabold text-slate-900">R$ {{ fmt(d.cost) }}</span>
                <span class="text-[10px] text-slate-400 ml-1.5">{{ d.tires }} pneus</span>
              </div>
            </div>
            <div class="pbg">
              <div class="pfill" :style="{ width: `${(d.tires / maxTires) * 100}%`, background: d.tires >= 20 ? '#ef4444' : d.tires >= 14 ? '#f59e0b' : '#2563eb' }" />
            </div>
          </div>
          <div v-if="!costRanking.length" class="text-center text-slate-400 text-xs py-4">Nenhum dado disponível</div>
        </div>

        <!-- Vehicle Types Pie -->
        <div class="bg-white rounded-xl p-[22px] border border-slate-200">
          <h3 class="m-0 mb-4 text-sm font-bold text-slate-900">Tipo de Carroceria</h3>
          <div class="flex justify-center">
            <canvas ref="pieCanvas" class="!max-h-[200px]" />
          </div>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <div v-for="(t, i) in vehicleTypes" :key="t.label" class="flex items-center gap-2 bg-slate-50 rounded-md px-3 py-2">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: ['#2563eb','#10b981','#f59e0b','#7c3aed','#ec4899','#f97316'][i % 6] }" />
              <div>
                <div class="text-[11px] font-bold text-slate-900">{{ t.label }}</div>
                <div class="text-[10px] text-slate-400">{{ t.count }} motoristas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Insights -->
      <div class="bg-white rounded-xl p-[22px] border border-slate-200">
        <h3 class="m-0 mb-4 text-sm font-bold text-slate-900">💡 Insights e Alertas</h3>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-amber-50 border border-amber-200 rounded-[10px] p-4">
            <div class="text-xs font-bold text-amber-700 mb-1.5">⚠️ Alto Consumo</div>
            <div v-if="costRanking[0]" class="text-[13px] font-semibold text-slate-900">{{ costRanking[0].name }}</div>
            <div class="text-[11.5px] text-slate-500 mt-1">
              Motorista com maior consumo registrado.
            </div>
          </div>
          <div class="bg-green-50 border border-green-200 rounded-[10px] p-4">
            <div class="text-xs font-bold text-green-700 mb-1.5">✅ Eficiência</div>
            <div v-if="bottomConsumer" class="text-[13px] font-semibold text-slate-900">{{ bottomConsumer.name }}</div>
            <div class="text-[11.5px] text-slate-500 mt-1">
              Motorista com menor consumo no período.
            </div>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
            <div class="text-xs font-bold text-blue-700 mb-1.5">📊 Média da Frota</div>
            <div class="text-[13px] font-semibold text-slate-900">{{ avgTires }} pneus/motorista</div>
            <div class="text-[11.5px] text-slate-500 mt-1">
              Média de distribuição entre {{ drivers.length }} motoristas ativos.
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
