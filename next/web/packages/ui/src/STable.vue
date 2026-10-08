<script setup lang="ts" generic="T extends Record<string, any>">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SSpinner from './SSpinner.vue'
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
  }>(),
  { rowKey: 'id' }
)
const emit = defineEmits<{ (e: 'row-click', row: T): void; (e: 'expand', row: T, open: boolean): void }>()
const { t } = useI18n()
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
</script>

<template>
  <div class="table-container" :class="{ 's-table-fit-expanded': fitExpandedToContainer }">
    <table class="table" :class="dense ? 'table-dense' : ''">
      <thead>
        <tr>
          <th v-if="expandable" class="w-8" />
          <th
            v-for="c in columns"
            :key="c.key"
            :style="c.width ? { width: c.width } : undefined"
            :class="[alignCls(c.align), { 's-table-actions': c.key === 'actions' }]"
          >
            {{ c.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading && rows.length === 0">
          <td :colspan="columns.length + (expandable ? 1 : 0)" class="py-10 text-center text-gray-400">
            <SSpinner />
          </td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td :colspan="columns.length + (expandable ? 1 : 0)" class="py-10 text-center text-gray-400">
            <slot name="empty">{{ emptyText || t('ui.noData') }}</slot>
          </td>
        </tr>
        <template v-for="(row, i) in rows" :key="String(keyOf(row, i))">
          <tr :class="loading ? 'opacity-60' : ''" @click="emit('row-click', row)">
            <td v-if="expandable" class="w-8 !pr-0">
              <button class="rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" @click.stop="toggle(row, i)">
                <svg
                  class="h-4 w-4 transition-transform"
                  :class="expanded.has(keyOf(row, i)) ? 'rotate-90' : ''"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </td>
            <td v-for="c in columns" :key="c.key" :class="[alignCls(c.align), c.class, { 's-table-actions': c.key === 'actions' }]">
              <slot :name="`cell-${c.key}`" :row="row" :value="valueOf(row, c.key)" :index="i">
                {{ display(valueOf(row, c.key)) }}
              </slot>
            </td>
          </tr>
          <tr v-if="expandable && expanded.has(keyOf(row, i))" class="s-table-expand">
            <td :colspan="columns.length + 1" class="bg-gray-50/60 dark:bg-dark-900/40">
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
</template>

<style scoped>
.table-container {
  max-width: 100%;
  min-width: 0;
  isolation: isolate;
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
