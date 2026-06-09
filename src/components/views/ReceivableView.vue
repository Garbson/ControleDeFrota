<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReceivable } from '../../composables/useReceivable'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, loading, fetchAll, fetchSummary, markReceived } = useReceivable()

const crFilter = ref('all')

const filteredCR = computed(() => {
  if (crFilter.value === 'all') return items.value
  return items.value.filter(c => c.status === crFilter.value)
})

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const pendentes = computed(() => items.value.filter(c => c.status === 'pendente'))
const recebidos = computed(() => items.value.filter(c => c.status === 'recebido'))
const crTotal = computed(() => items.value.reduce((s, c) => s + Number(c.value || 0), 0))
const crPendente = computed(() => pendentes.value.reduce((s, c) => s + Number(c.value || 0), 0))
const crRecebido = computed(() => recebidos.value.reduce((s, c) => s + Number(c.value || 0), 0))

async function handleMarkReceived(item) {
  const today = new Date().toISOString().split('T')[0]
  await markReceived(item.id, today)
  props.showToast?.(`✅ Frete recebido: ${item.client || item.description || ''}`)
}

onMounted(() => {
  fetchAll()
  fetchSummary()
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <div class="grid grid-cols-4 gap-3.5 mb-5">
        <KPICard title="Total a Receber" :value="`R$ ${fmt(crTotal)}`" :subtitle="`${items.length} lançamentos`" color="#10b981" border-color="#10b981" />
        <KPICard title="Pendente" :value="`R$ ${fmt(crPendente)}`" :subtitle="`${pendentes.length} pendentes`" color="#f59e0b" border-color="#f59e0b" />
        <KPICard title="Recebido" :value="`R$ ${fmt(crRecebido)}`" :subtitle="`${recebidos.length} recebidos`" color="#2563eb" border-color="#2563eb" />
        <KPICard title="Saldo Pendente" :value="`R$ ${fmt(crPendente)}`" subtitle="a receber" :color="crPendente > 0 ? '#f59e0b' : '#10b981'" border-color="#7c3aed" />
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-3.5 flex gap-2.5 items-center">
        <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
        <button class="sbtn" :class="{ on: crFilter === 'all' }" @click="crFilter = 'all'">Todos</button>
        <button class="sbtn" :class="{ on: crFilter === 'pendente' }" @click="crFilter = 'pendente'">Pendentes</button>
        <button class="sbtn" :class="{ on: crFilter === 'recebido' }" @click="crFilter = 'recebido'">Recebidos</button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Vencimento</th>
              <th class="th">Cliente</th>
              <th class="th">Descrição</th>
              <th class="th">Valor</th>
              <th class="th">Placa</th>
              <th class="th">Motorista</th>
              <th class="th">Status</th>
              <th class="th" style="text-align:center">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="c in filteredCR" :key="c.id">
              <td class="td font-medium whitespace-nowrap">{{ c.due_date || c.issue_date || '—' }}</td>
              <td class="td font-semibold text-slate-900 text-xs max-w-[160px] truncate" :title="c.client">{{ c.client || '—' }}</td>
              <td class="td text-xs">{{ c.description || c.type || '—' }}</td>
              <td class="td font-extrabold text-slate-900 whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
              <td class="td">
                <span v-if="c.vehicle_plate" class="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td font-semibold text-slate-900 text-xs">{{ c.driver_name || '—' }}</td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :class="c.status === 'recebido' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
                >
                  {{ c.status === 'recebido' ? '✓ Recebido' : '● Pendente' }}
                </span>
              </td>
              <td class="td text-center">
                <button v-if="c.status === 'pendente'" @click="handleMarkReceived(c)" class="btn-p !py-1.5 !px-3 text-xs">
                  Marcar como Recebido
                </button>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filteredCR.length" class="text-center text-slate-400 text-xs py-10">Nenhum registro encontrado</div>
      </div>
    </template>
  </div>
</template>
