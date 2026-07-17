<script setup>
import { computed, inject } from "vue";

const toast = inject("toast");
const tone = computed(() => {
  const message = toast?.message.value || ''
  if (message.includes('❌')) return 'bg-red-600 shadow-red-200'
  if (message.includes('⚠️')) return 'bg-amber-500 shadow-amber-200'
  return 'bg-emerald-600 shadow-emerald-200'
})
</script>

<template>
  <Transition name="toast">
    <div
      v-if="toast?.message.value"
      class="fixed bottom-6 right-6 max-w-[420px] text-white py-3 px-5 rounded-[10px] text-sm font-semibold z-[200] shadow-xl toast-enter"
      :class="tone"
      role="status"
      aria-live="polite"
    >
      {{ toast.message.value }}
    </div>
  </Transition>
</template>
