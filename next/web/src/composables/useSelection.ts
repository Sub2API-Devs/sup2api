import { computed, ref, watch, type Ref } from 'vue'

/**
 * Row selection of a paginated list that survives paging: the selected keys
 * (bind to STable v-model:selected) and a snapshot of each selected row, so
 * bulk actions can check permissions and read fields of rows that are not on
 * the current page. "Select all results" loads every matching row through
 * `loadAll` (the caller pages the list endpoint).
 */
export interface SelectionOptions<T> {
  items: Ref<T[]>
  key: (row: T) => number
  selectable: (row: T) => boolean
  /** Every row matching the current filters (for "select all N results"). */
  loadAll?: () => Promise<T[]>
}

export function useSelection<T>(opts: SelectionOptions<T>) {
  const keys = ref<number[]>([])
  const rows = ref(new Map<number, T>()) as Ref<Map<number, T>>
  const selectingAll = ref(false)
  const allSelected = ref(false)
  let loadSeq = 0

  const pageKeys = computed(() => opts.items.value.filter(opts.selectable).map(opts.key))
  const pageSelected = computed(() => {
    const set = new Set(keys.value)
    return pageKeys.value.length > 0 && pageKeys.value.every((k) => set.has(k))
  })
  const selectedRows = computed(() => keys.value.map((k) => rows.value.get(k)).filter((r): r is T => r !== undefined))

  function set(next: number[]) {
    const known = new Map<number, T>()
    const onPage = new Map(opts.items.value.map((r) => [opts.key(r), r]))
    for (const k of next) {
      const row = onPage.get(k) ?? rows.value.get(k)
      if (row !== undefined) known.set(k, row)
    }
    keys.value = next.filter((k) => known.has(k))
    rows.value = known
  }
  /** STable v-model:selected writer (keys arrive as unknown[]). */
  function update(next: unknown[]) {
    allSelected.value = false
    set(next.map(Number))
  }
  function selectPage() {
    const have = new Set(keys.value)
    set([...keys.value, ...pageKeys.value.filter((k) => !have.has(k))])
  }
  function clear() {
    loadSeq++
    selectingAll.value = false
    allSelected.value = false
    keys.value = []
    rows.value = new Map()
  }
  async function selectAll() {
    if (!opts.loadAll || selectingAll.value) return
    const my = ++loadSeq
    selectingAll.value = true
    try {
      const all = (await opts.loadAll()).filter(opts.selectable)
      if (my !== loadSeq) return
      const map = new Map(rows.value)
      for (const r of all) map.set(opts.key(r), r)
      rows.value = map
      const have = new Set(keys.value)
      set([...keys.value, ...all.map(opts.key).filter((k) => !have.has(k))])
      allSelected.value = true
    } finally {
      if (my === loadSeq) selectingAll.value = false
    }
  }
  /** Removes keys (deleted rows) from the selection. */
  function drop(gone: Iterable<number>) {
    const out = new Set(gone)
    set(keys.value.filter((k) => !out.has(k)))
  }

  // A reloaded page refreshes the snapshots of its selected rows.
  watch(opts.items, (items) => {
    if (!keys.value.length) return
    const map = new Map(rows.value)
    for (const r of items) if (map.has(opts.key(r))) map.set(opts.key(r), r)
    rows.value = map
  })

  return { keys, rows: selectedRows, pageSelected, allSelected, selectingAll, update, selectPage, selectAll, clear, drop }
}
