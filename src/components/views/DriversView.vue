<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import { api } from '../../composables/useApi'

const { drivers, loading, fetchAll, fetchOne } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()

const dSort = ref('tires-desc')
const dFilter = ref('all')
const selectedDriver = ref(null)

// ── Novo / Editar motorista
const showNewModal = ref(false)
const newForm = ref({ name: '', color: '#2563eb', phone: '', cpf: '' })
const newSaving = ref(false)
const newError = ref('')
const editingDriver = ref(null)
const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#f59e0b','#10b981','#6366f1','#ec4899','#f97316','#14b8a6']

function openEditDriver(d) {
  editingDriver.value = d
  newForm.value = { name: d.name, color: d.color || '#2563eb', phone: d.phone || '', cpf: d.cpf || '' }
  newError.value = ''
  showNewModal.value = true
}

async function saveNewDriver() {
  if (!newForm.value.name.trim()) { newError.value = 'Nome obrigatório'; return }
  newSaving.value = true
  newError.value = ''
  try {
    if (editingDriver.value) {
      await api.put(`/drivers/${editingDriver.value.id}`, newForm.value)
    } else {
      await api.post('/drivers', newForm.value)
    }
    await fetchAll()
    showNewModal.value = false
    editingDriver.value = null
    newForm.value = { name: '', color: '#2563eb', phone: '', cpf: '' }
  } catch (e) {
    newError.value = e.message || 'Erro ao salvar'
  } finally {
    newSaving.value = false
  }
}

// ── Trocar veículos
const showVehicleModal = ref(false)
const vehicleForm = ref({ truck_id: '', trailer_id: '', trailer_type: '' })
const vehicleSaving = ref(false)
const vehicleError = ref('')

const trucks   = computed(() => vehicles.value.filter(v => v.type === 'truck'))
const trailers = computed(() => vehicles.value.filter(v => v.type === 'trailer'))

const TRAILER_TYPES = ['Carreta', '9 Eixos', 'Frigorifica', 'Caçamba', 'Cavalo DAF']

function openVehicleModal(driver) {
  vehicleForm.value = {
    truck_id:     trucks.value.find(t => t.plate === driver.truck_plate)?.id || '',
    trailer_id:   trailers.value.find(t => t.plate === driver.trailer_plate)?.id || '',
    trailer_type: driver.trailer_type || '',
  }
  vehicleError.value = ''
  showVehicleModal.value = true
}

async function saveVehicles() {
  vehicleSaving.value = true
  vehicleError.value = ''
  try {
    await api.patch(`/drivers/${selectedDriver.value.id}/vehicles`, {
      truck_id:     vehicleForm.value.truck_id   || null,
      trailer_id:   vehicleForm.value.trailer_id || null,
      trailer_type: vehicleForm.value.trailer_type || null,
    })
    await fetchAll()
    const updated = await fetchOne(selectedDriver.value.id)
    selectedDriver.value = updated
    showVehicleModal.value = false
  } catch (e) {
    vehicleError.value = e.message || 'Erro ao atualizar'
  } finally {
    vehicleSaving.value = false
  }
}

// ── Ordenação / filtro
const sortedDrivers = computed(() => {
  let list = [...drivers.value]
  if (dFilter.value === 'carreta')     list = list.filter(d => ['Carreta', '9 Eixos', 'Caçamba'].includes(d.trailer_type))
  else if (dFilter.value === 'frigorifico') list = list.filter(d => d.trailer_type === 'Frigorifica')
  else if (dFilter.value === 'daf')    list = list.filter(d => d.trailer_type === 'Cavalo DAF')
  if (dSort.value === 'tires-desc')    list.sort((a, b) => b.total_tires - a.total_tires)
  else if (dSort.value === 'tires-asc') list.sort((a, b) => a.total_tires - b.total_tires)
  else if (dSort.value === 'name')     list.sort((a, b) => a.name.localeCompare(b.name))
  return list
})

async function selectDriver(d) {
  const detail = await fetchOne(d.id)
  selectedDriver.value = detail
}

onMounted(() => {
  fetchAll()
  fetchVehicles()
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">
      Carregando motoristas...
    </div>

    <template v-else>
      <!-- Filters + Novo -->
      <div class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex justify-between items-center flex-wrap gap-2.5">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
          <button class="sbtn" :class="{ on: dSort === 'tires-desc' }" @click="dSort = 'tires-desc'">↓ Mais pneus</button>
          <button class="sbtn" :class="{ on: dSort === 'tires-asc' }" @click="dSort = 'tires-asc'">↑ Menos pneus</button>
          <button class="sbtn" :class="{ on: dSort === 'name' }" @click="dSort = 'name'">A–Z Nome</button>
          <div class="w-px h-5 bg-stone-200" />
          <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
          <button class="sbtn" :class="{ on: dFilter === 'all' }" @click="dFilter = 'all'">Todos</button>
          <button class="sbtn" :class="{ on: dFilter === 'carreta' }" @click="dFilter = 'carreta'">Carreta</button>
          <button class="sbtn" :class="{ on: dFilter === 'frigorifico' }" @click="dFilter = 'frigorifico'">Frigorífica</button>
          <button class="sbtn" :class="{ on: dFilter === 'daf' }" @click="dFilter = 'daf'">DAF</button>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="text-xs text-slate-400">
            <strong class="text-stone-800">{{ sortedDrivers.length }}</strong> motoristas &nbsp;·&nbsp;
            <strong class="text-stone-800">{{ sortedDrivers.reduce((s, d) => s + Number(d.total_tires), 0) }}</strong> pneus
          </div>
          <button
            @click="showNewModal = true"
            class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Novo Motorista
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="glass rounded-xl overflow-hidden">
        <div class="grid grid-cols-[2fr_1fr_1fr_80px_1fr_110px_90px] gap-2 px-[18px] py-2.5 border-b border-stone-200">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motorista</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Cavalo</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Carreta / Reboque</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pneus</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Consumo relativo</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Ações</div>
        </div>
        <div
          v-for="d in sortedDrivers"
          :key="d.id"
          @click="selectDriver(d)"
          class="grid grid-cols-[2fr_1fr_1fr_80px_1fr_110px_90px] gap-2 px-[18px] py-3 border-b border-stone-100 items-center cursor-pointer transition-colors hover:bg-stone-50"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
              :style="{ background: `${d.color || '#2563eb'}22`, color: d.color || '#2563eb' }"
            >
              {{ d.name[0] }}
            </div>
            <div>
              <div class="font-bold text-stone-800 text-[13.5px]">{{ d.name }}</div>
              <div class="text-[10.5px] text-slate-400">{{ d.trailer_type || '—' }}</div>
            </div>
          </div>
          <div>
            <span v-if="d.truck_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-[3px] rounded-[5px]">{{ d.truck_plate }}</span>
            <span v-else class="text-slate-400 text-xs">—</span>
          </div>
          <div>
            <span v-if="d.trailer_plate" class="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-[3px] rounded-[5px]">{{ d.trailer_plate }}</span>
            <span v-else class="text-slate-400 text-xs">—</span>
          </div>
          <div class="text-2xl font-extrabold text-stone-800">{{ d.total_tires }}</div>
          <div class="pr-3">
            <div class="pbg">
              <div
                class="pfill"
                :style="{
                  width: `${Math.min((d.total_tires / 24) * 100, 100)}%`,
                  background: d.total_tires >= 20 ? '#ef4444' : d.total_tires >= 12 ? '#f59e0b' : '#10b981'
                }"
              />
            </div>
            <div class="text-[10px] text-slate-400 mt-[3px]">{{ Math.round((d.total_tires / 24) * 100) }}% do máximo</div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-green-100 text-green-600">● Ativo</span>
            <svg width="15" height="15" fill="#94a3b8" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="flex items-center justify-center gap-1.5">
            <button
              @click.stop="selectDriver(d)"
              title="Visualizar"
              class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors"
            >
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </button>
            <button
              @click.stop="openEditDriver(d)"
              title="Editar motorista"
              class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors"
            >
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
          </div>
        </div>
        <div v-if="!sortedDrivers.length" class="text-center text-slate-400 text-xs py-10">Nenhum motorista encontrado</div>
      </div>
    </template>

    <!-- ───── Slide Panel ───── -->
    <Teleport to="body">
      <div v-if="selectedDriver" class="fixed inset-0 z-[70]">
        <div class="absolute inset-0 bg-black/30" @click="selectedDriver = null" />
        <div class="slide-panel">
          <!-- Header colorido -->
          <div class="p-6 relative" :style="{ background: `linear-gradient(135deg, ${selectedDriver.color || '#2563eb'}, ${selectedDriver.color || '#2563eb'}dd)` }">
            <button @click="selectedDriver = null" class="absolute top-4 right-4 text-stone-600 hover:text-white">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-extrabold text-white">{{ selectedDriver.name[0] }}</div>
              <div>
                <h2 class="m-0 text-lg font-extrabold text-white">{{ selectedDriver.name }}</h2>
                <p class="m-0 text-sm text-stone-600">{{ selectedDriver.trailer_type || '—' }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Cavalo</div>
                <div class="text-white font-extrabold text-sm">{{ selectedDriver.truck_plate || '—' }}</div>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Carreta</div>
                <div class="text-white font-extrabold text-sm">{{ selectedDriver.trailer_plate || '—' }}</div>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Pneus</div>
                <div class="text-white font-extrabold text-2xl">{{ selectedDriver.total_tires ?? 0 }}</div>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Custo Est.</div>
                <div class="text-white font-extrabold text-sm">R$ {{ ((selectedDriver.total_tires ?? 0) * 1246).toLocaleString('pt-BR') }}</div>
              </div>
            </div>
            <!-- Botão trocar veículos -->
            <button
              @click="openVehicleModal(selectedDriver)"
              class="mt-4 w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 12h10v2H7zm0-4h10v2H7zm0 8h7v2H7z"/></svg>
              Trocar Veículos Vinculados
            </button>
          </div>

          <!-- Histórico de Pneus -->
          <div class="p-5 overflow-y-auto flex-1">
            <h4 class="m-0 mb-3 text-sm font-bold text-stone-800">Histórico de Pneus</h4>
            <div v-if="selectedDriver.tireHistory && selectedDriver.tireHistory.length > 0">
              <div v-for="(h, i) in selectedDriver.tireHistory" :key="h.id" class="flex items-center gap-3 py-2.5 border-b border-stone-100">
                <div class="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0" :style="{ background: `${selectedDriver.color || '#2563eb'}22`, color: selectedDriver.color || '#2563eb' }">
                  {{ selectedDriver.tireHistory.length - i }}
                </div>
                <div class="flex-1">
                  <div class="text-xs font-semibold text-stone-800">{{ h.brand || h.type || 'Pneu' }}</div>
                  <div class="text-[10px] text-slate-400">{{ h.vehicle_plate || '—' }}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-extrabold text-stone-800">{{ h.qty }} un</div>
                  <div class="text-[10px] text-slate-400">{{ h.assigned_at?.split('T')[0] || '—' }}</div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 text-center py-8">Nenhum histórico registrado</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ───── Modal Novo Motorista ───── -->
    <Teleport to="body">
      <div v-if="showNewModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showNewModal = false" />
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 class="text-base font-bold text-stone-800 m-0">{{ editingDriver ? 'Editar Motorista' : 'Novo Motorista' }}</h3>
            <button @click="showNewModal = false; editingDriver = null; newForm = { name: '', color: '#2563eb', phone: '', cpf: '' }" class="text-slate-400 hover:text-stone-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Nome -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Nome *</label>
              <input
                v-model="newForm.name"
                type="text"
                placeholder="Ex: JOÃO SILVA"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                @input="newForm.name = newForm.name.toUpperCase()"
              />
            </div>
            <!-- Telefone -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Telefone</label>
              <input
                v-model="newForm.phone"
                type="text"
                placeholder="(00) 00000-0000"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <!-- CPF -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">CPF</label>
              <input
                v-model="newForm.cpf"
                type="text"
                placeholder="000.000.000-00"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <!-- Cor -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-2">Cor de identificação</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in COLORS"
                  :key="c"
                  @click="newForm.color = c"
                  class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  :style="{ background: c, borderColor: newForm.color === c ? '#1e293b' : 'transparent' }"
                />
              </div>
              <div class="mt-2 flex items-center gap-2">
                <div class="w-8 h-8 rounded-full border border-stone-200 flex-shrink-0" :style="{ background: newForm.color }" />
                <span class="text-xs text-slate-500">Prévia: {{ newForm.name || 'Nome' }}</span>
              </div>
            </div>
            <p v-if="newError" class="text-red-500 text-xs">{{ newError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="showNewModal = false; editingDriver = null; newForm = { name: '', color: '#2563eb', phone: '', cpf: '' }" class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50">
              Cancelar
            </button>
            <button
              @click="saveNewDriver"
              :disabled="newSaving"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ newSaving ? 'Salvando...' : editingDriver ? 'Salvar Alterações' : 'Cadastrar Motorista' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ───── Modal Trocar Veículos ───── -->
    <Teleport to="body">
      <div v-if="showVehicleModal" class="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showVehicleModal = false" />
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-stone-100">
            <div>
              <h3 class="text-base font-bold text-stone-800 m-0">Trocar Veículos</h3>
              <p class="text-xs text-slate-400 m-0">{{ selectedDriver?.name }}</p>
            </div>
            <button @click="showVehicleModal = false" class="text-slate-400 hover:text-stone-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Cavalo -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">
                <span class="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] mr-1.5">TRUCK</span>
                Cavalo (Caminhão)
              </label>
              <select
                v-model="vehicleForm.truck_id"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sem cavalo —</option>
                <option v-for="t in trucks" :key="t.id" :value="t.id">
                  {{ t.plate }} — {{ t.brand }} {{ t.model }}
                </option>
              </select>
            </div>
            <!-- Carreta -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">
                <span class="font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded text-[10px] mr-1.5">TRAILER</span>
                Carreta / Reboque
              </label>
              <select
                v-model="vehicleForm.trailer_id"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sem carreta —</option>
                <option v-for="t in trailers" :key="t.id" :value="t.id">
                  {{ t.plate }} — {{ t.brand }} {{ t.model }}
                </option>
              </select>
            </div>
            <!-- Tipo -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Tipo de operação</label>
              <select
                v-model="vehicleForm.trailer_type"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selecione —</option>
                <option v-for="tp in TRAILER_TYPES" :key="tp" :value="tp">{{ tp }}</option>
              </select>
            </div>
            <p v-if="vehicleError" class="text-red-500 text-xs">{{ vehicleError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="showVehicleModal = false" class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50">
              Cancelar
            </button>
            <button
              @click="saveVehicles"
              :disabled="vehicleSaving"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ vehicleSaving ? 'Salvando...' : 'Confirmar Troca' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
