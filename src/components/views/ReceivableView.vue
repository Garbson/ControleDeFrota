<script setup>
import { ref, computed } from 'vue'
import { accountsReceivable } from '../../data/accounts-receivable.js'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const crFilter = ref('all')

const data = ref(accountsReceivable.map(c => ({ ...c })))

const filteredCR = computed(() => {
  if (crFilter.value === 'all') return data.value
  return data.value.filter(c => c.status === crFilter.value)
})

const crTotal = computed(() => data.value.reduce((s, c) => s + c.valor, 0))
const crPendente = computed(() => data.value.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0))
const crRecebido = computed(() => data.value.filter(c => c.status === 'recebido').reduce((s, c) => s + c.valor, 0))

function markReceived(item) {
  item.status = 'recebido'
  props.showToast?.(`✅ Frete recebido: ${item.cliente}`)
}
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Total a Receber" :value="`R$ ${crTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" :subtitle="`${data.length} fretes lançados`" color="#10b981" border-color="#10b981" />
      <KPICard title="Pendente" :value="`R$ ${crPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" :subtitle="`${data.filter(c => c.status === 'pendente').length} fretes pendentes`" color="#f59e0b" border-color="#f59e0b" />
      <KPICard title="Recebido" :value="`R$ ${crRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" :subtitle="`${data.filter(c => c.status === 'recebido').length} fretes recebidos`" color="#2563eb" border-color="#2563eb" />
      <KPICard title="Saldo Pendente" :value="`R$ ${crPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" subtitle="a receber" :color="crPendente > 0 ? '#f59e0b' : '#10b981'" border-color="#7c3aed" />
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
            <th class="th">Data</th>
            <th class="th">Cliente</th>
            <th class="th">Frete</th>
            <th class="th">Origem → Destino</th>
            <th class="th">Valor</th>
            <th class="th">Placa</th>
            <th class="th">Motorista</th>
            <th class="th">Status</th>
            <th class="th" style="text-align:center">Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="c in filteredCR" :key="c.id">
            <td class="td font-medium whitespace-nowrap">{{ c.data }}</td>
            <td class="td font-semibold text-slate-900 text-xs max-w-[160px] truncate" :title="c.cliente">{{ c.cliente }}</td>
            <td class="td text-xs">{{ c.frete }}</td>
            <td class="td text-xs text-slate-500">{{ c.origem }} → {{ c.destino }}</td>
            <td class="td font-extrabold text-slate-900 whitespace-nowrap">R$ {{ c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</td>
            <td class="td"><span class="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{{ c.placa }}</span></td>
            <td class="td font-semibold text-slate-900 text-xs">{{ c.motorista }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="c.status === 'recebido' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'">
                {{ c.status === 'recebido' ? '✓ Recebido' : '● Pendente' }}
              </span>
            </td>
            <td class="td text-center">
              <button
                v-if="c.status === 'pendente'"
                @click="markReceived(c)"
                class="btn-p !py-1.5 !px-3 text-xs"
              >
                Marcar como Recebido
              </button>
              <span v-else class="text-xs text-slate-400">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
