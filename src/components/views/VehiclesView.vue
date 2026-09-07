<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "../../composables/useApi";
import { useConfirm } from "../../composables/useConfirm";
import { usePayable } from "../../composables/usePayable";
import { useVehicles } from "../../composables/useVehicles";
import { printTable } from '../../utils/printTable'
import { exportExcelGeneric } from '../../utils/exportTable'

const props = defineProps({ showToast: Function });

const { vehicles, loading, fetchAll, fetchOne, remove } = useVehicles();
const { fetchExpenses } = usePayable();
const { confirmAction } = useConfirm();

const vFilter = ref("all");
const vSort = ref("plate");

// ── Novo / Editar veículo
const showNewModal = ref(false);
const newForm = ref({
  plate: "",
  type: "truck",
  brand: "",
  model: "",
  year: "",
  color: "",
  renavam: "",
});
const newSaving = ref(false);
const newError = ref("");
const editingVehicle = ref(null);
const viewingVehicle = ref(null);
const viewDetails = ref(false);
const despesas = ref([]);
const expenseVehiclePlate = ref("");
const currentPage = ref(1);
const perPage = 10;
const categoryFilter = ref('');
const searchFilter = ref('');
const dateFrom = ref('')
const dateTo = ref('')

const despesasTotal = computed(() =>
  filteredDespesas.value.reduce((s, d) => s + Number(d.value || 0), 0),
);

function fmt(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const filteredDespesas = computed(() => {
  let list = despesas.value;
  if (categoryFilter.value) {
    list = list.filter((d) => d.category === categoryFilter.value);
  }
  if (searchFilter.value) {
    const q = searchFilter.value.toLowerCase();
    list = list.filter((d) =>
      (d.description || '').toLowerCase().includes(q) ||
      (d.supplier_name || '').toLowerCase().includes(q) ||
      (d.supplier_name_free || '').toLowerCase().includes(q)
    );
  }
  if (dateFrom.value) {
    list = list.filter(d => (d.due_date || '').substring(0, 10) >= dateFrom.value)
  }
  if (dateTo.value) {
    list = list.filter(d => (d.due_date || '').substring(0, 10) <= dateTo.value)
  }
  return list;
});

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredDespesas.value.slice(start, start + perPage);
});

const totalPages = computed(() =>
  Math.ceil(filteredDespesas.value.length / perPage),
);

function buildExpenseExportData() {
  return {
    title: `Despesas — ${expenseVehiclePlate.value}`,
    subtitle: categoryFilter.value ? `Categoria: ${categoryFilter.value}` : null,
    headers: ['Data', 'Descrição', 'Categoria', 'Fornecedor', 'Status', 'Valor'],
    rows: filteredDespesas.value.map(d => ({ type: 'row', data: [
      fmtDate(d.due_date),
      d.description || '—',
      d.category,
      d.supplier_name || d.supplier_name_free || '—',
      d.status,
      Number(d.value || 0),
    ]})),
    totalLabel: 'Total',
    totalValue: despesasTotal.value,
    moneyCols: [5],
  }
}
function handleExpensePrint() { printTable({ ...buildExpenseExportData(), totals: { label: 'Total', value: despesasTotal.value } }) }
function handleExpenseExcel() { exportExcelGeneric(buildExpenseExportData()) }

async function deleteVehicle(v) {
  if (
    !(await confirmAction({
      title: "Excluir veículo",
      message: `Tem certeza que deseja excluir o veículo ${v.plate}?`,
      confirmText: "Excluir",
    }))
  )
    return;
  try {
    await remove(v.id);
    props.showToast?.("Veículo excluído");
  } catch {
    props.showToast?.("❌ Erro ao excluir veículo");
  }
}

function openEditVehicle(v) {
  editingVehicle.value = v;
  newForm.value = {
    plate: v.plate,
    type: v.type,
    brand: v.brand || "",
    model: v.model || "",
    year: v.year || "",
    color: v.color || "",
    renavam: v.renavam || "",
  };
  newError.value = "";
  showNewModal.value = true;
}

const filteredVehicles = computed(() => {
  let list = [...vehicles.value];
  if (vFilter.value !== "all")
    list = list.filter((v) => v.type === vFilter.value);
  if (vSort.value === "plate")
    list.sort((a, b) => a.plate.localeCompare(b.plate));
  else if (vSort.value === "brand")
    list.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
  else if (vSort.value === "year-desc")
    list.sort((a, b) => (b.year || 0) - (a.year || 0));
  return list;
});

const countTruck = computed(
  () => vehicles.value.filter((v) => v.type === "truck").length,
);
const countTrailer = computed(
  () => vehicles.value.filter((v) => v.type === "trailer").length,
);

async function saveNewVehicle() {
  if (!newForm.value.plate.trim()) {
    newError.value = "Placa obrigatória";
    return;
  }
  newSaving.value = true;
  newError.value = "";
  try {
    if (editingVehicle.value) {
      await api.put(`/vehicles/${editingVehicle.value.id}`, newForm.value);
    } else {
      await api.post("/vehicles", newForm.value);
    }
    await fetchAll();
    showNewModal.value = false;
    editingVehicle.value = null;
    newForm.value = {
      plate: "",
      type: "truck",
      brand: "",
      model: "",
      year: "",
      color: "",
      renavam: "",
    };
  } catch (e) {
    newError.value = e.message || "Erro ao salvar";
  } finally {
    newSaving.value = false;
  }
}

const typeLabel = (t) => (t === "truck" ? "Cavalo" : "Carreta");

async function viewVehicle(v) {
  viewingVehicle.value = v;
  const detail = await fetchOne(v.id);
  viewingVehicle.value = detail;
}

function fmtDate(raw) {
  if (!raw) return "—";
  const s = String(raw).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

async function openExpenses(vehicle) {
  expenseVehiclePlate.value = vehicle.plate;
  currentPage.value = 1;
  categoryFilter.value = '';
  searchFilter.value = '';
  dateFrom.value = ''
  dateTo.value = ''
  despesas.value = await fetchExpenses({ vehicle_id: vehicle.id });
  viewDetails.value = true;
}

onMounted(() => fetchAll());
</script>

<template>
  <div>
    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-20 text-slate-400 text-sm"
    >
      Carregando veículos...
    </div>

    <template v-else>
      <!-- Filters + Novo -->
      <div
        class="glass rounded-[11px] py-3.5 px-[18px] mb-3.5 flex justify-between items-center flex-wrap gap-2.5"
      >
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold text-slate-500">FILTRAR:</span>
          <button
            class="sbtn"
            :class="{ on: vFilter === 'all' }"
            @click="vFilter = 'all'"
          >
            Todos
          </button>
          <button
            class="sbtn"
            :class="{ on: vFilter === 'truck' }"
            @click="vFilter = 'truck'"
          >
            Cavalos
          </button>
          <button
            class="sbtn"
            :class="{ on: vFilter === 'trailer' }"
            @click="vFilter = 'trailer'"
          >
            Carretas
          </button>
          <div class="w-px h-5 bg-stone-200" />
          <span class="text-xs font-bold text-slate-500">ORDENAR:</span>
          <button
            class="sbtn"
            :class="{ on: vSort === 'plate' }"
            @click="vSort = 'plate'"
          >
            Placa
          </button>
          <button
            class="sbtn"
            :class="{ on: vSort === 'brand' }"
            @click="vSort = 'brand'"
          >
            Marca
          </button>
          <button
            class="sbtn"
            :class="{ on: vSort === 'year-desc' }"
            @click="vSort = 'year-desc'"
          >
            ↓ Ano
          </button>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="text-xs text-slate-400">
            <strong class="text-stone-800">{{
              filteredVehicles.length
            }}</strong>
            veículos &nbsp;·&nbsp;
            <span
              class="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold"
              >{{ countTruck }} cavalos</span
            >
            &nbsp;
            <span
              class="font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded text-[10px] font-bold"
              >{{ countTrailer }} carretas</span
            >
          </div>
          <button
            @click="showNewModal = true"
            class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Adicionar Veículo
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="glass rounded-xl overflow-x-auto">
        <table class="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th class="th">Placa</th>
              <th class="th">Tipo</th>
              <th class="th">Marca</th>
              <th class="th">Modelo</th>
              <th class="th">Ano</th>
              <th class="th">Cor</th>
              <th class="th">Renavam</th>
              <th class="th" style="text-align: center">Pneus</th>
              <th class="th" style="text-align: center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr class="trow" v-for="v in filteredVehicles" :key="v.id">
              <td class="td">
                <span class="font-mono text-sm font-extrabold text-stone-800">{{
                  v.plate
                }}</span>
              </td>
              <td class="td">
                <span
                  class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                  :class="
                    v.type === 'truck'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-violet-100 text-violet-700'
                  "
                >
                  {{ typeLabel(v.type) }}
                </span>
              </td>
              <td class="td text-xs font-semibold">{{ v.brand || "—" }}</td>
              <td class="td text-xs">{{ v.model || "—" }}</td>
              <td class="td text-xs">{{ v.year || "—" }}</td>
              <td class="td text-xs">{{ v.color || "—" }}</td>
              <td class="td text-xs font-mono">{{ v.renavam || "—" }}</td>
              <td class="td text-center">
                <span
                  v-if="v.total_tires > 0"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700"
                  >{{ v.total_tires }}</span
                >
                <span v-else class="text-slate-300 text-xs">0</span>
              </td>
              <td class="td text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="viewVehicle(v)"
                    title="Visualizar"
                    class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg
                      width="13"
                      height="13"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="openExpenses(v)"
                    title="Despesas"
                    class="text-stone-600 bg-stone-100/70 hover:bg-stone-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg
                      width="13"
                      height="13"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="openEditVehicle(v)"
                    title="Editar"
                    class="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg
                      width="13"
                      height="13"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="deleteVehicle(v)"
                    title="Excluir"
                    class="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex"
                  >
                    <svg
                      width="13"
                      height="13"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="!filteredVehicles.length"
          class="text-center text-slate-400 text-xs py-10"
        >
          Nenhum veículo cadastrado
        </div>
      </div>
    </template>

    <!-- ───── Modal Adicionar Veículo ───── -->
    <Teleport to="body">
      <div
        v-if="showNewModal"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/40"
          @click="showNewModal = false"
        />
        <div class="relative glass-strong rounded-2xl w-full max-w-md z-10">
          <div
            class="flex items-center justify-between p-5 border-b border-stone-100"
          >
            <h3 class="text-base font-bold text-stone-800 m-0">
              {{ editingVehicle ? "Editar Veículo" : "Adicionar Veículo" }}
            </h3>
            <button
              @click="
                showNewModal = false;
                editingVehicle = null;
              "
              class="text-slate-400 hover:text-stone-600"
            >
              <svg
                width="20"
                height="20"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Placa -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5"
                >Placa *</label
              >
              <input
                v-model="newForm.plate"
                type="text"
                placeholder="Ex: ABC1234"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                @input="newForm.plate = newForm.plate.toUpperCase()"
              />
            </div>
            <!-- Tipo -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5"
                >Tipo *</label
              >
              <div class="flex gap-2">
                <button
                  @click="newForm.type = 'truck'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="
                    newForm.type === 'truck'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-stone-200 text-slate-500 hover:border-slate-300'
                  "
                >
                  🚛 Cavalo
                </button>
                <button
                  @click="newForm.type = 'trailer'"
                  class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
                  :class="
                    newForm.type === 'trailer'
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-stone-200 text-slate-500 hover:border-slate-300'
                  "
                >
                  🚚 Carreta
                </button>
              </div>
            </div>
            <!-- Marca / Modelo -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5"
                  >Marca</label
                >
                <input
                  v-model="newForm.brand"
                  type="text"
                  placeholder="Ex: Volvo"
                  class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5"
                  >Modelo</label
                >
                <input
                  v-model="newForm.model"
                  type="text"
                  placeholder="Ex: FH 540"
                  class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <!-- Ano / Cor -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5"
                  >Ano</label
                >
                <input
                  v-model="newForm.year"
                  type="number"
                  placeholder="Ex: 2024"
                  class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-stone-600 mb-1.5"
                  >Cor</label
                >
                <input
                  v-model="newForm.color"
                  type="text"
                  placeholder="Ex: Branco"
                  class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <!-- Renavam -->
            <div>
              <label class="block text-xs font-bold text-stone-600 mb-1.5"
                >Renavam</label
              >
              <input
                v-model="newForm.renavam"
                type="text"
                placeholder="00000000000"
                class="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p v-if="newError" class="text-red-500 text-xs">{{ newError }}</p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button
              @click="
                showNewModal = false;
                editingVehicle = null;
              "
              class="flex-1 border border-stone-200 text-stone-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-stone-50/50"
            >
              Cancelar
            </button>
            <button
              @click="saveNewVehicle"
              :disabled="newSaving"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              {{
                newSaving
                  ? "Salvando..."
                  : editingVehicle
                    ? "Salvar Alterações"
                    : "Cadastrar Veículo"
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Visualizar Veículo -->
    <Teleport to="body">
      <div
        v-if="viewingVehicle"
        class="fixed inset-0 z-[90] flex items-center justify-center p-4"
        @click.self="viewingVehicle = null"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="viewingVehicle = null"
        />
        <div
          class="relative glass-strong rounded-2xl w-full max-w-[480px] overflow-hidden"
        >
          <div
            class="px-7 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between"
          >
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">
                Detalhes do Veículo
              </h3>
              <p class="mt-0.5 mb-0 text-xs text-slate-400">somente leitura</p>
            </div>
            <button
              @click="viewingVehicle = null"
              class="text-slate-400 hover:text-white transition-colors"
            >
              <svg
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>
          <div class="px-7 py-6 grid grid-cols-2 gap-4">
            <div>
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                Placa
              </div>
              <div class="text-xl font-extrabold text-stone-800 font-mono">
                {{ viewingVehicle.plate }}
              </div>
            </div>
            <div>
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                Tipo
              </div>
              <span
                class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
                :class="
                  viewingVehicle.type === 'truck'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-violet-100 text-violet-700'
                "
              >
                {{
                  viewingVehicle.type === "truck"
                    ? "Caminhão / Cavalo"
                    : "Carreta / Reboque"
                }}
              </span>
            </div>
            <div>
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                Marca
              </div>
              <div class="text-sm font-semibold text-slate-800">
                {{ viewingVehicle.brand || "—" }}
              </div>
            </div>
            <div>
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                Modelo
              </div>
              <div class="text-sm font-semibold text-slate-800">
                {{ viewingVehicle.model || "—" }}
              </div>
            </div>
            <div>
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                Ano
              </div>
              <div class="text-sm font-semibold text-slate-800">
                {{ viewingVehicle.year || "—" }}
              </div>
            </div>
            <div>
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                Cor
              </div>
              <div class="text-sm font-semibold text-slate-800">
                {{ viewingVehicle.color || "—" }}
              </div>
            </div>
            <div class="col-span-2">
              <div
                class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1"
              >
                RENAVAM
              </div>
              <div class="text-sm font-mono font-semibold text-slate-800">
                {{ viewingVehicle.renavam || "—" }}
              </div>
            </div>
          </div>
          <!-- Pneus e Consumo Relativo -->
          <div class="px-7 py-4 border-t border-stone-100">
            <div class="flex items-center justify-between mb-3">
              <h4 class="m-0 text-sm font-bold text-stone-800">
                Pneus e Consumo Relativo
              </h4>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-stone-600"
                  >{{ viewingVehicle.total_tires ?? 0 }} pneus</span
                >
                <span class="text-xs text-slate-400"
                  >R$
                  {{
                    ((viewingVehicle.total_tires ?? 0) * 1246).toLocaleString(
                      "pt-BR",
                    )
                  }}
                  est.</span
                >
              </div>
            </div>
            <div
              v-if="
                viewingVehicle.tireHistory &&
                viewingVehicle.tireHistory.length > 0
              "
              class="max-h-[200px] overflow-y-auto"
            >
              <div
                v-for="(h, i) in viewingVehicle.tireHistory"
                :key="h.id"
                class="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0"
              >
                <div
                  class="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-violet-100 text-violet-700"
                >
                  {{ viewingVehicle.tireHistory.length - i }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold text-stone-800 truncate">
                    {{ h.brand || h.item_name || "Pneu" }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ h.driver_name || "—" }} · {{ h.obs || "" }}
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xs font-extrabold text-stone-800">
                    {{ h.qty }} un
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ fmtDate(h.mov_date) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 text-center py-6">
              Nenhum pneu registrado para este veículo
            </div>
          </div>
          <div class="px-7 py-4 border-t border-stone-100 flex justify-end">
            <button
              @click="viewingVehicle = null"
              class="px-5 py-2 bg-stone-100/70 hover:bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Despesas do Veículo -->
    <Teleport to="body">
      <div
        v-if="viewDetails"
        class="fixed inset-0 z-[90] flex items-center justify-center p-4"
        @click.self="viewDetails = false"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="viewDetails = false"
        />
        <div
          class="relative glass-strong rounded-2xl w-full max-w-[960px] overflow-hidden"
        >
          <div
            class="px-7 py-5 bg-gradient-to-br from-[#1a1f2e] to-[#1e293b] flex items-center justify-between"
          >
            <div>
              <h3 class="m-0 text-[15px] font-bold text-white">
                Despesas do Veículo
              </h3>
              <p class="mt-0.5 mb-0 text-xs text-slate-400">
                {{ expenseVehiclePlate }} · {{ despesas.length }} registro{{
                  despesas.length !== 1 ? "s" : ""
                }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <div class="text-[10px] text-slate-400 uppercase font-bold">
                  Total
                </div>
                <div class="text-white font-extrabold text-sm">
                  R$ {{ fmt(despesasTotal) }}
                </div>
              </div>
              <button
                @click="viewDetails = false"
                class="text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="px-7 py-3 border-b border-stone-100 flex flex-col gap-2">
            <div class="flex items-center gap-3 flex-wrap">
              <input v-model="searchFilter" @input="currentPage = 1" type="text" placeholder="Buscar descrição ou fornecedor..." class="finput max-w-[220px] text-xs" />
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-slate-400">DE</span>
                <input v-model="dateFrom" @input="currentPage = 1" type="date" class="finput text-xs w-[130px]" />
                <span class="text-[10px] font-bold text-slate-400">ATÉ</span>
                <input v-model="dateTo" @input="currentPage = 1" type="date" class="finput text-xs w-[130px]" />
              </div>
              <div class="flex items-center gap-1.5 ml-auto">
                <button @click="handleExpensePrint" class="sbtn flex items-center gap-1" title="Imprimir / PDF">
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                  PDF
                </button>
                <button @click="handleExpenseExcel" class="sbtn flex items-center gap-1" title="Exportar Excel">Excel</button>
                <span class="text-[10px] text-slate-400">{{ filteredDespesas.length }} resultado{{ filteredDespesas.length !== 1 ? 's' : '' }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button class="sbtn" :class="{ on: !categoryFilter }" @click="categoryFilter = ''; currentPage = 1">Todos</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'manutencao' }" @click="categoryFilter = 'manutencao'; currentPage = 1">Manutenção</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'administrativo' }" @click="categoryFilter = 'administrativo'; currentPage = 1">Administrativo</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'pneus' }" @click="categoryFilter = 'pneus'; currentPage = 1">Pneus</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'multas' }" @click="categoryFilter = 'multas'; currentPage = 1">Multas</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'pecas' }" @click="categoryFilter = 'pecas'; currentPage = 1">Peças</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'combustivel' }" @click="categoryFilter = 'combustivel'; currentPage = 1">Combustível</button>
              <button class="sbtn" :class="{ on: categoryFilter === 'outros' }" @click="categoryFilter = 'outros'; currentPage = 1">Outros</button>
            </div>
          </div>
          <div class="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <table v-if="filteredDespesas.length" class="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th class="th">Data</th>
                  <th class="th">Descrição</th>
                  <th class="th">Categoria</th>
                  <th class="th">Fornecedor</th>
                  <th class="th">Status</th>
                  <th class="th text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in paginatedItems" :key="item.id" class="trow">
                  <td class="td text-xs whitespace-nowrap">
                    {{ fmtDate(item.due_date) }}
                  </td>
                  <td
                    class="td text-xs max-w-[280px]"
                    :title="item.description"
                  >
                    {{ item.description || "—" }}
                  </td>
                  <td class="td">
                    <span
                      class="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold"
                      :class="{
                        'bg-orange-100 text-orange-700':
                          item.category === 'manutencao',
                        'bg-blue-100 text-blue-700': item.category === 'pecas',
                        'bg-violet-100 text-violet-700':
                          item.category === 'pneus',
                        'bg-green-100 text-green-700':
                          item.category === 'combustivel',
                        'bg-slate-100 text-slate-600':
                          item.category === 'administrativo',
                        'bg-red-100 text-red-700': item.category === 'multas',
                        'bg-stone-100 text-stone-600':
                          item.category === 'outros',
                      }"
                      >{{ item.category }}</span
                    >
                  </td>
                  <td class="td text-xs">
                    {{ item.supplier_name || item.supplier_name_free || "—" }}
                  </td>
                  <td class="td">
                    <span
                      class="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold"
                      :class="{
                        'bg-yellow-100 text-yellow-700':
                          item.status === 'pendente',
                        'bg-green-100 text-green-700': item.status === 'pago',
                        'bg-red-100 text-red-700': item.status === 'vencido',
                        'bg-slate-100 text-slate-500':
                          item.status === 'cancelado',
                      }"
                      >{{ item.status }}</span
                    >
                  </td>
                  <td
                    class="td text-right text-xs font-bold text-stone-800 whitespace-nowrap"
                  >
                    R$ {{ fmt(item.value) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center text-slate-400 text-xs py-12">
              {{ despesas.length ? 'Nenhum resultado para o filtro' : 'Nenhuma despesa registrada para este veículo' }}
            </div>
          </div>
          <div
            v-if="totalPages > 1"
            class="px-7 py-3 border-t border-stone-100 flex items-center justify-between"
          >
            <span class="text-xs text-slate-400"
              >Página {{ currentPage }} de {{ totalPages }}</span
            >
            <div class="flex items-center gap-2">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                :class="
                  currentPage === 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-stone-600 bg-stone-100/70 hover:bg-stone-100'
                "
              >
                Anterior
              </button>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                :class="
                  currentPage === totalPages
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-stone-600 bg-stone-100/70 hover:bg-stone-100'
                "
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
