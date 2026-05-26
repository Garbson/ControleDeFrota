<script setup>
import { ref, computed } from 'vue'
import { drivers, tireHistory } from '../../data/drivers.js'

const dSort = ref('tires-desc')
const dFilter = ref('all')
const selectedDriver = ref(null)

const sortedDrivers = computed(() => {
  let list = [...drivers]
  if (dFilter.value === 'carreta') list = list.filter(d => d.trailerType === 'Carreta' || d.trailerType === '9 Eixos' || d.trailerType === 'Caçamba')
  else if (dFilter.value === 'frigorifico') list = list.filter(d => d.trailerType === 'Frigorífica')
  else if (dFilter.value === 'daf') list = list.filter(d => d.trailerType === 'Cavalo DAF')
  if (dSort.value === 'tires-desc') list.sort((a, b) => b.tires - a.tires)
  else if (dSort.value === 'tires-asc') list.sort((a, b) => a.tires - b.tires)
  else if (dSort.value === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
  return list
})

function selectDriver(d) {
  selectedDriver.value = { ...d, history: tireHistory[d.id] || [] }
}
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="bg-white rounded-[11px] py-3.5 px-[18px] border border-slate-200 mb-3.5 flex justify-between items-center flex-wrap gap-2.5">
      <div class="flex items-center gap-2.5 flex-wrap">
        <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
        <button class="sbtn" :class="{ on: dSort === 'tires-desc' }" @click="dSort = 'tires-desc'">↓ Mais pneus</button>
        <button class="sbtn" :class="{ on: dSort === 'tires-asc' }" @click="dSort = 'tires-asc'">↑ Menos pneus</button>
        <button class="sbtn" :class="{ on: dSort === 'name' }" @click="dSort = 'name'">A–Z Nome</button>
        <div class="w-px h-5 bg-slate-200" />
        <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
        <button class="sbtn" :class="{ on: dFilter === 'all' }" @click="dFilter = 'all'">Todos</button>
        <button class="sbtn" :class="{ on: dFilter === 'carreta' }" @click="dFilter = 'carreta'">Carreta</button>
        <button class="sbtn" :class="{ on: dFilter === 'frigorifico' }" @click="dFilter = 'frigorifico'">Frigorífica</button>
        <button class="sbtn" :class="{ on: dFilter === 'daf' }" @click="dFilter = 'daf'">DAF</button>
      </div>
      <div class="text-xs text-slate-400">
        <strong class="text-slate-900">{{ sortedDrivers.length }}</strong> motoristas &nbsp;·&nbsp;
        <strong class="text-slate-900">{{ sortedDrivers.reduce((s, d) => s + d.tires, 0) }}</strong> pneus distribuídos
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="grid grid-cols-[2fr_1fr_1fr_80px_1fr_110px] gap-2 px-[18px] py-2.5 bg-slate-50 border-b border-slate-200">
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Motorista</div>
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Cavalo</div>
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Carreta / Reboque</div>
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pneus</div>
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Consumo relativo</div>
        <div class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
      </div>
      <div
        v-for="d in sortedDrivers"
        :key="d.id"
        @click="selectDriver(d)"
        class="grid grid-cols-[2fr_1fr_1fr_80px_1fr_110px] gap-2 px-[18px] py-3 border-b border-slate-50 items-center cursor-pointer transition-colors hover:bg-slate-50"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
            :style="{ background: `${d.color}22`, color: d.color }"
          >
            {{ d.name[0] }}
          </div>
          <div>
            <div class="font-bold text-slate-900 text-[13.5px]">{{ d.name }}</div>
            <div class="text-[10.5px] text-slate-400">{{ d.trailerType }}</div>
          </div>
        </div>
        <div>
          <span v-if="d.truck" class="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-[3px] rounded-[5px]">{{ d.truck }}</span>
          <span v-else class="text-slate-400 text-xs">—</span>
        </div>
        <div>
          <span v-if="d.trailer" class="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-[3px] rounded-[5px]">{{ d.trailer }}</span>
          <span v-else class="text-slate-400 text-xs">—</span>
        </div>
        <div class="text-2xl font-extrabold text-slate-900">{{ d.tires }}</div>
        <div class="pr-3">
          <div class="pbg">
            <div
              class="pfill"
              :style="{
                width: `${Math.min((d.tires / 24) * 100, 100)}%`,
                background: d.tires >= 20 ? '#ef4444' : d.tires >= 12 ? '#f59e0b' : '#10b981'
              }"
            />
          </div>
          <div class="text-[10px] text-slate-400 mt-[3px]">{{ Math.round((d.tires / 24) * 100) }}% do máximo</div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-green-100 text-green-600">● Ativo</span>
          <svg width="15" height="15" fill="#94a3b8" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </div>
      </div>
    </div>

    <!-- Slide Panel -->
    <Teleport to="body">
      <div v-if="selectedDriver" class="fixed inset-0 z-[70]">
        <div class="absolute inset-0 bg-black/30" @click="selectedDriver = null" />
        <div class="slide-panel">
          <div class="p-6" :style="{ background: `linear-gradient(135deg, ${selectedDriver.color}, ${selectedDriver.color}dd)` }">
            <button @click="selectedDriver = null" class="absolute top-4 right-4 text-white/70 hover:text-white">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-extrabold text-white">{{ selectedDriver.name[0] }}</div>
              <div>
                <h2 class="m-0 text-lg font-extrabold text-white">{{ selectedDriver.name }}</h2>
                <p class="m-0 text-sm text-white/70">{{ selectedDriver.trailerType }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Cavalo</div>
                <div class="text-white font-extrabold text-sm">{{ selectedDriver.truck || '—' }}</div>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Carreta</div>
                <div class="text-white font-extrabold text-sm">{{ selectedDriver.trailer || '—' }}</div>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Pneus</div>
                <div class="text-white font-extrabold text-2xl">{{ selectedDriver.tires }}</div>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="text-[10px] text-white/60 uppercase font-bold">Custo Est.</div>
                <div class="text-white font-extrabold text-sm">R$ {{ (selectedDriver.tires * 1246).toLocaleString('pt-BR') }}</div>
              </div>
            </div>
          </div>
          <div class="p-5">
            <h4 class="m-0 mb-3 text-sm font-bold text-slate-900">Histórico de Consumo</h4>
            <div v-if="selectedDriver.history.length > 0">
              <div v-for="(h, i) in selectedDriver.history" :key="i" class="flex items-center gap-3 py-2.5 border-b border-slate-50">
                <div class="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0" :style="{ background: `${selectedDriver.color}22`, color: selectedDriver.color }">
                  {{ selectedDriver.history.length - i }}
                </div>
                <div class="flex-1">
                  <div class="text-xs font-semibold text-slate-900">{{ h.item }}</div>
                  <div class="text-[10px] text-slate-400">NF {{ h.nf }}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-extrabold text-slate-900">{{ h.qty }} un</div>
                  <div class="text-[10px] text-slate-400">{{ h.date }}</div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 text-center py-8">Nenhum histórico registrado</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
