<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useTrips } from '../../composables/useTrips'
import { useConfirm } from '../../composables/useConfirm'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, summary, loading, fetchAll, fetchOne, fetchSummary, create, update, remove, addLeg, updateLeg, removeLeg } = useTrips()
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()
const { confirmAction } = useConfirm()

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
  trailer_id_2: '',
  origin: '',
  destination: '',
  initial_km: '',
  final_km: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  obs: '',
})

const form = ref(emptyForm())

const showDetail = ref(false)
const detailTrip = ref(null)
const detailLoading = ref(false)

// Trechos no form de criar/editar
const formLegs = ref([])
const deletedLegIds = ref([])

function addFormLeg() {
  const lastDest = formLegs.value.length
    ? formLegs.value[formLegs.value.length - 1].destination
    : form.value.origin
  formLegs.value.push({ _key: Date.now() + Math.random(), id: null, origin: lastDest, destination: '', cargo: '', client: '', freight_value: '', freight_status: 'a_receber' })
}

function removeFormLeg(index) {
  const leg = formLegs.value[index]
  if (leg.id) deletedLegIds.value.push(leg.id)
  formLegs.value.splice(index, 1)
}

watch(formLegs, (legs) => {
  if (legs.length === 0) return
  if (legs[0].origin) form.value.origin = legs[0].origin
  if (legs[legs.length - 1].destination) form.value.destination = legs[legs.length - 1].destination
}, { deep: true })

// Trechos no modal de detalhe
const showLegForm = ref(false)
const legSaving = ref(false)
const editingLeg = ref(null)
const legForm = ref({ origin: '', destination: '', departure_date: '', arrival_date: '', km_start: '', km_end: '', cargo: '', obs: '', client: '', freight_value: '', freight_status: 'a_receber' })

function openAddLeg() {
  editingLeg.value = null
  const legs = detailTrip.value?.legs || []
  const lastDest = legs.length ? legs[legs.length - 1].destination : (detailTrip.value?.origin || '')
  legForm.value = { origin: lastDest, destination: '', departure_date: '', arrival_date: '', km_start: '', km_end: '', cargo: '', obs: '', client: '', freight_value: '', freight_status: 'a_receber' }
  showLegForm.value = true
}

function openEditLeg(leg) {
  editingLeg.value = leg
  legForm.value = {
    origin: leg.origin,
    destination: leg.destination,
    departure_date: leg.departure_date?.split('T')[0] || leg.departure_date || '',
    arrival_date: leg.arrival_date?.split('T')[0] || leg.arrival_date || '',
    km_start: leg.km_start || '',
    km_end: leg.km_end || '',
    cargo: leg.cargo || '',
    obs: leg.obs || '',
    client: leg.client || '',
    freight_value: leg.freight_value > 0 ? leg.freight_value : '',
    freight_status: leg.freight_status || 'a_receber',
  }
  showLegForm.value = true
}

async function saveLeg() {
  if (!legForm.value.origin || !legForm.value.destination) return
  legSaving.value = true
  try {
    const fv = legForm.value.freight_value ? Number(legForm.value.freight_value) : 0
    const data = {
      origin: legForm.value.origin,
      destination: legForm.value.destination,
      departure_date: legForm.value.departure_date || null,
      arrival_date: legForm.value.arrival_date || null,
      km_start: legForm.value.km_start ? Number(legForm.value.km_start) : null,
      km_end: legForm.value.km_end ? Number(legForm.value.km_end) : null,
      cargo: legForm.value.cargo || null,
      obs: legForm.value.obs || null,
      client: legForm.value.client || null,
      freight_value: fv,
      freight_status: fv > 0 ? legForm.value.freight_status : 'sem_frete',
    }
    if (editingLeg.value) {
      await updateLeg(detailTrip.value.id, editingLeg.value.id, data)
    } else {
      await addLeg(detailTrip.value.id, data)
    }
    detailTrip.value = await fetchOne(detailTrip.value.id)
    showLegForm.value = false
    editingLeg.value = null
  } catch (e) {
    props.showToast?.('❌ Erro ao salvar trecho')
  } finally {
    legSaving.value = false
  }
}

async function deleteLeg(leg) {
  if (!await confirmAction({ title: 'Remover trecho', message: `Remover o trecho "${leg.origin} → ${leg.destination}"? O frete vinculado também poderá ser removido.`, confirmText: 'Remover' })) return
  try {
    await removeLeg(detailTrip.value.id, leg.id)
    detailTrip.value = await fetchOne(detailTrip.value.id)
  } catch {
    props.showToast?.('❌ Erro ao remover trecho')
  }
}

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
  formLegs.value = [{ _key: Date.now(), id: null, origin: '', destination: '', cargo: '', client: '', freight_value: '', freight_status: 'a_receber' }]
  deletedLegIds.value = []
  showForm.value = true
}

async function openEdit(trip) {
  editingId.value = trip.id
  formError.value = ''
  form.value = {
    driver_id:      trip.driver_id,
    truck_id:       trip.truck_id || '',
    trailer_id:     trip.trailer_id || '',
    trailer_id_2:   trip.trailer_id_2 || '',
    origin:         trip.origin,
    destination:    trip.destination,
    initial_km:     trip.initial_km,
    final_km:       trip.final_km || '',
    start_date:     trip.start_date?.split('T')[0],
    end_date:       trip.end_date?.split('T')[0] || '',
    obs:            trip.obs || '',
  }
  formLegs.value = []
  deletedLegIds.value = []
  showForm.value = true
  try {
    const full = await fetchOne(trip.id)
    formLegs.value = (full.legs || []).map(l => ({
      _key: l.id,
      id: l.id,
      origin: l.origin,
      destination: l.destination,
      cargo: l.cargo || '',
      client: l.client || '',
      freight_value: l.freight_value > 0 ? l.freight_value : '',
      freight_status: l.freight_status || 'a_receber',
    }))
  } catch {}
}

async function submitForm() {
  if (!formValid.value) return
  saving.value = true
  formError.value = ''
  try {
    const data = {
      driver_id:      Number(form.value.driver_id),
      truck_id:       form.value.truck_id   ? Number(form.value.truck_id)   : null,
      trailer_id:     form.value.trailer_id   ? Number(form.value.trailer_id)   : null,
      trailer_id_2:   form.value.trailer_id_2 ? Number(form.value.trailer_id_2) : null,
      origin:         form.value.origin,
      destination:    form.value.destination,
      cargo:          null,
      client:         null,
      initial_km:     Number(form.value.initial_km),
      final_km:       form.value.final_km ? Number(form.value.final_km) : null,
      start_date:     form.value.start_date,
      end_date:       form.value.end_date || null,
      freight_value:  0,
      freight_status: 'sem_frete',
      obs:            form.value.obs || null,
    }
    let tripId
    if (editingId.value) {
      await update(editingId.value, data)
      tripId = editingId.value
      props.showToast?.('Viagem atualizada')
    } else {
      const res = await create(data)
      tripId = res.id
      props.showToast?.('Viagem registrada')
    }
    // Sincroniza trechos
    for (const legId of deletedLegIds.value) {
      await removeLeg(tripId, legId)
    }
    for (const leg of formLegs.value) {
      const fv = leg.freight_value ? Number(leg.freight_value) : 0
      const legData = {
        origin: leg.origin,
        destination: leg.destination,
        cargo: leg.cargo || null,
        client: leg.client || null,
        freight_value: fv,
        freight_status: fv > 0 ? leg.freight_status : 'sem_frete',
      }
      if (leg.id) {
        await updateLeg(tripId, leg.id, legData)
      } else if (leg.origin && leg.destination) {
        await addLeg(tripId, legData)
      }
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
  if (!await confirmAction({ title: 'Excluir viagem', message: `Excluir a viagem ${trip.origin} → ${trip.destination}? Esta ação não pode ser desfeita.`, confirmText: 'Excluir' })) return
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

const today = new Date().toLocaleDateString('pt-BR')

const regularFuelRecords = computed(() =>
  (detailTrip.value?.fuel_records || []).filter(f => f.fuel_type !== 'Diesel Termo King')
)
const thermoKingRecords = computed(() =>
  (detailTrip.value?.fuel_records || []).filter(f => f.fuel_type === 'Diesel Termo King')
)

// ── Impressão de viagem ──────────────────────────────────
const printingTrip = ref(null)

function printTrip() {
  printingTrip.value = detailTrip.value
  document.body.classList.add('trip-printing')

  const cleanup = () => {
    document.body.classList.remove('trip-printing')
    printingTrip.value = null
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  setTimeout(() => window.print(), 60)
}

onUnmounted(() => {
  document.body.classList.remove('trip-printing')
})

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
    <div class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex gap-2.5 items-center flex-wrap">
      <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
      <button class="sbtn" :class="{ on: tripsSort === 'data-desc' }"   @click="tripsSort = 'data-desc'">↓ Mais recentes</button>
      <button class="sbtn" :class="{ on: tripsSort === 'data-asc' }"    @click="tripsSort = 'data-asc'">↑ Mais antigos</button>
      <button class="sbtn" :class="{ on: tripsSort === 'lucro-desc' }"  @click="tripsSort = 'lucro-desc'">↓ Maior lucro</button>
      <button class="sbtn" :class="{ on: tripsSort === 'lucro-asc' }"   @click="tripsSort = 'lucro-asc'">↑ Menor lucro</button>
      <span class="border-l border-stone-200 h-5 mx-1" />
      <span class="text-xs font-bold text-slate-500">MOTORISTA:</span>
      <select v-model="filterDriver" class="text-xs border border-stone-200 rounded-md px-2 py-1.5">
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
    <div v-else class="glass rounded-xl overflow-hidden">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th>
            <th class="th">Motorista</th>
            <th class="th">Cavalo</th>
            <th class="th">Origem → Destino</th>
            <th class="th text-right">KM</th>
            <th class="th text-right">Km/L</th>
            <th class="th text-right">Frete</th>
            <th class="th text-right">Lucro</th>
            <th class="th w-10" />
          </tr>
        </thead>
        <tbody>
          <tr
            class="trow cursor-pointer hover:bg-stone-50"
            v-for="t in filteredItems"
            :key="t.id"
            @click="openDetail(t)"
          >
            <td class="td whitespace-nowrap">
              <div class="font-medium text-stone-800">{{ fmtDate(t.start_date) }}</div>
              <div v-if="t.end_date" class="text-[10px] text-slate-400">→ {{ fmtDate(t.end_date) }}</div>
            </td>
            <td class="td font-semibold text-stone-800 text-xs">{{ t.driver_name }}</td>
            <td class="td">
              <span v-if="t.truck_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ t.truck_plate }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td text-xs">
              <div class="text-stone-800 font-medium">{{ t.origin }}</div>
              <div class="text-slate-400 text-[10px]">→ {{ t.destination }}</div>
            </td>
            <td class="td text-right font-bold text-stone-800">{{ t.distance > 0 ? fmtInt(t.distance) : '—' }}</td>
            <td class="td text-right font-semibold text-xs" :class="t.avg_consumption ? 'text-green-700' : 'text-slate-400'">
              {{ t.avg_consumption ? t.avg_consumption : '—' }}
            </td>
            <td class="td text-right">
              <div v-if="t.revenue > 0">
                <div class="font-extrabold text-stone-800">R$ {{ fmt(t.revenue) }}</div>
                <span v-if="t.legs_count > 0" class="text-[9px] font-semibold px-1 py-0.5 rounded bg-blue-50 text-blue-600">
                  {{ t.legs_count }} trecho{{ t.legs_count > 1 ? 's' : '' }}
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
        <div class="glass-strong rounded-xl w-[600px] max-h-[92vh] overflow-y-auto">
          <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">{{ editingId ? 'Editar Viagem' : 'Nova Viagem' }}</h3>
            <p class="mt-1 mb-0 text-xs text-slate-400">Preencha os dados da viagem</p>
          </div>
          <div class="p-6 space-y-5">

            <!-- Seção: Viagem -->
            <div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="h-px flex-1 bg-stone-100/70" />
                Dados da Viagem
                <span class="h-px flex-1 bg-stone-100/70" />
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
                  <label class="flabel">Carreta 1</label>
                  <select v-model="form.trailer_id" class="finput">
                    <option value="">Nenhuma</option>
                    <option v-for="v in trailers" :key="v.id" :value="v.id">{{ v.plate }} — {{ v.brand }} {{ v.model }}</option>
                  </select>
                </div>
                <div>
                  <label class="flabel">Carreta 2</label>
                  <select v-model="form.trailer_id_2" class="finput">
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
                  <label class="flabel">Data Fim</label>
                  <input v-model="form.end_date" type="date" class="finput" />
                </div>
              </div>
            </div>

            <!-- Seção: Trechos -->
            <div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="h-px flex-1 bg-stone-100/70" />
                Trechos
                <span class="h-px flex-1 bg-stone-100/70" />
              </div>
              <div v-if="formLegs.length" class="space-y-2 mb-3">
                <div v-for="(leg, i) in formLegs" :key="leg._key" class="bg-stone-50/50 border border-stone-200 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">Trecho {{ i + 1 }}</span>
                    <button type="button" @click="removeFormLeg(i)" class="text-slate-400 hover:text-red-600 p-0.5">
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="flabel">De *</label>
                      <input v-model="leg.origin" placeholder="Ex: Rio Branco/AC" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Para *</label>
                      <input v-model="leg.destination" placeholder="Ex: São Paulo/SP" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Carga</label>
                      <input v-model="leg.cargo" placeholder="Ex: Cimento, Madeira..." class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Cliente</label>
                      <input v-model="leg.client" placeholder="Nome do cliente" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Frete (R$)</label>
                      <input v-model="leg.freight_value" type="number" min="0" step="0.01" placeholder="0,00" class="finput" />
                    </div>
                  </div>
                  <div v-if="Number(leg.freight_value) > 0" class="mt-2 flex gap-2">
                    <button type="button" @click="leg.freight_status = 'a_receber'"
                      class="flex-1 py-1 rounded-lg text-xs font-bold border transition"
                      :class="leg.freight_status === 'a_receber' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-stone-200'"
                    >A Receber</button>
                    <button type="button" @click="leg.freight_status = 'pago'"
                      class="flex-1 py-1 rounded-lg text-xs font-bold border transition"
                      :class="leg.freight_status === 'pago' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-stone-200'"
                    >Pago</button>
                  </div>
                </div>
              </div>
              <button type="button" @click="addFormLeg"
                class="w-full py-2 border-2 border-dashed border-stone-200 rounded-lg text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-1.5"
              >
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Adicionar Trecho
              </button>
            </div>

            <!-- Observações -->
            <div>
              <label class="flabel">Observações</label>
              <textarea v-model="form.obs" placeholder="Notas adicionais..." rows="2" class="finput resize-none" />
            </div>

            <p v-if="formError" class="text-red-500 text-xs">{{ formError }}</p>

            <div class="pt-2 flex justify-between items-center">
              <button @click="showForm = false" class="px-4 py-2 bg-transparent border border-stone-200 rounded-lg text-stone-600 text-xs font-semibold cursor-pointer">Cancelar</button>
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
        <div class="glass-strong rounded-xl w-[1000px] max-h-[92vh] overflow-y-auto">
          <div v-if="detailLoading" class="flex items-center justify-center py-16 text-slate-400 text-sm">Carregando detalhes...</div>

          <template v-else-if="detailTrip">
            <!-- Header -->
            <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="m-0 text-[15px] font-bold text-white">{{ detailTrip.origin }} → {{ detailTrip.destination }}</h3>
                  <p class="mt-1 mb-0 text-xs text-slate-400">
                    {{ detailTrip.driver_name }}
                    · {{ fmtDate(detailTrip.start_date) }}
                    <template v-if="detailTrip.end_date"> → {{ fmtDate(detailTrip.end_date) }}</template>
                    <template v-if="detailTrip.truck_plate"> · {{ detailTrip.truck_plate }}</template>
                    <template v-if="detailTrip.trailer_plate"> · {{ detailTrip.trailer_plate }}</template>
                    <template v-if="detailTrip.trailer_plate_2"> / {{ detailTrip.trailer_plate_2 }}</template>
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="printTrip" title="Imprimir viagem" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                    Imprimir
                  </button>
                  <button @click="showDetail = false" class="text-slate-400 hover:text-white">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="p-6">

              <!-- ── Trechos da Rota ── -->
              <div class="mb-5">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-2">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>
                    Trechos da Rota
                    <span class="text-[10px] font-normal text-slate-400">({{ detailTrip.legs?.length || 0 }} trechos)</span>
                  </h4>
                  <button @click="openAddLeg" class="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
                    <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    Novo Trecho
                  </button>
                </div>

                <!-- Timeline de trechos -->
                <div v-if="detailTrip.legs?.length" class="relative">
                  <!-- Linha vertical conectora -->
                  <div class="absolute left-[11px] top-5 bottom-5 w-0.5 bg-slate-200" />
                  <div class="space-y-0">
                    <!-- Ponto de origem -->
                    <div class="flex items-start gap-3 mb-1">
                      <div class="w-6 h-6 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center z-10">
                        <div class="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div class="pt-0.5">
                        <div class="text-xs font-bold text-blue-700">{{ detailTrip.origin }}</div>
                        <div class="text-[10px] text-slate-400">Saída · {{ detailTrip.start_date ? fmtDate(detailTrip.start_date) : '—' }}</div>
                      </div>
                    </div>

                    <!-- Cada trecho -->
                    <div v-for="(leg, i) in detailTrip.legs" :key="leg.id" class="flex items-start gap-3 mb-1">
                      <div class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10 mt-0.5"
                        :class="i === detailTrip.legs.length - 1 && leg.destination === detailTrip.origin ? 'bg-green-500' : 'bg-slate-400'"
                      >
                        <div class="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div class="flex-1 rounded-lg px-3 py-2 bg-stone-50 border border-stone-100">
                        <div class="flex items-center justify-between">
                          <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold text-slate-800">→ {{ leg.destination }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">
                              <span v-if="leg.departure_date">Saída {{ fmtDate(leg.departure_date) }}</span>
                              <span v-if="leg.arrival_date"> · Chegada {{ fmtDate(leg.arrival_date) }}</span>
                              <span v-if="leg.cargo"> · {{ leg.cargo }}</span>
                              <span v-if="leg.km_start && leg.km_end"> · {{ (Number(leg.km_end) - Number(leg.km_start)).toLocaleString('pt-BR') }} km</span>
                            </div>
                            <div v-if="leg.freight_value > 0" class="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span class="text-[10px] font-extrabold text-stone-600">R$ {{ fmt(leg.freight_value) }}</span>
                              <span v-if="leg.client" class="text-[10px] text-slate-500">· {{ leg.client }}</span>
                              <span
                                class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                :class="leg.freight_status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                              >{{ leg.freight_status === 'pago' ? 'Pago' : 'A receber' }}</span>
                            </div>
                          </div>
                          <div class="flex gap-1 ml-2">
                            <button @click="openEditLeg(leg)" class="text-slate-400 hover:text-blue-600 p-1" title="Editar trecho">
                              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                            <button @click="deleteLeg(leg)" class="text-slate-400 hover:text-red-600 p-1" title="Remover trecho">
                              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-4 text-xs text-slate-400 rounded-lg bg-stone-50 border border-dashed border-stone-200">
                  Nenhum trecho adicionado. Clique em "Novo Trecho" para registrar o percurso.
                </div>

                <!-- Form de trecho inline -->
                <div v-if="showLegForm" class="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div class="text-xs font-bold text-blue-700 mb-3">{{ editingLeg ? 'Editar Trecho' : 'Adicionar Trecho' }}</div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="flabel">De (origem) *</label>
                      <input v-model="legForm.origin" placeholder="Ex: São Paulo/SP" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Para (destino) *</label>
                      <input v-model="legForm.destination" placeholder="Ex: Florianópolis/SC" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Data de Saída</label>
                      <input v-model="legForm.departure_date" type="date" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Data de Chegada</label>
                      <input v-model="legForm.arrival_date" type="date" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">KM Saída</label>
                      <input v-model="legForm.km_start" type="number" placeholder="0" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">KM Chegada</label>
                      <input v-model="legForm.km_end" type="number" placeholder="0" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Carga</label>
                      <input v-model="legForm.cargo" placeholder="Ex: Cimento" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Obs</label>
                      <input v-model="legForm.obs" placeholder="Informações adicionais" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Cliente (frete)</label>
                      <input v-model="legForm.client" placeholder="Ex: Empresa XYZ" class="finput" />
                    </div>
                    <div>
                      <label class="flabel">Valor do Frete (R$)</label>
                      <input v-model="legForm.freight_value" type="number" min="0" step="0.01" placeholder="0,00" class="finput" />
                    </div>
                  </div>
                  <div v-if="Number(legForm.freight_value) > 0" class="mt-3 flex gap-2">
                    <button
                      type="button"
                      @click="legForm.freight_status = 'a_receber'"
                      class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition"
                      :class="legForm.freight_status === 'a_receber' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-stone-200'"
                    >A Receber</button>
                    <button
                      type="button"
                      @click="legForm.freight_status = 'pago'"
                      class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition"
                      :class="legForm.freight_status === 'pago' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-stone-200'"
                    >Pago</button>
                  </div>
                  <div class="flex gap-2 mt-3">
                    <button @click="showLegForm = false; editingLeg = null" class="px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-slate-500">Cancelar</button>
                    <button
                      @click="saveLeg"
                      :disabled="!legForm.origin || !legForm.destination || legSaving"
                      class="btn-p !py-1.5 !px-4 !text-xs"
                    >
                      {{ legSaving ? 'Salvando...' : (editingLeg ? 'Salvar Trecho' : 'Adicionar Trecho') }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- KPIs da viagem -->
              <div class="grid grid-cols-4 gap-3 mb-5">
                <div class="rounded-lg p-3 bg-stone-50 text-center">
                  <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Distância</div>
                  <div class="text-lg font-extrabold text-stone-800">{{ detailTrip.distance > 0 ? fmtInt(detailTrip.distance) + ' km' : '—' }}</div>
                </div>
                <div class="rounded-lg p-3 bg-stone-50 text-center">
                  <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Média Diesel</div>
                  <div class="text-lg font-extrabold" :class="detailTrip.avg_consumption ? 'text-green-700' : 'text-slate-400'">
                    {{ detailTrip.avg_consumption ? detailTrip.avg_consumption + ' km/L' : '—' }}
                  </div>
                </div>
                <div class="rounded-lg p-3 bg-stone-50 text-center">
                  <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Frete<span v-if="detailTrip.legs?.length" class="ml-1 text-blue-500">({{ detailTrip.legs.length }} trechos)</span>
                  </div>
                  <div class="text-lg font-extrabold text-stone-800">
                    {{ detailTrip.revenue > 0 ? 'R$ ' + fmt(detailTrip.revenue) : '—' }}
                  </div>
                  <template v-if="detailTrip.legs?.length">
                    <span v-if="detailTrip.legs_freight_pending > 0" class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 mr-1">
                      A receber R$ {{ fmt(detailTrip.legs_freight_pending) }}
                    </span>
                    <span v-if="detailTrip.legs_freight_received > 0" class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                      Pago R$ {{ fmt(detailTrip.legs_freight_received) }}
                    </span>
                  </template>
                </div>
                <div class="rounded-lg p-3 text-center" :class="detailTrip.profit >= 0 ? 'bg-green-50' : 'bg-red-50'">
                  <div class="text-[10px] font-bold uppercase mb-1" :class="detailTrip.profit >= 0 ? 'text-green-700' : 'text-red-700'">Lucro</div>
                  <div class="text-lg font-extrabold" :class="detailTrip.profit >= 0 ? 'text-green-700' : 'text-red-600'">
                    R$ {{ fmt(detailTrip.profit) }}
                  </div>
                </div>
              </div>


              <!-- Breakdown -->
              <div class="grid grid-cols-2 gap-4">
                <!-- Combustível -->
                <div>
                  <h4 class="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    Combustível
                    <span class="text-[10px] font-normal text-slate-400">({{ regularFuelRecords.length }} abastecimentos)</span>
                  </h4>
                  <div v-if="regularFuelRecords.length" class="space-y-1.5 max-h-[180px] overflow-y-auto">
                    <div v-for="f in regularFuelRecords" :key="f.id" class="flex justify-between text-xs rounded px-3 py-2 bg-stone-50">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-stone-600">{{ fmtDate(f.fuel_date) }} — {{ f.liters }}L @ R${{ Number(f.price_liter).toFixed(3) }}</span>
                        <div class="flex gap-2">
                          <span v-if="f.vehicle_plate" class="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{{ f.vehicle_plate }}</span>
                          <span v-if="f.fuel_type" class="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{{ f.fuel_type }}</span>
                          <span v-if="f.station" class="text-[10px] text-slate-400">{{ f.station }}</span>
                        </div>
                      </div>
                      <span class="font-bold text-stone-600 self-start">R$ {{ fmt(f.total) }}</span>
                    </div>
                  </div>
                  <div v-else class="text-xs text-slate-400 py-2">Nenhum abastecimento no período</div>
                  <div v-if="detailTrip.fuel_total > 0" class="text-xs font-extrabold text-stone-800 mt-2 text-right">
                    Total: R$ {{ fmt(detailTrip.fuel_total) }} · {{ Number(detailTrip.fuel_liters).toLocaleString('pt-BR') }} L
                  </div>

                  <!-- Thermo King separado -->
                  <template v-if="thermoKingRecords.length">
                    <h4 class="text-xs font-bold text-slate-800 mt-3 mb-2 flex items-center gap-1.5">
                      ❄️ Diesel Termo King
                      <span class="text-[10px] font-normal text-slate-400">(câmara fria)</span>
                    </h4>
                    <div class="space-y-1.5 max-h-[140px] overflow-y-auto">
                      <div v-for="f in thermoKingRecords" :key="f.id" class="flex justify-between text-xs rounded px-3 py-2 bg-cyan-50 border border-cyan-100">
                        <div class="flex flex-col gap-0.5">
                          <span class="text-stone-600">{{ fmtDate(f.fuel_date) }} — {{ f.liters }}L @ R${{ Number(f.price_liter).toFixed(3) }}</span>
                          <div class="flex gap-2">
                            <span v-if="f.vehicle_plate" class="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{{ f.vehicle_plate }}</span>
                            <span v-if="f.station" class="text-[10px] text-slate-400">{{ f.station }}</span>
                          </div>
                        </div>
                        <span class="font-bold text-cyan-700 self-start">R$ {{ fmt(f.total) }}</span>
                      </div>
                    </div>
                    <div class="text-xs font-extrabold text-cyan-800 mt-2 text-right">
                      Total TK: R$ {{ fmt(detailTrip.thermo_king_total) }} · {{ Number(detailTrip.thermo_king_liters).toLocaleString('pt-BR') }} L
                    </div>
                  </template>
                </div>

                <!-- Despesas -->
                <div>
                  <h4 class="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    Despesas
                    <span class="text-[10px] font-normal text-slate-400">({{ detailTrip.payable_expenses?.length || 0 }} registros)</span>
                  </h4>
                  <div v-if="detailTrip.payable_expenses?.length" class="space-y-1.5 max-h-[180px] overflow-y-auto">
                    <div v-for="e in detailTrip.payable_expenses" :key="e.id"
                      class="flex justify-between items-center text-xs bg-orange-50 border border-orange-100 rounded px-3 py-2">
                      <div>
                        <span class="font-medium text-stone-600">{{ e.description || e.category }}</span>
                        <span class="text-slate-400 ml-1">· {{ e.driver_name || '—' }}</span>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-slate-800">R$ {{ fmt(e.value) }}</div>
                        <div class="text-[10px]" :class="e.status === 'pago' ? 'text-green-600' : 'text-amber-600'">
                          {{ e.status === 'pago' ? 'Pago' : 'Pendente' }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-xs text-slate-400 py-2">Nenhuma despesa lançada</div>
                  <div v-if="detailTrip.payable_expenses_total > 0" class="text-xs font-extrabold text-stone-800 mt-2 text-right">
                    Total: R$ {{ fmt(detailTrip.payable_expenses_total) }}
                  </div>
                </div>
              </div>

              <!-- Observações -->
              <div v-if="detailTrip.obs" class="mt-4 rounded-lg px-4 py-3 bg-stone-50 text-xs text-stone-600">
                <span class="font-bold text-slate-500 uppercase text-[10px]">Obs:</span> {{ detailTrip.obs }}
              </div>

              <!-- Resumo final -->
              <div class="mt-5 pt-4 border-t border-stone-100 grid grid-cols-3 gap-3 text-center">
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

  <!-- ── Área de impressão da viagem ── -->
  <Teleport to="body">
    <div v-if="printingTrip" class="trip-print-page">

      <div class="print-logo-header">
        <img src="/logo-triunfo.png" class="print-logo-img" />
        <div>
          <div class="print-logo-name">Transportadora Triunfo</div>
          <div class="print-logo-sub">Relatório de Viagem</div>
        </div>
        <div class="print-logo-date">Emitido em {{ today }}</div>
      </div>

      <div class="trip-print-title">
        <h2>{{ printingTrip.origin }} → {{ printingTrip.destination }}</h2>
        <div class="trip-print-meta">
          <span><strong>Motorista:</strong> {{ printingTrip.driver_name }}</span>
          <span><strong>Período:</strong> {{ fmtDate(printingTrip.start_date) }}{{ printingTrip.end_date ? ' → ' + fmtDate(printingTrip.end_date) : '' }}</span>
          <span v-if="printingTrip.truck_plate"><strong>Cavalo:</strong> {{ printingTrip.truck_plate }}</span>
          <span v-if="printingTrip.trailer_plate"><strong>Carreta:</strong> {{ printingTrip.trailer_plate }}{{ printingTrip.trailer_plate_2 ? ' / ' + printingTrip.trailer_plate_2 : '' }}</span>
        </div>
      </div>

      <div class="trip-print-kpis">
        <div><span>Distância</span><strong>{{ printingTrip.distance > 0 ? fmtInt(printingTrip.distance) + ' km' : '—' }}</strong></div>
        <div><span>Km/L</span><strong>{{ printingTrip.avg_consumption ? printingTrip.avg_consumption + ' km/L' : '—' }}</strong></div>
        <div><span>Combustível</span><strong>R$ {{ fmt(printingTrip.fuel_total) }}</strong></div>
        <div><span>Despesas</span><strong>R$ {{ fmt(printingTrip.payable_expenses_total) }}</strong></div>
        <div><span>Frete</span><strong>R$ {{ fmt(printingTrip.revenue) }}</strong></div>
        <div class="trip-print-kpi-lucro" :class="printingTrip.profit >= 0 ? 'lucro-pos' : 'lucro-neg'">
          <span>Lucro</span>
          <strong>{{ printingTrip.profit >= 0 ? '+' : '' }}R$ {{ fmt(printingTrip.profit) }}</strong>
        </div>
      </div>

      <!-- Trechos -->
      <template v-if="printingTrip.legs?.length">
        <h3 class="trip-print-section">Trechos da Rota</h3>
        <table>
          <thead>
            <tr>
              <th>Origem</th><th>Destino</th><th>Carga</th><th>Saída</th><th>Chegada</th><th>Cliente</th><th>Frete</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leg in printingTrip.legs" :key="leg.id">
              <td>{{ leg.origin }}</td>
              <td>{{ leg.destination }}</td>
              <td>{{ leg.cargo || '—' }}</td>
              <td>{{ leg.departure_date ? fmtDate(leg.departure_date) : '—' }}</td>
              <td>{{ leg.arrival_date ? fmtDate(leg.arrival_date) : '—' }}</td>
              <td>{{ leg.client || '—' }}</td>
              <td>{{ leg.freight_value > 0 ? 'R$ ' + fmt(leg.freight_value) : '—' }}</td>
              <td>{{ leg.freight_status === 'pago' ? 'Pago' : leg.freight_status === 'a_receber' ? 'A receber' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- Combustível: lado a lado quando tem TK -->
      <div style="display:flex; gap:12px; align-items:flex-start">
        <!-- Combustível (sem Thermo King) -->
        <div v-if="printingTrip.fuel_records?.filter(f => f.fuel_type !== 'Diesel Termo King').length" :style="printingTrip.fuel_records?.filter(f => f.fuel_type === 'Diesel Termo King').length ? 'flex:1' : 'flex:1'">
          <h3 class="trip-print-section">Combustível</h3>
          <table>
            <thead>
              <tr><th>Data</th><th>Placa</th><th>Tipo</th><th>Litros</th><th>Preço/L</th><th>Posto</th><th>Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="f in printingTrip.fuel_records.filter(f => f.fuel_type !== 'Diesel Termo King')" :key="f.id">
                <td>{{ fmtDate(f.fuel_date) }}</td>
                <td>{{ f.vehicle_plate || '—' }}</td>
                <td>{{ f.fuel_type || '—' }}</td>
                <td>{{ Number(f.liters).toFixed(2) }} L</td>
                <td>R$ {{ Number(f.price_liter).toFixed(3) }}</td>
                <td>{{ f.station || '—' }}</td>
                <td><strong>R$ {{ fmt(f.total) }}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="6"><strong>Total Combustível</strong></td><td><strong>R$ {{ fmt(printingTrip.fuel_total) }}</strong></td></tr>
            </tfoot>
          </table>
        </div>

        <!-- Diesel Termo King (câmara fria) -->
        <div v-if="printingTrip.fuel_records?.filter(f => f.fuel_type === 'Diesel Termo King').length" style="flex:0 0 38%">
          <h3 class="trip-print-section">❄️ Diesel Termo King</h3>
          <table>
            <thead>
              <tr><th>Litros</th><th>Preço/L</th><th>Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="f in printingTrip.fuel_records.filter(f => f.fuel_type === 'Diesel Termo King')" :key="f.id">
                <td>{{ Number(f.liters).toFixed(2) }} L</td>
                <td>R$ {{ Number(f.price_liter).toFixed(3) }}</td>
                <td><strong>R$ {{ fmt(f.total) }}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="2"><strong>Total TK</strong></td><td><strong>R$ {{ fmt(printingTrip.thermo_king_total) }}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Despesas -->
      <template v-if="printingTrip.payable_expenses?.length">
        <h3 class="trip-print-section">Despesas (Contas a Pagar)</h3>
        <table>
          <thead>
            <tr><th>Descrição</th><th>Categoria</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="e in printingTrip.payable_expenses" :key="e.id">
              <td>{{ e.description || '—' }}</td>
              <td>{{ e.category || '—' }}</td>
              <td>{{ e.supplier_name || '—' }}</td>
              <td>{{ e.due_date ? fmtDate(e.due_date) : '—' }}</td>
              <td><strong>R$ {{ fmt(e.value) }}</strong></td>
              <td>{{ e.status === 'pago' ? 'Pago' : 'Pendente' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td colspan="4"><strong>Total Despesas</strong></td><td><strong>R$ {{ fmt(printingTrip.payable_expenses_total) }}</strong></td></tr>
          </tfoot>
        </table>
      </template>

      <!-- Resumo financeiro -->
      <div class="trip-print-summary">
        <div class="trip-print-summary-row" style="font-weight:700">
          <span>Frete / Receita Total</span><span>+ R$ {{ fmt(printingTrip.revenue) }}</span>
        </div>
        <template v-for="leg in (printingTrip.legs || [])" :key="'sum-leg-'+leg.id">
          <div v-if="leg.freight_value > 0" class="trip-print-summary-row" style="padding-left:18px; font-size:8.5px; color:#64748b">
            <span>{{ leg.origin }} → {{ leg.destination }}</span><span>R$ {{ fmt(leg.freight_value) }}</span>
          </div>
        </template>
        <div class="trip-print-summary-row">
          <span>Combustível</span><span>— R$ {{ fmt(printingTrip.fuel_total) }}</span>
        </div>
        <div v-if="printingTrip.thermo_king_total > 0" class="trip-print-summary-row">
          <span>Diesel Termo King</span><span>— R$ {{ fmt(printingTrip.thermo_king_total) }}</span>
        </div>
        <div class="trip-print-summary-row">
          <span>Despesas</span><span>— R$ {{ fmt(printingTrip.payable_expenses_total) }}</span>
        </div>
        <div class="trip-print-summary-row trip-print-result" :class="printingTrip.profit >= 0 ? 'result-pos' : 'result-neg'">
          <span>Resultado</span>
          <span>{{ printingTrip.profit >= 0 ? '+' : '' }}R$ {{ fmt(printingTrip.profit) }}</span>
        </div>
      </div>

      <div v-if="printingTrip.obs" class="trip-print-obs">
        <strong>Observações:</strong> {{ printingTrip.obs }}
      </div>

    </div>
  </Teleport>
</template>
