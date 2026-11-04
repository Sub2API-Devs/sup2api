<script setup lang="ts">
// The usage statistics, for an operator (`admin`: all users) or for the
// caller: the search bar (time range, granularity, filters), the four totals
// and the charts. Every part follows the same filters, which a link may preset
// (?user_id=, ?from=, …). The page header (title, refresh) stays with the view
// and bumps `revision`. The requests themselves are on the usage records page.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@sub2api/host'
import { SDateRange, SSegmented, type RangeKey } from '@sub2api/ui'
import UsageSummaryCards from '@/components/UsageSummaryCards.vue'
import UsageCharts from '@/components/stats/UsageCharts.vue'
import { autoGranularity, hourAllowed, type Granularity } from '@/components/stats/stats'
import { useAuthStore } from '@/stores/auth'
import UsageFilters from './UsageFilters.vue'
import { baseUsageFilters, queryUsageFilters } from './usageFilters'
import { useUsageSummary } from './useUsageSummary'

const props = withDefaults(
  defineProps<{
    summaryPath: string
    defaultRange: RangeKey
    admin?: boolean
    groupOptions?: Array<{ value: string | number; label: string }>
    /** Bumped by the page's refresh button: reload everything (the page owns the header). */
    revision?: number
  }>(),
  { admin: false, groupOptions: undefined, revision: 0 }
)
const emit = defineEmits<{ (e: 'update:loading', value: boolean): void }>()
const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const showAccount = computed(() => props.admin && auth.has('account:read'))

const fromQuery = queryUsageFilters(route.query, props.admin)
const range = ref<RangeKey>(fromQuery.from || fromQuery.to ? 'custom' : props.defaultRange)
const filters = reactive<Record<string, string>>({ ...baseUsageFilters(props.defaultRange), ...fromQuery })

// Granularity: automatic (hours up to a day) until the user picks one; a new
// range goes back to automatic. Hours over 31 days are refused by the server.
const picked = ref<Granularity | null>(null)
watch(() => [filters.from, filters.to], () => (picked.value = null))
const canHour = computed(() => hourAllowed(String(filters.from || ''), String(filters.to || '')))
const granularity = computed<Granularity>(() => {
  const g = picked.value ?? autoGranularity(String(filters.from || ''), String(filters.to || ''))
  return g === 'hour' && !canHour.value ? 'day' : g
})
const granularityOptions = computed(() => [
  { value: 'day', label: t('stats.day') },
  { value: 'hour', label: t('stats.hour'), disabled: !canHour.value }
])

const totals = useUsageSummary(props.summaryPath, filters, 'none')

// The caller's API key names for the "by API key" breakdown (keyed by id).
const keyNames = reactive(new Map<string, string>())
if (!props.admin && auth.has('apikey:self:manage')) {
  api
    .list<{ id: number; name: string }>('/me/api-keys', { page_size: 200 })
    .then((res) => res.items.forEach((k) => keyNames.set(String(k.id), k.name)))
    .catch(() => {})
}
const secondary = computed(() =>
  props.admin
    ? { groupBy: 'group', title: t('stats.groupDist'), keyLabel: t('stats.group') }
    : { groupBy: 'api_key', title: t('stats.keyDist'), keyLabel: t('stats.apiKey'), labelOf: (k: string) => keyNames.get(k) || `#${k}` }
)

const revisionCharts = ref(0)
watch(
  () => props.revision,
  () => {
    totals.reload()
    revisionCharts.value++
  }
)
watch(totals.loading, (v) => emit('update:loading', v), { immediate: true })

function filterBy(patch: Record<string, string>) {
  Object.assign(filters, patch)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UsageFilters class="!mb-0" :model-value="filters" :admin="admin" :accounts="showAccount" :group-options="groupOptions" @update:model-value="Object.assign(filters, $event)">
      <template #range>
        <div class="flex flex-wrap items-center gap-2">
          <SDateRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" size="sm" :label="false" />
          <SSegmented
            :model-value="granularity"
            :options="granularityOptions"
            size="sm"
            :aria-label="t('stats.granularity')"
            :title="canHour ? undefined : t('stats.hourTooLong')"
            data-testid="usage-granularity"
            @update:model-value="picked = $event as Granularity"
          />
        </div>
      </template>
    </UsageFilters>

    <UsageSummaryCards :totals="totals.rows.value[0] || null" :loading="totals.loading.value" />

    <UsageCharts
      :summary-path="summaryPath"
      :filters="filters"
      :granularity="granularity"
      :secondary="secondary"
      :revision="revisionCharts"
      :group="admin ? 'usage-admin' : 'usage-mine'"
      :model-sources="admin"
      @select-model="filterBy({ model_contains: $event })"
      @select-secondary="(k: string) => filterBy(admin ? { group_name: k } : { api_key_id: k })"
    />
  </div>
</template>
