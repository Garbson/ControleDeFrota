<script setup>
import { ref, provide } from 'vue'
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

const currentView = ref('dashboard')

function navigate(view) {
  currentView.value = view
}

// Toast system
const toastMessage = ref('')
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

provide('toast', { message: toastMessage, show: showToast })
</script>

<template>
  <div class="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
    <AppSidebar :current-view="currentView" @navigate="navigate" class="no-print" />
    <main class="flex-1 overflow-hidden flex flex-col print:overflow-visible">
      <AppTopbar :current-view="currentView" @navigate="navigate" class="no-print" />
      <div class="flex-1 overflow-y-auto p-[22px_26px] print:overflow-visible print:p-0" id="main-scroll">
        <DashboardView v-if="currentView === 'dashboard'" :show-toast="showToast" />
        <DriversView v-else-if="currentView === 'drivers'" :show-toast="showToast" />
        <StockView v-else-if="currentView === 'stock'" :show-toast="showToast" />
        <FuelView v-else-if="currentView === 'fuel'" :show-toast="showToast" />
        <ExpenseView v-else-if="currentView === 'expense'" :show-toast="showToast" />
        <PayableView v-else-if="currentView === 'payable'" :show-toast="showToast" />
        <ReceivableView v-else-if="currentView === 'receivable'" :show-toast="showToast" />
        <AnalyticsView v-else-if="currentView === 'analytics'" :show-toast="showToast" />
        <NfsView v-else-if="currentView === 'nfs'" :show-toast="showToast" />
        <ReportView v-else-if="currentView === 'report'" />
      </div>
    </main>
    <Toast />
  </div>
</template>
