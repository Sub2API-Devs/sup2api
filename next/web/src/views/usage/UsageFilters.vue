<script setup lang="ts">
// The search toolbar of the usage lists: time range (#range) and the common
// filters on the first row (the request type select lists the protocol ids
// seen under the current search, `protocolOptions`), the rest behind "More
// filters", then the totals (#stats) with extra toggles (#actions, then the
// secondary #tools) beside Reset / Search. Text filters
// apply on Search (or Enter) only; the time range slot applies at once.
// With `logTypes` the first filter picks what the page lists, as new-api's log
// type does; it applies at once, with any filter typed so far. A type these
// fields do not search (`searchable` = false) brings its own in #filters.
// The filters sit in an SFilterBar: on a phone the log type and the three
// text searches stay in sight beside its Filters button, and the selects and
// the More filters fields (UsageAdvancedFilters, under the first row on a
// wide screen) fold into its sheet, whose Done applies the search; #tools
// go to the end of that sheet.
import { computed, reactive, ref, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SFilterBar, SIcon, SInput, SSelect, useViewport } from '@sub2api/ui'
import { activeFilterCount } from '@/composables/useList'
import UsageAdvancedFilters from './UsageAdvancedFilters.vue'

const props = withDefaults(defineProps<{
  modelValue: Record<string, unknown>
  admin?: boolean
  /** The account filters, for an operator who may read accounts. */
  accounts?: boolean
  groupOptions?: Array<{ value: string | number; label: string }>
  /** The request types (protocol ids) under the current search, for the first-row select. */
  protocolOptions?: string[]
  /** What the page can list, for the log type select; none hides it. */
  logTypes?: Array<{ value: string; label: string }>
  logType?: string
  searchable?: boolean
}>(), { admin: false, accounts: false, groupOptions: () => [], protocolOptions: () => [], logTypes: () => [], logType: '', searchable: true })
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string>]; 'update:logType': [value: string]; reset: [] }>()
const { t } = useI18n()
const expanded = ref(false)
const { compact } = useViewport()
const slots = useSlots()
/** The stats and actions row; without either the reset and search buttons end the filter row. */
const bottomRow = computed(() => !!slots.stats || !!slots.actions)
const draft = reactive<Record<string, string>>({})
const primary = [
  { key: 'model_contains', icon: 'cpu' },
  { key: 'api_key_name', icon: 'key' },
  { key: 'client_ip', icon: 'globe' }
]
const advanced = computed(() => [
  'api_key_id', 'group_id', 'group_name', 'request_id', 'client_request_id', 'platform', 'endpoint', 'status_code', 'error_type',
  ...(props.admin ? ['user_id', 'user_email'] : []),
  ...(props.admin && props.accounts ? ['account_id', 'account_name'] : []),
  ...(props.admin ? ['plugin_key', 'account_type', 'node_id', 'upstream_model', 'upstream_protocol'] : [])
])
const keys = computed(() => [...primary.map(p => p.key), 'protocol', ...advanced.value, 'success', 'stream', 'billing_status'])
watch(() => props.modelValue, value => {
  for (const key of keys.value) draft[key] = String(value[key] ?? '')
}, { deep: true, immediate: true })
// Without field labels the empty choice names the filter, like a placeholder.
const successOptions = computed(() => [{ value: '', label: t('common.status') }, { value: 'true', label: t('usage.success.ok') }, { value: 'false', label: t('usage.success.failed') }])
// A type preset by a link or an earlier search stays selectable even when the
// current range no longer has it.
const protocolChoices = computed(() => {
  const values = [...props.protocolOptions]
  const current = String(draft.protocol || '')
  if (current && !values.includes(current)) values.push(current)
  return [{ value: '', label: t('usage.search.protocol') }, ...values.map(value => ({ value, label: value }))]
})
/** How many of `fields` the applied search sets. */
const setCount = (fields: string[]) => activeFilterCount(Object.fromEntries(fields.map(key => [key, props.modelValue[key]])))
const advancedFields = computed(() => [...advanced.value, 'stream', 'billing_status'])
const advancedCount = computed(() => setCount(advancedFields.value))
/** The Filters badge on a phone: what is set in its sheet (the status select is not there for failed requests). */
const sheetCount = computed(() =>
  props.searchable ? setCount(['protocol', ...(props.logType === 'errors' ? [] : ['success']), ...advancedFields.value]) : 0
)
function apply() {
  emit('update:modelValue', Object.fromEntries(keys.value.map(key => [key, String(draft[key] ?? '').trim()])))
}
function reset() {
  for (const key of keys.value) draft[key] = ''
  apply()
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
      <div
        v-if="$slots.range"
        class="min-w-0 max-w-full"
      >
        <slot name="range" />
      </div>
      <div
        class="grid min-w-[16rem] flex-1 grid-cols-1 gap-2"
        :class="searchable ? 'sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]' : 'sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]'"
      >
        <!-- On a wide screen the bar's box drops out (contents): its controls are cells of this grid. -->
        <SFilterBar
          :card="false"
          class="md:contents"
          :aria-label="t('stats.filters')"
          :active-count="sheetCount"
          @done="apply"
        >
          <template
            v-if="logTypes.length || searchable"
            #primary
          >
            <!-- Two columns beside the Filters button on a phone, an odd last field taking the row. -->
            <div class="grid grid-cols-2 gap-2 md:contents max-md:[&>:last-child:nth-child(odd)]:col-span-2">
              <SSelect
                v-if="logTypes.length"
                :model-value="logType"
                size="sm"
                :aria-label="t('usage.search.logType')"
                :options="logTypes"
                data-testid="filter-log-type"
                @update:model-value="pickLogType"
              />
              <template v-if="searchable">
                <SInput
                  v-for="p in primary"
                  :key="p.key"
                  v-model="draft[p.key]"
                  size="sm"
                  :icon="p.icon"
                  :placeholder="t(`usage.search.${p.key}`)"
                  :title="t(`usage.search.${p.key}`)"
                  :aria-label="t(`usage.search.${p.key}`)"
                  :maxlength="256"
                  :mono="p.key === 'client_ip'"
                  :data-testid="`filter-${p.key}`"
                />
              </template>
            </div>
          </template>
          <template v-if="searchable">
            <SSelect
              v-model="draft.protocol"
              size="sm"
              :aria-label="t('usage.search.protocol')"
              :options="protocolChoices"
              data-testid="filter-protocol"
            />
            <!-- The failed requests are a log type: the status is settled there. -->
            <SSelect
              v-if="logType !== 'errors'"
              v-model="draft.success"
              size="sm"
              :aria-label="t('common.status')"
              :options="successOptions"
              data-testid="filter-success"
            />
          </template>
          <slot name="filters" />
          <UsageAdvancedFilters
            v-if="compact && searchable"
            :fields="advanced"
            :values="draft"
            :group-options="groupOptions"
            @update="(key, value) => (draft[key] = value)"
          />
          <template
            v-if="compact && $slots.tools"
            #end
          >
            <slot name="tools" />
          </template>
        </SFilterBar>
      </div>
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
      <SButton
        v-if="searchable"
        type="button"
        variant="ghost"
        size="sm"
        class="max-md:hidden"
        :class="advancedCount && !expanded ? '!text-primary-600 dark:!text-primary-400' : ''"
        :aria-expanded="expanded"
        data-testid="toggle-usage-filters"
        @click="expanded = !expanded"
      >
        {{ t('usage.search.advanced') }}
        <span
          v-if="advancedCount"
          class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-xxs text-white"
        >{{ advancedCount }}</span>
        <SIcon
          name="chevron-down"
          class="h-3.5 w-3.5 transition-transform"
          :class="expanded ? 'rotate-180' : ''"
        />
      </SButton>
      <!-- With no stats or actions the reset and search buttons end this row instead of taking one of their own. -->
      <div
        v-if="searchable && !bottomRow"
        class="ms-auto flex items-center gap-2"
      >
        <SButton
          type="button"
          size="sm"
          data-testid="reset-usage-filters"
          @click="reset"
        >
          {{ t('common.reset') }}
        </SButton>
        <SButton
          type="submit"
          variant="primary"
          size="sm"
          icon="search"
          data-testid="search-usage"
        >
          {{ t('common.search') }}
        </SButton>
      </div>
    </div>
    <UsageAdvancedFilters
      v-if="!compact && expanded && searchable"
      class="mt-2 border-t border-dashed border-line pt-2"
      :fields="advanced"
      :values="draft"
      :group-options="groupOptions"
      @update="(key, value) => (draft[key] = value)"
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
        <SButton
          type="button"
          size="sm"
          data-testid="reset-usage-filters"
          @click="reset"
        >
          {{ t('common.reset') }}
        </SButton>
        <SButton
          type="submit"
          variant="primary"
          size="sm"
          icon="search"
          data-testid="search-usage"
        >
          {{ t('common.search') }}
        </SButton>
      </div>
    </div>
  </form>
</template>
