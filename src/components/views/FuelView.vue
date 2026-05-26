<script setup>
import { ref, computed } from 'vue'
import { fuelRecords as initialFuel } from '../../data/fuel.js'
import { drivers } from '../../data/drivers.js'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const fuelSort = ref('data-desc')
const showFuelForm = ref(false)

const data = ref([...initialFuel])

const fuelForm = ref({
  motorista: '', placa: '', litros: '', preco: '', posto: '', data: '', obs: ''
})

const sortedRecords = computed(() => {
  const list = [...data.value]
  if (fuelSort.value === 'data-desc') list.sort((a, b) => b.data.localeCompare(a.data))
  else if (fuelSort.value === 'data-asc') list.sort((a, b) => a.data.localeCompare(b.data))
  else if (fuelSort.value === 'valor-desc') list.sort((a, b) => b.total - a.total)
  else if (fuelSort.value === 'valor-asc') list.sort((a, b) => a.total - b.total)
  return list
})

const fuelTotal = computed(() => data.value.reduce((s, f) => s + f.total, 0))
const fuelLitros = computed(() => data.value.reduce((s, f) => s + f.litros, 0))
const fuelMedia = computed(() => fuelLitros.value > 0 ? (fuelTotal.value / fuelLitros.value) : 0)

const formComputed = computed(() => {
  if (fuelForm.value.litros && fuelForm.value.preco) {
    return (Number(fuelForm.value.litros) * Number(fuelForm.value.preco)).toFixed(2)
  }
  return ''
})

const formValid = computed(() =>
  fuelForm.value.motorista && fuelForm.value.litros && fuelForm.value.preco
)

function submitFuel() {
  if (!formValid.value) return
  const total = Number(fuelForm.value.litros) * Number(fuelForm.value.preco)
  data.value.unshift({
    id: Date.now(),
    data: fuelForm.value.data || new Date().toLocaleDateString('pt-BR'),
    motorista: fuelForm.value.motorista,
    placa: fuelForm.value.placa,
    litros: Number(fuelForm.value.litros),
    preco: Number(fuelForm.value.preco),
    total,
    posto: fuelForm.value.posto || '—',
    obs: fuelForm.value.obs,
  })
  props.showToast?.(`⛽ Abastecimento registrado para ${fuelForm.value.motorista}`)
  showFuelForm.value = false
  fuelForm.value = { motorista: '', placa: '', litros: '', preco: '', posto: '', data: '', obs: '' }
}
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Gasto Total (período)" :value="`R$ ${fuelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`" :subtitle="`${data.length} abastecimentos`" color="#f59e0b" border-color="#f59e0b" />
      <KPICard title="Litros Abastecidos" :value="fuelLitros.toLocaleString('pt-BR')" subtitle="total de litros" color="#2563eb" border-color="#2563eb" />
      <KPICard title="Média R$/Litro" :value="`R$ ${fuelMedia.toFixed(2)}`" subtitle="preço médio" color="#10b981" border-color="#10b981" />
      <KPICard title="Média/Abastecimento" :value="`R$ ${data.length > 0 ? (fuelTotal / data.length).toFixed(2) : '0'}`" subtitle="por parada" color="#7c3aed" border-color="#7c3aed" />
    </div>

    <!-- Toolbar -->
    <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-3.5 flex gap-2.5 items-center flex-wrap">
      <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
      <button class="sbtn" :class="{ on: fuelSort === 'data-desc' }" @click="fuelSort = 'data-desc'">↓ Mais recentes</button>
      <button class="sbtn" :class="{ on: fuelSort === 'data-asc' }" @click="fuelSort = 'data-asc'">↑ Mais antigos</button>
      <button class="sbtn" :class="{ on: fuelSort === 'valor-desc' }" @click="fuelSort = 'valor-desc'">↓ Maior valor</button>
      <button class="sbtn" :class="{ on: fuelSort === 'valor-asc' }" @click="fuelSort = 'valor-asc'">↑ Menor valor</button>
      <div class="ml-auto">
        <button class="btn-p" @click="showFuelForm = true">
          <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Novo Abastecimento
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th>
            <th class="th">Motorista</th>
            <th class="th">Placa</th>
            <th class="th">Litros</th>
            <th class="th">Preço/L</th>
            <th class="th">Total</th>
            <th class="th">Posto</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="f in sortedRecords" :key="f.id">
            <td class="td font-medium whitespace-nowrap">{{ f.data }}</td>
            <td class="td font-semibold text-slate-900 text-xs">{{ f.motorista }}</td>
            <td class="td"><span class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ f.placa }}</span></td>
            <td class="td font-bold text-slate-900">{{ f.litros }} L</td>
            <td class="td text-slate-500">R$ {{ f.preco.toFixed(2) }}</td>
            <td class="td font-extrabold text-slate-900">R$ {{ f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</td>
            <td class="td text-xs text-slate-500 max-w-[180px] truncate">{{ f.posto }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showFuelForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="showFuelForm = false">
        <div class="bg-white rounded-xl w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl">
          <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">⛽ Novo Abastecimento</h3>
            <p class="mt-1 mb-0 text-xs text-slate-400">Registre o abastecimento por motorista e veículo</p>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motorista</label>
                <select v-model="fuelForm.motorista" class="finput">
                  <option value="">Selecione...</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.name">{{ d.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Placa</label>
                <input v-model="fuelForm.placa" placeholder="Ex: QWP1I64" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Litros</label>
                <input v-model="fuelForm.litros" type="number" placeholder="0" min="0" step="0.1" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preço/L (R$)</label>
                <input v-model="fuelForm.preco" type="number" placeholder="0,00" min="0" step="0.01" class="finput" />
              </div>
              <div v-if="formComputed" class="col-span-2 bg-slate-50 rounded-lg px-4 py-3 flex items-center gap-4">
                <span class="text-xs text-slate-500">Total calculado:</span>
                <span class="text-lg font-extrabold text-blue-600">R$ {{ formComputed }}</span>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Posto</label>
                <input v-model="fuelForm.posto" placeholder="Ex: Posto Ipiranga — BR 364" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                <input v-model="fuelForm.data" type="date" class="finput" />
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
              <button @click="showFuelForm = false" class="px-4 py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button @click="submitFuel" class="btn-p" :disabled="!formValid">Salvar Abastecimento</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
