<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDrivers } from '../../composables/useDrivers'
import { api } from '../../composables/useApi'

const props = defineProps({ showToast: Function })
const { drivers, fetchAll: fetchDrivers } = useDrivers()

const form = ref({ driver_id: '', type: '', qty: 1, value: '', date: '', due_date: '', description: '', obs: '' })
const parcelar = ref(false)
const numParcelas = ref(2)
const customParcelas = ref([])

const expenseTypes = { pneu: 'Pneu', combustivel: 'Combustível', manutencao: 'Manutenção', pedagio: 'Pedágio', outros: 'Outros' }

const isOutros = computed(() => form.value.driver_id === '__outros__')

const formDriverName = computed(() => {
  if (isOutros.value) return 'Outros'
  return drivers.value.find(d => d.id == form.value.driver_id)?.name || ''
})

const formValid = computed(() => form.value.driver_id && form.value.type && form.value.value && form.value.date)

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
  if (!formValid.value) return
  try {
    const category = getCategory()
    const description = form.value.description || expenseTypes[form.value.type]
    const driverId = isOutros.value ? null : (form.value.driver_id || null)
    if (parcelar.value && customParcelas.value.length >= 2) {
      const total = customParcelas.value.length
      for (let i = 0; i < total; i++) {
        const p = customParcelas.value[i]
        await api.post('/payable', {
          category, description: `${description} (${i + 1}/${total})`,
          driver_id: driverId, issue_date: form.value.date || null,
          value: Number(Number(p.value).toFixed(2)), due_date: p.date, obs: form.value.obs || null,
        })
      }
      props.showToast?.(`✅ ${total} parcelas lançadas para ${formDriverName.value}`)
    } else {
      await api.post('/payable', {
        category, description, driver_id: driverId,
        issue_date: form.value.date || null, value: Number(form.value.value),
        due_date: form.value.due_date || form.value.date, obs: form.value.obs || null,
      })
      props.showToast?.(`✅ Despesa salva para ${formDriverName.value}`)
    }
    resetForm()
  } catch { props.showToast?.('❌ Erro ao salvar despesa') }
}

function resetForm() {
  form.value = { driver_id: '', type: '', qty: 1, value: '', date: '', due_date: '', description: '', obs: '' }
  parcelar.value = false; numParcelas.value = 2; customParcelas.value = []
}

onMounted(() => fetchDrivers())
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
            <input v-model="form.value" type="number" step="0.01" placeholder="0,00" class="finput" />
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
            <div class="flex gap-1.5"><span class="text-slate-400">Tipo:</span><strong class="text-stone-600">{{ expenseTypes[form.type] }}</strong></div>
            <div class="flex gap-1.5"><span class="text-slate-400">{{ parcelar ? 'Total' : 'Valor' }}:</span><strong class="text-blue-600">R$ {{ Number(form.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong><span v-if="parcelar && customParcelas.length" class="text-slate-400">({{ customParcelas.length }}×)</span></div>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex justify-between items-center mt-5 pt-4 border-t border-stone-100">
          <button @click="resetForm" class="px-5 py-2 rounded-xl text-stone-600 hover:text-stone-800 text-[13px] font-semibold transition-colors cursor-pointer" style="background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.09)">
            Limpar
          </button>
          <button @click="submitExpense" :disabled="!formValid"
            class="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-[13px] font-bold transition-colors cursor-pointer shadow-sm shadow-blue-200 border-0">
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            {{ parcelar ? `Lançar ${customParcelas.length} Parcelas` : 'Salvar Lançamento' }}
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
