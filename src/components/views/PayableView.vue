<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayable } from '../../composables/usePayable'
import { useDrivers } from '../../composables/useDrivers'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, summary, loading, fetchAll, fetchSummary, markPaid, update, remove } = usePayable()
const { drivers, fetchAll: fetchDrivers } = useDrivers()

const editingPayable = ref(null)
const viewingPayable = ref(null)
const editSaving = ref(false)
const editError = ref('')
const editForm = ref({ value: '', due_date: '', description: '', category: '', obs: '' })

function openEditPayable(c) {
  editingPayable.value = c
  editForm.value = {
    value: c.value,
    due_date: c.due_date?.split('T')[0] || '',
    description: c.description || c.document || '',
    category: c.category || 'administrativo',
    obs: c.obs || '',
  }
  editError.value = ''
}

async function saveEditPayable() {
  if (!editForm.value.value || !editForm.value.due_date) { editError.value = 'Valor e vencimento obrigatórios'; return }
  editSaving.value = true
  editError.value = ''
  try {
    await update(editingPayable.value.id, {
      value: Number(editForm.value.value),
      due_date: editForm.value.due_date,
      description: editForm.value.description || null,
      category: editForm.value.category,
      obs: editForm.value.obs || null,
      driver_id: editingPayable.value.driver_id || null,
      vehicle_id: editingPayable.value.vehicle_id || null,
      supplier_id: editingPayable.value.supplier_id || null,
      document: editingPayable.value.document || null,
      issue_date: editingPayable.value.issue_date || null,
      status: editingPayable.value.status,
    })
    editingPayable.value = null
  } catch (e) {
    editError.value = e.message || 'Erro ao salvar'
  } finally {
    editSaving.value = false
  }
}

const cpFilter = ref('all')
const cpCatFilter = ref('all')
const cpDriverFilter = ref('')
const cpSort = ref('vencimento')

const catLabel = { manutencao: 'Manutenção', pecas: 'Peças', pneus: 'Pneus (serv.)', administrativo: 'Administrativo' }
const catColor = { manutencao: '#f59e0b', pecas: '#2563eb', pneus: '#10b981', administrativo: '#7c3aed' }
const catBg = { manutencao: '#fff7ed', pecas: '#eff6ff', pneus: '#f0fdf4', administrativo: '#f5f3ff' }
const catText = { manutencao: '#c2410c', pecas: '#1d4ed8', pneus: '#15803d', administrativo: '#6d28d9' }

const filteredCP = computed(() => {
  let list = [...items.value]
  if (cpFilter.value !== 'all') list = list.filter(c => c.status === cpFilter.value)
  if (cpCatFilter.value !== 'all') list = list.filter(c => c.category === cpCatFilter.value)
  if (cpDriverFilter.value) list = list.filter(c => c.driver_id == cpDriverFilter.value)
  if (cpSort.value === 'valor-desc') list.sort((a, b) => Number(b.value) - Number(a.value))
  else if (cpSort.value === 'valor-asc') list.sort((a, b) => Number(a.value) - Number(b.value))
  return list
})

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function fmtDate(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d)) return raw
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function dueBadge(raw, status) {
  if (status === 'pago' || !raw) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(raw); due.setHours(0,0,0,0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0)  return { label: `${Math.abs(diff)}d vencido`, cls: 'bg-red-100 text-red-700' }
  if (diff === 0) return { label: 'Vence hoje', cls: 'bg-red-100 text-red-700' }
  if (diff <= 7)  return { label: `Vence em ${diff}d`, cls: 'bg-amber-100 text-amber-700' }
  return null
}

const pendentes = computed(() => items.value.filter(c => c.status === 'pendente'))
const pagos = computed(() => items.value.filter(c => c.status === 'pago'))
const cpTotal = computed(() => items.value.reduce((s, c) => s + Number(c.value || 0), 0))
const cpPendente = computed(() => pendentes.value.reduce((s, c) => s + Number(c.value || 0), 0))
const cpPago = computed(() => pagos.value.reduce((s, c) => s + Number(c.value || 0), 0))
const nextDue = computed(() => {
  const d = [...pendentes.value].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0]?.due_date
  return d ? fmtDate(d) : '—'
})

async function handleMarkPaid(item) {
  const today = new Date().toISOString().split('T')[0]
  await markPaid(item.id, today)
  props.showToast?.(`✅ Conta paga: ${(item.description || item.document || '').substring(0, 40)}`)
}

async function handleRemove(item) {
  if (!confirm(`Excluir a conta "${item.description || item.document || 'R$ ' + fmt(item.value)}"? Esta ação não pode ser desfeita.`)) return
  try {
    await remove(item.id)
    props.showToast?.('✅ Conta removida')
  } catch {
    props.showToast?.('❌ Erro ao remover conta')
  }
}

onMounted(() => {
  fetchAll()
  fetchSummary()
  fetchDrivers()
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <div class="grid grid-cols-4 gap-3.5 mb-5">
        <KPICard title="Total a Pagar" :value="`R$ ${fmt(cpTotal)}`" subtitle="Total lançado" color="#ef4444" border-color="#ef4444" />
        <KPICard title="Pendente" :value="`R$ ${fmt(cpPendente)}`" :subtitle="`${pendentes.length} contas em aberto`" color="#f59e0b" border-color="#f59e0b" />
        <KPICard title="Pago" :value="`R$ ${fmt(cpPago)}`" :subtitle="`${pagos.length} contas liquidadas`" color="#10b981" border-color="#10b981" />
        <KPICard title="Próximo Venc." :value="nextDue" subtitle="data mais próxima" color="#2563eb" border-color="#2563eb" />
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-[11px] py-3 px-[18px] border border-slate-200 mb-3.5 space-y-2.5">
        <!-- linha 1: status + categoria -->
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-500">STATUS:</span>
          <button class="sbtn" :class="{ on: cpFilter === 'all' }" @click="cpFilter = 'all'">Todas</button>
          <button class="sbtn" :class="{ on: cpFilter === 'pendente' }" @click="cpFilter = 'pendente'">Pendentes</button>
          <button class="sbtn" :class="{ on: cpFilter === 'pago' }" @click="cpFilter = 'pago'">Pagas</button>
          <div class="w-px h-5 bg-slate-200" />
          <span class="text-xs font-bold text-slate-500">CATEGORIA:</span>
          <button class="sbtn" :class="{ on: cpCatFilter === 'all' }" @click="cpCatFilter = 'all'">Todas</button>
          <button class="sbtn" :class="{ on: cpCatFilter === 'manutencao' }" @click="cpCatFilter = 'manutencao'">Manutenção</button>
          <button class="sbtn" :class="{ on: cpCatFilter === 'pecas' }" @click="cpCatFilter = 'pecas'">Peças</button>
          <button class="sbtn" :class="{ on: cpCatFilter === 'pneus' }" @click="cpCatFilter = 'pneus'">Pneus</button>
          <button class="sbtn" :class="{ on: cpCatFilter === 'administrativo' }" @click="cpCatFilter = 'administrativo'">Administrativo</button>
        </div>
        <!-- linha 2: motorista + ordenação -->
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-500">MOTORISTA:</span>
          <select v-model="cpDriverFilter" class="text-xs border border-slate-200 rounded-md px-2 py-1.5 min-w-[180px]">
            <option value="">Todos os motoristas</option>
            <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <button
            v-if="cpDriverFilter"
            @click="cpDriverFilter = ''"
            class="text-xs text-slate-400 hover:text-slate-600 underline"
          >limpar</button>
          <div class="ml-auto flex gap-2 items-center">
            <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
            <button class="sbtn" :class="{ on: cpSort === 'vencimento' }" @click="cpSort = 'vencimento'">Vencimento</button>
            <button class="sbtn" :class="{ on: cpSort === 'valor-desc' }" @click="cpSort = 'valor-desc'">↓ Valor</button>
            <button class="sbtn" :class="{ on: cpSort === 'valor-asc' }" @click="cpSort = 'valor-asc'">↑ Valor</button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Vencimento</th>
              <th class="th">Valor</th>
              <th class="th">Documento</th>
              <th class="th">Placa</th>
              <th class="th">Motorista</th>
              <th class="th">Fornecedor</th>
              <th class="th">Categoria</th>
              <th class="th">Status</th>
              <th class="th" style="text-align:center">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="c in filteredCP" :key="c.id">
              <td class="td whitespace-nowrap">
                <div class="font-semibold text-slate-900">{{ fmtDate(c.due_date) }}</div>
                <span v-if="dueBadge(c.due_date, c.status)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" :class="dueBadge(c.due_date, c.status).cls">
                  {{ dueBadge(c.due_date, c.status).label }}
                </span>
              </td>
              <td class="td font-extrabold text-slate-900 whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
              <td class="td text-xs max-w-[200px] truncate">{{ c.description || c.document || '—' }}</td>
              <td class="td">
                <span v-if="c.vehicle_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td font-semibold text-slate-900 text-xs">{{ c.driver_name || '—' }}</td>
              <td class="td text-xs text-slate-500">{{ c.supplier_name || '—' }}</td>
              <td class="td">
                <span
                  v-if="c.category"
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  :style="{ background: catBg[c.category] || '#f1f5f9', color: catText[c.category] || '#475569' }"
                >
                  {{ catLabel[c.category] || c.category }}
                </span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :class="c.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
                >
                  {{ c.status === 'pago' ? '✓ Pago' : '● Pendente' }}
                </span>
              </td>
              <td class="td text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="viewingPayable = c"
                    title="Visualizar"
                    class="text-slate-500 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                  <button
                    @click="openEditPayable(c)"
                    title="Editar"
                    class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button v-if="c.status === 'pendente'" @click="handleMarkPaid(c)" class="btn-p !py-1.5 !px-3 text-xs">
                    Marcar como Pago
                  </button>
                  <button
                    @click="handleRemove(c)"
                    title="Excluir"
                    class="text-red-400 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filteredCP.length" class="text-center text-slate-400 text-xs py-10">Nenhuma conta encontrada</div>
      </div>
    </template>

    <!-- Modal Editar Conta -->
    <Teleport to="body">
      <div v-if="editingPayable" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="editingPayable = null" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 m-0">Editar Conta a Pagar</h3>
            <button @click="editingPayable = null" class="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Valor (R$) *</label>
                <input v-model="editForm.value" type="number" step="0.01" min="0" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">Vencimento *</label>
                <input v-model="editForm.due_date" type="date" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Descrição</label>
              <input v-model="editForm.description" type="text" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Categoria</label>
              <select v-model="editForm.category" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="manutencao">Manutenção</option>
                <option value="pecas">Peças</option>
                <option value="pneus">Pneus (serv.)</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Observação</label>
              <textarea v-model="editForm.obs" rows="2" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <p v-if="editError" class="text-red-500 text-xs">{{ editError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="editingPayable = null" class="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-50">Cancelar</button>
            <button @click="saveEditPayable" :disabled="editSaving" class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
              {{ editSaving ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Visualizar Conta a Pagar -->
    <Teleport to="body">
      <div v-if="viewingPayable" class="fixed inset-0 z-[90] flex items-center justify-center p-4" @click.self="viewingPayable = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="viewingPayable = null" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden">
          <div class="px-7 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between">
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">Detalhes — Conta a Pagar</h3>
              <p class="mt-0.5 mb-0 text-xs text-slate-400">#{{ viewingPayable.id }} — somente leitura</p>
            </div>
            <button @click="viewingPayable = null" class="text-slate-400 hover:text-white transition-colors">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="px-7 py-6 grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor</div>
              <div class="text-2xl font-extrabold text-red-600">R$ {{ fmt(viewingPayable.value) }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
              <span
                class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                :class="viewingPayable.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
              >
                {{ viewingPayable.status === 'pago' ? '✓ Pago' : '● Pendente' }}
              </span>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vencimento</div>
              <div class="text-sm font-semibold text-slate-800">{{ fmtDate(viewingPayable.due_date) }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoria</div>
              <span
                v-if="viewingPayable.category"
                class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                :style="{ background: catBg[viewingPayable.category] || '#f1f5f9', color: catText[viewingPayable.category] || '#475569' }"
              >
                {{ catLabel[viewingPayable.category] || viewingPayable.category }}
              </span>
              <span v-else class="text-xs text-slate-400">—</span>
            </div>
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição</div>
              <div class="text-sm text-slate-800">{{ viewingPayable.description || viewingPayable.document || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Motorista</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingPayable.driver_name || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Placa</div>
              <div class="text-sm font-mono font-bold text-blue-800">{{ viewingPayable.vehicle_plate || '—' }}</div>
            </div>
            <div v-if="viewingPayable.supplier_name" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fornecedor</div>
              <div class="text-sm text-slate-800">{{ viewingPayable.supplier_name }}</div>
            </div>
            <div v-if="viewingPayable.obs" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observação</div>
              <div class="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{{ viewingPayable.obs }}</div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-slate-100 flex justify-end">
            <button @click="viewingPayable = null" class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
