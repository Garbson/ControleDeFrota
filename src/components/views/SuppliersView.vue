<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSuppliers } from '../../composables/useSuppliers'
import { api } from '../../composables/useApi'

const { suppliers, loading, fetchAll } = useSuppliers()

const searchQuery = ref('')

// ── Modal criar/editar
const showModal = ref(false)
const form = ref({ name: '', cnpj: '', phone: '', email: '', obs: '' })
const saving = ref(false)
const formError = ref('')
const editingSupplier = ref(null)

// ── Modal visualizar
const viewingSupplier = ref(null)

// ── Modal confirmar exclusão
const showDeleteConfirm = ref(false)
const deletingSupplier = ref(null)
const deleting = ref(false)

const filteredSuppliers = computed(() => {
  if (!searchQuery.value.trim()) return suppliers.value
  const q = searchQuery.value.toLowerCase()
  return suppliers.value.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.cnpj || '').includes(q) ||
    (s.email || '').toLowerCase().includes(q)
  )
})

function openCreate() {
  editingSupplier.value = null
  form.value = { name: '', cnpj: '', phone: '', email: '', obs: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(s) {
  editingSupplier.value = s
  form.value = { name: s.name, cnpj: s.cnpj || '', phone: s.phone || '', email: s.email || '', obs: s.obs || '' }
  formError.value = ''
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    formError.value = 'Nome obrigatório'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingSupplier.value) {
      await api.put(`/suppliers/${editingSupplier.value.id}`, form.value)
    } else {
      await api.post('/suppliers', form.value)
    }
    await fetchAll()
    showModal.value = false
    editingSupplier.value = null
  } catch (e) {
    formError.value = e.message || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

function confirmDelete(s) {
  deletingSupplier.value = s
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!deletingSupplier.value) return
  deleting.value = true
  try {
    await api.delete(`/suppliers/${deletingSupplier.value.id}`)
    await fetchAll()
    showDeleteConfirm.value = false
    deletingSupplier.value = null
  } catch (e) {
    // ignora erro no delete — o modal fecha mesmo assim
  } finally {
    deleting.value = false
  }
}

function formatCnpj(cnpj) {
  if (!cnpj) return '—'
  const d = cnpj.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return cnpj
}

function formatPhone(phone) {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return phone
}

onMounted(() => fetchAll())
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">
      Carregando fornecedores...
    </div>

    <template v-else>
      <!-- Barra de busca + Novo -->
      <div class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex justify-between items-center flex-wrap gap-2.5">
        <div class="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          <span class="text-xs font-bold text-slate-500">BUSCAR:</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nome, CNPJ ou e-mail..."
            class="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[320px]"
          />
        </div>
        <div class="flex items-center gap-2.5">
          <div class="text-xs text-slate-400">
            <strong class="text-stone-800">{{ filteredSuppliers.length }}</strong> fornecedor(es)
          </div>
          <button
            @click="openCreate"
            class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Adicionar Fornecedor
          </button>
        </div>
      </div>

      <!-- Tabela -->
      <div class="glass rounded-xl overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">Nome</th>
              <th class="th">CNPJ</th>
              <th class="th">Telefone</th>
              <th class="th">E-mail</th>
              <th class="th">Observação</th>
              <th class="th" style="text-align:center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="s in filteredSuppliers" :key="s.id">
              <td class="td">
                <span class="text-sm font-extrabold text-stone-800">{{ s.name }}</span>
              </td>
              <td class="td">
                <span class="font-mono text-xs text-slate-600">{{ formatCnpj(s.cnpj) }}</span>
              </td>
              <td class="td text-xs text-slate-600">{{ formatPhone(s.phone) }}</td>
              <td class="td text-xs text-slate-600">{{ s.email || '—' }}</td>
              <td class="td text-xs text-slate-500 max-w-[180px] truncate" :title="s.obs">{{ s.obs || '—' }}</td>
              <td class="td text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="viewingSupplier = s"
                    title="Visualizar"
                    class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                  <button
                    @click="openEdit(s)"
                    title="Editar"
                    class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button
                    @click="confirmDelete(s)"
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
        <div v-if="!filteredSuppliers.length" class="text-center text-slate-400 text-xs py-10">
          Nenhum fornecedor cadastrado
        </div>
      </div>
    </template>

    <!-- ═══════════ Modal Criar/Editar ═══════════ -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showModal = false" />
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 class="text-base font-bold text-stone-800 m-0">
              {{ editingSupplier ? 'Editar Fornecedor' : 'Adicionar Fornecedor' }}
            </h3>
            <button @click="showModal = false; editingSupplier = null" class="text-slate-400 hover:text-stone-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Nome -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Nome *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Nome do fornecedor"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <!-- CNPJ -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">CNPJ</label>
              <input
                v-model="form.cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <!-- Telefone / E-mail -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">Telefone</label>
                <input
                  v-model="form.phone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5">E-mail</label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="email@exemplo.com"
                  class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <!-- Observação -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5">Observação</label>
              <textarea
                v-model="form.obs"
                rows="2"
                placeholder="Observações sobre o fornecedor..."
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <p v-if="formError" class="text-red-500 text-xs">{{ formError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button
              @click="showModal = false; editingSupplier = null"
              class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50"
            >
              Cancelar
            </button>
            <button
              @click="save"
              :disabled="saving"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ saving ? 'Salvando...' : editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════ Modal Visualizar ═══════════ -->
    <Teleport to="body">
      <div v-if="viewingSupplier" class="fixed inset-0 z-[90] flex items-center justify-center p-4" @click.self="viewingSupplier = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="viewingSupplier = null" />
        <div class="relative glass-strong rounded-2xl w-full max-w-[480px] overflow-hidden">
          <div class="px-7 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between">
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">Detalhes do Fornecedor</h3>
              <p class="mt-0.5 mb-0 text-xs text-slate-400">somente leitura</p>
            </div>
            <button @click="viewingSupplier = null" class="text-slate-400 hover:text-white transition-colors">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="px-7 py-6 grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome</div>
              <div class="text-lg font-extrabold text-stone-800">{{ viewingSupplier.name }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">CNPJ</div>
              <div class="text-sm font-mono font-semibold text-slate-800">{{ formatCnpj(viewingSupplier.cnpj) }}</div>
            </div>
            <div>
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone</div>
              <div class="text-sm font-semibold text-slate-800">{{ formatPhone(viewingSupplier.phone) }}</div>
            </div>
            <div class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail</div>
              <div class="text-sm font-semibold text-slate-800">{{ viewingSupplier.email || '—' }}</div>
            </div>
            <div v-if="viewingSupplier.obs" class="col-span-2">
              <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observação</div>
              <div class="text-sm text-stone-600 rounded-lg p-3 bg-stone-50 border border-stone-100">{{ viewingSupplier.obs }}</div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button @click="viewingSupplier = null" class="px-5 py-2 bg-stone-100/70 hover:bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg transition-colors">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════ Modal Confirmar Exclusão ═══════════ -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteConfirm = false" />
        <div class="relative glass-strong rounded-2xl w-full max-w-[400px] overflow-hidden z-10">
          <div class="px-6 py-5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" fill="#ef4444" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <div>
              <h4 class="m-0 text-sm font-bold text-stone-800">Excluir fornecedor?</h4>
              <p class="mt-0.5 mb-0 text-xs text-slate-500">
                Tem certeza que deseja remover <strong>{{ deletingSupplier?.name }}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div class="flex gap-3 px-6 pb-5">
            <button
              @click="showDeleteConfirm = false; deletingSupplier = null"
              class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50"
            >
              Cancelar
            </button>
            <button
              @click="executeDelete"
              :disabled="deleting"
              class="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{ deleting ? 'Excluindo...' : 'Sim, Excluir' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
