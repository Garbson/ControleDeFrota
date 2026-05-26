<script setup>
import { ref, computed } from 'vue'
import { drivers } from '../../data/drivers.js'

const props = defineProps({ showToast: Function })

const form = ref({
  driver: '', vehicle: '', type: '', qty: 1, value: '', date: '', tireBrand: '', service: '', obs: ''
})

const expenseTypes = {
  pneu: 'Pneu',
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  pedagio: 'Pedágio',
  outros: 'Outros',
}

const formDriver = computed(() => drivers.find(d => d.name === form.value.driver) || null)

const formValid = computed(() =>
  form.value.driver && form.value.vehicle && form.value.type && form.value.value && form.value.date
)

function submitExpense() {
  if (!formValid.value) return
  props.showToast?.(`✅ Despesa de ${expenseTypes[form.value.type]} salva para ${form.value.driver}`)
  resetForm()
}

function resetForm() {
  form.value = { driver: '', vehicle: '', type: '', qty: 1, value: '', date: '', tireBrand: '', service: '', obs: '' }
}
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
            <select v-model="form.driver" @change="form.vehicle = ''" class="finput">
              <option value="">Selecione o motorista...</option>
              <option v-for="d in drivers" :key="d.id" :value="d.name">{{ d.name }}</option>
            </select>
          </div>
          <!-- Veículo -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Veículo / Placa *</label>
            <select v-model="form.vehicle" class="finput" :disabled="!form.driver">
              <option value="">Selecione o veículo...</option>
              <template v-if="formDriver">
                <option v-if="formDriver.truck" :value="formDriver.truck">Cavalo — {{ formDriver.truck }}</option>
                <option v-if="formDriver.trailer" :value="formDriver.trailer">{{ formDriver.trailerType }} — {{ formDriver.trailer }}</option>
              </template>
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
          <!-- Qtd -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade {{ form.type !== 'pneu' ? '(apenas pneus)' : '' }}</label>
            <input v-model="form.qty" type="number" min="1" placeholder="1" class="finput" :disabled="form.type !== 'pneu'" />
          </div>
          <!-- Valor -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor (R$) *</label>
            <input v-model="form.value" type="number" step="0.01" placeholder="0,00" class="finput" />
          </div>
          <!-- Data -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data *</label>
            <input v-model="form.date" type="date" class="finput" />
          </div>
          <!-- Marca Pneu -->
          <div v-if="form.type === 'pneu'" class="col-span-2">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Marca / Tipo do Pneu</label>
            <input v-model="form.tireBrand" placeholder="Ex: Continental Liso, Supercargo Borrachudo..." class="finput" />
          </div>
          <!-- Tipo Serviço -->
          <div v-if="form.type === 'manutencao'" class="col-span-2">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Serviço</label>
            <input v-model="form.service" placeholder="Ex: Troca de óleo, Freios, Suspensão..." class="finput" />
          </div>
          <!-- Obs -->
          <div class="col-span-2">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação</label>
            <textarea v-model="form.obs" placeholder="Informações adicionais..." class="finput min-h-[74px] resize-y" />
          </div>
        </div>

        <!-- Resumo -->
        <div v-if="form.driver && form.type && form.value" class="bg-slate-50 rounded-[10px] py-3.5 px-4 mt-[18px] border border-slate-200">
          <div class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-[0.04em]">Resumo do Lançamento</div>
          <div class="flex gap-6 flex-wrap">
            <div><span class="text-[11px] text-slate-400">Motorista:</span> <strong class="text-slate-900">{{ form.driver }}</strong></div>
            <div><span class="text-[11px] text-slate-400">Tipo:</span> <strong class="text-slate-900">{{ expenseTypes[form.type] }}</strong></div>
            <div v-if="form.value"><span class="text-[11px] text-slate-400">Valor:</span> <strong class="text-blue-600">R$ {{ Number(form.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong></div>
          </div>
        </div>

        <div class="mt-[22px] pt-[18px] border-t border-slate-50 flex justify-between items-center">
          <button @click="resetForm" class="px-[18px] py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-[13px] font-semibold cursor-pointer">Limpar Formulário</button>
          <button @click="submitExpense" class="btn-p" :disabled="!formValid">
            <svg width="15" height="15" fill="white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Salvar Lançamento
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
