<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../../composables/useApi'

const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const entity = ref('')
const from = ref('')
const to = ref('')
const limit = 50

const pages = computed(() => Math.max(Math.ceil(total.value / limit), 1))

const entityLabels = {
  drivers: 'Motoristas', vehicles: 'Veículos', stock: 'Estoque', payable: 'Contas a pagar',
  receivable: 'Contas a receber', fuel: 'Combustível', fines: 'Multas', trips: 'Viagens',
  users: 'Usuários', suppliers: 'Fornecedores', auth: 'Autenticação',
}

async function fetchAudit() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit })
    if (entity.value) params.set('entity', entity.value)
    if (from.value) params.set('from', from.value)
    if (to.value) params.set('to', to.value)
    const data = await api.get(`/audit?${params}`)
    items.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  fetchAudit()
}

function changePage(next) {
  page.value = Math.min(Math.max(next, 1), pages.value)
  fetchAudit()
}

function fmtDate(value) {
  return new Date(value).toLocaleString('pt-BR')
}

function pretty(value) {
  if (!value) return 'Sem dados'
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  return JSON.stringify(parsed, null, 2)
}

onMounted(fetchAudit)
</script>

<template>
  <div class="space-y-4">
    <div class="glass rounded-xl p-4 flex items-end gap-3 flex-wrap">
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Módulo</label>
        <select v-model="entity" class="finput !py-2 text-xs min-w-[180px]">
          <option value="">Todos</option>
          <option v-for="(label, key) in entityLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">De</label>
        <input v-model="from" type="date" class="finput !py-2 text-xs" />
      </div>
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Até</label>
        <input v-model="to" type="date" class="finput !py-2 text-xs" />
      </div>
      <button class="btn-p !py-2 text-xs" @click="applyFilters">Filtrar</button>
      <div class="ml-auto text-xs text-slate-400">{{ total }} alteração(ões)</div>
    </div>

    <div class="glass rounded-xl overflow-hidden">
      <div v-if="loading" class="text-center text-slate-400 text-xs py-12">Carregando histórico...</div>
      <div v-else-if="!items.length" class="text-center text-slate-400 text-xs py-12">Nenhuma alteração encontrada</div>
      <table v-else class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">Data e hora</th>
            <th class="th">Usuário</th>
            <th class="th">Ação</th>
            <th class="th">Módulo</th>
            <th class="th">Registro</th>
            <th class="th">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="trow align-top">
            <td class="td text-xs whitespace-nowrap">{{ fmtDate(item.created_at) }}</td>
            <td class="td text-xs font-semibold">{{ item.user_name || `Usuário #${item.user_id || '—'}` }}</td>
            <td class="td"><span class="badge bg-blue-100 text-blue-700">{{ item.action }}</span></td>
            <td class="td text-xs">{{ entityLabels[item.entity] || item.entity }}</td>
            <td class="td text-xs font-mono">{{ item.entity_id || '—' }}</td>
            <td class="td text-xs max-w-[360px]">
              <details>
                <summary class="cursor-pointer text-blue-600 font-semibold">Ver antes/depois</summary>
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <div><div class="font-bold mb-1">Antes</div><pre class="text-[9px] whitespace-pre-wrap bg-stone-100 p-2 rounded max-h-48 overflow-auto">{{ pretty(item.before_data) }}</pre></div>
                  <div><div class="font-bold mb-1">Depois</div><pre class="text-[9px] whitespace-pre-wrap bg-stone-100 p-2 rounded max-h-48 overflow-auto">{{ pretty(item.after_data) }}</pre></div>
                </div>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="pages > 1" class="flex justify-center items-center gap-3 p-4 border-t border-stone-100">
        <button class="sbtn" :disabled="page === 1" @click="changePage(page - 1)">Anterior</button>
        <span class="text-xs text-slate-500">Página {{ page }} de {{ pages }}</span>
        <button class="sbtn" :disabled="page === pages" @click="changePage(page + 1)">Próxima</button>
      </div>
    </div>
  </div>
</template>
