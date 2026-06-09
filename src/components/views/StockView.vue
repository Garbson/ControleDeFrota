<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStock } from '../../composables/useStock'
import { useDrivers } from '../../composables/useDrivers'
import { api } from '../../composables/useApi'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, movements, loading, fetchAll, fetchMovements, createMovement } = useStock()
const { drivers, fetchAll: fetchDrivers } = useDrivers()

const sFilter = ref('all')
const sSort = ref('qty-desc')

// ── Saída
const exitModal = ref(null)
const exitForm = ref({ driver_id: '', qty: '', mov_date: '' })

// ── Entrada
const showEntryModal = ref(false)
const entryMode = ref('existing') // 'existing' | 'new'
const entryForm = ref({
  stock_item_id: '',
  description: '',
  brand: '',
  nf_number: '',
  status: 'novo',
  unit_price: '',
  qty: '',
  mov_date: new Date().toISOString().split('T')[0],
  obs: '',
})
const entrySaving = ref(false)

const totalStock = computed(() => items.value.reduce((s, i) => s + Number(i.qty), 0))
const novosPneus = computed(() => items.value.filter(s => s.status === 'novo').reduce((a, s) => a + Number(s.qty), 0))
const recapadosPneus = computed(() => items.value.filter(s => s.status === 'recapado').reduce((a, s) => a + Number(s.qty), 0))
const totalValue = computed(() => items.value.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price || 0)), 0))

const filteredStock = computed(() => {
  let list = [...items.value]
  if (sFilter.value !== 'all') list = list.filter(s => s.status === sFilter.value)
  if (sSort.value === 'qty-desc') list.sort((a, b) => Number(b.qty) - Number(a.qty))
  else if (sSort.value === 'qty-asc') list.sort((a, b) => Number(a.qty) - Number(b.qty))
  else if (sSort.value === 'date') list.sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || ''))
  return list
})

function openExit(item) {
  exitModal.value = item
  exitForm.value = { driver_id: '', qty: '', mov_date: new Date().toISOString().split('T')[0] }
}

async function confirmExit() {
  if (!exitForm.value.qty) return
  try {
    await createMovement({
      type: 'saida',
      stock_item_id: exitModal.value.id,
      driver_id: exitForm.value.driver_id || null,
      qty: Number(exitForm.value.qty),
      unit_value: exitModal.value.unit_price || null,
      mov_date: exitForm.value.mov_date || new Date().toISOString().split('T')[0],
    })
    const d = drivers.value.find(dr => dr.id == exitForm.value.driver_id)
    props.showToast?.(`✅ Saída registrada: ${exitForm.value.qty} pneus${d ? ' para ' + d.name : ''}`)
    exitModal.value = null
  } catch (e) {
    props.showToast?.('❌ Erro ao registrar saída')
  }
}

// ── Entrada
function openEntry() {
  entryForm.value = {
    stock_item_id: '',
    description: '',
    brand: '',
    nf_number: '',
    status: 'novo',
    unit_price: '',
    qty: '',
    mov_date: new Date().toISOString().split('T')[0],
    obs: '',
  }
  entryMode.value = 'existing'
  showEntryModal.value = true
}

const selectedStockItem = computed(() => items.value.find(i => i.id == entryForm.value.stock_item_id) || null)

async function confirmEntry() {
  if (!entryForm.value.qty || Number(entryForm.value.qty) <= 0) return
  entrySaving.value = true
  try {
    let stockItemId = entryForm.value.stock_item_id

    // Se for novo item, criar primeiro
    if (entryMode.value === 'new') {
      if (!entryForm.value.description.trim()) {
        props.showToast?.('❌ Informe a descrição do pneu')
        entrySaving.value = false
        return
      }
      const newItem = await api.post('/stock', {
        description: entryForm.value.description,
        brand: entryForm.value.brand || null,
        nf_number: entryForm.value.nf_number || null,
        status: entryForm.value.status,
        qty: 0, // qty será atualizada pelo movimento
        unit_price: entryForm.value.unit_price || null,
        entry_date: entryForm.value.mov_date,
      })
      stockItemId = newItem.id
    }

    // Registrar movimento de entrada
    await createMovement({
      type: 'entrada',
      stock_item_id: stockItemId,
      driver_id: null,
      qty: Number(entryForm.value.qty),
      unit_value: entryForm.value.unit_price || null,
      mov_date: entryForm.value.mov_date,
      obs: entryForm.value.obs || null,
    })

    const item = items.value.find(i => i.id == stockItemId)
    props.showToast?.(`✅ Entrada registrada: ${entryForm.value.qty} pneus de ${item?.description || 'novo item'}`)
    showEntryModal.value = false
  } catch (e) {
    props.showToast?.('❌ Erro ao registrar entrada')
  } finally {
    entrySaving.value = false
  }
}

const fmtValue = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

onMounted(() => {
  fetchAll()
  fetchMovements()
  fetchDrivers()
})
</script>

<template>
  <div>
    <div class="grid grid-cols-4 gap-3.5 mb-5">
      <KPICard title="Total em Estoque" :value="totalStock" subtitle="pneus disponíveis" color="#10b981" border-color="#10b981" />
      <KPICard title="Novos" :value="novosPneus" subtitle="pneus novos" color="#2563eb" border-color="#2563eb" />
      <KPICard title="Recapados" :value="recapadosPneus" subtitle="pneus recapados" color="#f59e0b" border-color="#f59e0b" />
      <KPICard title="Valor Investido" :value="`R$ ${fmtValue(totalValue)}`" subtitle="valor em estoque" color="#7c3aed" border-color="#7c3aed" />
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-[11px] py-3 px-[18px] border border-slate-200 mb-3.5 flex gap-2.5 items-center flex-wrap">
      <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
      <button class="sbtn" :class="{ on: sFilter === 'all' }" @click="sFilter = 'all'">Todos</button>
      <button class="sbtn" :class="{ on: sFilter === 'novo' }" @click="sFilter = 'novo'">Novos</button>
      <button class="sbtn" :class="{ on: sFilter === 'recapado' }" @click="sFilter = 'recapado'">Recapados</button>
      <div class="ml-auto flex gap-2 items-center">
        <button
          @click="openEntry"
          class="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors mr-2"
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Nova Entrada
        </button>
        <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
        <button class="sbtn" :class="{ on: sSort === 'qty-desc' }" @click="sSort = 'qty-desc'">↓ Maior qtd</button>
        <button class="sbtn" :class="{ on: sSort === 'qty-asc' }" @click="sSort = 'qty-asc'">↑ Menor qtd</button>
        <button class="sbtn" :class="{ on: sSort === 'date' }" @click="sSort = 'date'">Data</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-10 text-slate-400 text-sm">Carregando...</div>

    <!-- Stock Table -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
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
              <div class="font-bold text-slate-900 text-[13px]">{{ s.description }}</div>
              <div v-if="s.brand" class="text-[10.5px] text-slate-400 mt-px">{{ s.brand }}</div>
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
              <span v-if="s.nf_number" class="font-mono text-[11.5px] bg-slate-100 px-2 py-[3px] rounded-[5px] text-slate-600 font-bold">NF {{ s.nf_number }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="td text-slate-500 text-xs">{{ s.entry_date || '—' }}</td>
            <td class="td text-center">
              <button @click="openExit(s)" class="btn-p !py-1.5 !px-3 text-xs" :disabled="s.qty <= 0">Registrar Saída</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredStock.length" class="text-center text-slate-400 text-xs py-10">Nenhum item em estoque</div>
    </div>

    <!-- Recent Movements -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-[22px] py-[17px] border-b border-slate-50 flex items-center justify-between">
        <h3 class="m-0 text-sm font-bold text-slate-900">Movimentações Recentes</h3>
        <span class="text-xs text-slate-400">Entradas e saídas de estoque</span>
      </div>
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th><th class="th">Tipo</th><th class="th">Item</th>
            <th class="th">Motorista</th><th class="th">Qtd</th><th class="th">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="m in movements" :key="m.id">
            <td class="td text-xs">{{ m.mov_date }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="m.type === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600'">
                {{ m.type === 'entrada' ? '↓ Entrada' : '↑ Saída' }}
              </span>
            </td>
            <td class="td text-xs font-semibold">{{ m.item_name || '—' }}</td>
            <td class="td text-xs">{{ m.driver_name || '—' }}</td>
            <td class="td font-bold text-slate-900">{{ m.qty }}</td>
            <td class="td font-bold text-slate-900">
              {{ m.total_value ? `R$ ${Number(m.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!movements.length" class="text-center text-slate-400 text-xs py-8">Nenhuma movimentação registrada</div>
    </div>

    <!-- Exit Modal -->
    <Teleport to="body">
      <div v-if="exitModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="exitModal = null">
        <div class="bg-white rounded-xl w-[420px] shadow-2xl">
          <div class="bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">📦 Registrar Saída</h3>
            <p class="mt-1 mb-0 text-xs text-slate-400">{{ exitModal.description }} — {{ exitModal.brand || '' }}</p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motorista</label>
                <select v-model="exitForm.driver_id" class="finput">
                  <option value="">Selecione...</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                <input v-model="exitForm.qty" type="number" min="1" :max="exitModal.qty" :placeholder="`Máx: ${exitModal.qty}`" class="finput" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                <input v-model="exitForm.mov_date" type="date" class="finput" />
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
              <button @click="exitModal = null" class="px-4 py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button @click="confirmExit" class="btn-p" :disabled="!exitForm.qty">Confirmar Saída</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Entry Modal -->
    <Teleport to="body">
      <div v-if="showEntryModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="showEntryModal = false">
        <div class="bg-white rounded-xl w-[480px] shadow-2xl">
          <div class="bg-gradient-to-br from-green-700 to-green-900 px-6 py-5 rounded-t-xl">
            <h3 class="m-0 text-[15px] font-bold text-white">📦 Nova Entrada de Pneus</h3>
            <p class="mt-1 mb-0 text-xs text-green-200">Registrar entrada no estoque</p>
          </div>
          <div class="p-6">
            <!-- Modo: existente ou novo -->
            <div class="flex gap-2 mb-5">
              <button
                @click="entryMode = 'existing'"
                class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
                :class="entryMode === 'existing' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'"
              >
                Item Existente
              </button>
              <button
                @click="entryMode = 'new'"
                class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
                :class="entryMode === 'new' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'"
              >
                Novo Item
              </button>
            </div>

            <!-- Modo: item existente -->
            <div v-if="entryMode === 'existing'" class="space-y-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Item de Estoque *</label>
                <select v-model="entryForm.stock_item_id" class="finput">
                  <option value="">Selecione o item...</option>
                  <option v-for="i in items" :key="i.id" :value="i.id">
                    {{ i.description }} {{ i.brand ? `(${i.brand})` : '' }} — {{ i.status === 'novo' ? 'Novo' : 'Recapado' }}
                  </option>
                </select>
              </div>
              <!-- Prévia do item selecionado -->
              <div v-if="selectedStockItem" class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Item selecionado</div>
                <div class="flex justify-between items-center">
                  <div>
                    <div class="text-sm font-bold text-slate-900">{{ selectedStockItem.description }}</div>
                    <div class="text-[11px] text-slate-500">{{ selectedStockItem.brand || '—' }} · Estoque atual: <strong>{{ selectedStockItem.qty }}</strong> un</div>
                  </div>
                  <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="selectedStockItem.status === 'novo' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                    {{ selectedStockItem.status === 'novo' ? 'Novo' : 'Recapado' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Modo: novo item -->
            <div v-if="entryMode === 'new'" class="space-y-3.5">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição *</label>
                <input v-model="entryForm.description" type="text" placeholder="Ex: Pneu 295/80R22.5" class="finput" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Marca</label>
                  <input v-model="entryForm.brand" type="text" placeholder="Ex: Michelin" class="finput" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">NF Origem</label>
                  <input v-model="entryForm.nf_number" type="text" placeholder="Nº da NF" class="finput" />
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                <div class="flex gap-2">
                  <button
                    @click="entryForm.status = 'novo'"
                    class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
                    :class="entryForm.status === 'novo' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'"
                  >
                    Novo
                  </button>
                  <button
                    @click="entryForm.status = 'recapado'"
                    class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
                    :class="entryForm.status === 'recapado' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'"
                  >
                    Recapado
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preço Unitário (R$)</label>
                <input v-model="entryForm.unit_price" type="number" step="0.01" placeholder="0,00" class="finput" />
              </div>
            </div>

            <!-- Campos comuns (qtd, data, obs) -->
            <div class="space-y-4 mt-4 pt-4 border-t border-slate-100">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade *</label>
                  <input v-model="entryForm.qty" type="number" min="1" placeholder="Ex: 4" class="finput" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input v-model="entryForm.mov_date" type="date" class="finput" />
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação</label>
                <input v-model="entryForm.obs" type="text" placeholder="Info adicional..." class="finput" />
              </div>
            </div>

            <div class="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
              <button @click="showEntryModal = false" class="px-4 py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button
                @click="confirmEntry"
                class="btn-p !bg-green-600 hover:!bg-green-700"
                :disabled="entrySaving || !entryForm.qty || (entryMode === 'existing' && !entryForm.stock_item_id)"
              >
                {{ entrySaving ? 'Salvando...' : 'Confirmar Entrada' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
