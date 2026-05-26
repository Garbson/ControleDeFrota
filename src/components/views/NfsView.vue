<script setup>
import { purchases } from '../../data/stock.js'
import KPICard from '../ui/KPICard.vue'

const totalNfs = purchases.length
const totalValue = purchases.reduce((s, p) => {
  const val = parseFloat(p.value.replace('R$ ', '').replace('.', '').replace(',', '.'))
  return s + (isNaN(val) ? 0 : val)
}, 0)
const totalPneus = purchases.reduce((s, p) => s + p.qty, 0)
const avgPrice = totalPneus > 0 ? Math.round(totalValue / totalPneus) : 0
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-3.5 mb-5">
      <KPICard title="Total de NFs" :value="totalNfs" subtitle="compras registradas" color="#2563eb" border-color="#2563eb" />
      <KPICard title="Total Investido" :value="`R$ ${totalValue.toLocaleString('pt-BR')}`" subtitle="soma das notas fiscais" color="#10b981" border-color="#10b981" />
      <KPICard title="Preço Médio/Pneu" :value="`R$ ${avgPrice}`" subtitle="com base nas NFs" color="#f59e0b" border-color="#f59e0b" />
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-[22px] py-[17px] border-b border-slate-50 flex items-center justify-between">
        <h3 class="m-0 text-sm font-bold text-slate-900">Notas Fiscais de Compra</h3>
        <span class="text-xs text-slate-400">Histórico de aquisições</span>
      </div>
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="th">NF</th>
            <th class="th">Descrição</th>
            <th class="th">Quantidade</th>
            <th class="th">Valor Total</th>
            <th class="th">Preço Unit.</th>
            <th class="th">Data</th>
            <th class="th">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr class="trow" v-for="p in purchases" :key="p.nf">
            <td class="td">
              <span class="font-mono font-extrabold text-blue-800 text-[13px]">NF {{ p.nf }}</span>
            </td>
            <td class="td font-semibold">{{ p.description }}</td>
            <td class="td"><strong>{{ p.qty }}</strong> pneus</td>
            <td class="td font-extrabold text-slate-900">{{ p.value }}</td>
            <td class="td text-slate-500">{{ p.unitPrice }}</td>
            <td class="td text-slate-500">{{ p.date }}</td>
            <td class="td">
              <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-green-100 text-green-600">✓ Processada</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
