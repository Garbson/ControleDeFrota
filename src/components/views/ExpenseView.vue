<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDrivers } from '../../composables/useDrivers'
import { useVehicles } from '../../composables/useVehicles'
import { useSuppliers } from '../../composables/useSuppliers'
import { usePayable } from '../../composables/usePayable'
import { api } from '../../composables/useApi'

const props = defineProps({ showToast: Function })
const { drivers, fetchAll: fetchDrivers } = useDrivers()
const { vehicles, fetchAll: fetchVehicles } = useVehicles()
const { suppliers, fetchAll: fetchSuppliers, create: createSupplier } = useSuppliers()
const { uploadInvoice } = usePayable()

const today = new Date().toISOString().split('T')[0]
const form = ref({ driver_id: '', type: '', qty: 1, value: '', date: today, due_date: today, description: '', obs: '', plate: '', vehicle_id: '', supplier_id: '', supplier_name_free: null })
const invoiceFile = ref(null)
const invoicePreview = ref('')
const invoiceInput = ref(null)
const submitting = ref(false)

function selectInvoice() {
  invoiceInput.value?.click()
}

function onInvoiceSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  const isImageFile = /^image\/(jpeg|png|webp)$/i.test(file.type)
  const maxOriginalSize = isImageFile ? 30 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxOriginalSize) {
    props.showToast?.(`❌ ${isImageFile ? 'A imagem deve ter no máximo 30 MB' : 'O PDF deve ter no máximo 10 MB'}`)
    return
  }

  if (!/\.(jpg|jpeg|png|pdf|webp)$/i.test(file.name)) {
    props.showToast?.('❌ Formato inválido. Use JPG, PNG, WEBP ou PDF')
    return
  }

  if (invoicePreview.value) URL.revokeObjectURL(invoicePreview.value)
  invoiceFile.value = file
  invoicePreview.value = isImageFile ? URL.createObjectURL(file) : ''
}

function clearInvoice() {
  if (invoicePreview.value) URL.revokeObjectURL(invoicePreview.value)
  invoicePreview.value = ''
  invoiceFile.value = null
}

const fileSize = computed(() => invoiceFile.value ? `${(invoiceFile.value.size / 1024 / 1024).toFixed(2)} MB` : '')

// ── Placa: auto-preenche com a placa do motorista selecionado
const plateInput = ref('')
const plateSuggestions = computed(() => {
  if (!plateInput.value) return vehicles.value.slice(0, 15)
  const q = plateInput.value.toLowerCase()
  return vehicles.value.filter(v => v.plate.toLowerCase().includes(q)).slice(0, 15)
})

watch(() => form.value.driver_id, (newId) => {
  if (!newId || newId === '__outros__') {
    form.value.plate = ''
    form.value.vehicle_id = ''
    plateInput.value = ''
    return
  }
  const driver = drivers.value.find(d => d.id == newId)
  if (driver?.truck_plate) {
    form.value.plate = driver.truck_plate
    plateInput.value = driver.truck_plate
    // busca o vehicle_id correspondente
    const v = vehicles.value.find(v => v.plate === driver.truck_plate)
    form.value.vehicle_id = v?.id || ''
  } else {
    form.value.plate = ''
    form.value.vehicle_id = ''
    plateInput.value = ''
  }
})

function selectPlate(plate) {
  const normalized = String(plate || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8)
  plateInput.value = normalized
  form.value.plate = normalized
  const v = vehicles.value.find(v => v.plate === normalized)
  form.value.vehicle_id = v?.id || ''
}

// ── Fornecedor: busca por nome ou CNPJ
const supplierSearch = ref('')
const showSupplierDropdown = ref(false)
const supplierCreating = ref(false)

const supplierExactMatch = computed(() => {
  if (!supplierSearch.value) return null
  const q = supplierSearch.value.toLowerCase().trim()
  return suppliers.value.find(s =>
    s.name.toLowerCase() === q || (s.cnpj && s.cnpj.replace(/\D/g, '') === q.replace(/\D/g, ''))
  ) || null
})

const supplierFiltered = computed(() => {
  if (!supplierSearch.value) return suppliers.value.slice(0, 15)
  const q = supplierSearch.value.toLowerCase()
  const matches = suppliers.value.filter(s =>
    s.name.toLowerCase().includes(q) || (s.cnpj && s.cnpj.includes(q))
  ).slice(0, 15)
  return matches
})

const showCreateOption = computed(() => {
  return supplierSearch.value.trim().length >= 2 && !supplierExactMatch.value
})

function selectSupplier(s) {
  supplierSearch.value = s.name
  form.value.supplier_id = s.id
  showSupplierDropdown.value = false
}

async function createNewSupplier() {
  const name = supplierSearch.value.trim()
  if (!name || name.length < 2) return
  supplierCreating.value = true
  try {
    const result = await createSupplier({ name })
    form.value.supplier_id = result.id
    supplierSearch.value = name
    showSupplierDropdown.value = false
    props.showToast?.(`✅ Fornecedor "${name}" criado`)
  } catch (err) {
    props.showToast?.('❌ Erro ao criar fornecedor: ' + (err.message || ''))
  } finally {
    supplierCreating.value = false
  }
}

function clearSupplier() {
  supplierSearch.value = ''
  form.value.supplier_id = ''
}

function blurSupplier() {
  setTimeout(() => { showSupplierDropdown.value = false }, 200)
}

const parcelar = ref(false)
const numParcelas = ref(2)
const customParcelas = ref([])

const expenseTypes = { pneu: 'Pneu', combustivel: 'Combustível', manutencao: 'Manutenção', pedagio: 'Pedágio', outros: 'Outros' }

const isOutros = computed(() => form.value.driver_id === '__outros__')

const formDriverName = computed(() => {
  if (isOutros.value) return 'Outros'
  return drivers.value.find(d => d.id == form.value.driver_id)?.name || ''
})

const formSupplierName = computed(() => {
  if (!form.value.supplier_id) return ''
  return suppliers.value.find(s => s.id == form.value.supplier_id)?.name || ''
})

const supplierValid = computed(() => Boolean(form.value.supplier_id || supplierSearch.value.trim().length >= 2))
const formValid = computed(() => form.value.driver_id && form.value.type && Number(form.value.value) > 0 && form.value.date && supplierValid.value && (!parcelar.value || totalDiff.value < 0.01))

const totalParcelas = computed(() => customParcelas.value.reduce((s, p) => s + Number(p.value || 0), 0))
const totalDiff = computed(() => parcelar.value && form.value.value ? Math.abs(totalParcelas.value - Number(form.value.value)) : 0)

function buildParcelas() {
  if (!parcelar.value) return
  const base = new Date(((form.value.due_date || form.value.date) || new Date().toISOString().split('T')[0]) + 'T00:00:00')
  const total = Number(form.value.value) || 0
  const unit = total > 0 ? parseFloat((total / numParcelas.value).toFixed(2)) : 0
  customParcelas.value = Array.from({ length: numParcelas.value }, (_, i) => {
    const d = new Date(base); d.setMonth(d.getMonth() + i)
    return { date: d.toISOString().split('T')[0], value: unit }
  })
}

watch([parcelar, numParcelas], () => { parcelar.value ? buildParcelas() : (customParcelas.value = []) })
watch([() => form.value.value, () => form.value.due_date, () => form.value.date], () => { if (parcelar.value) buildParcelas() })

function getCategory() {
  if (form.value.type === 'manutencao') return 'manutencao'
  if (form.value.type === 'pneu') return 'pneus'
  if (form.value.type === 'pecas') return 'pecas'
  return 'administrativo'
}

async function submitExpense() {
  if (!formValid.value || submitting.value) return
  submitting.value = true
  const createdIds = []
  let successMessage = ''

  try {
    const category = getCategory()
    const description = form.value.description || expenseTypes[form.value.type]
    const driverId = isOutros.value ? null : (form.value.driver_id || null)
    const supplierId = form.value.supplier_id || null
    const supplierFree = supplierId ? null : (supplierSearch.value.trim() || null)
    if (parcelar.value && customParcelas.value.length >= 2) {
      const total = customParcelas.value.length
      for (let i = 0; i < total; i++) {
        const p = customParcelas.value[i]
        const created = await api.post('/payable', {
          category, description: `${description} (${i + 1}/${total})`,
          driver_id: driverId, issue_date: form.value.date || null,
          value: Number(Number(p.value).toFixed(2)), due_date: p.date, obs: form.value.obs || null,
          vehicle_id: form.value.vehicle_id || null,
          supplier_id: supplierId,
          supplier_name_free: supplierFree,
        })
        createdIds.push(created.id)
      }
      successMessage = `✅ ${total} parcelas lançadas para ${formDriverName.value}`
    } else {
      const created = await api.post('/payable', {
        category, description, driver_id: driverId,
        issue_date: form.value.date || null, value: Number(form.value.value),
        due_date: form.value.due_date || form.value.date, obs: form.value.obs || null,
        vehicle_id: form.value.vehicle_id || null,
        supplier_id: supplierId,
        supplier_name_free: supplierFree,
      })
      createdIds.push(created.id)
      successMessage = `✅ Despesa salva para ${formDriverName.value}`
    }

    if (invoiceFile.value) {
      try {
        for (const id of createdIds) {
          await uploadInvoice(id, invoiceFile.value)
        }
        successMessage += ' com nota fiscal'
      } catch (err) {
        props.showToast?.(`⚠️ Despesa salva, mas a nota fiscal não foi enviada: ${err.message || 'erro no upload'}`)
        resetForm()
        return
      }
    }

    props.showToast?.(successMessage)
    resetForm()
  } catch (err) {
    props.showToast?.(`❌ ${err.message || 'Erro ao salvar despesa'}`)
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.value = { driver_id: '', type: '', qty: 1, value: '', date: today, due_date: today, description: '', obs: '', plate: '', vehicle_id: '', supplier_id: '', supplier_name_free: null }
  plateInput.value = ''
  supplierSearch.value = ''
  clearInvoice()
  parcelar.value = false; numParcelas.value = 2; customParcelas.value = []
}

onMounted(() => {
  fetchDrivers()
  fetchVehicles()
  fetchSuppliers()
})
</script>

<template>
  <div class="flex justify-center py-2">
    <div class="w-full max-w-[680px] glass-strong rounded-2xl overflow-hidden card-enter" style="border:1px solid rgba(0,0,0,0.08)">

      <!-- Header -->
      <div class="px-7 py-5 bg-gradient-to-r from-blue-700 to-blue-600 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
        </div>
        <div>
          <h3 class="m-0 text-[15px] font-bold text-white">Lançamento de Despesa</h3>
          <p class="m-0 text-[11px] text-blue-200/70 mt-0.5">A viagem é vinculada automaticamente pela data do motorista</p>
        </div>
      </div>

      <!-- Form -->
      <div class="px-7 py-6">
        <div class="grid grid-cols-2 gap-4">

          <div>
            <label class="flabel">Motorista *</label>
            <select v-model="form.driver_id" class="finput">
              <option value="">Selecione o motorista...</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
              <option value="__outros__">— Outros</option>
            </select>
          </div>

          <div class="relative">
            <label class="flabel">Placa <span class="font-normal normal-case text-slate-400">(auto do motorista, editável)</span></label>
            <input
              v-model="plateInput"
              type="text"
              placeholder="Digite ou selecione a placa..."
              class="finput"
              list="plate-list"
              @input="selectPlate(plateInput)"
              @focus="$event.target.select()"
            />
            <datalist id="plate-list">
              <option v-for="v in vehicles" :key="v.id" :value="v.plate">{{ v.plate }} — {{ v.brand }} {{ v.model }}</option>
            </datalist>
          </div>

          <div>
            <label class="flabel">Tipo de Despesa *</label>
            <select v-model="form.type" class="finput">
              <option value="">Selecione...</option>
              <option value="pneu">Pneu</option>
              <option value="combustivel">Combustível</option>
              <option value="manutencao">Manutenção</option>
              <option value="pedagio">Pedágio</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label class="flabel">Valor Total (R$) *</label>
            <input v-model="form.value" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0,00" class="finput" :class="form.value && Number(form.value) <= 0 ? '!border-red-400' : ''" />
            <p v-if="form.value && Number(form.value) <= 0" class="mt-1 text-[10px] text-red-500">Informe um valor maior que zero.</p>
          </div>

          <div>
            <label class="flabel">Quantidade <span class="font-normal normal-case text-slate-400">(só pneus)</span></label>
            <input v-model="form.qty" type="number" min="1" placeholder="1" class="finput" :disabled="form.type !== 'pneu'" />
          </div>

          <div>
            <label class="flabel">Data da Despesa *</label>
            <input v-model="form.date" type="date" class="finput" />
          </div>

          <div>
            <label class="flabel">1º Vencimento</label>
            <input v-model="form.due_date" type="date" class="finput" />
            <p class="text-[10px] text-slate-400 mt-1">Se vazio, usa a data da despesa</p>
          </div>

          <div>
            <label class="flabel">Descrição</label>
            <input v-model="form.description" placeholder="Ex: Troca de pneu dianteiro..." class="finput" />
          </div>

          <div>
            <label class="flabel">Observação</label>
            <input v-model="form.obs" placeholder="Informações adicionais..." class="finput" />
          </div>

          <div class="relative">
            <label class="flabel">Fornecedor * <span class="font-normal normal-case text-slate-400">(busca por nome ou CNPJ)</span></label>
            <div class="relative">
              <input
                v-model="supplierSearch"
                type="text"
                placeholder="Digite nome ou CNPJ do fornecedor..."
                class="finput pr-8"
                :class="supplierSearch && !supplierValid ? '!border-red-400' : ''"
                @focus="showSupplierDropdown = true"
                @blur="blurSupplier"
                @input="showSupplierDropdown = true; form.supplier_id = ''"
              />
              <button
                v-if="form.supplier_id"
                @click="clearSupplier"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Limpar fornecedor"
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <p v-if="!supplierValid" class="mt-1 text-[10px] text-amber-600">Selecione um fornecedor ou informe um nome com pelo menos 2 caracteres.</p>
            <!-- Dropdown de sugestões -->
            <div
              v-if="showSupplierDropdown && (supplierFiltered.length || showCreateOption)"
              class="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-[220px] overflow-y-auto"
            >
              <div
                v-for="s in supplierFiltered"
                :key="s.id"
                @mousedown.prevent="selectSupplier(s)"
                class="px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors border-b border-stone-50 last:border-0 flex flex-col"
                :class="{ 'bg-blue-50/50': form.supplier_id === s.id }"
              >
                <span class="text-[13px] font-semibold text-stone-800">{{ s.name }}</span>
                <span v-if="s.cnpj" class="text-[11px] text-slate-400">{{ s.cnpj }}</span>
              </div>
              <!-- Opção de criar novo fornecedor -->
              <div
                v-if="showCreateOption"
                @mousedown.prevent="createNewSupplier()"
                class="px-4 py-2.5 cursor-pointer hover:bg-emerald-50 transition-colors border-b border-stone-50 last:border-0 flex items-center gap-2"
                :class="{ 'opacity-50 pointer-events-none': supplierCreating }"
              >
                <svg v-if="supplierCreating" class="animate-spin" width="14" height="14" fill="#10b981" viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 002 12h2a8 8 0 018-8z"/></svg>
                <svg v-else width="14" height="14" fill="#10b981" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                <span class="text-[13px] font-semibold text-emerald-700">
                  {{ supplierCreating ? 'Criando...' : `Criar fornecedor "${supplierSearch.trim()}"` }}
                </span>
              </div>
            </div>
          </div>

          <div class="col-span-2">
            <label class="flabel">Nota fiscal <span class="font-normal normal-case text-slate-400">(imagens são convertidas para WEBP · PDF até 10 MB)</span></label>
            <input
              ref="invoiceInput"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              class="hidden"
              @change="onInvoiceSelected"
            />
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed transition-colors cursor-pointer text-left"
                :class="invoiceFile ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-stone-300 bg-stone-50/60 text-stone-500 hover:bg-stone-100'"
                @click="selectInvoice"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" class="flex-shrink-0"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm1 7V3.5L18.5 9H15zm-4 9H9v-4H6l4-4 4 4h-3v4z"/></svg>
                <img v-if="invoicePreview" :src="invoicePreview" class="h-9 w-9 rounded-md object-cover" alt="Prévia da nota" />
                <span class="min-w-0"><span class="block truncate text-[12px] font-semibold">{{ invoiceFile ? invoiceFile.name : 'Selecionar arquivo da nota fiscal' }}</span><small v-if="invoiceFile" class="block text-[10px] opacity-70">{{ fileSize }} · pronta para enviar</small></span>
              </button>
              <button
                v-if="invoiceFile"
                type="button"
                class="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-[12px] font-semibold cursor-pointer border border-red-100"
                @click="clearInvoice"
              >
                Remover
              </button>
            </div>
            <p v-if="parcelar && invoiceFile" class="text-[10px] text-purple-500 mt-1">A nota será anexada a todas as parcelas.</p>
          </div>
        </div>

        <!-- Parcelamento -->
        <div class="mt-4 border border-stone-200 rounded-xl overflow-hidden">
          <button @click="parcelar = !parcelar"
            class="w-full flex items-center justify-between px-4 py-3 cursor-pointer border-0 transition-colors"
            :class="parcelar ? 'bg-blue-500/10' : 'bg-stone-50/50 hover:bg-stone-100/70'">
            <div class="flex items-center gap-3">
              <div class="toggle-track" :class="{ on: parcelar }">
                <div class="toggle-thumb" :class="{ on: parcelar }" />
              </div>
              <span class="text-[13px] font-semibold text-stone-600">Parcelar esta despesa</span>
            </div>
            <span v-if="parcelar && customParcelas.length" class="text-[12px] font-bold text-blue-600">
              {{ customParcelas.length }}× · R$ {{ totalParcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              <span v-if="totalDiff > 0.01" class="text-amber-500 ml-1">(dif. {{ totalDiff.toFixed(2) }})</span>
            </span>
          </button>

          <div v-if="parcelar" class="px-4 pb-4 pt-3 border-t border-stone-200" style="background:rgba(37,99,235,0.07)">
            <div class="flex items-center gap-4 mb-4">
              <div class="flex-1">
                <label class="flabel">Número de Parcelas</label>
                <input v-model.number="numParcelas" type="range" min="2" max="36" class="w-full accent-blue-600 mt-1" />
              </div>
              <div class="w-14 rounded-xl py-2 text-center flex-shrink-0" style="background:rgba(37,99,235,0.2);border:1px solid rgba(59,130,246,0.3)">
                <div class="text-xl font-black text-blue-600">{{ numParcelas }}</div>
                <div class="text-[9px] text-blue-400 uppercase tracking-wide">vezes</div>
              </div>
            </div>

            <div v-if="customParcelas.length">
              <div class="grid grid-cols-[28px_1fr_1fr] gap-2 px-1 mb-1.5">
                <div class="col-head">#</div>
                <div class="col-head">Vencimento</div>
                <div class="col-head">Valor (R$)</div>
              </div>
              <div class="space-y-1.5 max-h-[260px] overflow-y-auto">
                <div v-for="(p, i) in customParcelas" :key="i" class="grid grid-cols-[28px_1fr_1fr] gap-2 items-center rounded-lg px-2 py-1.5" style="background:rgba(37,99,235,0.04);border:1px solid rgba(37,99,235,0.12)">
                  <span class="text-[11px] font-bold text-blue-400 text-center">{{ i + 1 }}</span>
                  <input v-model="p.date" type="date" class="finput py-1.5 text-[12px]" />
                  <input v-model.number="p.value" type="number" step="0.01" class="finput py-1.5 text-[12px]" />
                </div>
              </div>
              <div v-if="form.value" class="flex justify-between mt-2 px-1">
                <span class="text-[11px] text-slate-400">Total original: R$ {{ Number(form.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                <span class="text-[11px] font-semibold" :class="totalDiff < 0.01 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ totalDiff < 0.01 ? '✓ Valores OK' : `Dif: R$ ${totalDiff.toFixed(2)}` }}
                </span>
              </div>
            </div>
            <p v-else class="text-[11px] text-blue-500/60">Informe o valor e 1º vencimento para gerar as parcelas.</p>
          </div>
        </div>

        <!-- Resumo -->
        <div v-if="form.driver_id && form.type && form.value" class="mt-4 bg-stone-50/50 border border-stone-100 rounded-xl px-4 py-3">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Resumo</div>
          <div class="flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
            <div class="flex gap-1.5"><span class="text-slate-400">Motorista:</span><strong class="text-stone-600">{{ formDriverName }}</strong></div>
            <div v-if="form.plate" class="flex gap-1.5"><span class="text-slate-400">Placa:</span><strong class="text-blue-700 font-mono">{{ form.plate }}</strong></div>
            <div class="flex gap-1.5"><span class="text-slate-400">Tipo:</span><strong class="text-stone-600">{{ expenseTypes[form.type] }}</strong></div>
            <div class="flex gap-1.5"><span class="text-slate-400">{{ parcelar ? 'Total' : 'Valor' }}:</span><strong class="text-blue-600">R$ {{ Number(form.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong><span v-if="parcelar && customParcelas.length" class="text-slate-400">({{ customParcelas.length }}×)</span></div>
            <div v-if="formSupplierName" class="flex gap-1.5"><span class="text-slate-400">Fornecedor:</span><strong class="text-stone-600">{{ formSupplierName }}</strong></div>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex justify-between items-center mt-5 pt-4 border-t border-stone-100">
          <button @click="resetForm" :disabled="submitting" class="px-5 py-2 rounded-xl text-stone-600 hover:text-stone-800 disabled:opacity-40 text-[13px] font-semibold transition-colors cursor-pointer" style="background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.09)">
            Limpar
          </button>
          <button @click="submitExpense" :disabled="!formValid || submitting"
            class="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-[13px] font-bold transition-colors cursor-pointer shadow-sm shadow-blue-200 border-0">
            <svg v-if="submitting" class="animate-spin" width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 002 12h2a8 8 0 018-8z"/></svg>
            <svg v-else width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            {{ submitting ? 'Salvando...' : (parcelar ? `Lançar ${customParcelas.length} Parcelas` : 'Salvar Lançamento') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-enter {
  animation: cardIn 0.3s cubic-bezier(.22,.68,0,1.1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.flabel {
  display: block; font-size: 10.5px; font-weight: 700;
  color: #92806a; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 5px;
}

.finput {
  width: 100%; padding: 8px 12px;
  background: white; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px;
  font-size: 13px; color: #1c1917; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.finput::placeholder { color: #a8a29e; }
.finput:focus { border-color: rgba(37,99,235,0.55); box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
.finput:disabled { background: #f5f5f4; color: #a8a29e; cursor: not-allowed; }
.finput option { background: white; color: #1c1917; }

.col-head { font-size: 9.5px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.07em; }

/* Toggle */
.toggle-track {
  width: 36px; height: 20px; border-radius: 99px; background: #cbd5e1;
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.toggle-track.on { background: #2563eb; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2); transition: transform 0.2s;
}
.toggle-thumb.on { transform: translateX(16px); }
</style>
