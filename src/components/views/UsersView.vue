<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsers } from '../../composables/useUsers'
import { useAuth } from '../../composables/useAuth'
import { useConfirm } from '../../composables/useConfirm'

const props = defineProps({ showToast: Function })
const { user: currentUser } = useAuth()
const { users, loading, fetchAll, create, update, resetPassword, toggle } = useUsers()
const { confirmAction } = useConfirm()

// ── Modal criar / editar
const showModal = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const modalError = ref('')
const form = ref({ name: '', email: '', password: '', role: 'operador' })

// ── Modal redefinir senha
const showPwdModal = ref(false)
const pwdUser = ref(null)
const newPwd = ref('')
const pwdSaving = ref(false)
const pwdError = ref('')

const admins   = computed(() => users.value.filter(u => u.role === 'admin'))
const operadores = computed(() => users.value.filter(u => u.role === 'operador'))

function openCreate() {
  editingUser.value = null
  form.value = { name: '', email: '', password: '', role: 'operador' }
  modalError.value = ''
  showModal.value = true
}

function openEdit(u) {
  editingUser.value = u
  form.value = { name: u.name, email: u.email, password: '', role: u.role }
  modalError.value = ''
  showModal.value = true
}

function openResetPwd(u) {
  pwdUser.value = u
  newPwd.value = ''
  pwdError.value = ''
  showPwdModal.value = true
}

async function save() {
  if (!form.value.name || !form.value.email) { modalError.value = 'Nome e e-mail obrigatórios'; return }
  if (!editingUser.value && !form.value.password) { modalError.value = 'Senha obrigatória'; return }
  if (!editingUser.value && form.value.password.length < 6) { modalError.value = 'Mínimo 6 caracteres'; return }
  saving.value = true
  modalError.value = ''
  try {
    if (editingUser.value) {
      await update(editingUser.value.id, { name: form.value.name, email: form.value.email, role: form.value.role })
      props.showToast?.('✅ Usuário atualizado')
    } else {
      await create(form.value)
      props.showToast?.(`✅ Acesso criado para ${form.value.name}`)
    }
    showModal.value = false
  } catch (e) {
    modalError.value = e.message || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

async function savePwd() {
  if (!newPwd.value || newPwd.value.length < 6) { pwdError.value = 'Mínimo 6 caracteres'; return }
  pwdSaving.value = true
  pwdError.value = ''
  try {
    await resetPassword(pwdUser.value.id, newPwd.value)
    props.showToast?.(`✅ Senha redefinida para ${pwdUser.value.name}`)
    showPwdModal.value = false
  } catch (e) {
    pwdError.value = e.message || 'Erro ao redefinir senha'
  } finally {
    pwdSaving.value = false
  }
}

async function handleToggle(u) {
  if (u.id === currentUser.value?.id) { props.showToast?.('❌ Não é possível desativar sua própria conta'); return }
  const action = u.active ? 'desativar' : 'ativar'
  if (!await confirmAction({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} acesso`,
    message: `Tem certeza que deseja ${action} o acesso de ${u.name}?`,
    confirmText: action === 'desativar' ? 'Desativar' : 'Ativar',
    tone: action === 'desativar' ? 'danger' : 'primary',
  })) return
  await toggle(u.id)
  props.showToast?.(`✅ Acesso ${u.active ? 'desativado' : 'ativado'}`)
}

onMounted(() => fetchAll())
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-6 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between">
        <div>
          <h3 class="m-0 text-[15px] font-bold text-white">Conta Principal & Acessos</h3>
          <p class="mt-1 mb-0 text-xs text-slate-400">Gerencie quem pode acessar o sistema</p>
        </div>
        <button
          @click="openCreate"
          class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Novo Acesso
        </button>
      </div>

      <!-- Minha conta -->
      <div class="px-6 py-4 border-b border-slate-100">
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-3">Minha Conta</div>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-lg font-extrabold text-white">
            {{ currentUser?.name?.[0] }}
          </div>
          <div>
            <div class="font-bold text-slate-900">{{ currentUser?.name }}</div>
            <div class="text-xs text-slate-500">{{ currentUser?.email }}</div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 mt-1">
              Administrador
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Administradores -->
    <div v-if="admins.length > 0" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-[18px] py-2.5 bg-slate-50 border-b border-slate-200">
        <span class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Administradores</span>
      </div>
      <div v-if="loading" class="text-center text-slate-400 text-xs py-8">Carregando...</div>
      <div v-else>
        <div v-for="u in admins" :key="u.id" class="flex items-center gap-4 px-[18px] py-3.5 border-b border-slate-50">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0">
            {{ u.name[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-slate-900 text-sm flex items-center gap-2">
              {{ u.name }}
              <span v-if="u.id === currentUser?.id" class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">Você</span>
            </div>
            <div class="text-xs text-slate-400">{{ u.email }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">Admin</span>
            <button @click="openEdit(u)" class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors" title="Editar">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button @click="openResetPwd(u)" class="text-amber-600 bg-amber-50 hover:bg-amber-100 p-1.5 rounded-md transition-colors" title="Redefinir senha">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Funcionários / Operadores -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-[18px] py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Funcionários</span>
        <span class="text-[10.5px] text-slate-400">{{ operadores.length }} acesso{{ operadores.length !== 1 ? 's' : '' }}</span>
      </div>

      <div v-if="loading" class="text-center text-slate-400 text-xs py-8">Carregando...</div>

      <template v-else>
        <div v-for="u in operadores" :key="u.id" class="flex items-center gap-4 px-[18px] py-3.5 border-b border-slate-50">
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
            :class="u.active ? 'bg-gradient-to-br from-violet-600 to-violet-900 text-white' : 'bg-slate-200 text-slate-400'"
          >
            {{ u.name[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm flex items-center gap-2" :class="u.active ? 'text-slate-900' : 'text-slate-400'">
              {{ u.name }}
            </div>
            <div class="text-xs text-slate-400">{{ u.email }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
              :class="u.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'"
            >
              {{ u.active ? '● Ativo' : '○ Inativo' }}
            </span>
            <button @click="openEdit(u)" class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors" title="Editar">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button @click="openResetPwd(u)" class="text-amber-600 bg-amber-50 hover:bg-amber-100 p-1.5 rounded-md transition-colors" title="Redefinir senha">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </button>
            <button
              @click="handleToggle(u)"
              class="p-1.5 rounded-md transition-colors"
              :class="u.active ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'"
              :title="u.active ? 'Desativar acesso' : 'Reativar acesso'"
            >
              <svg v-if="u.active" width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>
              <svg v-else width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
            </button>
          </div>
        </div>

        <div v-if="!operadores.length" class="text-center text-slate-400 text-xs py-10">
          Nenhum funcionário cadastrado. Clique em "Novo Acesso" para adicionar.
        </div>
      </template>
    </div>

    <!-- Modal Criar / Editar -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 m-0">{{ editingUser ? 'Editar Acesso' : 'Novo Acesso' }}</h3>
            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Nome *</label>
              <input v-model="form.name" type="text" placeholder="Nome do funcionário" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">E-mail *</label>
              <input v-model="form.email" type="email" placeholder="email@empresa.com" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div v-if="!editingUser">
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Senha *</label>
              <input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Nível de acesso</label>
              <div class="flex gap-2">
                <button
                  @click="form.role = 'operador'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="form.role === 'operador' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'"
                >
                  Funcionário
                  <div class="text-[10px] font-normal mt-0.5 opacity-70">Visualiza e lança dados</div>
                </button>
                <button
                  @click="form.role = 'admin'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="form.role === 'admin' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'"
                >
                  Administrador
                  <div class="text-[10px] font-normal mt-0.5 opacity-70">Acesso total</div>
                </button>
              </div>
            </div>
            <p v-if="modalError" class="text-red-500 text-xs">{{ modalError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="showModal = false" class="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-50">Cancelar</button>
            <button @click="save" :disabled="saving" class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
              {{ saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Acesso' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Redefinir Senha -->
    <Teleport to="body">
      <div v-if="showPwdModal" class="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showPwdModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900 m-0">Redefinir Senha</h3>
              <p class="text-xs text-slate-400 m-0">{{ pwdUser?.name }}</p>
            </div>
            <button @click="showPwdModal = false" class="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="p-5">
            <label class="block text-xs font-bold text-slate-600 mb-1.5">Nova Senha *</label>
            <input v-model="newPwd" type="password" placeholder="Mínimo 6 caracteres" class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <p v-if="pwdError" class="text-red-500 text-xs mt-2">{{ pwdError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button @click="showPwdModal = false" class="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-50">Cancelar</button>
            <button @click="savePwd" :disabled="pwdSaving" class="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
              {{ pwdSaving ? 'Salvando...' : 'Redefinir Senha' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
