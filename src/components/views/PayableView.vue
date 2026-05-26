<script setup>
import { ref, computed } from 'vue'
import { accountsPayable } from '../../data/accounts-payable.js'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const cpFilter = ref('all')
const cpCatFilter = ref('all')
const cpSort = ref('vencimento')

const catLabel = { manutencao: 'Manutenção', pecas: 'Peças', pneus: 'Pneus (serv.)', administrativo: 'Administrativo' }
const catColor = { manutencao: '#f59e0b', pecas: '#2563eb', pneus: '#10b981', administrativo: '#7c3aed' }
const catBg = { manutencao: '#fff7ed', pecas: '#eff6ff', pneus: '#f0fdf4', administrativo: '#f5f3ff' }
const catText = { manutencao: '#c2410c', pecas: '#1d4ed8', pneus: '#15803d', administrativo: '#6d28d9' }

const data = ref(accountsPayable.map(c => ({ ...c })))

const filteredCP = computed(() => {
  let list = [...data.value]
  if (cpFilter.value !== 'all') list = list.filter(c => c.status === cpFilter.value)
  if (cpCatFilter.value !== 'all') list = list.filter(c => c.categoria === cpCatFilter.value)
  if (cpSort.value === 'valor-desc') list.sort((a, b) => b.valor - a.valor)
  else if (cpSort.value === 'valor-asc') list.sort((a, b) => a.valor - b.valor)
  return list
})

const cpTotal = computed(() => data.value.reduce((s, c) => s + c.valor, 0))
const cpPendente = computed(() => data.value.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0))
const cpPago = computed(() => data.value.filter(c => c.status === 'pago').reduce((s, c) => s + c.valor, 0))

function markPaid(item) {
  item.status = 'pago'
  props.showToast?.(`✅ Conta paga: ${item.documento.substring(0, 40)}...`)
}
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Total a Pagar" :value="`R$ ${cpTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" subtitle="Relatório 16 — Mai/2026" color="#ef4444" border-color="#ef4444" />
      <KPICard title="Pendente" :value="`R$ ${cpPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" :subtitle="`${data.filter(c => c.status === 'pendente').length} contas em aberto`" color="#f59e0b" border-color="#f59e0b" />
      <KPICard title="Pago" :value="`R$ ${cpPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" :subtitle="`${data.filter(c => c.status === 'pago').length} contas liquidadas`" color="#10b981" border-color="#10b981" />
      <KPICard title="Próximo Venc." :value="data.filter(c => c.status === 'pendente').sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0]?.vencimento || '—'" subtitle="data mais próxima" color="#2563eb" border-color="#2563eb" />
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
            <td class="td font-medium whitespace-nowrap">{{ c.vencimento }}</td>
            <td class="td font-extrabold text-slate-900 whitespace-nowrap">R$ {{ c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</td>
            <td class="td text-xs max-w-[200px] truncate">{{ c.documento }}</td>
            <td class="td"><span class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ c.placa }}</span></td>
            <td class="td font-semibold text-slate-900 text-xs">{{ c.motorista }}</td>
            <td class="td text-xs text-slate-500">{{ c.fornecedor }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold" :style="{ background: catBg[c.categoria], color: catText[c.categoria] }">
                {{ catLabel[c.categoria] }}
              </span>
            </td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="c.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'">
                {{ c.status === 'pago' ? '✓ Pago' : '● Pendente' }}
              </span>
            </td>
            <td class="td text-center">
              <button
                v-if="c.status === 'pendente'"
                @click="markPaid(c)"
                class="btn-p !py-1.5 !px-3 text-xs"
              >
                Marcar como Pago
              </button>
              <span v-else class="text-xs text-slate-400">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
