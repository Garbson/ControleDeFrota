<script setup>
defineProps({ open: Boolean })
const emit = defineEmits(['close', 'navigate'])

const actions = [
  { view: 'expense', icon: '💳', title: 'Lançar despesa', detail: 'Nova conta a pagar', color: 'blue' },
  { view: 'receivable', icon: '↙', title: 'Conta a receber', detail: 'Consultar e receber fretes', color: 'emerald' },
  { view: 'fines', icon: '⚠', title: 'Registrar multa', detail: 'Infração e vencimento', color: 'red' },
  { view: 'fuel', icon: '⛽', title: 'Abastecimento', detail: 'Combustível e quilometragem', color: 'amber' },
  { view: 'stock', icon: '📦', title: 'Movimentar estoque', detail: 'Entrada ou saída de pneus', color: 'violet' },
  { view: 'trips', icon: '🛣', title: 'Nova viagem', detail: 'Rota, motorista e frete', color: 'cyan' },
]

function choose(view) { emit('navigate', view); emit('close') }
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[120] flex items-center justify-center p-4" @keydown.esc="$emit('close')">
      <div class="absolute inset-0 bg-stone-950/45 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative w-full max-w-[620px] overflow-hidden rounded-2xl glass-strong shadow-2xl">
        <div class="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div><h2 class="m-0 text-base font-extrabold text-stone-800">O que deseja fazer?</h2><p class="m-0 mt-1 text-xs text-stone-400">Escolha um atalho para continuar</p></div>
          <button class="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" @click="$emit('close')">✕</button>
        </div>
        <div class="grid grid-cols-2 gap-3 p-5 max-sm:grid-cols-1">
          <button v-for="a in actions" :key="a.view" class="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md" @click="choose(a.view)">
            <span class="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-stone-100 text-xl group-hover:bg-blue-50">{{ a.icon }}</span>
            <span><strong class="block text-[13px] text-stone-800">{{ a.title }}</strong><small class="mt-0.5 block text-[11px] text-stone-400">{{ a.detail }}</small></span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
