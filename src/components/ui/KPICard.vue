<script setup>
defineProps({
  title: String,
  value: [String, Number],
  subtitle: String,
  color: { type: String, default: '#2563eb' },
  icon: String,
  borderColor: String,
})
</script>

<template>
  <div class="kpi-card" :style="{ borderTop: `3px solid ${borderColor || color}` }">
    <div class="flex justify-between items-start">
      <div class="flex-1">
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
          {{ title }}
        </div>
        <div
          class="font-extrabold text-slate-900 mt-1.5 leading-tight"
          :class="typeof value === 'string' && value.length > 10 ? 'text-2xl' : 'text-4xl'"
        >
          {{ value }}
        </div>
        <div v-if="subtitle" class="text-[11.5px] font-semibold mt-1.5" :style="{ color }">
          {{ subtitle }}
        </div>
      </div>
      <div
        v-if="icon"
        class="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
        :style="{ background: `${color}1a` }"
      >
        <span class="text-xl">{{ icon }}</span>
      </div>
    </div>
  </div>
</template>
