<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayable } from '../../composables/usePayable'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, summary, loading, fetchAll, fetchSummary, markPaid } = usePayable()

const cpFilter = ref('all')
const cpCatFilter = ref('all')
const cpSort = ref('vencimento')

const catLabel = { manutencao: 'Manutenção', pecas: 'Peças', pneus: 'Pneus (serv.)', administrativo: 'Administrativo' }
const catColor = { manutencao: '#f59e0b', pecas: '#2563eb', pneus: '#10b981', administrativo: '#7c3aed' }
const catBg = { manutencao: '#fff7ed', pecas: '#eff6ff', pneus: '#f0fdf4', administrativo: '#f5f3ff' }
const catText = { manutencao: '#c2410c', pecas: '#1d4ed8', pneus: '#15803d', administrativo: '#6d28d9' }

const filteredCP = computed(() => {
  let list = [...items.value]
  if (cpFilter.value !== 'all') list = list.filter(c => c.status === cpFilter.value)
  if (cpCatFilter.value !== 'all') list = list.filter(c => c.category === cpCatFilter.value)
  if (cpSort.value === 'valor-desc') list.sort((a, b) => Number(b.value) - Number(a.value))
  else if (cpSort.value === 'valor-asc') list.sort((a, b) => Number(a.value) - Number(b.value))
  return list
})

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const pendentes = computed(() => items.value.filter(c => c.status === 'pendente'))
const pagos = computed(() => items.value.filter(c => c.status === 'pago'))
const cpTotal = computed(() => items.value.reduce((s, c) => s + Number(c.value || 0), 0))
const cpPendente = computed(() => pendentes.value.reduce((s, c) => s + Number(c.value || 0), 0))
const cpPago = computed(() => pagos.value.reduce((s, c) => s + Number(c.value || 0), 0))
const nextDue = computed(() => pendentes.value.sort((a, b) => a.due_date?.localeCompare(b.due_date))[0]?.due_date || '—')

async function handleMarkPaid(item) {
  const today = new Date().toISOString().split('T')[0]
  await markPaid(item.id, today)
  props.showToast?.(`✅ Conta paga: ${(item.description || item.document || '').substring(0, 40)}`)
}

onMounted(() => {
  fetchAll()
  fetchSummary()
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <div class="grid grid-cols-4 gap-3.5 mb-5">
        <KPICard title="Total a Pagar" :value="`R$ ${fmt(cpTotal)}`" subtitle="Total lançado" color="#ef4444" border-color="#ef4444" />
        <KPICard title="Pendente" :value="`R$ ${fmt(cpPendente)}`" :subtitle="`${pendentes.length} contas em aberto`" color="#f59e0b" border-color="#f59e0b" />
        <KPICard title="Pago" :value="`R$ ${fmt(cpPago)}`" :subtitle="`${pagos.length} contas liquidadas`" color="#10b981" border-color="#10b981" />
        <KPICard title="Próximo Venc." :value="nextDue" subtitle="data mais próxima" color="#2563eb" border-color="#2563eb" />
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-3.5 flex gap-2.5 items-center flex-wrap">
        <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
        <button class="sbtn" :class="{ on: cpFilter === 'all' }" @click="cpFilter = 'all'">Todas</button>
        <button class="sbtn" :class="{ on: cpFilter === 'pendente' }" @click="cpFilter = 'pendente'">Pendentes</button>
        <button class="sbtn" :class="{ on: cpFilter === 'pago' }" @click="cpFilter = 'pago'">Pagas</button>
        <div class="w-px h-5 bg-slate-200" />
        <button class="sbtn" :class="{ on: cpCatFilter === 'all' }" @click="cpCatFilter = 'all'">Todas categorias</button>
        <button class="sbtn" :class="{ on: cpCatFilter === 'manutencao' }" @click="cpCatFilter = 'manutencao'">Manutenção</button>
        <button class="sbtn" :class="{ on: cpCatFilter === 'pecas' }" @click="cpCatFilter = 'pecas'">Peças</button>
        <button class="sbtn" :class="{ on: cpCatFilter === 'pneus' }" @click="cpCatFilter = 'pneus'">Pneus (serv.)</button>
        <button class="sbtn" :class="{ on: cpCatFilter === 'administrativo' }" @click="cpCatFilter = 'administrativo'">Administrativo</button>
        <div class="ml-auto flex gap-2 items-center">
          <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
          <button class="sbtn" :class="{ on: cpSort === 'vencimento' }" @click="cpSort = 'vencimento'">Vencimento</button>
          <button class="sbtn" :class="{ on: cpSort === 'valor-desc' }" @click="cpSort = 'valor-desc'">↓ Maior valor</button>
          <button class="sbtn" :class="{ on: cpSort === 'valor-asc' }" @click="cpSort = 'valor-asc'">↑ Menor valor</button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Vencimento</th>
              <th class="th">Valor</th>
              <th class="th">Documento</th>
              <th class="th">Placa</th>
              <th class="th">Motorista</th>
              <th class="th">Fornecedor</th>
              <th class="th">Categoria</th>
              <th class="th">Status</th>
              <th class="th" style="text-align:center">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="c in filteredCP" :key="c.id">
              <td class="td font-medium whitespace-nowrap">{{ c.due_date }}</td>
              <td class="td font-extrabold text-slate-900 whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
              <td class="td text-xs max-w-[200px] truncate">{{ c.description || c.document || '—' }}</td>
              <td class="td">
                <span v-if="c.vehicle_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td font-semibold text-slate-900 text-xs">{{ c.driver_name || '—' }}</td>
              <td class="td text-xs text-slate-500">{{ c.supplier_name || '—' }}</td>
              <td class="td">
                <span
                  v-if="c.category"
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  :style="{ background: catBg[c.category] || '#f1f5f9', color: catText[c.category] || '#475569' }"
                >
                  {{ catLabel[c.category] || c.category }}
                </span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :class="c.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
                >
                  {{ c.status === 'pago' ? '✓ Pago' : '● Pendente' }}
                </span>
              </td>
              <td class="td text-center">
                <button v-if="c.status === 'pendente'" @click="handleMarkPaid(c)" class="btn-p !py-1.5 !px-3 text-xs">
                  Marcar como Pago
                </button>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filteredCP.length" class="text-center text-slate-400 text-xs py-10">Nenhuma conta encontrada</div>
      </div>
    </template>
  </div>
</template>
