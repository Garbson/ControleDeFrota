<script setup>
import { inject } from "vue";

const toast = inject("toast");
</script>

<template>
  <Transition name="toast">
    <div
      v-if="toast?.message.value"
      class="fixed bottom-6 right-6 bg-emerald-500 text-white py-3 px-5 rounded-[10px] font-semibold z-[200] shadow-[0_8px_25px_rgba(16,185,129,0.35)] toast-enter"
    >
      {{ toast.message.value }}
    </div>
  </Transition>
</template>
