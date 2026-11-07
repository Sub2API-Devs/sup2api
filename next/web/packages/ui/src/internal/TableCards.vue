<script setup lang="ts" generic="T extends Record<string, any>">
// STable's phone form: one card per row, laid out by cardFields(). Header =
// selection checkbox, drag handle, title fields (joined by " · ") and status
// fields; then subtitle fields, the meta label/value grid, detail fields and
// the `expand` slot behind a Details toggle (STable's expanded rows), and the
// actions column as a footer. Cells render STable's `cell-<key>` slots with
// `layout: 'card'`; the `card` slot replaces a card's content. `surface` (STable
// `card`) = items divided inside one card, else separate cards. Selection,
// expansion, reordering and clicks are STable's: this list only emits.
// Everything inside a card sees TABLE_CARD. Internal to STable.
import { h, provide, ref, useId, useSlots } from 'vue'
import SCheckbox from '../SCheckbox.vue'
import SIcon from '../SIcon.vue'
import SSkeleton from '../SSkeleton.vue'
import { useUiT } from '../i18n'
import { TABLE_CARD, type CardFields } from '../tableCard'
import type { TableReorder } from '../tableReorder'
import type { TableColumn } from '../types'
import { getPath } from '../value'
import ReorderHandle from './ReorderHandle.vue'
import TableCardFields from './TableCardFields.vue'
import TableCell from './TableCell.vue'
import TableLoadError from './TableLoadError.vue'

const props = defineProps<{
  fields: CardFields
  rows: { row: T; i: number; key: unknown }[]
  loading?: boolean
  error?: unknown
  errorText?: string
  retry?: () => void
  emptyText?: string
  surface?: boolean
  selectable?: boolean
  selected: Set<unknown>
  canSelect: (row: T) => boolean
  allSelected: boolean
  someSelected: boolean
  expandable?: boolean
  expanded: Set<unknown>
  clickable?: boolean
  /** Set when the table is reorderable. */
  reorder?: TableReorder
  reorderHelp: string
  rowClass?: (row: T, index: number) => unknown
  rowAttrs?: (row: T, index: number) => Record<string, unknown> | undefined
}>()
const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'select', key: unknown, on: boolean, index: number): void
  (e: 'select-all', on: boolean): void
  (e: 'expand', row: T, key: unknown): void
  (e: 'filter', column: TableColumn, value: string, row: T): void
}>()
const t = useUiT()
const slots = useSlots()
const uid = useId()
const list = ref<HTMLElement>()
defineExpose({ list })
provide(TABLE_CARD, true)

const titleId = (i: number) => `${uid}-title-${i}`
const detailId = (i: number) => `${uid}-detail-${i}`
const isSelected = (key: unknown) => !!props.selectable && props.selected.has(key)

function Cell(p: { column: TableColumn; row: T; index: number }) {
  const value = getPath(p.row, p.column.key)
  const slot = slots[`cell-${p.column.key}`]
  if (slot) return slot({ row: p.row, value, index: p.index, layout: 'card' })
  return h(TableCell, { column: p.column, value, onFilter: (address: string) => emit('filter', p.column, address, p.row) })
}
</script>

<template>
  <div v-if="loading && !rows.length" :class="surface ? 'divide-y divide-line' : 'space-y-3'" aria-busy="true">
    <span role="status" class="sr-only">{{ t('ui.loading') }}</span>
    <div v-for="n in 3" :key="n" :class="surface ? 'p-4' : 'card p-4'">
      <SSkeleton width="55%" height="1.25rem" />
      <SSkeleton :lines="2" height="0.75rem" class="mt-3" />
    </div>
  </div>
  <div v-else-if="error && !rows.length" class="py-10 text-center" :class="surface ? '' : 'card'" data-testid="table-error">
    <slot name="error" :error="error"><TableLoadError :text="errorText" :retry="retry" /></slot>
  </div>
  <div v-else-if="!rows.length" class="py-10 text-center text-gray-400" :class="surface ? '' : 'card'">
    <slot name="empty">{{ emptyText || t('ui.noData') }}</slot>
  </div>
  <template v-else>
    <div
      v-if="error && !loading"
      class="bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300"
      :class="surface ? 'border-b border-line' : 'mb-3 rounded-card'"
      data-testid="table-error"
    >
      <TableLoadError inline :text="errorText" :retry="retry" />
    </div>
    <div v-if="selectable" class="flex items-center py-2" :class="surface ? 'border-b border-line px-4' : 'px-1'">
      <SCheckbox
        :model-value="allSelected"
        :indeterminate="someSelected"
        :disabled="!rows.some(r => canSelect(r.row))"
        :label="t('ui.bulkSelectPage')"
        @update:model-value="emit('select-all', $event)"
      />
    </div>
    <ul ref="list" role="list" :aria-busy="loading || undefined" :class="surface ? 'divide-y divide-line' : 'space-y-3'">
      <li
        v-for="{ row, i, key } in rows"
        :key="String(key)"
        v-bind="rowAttrs?.(row, i)"
        :class="[
          surface ? 'p-4' : 'card p-4',
          loading ? 'opacity-60' : '',
          clickable
            ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40'
            : '',
          isSelected(key) ? 'bg-primary-50/40 ring-1 ring-inset ring-primary-400 dark:bg-primary-900/10' : '',
          reorder?.rowClass(i),
          rowClass?.(row, i)
        ]"
        :aria-labelledby="fields.title.length && !$slots.card ? titleId(i) : undefined"
        :data-reorder-row="reorder ? i : undefined"
        :tabindex="clickable ? 0 : undefined"
        @click="emit('row-click', row)"
        @keydown.enter.space.self.prevent="emit('row-click', row)"
      >
        <slot
          name="card"
          :row="row"
          :index="i"
          :selected="isSelected(key)"
          :toggle="(on?: boolean) => emit('select', key, on ?? !isSelected(key), i)"
          :expanded="expanded.has(key)"
          :toggle-expand="() => emit('expand', row, key)"
        >
          <div class="flex items-start gap-2">
            <span v-if="selectable" class="flex h-6 shrink-0 items-center" @click.stop>
              <SCheckbox
                bare
                :model-value="isSelected(key)"
                :disabled="!canSelect(row)"
                :aria-label="t('ui.selectRow')"
                @update:model-value="emit('select', key, $event, i)"
              />
            </span>
            <ReorderHandle v-if="reorder" class="-my-1.5 shrink-0" :index="i" :reorder="reorder" :describedby="reorderHelp" @click.stop />
            <div :id="titleId(i)" class="min-w-0 flex-1 break-words text-[15px] font-semibold leading-6 text-fg">
              <template v-for="(c, n) in fields.title" :key="c.key"
                >{{ n ? ' · ' : '' }}<Cell :column="c" :row="row" :index="i"
              /></template>
            </div>
            <div v-if="fields.status.length" class="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <Cell v-for="c in fields.status" :key="c.key" :column="c" :row="row" :index="i" />
            </div>
          </div>
          <div v-if="fields.subtitle.length" class="mt-0.5 break-words text-xs text-fg-muted">
            <template v-for="(c, n) in fields.subtitle" :key="c.key"
              >{{ n ? ' · ' : '' }}<Cell :column="c" :row="row" :index="i"
            /></template>
          </div>
          <TableCardFields v-if="fields.meta.length" class="mt-3" :columns="fields.meta">
            <template #default="{ column }"><Cell :column="column" :row="row" :index="i" /></template>
          </TableCardFields>
          <template v-if="fields.detail.length || (expandable && $slots.expand)">
            <button
              type="button"
              class="-ms-1 mt-2 inline-flex h-control-sm items-center gap-1 rounded px-1 text-xs font-medium text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400"
              :aria-expanded="expanded.has(key)"
              :aria-controls="expanded.has(key) ? detailId(i) : undefined"
              @click.stop="emit('expand', row, key)"
            >
              <SIcon name="chevron-right" class="h-3.5 w-3.5 transition-transform" :class="expanded.has(key) ? 'rotate-90' : ''" />
              {{ expanded.has(key) ? t('ui.hideRowDetails') : t('ui.rowDetails') }}
            </button>
            <div v-if="expanded.has(key)" :id="detailId(i)" class="mt-2 space-y-3">
              <TableCardFields v-if="fields.detail.length" :columns="fields.detail">
                <template #default="{ column }"><Cell :column="column" :row="row" :index="i" /></template>
              </TableCardFields>
              <slot v-if="expandable" name="expand" :row="row" />
            </div>
          </template>
          <div v-if="fields.actions.length" class="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-line pt-2 [&>*]:flex-wrap">
            <Cell v-for="c in fields.actions" :key="c.key" :column="c" :row="row" :index="i" />
          </div>
        </slot>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.s-table-dragging {
  opacity: 0.45;
}
.s-table-drop-before {
  box-shadow: 0 -2px 0 rgb(var(--primary-500, 20 184 166));
}
.s-table-drop-after {
  box-shadow: 0 2px 0 rgb(var(--primary-500, 20 184 166));
}
</style>
