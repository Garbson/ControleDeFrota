<script setup>
import { computed, onMounted } from 'vue'
import { useStock } from '../../composables/useStock'
import KPICard from '../ui/KPICard.vue'

const { items, loading, fetchAll } = useStock()

// Agrupa itens por NF
const nfGroups = computed(() => {
  const map = {}
  items.value.forEach(s => {
    const nf = s.nf_number || 'SEM NF'
    if (!map[nf]) map[nf] = { nf, items: [], qty: 0, value: 0 }
    map[nf].items.push(s)
    map[nf].qty += Number(s.qty)
    map[nf].value += Number(s.qty) * Number(s.unit_price || 0)
  })
  return Object.values(map).filter(g => g.nf !== 'SEM NF')
})

const totalNfs = computed(() => nfGroups.value.length)
const totalValue = computed(() => nfGroups.value.reduce((s, g) => s + g.value, 0))
const totalPneus = computed(() => nfGroups.value.reduce((s, g) => s + g.qty, 0))
const avgPrice = computed(() => totalPneus.value > 0 ? totalValue.value / totalPneus.value : 0)

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

onMounted(() => fetchAll())
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>

    <template v-else>
      <div class="grid grid-cols-3 gap-3.5 mb-5">
        <KPICard title="Total de NFs" :value="totalNfs" subtitle="compras registradas" color="#2563eb" border-color="#2563eb" />
        <KPICard title="Total Investido" :value="`R$ ${fmt(totalValue)}`" subtitle="soma das notas fiscais" color="#10b981" border-color="#10b981" />
        <KPICard title="Preço Médio/Pneu" :value="`R$ ${fmt(avgPrice)}`" subtitle="com base nos itens" color="#f59e0b" border-color="#f59e0b" />
      </div>

      <div class="glass rounded-xl overflow-hidden">
        <div class="px-[22px] py-[17px] border-b border-stone-100 flex items-center justify-between">
          <h3 class="m-0 text-sm font-bold text-stone-800">Notas Fiscais de Compra</h3>
          <span class="text-xs text-slate-400">Histórico de aquisições</span>
        </div>
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="th">NF</th>
              <th class="th">Itens</th>
              <th class="th">Quantidade</th>
              <th class="th">Valor Total</th>
              <th class="th">Preço Médio Unit.</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="g in nfGroups" :key="g.nf">
              <td class="td">
                <span class="font-mono font-extrabold text-blue-800 text-[13px]">NF {{ g.nf }}</span>
              </td>
              <td class="td text-xs text-slate-500">{{ g.items.map(i => i.description).join(', ') }}</td>
              <td class="td"><strong>{{ g.qty }}</strong> pneus</td>
              <td class="td font-extrabold text-stone-800">R$ {{ fmt(g.value) }}</td>
              <td class="td text-slate-500">R$ {{ g.qty > 0 ? fmt(g.value / g.qty) : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!nfGroups.length" class="text-center text-slate-400 text-xs py-10">Nenhuma nota fiscal registrada</div>
      </div>
    </template>
  </div>
</template>
