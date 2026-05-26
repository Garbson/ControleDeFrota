<script setup>
defineProps({
  label: String,
  bg: { type: String, default: '#dbeafe' },
  textColor: { type: String, default: '#1d4ed8' },
})
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
    :style="{ background: bg, color: textColor }"
  >
    {{ label }}
  </span>
</template>
