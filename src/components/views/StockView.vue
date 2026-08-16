<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStock } from '../../composables/useStock'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import { api } from '../../composables/useApi'
import KPICard from '../ui/KPICard.vue'
import { useConfirm } from '../../composables/useConfirm'
import { printTable } from '../../utils/printTable'
import { exportExcelGeneric, exportWordGeneric } from '../../utils/exportTable'

const props = defineProps({ showToast: Function })

const { items, movements, loading, fetchAll, fetchMovements, createMovement, remove, removeMovement, uploadInvoice, deleteInvoice } = useStock()
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()
const { confirmAction } = useConfirm()

async function deleteStock(s) {
  if (!await confirmAction({ title: 'Excluir item do estoque', message: `Tem certeza que deseja excluir "${s.description}"?`, confirmText: 'Excluir' })) return
  try {
    await remove(s.id)
    props.showToast?.('Item excluído')
  } catch {
    props.showToast?.('❌ Erro ao excluir item')
  }
}

async function deleteMovement(m) {
  if (!await confirmAction({ title: 'Excluir movimentação', message: `Excluir a movimentação de ${m.qty} un de "${m.item_name || 'item'}"? O saldo do estoque será recalculado.`, confirmText: 'Excluir' })) return
  try {
    await removeMovement(m.id)
    props.showToast?.('Movimentação excluída')
  } catch {
    props.showToast?.('❌ Erro ao excluir movimentação')
  }
}

const sFilter = ref('all')
const sSort = ref('qty-desc')

// ── Saída
const exitModal = ref(null)
const exitForm = ref({ driver_id: '', qty: '', mov_date: '', vehicle_plate: '', obs: '' })

// Auto-preenche placa ao selecionar motorista
watch(() => exitForm.value.driver_id, (id) => {
  const driver = drivers.value.find(d => d.id == id)
  exitForm.value.vehicle_plate = driver?.truck_plate || ''
})

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

// ── Upload de NF no modal de entrada
const entryInvoiceFile = ref(null)
const entryInvoicePreview = ref('')
const entryInvoiceInput = ref(null)

function selectEntryInvoice() {
  entryInvoiceInput.value?.click()
}

function onEntryInvoiceSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const isImage = /^image\/(jpeg|png|webp)$/i.test(file.type)
  if (file.size > (isImage ? 30 : 10) * 1024 * 1024) {
    props.showToast?.(`❌ ${isImage ? 'A imagem deve ter no máximo 30 MB' : 'O PDF deve ter no máximo 10 MB'}`)
    return
  }
  if (!/\.(jpg|jpeg|png|pdf|webp)$/i.test(file.name)) {
    props.showToast?.('❌ Formato inválido. Use JPG, PNG, WEBP ou PDF')
    return
  }
  if (entryInvoicePreview.value) URL.revokeObjectURL(entryInvoicePreview.value)
  entryInvoiceFile.value = file
  entryInvoicePreview.value = isImage ? URL.createObjectURL(file) : ''
}

function clearEntryInvoice() {
  if (entryInvoicePreview.value) URL.revokeObjectURL(entryInvoicePreview.value)
  entryInvoicePreview.value = ''
  entryInvoiceFile.value = null
}

const entryFileSize = computed(() => entryInvoiceFile.value ? `${(entryInvoiceFile.value.size / 1024 / 1024).toFixed(2)} MB` : '')

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
  exitForm.value = { driver_id: '', qty: '', mov_date: new Date().toISOString().split('T')[0], vehicle_plate: '', obs: '' }
}

async function confirmExit() {
  if (!exitForm.value.qty) return
  const exitConfirmed = await confirmAction({
    title: 'Confirmar saída de estoque',
    message: `Registrar a saída de ${exitForm.value.qty} unidade(s) de "${exitModal.value.description}"?`,
    confirmText: 'Registrar saída',
    tone: 'primary',
  })
  if (!exitConfirmed) return
  try {
    const plate = (exitForm.value.vehicle_plate || '').trim().toUpperCase()
    const matchedVehicle = plate ? vehicles.value.find(v => v.plate.toUpperCase() === plate) : null
    const obsText = [
      exitForm.value.obs || '',
      plate && !matchedVehicle ? `Placa: ${plate}` : '',
    ].filter(Boolean).join(' | ') || null

    await createMovement({
      type: 'saida',
      stock_item_id: exitModal.value.id,
      driver_id: exitForm.value.driver_id || null,
      vehicle_id: matchedVehicle ? matchedVehicle.id : null,
      qty: Number(exitForm.value.qty),
      unit_value: exitModal.value.unit_price || null,
      mov_date: exitForm.value.mov_date || new Date().toISOString().split('T')[0],
      obs: obsText,
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
  clearEntryInvoice()
  showEntryModal.value = true
}

const selectedStockItem = computed(() => items.value.find(i => i.id == entryForm.value.stock_item_id) || null)

async function confirmEntry() {
  if (!entryForm.value.qty || Number(entryForm.value.qty) <= 0) return
  const itemLabel = entryMode.value === 'new' ? entryForm.value.description : selectedStockItem.value?.description
  const entryConfirmed = await confirmAction({
    title: 'Confirmar entrada de estoque',
    message: `Registrar a entrada de ${entryForm.value.qty} unidade(s) de "${itemLabel || 'novo item'}"?`,
    confirmText: 'Registrar entrada',
    tone: 'primary',
  })
  if (!entryConfirmed) return
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

    let successMsg = `✅ Entrada registrada: ${entryForm.value.qty} pneus`
    if (entryInvoiceFile.value) {
      try {
        await uploadInvoice(stockItemId, entryInvoiceFile.value)
        successMsg += ' com nota fiscal'
      } catch {
        props.showToast?.('⚠️ Entrada salva, mas a nota fiscal não foi enviada')
      }
    }
    props.showToast?.(successMsg)
    clearEntryInvoice()
    showEntryModal.value = false
  } catch (e) {
    props.showToast?.('❌ Erro ao registrar entrada')
  } finally {
    entrySaving.value = false
  }
}

// ── Upload de Nota Fiscal
const invoiceUploading = ref(null)
const invoiceInput = ref(null)
const invoiceTarget = ref(null)
const viewingInvoice = ref(null)

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
  } catch {
    props.showToast?.('❌ Erro ao enviar nota fiscal')
  } finally {
    invoiceUploading.value = null
    invoiceTarget.value = null
    e.target.value = ''
  }
}

async function handleDeleteInvoice(item) {
  if (!await confirmAction({ title: 'Remover nota fiscal', message: `Remover a nota fiscal de "${item.description}"?`, confirmText: 'Remover' })) return
  try {
    await deleteInvoice(item.id)
    props.showToast?.('Nota fiscal removida')
  } catch {
    props.showToast?.('❌ Erro ao remover nota fiscal')
  }
}

function invoiceUrl(item) {
  return item.invoice_access_url || item.invoice_url || null
}

const fmtValue = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
function fmtDate(raw) {
  if (!raw) return '—'
  const s = String(raw).substring(0, 10)
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

// ── Rastreio de pneu
const trackingItem = ref(null)
const trackingMovements = ref([])
const trackingLoading = ref(false)
const trackingFilter = ref('')

async function openTracking(item) {
  trackingItem.value = item
  trackingMovements.value = []
  trackingFilter.value = ''
  trackingLoading.value = true
  try {
    trackingMovements.value = await api.get(`/stock/movements?stock_item_id=${item.id}`)
  } finally {
    trackingLoading.value = false
  }
}

const trackingTotalSaida = computed(() => trackingMovements.value.filter(m => m.type === 'saida').reduce((s, m) => s + Number(m.qty), 0))
const trackingFiltered = computed(() => {
  if (!trackingFilter.value) return trackingMovements.value
  return trackingMovements.value.filter(m => m.type === trackingFilter.value)
})

function buildExportData() {
  const statusLabel = { novo: 'Novo', recapado: 'Recapado', usado: 'Usado' }
  return {
    title: 'Estoque de Pneus',
    subtitle: sFilter.value !== 'all' ? `Filtro: ${statusLabel[sFilter.value]}` : null,
    headers: ['Descrição', 'Marca', 'NF', 'Status', 'Qtd', 'Preço Un.', 'Fornecedor', 'Entrada'],
    rows: filteredStock.value.map(s => ({ type: 'row', data: [
      s.description,
      s.brand || '',
      s.nf_number || '',
      statusLabel[s.status] || s.status,
      Number(s.qty),
      Number(s.unit_price || 0),
      s.supplier_name || '',
      fmtDate(s.entry_date),
    ]})),
    totalLabel: 'Total de itens',
    totalValue: filteredStock.value.reduce((s, i) => s + Number(i.qty), 0),
    moneyCols: [5],
  }
}
function handlePrint() { const d = buildExportData(); printTable({ ...d, totals: { label: d.totalLabel, value: d.totalValue } }) }
function handleExcel() { exportExcelGeneric(buildExportData()) }
function handleWord() { exportWordGeneric(buildExportData()) }

onMounted(() => {
  fetchAll()
  fetchMovements()
  fetchDrivers()
  fetchVehicles()
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
    <div class="glass rounded-[11px] py-3 px-[18px] mb-3.5 flex gap-2.5 items-center flex-wrap">
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
        <div class="w-px h-5 bg-stone-200" />
        <button @click="handlePrint" class="sbtn flex items-center gap-1" title="Imprimir / PDF">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
          PDF
        </button>
        <button @click="handleExcel" class="sbtn flex items-center gap-1" title="Exportar Excel">Excel</button>
        <button @click="handleWord" class="sbtn flex items-center gap-1" title="Exportar Word">Word</button>
      </div>
    </div>

    <!-- Hidden file input para NF -->
    <input ref="invoiceInput" type="file" accept="image/*,.pdf" class="hidden" @change="handleInvoiceFile" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-10 text-slate-400 text-sm">Carregando...</div>

    <!-- Stock Table -->
    <div v-else class="glass rounded-xl overflow-hidden mb-5">
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
              <div class="font-bold text-stone-800 text-[13px]">{{ s.description }}</div>
              <div v-if="s.brand" class="text-[10.5px] text-slate-400 mt-px">{{ s.brand }}</div>
            </td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="s.status === 'novo' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                {{ s.status === 'novo' ? 'Novo' : 'Recapado' }}
              </span>
            </td>
            <td class="td">
              <span class="text-[22px] font-extrabold text-stone-800">{{ s.qty }}</span>
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
              <div class="flex items-center gap-1.5">
                <span v-if="s.nf_number" class="font-mono text-[11.5px] bg-stone-100/70 px-2 py-[3px] rounded-[5px] text-stone-600 font-bold">NF {{ s.nf_number }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
                <!-- Botão upload NF -->
                <button
                  v-if="!invoiceUrl(s)"
                  @click.stop="triggerInvoiceUpload(s)"
                  :disabled="invoiceUploading === s.id"
                  title="Anexar nota fiscal"
                  class="text-purple-600 bg-purple-50 hover:bg-purple-100 p-1 rounded-md transition-colors inline-flex"
                >
                  <svg v-if="invoiceUploading === s.id" class="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity=".3"/><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  <svg v-else width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-6-4.5v3h-2v-3H8l4-4 4 4h-2z"/></svg>
                </button>
                <!-- Botões ver/excluir NF -->
                <template v-if="invoiceUrl(s)">
                  <a :href="invoiceUrl(s)" target="_blank" title="Ver nota fiscal" class="text-purple-600 bg-purple-50 hover:bg-purple-100 p-1 rounded-md transition-colors inline-flex">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
                  </a>
                  <button @click.stop="handleDeleteInvoice(s)" title="Remover nota fiscal" class="text-red-500 bg-red-50 hover:bg-red-100 p-1 rounded-md transition-colors inline-flex">
                    <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </template>
              </div>
            </td>
            <td class="td text-slate-500 text-xs">{{ fmtDate(s.entry_date) }}</td>
            <td class="td text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button @click="openTracking(s)" title="Rastreio" class="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-md transition-colors inline-flex">
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                </button>
                <button @click="openExit(s)" class="btn-p !py-1.5 !px-3 text-xs" :disabled="s.qty <= 0">Registrar Saída</button>
                <button
                  @click="deleteStock(s)"
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
      <div v-if="!filteredStock.length" class="text-center text-slate-400 text-xs py-10">Nenhum item em estoque</div>
    </div>

    <!-- Recent Movements -->
    <div class="glass rounded-xl overflow-hidden">
      <div class="px-[22px] py-[17px] border-b border-stone-100 flex items-center justify-between">
        <h3 class="m-0 text-sm font-bold text-stone-800">Movimentações Recentes</h3>
        <span class="text-xs text-slate-400">Entradas e saídas de estoque</span>
      </div>
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data</th><th class="th">Tipo</th><th class="th">Item</th>
            <th class="th">Motorista</th><th class="th">Placa</th><th class="th">Qtd</th><th class="th">Obs</th><th class="th w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="m in movements" :key="m.id">
            <td class="td text-xs">{{ fmtDate(m.mov_date) }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" :class="m.type === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600'">
                {{ m.type === 'entrada' ? '↓ Entrada' : '↑ Saída' }}
              </span>
            </td>
            <td class="td text-xs font-semibold">{{ m.item_name || '—' }}</td>
            <td class="td text-xs">{{ m.driver_name || '—' }}</td>
            <td class="td">
              <span v-if="m.vehicle_plate" class="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ m.vehicle_plate }}</span>
              <span v-else class="text-stone-600 text-xs">—</span>
            </td>
            <td class="td font-bold text-stone-800">{{ m.qty }}</td>
            <td class="td text-xs text-slate-500 max-w-[180px] truncate">{{ m.obs || '—' }}</td>
            <td class="td text-center">
              <button
                @click.stop="deleteMovement(m)"
                title="Excluir"
                class="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex"
              >
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!movements.length" class="text-center text-slate-400 text-xs py-8">Nenhuma movimentação registrada</div>
    </div>

    <!-- Exit Modal -->
    <Teleport to="body">
      <div v-if="exitModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="exitModal = null">
        <div class="glass-strong rounded-xl w-[420px]">
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
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Placa</label>
                <input
                  v-model="exitForm.vehicle_plate"
                  type="text"
                  placeholder="Placa do veículo"
                  class="finput font-mono uppercase"
                  maxlength="12"
                />
                <p v-if="exitForm.driver_id && !exitForm.vehicle_plate" class="text-[10px] text-slate-400 mt-1">Motorista sem placa vinculada</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input v-model="exitForm.qty" type="number" min="1" :max="exitModal.qty" :placeholder="`Máx: ${exitModal.qty}`" class="finput" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input v-model="exitForm.mov_date" type="date" class="finput" />
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação</label>
                <input v-model="exitForm.obs" type="text" placeholder="Ex: troca preventiva dianteiro..." class="finput" />
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-stone-100 flex justify-between items-center">
              <button @click="exitModal = null" class="px-4 py-2 bg-transparent border border-stone-200 rounded-lg text-stone-600 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button @click="confirmExit" class="btn-p" :disabled="!exitForm.qty">Confirmar Saída</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Tracking Modal -->
    <Teleport to="body">
      <div v-if="trackingItem" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="trackingItem = null">
        <div class="glass-strong rounded-2xl w-full max-w-[720px] overflow-hidden">
          <div class="bg-gradient-to-br from-indigo-700 to-indigo-900 px-7 py-5 flex items-center justify-between">
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">Rastreio de Pneu</h3>
              <p class="mt-1 mb-0 text-xs text-indigo-200">{{ trackingItem.description }} {{ trackingItem.brand ? `· ${trackingItem.brand}` : '' }}</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-[10px] text-indigo-300 uppercase font-bold">Estoque Atual</div>
                <div class="text-white font-extrabold text-lg">{{ trackingItem.qty }}</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] text-indigo-300 uppercase font-bold">Total Saídas</div>
                <div class="text-orange-300 font-extrabold text-lg">{{ trackingTotalSaida }}</div>
              </div>
            </div>
          </div>
          <div class="px-7 py-3 border-b border-stone-100 flex items-center gap-2">
            <button class="sbtn" :class="{ on: !trackingFilter }" @click="trackingFilter = ''">Todos</button>
            <button class="sbtn" :class="{ on: trackingFilter === 'saida' }" @click="trackingFilter = 'saida'">Saídas</button>
            <button class="sbtn" :class="{ on: trackingFilter === 'entrada' }" @click="trackingFilter = 'entrada'">Entradas</button>
            <span class="text-[10px] text-slate-400 ml-auto">{{ trackingFiltered.length }} registro{{ trackingFiltered.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <div v-if="trackingLoading" class="flex items-center justify-center py-12 text-slate-400 text-sm">Carregando...</div>
            <table v-else-if="trackingFiltered.length" class="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th class="th">Data</th>
                  <th class="th">Tipo</th>
                  <th class="th">Motorista</th>
                  <th class="th">Veículo</th>
                  <th class="th">Qtd</th>
                  <th class="th">Observação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in trackingFiltered" :key="m.id" class="trow">
                  <td class="td text-xs whitespace-nowrap">{{ fmtDate(m.mov_date) }}</td>
                  <td class="td">
                    <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                      :class="m.type === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600'">
                      {{ m.type === 'entrada' ? '↓ Entrada' : '↑ Saída' }}
                    </span>
                  </td>
                  <td class="td text-xs">{{ m.driver_name || '—' }}</td>
                  <td class="td">
                    <span v-if="m.vehicle_plate" class="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">{{ m.vehicle_plate }}</span>
                    <span v-else class="text-xs text-slate-400">—</span>
                  </td>
                  <td class="td font-bold text-stone-800">{{ m.qty }}</td>
                  <td class="td text-xs text-slate-500 max-w-[200px]" :title="m.obs">{{ m.obs || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center text-slate-400 text-xs py-12">
              {{ trackingMovements.length ? 'Nenhum resultado para o filtro' : 'Nenhuma movimentação registrada para este pneu' }}
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button @click="trackingItem = null" class="px-4 py-2 bg-transparent border border-stone-200 rounded-lg text-stone-600 text-xs font-semibold cursor-pointer">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Entry Modal -->
    <Teleport to="body">
      <div v-if="showEntryModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" @click.self="showEntryModal = false">
        <div class="glass-strong rounded-xl w-[680px] max-h-[90vh] overflow-y-auto">
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
                :class="entryMode === 'existing' ? 'border-green-600 bg-green-50 text-green-700' : 'border-stone-200 text-slate-500'"
              >
                Item Existente
              </button>
              <button
                @click="entryMode = 'new'"
                class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
                :class="entryMode === 'new' ? 'border-green-600 bg-green-50 text-green-700' : 'border-stone-200 text-slate-500'"
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
              <div v-if="selectedStockItem" class="rounded-lg p-3 bg-stone-50 border border-stone-200">
                <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Item selecionado</div>
                <div class="flex justify-between items-center">
                  <div>
                    <div class="text-sm font-bold text-stone-800">{{ selectedStockItem.description }}</div>
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
                    :class="entryForm.status === 'novo' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-stone-200 text-slate-500'"
                  >
                    Novo
                  </button>
                  <button
                    @click="entryForm.status = 'recapado'"
                    class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
                    :class="entryForm.status === 'recapado' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-stone-200 text-slate-500'"
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

            <!-- Campos comuns (qtd, data, NF, obs) -->
            <div class="space-y-4 mt-4 pt-4 border-t border-stone-100">
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
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nota Fiscal <span class="font-normal normal-case text-slate-400">(imagem ou PDF)</span></label>
                <input ref="entryInvoiceInput" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" class="hidden" @change="onEntryInvoiceSelected" />
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed transition-colors cursor-pointer text-left"
                    :class="entryInvoiceFile ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-stone-300 bg-stone-50/60 text-stone-500 hover:bg-stone-100'"
                    @click="selectEntryInvoice"
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" class="flex-shrink-0"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm1 7V3.5L18.5 9H15zm-4 9H9v-4H6l4-4 4 4h-3v4z"/></svg>
                    <img v-if="entryInvoicePreview" :src="entryInvoicePreview" class="h-9 w-9 rounded-md object-cover" alt="Prévia" />
                    <span class="min-w-0"><span class="block truncate text-[12px] font-semibold">{{ entryInvoiceFile ? entryInvoiceFile.name : 'Selecionar arquivo da nota fiscal' }}</span><small v-if="entryInvoiceFile" class="block text-[10px] opacity-70">{{ entryFileSize }} · pronta para enviar</small></span>
                  </button>
                  <button
                    v-if="entryInvoiceFile"
                    type="button"
                    class="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-[12px] font-semibold cursor-pointer border border-red-100"
                    @click="clearEntryInvoice"
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação</label>
                <input v-model="entryForm.obs" type="text" placeholder="Info adicional..." class="finput" />
              </div>
            </div>

            <div class="mt-5 pt-4 border-t border-stone-100 flex justify-between items-center">
              <button @click="showEntryModal = false" class="px-4 py-2 bg-transparent border border-stone-200 rounded-lg text-stone-600 text-xs font-semibold cursor-pointer">Cancelar</button>
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
