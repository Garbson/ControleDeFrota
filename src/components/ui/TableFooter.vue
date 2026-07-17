<script setup>
defineProps({ page: Number, pages: Number, total: Number, pageSize: Number })
defineEmits(['update:page', 'update:pageSize'])
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-stone-100 bg-white/30">
    <span class="text-[11px] text-stone-500">
      {{ total }} registro{{ total === 1 ? '' : 's' }} encontrado{{ total === 1 ? '' : 's' }}
    </span>
    <div class="flex items-center gap-2">
      <label class="text-[11px] text-stone-500">
        Por página
        <select :value="pageSize" class="ml-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs" @change="$emit('update:pageSize', Number($event.target.value))">
          <option :value="10">10</option><option :value="20">20</option><option :value="50">50</option>
        </select>
      </label>
      <button class="sbtn !px-2" :disabled="page <= 1" @click="$emit('update:page', page - 1)">←</button>
      <span class="min-w-[72px] text-center text-[11px] font-semibold text-stone-600">{{ page }} de {{ pages }}</span>
      <button class="sbtn !px-2" :disabled="page >= pages" @click="$emit('update:page', page + 1)">→</button>
    </div>
  </div>
</template>
