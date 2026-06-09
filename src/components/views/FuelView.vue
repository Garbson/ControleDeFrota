<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFuel } from '../../composables/useFuel'
import { useDrivers } from '../../composables/useDrivers'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { records, loading, fetchAll, create } = useFuel()
const { drivers, fetchAll: fetchDrivers } = useDrivers()

const fuelSort = ref('data-desc')
const showFuelForm = ref(false)

const fuelForm = ref({
  driver_id: '', vehicle_id: '', liters: '', price_liter: '', station: '', fuel_date: '', obs: ''
})

const sortedRecords = computed(() => {
  const list = [...records.value]
  if (fuelSort.value === 'data-desc') list.sort((a, b) => (b.fuel_date || '').localeCompare(a.fuel_date || ''))
  else if (fuelSort.value === 'data-asc') list.sort((a, b) => (a.fuel_date || '').localeCompare(b.fuel_date || ''))
  else if (fuelSort.value === 'valor-desc') list.sort((a, b) => Number(b.total) - Number(a.total))
  else if (fuelSort.value === 'valor-asc') list.sort((a, b) => Number(a.total) - Number(b.total))
  return list
})

const fuelTotal = computed(() => records.value.reduce((s, f) => s + Number(f.total || 0), 0))
const fuelLitros = computed(() => records.value.reduce((s, f) => s + Number(f.liters || 0), 0))
const fuelMedia = computed(() => fuelLitros.value > 0 ? fuelTotal.value / fuelLitros.value : 0)

const formComputed = computed(() => {
  if (fuelForm.value.liters && fuelForm.value.price_liter) {
    return (Number(fuelForm.value.liters) * Number(fuelForm.value.price_liter)).toFixed(2)
  }
  return ''
})

const formValid = computed(() =>
  fuelForm.value.driver_id && fuelForm.value.liters && fuelForm.value.price_liter && fuelForm.value.fuel_date
)

async function submitFuel() {
  if (!formValid.value) return
  try {
    await create({
      driver_id: fuelForm.value.driver_id || null,
      vehicle_id: fuelForm.value.vehicle_id || null,
      liters: Number(fuelForm.value.liters),
      price_liter: Number(fuelForm.value.price_liter),
      station: fuelForm.value.station || null,
      fuel_date: fuelForm.value.fuel_date,
      obs: fuelForm.value.obs || null,
    })
    const d = drivers.value.find(dr => dr.id == fuelForm.value.driver_id)
    props.showToast?.(`⛽ Abastecimento registrado para ${d?.name || 'motorista'}`)
    showFuelForm.value = false
    fuelForm.value = { driver_id: '', vehicle_id: '', liters: '', price_liter: '', station: '', fuel_date: '', obs: '' }
  } catch (e) {
    props.showToast?.('❌ Erro ao registrar abastecimento')
  }
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

onMounted(() => {
  fetchAll()
  fetchDrivers()
})
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Gasto Total (período)" :value="`R$ ${fmt(fuelTotal)}`" :subtitle="`${records.length} abastecimentos`" color="#f59e0b" border-color="#f59e0b" />
      <KPICard title="Litros Abastecidos" :value="fuelLitros.toLocaleString('pt-BR')" subtitle="total de litros" color="#2563eb" border-color="#2563eb" />
      <KPICard title="Média R$/Litro" :value="`R$ ${fuelMedia.toFixed(2)}`" subtitle="preço médio" color="#10b981" border-color="#10b981" />
      <KPICard title="Média/Abastecimento" :value="`R$ ${records.length > 0 ? (fuelTotal / records.length).toFixed(2) : '0'}`" subtitle="por parada" color="#7c3aed" border-color="#7c3aed" />
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

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-10 text-slate-400 text-sm">Carregando...</div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
            <td class="td font-medium whitespace-nowrap">{{ f.fuel_date }}</td>
            <td class="td font-semibold text-slate-900 text-xs">{{ f.driver_name || '—' }}</td>
            <td class="td">
              <span v-if="f.vehicle_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ f.vehicle_plate }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td font-bold text-slate-900">{{ f.liters }} L</td>
            <td class="td text-slate-500">R$ {{ Number(f.price_liter).toFixed(2) }}</td>
            <td class="td font-extrabold text-slate-900">R$ {{ fmt(f.total) }}</td>
            <td class="td text-xs text-slate-500 max-w-[180px] truncate">{{ f.station || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!sortedRecords.length" class="text-center text-slate-400 text-xs py-10">Nenhum abastecimento registrado</div>
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
                <select v-model="fuelForm.driver_id" class="finput">
                  <option value="">Selecione...</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data *</label>
                <input v-model="fuelForm.fuel_date" type="date" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Litros *</label>
                <input v-model="fuelForm.liters" type="number" placeholder="0" min="0" step="0.1" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preço/L (R$) *</label>
                <input v-model="fuelForm.price_liter" type="number" placeholder="0,00" min="0" step="0.01" class="finput" />
              </div>
              <div v-if="formComputed" class="col-span-2 bg-slate-50 rounded-lg px-4 py-3 flex items-center gap-4">
                <span class="text-xs text-slate-500">Total calculado:</span>
                <span class="text-lg font-extrabold text-blue-600">R$ {{ formComputed }}</span>
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Posto</label>
                <input v-model="fuelForm.station" placeholder="Ex: Posto Ipiranga — BR 364" class="finput" />
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
