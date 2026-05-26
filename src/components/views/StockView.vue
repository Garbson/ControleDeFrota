<script setup>
import { ref, computed } from 'vue'
import { stock, purchases } from '../../data/stock.js'
import { drivers } from '../../data/drivers.js'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const sFilter = ref('all')
const sSort = ref('qty-desc')

const exitModal = ref(null)
const exitForm = ref({ driver: '', qty: '', date: '' })

const totalStock = computed(() => stock.reduce((s, item) => s + item.qty, 0))
const novosPneus = computed(() => stock.filter(s => s.status === 'novo').reduce((a, s) => a + s.qty, 0))
const recapadosPneus = computed(() => stock.filter(s => s.status === 'recapado').reduce((a, s) => a + s.qty, 0))

const filteredStock = computed(() => {
  let list = [...stock]
  if (sFilter.value !== 'all') list = list.filter(s => s.status === sFilter.value)
  if (sSort.value === 'qty-desc') list.sort((a, b) => b.qty - a.qty)
  else if (sSort.value === 'qty-asc') list.sort((a, b) => a.qty - b.qty)
  else if (sSort.value === 'date') list.sort((a, b) => b.date.localeCompare(a.date))
  return list
})

function openExit(item) {
  exitModal.value = item
  exitForm.value = { driver: '', qty: '', date: '' }
}

function confirmExit() {
  props.showToast?.(`✅ Saída registrada: ${exitForm.value.qty} pneus para ${exitForm.value.driver}`)
  exitModal.value = null
}
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Total em Estoque" :value="totalStock" subtitle="pneus disponíveis" color="#10b981" border-color="#10b981" />
      <KPICard title="Novos" :value="novosPneus" subtitle="pneus novos" color="#2563eb" border-color="#2563eb" />
      <KPICard title="Recapados" :value="recapadosPneus" subtitle="pneus recapados" color="#f59e0b" border-color="#f59e0b" />
      <KPICard title="Valor Investido" value="R$ 79.730" subtitle="5 notas fiscais" color="#7c3aed" border-color="#7c3aed" />
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-[11px] py-3 px-[18px] border border-slate-200 mb-3.5 flex gap-2.5 items-center flex-wrap">
      <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
      <button class="sbtn" :class="{ on: sFilter === 'all' }" @click="sFilter = 'all'">Todos</button>
      <button class="sbtn" :class="{ on: sFilter === 'novo' }" @click="sFilter = 'novo'">Novos</button>
      <button class="sbtn" :class="{ on: sFilter === 'recapado' }" @click="sFilter = 'recapado'">Recapados</button>
      <div class="ml-auto flex gap-2 items-center">
        <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
        <button class="sbtn" :class="{ on: sSort === 'qty-desc' }" @click="sSort = 'qty-desc'">↓ Maior qtd</button>
        <button class="sbtn" :class="{ on: sSort === 'qty-asc' }" @click="sSort = 'qty-asc'">↑ Menor qtd</button>
        <button class="sbtn" :class="{ on: sSort === 'date' }" @click="sSort = 'date'">Data</button>
      </div>
    </div>

    <!-- Stock Table -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Pneu / Marca</th>
            <th class="th">Tipo</th>
            <th class="th">Qtd</th>
            <th class="th">Nível</th>
            <th class="th">NF Origem</th>
            <th class="th">Entrada</th>
            <th class="th" style="text-align:center">Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="s in filteredStock" :key="s.id">
            <td class="td">
              <div class="font-bold text-slate-900 text-[13px]">{{ s.type }}</div>
              <div v-if="s.details" class="text-[10.5px] text-slate-400 mt-px">{{ s.details }}</div>
            </td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="s.status === 'novo' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                {{ s.status === 'novo' ? 'Novo' : 'Recapado' }}
              </span>
            </td>
            <td class="td">
              <span class="text-[22px] font-extrabold text-slate-900">{{ s.qty }}</span>
              <span class="text-[11px] text-slate-400"> un</span>
            </td>
            <td class="td min-w-[110px]">
              <div class="pbg">
                <div class="pfill" :style="{ width: `${Math.min((s.qty / 25) * 100, 100)}%`, background: s.qty <= 3 ? '#ef4444' : s.qty <= 8 ? '#f59e0b' : '#10b981' }" />
              </div>
              <div class="text-[10px] mt-[3px]" :style="{ color: s.qty <= 3 ? '#ef4444' : s.qty <= 8 ? '#f59e0b' : '#10b981' }">
                {{ s.qty <= 3 ? '⚠ Crítico' : s.qty <= 8 ? 'Atenção' : 'OK' }}
              </div>
            </td>
            <td class="td">
              <span class="font-mono text-[11.5px] bg-slate-100 px-2 py-[3px] rounded-[5px] text-slate-600 font-bold">NF {{ s.nf }}</span>
            </td>
            <td class="td text-slate-500 text-xs">{{ s.date }}</td>
            <td class="td text-center">
              <button @click="openExit(s)" class="btn-p !py-1.5 !px-3 text-xs">Registrar Saída</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Purchases Table -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-[22px] py-[17px] border-b border-slate-50 flex items-center justify-between">
        <h3 class="m-0 text-sm font-bold text-slate-900">Notas Fiscais de Entrada</h3>
        <span class="text-xs text-slate-400">Compras de estoque</span>
      </div>
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">NF</th><th class="th">Descrição</th><th class="th">Quantidade</th>
            <th class="th">Valor Total</th><th class="th">Preço Unit.</th><th class="th">Data</th><th class="th">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="p in purchases" :key="p.nf">
            <td class="td"><span class="font-mono font-extrabold text-blue-800 text-[13px]">NF {{ p.nf }}</span></td>
            <td class="td font-semibold">{{ p.description }}</td>
            <td class="td"><strong>{{ p.qty }}</strong> pneus</td>
            <td class="td font-extrabold text-slate-900">{{ p.value }}</td>
            <td class="td text-slate-500">{{ p.unitPrice }}</td>
            <td class="td text-slate-500">{{ p.date }}</td>
            <td class="td"><span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-green-100 text-green-600">✓ Processada</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Exit Modal -->
    <Teleport to="body">
      <div v-if="exitModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="exitModal = null">
        <div class="bg-white rounded-xl w-[420px] shadow-2xl">
          <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">📦 Registrar Saída</h3>
            <p class="mt-1 mb-0 text-xs text-slate-400">{{ exitModal.type }} — {{ exitModal.details }}</p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motorista</label>
                <select v-model="exitForm.driver" class="finput">
                  <option value="">Selecione...</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.name">{{ d.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                <input v-model="exitForm.qty" type="number" min="1" :max="exitModal.qty" :placeholder="`Máx: ${exitModal.qty}`" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                <input v-model="exitForm.date" type="date" class="finput" />
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
              <button @click="exitModal = null" class="px-4 py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button @click="confirmExit" class="btn-p" :disabled="!exitForm.driver || !exitForm.qty">Confirmar Saída</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
