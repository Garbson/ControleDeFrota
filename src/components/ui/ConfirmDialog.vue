<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useConfirm } from '../../composables/useConfirm'

const { confirmState, confirm, cancel } = useConfirm()

function handleKeydown(event) {
  if (!confirmState.value) return
  if (event.key === 'Escape') cancel()
  if (event.key === 'Enter') confirm()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="confirmState"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm"
        @click.self="cancel"
      >
        <div class="w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25">
          <div class="flex items-start gap-3 px-5 pt-5 pb-4">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              :class="confirmState.tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'"
            >
              <svg v-if="confirmState.tone === 'danger'" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              <svg v-else width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M11 17h2v-6h-2v6zm1-15A10 10 0 1022 12 10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z"/></svg>
            </div>
            <div class="min-w-0">
              <h3 class="m-0 text-[15px] font-bold text-slate-900">{{ confirmState.title }}</h3>
              <p class="mt-1.5 mb-0 text-[13px] leading-relaxed text-slate-500">{{ confirmState.message }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5">
            <button class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100" @click="cancel">
              {{ confirmState.cancelText }}
            </button>
            <button
              class="rounded-xl px-4 py-2 text-[12px] font-bold text-white shadow-sm"
              :class="confirmState.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'"
              @click="confirm"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-fade-enter-active, .confirm-fade-leave-active { transition: opacity .16s ease; }
.confirm-fade-enter-active > div, .confirm-fade-leave-active > div { transition: transform .16s ease, opacity .16s ease; }
.confirm-fade-enter-from, .confirm-fade-leave-to { opacity: 0; }
.confirm-fade-enter-from > div, .confirm-fade-leave-to > div { opacity: 0; transform: translateY(8px) scale(.98); }
</style>
