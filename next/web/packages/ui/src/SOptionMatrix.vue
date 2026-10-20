<script setup lang="ts">
// A grid of single-choice rows that share one set of column headers: the
// columns are the options, each row is one field. It replaces a column of
// selects when many fields pick from the same small set of values, trading
// twelve bordered 40px controls for twelve 32px rows under one header.
// `rows` lays the fields out flat; `groups` adds a header row per group whose
// radios set every row of that group at once, and `collapsible` lets those
// headers fold their rows away. A row may narrow the choices with its own
// `options` (unsupported columns stay disabled rather than blank) and mark
// itself with `marked` (a change relative to some baseline) or `hint` (a line
// below the label). A row whose own value defers elsewhere ("follow") names
// the value that applies with `effective`; that cell is tinted and a legend
// appears. Each row is its own radiogroup, so arrow keys move within
// a field; the whole cell is the click target. `change` reports only the cells
// one interaction set, for callers that must tell an explicit choice apart from
// a value that merely already matched.
import { computed, nextTick, ref, useId } from 'vue'
import type { OptionMatrixGroup, OptionMatrixRow, SelectOption } from './types'
import { useUiT } from './i18n'
import { useFieldControl } from './field'
import SIcon from './SIcon.vue'

type Value = SelectOption['value'] | undefined

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, Value>
    columns: SelectOption[]
    rows?: OptionMatrixRow[]
    groups?: OptionMatrixGroup[]
    disabled?: boolean
    collapsible?: boolean
    columnWidth?: string
    ariaLabel?: string
    error?: boolean
  }>(),
  { rows: () => [], groups: () => [], columnWidth: '4.5rem' }
)
const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, Value>): void
  (e: 'change', patch: Record<string, Value>): void
}>()
const t = useUiT()
const uid = useId()
const { a11y } = useFieldControl(props, false)
const toggled = ref<Record<string, boolean>>({})
// Flat `rows` become one unnamed group, so the template has a single shape.
const sections = computed<OptionMatrixGroup[]>(() => (props.groups.length ? props.groups : props.rows.length ? [{ key: '', label: '', rows: props.rows }] : []))
const gridStyle = computed(() => ({ gridTemplateColumns: `minmax(0,1fr) repeat(${props.columns.length}, ${props.columnWidth})` }))

function isOpen(group: OptionMatrixGroup): boolean {
  return !props.collapsible || (toggled.value[group.key] ?? group.defaultOpen ?? true)
}
function allows(row: OptionMatrixRow, value: Value): boolean {
  return (row.options ?? props.columns).some(option => option.value === value && !option.disabled)
}
function cellDisabled(row: OptionMatrixRow, column: SelectOption): boolean {
  return !!props.disabled || !!row.disabled || !!column.disabled || !allows(row, column.value)
}
// The cell a deferring row resolves to (its own pick is elsewhere, e.g. "follow").
function defersTo(row: OptionMatrixRow, column: SelectOption): boolean {
  return row.effective !== undefined && row.effective === column.value && props.modelValue[row.key] !== column.value
}
const hasDeferred = computed(() => sections.value.some(group => isOpen(group) && group.rows.some(row => props.columns.some(column => defersTo(row, column)))))
function editable(group: OptionMatrixGroup): OptionMatrixRow[] {
  return props.disabled ? [] : group.rows.filter(row => !row.disabled)
}
// A header cell is live only if it would set at least one row.
function headerDisabled(group: OptionMatrixGroup, column: SelectOption): boolean {
  return !!column.disabled || !editable(group).some(row => allows(row, column.value))
}
// A group header shows a value only when every row it would set already holds it.
function groupValue(group: OptionMatrixGroup): Value {
  const rows = editable(group)
  if (!rows.length) return undefined
  const first = props.modelValue[rows[0]!.key]
  return first !== undefined && rows.every(row => props.modelValue[row.key] === first) ? first : undefined
}
function set(patch: Record<string, Value>) {
  if (!Object.keys(patch).length) return
  emit('change', patch)
  emit('update:modelValue', { ...props.modelValue, ...patch })
}
// Keep the DOM in step when the parent declines the change (controlled value).
// `want` is re-read after the patch so an accepted change is not undone.
function settle(event: Event, want: () => boolean) {
  const el = event.target as HTMLInputElement
  nextTick(() => { if (el.checked !== want()) el.checked = want() })
}
// A row is edited in an open group: pin it open, so a `defaultOpen` that
// follows the values does not fold the group under the pointer.
function onCell(event: Event, group: OptionMatrixGroup, row: OptionMatrixRow, column: SelectOption) {
  if (props.collapsible) toggled.value[group.key] = true
  set({ [row.key]: column.value })
  settle(event, () => props.modelValue[row.key] === column.value)
}
function onGroup(event: Event, group: OptionMatrixGroup, column: SelectOption) {
  const patch: Record<string, Value> = {}
  for (const row of editable(group)) {
    if (allows(row, column.value) && props.modelValue[row.key] !== column.value) patch[row.key] = column.value
  }
  set(patch)
  settle(event, () => groupValue(group) === column.value)
}
</script>

<template>
  <div class="overflow-x-auto">
    <div
      class="min-w-[20rem]"
      role="group"
      v-bind="a11y"
    >
      <div
        class="grid items-end border-b border-line pb-1.5"
        :style="gridStyle"
        aria-hidden="true"
      >
        <span />
        <span
          v-for="column in columns"
          :key="String(column.value)"
          class="truncate px-1 text-center text-xs font-medium text-fg-muted"
        >{{ column.label }}</span>
      </div>
      <div
        v-for="(group, index) in sections"
        :key="group.key"
        :class="index ? 'border-t border-line' : ''"
      >
        <div
          v-if="group.key"
          class="grid items-center"
          :style="gridStyle"
          role="radiogroup"
          :aria-label="`${group.label} · ${t('ui.setAll')}`"
        >
          <component
            :is="collapsible ? 'button' : 'div'"
            :type="collapsible ? 'button' : undefined"
            class="flex min-w-0 items-center gap-1.5 py-1 pl-2 pr-3 text-left"
            :class="collapsible ? 'rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40' : ''"
            :aria-expanded="collapsible ? isOpen(group) : undefined"
            :aria-controls="collapsible ? `${uid}-${group.key}` : undefined"
            @click="collapsible && (toggled[group.key] = !isOpen(group))"
          >
            <SIcon
              v-if="collapsible"
              name="chevron-down"
              class="h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform duration-150"
              :class="isOpen(group) ? '' : '-rotate-90'"
            />
            <span class="truncate text-sm font-medium text-fg">{{ group.label }}</span>
            <span
              v-if="group.badge"
              class="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] leading-none text-fg-muted"
            >{{ group.badge }}</span>
          </component>
          <label
            v-for="column in columns"
            :key="String(column.value)"
            class="flex h-8 items-center justify-center"
            :class="headerDisabled(group, column) ? 'cursor-not-allowed' : 'cursor-pointer'"
          >
            <input
              type="radio"
              class="radio"
              :name="`${uid}-all-${group.key}`"
              :value="String(column.value)"
              :checked="groupValue(group) === column.value"
              :disabled="headerDisabled(group, column)"
              :aria-label="column.label"
              @change="onGroup($event, group, column)"
            >
          </label>
        </div>
        <div
          v-if="isOpen(group)"
          :id="group.key ? `${uid}-${group.key}` : undefined"
        >
          <div
            v-for="row in group.rows"
            :key="row.key"
            class="grid items-center rounded-lg hover:bg-surface-2/60"
            :style="gridStyle"
            role="radiogroup"
            :aria-label="row.label"
            :data-testid="row.testid"
          >
            <span
              class="min-w-0 border-l-2 py-1 pl-2 pr-3"
              :class="row.marked ? 'border-warning-400' : 'border-transparent'"
            >
              <span class="block truncate text-sm text-fg">{{ row.label }}</span>
              <span
                v-if="row.hint"
                class="block truncate text-xs leading-4 text-fg-subtle"
              >{{ row.hint }}</span>
            </span>
            <label
              v-for="column in columns"
              :key="String(column.value)"
              class="flex h-8 items-center justify-center"
              :class="cellDisabled(row, column) ? 'cursor-not-allowed' : 'cursor-pointer'"
              :title="defersTo(row, column) ? t('ui.effective') : undefined"
            >
              <span
                class="flex h-6 w-9 items-center justify-center rounded-md"
                :class="defersTo(row, column) ? 'bg-primary-500/10' : ''"
              >
                <input
                  type="radio"
                  class="radio"
                  :name="`${uid}-${row.key}`"
                  :value="String(column.value)"
                  :checked="modelValue[row.key] === column.value"
                  :disabled="cellDisabled(row, column)"
                  :aria-label="defersTo(row, column) ? `${column.label} · ${t('ui.effective')}` : column.label"
                  @change="onCell($event, group, row, column)"
                >
              </span>
            </label>
          </div>
        </div>
      </div>
      <p
        v-if="hasDeferred"
        class="mt-1.5 flex items-center gap-1.5 pl-2 text-xs text-fg-subtle"
      >
        <span class="inline-block h-3 w-5 rounded bg-primary-500/10" />{{ t('ui.effective') }}
      </p>
    </div>
  </div>
</template>
