<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTrips } from '../../composables/useTrips'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, summary, loading, fetchAll, fetchOne, fetchSummary, create, update, remove } = useTrips()
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()

const filterDriver = ref('')
const tripsSort = ref('data-desc')

const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  driver_id: '',
  truck_id: '',
  trailer_id: '',
  origin: '',
  destination: '',
  cargo: '',
  client: '',
  initial_km: '',
  final_km: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  freight_value: '',
  freight_status: 'a_receber',
  obs: '',
})

const form = ref(emptyForm())

const showDetail = ref(false)
const detailTrip = ref(null)
const detailLoading = ref(false)

const trucks = computed(() => vehicles.value.filter(v => v.type === 'truck'))
const trailers = computed(() => vehicles.value.filter(v => v.type === 'trailer'))

const sortedItems = computed(() => {
  const list = [...items.value]
  if (tripsSort.value === 'data-desc')   list.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
  else if (tripsSort.value === 'data-asc') list.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
  else if (tripsSort.value === 'lucro-desc') list.sort((a, b) => (b.profit || 0) - (a.profit || 0))
  else if (tripsSort.value === 'lucro-asc')  list.sort((a, b) => (a.profit || 0) - (b.profit || 0))
  return list
})

const filteredItems = computed(() => {
  if (!filterDriver.value) return sortedItems.value
  return sortedItems.value.filter(t => t.driver_id == filterDriver.value)
})

const totalTrips    = computed(() => Number(summary.value?.total_trips || 0))
const totalKm       = computed(() => Number(summary.value?.total_km || 0))
const totalFreight  = computed(() => Number(summary.value?.total_freight || 0))
const totalReceived = computed(() => Number(summary.value?.total_received || 0))
const totalPending  = computed(() => Number(summary.value?.total_pending || 0))

const formValid = computed(() =>
  form.value.driver_id && form.value.origin && form.value.destination &&
  form.value.initial_km && form.value.start_date
)

function openNew() {
  editingId.value = null
  formError.value = ''
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(trip) {
  editingId.value = trip.id
  formError.value = ''
  form.value = {
    driver_id:      trip.driver_id,
    truck_id:       trip.truck_id || '',
    trailer_id:     trip.trailer_id || '',
    origin:         trip.origin,
    destination:    trip.destination,
    cargo:          trip.cargo || '',
    client:         trip.client || '',
    initial_km:     trip.initial_km,
    final_km:       trip.final_km || '',
    start_date:     trip.start_date?.split('T')[0],
    end_date:       trip.end_date?.split('T')[0] || '',
    freight_value:  trip.freight_value > 0 ? trip.freight_value : '',
    freight_status: trip.freight_status !== 'sem_frete' ? trip.freight_status : 'a_receber',
    obs:            trip.obs || '',
  }
  showForm.value = true
}

async function submitForm() {
  if (!formValid.value) return
  saving.value = true
  formError.value = ''
  try {
    const data = {
      driver_id:      Number(form.value.driver_id),
      truck_id:       form.value.truck_id   ? Number(form.value.truck_id)   : null,
      trailer_id:     form.value.trailer_id ? Number(form.value.trailer_id) : null,
      origin:         form.value.origin,
      destination:    form.value.destination,
      cargo:          form.value.cargo || null,
      client:         form.value.client || null,
      initial_km:     Number(form.value.initial_km),
      final_km:       form.value.final_km ? Number(form.value.final_km) : null,
      start_date:     form.value.start_date,
      end_date:       form.value.end_date || null,
      freight_value:  form.value.freight_value ? Number(form.value.freight_value) : 0,
      freight_status: form.value.freight_value ? form.value.freight_status : 'sem_frete',
      obs:            form.value.obs || null,
    }
    if (editingId.value) {
      await update(editingId.value, data)
      props.showToast?.('Viagem atualizada')
    } else {
      await create(data)
      props.showToast?.('Viagem registrada')
    }
    await fetchAll()
    await fetchSummary()
    showForm.value = false
  } catch (e) {
    formError.value = e.message || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

async function openDetail(trip) {
  showDetail.value = true
  detailLoading.value = true
  try {
    detailTrip.value = await fetchOne(trip.id)
  } catch {
    props.showToast?.('Erro ao carregar detalhes')
  } finally {
    detailLoading.value = false
  }
}

async function deleteTrip(trip) {
  if (!confirm(`Excluir viagem ${trip.origin} → ${trip.destination}?`)) return
  try {
    await remove(trip.id)
    props.showToast?.('Viagem excluída')
  } catch {
    props.showToast?.('Erro ao excluir')
  }
}

const fmt    = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

function fmtDate(raw) {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

onMounted(() => {
  fetchAll()
  fetchSummary()
  fetchDrivers()
  fetchVehicles()
})
</script>

<template>
  <div>
    <!-- KPIs -->
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Total de Viagens" :value="totalTrips" subtitle="viagens registradas" color="#2563eb" border-color="#2563eb" />
      <KPICard title="KM Total" :value="fmtInt(totalKm) + ' km'" subtitle="distância percorrida" color="#7c3aed" border-color="#7c3aed" />
      <KPICard title="Total Frete" :value="`R$ ${fmt(totalFreight)}`" :subtitle="`Recebido: R$ ${fmt(totalReceived)}`" color="#10b981" border-color="#10b981" />
      <KPICard title="A Receber" :value="`R$ ${fmt(totalPending)}`" subtitle="fretes pendentes" :color="totalPending > 0 ? '#f59e0b' : '#10b981'" :border-color="totalPending > 0 ? '#f59e0b' : '#10b981'" />
    </div>

    <!-- Toolbar -->
    <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-3.5 flex gap-2.5 items-center flex-wrap">
      <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
      <button class="sbtn" :class="{ on: tripsSort === 'data-desc' }"   @click="tripsSort = 'data-desc'">↓ Mais recentes</button>
      <button class="sbtn" :class="{ on: tripsSort === 'data-asc' }"    @click="tripsSort = 'data-asc'">↑ Mais antigos</button>
      <button class="sbtn" :class="{ on: tripsSort === 'lucro-desc' }"  @click="tripsSort = 'lucro-desc'">↓ Maior lucro</button>
      <button class="sbtn" :class="{ on: tripsSort === 'lucro-asc' }"   @click="tripsSort = 'lucro-asc'">↑ Menor lucro</button>
      <span class="border-l border-slate-200 h-5 mx-1" />
      <span class="text-xs font-bold text-slate-500">MOTORISTA:</span>
      <select v-model="filterDriver" class="text-xs border border-slate-200 rounded-md px-2 py-1.5">
        <option value="">Todos</option>
        <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <div class="ml-auto">
        <button class="btn-p" @click="openNew">
          <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Nova Viagem
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-10 text-slate-400 text-sm">Carregando...</div>

    <!-- Tabela -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th>
            <th class="th">Motorista</th>
            <th class="th">Cavalo</th>
            <th class="th">Origem → Destino</th>
            <th class="th">Carga</th>
            <th class="th text-right">KM</th>
            <th class="th text-right">Km/L</th>
            <th class="th text-right">Frete</th>
            <th class="th text-right">Lucro</th>
            <th class="th w-10" />
          </tr>
        </thead>
        <tbody>
          <tr
            class="trow cursor-pointer hover:bg-slate-50"
            v-for="t in filteredItems"
            :key="t.id"
            @click="openDetail(t)"
          >
            <td class="td whitespace-nowrap">
              <div class="font-medium text-slate-900">{{ fmtDate(t.start_date) }}</div>
              <div v-if="t.end_date" class="text-[10px] text-slate-400">→ {{ fmtDate(t.end_date) }}</div>
            </td>
            <td class="td font-semibold text-slate-900 text-xs">{{ t.driver_name }}</td>
            <td class="td">
              <span v-if="t.truck_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ t.truck_plate }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td text-xs">
              <div class="text-slate-900 font-medium">{{ t.origin }}</div>
              <div class="text-slate-400 text-[10px]">→ {{ t.destination }}</div>
            </td>
            <td class="td text-xs text-slate-600">{{ t.cargo || '—' }}</td>
            <td class="td text-right font-bold text-slate-900">{{ t.distance > 0 ? fmtInt(t.distance) : '—' }}</td>
            <td class="td text-right font-semibold text-xs" :class="t.avg_consumption ? 'text-green-700' : 'text-slate-400'">
              {{ t.avg_consumption ? t.avg_consumption : '—' }}
            </td>
            <td class="td text-right">
              <div v-if="t.freight_value > 0">
                <div class="font-extrabold text-slate-900">R$ {{ fmt(t.freight_value) }}</div>
                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  :class="t.freight_status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ t.freight_status === 'pago' ? 'Pago' : 'A receber' }}
                </span>
              </div>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td text-right font-extrabold" :class="t.profit >= 0 ? 'text-green-700' : 'text-red-600'">
              R$ {{ fmt(t.profit || 0) }}
            </td>
            <td class="td" @click.stop>
              <div class="flex gap-1">
                <button @click="openEdit(t)" class="text-slate-400 hover:text-blue-600 p-1" title="Editar">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button @click="deleteTrip(t)" class="text-slate-400 hover:text-red-600 p-1" title="Excluir">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="text-center text-slate-400 text-xs py-10">Nenhuma viagem registrada</div>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="showForm = false">
        <div class="bg-white rounded-xl w-[600px] max-h-[92vh] overflow-y-auto shadow-2xl">
          <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">{{ editingId ? 'Editar Viagem' : 'Nova Viagem' }}</h3>
            <p class="mt-1 mb-0 text-xs text-slate-400">Preencha os dados da viagem</p>
          </div>
          <div class="p-6 space-y-5">

            <!-- Seção: Viagem -->
            <div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="h-px flex-1 bg-slate-100" />
                Dados da Viagem
                <span class="h-px flex-1 bg-slate-100" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="flabel">Motorista *</label>
                  <select v-model="form.driver_id" class="finput">
                    <option value="">Selecione...</option>
                    <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="flabel">Data Início *</label>
                  <input v-model="form.start_date" type="date" class="finput" />
                </div>
                <div>
                  <label class="flabel">Cavalo</label>
                  <select v-model="form.truck_id" class="finput">
                    <option value="">Nenhum</option>
                    <option v-for="v in trucks" :key="v.id" :value="v.id">{{ v.plate }} — {{ v.brand }} {{ v.model }}</option>
                  </select>
                </div>
                <div>
                  <label class="flabel">Carreta</label>
                  <select v-model="form.trailer_id" class="finput">
                    <option value="">Nenhuma</option>
                    <option v-for="v in trailers" :key="v.id" :value="v.id">{{ v.plate }} — {{ v.brand }} {{ v.model }}</option>
                  </select>
                </div>
                <div>
                  <label class="flabel">Origem *</label>
                  <input v-model="form.origin" placeholder="Ex: São Paulo/SP" class="finput" />
                </div>
                <div>
                  <label class="flabel">Destino *</label>
                  <input v-model="form.destination" placeholder="Ex: Salvador/BA" class="finput" />
                </div>
                <div>
                  <label class="flabel">KM Inicial *</label>
                  <input v-model="form.initial_km" type="number" placeholder="0" min="0" step="0.1" class="finput" />
                </div>
                <div>
                  <label class="flabel">KM Final</label>
                  <input v-model="form.final_km" type="number" placeholder="0" min="0" step="0.1" class="finput" />
                </div>
                <div>
                  <label class="flabel">Carga</label>
                  <input v-model="form.cargo" placeholder="Ex: Cimento, Madeira..." class="finput" />
                </div>
                <div>
                  <label class="flabel">Data Fim</label>
                  <input v-model="form.end_date" type="date" class="finput" />
                </div>
              </div>
            </div>

            <!-- Seção: Frete -->
            <div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="h-px flex-1 bg-slate-100" />
                Frete / Receita
                <span class="h-px flex-1 bg-slate-100" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="flabel">Cliente / Tomador</label>
                  <input v-model="form.client" placeholder="Nome do cliente" class="finput" />
                </div>
                <div>
                  <label class="flabel">Valor do Frete (R$)</label>
                  <input v-model="form.freight_value" type="number" placeholder="0,00" min="0" step="0.01" class="finput" />
                </div>
              </div>

              <!-- Status do frete — só aparece quando há valor -->
              <div v-if="Number(form.freight_value) > 0" class="mt-3">
                <label class="flabel mb-2">Status do Frete</label>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all"
                    :class="form.freight_status === 'a_receber'
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
                    @click="form.freight_status = 'a_receber'"
                  >
                    Lançar em Contas a Receber
                  </button>
                  <button
                    type="button"
                    class="flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all"
                    :class="form.freight_status === 'pago'
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
                    @click="form.freight_status = 'pago'"
                  >
                    Já Recebido
                  </button>
                </div>
              </div>
            </div>

            <!-- Observações -->
            <div>
              <label class="flabel">Observações</label>
              <textarea v-model="form.obs" placeholder="Notas adicionais..." rows="2" class="finput resize-none" />
            </div>

            <p v-if="formError" class="text-red-500 text-xs">{{ formError }}</p>

            <div class="pt-2 flex justify-between items-center">
              <button @click="showForm = false" class="px-4 py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button @click="submitForm" class="btn-p" :disabled="!formValid || saving">
                {{ saving ? 'Salvando...' : (editingId ? 'Atualizar Viagem' : 'Registrar Viagem') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Detalhe -->
    <Teleport to="body">
      <div v-if="showDetail" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="showDetail = false">
        <div class="bg-white rounded-xl w-[720px] max-h-[92vh] overflow-y-auto shadow-2xl">
          <div v-if="detailLoading" class="flex items-center justify-center py-16 text-slate-400 text-sm">Carregando detalhes...</div>

          <template v-else-if="detailTrip">
            <!-- Header -->
            <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="m-0 text-[15px] font-bold text-white">{{ detailTrip.origin }} → {{ detailTrip.destination }}</h3>
                  <p class="mt-1 mb-0 text-xs text-slate-400">
                    {{ detailTrip.driver_name }}
                    <template v-if="detailTrip.cargo"> · {{ detailTrip.cargo }}</template>
                    · {{ fmtDate(detailTrip.start_date) }}
                    <template v-if="detailTrip.end_date"> → {{ fmtDate(detailTrip.end_date) }}</template>
                    <template v-if="detailTrip.truck_plate"> · {{ detailTrip.truck_plate }}</template>
                  </p>
                </div>
                <button @click="showDetail = false" class="text-slate-400 hover:text-white">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </div>

            <div class="p-6">
              <!-- KPIs da viagem -->
              <div class="grid grid-cols-4 gap-3 mb-5">
                <div class="bg-slate-50 rounded-lg p-3 text-center">
                  <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Distância</div>
                  <div class="text-lg font-extrabold text-slate-900">{{ detailTrip.distance > 0 ? fmtInt(detailTrip.distance) + ' km' : '—' }}</div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3 text-center">
                  <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Média Diesel</div>
                  <div class="text-lg font-extrabold" :class="detailTrip.avg_consumption ? 'text-green-700' : 'text-slate-400'">
                    {{ detailTrip.avg_consumption ? detailTrip.avg_consumption + ' km/L' : '—' }}
                  </div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3 text-center">
                  <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Frete</div>
                  <div class="text-lg font-extrabold text-slate-900">
                    {{ detailTrip.freight_value > 0 ? 'R$ ' + fmt(detailTrip.freight_value) : '—' }}
                  </div>
                  <span v-if="detailTrip.freight_value > 0"
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    :class="detailTrip.freight_status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                  >
                    {{ detailTrip.freight_status === 'pago' ? 'Recebido' : 'A receber' }}
                  </span>
                </div>
                <div class="rounded-lg p-3 text-center" :class="detailTrip.profit >= 0 ? 'bg-green-50' : 'bg-red-50'">
                  <div class="text-[10px] font-bold uppercase mb-1" :class="detailTrip.profit >= 0 ? 'text-green-700' : 'text-red-700'">Lucro</div>
                  <div class="text-lg font-extrabold" :class="detailTrip.profit >= 0 ? 'text-green-700' : 'text-red-600'">
                    R$ {{ fmt(detailTrip.profit) }}
                  </div>
                </div>
              </div>

              <!-- Cliente -->
              <div v-if="detailTrip.client" class="mb-4 bg-blue-50 rounded-lg px-4 py-2.5 text-sm">
                <span class="text-[10px] font-bold text-blue-600 uppercase">Cliente</span>
                <span class="ml-2 font-semibold text-blue-900">{{ detailTrip.client }}</span>
              </div>

              <!-- Breakdown -->
              <div class="grid grid-cols-2 gap-4">
                <!-- Combustível -->
                <div>
                  <h4 class="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    Combustível
                    <span class="text-[10px] font-normal text-slate-400">({{ detailTrip.fuel_records?.length || 0 }} abastecimentos)</span>
                  </h4>
                  <div v-if="detailTrip.fuel_records?.length" class="space-y-1.5 max-h-[180px] overflow-y-auto">
                    <div v-for="f in detailTrip.fuel_records" :key="f.id" class="flex justify-between text-xs bg-slate-50 rounded px-3 py-2">
                      <span class="text-slate-600">{{ fmtDate(f.fuel_date) }} — {{ f.liters }}L @ R${{ Number(f.price_liter).toFixed(3) }}</span>
                      <span class="font-bold text-slate-700">R$ {{ fmt(f.total) }}</span>
                    </div>
                  </div>
                  <div v-else class="text-xs text-slate-400 py-2">Nenhum abastecimento no período</div>
                  <div v-if="detailTrip.fuel_total > 0" class="text-xs font-extrabold text-slate-900 mt-2 text-right">
                    Total: R$ {{ fmt(detailTrip.fuel_total) }} · {{ Number(detailTrip.fuel_liters).toLocaleString('pt-BR') }} L
                  </div>
                </div>

                <!-- Despesas -->
                <div>
                  <h4 class="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    Despesas
                    <span class="text-[10px] font-normal text-slate-400">({{ detailTrip.expenses?.length || 0 }} registros)</span>
                  </h4>
                  <div v-if="detailTrip.expenses?.length" class="space-y-1.5 max-h-[180px] overflow-y-auto">
                    <div v-for="e in detailTrip.expenses" :key="e.id" class="flex justify-between text-xs bg-slate-50 rounded px-3 py-2">
                      <span class="text-slate-600">{{ fmtDate(e.exp_date) }} — {{ e.description || e.type }}</span>
                      <span class="font-bold text-slate-700">R$ {{ fmt(e.value * e.qty) }}</span>
                    </div>
                  </div>
                  <div v-else class="text-xs text-slate-400 py-2">Nenhuma despesa no período</div>
                  <div v-if="detailTrip.expenses_total > 0" class="text-xs font-extrabold text-slate-900 mt-2 text-right">
                    Total: R$ {{ fmt(detailTrip.expenses_total) }}
                  </div>
                </div>
              </div>

              <!-- Observações -->
              <div v-if="detailTrip.obs" class="mt-4 bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-600">
                <span class="font-bold text-slate-500 uppercase text-[10px]">Obs:</span> {{ detailTrip.obs }}
              </div>

              <!-- Resumo final -->
              <div class="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div class="text-[10px] text-slate-500 uppercase font-bold">Gastos</div>
                  <div class="text-sm font-extrabold text-red-600">— R$ {{ fmt(detailTrip.total_cost) }}</div>
                </div>
                <div>
                  <div class="text-[10px] text-slate-500 uppercase font-bold">Frete</div>
                  <div class="text-sm font-extrabold text-green-600">+ R$ {{ fmt(detailTrip.revenue) }}</div>
                </div>
                <div>
                  <div class="text-[10px] text-slate-500 uppercase font-bold">Resultado</div>
                  <div class="text-sm font-extrabold" :class="detailTrip.profit >= 0 ? 'text-green-700' : 'text-red-600'">
                    {{ detailTrip.profit >= 0 ? '+' : '' }}R$ {{ fmt(detailTrip.profit) }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
