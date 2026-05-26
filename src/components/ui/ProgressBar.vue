<script setup>
defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  color: { type: String, default: '#2563eb' },
})
</script>

<template>
  <div class="pbg">
    <div
      class="pfill"
      :style="{
        width: `${Math.min((value / max) * 100, 100)}%`,
        background: color,
      }"
    />
  </div>
</template>
