<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useReceivable } from '../../composables/useReceivable'
import KPICard from '../ui/KPICard.vue'
import { useConfirm } from '../../composables/useConfirm'
import TableFooter from '../ui/TableFooter.vue'
import { useTableState } from '../../composables/useTableState'

const props = defineProps({ showToast: Function })

const { items, loading, fetchAll, fetchSummary, markReceived, update, remove, uploadReceipt, deleteReceipt } = useReceivable()
const { confirmAction } = useConfirm()

const editingReceivable = ref(null)
const viewingReceivable = ref(null)
const editSaving = ref(false)
const editError = ref('')
const editForm = ref({ value: '', due_date: '', client: '', description: '', obs: '' })

async function deleteReceivable(c) {
  if (!await confirmAction({ title: 'Excluir conta a receber', message: `Excluir a conta de "${c.client || 'sem cliente'}" no valor de R$ ${Number(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`, confirmText: 'Excluir' })) return
  try {
    await remove(c.id)
    props.showToast?.('Conta a receber excluída')
    await fetchSummary()
  } catch {
    props.showToast?.('❌ Erro ao excluir conta')
  }
}

function openEditReceivable(c) {
  editingReceivable.value = c
  editForm.value = {
    value: c.value,
    due_date: c.due_date?.split('T')[0] || '',
    client: c.client || '',
    description: c.description || '',
    obs: c.obs || '',
  }
  editError.value = ''
}

async function saveEditReceivable() {
  if (!editForm.value.value || !editForm.value.client) { editError.value = 'Valor e cliente obrigatórios'; return }
  editSaving.value = true
  editError.value = ''
  try {
    await update(editingReceivable.value.id, {
      value: Number(editForm.value.value),
      due_date: editForm.value.due_date || editingReceivable.value.due_date,
      client: editForm.value.client,
      description: editForm.value.description || null,
      obs: editForm.value.obs || null,
      driver_id: editingReceivable.value.driver_id || null,
      vehicle_id: editingReceivable.value.vehicle_id || null,
      type: editingReceivable.value.type || 'frete',
      issue_date: editingReceivable.value.issue_date || null,
      document: editingReceivable.value.document || null,
    })
    editingReceivable.value = null
  } catch (e) {
    editError.value = e.message || 'Erro ao salvar'
  } finally {
    editSaving.value = false
  }
}

// ── Upload de comprovante
const receiptUploading = ref(null)
const receiptInput = ref(null)

function triggerReceiptUpload(item) {
  receiptTarget.value = item
  receiptInput.value?.click()
}

const receiptTarget = ref(null)
async function handleReceiptFile(e) {
  const file = e.target.files?.[0]
  if (!file || !receiptTarget.value) return

  receiptUploading.value = receiptTarget.value.id
  try {
    await uploadReceipt(receiptTarget.value.id, file)
    props.showToast?.('✅ Comprovante enviado')
  } catch (err) {
    props.showToast?.('❌ ' + (err.message || 'Erro ao enviar comprovante'))
  } finally {
    receiptUploading.value = null
    receiptTarget.value = null
    e.target.value = ''
  }
}

async function handleDeleteReceipt(item) {
  if (!await confirmAction({ title: 'Remover comprovante', message: 'Tem certeza que deseja remover o comprovante de recebimento?', confirmText: 'Remover' })) return
  try {
    await deleteReceipt(item.id)
    props.showToast?.('✅ Comprovante removido')
  } catch {
    props.showToast?.('❌ Erro ao remover comprovante')
  }
}

function receiptUrl(item) {
  if (!item?.receipt_url) return null
  if (item.receipt_access_url) return item.receipt_access_url
  const base = import.meta.env.VITE_API_URL || '/api'
  return item.receipt_url.startsWith('http') ? item.receipt_url : base.replace('/api', '') + item.receipt_url
}

function isImage(url) {
  return /\.(jpg|jpeg|png|webp)$/i.test(url || '')
}

const crFilter = ref('all')

const filteredCR = computed(() => {
  if (crFilter.value === 'all') return items.value
  return items.value.filter(c => c.status === crFilter.value)
})

const { search: crSearch, page: crPage, pageSize: crPageSize, filtered: searchedCR, pages: crPages, paged: pagedCR } = useTableState('receivable', filteredCR, (list, q) => {
  if (!q) return list
  return list.filter(c => [c.client, c.description, c.document, c.vehicle_plate, c.driver_name]
    .some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(q)))
})
crFilter.value = localStorage.getItem('cf_filter_receivable') || 'all'
watch(crFilter, value => localStorage.setItem('cf_filter_receivable', value))

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function fmtDate(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d)) return raw
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function dueBadge(raw, status) {
  if (status === 'recebido' || !raw) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(raw); due.setHours(0,0,0,0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0)  return { label: `${Math.abs(diff)}d vencido`, cls: 'bg-red-100 text-red-700' }
  if (diff === 0) return { label: 'Vence hoje', cls: 'bg-red-100 text-red-700' }
  if (diff <= 7)  return { label: `Vence em ${diff}d`, cls: 'bg-amber-100 text-amber-700' }
  return null
}

const pendentes = computed(() => items.value.filter(c => c.status === 'pendente'))
const recebidos = computed(() => items.value.filter(c => c.status === 'recebido'))
const crTotal = computed(() => items.value.reduce((s, c) => s + Number(c.value || 0), 0))
const crPendente = computed(() => pendentes.value.reduce((s, c) => s + Number(c.value || 0), 0))
const crRecebido = computed(() => recebidos.value.reduce((s, c) => s + Number(c.value || 0), 0))

async function handleMarkReceived(item) {
  if (!await confirmAction({
    title: 'Confirmar recebimento',
    message: `Marcar o valor de ${item.client || item.description || 'conta'} como recebido hoje?`,
    confirmText: 'Confirmar recebimento',
    tone: 'primary',
  })) return
  const today = new Date().toISOString().split('T')[0]
  await markReceived(item.id, today)
  props.showToast?.(`✅ Frete recebido: ${item.client || item.description || ''}`)
}

onMounted(() => {
  fetchAll()
  fetchSummary()
})
</script>

<template>
  <div>
    <!-- Hidden file input para comprovantes -->
    <input
      ref="receiptInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      class="hidden"
      @change="handleReceiptFile"
    />

    <div v-if="loading" class="space-y-4"><div class="grid grid-cols-4 gap-3.5"><div v-for="i in 4" :key="i" class="skeleton h-[118px] rounded-xl" /></div><div class="skeleton h-[340px] rounded-xl" /></div>

    <template v-else>
      <div class="grid grid-cols-4 gap-3.5 mb-5">
        <KPICard title="Total a Receber" :value="`R$ ${fmt(crTotal)}`" :subtitle="`${items.length} lançamentos`" color="#10b981" border-color="#10b981" />
        <KPICard title="Pendente" :value="`R$ ${fmt(crPendente)}`" :subtitle="`${pendentes.length} pendentes`" color="#f59e0b" border-color="#f59e0b" />
        <KPICard title="Recebido" :value="`R$ ${fmt(crRecebido)}`" :subtitle="`${recebidos.length} recebidos`" color="#2563eb" border-color="#2563eb" />
        <KPICard title="Saldo Pendente" :value="`R$ ${fmt(crPendente)}`" subtitle="a receber" :color="crPendente > 0 ? '#f59e0b' : '#10b981'" border-color="#7c3aed" />
      </div>

      <!-- Filters -->
      <div class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex flex-wrap gap-2.5 items-center">
        <div class="relative min-w-[280px] flex-1 max-w-[440px]"><span class="absolute left-3 top-2 text-stone-400">⌕</span><input v-model="crSearch" class="finput !pl-9 !py-1.5" placeholder="Buscar cliente, descrição, placa ou motorista..." /></div>
        <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
        <button class="sbtn" :class="{ on: crFilter === 'all' }" @click="crFilter = 'all'">Todos</button>
        <button class="sbtn" :class="{ on: crFilter === 'pendente' }" @click="crFilter = 'pendente'">Pendentes</button>
        <button class="sbtn" :class="{ on: crFilter === 'recebido' }" @click="crFilter = 'recebido'">Recebidos</button>
      </div>

      <!-- Table -->
      <div class="glass rounded-xl overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Vencimento</th>
              <th class="th">Cliente</th>
              <th class="th">Descrição</th>
              <th class="th">Valor</th>
              <th class="th">Placa</th>
              <th class="th">Motorista</th>
              <th class="th">Status</th>
              <th class="th" style="text-align:center">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="c in pagedCR" :key="c.id">
              <td class="td whitespace-nowrap">
                <div class="font-semibold text-stone-800">{{ fmtDate(c.due_date || c.issue_date) }}</div>
                <span v-if="dueBadge(c.due_date, c.status)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" :class="dueBadge(c.due_date, c.status).cls">
                  {{ dueBadge(c.due_date, c.status).label }}
                </span>
              </td>
              <td class="td font-semibold text-stone-800 text-xs max-w-[160px] truncate" :title="c.client">{{ c.client || '—' }}</td>
              <td class="td text-xs">{{ c.description || c.type || '—' }}</td>
              <td class="td font-extrabold text-stone-800 whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
              <td class="td">
                <span v-if="c.vehicle_plate" class="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td font-semibold text-stone-800 text-xs">{{ c.driver_name || '—' }}</td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :class="c.status === 'recebido' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
                >
                  {{ c.status === 'recebido' ? '✓ Recebido' : '● Pendente' }}
                </span>
              </td>
              <td class="td text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="viewingReceivable = c"
                    title="Visualizar"
                    class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                  <button
                    @click="openEditReceivable(c)"
                    title="Editar"
                    class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button
                    @click="triggerReceiptUpload(c)"
                    title="Comprovante de recebimento"
                    class="p-1.5 rounded-md transition-colors inline-flex"
                    :class="c.receipt_url ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-amber-500 bg-amber-50 hover:bg-amber-100'"
                    :disabled="receiptUploading === c.id"
                  >
                    <svg v-if="receiptUploading === c.id" class="animate-spin" width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 002 12h2a8 8 0 018-8z"/></svg>
                    <svg v-else width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M21.586 10.461l-7.047-7.047a2 2 0 00-2.828 0L4 11.125V20h8.875l7.711-7.711a2 2 0 000-2.828zm-8.875 7.539H6v-6.703L12.703 4l6.703 6.703L12.711 18zM10 18l-1-4 4 1-3 3z"/></svg>
                  </button>
                  <button
                    @click="deleteReceivable(c)"
                    title="Excluir"
                    class="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                  <button v-if="c.status === 'pendente'" @click="handleMarkReceived(c)" class="btn-p !py-1.5 !px-3 text-xs">
                    Marcar como Recebido
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!searchedCR.length" class="text-center py-12"><div class="text-2xl mb-2">⌕</div><strong class="block text-sm text-stone-600">Nenhum recebimento encontrado</strong><span class="text-xs text-stone-400">Tente limpar a busca ou alterar o filtro.</span></div>
        <TableFooter v-else :page="crPage" :pages="crPages" :total="searchedCR.length" :page-size="crPageSize" @update:page="crPage = $event" @update:page-size="crPageSize = $event" />
      </div>
    </template>

    <!-- Modal Editar Conta a Receber -->
    <Teleport to="body">
      <div v-if="editingReceivable" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="editingReceivable = null" />
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 class="text-base font-bold text-stone-800 m-0">Editar Conta a Receber</h3>
            <button @click="editingReceivable = null" class="text-slate-400 hover:text-stone-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Cliente *</label>
              <input v-model="editForm.client" type="text" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Valor (R$) *</label>
                <input v-model="editForm.value" type="number" step="0.01" min="0" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Vencimento</label>
                <input v-model="editForm.due_date" type="date" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Descrição</label>
              <input v-model="editForm.description" type="text" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Observação</label>
              <textarea v-model="editForm.obs" rows="2" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            <p v-if="editError" class="text-red-500 text-xs">{{ editError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="editingReceivable = null" class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50">Cancelar</button>
            <button @click="saveEditReceivable" :disabled="editSaving" class="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
              {{ editSaving ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Visualizar Conta a Receber -->
    <Teleport to="body">
      <div v-if="viewingReceivable" class="fixed inset-0 z-[90] flex items-center justify-center p-4" @click.self="viewingReceivable = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="viewingReceivable = null" />
        <div class="relative glass-strong rounded-2xl w-full max-w-[500px] overflow-hidden">
          <div class="px-7 py-5 bg-gradient-to-br from-[#064e3b] to-[#065f46] flex items-center justify-between">
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">Detalhes — Conta a Receber</h3>
              <p class="mt-0.5 mb-0 text-xs text-emerald-300">#{{ viewingReceivable.id }} — somente leitura</p>
            </div>
            <button @click="viewingReceivable = null" class="text-emerald-300 hover:text-white transition-colors">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="px-7 py-6 grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor</div>
              <div class="text-2xl font-extrabold text-green-600">R$ {{ fmt(viewingReceivable.value) }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
              <span
                class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                :class="viewingReceivable.status === 'recebido' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'"
              >
                {{ viewingReceivable.status === 'recebido' ? '✓ Recebido' : '● Pendente' }}
              </span>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vencimento</div>
              <div class="text-sm font-semibold text-slate-800">{{ fmtDate(viewingReceivable.due_date) }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo</div>
              <div class="text-sm font-semibold text-slate-800 capitalize">{{ viewingReceivable.type || '—' }}</div>
            </div>
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cliente</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingReceivable.client || '—' }}</div>
            </div>
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição</div>
              <div class="text-sm text-slate-800">{{ viewingReceivable.description || viewingReceivable.document || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Motorista</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingReceivable.driver_name || '—' }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Placa</div>
              <div class="text-sm font-mono font-bold text-blue-800">{{ viewingReceivable.vehicle_plate || '—' }}</div>
            </div>
            <div v-if="viewingReceivable.obs" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observação</div>
              <div class="text-sm text-stone-600 rounded-lg p-3 bg-stone-50 border border-stone-100">{{ viewingReceivable.obs }}</div>
            </div>
            <!-- Comprovante de recebimento -->
            <div v-if="viewingReceivable.receipt_url" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Comprovante de Recebimento</div>
              <div v-if="isImage(viewingReceivable.receipt_url)" class="rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                <img
                  :src="receiptUrl(viewingReceivable)"
                  alt="Comprovante"
                  class="w-full max-h-[300px] object-contain cursor-pointer"
                  @click="window.open(receiptUrl(viewingReceivable), '_blank')"
                />
              </div>
              <a
                v-else
                :href="receiptUrl(viewingReceivable)"
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                Ver PDF
              </a>
              <div class="mt-2 flex items-center gap-3">
                <a
                  :href="receiptUrl(viewingReceivable)"
                  :download="'comprovante_' + viewingReceivable.id"
                  class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  Baixar
                </a>
                <button
                  @click="handleDeleteReceipt(viewingReceivable)"
                  class="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remover comprovante
                </button>
              </div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button @click="viewingReceivable = null" class="px-5 py-2 bg-stone-100/70 hover:bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
