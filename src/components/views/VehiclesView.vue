<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVehicles } from '../../composables/useVehicles'
import { api } from '../../composables/useApi'

const props = defineProps({ showToast: Function })

const { vehicles, loading, fetchAll, remove } = useVehicles()

const vFilter = ref('all')
const vSort = ref('plate')

// ── Novo / Editar veículo
const showNewModal = ref(false)
const newForm = ref({ plate: '', type: 'truck', brand: '', model: '', year: '', color: '', renavam: '' })
const newSaving = ref(false)
const newError = ref('')
const editingVehicle = ref(null)
const viewingVehicle = ref(null)

async function deleteVehicle(v) {
  if (!confirm(`Excluir veículo ${v.plate}?`)) return
  try {
    await remove(v.id)
    props.showToast?.('Veículo excluído')
  } catch {
    props.showToast?.('❌ Erro ao excluir veículo')
  }
}

function openEditVehicle(v) {
  editingVehicle.value = v
  newForm.value = { plate: v.plate, type: v.type, brand: v.brand || '', model: v.model || '', year: v.year || '', color: v.color || '', renavam: v.renavam || '' }
  newError.value = ''
  showNewModal.value = true
}

const filteredVehicles = computed(() => {
  let list = [...vehicles.value]
  if (vFilter.value !== 'all') list = list.filter(v => v.type === vFilter.value)
  if (vSort.value === 'plate') list.sort((a, b) => a.plate.localeCompare(b.plate))
  else if (vSort.value === 'brand') list.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
  else if (vSort.value === 'year-desc') list.sort((a, b) => (b.year || 0) - (a.year || 0))
  return list
})

const countTruck = computed(() => vehicles.value.filter(v => v.type === 'truck').length)
const countTrailer = computed(() => vehicles.value.filter(v => v.type === 'trailer').length)

async function saveNewVehicle() {
  if (!newForm.value.plate.trim()) { newError.value = 'Placa obrigatória'; return }
  newSaving.value = true
  newError.value = ''
  try {
    if (editingVehicle.value) {
      await api.put(`/vehicles/${editingVehicle.value.id}`, newForm.value)
    } else {
      await api.post('/vehicles', newForm.value)
    }
    await fetchAll()
    showNewModal.value = false
    editingVehicle.value = null
    newForm.value = { plate: '', type: 'truck', brand: '', model: '', year: '', color: '', renavam: '' }
  } catch (e) {
    newError.value = e.message || 'Erro ao salvar'
  } finally {
    newSaving.value = false
  }
}

const typeLabel = (t) => t === 'truck' ? 'Cavalo' : 'Carreta'

onMounted(() => fetchAll())
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">
      Carregando veículos...
    </div>

    <template v-else>
      <!-- Filters + Novo -->
      <div class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex justify-between items-center flex-wrap gap-2.5">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
          <button class="sbtn" :class="{ on: vFilter === 'all' }" @click="vFilter = 'all'">Todos</button>
          <button class="sbtn" :class="{ on: vFilter === 'truck' }" @click="vFilter = 'truck'">Cavalos</button>
          <button class="sbtn" :class="{ on: vFilter === 'trailer' }" @click="vFilter = 'trailer'">Carretas</button>
          <div class="w-px h-5 bg-stone-200" />
          <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
          <button class="sbtn" :class="{ on: vSort === 'plate' }" @click="vSort = 'plate'">Placa</button>
          <button class="sbtn" :class="{ on: vSort === 'brand' }" @click="vSort = 'brand'">Marca</button>
          <button class="sbtn" :class="{ on: vSort === 'year-desc' }" @click="vSort = 'year-desc'">↓ Ano</button>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="text-xs text-slate-400">
            <strong class="text-stone-800">{{ filteredVehicles.length }}</strong> veículos &nbsp;·&nbsp;
            <span class="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold">{{ countTruck }} cavalos</span>
            &nbsp;
            <span class="font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded text-[10px] font-bold">{{ countTrailer }} carretas</span>
          </div>
          <button
            @click="showNewModal = true"
            class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Adicionar Veículo
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="glass rounded-xl overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Placa</th>
              <th class="th">Tipo</th>
              <th class="th">Marca</th>
              <th class="th">Modelo</th>
              <th class="th">Ano</th>
              <th class="th">Cor</th>
              <th class="th">Renavam</th>
              <th class="th" style="text-align:center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="v in filteredVehicles" :key="v.id">
              <td class="td">
                <span class="font-mono text-sm font-extrabold text-stone-800">{{ v.plate }}</span>
              </td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :class="v.type === 'truck' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'"
                >
                  {{ typeLabel(v.type) }}
                </span>
              </td>
              <td class="td text-xs font-semibold">{{ v.brand || '—' }}</td>
              <td class="td text-xs">{{ v.model || '—' }}</td>
              <td class="td text-xs">{{ v.year || '—' }}</td>
              <td class="td text-xs">{{ v.color || '—' }}</td>
              <td class="td text-xs font-mono">{{ v.renavam || '—' }}</td>
              <td class="td text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="viewingVehicle = v"
                    title="Visualizar"
                    class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                  <button
                    @click="openEditVehicle(v)"
                    title="Editar"
                    class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button
                    @click="deleteVehicle(v)"
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
        <div v-if="!filteredVehicles.length" class="text-center text-slate-400 text-xs py-10">
          Nenhum veículo cadastrado
        </div>
      </div>
    </template>

    <!-- ───── Modal Adicionar Veículo ───── -->
    <Teleport to="body">
      <div v-if="showNewModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showNewModal = false" />
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 class="text-base font-bold text-stone-800 m-0">{{ editingVehicle ? 'Editar Veículo' : 'Adicionar Veículo' }}</h3>
            <button @click="showNewModal = false; editingVehicle = null" class="text-slate-400 hover:text-stone-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Placa -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Placa *</label>
              <input
                v-model="newForm.plate"
                type="text"
                placeholder="Ex: ABC1234"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                @input="newForm.plate = newForm.plate.toUpperCase()"
              />
            </div>
            <!-- Tipo -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Tipo *</label>
              <div class="flex gap-2">
                <button
                  @click="newForm.type = 'truck'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="newForm.type === 'truck' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-stone-200 text-slate-500 hover:border-slate-300'"
                >
                  🚛 Cavalo
                </button>
                <button
                  @click="newForm.type = 'trailer'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="newForm.type === 'trailer' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-stone-200 text-slate-500 hover:border-slate-300'"
                >
                  🚚 Carreta
                </button>
              </div>
            </div>
            <!-- Marca / Modelo -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Marca</label>
                <input v-model="newForm.brand" type="text" placeholder="Ex: Volvo" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Modelo</label>
                <input v-model="newForm.model" type="text" placeholder="Ex: FH 540" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <!-- Ano / Cor -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Ano</label>
                <input v-model="newForm.year" type="number" placeholder="Ex: 2024" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Cor</label>
                <input v-model="newForm.color" type="text" placeholder="Ex: Branco" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <!-- Renavam -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Renavam</label>
              <input v-model="newForm.renavam" type="text" placeholder="00000000000" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p v-if="newError" class="text-red-500 text-xs">{{ newError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="showNewModal = false; editingVehicle = null" class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50">
              Cancelar
            </button>
            <button
              @click="saveNewVehicle"
              :disabled="newSaving"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ newSaving ? 'Salvando...' : editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Visualizar Veículo -->
    <Teleport to="body">
      <div v-if="viewingVehicle" class="fixed inset-0 z-[90] flex items-center justify-center p-4" @click.self="viewingVehicle = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="viewingVehicle = null" />
        <div class="relative glass-strong rounded-2xl w-full max-w-[480px] overflow-hidden">
          <div class="px-7 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between">
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">Detalhes do Veículo</h3>
              <p class="mt-0.5 mb-0 text-xs text-slate-400">somente leitura</p>
            </div>
            <button @click="viewingVehicle = null" class="text-slate-400 hover:text-white transition-colors">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="px-7 py-6 grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Placa</div>
              <div class="text-xl font-extrabold text-stone-800 font-mono">{{ viewingVehicle.plate }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo</div>
              <span
                class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                :class="viewingVehicle.type === 'truck' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'"
              >
                {{ viewingVehicle.type === 'truck' ? 'Caminhão / Cavalo' : 'Carreta / Reboque' }}
              </span>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Marca</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingVehicle.brand || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Modelo</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingVehicle.model || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ano</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingVehicle.year || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cor</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingVehicle.color || '—' }}</div>
            </div>
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">RENAVAM</div>
              <div class="text-sm font-mono font-semibold text-slate-800">{{ viewingVehicle.renavam || '—' }}</div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button @click="viewingVehicle = null" class="px-5 py-2 bg-stone-100/70 hover:bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
