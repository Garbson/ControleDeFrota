<script setup>
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const props = defineProps({ currentView: String })
const emit = defineEmits(['navigate', 'logout'])

const { user, logout } = useAuth()

const pageInfo = computed(() => {
  const map = {
    dashboard: { title: 'Dashboard', subtitle: 'Visão geral da frota e movimentações recentes' },
    drivers: { title: 'Motoristas', subtitle: 'Gerenciar motoristas e histórico de consumo' },
    vehicles: { title: 'Veículos', subtitle: 'Gerenciar frota de cavalos e carretas' },
    stock: { title: 'Estoque de Pneus', subtitle: 'Controle de pneus em estoque e notas fiscais' },
    fuel: { title: 'Combustível', subtitle: 'Controle de abastecimento por motorista e veículo' },
    fines: { title: 'Multas', subtitle: 'Gerenciamento de multas de trânsito' },
    trips: { title: 'Viagens', subtitle: 'Gestão de viagens, gastos e lucro por rota' },
    expense: { title: 'Lançar Despesa', subtitle: 'Registrar despesas de pneus, combustível e manutenção' },
    payable: { title: 'Contas a Pagar', subtitle: 'Gerenciamento de contas e obrigações financeiras' },
    receivable: { title: 'Contas a Receber', subtitle: 'Fretes e receitas a receber' },
    analytics: { title: 'Análise de Gastos', subtitle: 'Análise comparativa de custos e insights de frota' },
    nfs: { title: 'Notas Fiscais', subtitle: 'Histórico de compras e notas fiscais de entrada' },
    report: { title: 'Relatório Geral', subtitle: 'Consolidado financeiro da frota' },
  }
  return map[props.currentView] || { title: 'ControleFrota', subtitle: '' }
})

const today = new Date().toLocaleDateString('pt-BR')

async function handleLogout() {
  await logout()
  emit('logout')
}
</script>

<template>
  <div class="bg-white py-3 px-[26px] border-b border-slate-200 flex items-center justify-between flex-shrink-0">
    <div>
      <h1 class="m-0 text-[17px] font-extrabold text-slate-900">{{ pageInfo.title }}</h1>
      <p class="m-0 text-[11.5px] text-slate-400 mt-px">{{ pageInfo.subtitle }}</p>
    </div>
    <div class="flex items-center gap-2.5">
      <div class="bg-green-50 border border-green-200 rounded-md py-1 px-3 text-xs font-semibold text-green-700 flex items-center gap-1.5">
        <span class="pulse-dot" /> Sistema Online
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-md py-1 px-3 text-xs text-slate-500 font-medium">
        📅 {{ today }}
      </div>
      <div
        @click="emit('navigate', 'expense')"
        class="bg-blue-600 rounded-md py-1 px-3 text-xs text-white font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
      >
        <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Novo Lançamento
      </div>
      <!-- User badge -->
      <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
        <div class="w-7 h-7 bg-gradient-to-br from-violet-600 to-violet-900 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
          {{ user?.name?.[0]?.toUpperCase() || 'U' }}
        </div>
        <span class="text-xs text-slate-600 font-medium hidden sm:block">{{ user?.name || 'Usuário' }}</span>
        <button
          @click="handleLogout"
          title="Sair do sistema"
          class="text-slate-400 hover:text-red-500 transition-colors ml-1"
        >
          <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
