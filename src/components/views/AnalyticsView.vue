<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { drivers } from '../../data/drivers.js'
import KPICard from '../ui/KPICard.vue'

Chart.register(...registerables)

const costSort = ref('desc')
const pieCanvas = ref(null)
let pieInst = null

const topConsumer = computed(() => [...drivers].sort((a, b) => b.tires - a.tires)[0])
const bottomConsumer = computed(() => [...drivers].sort((a, b) => a.tires - b.tires)[0])
const avgTires = computed(() => Math.round((drivers.reduce((s, d) => s + d.tires, 0) / drivers.length) * 10) / 10)

const costRanking = computed(() => {
  let list = drivers.map(d => ({ ...d, cost: d.tires * 1246 }))
  if (costSort.value === 'desc') list.sort((a, b) => b.cost - a.cost)
  else list.sort((a, b) => a.cost - b.cost)
  return list
})

const vehicleTypes = computed(() => {
  const map = {}
  drivers.forEach(d => {
    if (!map[d.trailerType]) map[d.trailerType] = { label: d.trailerType, count: 0, color: d.color }
    map[d.trailerType].count++
  })
  return Object.values(map)
})

function initPie() {
  if (!pieCanvas.value) return
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

onMounted(() => nextTick(initPie))
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Maior Consumidor" :value="topConsumer?.name || '—'" :subtitle="`${topConsumer?.tires || 0} pneus · ≈ R$ ${(topConsumer?.tires * 1246).toLocaleString('pt-BR')}`" color="#ef4444" border-color="#ef4444" />
      <KPICard title="Menor Consumidor" :value="bottomConsumer?.name || '—'" :subtitle="`${bottomConsumer?.tires || 0} pneus · ≈ R$ ${(bottomConsumer?.tires * 1246).toLocaleString('pt-BR')}`" color="#10b981" border-color="#10b981" />
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
              <span class="text-xs font-extrabold text-slate-900">R$ {{ d.cost.toLocaleString('pt-BR') }}</span>
              <span class="text-[10px] text-slate-400 ml-1.5">{{ d.tires }} pneus</span>
            </div>
          </div>
          <div class="pbg">
            <div class="pfill" :style="{ width: `${(d.tires / 24) * 100}%`, background: d.tires >= 20 ? '#ef4444' : d.tires >= 14 ? '#f59e0b' : '#2563eb' }" />
          </div>
        </div>
      </div>

      <!-- Vehicle Types Pie -->
      <div class="bg-white rounded-xl p-[22px] border border-slate-200">
        <h3 class="m-0 mb-4 text-sm font-bold text-slate-900">Tipo de Carroceria</h3>
        <div class="flex justify-center">
          <canvas ref="pieCanvas" class="!max-h-[200px]" />
        </div>
        <div class="grid grid-cols-2 gap-2 mt-4">
          <div v-for="t in vehicleTypes" :key="t.label" class="flex items-center gap-2 bg-slate-50 rounded-md px-3 py-2">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: t.color }" />
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
          <div class="text-[13px] font-semibold text-slate-900">MATHEUS, DANIEL e BEBE</div>
          <div class="text-[11.5px] text-slate-500 mt-1">
            Esses 3 motoristas consumiram 60 pneus — <strong>43%</strong> do total distribuído.
          </div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-[10px] p-4">
          <div class="text-xs font-bold text-green-700 mb-1.5">✅ Eficiência</div>
          <div class="text-[13px] font-semibold text-slate-900">VALDIR e LEILSON</div>
          <div class="text-[11.5px] text-slate-500 mt-1">
            Com apenas 4 e 5 pneus respectivamente, apresentam ótimo aproveitamento.
          </div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
          <div class="text-xs font-bold text-blue-700 mb-1.5">📦 Estoque</div>
          <div class="text-[13px] font-semibold text-slate-900">55 pneus disponíveis</div>
          <div class="text-[11.5px] text-slate-500 mt-1">
            Com consumo médio de ~12 pneus por motorista, reposição recomendada em 30 dias.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
