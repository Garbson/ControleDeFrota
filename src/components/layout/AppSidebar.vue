<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { api } from '../../composables/useApi'

const props = defineProps({ currentView: String })
const emit = defineEmits(['navigate', 'logout'])

const { user } = useAuth()

const pendingCount = ref(0)

async function loadPending() {
  try {
    const data = await api.get('/payable/summary')
    pendingCount.value = Number(data.count_pendente || 0)
  } catch {
    pendingCount.value = 0
  }
}

const menuSections = computed(() => [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'drivers', label: 'Motoristas', icon: 'drivers' },
      { id: 'stock', label: 'Estoque de Pneus', icon: 'stock' },
      { id: 'fuel', label: 'Combustível', icon: 'fuel' },
      { id: 'fines', label: 'Multas', icon: 'fines' },
      { id: 'expense', label: 'Lançar Despesa', icon: 'expense' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { id: 'payable', label: 'Contas a Pagar', icon: 'payable', badge: pendingCount.value || null },
      { id: 'receivable', label: 'Contas a Receber', icon: 'receivable' },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { id: 'analytics', label: 'Análise de Gastos', icon: 'analytics' },
      { id: 'nfs', label: 'Notas Fiscais', icon: 'nfs' },
      { id: 'report', label: 'Relatório Geral', icon: 'report' },
    ],
  },
])

const userInitial = computed(() => {
  const name = user.value?.name || 'A'
  return name[0].toUpperCase()
})

onMounted(() => loadPending())
</script>

<template>
  <aside class="w-[232px] bg-[#1a1f2e] flex-shrink-0 flex flex-col overflow-hidden">
    <!-- Logo -->
    <div class="px-[18px] pt-[18px] pb-3.5 border-b border-white/5">
      <div class="flex items-center gap-2.5">
        <div class="w-[37px] h-[37px] bg-gradient-to-br from-blue-600 to-blue-900 rounded-[9px] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          </svg>
        </div>
        <div>
          <div class="text-white font-extrabold text-sm tracking-[-0.3px]">ControleFrota</div>
          <div class="text-slate-600 text-[10px] font-semibold tracking-wider">GESTÃO DE FROTA</div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-2.5 overflow-y-auto">
      <template v-for="section in menuSections" :key="section.title">
        <div class="px-[18px] pt-2 pb-1.5 text-[10px] font-bold text-slate-600 tracking-[0.08em] uppercase">
          {{ section.title }}
        </div>
        <div
          v-for="item in section.items"
          :key="item.id"
          class="nav-item"
          :class="{ active: currentView === item.id }"
          @click="emit('navigate', item.id)"
        >
          <!-- Icons -->
          <svg v-if="item.icon === 'dashboard'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <svg v-else-if="item.icon === 'drivers'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <svg v-else-if="item.icon === 'stock'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-10-2h4v2h-4V5zm10 14H4V9h16v10z"/></svg>
          <svg v-else-if="item.icon === 'fuel'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 13H6v-3h6v3zm0-5H6V5h6v3z"/></svg>
          <svg v-else-if="item.icon === 'fines'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <svg v-else-if="item.icon === 'expense'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
          <svg v-else-if="item.icon === 'payable'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
          <svg v-else-if="item.icon === 'receivable'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          <svg v-else-if="item.icon === 'analytics'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
          <svg v-else-if="item.icon === 'nfs'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          <svg v-else-if="item.icon === 'report'" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>

          {{ item.label }}

          <span v-if="item.badge" class="ml-auto bg-red-500 text-white text-[10px] font-bold px-[7px] py-px rounded-full">
            {{ item.badge }}
          </span>
        </div>
        <div v-if="section.title !== 'Relatórios'" class="h-px bg-white/5 mx-3 my-2.5" />
      </template>
    </nav>

    <!-- User -->
    <div class="py-3.5 px-4 border-t border-white/5">
      <div class="flex items-center gap-2">
        <div class="w-[31px] h-[31px] bg-gradient-to-br from-violet-600 to-violet-900 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {{ userInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-slate-200 text-xs font-semibold truncate">{{ user?.name || 'Usuário' }}</div>
          <div class="text-slate-600 text-[10px] truncate">{{ user?.email || '' }}</div>
        </div>
        <button
          @click="emit('logout')"
          title="Sair"
          class="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 ml-1"
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
    </div>
  </aside>
</template>
