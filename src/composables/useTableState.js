import { computed, ref, watch } from 'vue'

export function useTableState(key, source, filter) {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(`cf_table_${key}`) || '{}') } catch { saved = {} }
  const search = ref(saved.search || '')
  const page = ref(1)
  const pageSize = ref(Number(saved.pageSize) || 20)
  const filtered = computed(() => filter(source.value, search.value.trim().toLocaleLowerCase('pt-BR')))
  const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

  watch([search, pageSize], () => {
    page.value = 1
    localStorage.setItem(`cf_table_${key}`, JSON.stringify({ search: search.value, pageSize: pageSize.value }))
  })
  watch(pages, value => { if (page.value > value) page.value = value })
  return { search, page, pageSize, filtered, pages, paged }
}
