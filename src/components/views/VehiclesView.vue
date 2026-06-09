<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVehicles } from '../../composables/useVehicles'
import { api } from '../../composables/useApi'

const { vehicles, loading, fetchAll } = useVehicles()

const vFilter = ref('all')
const vSort = ref('plate')

// ── Novo veículo
const showNewModal = ref(false)
const newForm = ref({ plate: '', type: 'truck', brand: '', model: '', year: '', color: '', renavam: '' })
const newSaving = ref(false)
const newError = ref('')

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
    await api.post('/vehicles', newForm.value)
    await fetchAll()
    showNewModal.value = false
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
      <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-3.5 flex justify-between items-center flex-wrap gap-2.5">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
          <button class="sbtn" :class="{ on: vFilter === 'all' }" @click="vFilter = 'all'">Todos</button>
          <button class="sbtn" :class="{ on: vFilter === 'truck' }" @click="vFilter = 'truck'">Cavalos</button>
          <button class="sbtn" :class="{ on: vFilter === 'trailer' }" @click="vFilter = 'trailer'">Carretas</button>
          <div class="w-px h-5 bg-slate-200" />
          <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
          <button class="sbtn" :class="{ on: vSort === 'plate' }" @click="vSort = 'plate'">Placa</button>
          <button class="sbtn" :class="{ on: vSort === 'brand' }" @click="vSort = 'brand'">Marca</button>
          <button class="sbtn" :class="{ on: vSort === 'year-desc' }" @click="vSort = 'year-desc'">↓ Ano</button>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="text-xs text-slate-400">
            <strong class="text-slate-900">{{ filteredVehicles.length }}</strong> veículos &nbsp;·&nbsp;
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
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="v in filteredVehicles" :key="v.id">
              <td class="td">
                <span class="font-mono text-sm font-extrabold text-slate-900">{{ v.plate }}</span>
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
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 m-0">Adicionar Veículo</h3>
            <button @click="showNewModal = false" class="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Placa -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Placa *</label>
              <input
                v-model="newForm.plate"
                type="text"
                placeholder="Ex: ABC1234"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                @input="newForm.plate = newForm.plate.toUpperCase()"
              />
            </div>
            <!-- Tipo -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Tipo *</label>
              <div class="flex gap-2">
                <button
                  @click="newForm.type = 'truck'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="newForm.type === 'truck' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                >
                  🚛 Cavalo
                </button>
                <button
                  @click="newForm.type = 'trailer'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="newForm.type === 'trailer' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                >
                  🚚 Carreta
                </button>
              </div>
            </div>
            <!-- Marca / Modelo -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Marca</label>
                <input v-model="newForm.brand" type="text" placeholder="Ex: Volvo" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Modelo</label>
                <input v-model="newForm.model" type="text" placeholder="Ex: FH 540" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <!-- Ano / Cor -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Ano</label>
                <input v-model="newForm.year" type="number" placeholder="Ex: 2024" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Cor</label>
                <input v-model="newForm.color" type="text" placeholder="Ex: Branco" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <!-- Renavam -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Renavam</label>
              <input v-model="newForm.renavam" type="text" placeholder="00000000000" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p v-if="newError" class="text-red-500 text-xs">{{ newError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="showNewModal = false" class="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-50">
              Cancelar
            </button>
            <button
              @click="saveNewVehicle"
              :disabled="newSaving"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ newSaving ? 'Salvando...' : 'Cadastrar Veículo' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
