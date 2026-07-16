<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFuel } from '../../composables/useFuel'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import KPICard from '../ui/KPICard.vue'
import { useConfirm } from '../../composables/useConfirm'

const props = defineProps({ showToast: Function })

const { records, loading, fetchAll, create, update, remove } = useFuel()
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()
const { confirmAction } = useConfirm()

function fmtDate(raw) {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

const fuelSort = ref('data-desc')
const showFuelForm = ref(false)
const editingFuel = ref(null)
const viewingFuel = ref(null)

const plateInput = ref('')

const plateSuggestions = computed(() => {
  if (!plateInput.value) return vehicles.value.slice(0, 15)
  const q = plateInput.value.toLowerCase()
  return vehicles.value.filter(v => v.plate.toLowerCase().includes(q)).slice(0, 15)
})

function selectPlate(plate) {
  plateInput.value = plate
  const v = vehicles.value.find(v => v.plate === plate)
  fuelForm.value.vehicle_id = v?.id || ''
}

const fuelTypes = ['Diesel S10', 'Diesel S500', 'Diesel Termo King', 'Arla 32']

const fuelForm = ref({
  driver_id: '', vehicle_id: '', liters: '', price_liter: '', station: '', fuel_type: '', fuel_date: '', obs: ''
})

function openEditFuel(f) {
  editingFuel.value = f
  plateInput.value = f.vehicle_plate || ''
  fuelForm.value = {
    driver_id: f.driver_id || '',
    vehicle_id: f.vehicle_id || '',
    liters: f.liters,
    price_liter: f.price_liter,
    station: f.station || '',
    fuel_type: f.fuel_type || '',
    fuel_date: f.fuel_date?.split('T')[0] || f.fuel_date || '',
    obs: f.obs || '',
  }
  showFuelForm.value = true
}

async function deleteFuel(f) {
  const driver = f.driver_name || 'registro'
  if (!await confirmAction({ title: 'Excluir abastecimento', message: `Excluir o abastecimento de ${driver} em ${f.fuel_date?.split('T')[0] || ''}?`, confirmText: 'Excluir' })) return
  try {
    await remove(f.id)
    props.showToast?.('Abastecimento excluído')
  } catch {
    props.showToast?.('❌ Erro ao excluir abastecimento')
  }
}

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
    const data = {
      driver_id: fuelForm.value.driver_id || null,
      vehicle_id: fuelForm.value.vehicle_id || null,
      liters: Number(fuelForm.value.liters),
      price_liter: Number(fuelForm.value.price_liter),
      station: fuelForm.value.station || null,
      fuel_type: fuelForm.value.fuel_type || null,
      fuel_date: fuelForm.value.fuel_date,
      obs: fuelForm.value.obs || null,
    }
    if (editingFuel.value) {
      await update(editingFuel.value.id, data)
      props.showToast?.('✅ Abastecimento atualizado')
    } else {
      await create(data)
      const d = drivers.value.find(dr => dr.id == fuelForm.value.driver_id)
      props.showToast?.(`⛽ Abastecimento registrado para ${d?.name || 'motorista'}`)
    }
    showFuelForm.value = false
    editingFuel.value = null
    plateInput.value = ''
    fuelForm.value = { driver_id: '', vehicle_id: '', liters: '', price_liter: '', station: '', fuel_type: '', fuel_date: '', obs: '' }
  } catch (e) {
    props.showToast?.('❌ Erro ao salvar abastecimento')
  }
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

onMounted(() => {
  fetchAll()
  fetchDrivers()
  fetchVehicles()
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
    <div class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex gap-2.5 items-center flex-wrap">
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
    <div v-else class="glass rounded-xl overflow-hidden">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th>
            <th class="th">Motorista</th>
            <th class="th">Placa</th>
            <th class="th">Tipo</th>
            <th class="th">Litros</th>
            <th class="th">Preço/L</th>
            <th class="th">Total</th>
            <th class="th">Posto</th>
            <th class="th" style="text-align:center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="f in sortedRecords" :key="f.id">
            <td class="td font-medium whitespace-nowrap">{{ fmtDate(f.fuel_date) }}</td>
            <td class="td font-semibold text-stone-800 text-xs">{{ f.driver_name || '—' }}</td>
            <td class="td">
              <span v-if="f.vehicle_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ f.vehicle_plate }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td">
              <span v-if="f.fuel_type" class="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{{ f.fuel_type }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td font-bold text-stone-800">{{ f.liters }} L</td>
            <td class="td text-slate-500">R$ {{ Number(f.price_liter).toFixed(2) }}</td>
            <td class="td font-extrabold text-stone-800">R$ {{ fmt(f.total) }}</td>
            <td class="td text-xs text-slate-500 max-w-[180px] truncate">{{ f.station || '—' }}</td>
            <td class="td text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button
                  @click="viewingFuel = f"
                  title="Visualizar"
                  class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </button>
                <button
                  @click="openEditFuel(f)"
                  title="Editar"
                  class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors inline-flex"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button
                  @click="deleteFuel(f)"
                  title="Excluir"
                  class="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!sortedRecords.length" class="text-center text-slate-400 text-xs py-10">Nenhum abastecimento registrado</div>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showFuelForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="showFuelForm = false; editingFuel = null">
        <div class="glass-strong rounded-xl w-[480px] max-h-[90vh] overflow-y-auto">
          <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">⛽ {{ editingFuel ? 'Editar Abastecimento' : 'Novo Abastecimento' }}</h3>
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
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Placa</label>
                <input
                  v-model="plateInput"
                  type="text"
                  placeholder="Digite ou selecione a placa..."
                  class="finput"
                  list="fuel-plate-list"
                  @input="selectPlate(plateInput)"
                  @focus="$event.target.select()"
                />
                <datalist id="fuel-plate-list">
                  <option v-for="v in plateSuggestions" :key="v.id" :value="v.plate">{{ v.plate }} — {{ v.brand }} {{ v.model }}</option>
                </datalist>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Combustível</label>
                <select v-model="fuelForm.fuel_type" class="finput">
                  <option value="">Selecione...</option>
                  <option v-for="t in fuelTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Litros *</label>
                <input v-model="fuelForm.liters" type="number" placeholder="0" min="0" step="0.1" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preço/L (R$) *</label>
                <input v-model="fuelForm.price_liter" type="number" placeholder="0,00" min="0" step="0.01" class="finput" />
              </div>
              <div v-if="formComputed" class="col-span-2 rounded-lg px-4 py-3 bg-stone-50 flex items-center gap-4">
                <span class="text-xs text-slate-500">Total calculado:</span>
                <span class="text-lg font-extrabold text-blue-600">R$ {{ formComputed }}</span>
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Posto</label>
                <input v-model="fuelForm.station" placeholder="Ex: Posto Ipiranga — BR 364" class="finput" />
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-stone-100 flex justify-between items-center">
              <button @click="showFuelForm = false; editingFuel = null" class="px-4 py-2 bg-transparent border border-stone-200 rounded-lg text-stone-600 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button @click="submitFuel" class="btn-p" :disabled="!formValid">{{ editingFuel ? 'Salvar Alterações' : 'Salvar Abastecimento' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Visualizar Abastecimento -->
    <Teleport to="body">
      <div v-if="viewingFuel" class="fixed inset-0 z-[110] flex items-center justify-center p-4" @click.self="viewingFuel = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="viewingFuel = null" />
        <div class="relative glass-strong rounded-2xl w-full max-w-[500px] overflow-hidden">
          <div class="px-7 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between">
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">⛽ Detalhes do Abastecimento</h3>
              <p class="mt-0.5 mb-0 text-xs text-slate-400">#{{ viewingFuel.id }} — somente leitura</p>
            </div>
            <button @click="viewingFuel = null" class="text-slate-400 hover:text-white transition-colors">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="px-7 py-6 grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data</div>
              <div class="text-sm font-semibold text-slate-800">{{ fmtDate(viewingFuel.fuel_date) }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Motorista</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingFuel.driver_name || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Placa</div>
              <div class="text-sm font-mono font-bold text-blue-800">{{ viewingFuel.vehicle_plate || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Combustível</div>
              <div class="text-sm font-semibold text-amber-700">{{ viewingFuel.fuel_type || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Posto</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingFuel.station || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Litros</div>
              <div class="text-lg font-extrabold text-stone-800">{{ Number(viewingFuel.liters).toFixed(2) }} L</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Preço / L</div>
              <div class="text-sm font-semibold text-slate-800">R$ {{ Number(viewingFuel.price_liter).toFixed(3) }}</div>
            </div>
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</div>
              <div class="text-2xl font-extrabold text-amber-600">R$ {{ fmt(viewingFuel.total) }}</div>
            </div>
            <div v-if="viewingFuel.obs" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observação</div>
              <div class="text-sm text-stone-600 rounded-lg p-3 bg-stone-50 border border-stone-100">{{ viewingFuel.obs }}</div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button @click="viewingFuel = null" class="px-5 py-2 bg-stone-100/70 hover:bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
