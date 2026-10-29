<script setup lang="ts" generic="T extends Record<string, any>">
// Data table. Cells render `cell-<key>` slots (or the value at a dotted key,
// '—' when empty); headers render `head-<key>` slots (or the label). A
// column with key 'actions' sticks to the right edge, set off by a shadow
// while columns scroll underneath it. Options:
// - expandable: chevron column + the `expand` slot under an open row;
// - selectable + v-model:selected (array of row keys, see rowKey): checkbox
//   column with a select-all header (indeterminate when partly selected);
//   rowSelectable(row) disables individual rows; Shift+click on a checkbox
//   sets the range from the previous click; swipeSelect (default on) lets a
//   drag from the selection cell or a cell's padding select a row range;
// - clickable: rows look clickable, are focusable and emit row-click on
//   Enter / Space too (row-click is emitted on mouse clicks either way);
// - rowClass(row, index) / rowAttrs(row, index): extra class / attributes
//   (data-testid, ...) of a row's <tr>;
// - card: renders the table inside a card (no double border) with the
//   #toolbar slot above it and the #footer slot (pagination) below it.
// - reorderable + v-model:rows: leading drag handles; unique stable rowKey
//   values are required. reorderDisabled/loading prevent reordering.
import { computed, ref, useId } from 'vue'
import { useUiT } from './i18n'
import SSpinner from './SSpinner.vue'
import SCheckbox from './SCheckbox.vue'
import SIcon from './SIcon.vue'
import type { TableColumn, TableReorderEvent } from './types'
import { displayValue, getPath } from './value'
import { useTableReorder } from './tableReorder'
import { useTableColumns, type TableColumnStorage } from './tableColumns'
import STableColumnSettings from './STableColumnSettings.vue'
import { useScrollClip } from './scrollClip'
import { useTableSwipeSelect } from './tableSwipeSelect'
import SIPAddress from './SIPAddress.vue'

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
    /** Drag across rows to select a range (selectable tables only). */
    swipeSelect?: boolean
    rowSelectable?: (row: T) => boolean
    clickable?: boolean
    rowClass?: (row: T, index: number) => unknown
    rowAttrs?: (row: T, index: number) => Record<string, unknown> | undefined
    card?: boolean
    reorderable?: boolean
    reorderDisabled?: boolean
    /** Enables the SDK column picker, persisted under this stable table key. */
    columnSettingsKey?: string
    /** Optional server/custom persistence; defaults to browser localStorage. */
    columnStorage?: TableColumnStorage
  }>(),
  { rowKey: 'id', selected: () => [], swipeSelect: true, emptyText: undefined, rowSelectable: undefined, rowClass: undefined, rowAttrs: undefined }
)
const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'expand', row: T, open: boolean): void
  (e: 'update:selected', keys: unknown[]): void
  (e: 'update:rows', rows: T[]): void
  (e: 'reorder', event: TableReorderEvent<T>): void
  (e: 'filter', column: TableColumn, value: string, row: T): void
}>()
const t = useUiT()
const columnState = useTableColumns(() => props.columns, () => props.columnSettingsKey, () => props.columnStorage)
const visibleColumns = computed(() => props.columnSettingsKey ? columnState.visibleColumns.value : props.columns)
const expanded = ref(new Set<unknown>())
const table = ref<HTMLTableElement>()
const root = ref<HTMLElement>()
const inner = ref<HTMLElement>()
const clipped = useScrollClip(computed(() => (props.card ? inner.value : root.value)), table)
const reorderHelp = useId()
const reorderMessage = ref('')
const reorder = useTableReorder(table, props, event => {
  reorderMessage.value = t('ui.rowReordered', { from: event.from + 1, to: event.to + 1 })
  emit('update:rows', event.rows)
  emit('reorder', event)
})

function keyOf(row: T, i: number): unknown {
  const k = row[props.rowKey]
  return k === undefined || k === null ? i : k
}
/** Rows with their key (rowKey, else the index), computed once per render. */
const keyed = computed(() => props.rows.map((row, i) => ({ row, i, key: keyOf(row, i) })))

function toggle(row: T, key: unknown) {
  const s = new Set(expanded.value)
  const open = !s.delete(key)
  if (open) s.add(key)
  expanded.value = s
  emit('expand', row, open)
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }
const valueOf = (row: T, key: string): unknown => (key.includes('.') ? getPath(row, key) : row[key])

function cellStyle(c: TableColumn) {
  if (!c.ellipsis) return undefined
  return {
    maxWidth: typeof c.ellipsis === 'string' ? c.ellipsis : '16rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}

// ---------------------------------------------------------------- selection
const selectedSet = computed(() => new Set(props.selected))
const canSelect = (row: T) => !props.rowSelectable || props.rowSelectable(row)
const selectableKeys = computed(() => keyed.value.filter(r => canSelect(r.row)).map(r => r.key))
const allSelected = computed(() => selectableKeys.value.length > 0 && selectableKeys.value.every(k => selectedSet.value.has(k)))
const someSelected = computed(() => !allSelected.value && selectableKeys.value.some(k => selectedSet.value.has(k)))
function toggleAll(on: boolean) {
  const pageKeys = new Set(selectableKeys.value)
  const rest = props.selected.filter(k => !pageKeys.has(k))
  emit('update:selected', on ? [...rest, ...selectableKeys.value] : rest)
}
// Shift+click extends from the last clicked row (anchor) to this one.
let anchor = -1
let shiftClick = false
const markShift = (e: MouseEvent) => { shiftClick = e.shiftKey }
function toggleRow(key: unknown, on: boolean, index: number) {
  const range = shiftClick && anchor >= 0 && anchor < keyed.value.length && anchor !== index
  shiftClick = false
  const lo = range ? Math.min(anchor, index) : index
  const hi = range ? Math.max(anchor, index) : index
  anchor = index
  const keys = keyed.value.slice(lo, hi + 1).filter(r => canSelect(r.row)).map(r => r.key)
  const touched = new Set(keys)
  const rest = props.selected.filter(x => !touched.has(x))
  emit('update:selected', on ? [...rest, ...keys] : rest)
}
const swipe = useTableSwipeSelect(table, {
  enabled: () => !!props.selectable && props.swipeSelect && !props.loading,
  keys: () => keyed.value.map(r => r.key),
  canSelect: i => !!keyed.value[i] && canSelect(keyed.value[i].row),
  selected: () => props.selected,
  update: keys => emit('update:selected', keys)
})

const span = computed(
  () => visibleColumns.value.length + Number(props.expandable || false) + Number(props.selectable || false) + Number(props.reorderable || false)
)

function onRowKey(e: KeyboardEvent, row: T) {
  if (!props.clickable || e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('row-click', row)
  }
}
</script>

<template>
  <component
    :is="card ? 'section' : 'div'"
    ref="root"
    :class="card ? 'card overflow-hidden' : ['table-container', { 's-table-fit-expanded': fitExpandedToContainer }]"
  >
    <template v-if="reorderable">
      <span
        :id="reorderHelp"
        class="sr-only"
      >{{ t('ui.reorderHelp') }}</span>
      <span
        class="sr-only"
        role="status"
        aria-live="polite"
      >{{ reorderMessage }}</span>
    </template>
    <div
      v-if="columnSettingsKey || (card && $slots.toolbar)"
      class="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2"
    >
      <slot name="toolbar" />
      <STableColumnSettings v-if="columnSettingsKey" :state="columnState" class="ms-auto" />
    </div>
    <div
      ref="inner"
      :class="card ? ['table-container s-table-in-card', { 's-table-fit-expanded': fitExpandedToContainer }] : 'contents'"
    >
      <table
        ref="table"
        class="table"
        :class="{ 'table-dense': dense, 's-table-clipped': clipped }"
        :aria-busy="loading || undefined"
        @mousedown="selectable && swipe.mouseDown($event)"
        @click.capture="swipe.clickCapture"
      >
        <thead>
          <tr>
            <th
              v-if="reorderable"
              class="w-10"
              :aria-label="t('ui.reorderRows')"
            />
            <th
              v-if="selectable"
              class="w-10 !pr-0"
              :title="swipeSelect ? t('ui.bulkHint') : undefined"
            >
              <SCheckbox
                bare
                :model-value="allSelected"
                :indeterminate="someSelected"
                :disabled="!selectableKeys.length"
                :aria-label="t('ui.selectAll')"
                @update:model-value="toggleAll"
              />
            </th>
            <th
              v-if="expandable"
              class="w-8"
            />
            <th
              v-for="c in visibleColumns"
              :key="c.key"
              :style="c.width ? { width: c.width } : undefined"
              :class="[ALIGN[c.align ?? 'left'], c.headerClass, { 's-table-actions': c.key === 'actions' }]"
            >
              <slot
                :name="`head-${c.key}`"
                :column="c"
              >
                {{ c.label }}
              </slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && rows.length === 0">
            <td
              :colspan="span"
              class="py-10 text-center text-gray-400"
            >
              <SSpinner />
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td
              :colspan="span"
              class="py-10 text-center text-gray-400"
            >
              <slot name="empty">
                {{ emptyText || t('ui.noData') }}
              </slot>
            </td>
          </tr>
          <template
            v-for="{ row, i, key } in keyed"
            :key="String(key)"
          >
            <tr
              v-bind="reorderable ? { ...rowAttrs?.(row, i), draggable: false } : rowAttrs?.(row, i)"
              :class="[
                loading ? 'opacity-60' : '',
                clickable ? 'cursor-pointer focus:outline-none focus-visible:bg-primary-50/60 dark:focus-visible:bg-primary-900/20' : '',
                selectable && selectedSet.has(key) ? 's-table-selected' : '',
                reorderable ? reorder.rowClass(i) : '',
                rowClass?.(row, i)
              ]"
              :data-reorder-row="reorderable ? i : undefined"
              :data-select-row="selectable ? i : undefined"
              :tabindex="clickable ? 0 : undefined"
              @click="emit('row-click', row)"
              @keydown="onRowKey($event, row)"
            >
              <td
                v-if="reorderable"
                class="w-10 !pr-0"
                @click.stop
              >
                <button
                  type="button"
                  class="s-table-reorder-handle rounded p-1.5 text-fg-muted hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-40"
                  :data-reorder-handle="i"
                  :disabled="!reorder.enabled.value"
                  :aria-label="t('ui.reorderRow', { n: i + 1 })"
                  :aria-describedby="reorderHelp"
                  @pointerdown.stop="reorder.pointerDown($event, i)"
                  @keydown.stop="reorder.keyDown($event, i)"
                  @dragstart.prevent
                >
                  <SIcon
                    name="grip-vertical"
                    class="h-4 w-4"
                  />
                </button>
              </td>
              <td
                v-if="selectable"
                class="s-table-select w-10 !pr-0"
                data-select-handle
                @click.capture="markShift"
                @click.stop
              >
                <SCheckbox
                  bare
                  :model-value="selectedSet.has(key)"
                  :disabled="!canSelect(row)"
                  :aria-label="t('ui.selectRow')"
                  @update:model-value="toggleRow(key, $event, i)"
                />
              </td>
              <td
                v-if="expandable"
                class="w-8 !pr-0"
              >
                <button
                  type="button"
                  class="rounded p-0.5 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:text-gray-200"
                  :aria-expanded="expanded.has(key)"
                  :aria-label="expanded.has(key) ? t('ui.collapseRow') : t('ui.expandRow')"
                  @click.stop="toggle(row, key)"
                >
                  <SIcon
                    name="chevron-right"
                    class="h-4 w-4 transition-transform"
                    :class="expanded.has(key) ? 'rotate-90' : ''"
                  />
                </button>
              </td>
              <td
                v-for="c in visibleColumns"
                :key="c.key"
                :class="[ALIGN[c.align ?? 'left'], c.class, { 's-table-actions': c.key === 'actions', 'whitespace-nowrap': c.nowrap }]"
                :style="cellStyle(c)"
                :title="c.ellipsis && !$slots[`cell-${c.key}`] ? displayValue(valueOf(row, c.key)) : undefined"
              >
                <slot
                  :name="`cell-${c.key}`"
                  :row="row"
                  :value="valueOf(row, c.key)"
                  :index="i"
                >
                  <SIPAddress
                    v-if="c.format === 'ip'"
                    :value="valueOf(row, c.key)"
                    :copyable="c.copyable"
                    :filterable="c.filterable"
                    @filter="emit('filter', c, $event, row)"
                  />
                  <template v-else>{{ displayValue(valueOf(row, c.key)) }}</template>
                </slot>
              </td>
            </tr>
            <tr
              v-if="expandable && expanded.has(key)"
              class="s-table-expand"
            >
              <td
                :colspan="span"
                class="bg-gray-50/60 dark:bg-dark-900/40"
              >
                <div
                  v-if="fitExpandedToContainer"
                  class="s-table-expand-content"
                >
                  <slot
                    name="expand"
                    :row="row"
                  />
                </div>
                <slot
                  v-else
                  name="expand"
                  :row="row"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div
      v-if="card && $slots.footer"
      class="border-t border-line px-4"
    >
      <slot name="footer" />
    </div>
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
.s-table-reorder-handle {
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.s-table-reorder-handle:active {
  cursor: grabbing;
}
.s-table-reorder-handle:disabled {
  cursor: not-allowed;
}
.s-table-dragging {
  opacity: 0.45;
}
.s-table-drop-before > td {
  border-top: 2px solid rgb(var(--primary-500, 20 184 166));
}
.s-table-drop-after > td {
  border-bottom: 2px solid rgb(var(--primary-500, 20 184 166));
}
@media (pointer: coarse) {
  .s-table-reorder-handle {
    min-width: 44px;
    min-height: 44px;
  }
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
.s-table-select {
  cursor: pointer;
}
:global(.s-table-swipe-band) {
  position: fixed;
  z-index: 60;
  pointer-events: none;
  border: 1.5px solid rgb(var(--primary-500, 20 184 166) / 0.45);
  border-radius: 4px;
  background: rgb(var(--primary-500, 20 184 166) / 0.1);
}
.s-table-actions {
  position: sticky;
  right: 0;
  z-index: 1;
  white-space: nowrap;
  background: rgb(var(--surface, 255 255 255));
}
.s-table-clipped > * > tr > .s-table-actions {
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
