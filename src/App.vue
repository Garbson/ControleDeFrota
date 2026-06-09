<script setup>
import { ref, provide, onMounted } from 'vue'
import { useAuth } from './composables/useAuth'
import LoginView from './views/LoginView.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import Toast from './components/ui/Toast.vue'
import DashboardView from './components/views/DashboardView.vue'
import DriversView from './components/views/DriversView.vue'
import StockView from './components/views/StockView.vue'
import ExpenseView from './components/views/ExpenseView.vue'
import FuelView from './components/views/FuelView.vue'
import PayableView from './components/views/PayableView.vue'
import ReceivableView from './components/views/ReceivableView.vue'
import AnalyticsView from './components/views/AnalyticsView.vue'
import NfsView from './components/views/NfsView.vue'
import ReportView from './components/views/ReportView.vue'
import FinesView from './components/views/FinesView.vue'

const { isAuthenticated, fetchMe, logout } = useAuth()

const currentView = ref('dashboard')
const authChecked = ref(false)

function navigate(view) {
  currentView.value = view
}

function onLogin() {
  currentView.value = 'dashboard'
}

async function handleLogout() {
  await logout()
}

// Toast system
const toastMessage = ref('')
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3500)
}

provide('toast', { message: toastMessage, show: showToast })

// Verificar sessão existente ao carregar
onMounted(async () => {
  if (localStorage.getItem('cf_token')) {
    await fetchMe()
  }
  authChecked.value = true
})
</script>

<template>
  <!-- Aguardar verificação de auth -->
  <div v-if="!authChecked" class="min-h-screen flex items-center justify-center bg-slate-900">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-400 text-sm">Carregando...</p>
    </div>
  </div>

  <!-- Login -->
  <LoginView v-else-if="!isAuthenticated" @login="onLogin" />

  <!-- App principal -->
  <div v-else class="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
    <AppSidebar :current-view="currentView" @navigate="navigate" @logout="handleLogout" class="no-print" />
    <main class="flex-1 overflow-hidden flex flex-col print:overflow-visible">
      <AppTopbar :current-view="currentView" @navigate="navigate" @logout="handleLogout" class="no-print" />
      <div class="flex-1 overflow-y-auto p-[22px_26px] print:overflow-visible print:p-0" id="main-scroll">
        <DashboardView    v-if="currentView === 'dashboard'"  :show-toast="showToast" />
        <DriversView      v-else-if="currentView === 'drivers'"    :show-toast="showToast" />
        <StockView        v-else-if="currentView === 'stock'"      :show-toast="showToast" />
        <FuelView         v-else-if="currentView === 'fuel'"       :show-toast="showToast" />
        <FinesView        v-else-if="currentView === 'fines'"      :show-toast="showToast" />
        <ExpenseView      v-else-if="currentView === 'expense'"    :show-toast="showToast" />
        <PayableView      v-else-if="currentView === 'payable'"    :show-toast="showToast" />
        <ReceivableView   v-else-if="currentView === 'receivable'" :show-toast="showToast" />
        <AnalyticsView    v-else-if="currentView === 'analytics'"  :show-toast="showToast" />
        <NfsView          v-else-if="currentView === 'nfs'"        :show-toast="showToast" />
        <ReportView       v-else-if="currentView === 'report'" />
      </div>
    </main>
    <Toast />
  </div>
</template>
