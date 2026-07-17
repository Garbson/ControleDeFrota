<script setup>
import { computed } from "vue";
import { useAuth } from "../../composables/useAuth";

const props = defineProps({ currentView: String });
const emit = defineEmits(["navigate", "logout"]);
const { user, logout } = useAuth();

const pageInfo = computed(() => {
  const map = {
    dashboard:  { title: "Dashboard",         subtitle: "Visão geral da frota e movimentações recentes" },
    drivers:    { title: "Motoristas",         subtitle: "Gerenciar motoristas e histórico de consumo" },
    vehicles:   { title: "Veículos",           subtitle: "Gerenciar frota de cavalos e carretas" },
    stock:      { title: "Estoque de Pneus",   subtitle: "Controle de pneus em estoque e notas fiscais" },
    fuel:       { title: "Combustível",        subtitle: "Controle de abastecimento por motorista e veículo" },
    fines:      { title: "Multas",             subtitle: "Gerenciamento de multas de trânsito" },
    trips:      { title: "Viagens",            subtitle: "Gestão de viagens, gastos e lucro por rota" },
    expense:    { title: "Lançar Despesa",     subtitle: "Registrar despesas por motorista" },
    payable:    { title: "Contas a Pagar",     subtitle: "Gerenciamento de contas e obrigações financeiras" },
    receivable: { title: "Contas a Receber",   subtitle: "Fretes e receitas a receber" },
    analytics:  { title: "Análise de Gastos",  subtitle: "Análise comparativa de custos e insights de frota" },
    nfs:        { title: "Notas Fiscais",      subtitle: "Histórico de compras e notas fiscais de entrada" },
    report:     { title: "Relatório Geral",    subtitle: "Consolidado financeiro da frota" },
    users:      { title: "Usuários & Acessos", subtitle: "Gerenciamento de acessos ao sistema" },
    audit:      { title: "Histórico de Auditoria", subtitle: "Rastreabilidade das alterações realizadas" },
  };
  return map[props.currentView] || { title: "ControleFrota", subtitle: "" };
});

const today = new Date().toLocaleDateString("pt-BR");

async function handleLogout() {
  await logout();
  emit("logout");
}
</script>

<template>
  <div class="topbar-enter flex-shrink-0 py-3 px-5 flex items-center justify-between border-b border-stone-200"
       style="background:rgba(255,252,245,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">
    <div>
      <h1 class="m-0 text-[16px] font-bold text-stone-800 leading-tight">{{ pageInfo.title }}</h1>
      <p class="m-0 text-[11px] mt-0.5" style="color:#a8a29e">{{ pageInfo.subtitle }}</p>
    </div>

    <div class="flex items-center gap-2">
      <!-- Online -->
      <div class="flex items-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold"
           style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#059669">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
        Online
      </div>

      <!-- Data -->
      <div class="rounded-lg py-1.5 px-3 text-xs font-medium"
           style="background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.09);color:#78716c">
        {{ today }}
      </div>

      <!-- Novo Lançamento -->
      <button @click="emit('navigate', 'expense')"
        class="flex items-center gap-1.5 rounded-lg py-1.5 px-3.5 text-xs text-white font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90 active:opacity-75"
        style="background:linear-gradient(135deg,#2563eb,#1d4ed8);box-shadow:0 4px 14px rgba(37,99,235,0.35)">
        <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Novo Lançamento
      </button>

      <!-- User -->
      <div class="flex items-center gap-2 pl-3" style="border-left:1px solid rgba(0,0,0,0.08)">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
             style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);box-shadow:0 2px 8px rgba(59,130,246,0.35)">
          {{ user?.name?.[0]?.toUpperCase() || "U" }}
        </div>
        <span class="text-xs font-medium hidden sm:block" style="color:#57534e">{{ user?.name || "Usuário" }}</span>
        <button @click="handleLogout" title="Sair"
          class="bg-transparent border-0 cursor-pointer ml-1 transition-colors hover:text-red-400"
          style="color:#a8a29e">
          <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
