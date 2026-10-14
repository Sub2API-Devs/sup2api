<script setup lang="ts" generic="T extends Record<string, any>">
// Data table. Cells render `cell-<key>` slots (or the value at a dotted key,
// '—' when empty); headers render `head-<key>` slots (or the label). A
// column with key 'actions' sticks to the right edge. Options:
// - expandable: chevron column + the `expand` slot under an open row;
// - selectable + v-model:selected (array of row keys, see rowKey): checkbox
//   column with a select-all header (indeterminate when partly selected);
//   rowSelectable(row) disables individual rows;
// - clickable: rows look clickable, are focusable and emit row-click on
//   Enter / Space too (row-click is emitted on mouse clicks either way);
// - rowClass(row, index) / rowAttrs(row, index): extra class / attributes
//   (data-testid, ...) of a row's <tr>;
// - card: renders the table inside a card (no double border) with the
//   #toolbar slot above it and the #footer slot (pagination) below it.
import { computed, ref } from 'vue'
import { useUiT } from './i18n'
import SSpinner from './SSpinner.vue'
import SCheckbox from './SCheckbox.vue'
import type { TableColumn } from './types'

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: T[]
    loading?: boolean
    rowKey?: string
    /** Show an expand toggle and render the "expand" slot under a row. */
    expandable?: boolean
    /** Keep expanded content within the visible width of a scrollable table. */
    fitExpandedToContainer?: boolean
    emptyText?: string
    dense?: boolean
    selectable?: boolean
    selected?: unknown[]
    rowSelectable?: (row: T) => boolean
    clickable?: boolean
    rowClass?: (row: T, index: number) => unknown
    rowAttrs?: (row: T, index: number) => Record<string, unknown> | undefined
    card?: boolean
  }>(),
  { rowKey: 'id', selected: () => [] }
)
const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'expand', row: T, open: boolean): void
  (e: 'update:selected', keys: unknown[]): void
}>()
const t = useUiT()
const expanded = ref(new Set<unknown>())

function keyOf(row: T, i: number): unknown {
  const k = row[props.rowKey]
  return k === undefined || k === null ? i : k
}

function toggle(row: T, i: number) {
  const k = keyOf(row, i)
  const s = new Set(expanded.value)
  const open = !s.has(k)
  if (open) s.add(k)
  else s.delete(k)
  expanded.value = s
  emit('expand', row, open)
}

function alignCls(a?: string) {
  return a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'
}

function valueOf(row: T, key: string): unknown {
  if (!key.includes('.')) return row[key]
  return key.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), row)
}

function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function cellStyle(c: TableColumn) {
  if (!c.ellipsis) return undefined
  return { maxWidth: typeof c.ellipsis === 'string' ? c.ellipsis : '16rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
}

// ---------------------------------------------------------------- selection
const selectedSet = computed(() => new Set(props.selected))
const canSelect = (row: T) => !props.rowSelectable || props.rowSelectable(row)
const selectableKeys = computed<unknown[]>(() => props.rows.map((r, i) => (canSelect(r) ? keyOf(r, i) : undefined)).filter((k) => k !== undefined))
const allSelected = computed(() => selectableKeys.value.length > 0 && selectableKeys.value.every((k) => selectedSet.value.has(k)))
const someSelected = computed(() => !allSelected.value && selectableKeys.value.some((k) => selectedSet.value.has(k)))
function toggleAll(on: boolean) {
  const pageKeys = new Set<unknown>(selectableKeys.value)
  const rest = props.selected.filter((k) => !pageKeys.has(k))
  emit('update:selected', on ? [...rest, ...selectableKeys.value] : rest)
}
function toggleRow(row: T, i: number, on: boolean) {
  const k = keyOf(row, i)
  const rest = props.selected.filter((x) => x !== k)
  emit('update:selected', on ? [...rest, k] : rest)
}

const span = computed(() => props.columns.length + (props.expandable ? 1 : 0) + (props.selectable ? 1 : 0))

function onRowKey(e: KeyboardEvent, row: T) {
  if (!props.clickable || e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('row-click', row)
  }
}
</script>

<template>
  <component :is="card ? 'section' : 'div'" :class="card ? 'card overflow-hidden' : ['table-container', { 's-table-fit-expanded': fitExpandedToContainer }]">
    <div v-if="card && $slots.toolbar" class="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3"><slot name="toolbar" /></div>
    <div :class="card ? ['table-container s-table-in-card', { 's-table-fit-expanded': fitExpandedToContainer }] : 'contents'">
      <table class="table" :class="dense ? 'table-dense' : ''" :aria-busy="loading || undefined">
        <thead>
          <tr>
            <th v-if="selectable" class="w-10 !pr-0">
              <SCheckbox
                bare
                :model-value="allSelected"
                :indeterminate="someSelected"
                :disabled="!selectableKeys.length"
                :aria-label="t('ui.selectAll')"
                @update:model-value="toggleAll"
              />
            </th>
            <th v-if="expandable" class="w-8" />
            <th
              v-for="c in columns"
              :key="c.key"
              :style="c.width ? { width: c.width } : undefined"
              :class="[alignCls(c.align), c.headerClass, { 's-table-actions': c.key === 'actions' }]"
            >
              <slot :name="`head-${c.key}`" :column="c">{{ c.label }}</slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && rows.length === 0">
            <td :colspan="span" class="py-10 text-center text-gray-400">
              <SSpinner />
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="span" class="py-10 text-center text-gray-400">
              <slot name="empty">{{ emptyText || t('ui.noData') }}</slot>
            </td>
          </tr>
          <template v-for="(row, i) in rows" :key="String(keyOf(row, i))">
            <tr
              v-bind="rowAttrs?.(row, i)"
              :class="[
                loading ? 'opacity-60' : '',
                clickable ? 'cursor-pointer focus:outline-none focus-visible:bg-primary-50/60 dark:focus-visible:bg-primary-900/20' : '',
                selectable && selectedSet.has(keyOf(row, i)) ? 's-table-selected' : '',
                rowClass?.(row, i) as any
              ]"
              :tabindex="clickable ? 0 : undefined"
              @click="emit('row-click', row)"
              @keydown="onRowKey($event, row)"
            >
              <td v-if="selectable" class="w-10 !pr-0" @click.stop>
                <SCheckbox
                  bare
                  :model-value="selectedSet.has(keyOf(row, i))"
                  :disabled="!canSelect(row)"
                  :aria-label="t('ui.selectRow')"
                  @update:model-value="toggleRow(row, i, $event)"
                />
              </td>
              <td v-if="expandable" class="w-8 !pr-0">
                <button
                  type="button"
                  class="rounded p-0.5 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:text-gray-200"
                  :aria-expanded="expanded.has(keyOf(row, i))"
                  :aria-label="expanded.has(keyOf(row, i)) ? t('ui.collapseRow') : t('ui.expandRow')"
                  @click.stop="toggle(row, i)"
                >
                  <svg
                    class="h-4 w-4 transition-transform"
                    :class="expanded.has(keyOf(row, i)) ? 'rotate-90' : ''"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </td>
              <td
                v-for="c in columns"
                :key="c.key"
                :class="[alignCls(c.align), c.class, { 's-table-actions': c.key === 'actions', 'whitespace-nowrap': c.nowrap }]"
                :style="cellStyle(c)"
                :title="c.ellipsis && !$slots[`cell-${c.key}`] ? display(valueOf(row, c.key)) : undefined"
              >
                <slot :name="`cell-${c.key}`" :row="row" :value="valueOf(row, c.key)" :index="i">
                  {{ display(valueOf(row, c.key)) }}
                </slot>
              </td>
            </tr>
            <tr v-if="expandable && expanded.has(keyOf(row, i))" class="s-table-expand">
              <td :colspan="span" class="bg-gray-50/60 dark:bg-dark-900/40">
                <div v-if="fitExpandedToContainer" class="s-table-expand-content">
                  <slot name="expand" :row="row" />
                </div>
                <slot v-else name="expand" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div v-if="card && $slots.footer" class="border-t border-line px-4"><slot name="footer" /></div>
  </component>
</template>

<style scoped>
.table-container {
  max-width: 100%;
  min-width: 0;
  isolation: isolate;
}
.s-table-in-card {
  border: 0;
  border-radius: 0;
  background: transparent;
}
.table {
  border-collapse: separate;
  border-spacing: 0;
}
.s-table-fit-expanded {
  container-type: inline-size;
}
.s-table-expand-content {
  position: sticky;
  left: 0;
  width: 100cqw;
  max-width: 100%;
}
.s-table-selected > td {
  background: rgb(20 184 166 / 0.06);
}
.s-table-actions {
  position: sticky;
  right: 0;
  z-index: 1;
  white-space: nowrap;
  background: rgb(var(--surface, 255 255 255));
  box-shadow:
    -1px 0 0 rgb(var(--line, 229 231 235)),
    -6px 0 8px -8px #64748b;
}
.table th.s-table-actions {
  z-index: 2;
  background: rgb(var(--surface-2, 249 250 251));
}
.table tbody tr:hover > .s-table-actions {
  background: rgb(var(--surface-2, 249 250 251));
}
</style>
