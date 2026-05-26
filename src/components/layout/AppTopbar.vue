<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentView: String,
})

const emit = defineEmits(['navigate'])

const pageInfo = computed(() => {
  const map = {
    dashboard: { title: 'Dashboard', subtitle: 'Visão geral da frota e movimentações recentes' },
    drivers: { title: 'Motoristas', subtitle: 'Gerenciar motoristas e histórico de consumo' },
    stock: { title: 'Estoque de Pneus', subtitle: 'Controle de pneus em estoque e notas fiscais' },
    fuel: { title: 'Combustível', subtitle: 'Controle de abastecimento por motorista e veículo' },
    expense: { title: 'Lançar Despesa', subtitle: 'Registrar despesas de pneus, combustível e manutenção' },
    payable: { title: 'Contas a Pagar', subtitle: 'Relatório de contas a pagar — Mai/2026' },
    receivable: { title: 'Contas a Receber', subtitle: 'Fretes e receitas a receber' },
    analytics: { title: 'Análise de Gastos', subtitle: 'Análise comparativa de custos e insights de frota' },
    nfs: { title: 'Notas Fiscais', subtitle: 'Histórico de compras e notas fiscais de entrada' },
    report: { title: 'Relatório Geral', subtitle: 'Consolidado financeiro da frota' },
  }
  return map[props.currentView] || { title: 'ControleFrota', subtitle: '' }
})

const today = new Date().toLocaleDateString('pt-BR')
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
        @click="$emit('navigate', 'expense')"
        class="bg-blue-600 rounded-md py-1 px-3 text-xs text-white font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
      >
        <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Novo Lançamento
      </div>
    </div>
  </div>
</template>
