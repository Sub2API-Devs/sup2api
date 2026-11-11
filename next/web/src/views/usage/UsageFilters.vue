<script setup lang="ts">
// The search toolbar of the usage lists, after new-api's log filters: the time
// range (#range), the log type and the common fields on the first row, the
// rest behind the bar's More filters (usageSearchLayout), then the totals
// (#stats) with extra toggles (#actions, then the secondary #tools) beside
// Reset / Search. Text filters apply on Search (or Enter) only; the time range
// slot applies at once. Parameters set off the first row (More filters, or
// ones the search keeps no field for, brought by a link or a table action)
// show as removable chips under the bar.
// With `logTypes` the first filter picks what the page lists, as new-api's log
// type does; it applies at once, with any filter typed so far. A type these
// fields do not search (`searchable` = false) brings its own in #filters.
// The filters sit in an SFilterBar: on a phone the range sits above it, the
// log type and the first-row fields stay in sight beside its Filters button
// and the More filters fold into its sheet, whose Done applies the search;
// #tools go to the end of that sheet.
import { computed, reactive, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SFilterBar, SFilterChips, SSelect, useViewport } from '@sub2api/ui'
import UsageFilterFields from './UsageFilterFields.vue'
import UsageSearchButtons from './UsageSearchButtons.vue'
import { chipParams, fieldText, usageSearchLayout, useUsageSearchLabels } from './usageFilters'

const props = withDefaults(defineProps<{
  modelValue: Record<string, unknown>
  admin?: boolean
  /** The account filter, for an operator who may read accounts. */
  accounts?: boolean
  /** Groups to pick from; without them the group is typed (a name). */
  groupOptions?: Array<{ value: string | number; label: string }>
  /** The request types (protocol ids) under the current search, for the type select. */
  protocolOptions?: string[]
  /** What the page can list, for the log type select; none hides it. */
  logTypes?: Array<{ value: string; label: string }>
  logType?: string
  searchable?: boolean
}>(), { admin: false, accounts: false, groupOptions: () => [], protocolOptions: () => [], logTypes: () => [], logType: '', searchable: true })
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string>]; 'update:logType': [value: string]; reset: [] }>()
const { t } = useI18n()
const { compact } = useViewport()
const slots = useSlots()
/** The stats and actions row; without either the reset and search buttons end the filter row. */
const bottomRow = computed(() => !!slots.stats || !!slots.actions)
const layout = computed(() =>
  usageSearchLayout({ admin: props.admin, accounts: props.accounts, groupSelect: props.groupOptions.length > 0, errors: props.logType === 'errors' })
)
const { label, valueLabel } = useUsageSearchLabels(() => props.groupOptions, () => props.protocolOptions, () => String(props.modelValue.protocol ?? ''))
const draft = reactive<Record<string, string>>({})
watch(() => props.modelValue, value => {
  for (const key of layout.value.params) draft[key] = String(value[key] ?? '')
}, { deep: true, immediate: true })
/** The More filters in effect: the bar's badge, and on a phone its Filters button's (the sheet holds no other search field). */
const advancedCount = computed(() => (props.searchable ? layout.value.advanced.filter(field => fieldText(props.modelValue, field)).length : 0))
const chips = computed(() =>
  props.searchable
    ? layout.value.tagged
      .filter(key => String(props.modelValue[key] ?? '') !== '')
      .map(key => ({ key, label: label(key), value: valueLabel(key, String(props.modelValue[key])) }))
    : []
)
/** Applies the parameters `keys` from the draft, or cleared. */
function emitParams(keys: string[], clear = false) {
  emit('update:modelValue', Object.fromEntries(keys.map(key => [key, clear ? '' : String(draft[key] ?? '').trim()])))
}
const apply = () => emitParams(layout.value.params)
function reset() {
  emitParams(layout.value.params, true)
  emit('reset')
}
function pickLogType(value: unknown) {
  emit('update:logType', String(value))
  apply()
}
</script>

<template>
  <form
    class="mb-4 w-full rounded-xl border border-line bg-surface p-3 shadow-sm"
    @submit.prevent="apply"
  >
    <div class="flex flex-wrap items-start gap-2">
      <!-- On a phone the range takes its own row above the bar; on a wide screen it opens the bar's row. -->
      <div
        v-if="compact && $slots.range"
        class="min-w-0 max-w-full"
      >
        <slot name="range" />
      </div>
      <SFilterBar
        :card="false"
        class="min-w-[16rem] flex-1"
        :aria-label="t('stats.filters')"
        :advanced-count="advancedCount"
        @done="apply"
      >
        <template
          v-if="$slots.range || logTypes.length || searchable"
          #primary
        >
          <slot
            v-if="!compact"
            name="range"
          />
          <!-- Two columns beside the Filters button on a phone, an odd last field taking the row; on a wide screen the
               search fields share the row, while a type with its own filters keeps its selects at their size. -->
          <div
            class="grid grid-cols-2 gap-2 md:contents max-md:[&>:last-child:nth-child(odd)]:col-span-2"
            :class="searchable ? 'md:[&>*]:flex-[1_1_9rem]' : 'md:[&>*]:flex-[0_1_12rem]'"
          >
            <SSelect
              v-if="logTypes.length"
              :model-value="logType"
              size="sm"
              :aria-label="t('usage.search.logType')"
              :options="logTypes"
              data-testid="filter-log-type"
              @update:model-value="pickLogType"
            />
            <UsageFilterFields
              v-if="searchable"
              :fields="layout.primary"
              :values="draft"
              :group-options="groupOptions"
              @update="Object.assign(draft, $event)"
            />
          </div>
        </template>
        <div
          v-if="$slots.filters"
          class="md:contents md:[&>*]:flex-[0_1_12rem]"
        >
          <slot name="filters" />
        </div>
        <template
          v-if="searchable"
          #advanced
        >
          <UsageFilterFields
            :fields="layout.advanced"
            :values="draft"
            :group-options="groupOptions"
            :protocol-options="protocolOptions"
            @update="Object.assign(draft, $event)"
          />
        </template>
        <template
          v-if="compact && $slots.tools"
          #end
        >
          <slot name="tools" />
        </template>
      </SFilterBar>
      <div
        v-if="!searchable"
        class="ms-auto flex flex-wrap items-center justify-end gap-2"
      >
        <slot name="actions" />
        <slot
          v-if="!compact"
          name="tools"
        />
      </div>
      <!-- With no stats or actions the reset and search buttons end this row instead of taking one of their own. -->
      <div
        v-if="searchable && !bottomRow"
        class="ms-auto flex items-center gap-2"
      >
        <UsageSearchButtons @reset="reset" />
      </div>
    </div>
    <SFilterChips
      class="mt-2"
      :items="chips"
      @remove="emitParams(chipParams($event), true)"
      @clear="emitParams(layout.tagged, true)"
    />
    <div
      v-if="searchable && bottomRow"
      class="mt-3 flex flex-wrap items-center gap-2"
    >
      <slot name="stats" />
      <div class="ms-auto flex flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
        <slot
          v-if="!compact"
          name="tools"
        />
        <UsageSearchButtons @reset="reset" />
      </div>
    </div>
  </form>
</template>
