<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFines } from '../../composables/useFines'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'

const { items, summary, loading, fetchAll, fetchSummary, create, markPaid, markAppeal, remove } = useFines()
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()

const statusFilter = ref('all')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')

const form = ref({
  driver_id: '',
  vehicle_plate: '',
  value: '',
  fine_date: new Date().toISOString().split('T')[0],
  due_date: '',
  description: '',
  category: 'outros',
  obs: '',
})

const CATEGORIES = [
  { value: 'velocidade',    label: 'Excesso de Velocidade' },
  { value: 'semaforo',      label: 'Semáforo / Pare' },
  { value: 'estacionamento', label: 'Estacionamento' },
  { value: 'documentacao',  label: 'Documentação' },
  { value: 'outros',        label: 'Outros' },
]

const CATEGORY_COLORS = {
  velocidade:     'bg-red-100 text-red-700',
  semaforo:       'bg-orange-100 text-orange-700',
  estacionamento: 'bg-yellow-100 text-yellow-700',
  documentacao:   'bg-blue-100 text-blue-700',
  outros:         'bg-slate-100 text-slate-600',
}

const STATUS_COLORS = {
  pendente: 'bg-amber-100 text-amber-700',
  pago:     'bg-green-100 text-green-700',
  recurso:  'bg-violet-100 text-violet-700',
}

// Todas as placas para o select
const allPlates = computed(() => vehicles.value.map(v => v.plate).sort())

const filtered = computed(() => {
  if (statusFilter.value === 'all') return items.value
  return items.value.filter(f => f.status === statusFilter.value)
})

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function resetForm() {
  form.value = {
    driver_id: '', vehicle_plate: '', value: '',
    fine_date: new Date().toISOString().split('T')[0],
    due_date: '', description: '', category: 'outros', obs: '',
  }
  formError.value = ''
}

// Ao selecionar motorista, auto-preenche placa do cavalo
function onDriverChange() {
  const d = drivers.value.find(dr => String(dr.id) === String(form.value.driver_id))
  if (d?.truck_plate) form.value.vehicle_plate = d.truck_plate
}

async function submit() {
  if (!form.value.vehicle_plate) { formError.value = 'Selecione a placa'; return }
  if (!form.value.value || Number(form.value.value) <= 0) { formError.value = 'Informe o valor'; return }
  saving.value = true
  formError.value = ''
  try {
    await create({
      ...form.value,
      driver_id: form.value.driver_id || null,
      value: Number(form.value.value),
    })
    showModal.value = false
    resetForm()
  } catch (e) {
    formError.value = e.message || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

async function pay(fine) {
  if (!confirm(`Marcar multa R$ ${Number(fine.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} como PAGA?`)) return
  await markPaid(fine.id, new Date().toISOString().split('T')[0])
}

async function appeal(fine) {
  await markAppeal(fine.id)
}

async function del(fine) {
  if (!confirm('Remover esta multa?')) return
  await remove(fine.id)
}

onMounted(async () => {
  await Promise.all([fetchAll(), fetchSummary(), fetchDrivers(), fetchVehicles()])
})
</script>

<template>
  <div class="space-y-3.5">

    <!-- KPI Cards -->
    <div class="grid grid-cols-4 gap-3.5">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Multas</div>
        <div class="text-3xl font-extrabold text-slate-900">{{ summary.total || 0 }}</div>
        <div class="text-xs text-slate-400 mt-1">{{ fmt(summary.total_value) }}</div>
      </div>
      <div class="bg-white rounded-xl border border-amber-200 p-4">
        <div class="text-[10.5px] font-bold text-amber-500 uppercase tracking-wider mb-1">Pendentes</div>
        <div class="text-3xl font-extrabold text-amber-600">{{ summary.count_pendente || 0 }}</div>
        <div class="text-xs text-amber-400 mt-1">{{ fmt(summary.value_pendente) }}</div>
      </div>
      <div class="bg-white rounded-xl border border-green-200 p-4">
        <div class="text-[10.5px] font-bold text-green-500 uppercase tracking-wider mb-1">Pagas</div>
        <div class="text-3xl font-extrabold text-green-600">{{ summary.count_pago || 0 }}</div>
        <div class="text-xs text-green-400 mt-1">{{ fmt(summary.value_pago) }}</div>
      </div>
      <div class="bg-white rounded-xl border border-violet-200 p-4">
        <div class="text-[10.5px] font-bold text-violet-500 uppercase tracking-wider mb-1">Em Recurso</div>
        <div class="text-3xl font-extrabold text-violet-600">{{ summary.count_recurso || 0 }}</div>
        <div class="text-xs text-violet-400 mt-1">aguardando resultado</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 flex justify-between items-center flex-wrap gap-2.5">
      <div class="flex items-center gap-2.5">
        <span class="text-xs font-bold text-slate-500">STATUS:</span>
        <button class="sbtn" :class="{ on: statusFilter === 'all' }"      @click="statusFilter = 'all'">Todos</button>
        <button class="sbtn" :class="{ on: statusFilter === 'pendente' }" @click="statusFilter = 'pendente'">Pendentes</button>
        <button class="sbtn" :class="{ on: statusFilter === 'recurso' }"  @click="statusFilter = 'recurso'">Em Recurso</button>
        <button class="sbtn" :class="{ on: statusFilter === 'pago' }"     @click="statusFilter = 'pago'">Pagas</button>
      </div>
      <button
        @click="showModal = true"
        class="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
      >
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Lançar Multa
      </button>
    </div>

    <!-- Tabela -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div v-if="loading" class="text-center text-slate-400 text-xs py-10">Carregando...</div>
      <template v-else>
        <div class="grid grid-cols-[1.5fr_1fr_1fr_110px_120px_110px_130px] gap-2 px-[18px] py-2.5 bg-slate-50 border-b border-slate-200">
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motorista</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Placa</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Infração</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Valor</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Data Multa</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
          <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Ações</div>
        </div>

        <div
          v-for="f in filtered"
          :key="f.id"
          class="grid grid-cols-[1.5fr_1fr_1fr_110px_120px_110px_130px] gap-2 px-[18px] py-3 border-b border-slate-50 items-center"
        >
          <!-- Motorista -->
          <div class="flex items-center gap-2">
            <div
              v-if="f.driver_name"
              class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
              :style="{ background: `${f.driver_color || '#2563eb'}22`, color: f.driver_color || '#2563eb' }"
            >{{ f.driver_name[0] }}</div>
            <div v-else class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" fill="#94a3b8" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
            </div>
            <span class="text-sm font-semibold text-slate-900">{{ f.driver_name || 'Sem motorista' }}</span>
          </div>

          <!-- Placa -->
          <div>
            <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-[3px] rounded-[5px]">{{ f.vehicle_plate }}</span>
          </div>

          <!-- Infração -->
          <div>
            <span class="text-xs px-2 py-[3px] rounded-full font-semibold" :class="CATEGORY_COLORS[f.category]">
              {{ CATEGORIES.find(c => c.value === f.category)?.label || f.category }}
            </span>
            <div v-if="f.description" class="text-[10.5px] text-slate-400 mt-0.5 truncate max-w-[160px]">{{ f.description }}</div>
          </div>

          <!-- Valor -->
          <div class="font-bold text-slate-900">{{ fmt(f.value) }}</div>

          <!-- Data -->
          <div class="text-xs text-slate-600">
            <div>{{ f.fine_date?.split('T')[0] }}</div>
            <div v-if="f.due_date" class="text-[10px] text-slate-400">Vence: {{ f.due_date?.split('T')[0] }}</div>
          </div>

          <!-- Status -->
          <div>
            <span class="text-[11px] font-semibold px-2.5 py-[3px] rounded-full" :class="STATUS_COLORS[f.status]">
              {{ f.status === 'pendente' ? '● Pendente' : f.status === 'pago' ? '✓ Pago' : '⚖ Recurso' }}
            </span>
          </div>

          <!-- Ações -->
          <div class="flex items-center gap-1.5">
            <button
              v-if="f.status === 'pendente'"
              @click="pay(f)"
              title="Marcar como pago"
              class="text-[10.5px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
            >Pagar</button>
            <button
              v-if="f.status === 'pendente'"
              @click="appeal(f)"
              title="Entrar em recurso"
              class="text-[10.5px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-md transition-colors"
            >Recurso</button>
            <button
              @click="del(f)"
              title="Remover"
              class="text-[10.5px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors"
            >✕</button>
          </div>
        </div>

        <div v-if="!filtered.length" class="text-center text-slate-400 text-xs py-10">
          Nenhuma multa {{ statusFilter !== 'all' ? `com status "${statusFilter}"` : '' }}
        </div>
      </template>
    </div>

    <!-- ───── Modal Lançar Multa ───── -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showModal = false; resetForm()" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 m-0">Lançar Multa</h3>
            <button @click="showModal = false; resetForm()" class="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <!-- Motorista -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Motorista</label>
              <select
                v-model="form.driver_id"
                @change="onDriverChange"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">— Sem motorista vinculado —</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>

            <!-- Placa -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Placa do Veículo *</label>
              <select
                v-model="form.vehicle_plate"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">— Selecione a placa —</option>
                <option v-for="p in allPlates" :key="p" :value="p">{{ p }}</option>
              </select>
              <p class="text-[10.5px] text-slate-400 mt-1">A placa é preenchida automaticamente ao selecionar o motorista</p>
            </div>

            <!-- Data multa + Vencimento -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Data da Infração *</label>
                <input
                  v-model="form.fine_date"
                  type="date"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Vencimento</label>
                <input
                  v-model="form.due_date"
                  type="date"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <!-- Valor + Categoria -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Valor (R$) *</label>
                <input
                  v-model="form.value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Tipo de Infração</label>
                <select
                  v-model="form.category"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </div>
            </div>

            <!-- Descrição -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Descrição / Código da Multa</label>
              <input
                v-model="form.description"
                type="text"
                placeholder="Ex: 55411 - Velocidade 20km/h acima"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <!-- Obs -->
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Observações</label>
              <textarea
                v-model="form.obs"
                rows="2"
                placeholder="Informações adicionais..."
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <p v-if="formError" class="text-red-500 text-xs">{{ formError }}</p>
          </div>

          <div class="flex gap-3 px-5 pb-5">
            <button @click="showModal = false; resetForm()" class="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-50">
              Cancelar
            </button>
            <button
              @click="submit"
              :disabled="saving"
              class="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ saving ? 'Salvando...' : 'Registrar Multa' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
