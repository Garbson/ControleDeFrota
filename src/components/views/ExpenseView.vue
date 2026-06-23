<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDrivers } from '../../composables/useDrivers'
import { api } from '../../composables/useApi'

const props = defineProps({ showToast: Function })

const { drivers, fetchAll: fetchDrivers } = useDrivers()

const form = ref({
  driver_id: '', type: '', qty: 1, value: '', date: '', due_date: '', description: '', obs: ''
})
const parcelar = ref(false)
const numParcelas = ref(2)

const expenseTypes = {
  pneu: 'Pneu',
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  pedagio: 'Pedágio',
  outros: 'Outros',
}

const formDriver = computed(() => drivers.value.find(d => d.id == form.value.driver_id) || null)

const formValid = computed(() =>
  form.value.driver_id && form.value.type && form.value.value && form.value.date
)

const valorParcela = computed(() => {
  if (!form.value.value || !parcelar.value) return 0
  return Number(form.value.value) / numParcelas.value
})

const previewParcelas = computed(() => {
  if (!parcelar.value || !form.value.due_date || numParcelas.value < 2) return []
  const base = new Date(form.value.due_date + 'T00:00:00')
  return Array.from({ length: numParcelas.value }, (_, i) => {
    const d = new Date(base)
    d.setMonth(d.getMonth() + i)
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  })
})

function getCategory() {
  if (form.value.type === 'manutencao') return 'manutencao'
  if (form.value.type === 'pneu')      return 'pneus'
  if (form.value.type === 'pecas')     return 'pecas'
  return 'administrativo'
}

async function submitExpense() {
  if (!formValid.value) return
  try {
    const baseDate = new Date((form.value.due_date || form.value.date) + 'T00:00:00')
    const category = getCategory()
    const description = form.value.description || expenseTypes[form.value.type]

    if (parcelar.value && numParcelas.value >= 2) {
      const valorUnit = Number(form.value.value) / numParcelas.value
      for (let i = 0; i < numParcelas.value; i++) {
        const d = new Date(baseDate)
        d.setMonth(d.getMonth() + i)
        const due = d.toISOString().split('T')[0]
        await api.post('/payable', {
          category,
          description: `${description} (${i + 1}/${numParcelas.value})`,
          driver_id: form.value.driver_id || null,
          issue_date: form.value.date || null,
          value: Number(valorUnit.toFixed(2)),
          due_date: due,
          obs: form.value.obs || null,
        })
      }
      props.showToast?.(`✅ ${numParcelas.value} parcelas lançadas para ${formDriver.value?.name || 'motorista'}`)
    } else {
      await api.post('/payable', {
        category,
        description,
        driver_id: form.value.driver_id || null,
        issue_date: form.value.date || null,
        value: Number(form.value.value),
        due_date: form.value.due_date || form.value.date,
        obs: form.value.obs || null,
      })
      props.showToast?.(`✅ Despesa de ${expenseTypes[form.value.type]} salva para ${formDriver.value?.name || 'motorista'}`)
    }
    resetForm()
  } catch (e) {
    props.showToast?.('❌ Erro ao salvar despesa')
  }
}

function resetForm() {
  form.value = { driver_id: '', type: '', qty: 1, value: '', date: '', due_date: '', description: '', obs: '' }
  parcelar.value = false
  numParcelas.value = 2
}

onMounted(() => fetchDrivers())
</script>

<template>
  <div class="max-w-[700px]">
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-6 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b]">
        <h3 class="m-0 text-[15px] font-bold text-white">📋 Novo Lançamento de Despesa</h3>
        <p class="mt-1 mb-0 text-xs text-slate-400">Registre despesas por motorista e veículo</p>
      </div>
      <div class="px-[30px] py-7">
        <div class="grid grid-cols-2 gap-[18px]">
          <!-- Motorista -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motorista *</label>
            <select v-model="form.driver_id" class="finput">
              <option value="">Selecione o motorista...</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <!-- Tipo -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Despesa *</label>
            <select v-model="form.type" class="finput">
              <option value="">Selecione...</option>
              <option value="pneu">🔄 Pneu</option>
              <option value="combustivel">⛽ Combustível</option>
              <option value="manutencao">🔧 Manutenção</option>
              <option value="pedagio">🛣️ Pedágio</option>
              <option value="outros">📋 Outros</option>
            </select>
          </div>
          <!-- Qtd (só pneu) -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade {{ form.type !== 'pneu' ? '(apenas pneus)' : '' }}</label>
            <input v-model="form.qty" type="number" min="1" placeholder="1" class="finput" :disabled="form.type !== 'pneu'" />
          </div>
          <!-- Valor total -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor Total (R$) *</label>
            <input v-model="form.value" type="number" step="0.01" placeholder="0,00" class="finput" />
          </div>
          <!-- Data da Despesa -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data da Despesa *</label>
            <input v-model="form.date" type="date" class="finput" />
          </div>
          <!-- Data de Vencimento -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">1º Vencimento</label>
            <input v-model="form.due_date" type="date" class="finput" />
            <p class="text-[10px] text-slate-400 mt-1">Se vazio, usa a data da despesa</p>
          </div>
          <!-- Descrição -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
            <input v-model="form.description" placeholder="Ex: Troca de pneu dianteiro..." class="finput" />
          </div>
          <!-- Obs -->
          <div class="col-span-2">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação</label>
            <textarea v-model="form.obs" placeholder="Informações adicionais..." class="finput min-h-[74px] resize-y" />
          </div>
        </div>

        <!-- Parcelamento -->
        <div class="mt-[18px] border border-slate-200 rounded-[10px] overflow-hidden">
          <button
            @click="parcelar = !parcelar"
            class="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
            :class="parcelar ? 'bg-blue-50' : 'bg-slate-50 hover:bg-slate-100'"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
                :class="parcelar ? 'bg-blue-600' : 'bg-slate-300'"
              >
                <div
                  class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                  :class="parcelar ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </div>
              <span class="text-[12px] font-bold text-slate-700">Parcelar esta despesa</span>
            </div>
            <span v-if="parcelar && form.value" class="text-xs font-bold text-blue-600">
              {{ numParcelas }}x de R$ {{ valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
            </span>
          </button>

          <div v-if="parcelar" class="px-4 pb-4 pt-2 bg-blue-50 border-t border-blue-100">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Número de Parcelas</label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="numParcelas"
                type="range" min="2" max="36" step="1"
                class="flex-1 accent-blue-600"
              />
              <div class="w-14 text-center">
                <span class="text-xl font-extrabold text-blue-600">{{ numParcelas }}</span>
                <span class="text-[10px] text-slate-500 block">vezes</span>
              </div>
            </div>

            <!-- Preview das parcelas -->
            <div v-if="previewParcelas.length" class="mt-3 grid grid-cols-3 gap-1.5">
              <div
                v-for="(data, i) in previewParcelas"
                :key="i"
                class="bg-white border border-blue-100 rounded-md px-2 py-1.5 text-center"
              >
                <div class="text-[10px] text-slate-400">Parcela {{ i + 1 }}</div>
                <div class="text-[11px] font-bold text-slate-700">R$ {{ valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
                <div class="text-[10px] text-blue-600">{{ data }}</div>
              </div>
            </div>
            <p v-else class="text-[10.5px] text-blue-500 mt-2">Defina o 1º vencimento acima para visualizar as datas das parcelas.</p>
          </div>
        </div>

        <!-- Resumo -->
        <div v-if="form.driver_id && form.type && form.value" class="bg-slate-50 rounded-[10px] py-3.5 px-4 mt-[18px] border border-slate-200">
          <div class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-[0.04em]">Resumo do Lançamento</div>
          <div class="flex gap-6 flex-wrap">
            <div><span class="text-[11px] text-slate-400">Motorista:</span> <strong class="text-slate-900">{{ formDriver?.name }}</strong></div>
            <div><span class="text-[11px] text-slate-400">Tipo:</span> <strong class="text-slate-900">{{ expenseTypes[form.type] }}</strong></div>
            <div v-if="form.value && !parcelar"><span class="text-[11px] text-slate-400">Valor:</span> <strong class="text-blue-600">R$ {{ Number(form.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong></div>
            <div v-if="parcelar && form.value"><span class="text-[11px] text-slate-400">Total:</span> <strong class="text-blue-600">R$ {{ Number(form.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong> <span class="text-slate-400 text-[11px]">({{ numParcelas }}x de R$ {{ valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }})</span></div>
            <div v-if="!parcelar && (form.due_date || form.date)"><span class="text-[11px] text-slate-400">Vencimento:</span> <strong class="text-red-600">{{ new Date(form.due_date || form.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }}</strong></div>
          </div>
        </div>

        <div class="mt-[22px] pt-[18px] border-t border-slate-50 flex justify-between items-center">
          <button @click="resetForm" class="px-[18px] py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-[13px] font-semibold cursor-pointer">Limpar Formulário</button>
          <button @click="submitExpense" class="btn-p" :disabled="!formValid">
            <svg width="15" height="15" fill="white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            {{ parcelar ? `Lançar ${numParcelas} Parcelas` : 'Salvar Lançamento' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
