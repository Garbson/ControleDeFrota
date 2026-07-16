<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePayable } from '../../composables/usePayable'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import { useSuppliers } from '../../composables/useSuppliers'
import KPICard from '../ui/KPICard.vue'

const props = defineProps({ showToast: Function })

const { items, summary, loading, fetchAll, fetchSummary, markPaid, update, remove, uploadReceipt, deleteReceipt, uploadInvoice, deleteInvoice } = usePayable()
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()
const { suppliers, fetchAll: fetchSuppliers } = useSuppliers()

// ── Edit: busca de placa
const editPlateInput = ref('')
const editPlateOpen = ref(false)
const editPlateSuggestions = computed(() => {
  if (!editPlateInput.value) return vehicles.value.slice(0, 10)
  const q = editPlateInput.value.toLowerCase()
  return vehicles.value.filter(v => v.plate.toLowerCase().includes(q)).slice(0, 10)
})
function selectEditPlate(plate) {
  editPlateInput.value = plate
  editForm.value.vehicle_id = vehicles.value.find(v => v.plate === plate)?.id || null
  editPlateOpen.value = false
}
function blurEditPlate() { setTimeout(() => { editPlateOpen.value = false }, 150) }

// ── Edit: busca de fornecedor
const editSupplierSearch = ref('')
const editSupplierOpen = ref(false)
const editSupplierFiltered = computed(() => {
  if (!editSupplierSearch.value) return suppliers.value.slice(0, 10)
  const q = editSupplierSearch.value.toLowerCase()
  return suppliers.value.filter(s => s.name.toLowerCase().includes(q) || (s.cnpj && s.cnpj.includes(q))).slice(0, 10)
})
function selectEditSupplier(s) {
  editSupplierSearch.value = s.name
  editForm.value.supplier_id = s.id
  editForm.value.supplier_name_free = null
  editSupplierOpen.value = false
}
function clearEditSupplier() {
  editSupplierSearch.value = ''
  editForm.value.supplier_id = null
  editForm.value.supplier_name_free = null
}
function blurEditSupplier() {
  setTimeout(() => {
    editSupplierOpen.value = false
    // Se não selecionou da lista, salva o texto digitado como fornecedor livre
    if (!editForm.value.supplier_id) {
      editForm.value.supplier_name_free = editSupplierSearch.value.trim() || null
    }
  }, 150)
}


const editingPayable = ref(null)
const viewingPayable = ref(null)
const editSaving = ref(false)
const editError = ref('')
const editForm = ref({ value: '', due_date: '', description: '', category: '', obs: '', vehicle_id: null, supplier_id: null, supplier_name_free: null })

// ── Upload de comprovante
const receiptUploading = ref(null) // id da conta com upload em andamento
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
    // limpa o input para permitir reenvio do mesmo arquivo
    e.target.value = ''
  }
}

async function handleDeleteReceipt(item) {
  if (!confirm('Remover o comprovante de pagamento?')) return
  try {
    await deleteReceipt(item.id)
    props.showToast?.('✅ Comprovante removido')
  } catch {
    props.showToast?.('❌ Erro ao remover comprovante')
  }
}

function receiptUrl(item) {
  if (!item?.receipt_url) return null
  const base = import.meta.env.VITE_API_URL || '/api'
  // receipt_url já vem como /uploads/receipts/...
  return item.receipt_url.startsWith('http') ? item.receipt_url : base.replace('/api', '') + item.receipt_url
}

function isImage(url) {
  return /\.(jpg|jpeg|png|webp)$/i.test(url || '')
}

// ── Upload de nota fiscal
const invoiceUploading = ref(null)
const invoiceInput = ref(null)
const invoiceTarget = ref(null)

function triggerInvoiceUpload(item) {
  invoiceTarget.value = item
  invoiceInput.value?.click()
}

async function handleInvoiceFile(e) {
  const file = e.target.files?.[0]
  if (!file || !invoiceTarget.value) return
  invoiceUploading.value = invoiceTarget.value.id
  try {
    await uploadInvoice(invoiceTarget.value.id, file)
    props.showToast?.('✅ Nota fiscal enviada')
  } catch (err) {
    props.showToast?.('❌ ' + (err.message || 'Erro ao enviar nota fiscal'))
  } finally {
    invoiceUploading.value = null
    invoiceTarget.value = null
    e.target.value = ''
  }
}

async function handleDeleteInvoice(item) {
  if (!confirm('Remover a nota fiscal?')) return
  try {
    await deleteInvoice(item.id)
    props.showToast?.('✅ Nota fiscal removida')
  } catch {
    props.showToast?.('❌ Erro ao remover nota fiscal')
  }
}

function invoiceUrl(item) {
  if (!item?.invoice_url) return null
  const base = import.meta.env.VITE_API_URL || '/api'
  return item.invoice_url.startsWith('http') ? item.invoice_url : base.replace('/api', '') + item.invoice_url
}

function openEditPayable(c) {
  editingPayable.value = c
  editForm.value = {
    value: c.value,
    due_date: c.due_date?.split('T')[0] || '',
    description: c.description || c.document || '',
    category: c.category || 'administrativo',
    obs: c.obs || '',
    vehicle_id: c.vehicle_id || null,
    supplier_id: c.supplier_id || null,
    supplier_name_free: c.supplier_name_free || null,
  }
  editPlateInput.value = c.vehicle_plate || ''
  editSupplierSearch.value = c.supplier_name || c.supplier_name_free || ''
  editError.value = ''
}

async function saveEditPayable() {
  if (!editForm.value.value || !editForm.value.due_date) { editError.value = 'Valor e vencimento obrigatórios'; return }
  editSaving.value = true
  editError.value = ''
  // Captura texto livre direto do campo caso o blur/timeout não tenha rodado ainda
  const supplierFree = editForm.value.supplier_id ? null : (editSupplierSearch.value.trim() || null)
  try {
    await update(editingPayable.value.id, {
      value: Number(editForm.value.value),
      due_date: editForm.value.due_date,
      description: editForm.value.description || null,
      category: editForm.value.category,
      obs: editForm.value.obs || null,
      driver_id: editingPayable.value.driver_id || null,
      vehicle_id: editForm.value.vehicle_id || null,
      supplier_id: editForm.value.supplier_id || null,
      supplier_name_free: supplierFree,
      document: editingPayable.value.document || null,
      issue_date: editingPayable.value.issue_date ? String(editingPayable.value.issue_date).split('T')[0] : null,
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
  fetchVehicles()
  fetchSuppliers()
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
    <!-- Hidden file input para notas fiscais -->
    <input
      ref="invoiceInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      class="hidden"
      @change="handleInvoiceFile"
    />

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
      <div class="glass rounded-[11px] py-3 px-[18px] mb-3.5 space-y-2.5">
        <!-- linha 1: status + categoria -->
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-500">STATUS:</span>
          <button class="sbtn" :class="{ on: cpFilter === 'all' }" @click="cpFilter = 'all'">Todas</button>
          <button class="sbtn" :class="{ on: cpFilter === 'pendente' }" @click="cpFilter = 'pendente'">Pendentes</button>
          <button class="sbtn" :class="{ on: cpFilter === 'pago' }" @click="cpFilter = 'pago'">Pagas</button>
          <div class="w-px h-5 bg-stone-200" />
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
          <select v-model="cpDriverFilter" class="text-xs border border-stone-200 rounded-md px-2 py-1.5 min-w-[180px]">
            <option value="">Todos os motoristas</option>
            <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <button
            v-if="cpDriverFilter"
            @click="cpDriverFilter = ''"
            class="text-xs text-slate-400 hover:text-stone-600 underline"
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
      <div class="glass rounded-xl overflow-hidden">
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
                <div class="font-semibold text-stone-800">{{ fmtDate(c.due_date) }}</div>
                <span v-if="dueBadge(c.due_date, c.status)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" :class="dueBadge(c.due_date, c.status).cls">
                  {{ dueBadge(c.due_date, c.status).label }}
                </span>
              </td>
              <td class="td font-extrabold text-stone-800 whitespace-nowrap">R$ {{ fmt(c.value) }}</td>
              <td class="td text-xs max-w-[200px] truncate">{{ c.description || c.document || '—' }}</td>
              <td class="td">
                <span v-if="c.vehicle_plate" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ c.vehicle_plate }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
              <td class="td font-semibold text-stone-800 text-xs">{{ c.driver_name || '—' }}</td>
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
                    class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
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
                  <!-- Upload comprovante -->
                  <button
                    @click="triggerReceiptUpload(c)"
                    title="Comprovante de pagamento"
                    class="p-1.5 rounded-md transition-colors inline-flex"
                    :class="c.receipt_url ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-amber-500 bg-amber-50 hover:bg-amber-100'"
                    :disabled="receiptUploading === c.id"
                  >
                    <svg v-if="receiptUploading === c.id" class="animate-spin" width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 002 12h2a8 8 0 018-8z"/></svg>
                    <svg v-else width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M21.586 10.461l-7.047-7.047a2 2 0 00-2.828 0L4 11.125V20h8.875l7.711-7.711a2 2 0 000-2.828zm-8.875 7.539H6v-6.703L12.703 4l6.703 6.703L12.711 18zM10 18l-1-4 4 1-3 3z"/></svg>
                  </button>
                  <!-- Upload nota fiscal -->
                  <button
                    @click="triggerInvoiceUpload(c)"
                    title="Nota Fiscal"
                    class="p-1.5 rounded-md transition-colors inline-flex"
                    :class="c.invoice_url ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-stone-400 bg-stone-50 hover:bg-stone-100'"
                    :disabled="invoiceUploading === c.id"
                  >
                    <svg v-if="invoiceUploading === c.id" class="animate-spin" width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 002 12h2a8 8 0 018-8z"/></svg>
                    <svg v-else width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  </button>
                  <button v-if="c.status === 'pendente'" @click="handleMarkPaid(c)" class="btn-p !py-1.5 !px-3 text-xs">
                    Pagar
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
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 class="text-base font-bold text-stone-800 m-0">Editar Conta a Pagar</h3>
            <button @click="editingPayable = null" class="text-slate-400 hover:text-stone-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Valor (R$) *</label>
                <input v-model="editForm.value" type="number" step="0.01" min="0" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Vencimento *</label>
                <input v-model="editForm.due_date" type="date" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Descrição</label>
              <input v-model="editForm.description" type="text" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Categoria</label>
              <select v-model="editForm.category" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="manutencao">Manutenção</option>
                <option value="pecas">Peças</option>
                <option value="pneus">Pneus (serv.)</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>
            <!-- Placa -->
            <div class="relative">
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Placa</label>
              <input
                v-model="editPlateInput"
                type="text"
                placeholder="Ex: ABC1D23"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                @focus="editPlateOpen = true"
                @blur="blurEditPlate"
                @input="editForm.vehicle_id = null"
              />
              <ul v-if="editPlateOpen && editPlateSuggestions.length" class="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto text-sm">
                <li v-for="v in editPlateSuggestions" :key="v.id"
                  class="px-3 py-2 cursor-pointer hover:bg-blue-50 font-mono font-bold text-slate-700"
                  @mousedown.prevent="selectEditPlate(v.plate)">
                  {{ v.plate }} <span class="font-normal text-slate-400 ml-2">{{ v.brand }} {{ v.model }}</span>
                </li>
              </ul>
            </div>

            <!-- Fornecedor -->
            <div class="relative">
              <label class="block text-xs font-bold text-stone-600 mb-1.5">
                Fornecedor
                <span v-if="editForm.supplier_id" class="ml-1.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">cadastrado</span>
                <span v-else-if="editSupplierSearch" class="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">livre</span>
              </label>
              <div class="relative">
                <input
                  v-model="editSupplierSearch"
                  type="text"
                  placeholder="Nome do fornecedor (cadastrado ou livre)"
                  class="w-full border rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2"
                  :class="editForm.supplier_id ? 'border-green-300 focus:ring-green-400' : 'border-stone-200 focus:ring-blue-500'"
                  @focus="editSupplierOpen = true"
                  @blur="blurEditSupplier"
                  @input="editForm.supplier_id = null; editForm.supplier_name_free = null"
                />
                <button v-if="editSupplierSearch" @mousedown.prevent="clearEditSupplier" type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
              <ul v-if="editSupplierOpen && editSupplierFiltered.length" class="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto text-sm">
                <li v-for="s in editSupplierFiltered" :key="s.id"
                  class="px-3 py-2 cursor-pointer hover:bg-blue-50 text-slate-700"
                  @mousedown.prevent="selectEditSupplier(s)">
                  {{ s.name }}
                </li>
              </ul>
            </div>

            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Observação</label>
              <textarea v-model="editForm.obs" rows="2" class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <p v-if="editError" class="text-red-500 text-xs">{{ editError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="editingPayable = null" class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50">Cancelar</button>
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
        <div class="relative glass-strong rounded-2xl w-full max-w-[500px] overflow-hidden">
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
              <div class="text-sm text-stone-600 rounded-lg p-3 bg-stone-50 border border-stone-100">{{ viewingPayable.obs }}</div>
            </div>
            <!-- Comprovante de pagamento -->
            <div v-if="viewingPayable.receipt_url" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Comprovante de Pagamento</div>
              <div v-if="isImage(viewingPayable.receipt_url)" class="rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                <img
                  :src="receiptUrl(viewingPayable)"
                  alt="Comprovante"
                  class="w-full max-h-[300px] object-contain cursor-pointer"
                  @click="window.open(receiptUrl(viewingPayable), '_blank')"
                />
              </div>
              <a
                v-else
                :href="receiptUrl(viewingPayable)"
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                Ver PDF
              </a>
              <div class="mt-2 flex items-center gap-3">
                <a
                  :href="receiptUrl(viewingPayable)"
                  :download="'comprovante_' + viewingPayable.id"
                  class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  Baixar
                </a>
                <button
                  @click="handleDeleteReceipt(viewingPayable)"
                  class="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remover comprovante
                </button>
              </div>
            </div>
            <!-- Nota Fiscal -->
            <div v-if="viewingPayable.invoice_url" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nota Fiscal</div>
              <div v-if="isImage(viewingPayable.invoice_url)" class="rounded-lg overflow-hidden border border-purple-200 bg-purple-50/30">
                <img
                  :src="invoiceUrl(viewingPayable)"
                  alt="Nota Fiscal"
                  class="w-full max-h-[300px] object-contain cursor-pointer"
                  @click="window.open(invoiceUrl(viewingPayable), '_blank')"
                />
              </div>
              <a
                v-else
                :href="invoiceUrl(viewingPayable)"
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors border border-purple-200"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                Ver PDF
              </a>
              <div class="mt-2 flex items-center gap-3">
                <a
                  :href="invoiceUrl(viewingPayable)"
                  :download="'nota_fiscal_' + viewingPayable.id"
                  class="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-semibold"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  Baixar
                </a>
                <button
                  @click="handleDeleteInvoice(viewingPayable)"
                  class="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remover nota fiscal
                </button>
              </div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button @click="viewingPayable = null" class="px-5 py-2 bg-stone-100/70 hover:bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
