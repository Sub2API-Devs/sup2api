<script setup lang="ts">
// Usage records with their statistics, for an operator (`admin`: all users)
// or for the caller: the search bar (time range, granularity, filters), the
// four totals, the charts (collapsible, remembered per page) and the tabs -
// the request list, the failed requests, the client IPs, plus any tab the
// page adds (`extraTabs`, rendered from the #tab-<key> slot). Every part
// follows the same filters. The open tab is ?tab= in the URL. The page header
// (title, refresh) stays with the view and bumps `revision`.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SButton, SDateRange, SPagination, SSegmented, STabs, rangeBounds, type RangeKey, type TabItem } from '@sub2api/ui'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import UsageSummaryCards from '@/components/UsageSummaryCards.vue'
import UsageCharts from '@/components/stats/UsageCharts.vue'
import { autoGranularity, hourAllowed, type Granularity } from '@/components/stats/stats'
import UsageFilters from './UsageFilters.vue'
import UsageIPPanel from './UsageIPPanel.vue'
import UsageTable from './UsageTable.vue'
import { useUsageSummary } from './useUsageSummary'
import type { UsageRow } from './usage'

const props = withDefaults(
  defineProps<{
    listPath: string
    summaryPath: string
    defaultRange: RangeKey
    admin?: boolean
    groupOptions?: Array<{ value: string | number; label: string }>
    /** Bumped by the page's refresh button: reload everything (the page owns the header). */
    revision?: number
    extraTabs?: TabItem[]
  }>(),
  { admin: false, groupOptions: undefined, revision: 0, extraTabs: () => [] }
)
const emit = defineEmits<{ (e: 'update:loading', value: boolean): void; (e: 'update:tab', value: string): void }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const range = ref<RangeKey>(props.defaultRange)
const baseFilters = {
  ...rangeBounds(props.defaultRange),
  model_contains: '',
  success: '',
  client_ip: '',
  // exact match on the client's X-Request-Id (CONTRACTS §14.4)
  client_request_id: ''
}
const { items, loading, page, pageSize, total, filters, reload: reloadList } = useList<UsageRow>(props.listPath, baseFilters)

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

// The charts panel: open or closed survives a reload, per browser and per page.
const chartsKey = `s2a.${props.admin ? 'usage-log' : 'my-usage-log'}.charts`
const chartsOpen = ref(localStorage.getItem(chartsKey) !== '0')
watch(chartsOpen, (v) => localStorage.setItem(chartsKey, v ? '1' : '0'))

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

// Tabs.
const tabs = computed<TabItem[]>(() => [
  { key: 'records', label: t('stats.tabs.records'), badge: total.value || undefined },
  { key: 'errors', label: t('stats.tabs.errors') },
  { key: 'ips', label: t('stats.tabs.ips') },
  ...props.extraTabs
])
const tabKeys = () => tabs.value.map((x) => x.key)
const initialTab = String(route.query.tab || '')
const tab = ref(tabKeys().includes(initialTab) ? initialTab : 'records')
watch(
  tab,
  (v) => {
    emit('update:tab', v)
    if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v === 'records' ? undefined : v } })
  },
  { immediate: true }
)

// Failed requests: the same list with success=false, loaded while its tab is open.
const errors = useList<UsageRow>(props.listPath, { ...baseFilters, success: 'false' }, { immediate: false })
function syncErrors() {
  Object.assign(errors.filters, { ...filters, success: 'false' })
}
watch(
  () => ({ ...filters }),
  () => {
    if (tab.value === 'errors') syncErrors()
  },
  { deep: true }
)
watch(tab, (v) => {
  if (v === 'errors') {
    syncErrors()
    errors.reload()
  }
}, { immediate: true })
const ips = useUsageSummary(props.summaryPath, filters, 'ip', () => tab.value === 'ips')

const revisionCharts = ref(0)
function reload() {
  reloadList()
  totals.reload()
  revisionCharts.value++
  if (tab.value === 'errors') errors.reload()
  if (tab.value === 'ips') ips.reload()
}
watch(() => props.revision, reload)
const busy = computed(() => loading.value || totals.loading.value || (tab.value === 'errors' && errors.loading.value))
watch(busy, (v) => emit('update:loading', v), { immediate: true })

function filterBy(patch: Record<string, string>) {
  Object.assign(filters, patch)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UsageFilters class="!mb-0" :model-value="filters" :admin="admin" :group-options="groupOptions" @update:model-value="Object.assign(filters, $event)">
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

    <section>
      <div class="mb-3 flex items-center gap-2">
        <h3 class="text-sm font-semibold text-fg">{{ t('stats.charts') }}</h3>
        <span class="text-xs text-fg-subtle">{{ t('stats.chartsHint') }}</span>
        <SButton
          class="ms-auto"
          size="sm"
          variant="ghost"
          :aria-expanded="chartsOpen"
          data-testid="toggle-usage-charts"
          @click="chartsOpen = !chartsOpen"
        >
          {{ chartsOpen ? t('stats.collapse') : t('stats.expand') }}
        </SButton>
      </div>
      <UsageCharts
        v-if="chartsOpen"
        :summary-path="summaryPath"
        :filters="filters"
        :granularity="granularity"
        :secondary="secondary"
        :revision="revisionCharts"
        :group="admin ? 'usage-admin' : 'usage-mine'"
        @select-model="filterBy({ model_contains: $event })"
        @select-secondary="(k: string) => filterBy(admin ? { group_name: k } : { api_key_id: k })"
      />
    </section>

    <STabs v-model="tab" :tabs="tabs">
      <UsageTable
        v-show="tab === 'records'"
        :rows="items"
        :loading="loading"
        :show-user="admin"
        :show-account="admin"
        :column-settings-key="admin ? 'usage-log' : 'my-usage-log'"
        show-client-request-id
        :detail-path="(id: number) => `${listPath}/${id}`"
        @filter-client-request-id="(id: string) => (filters.client_request_id = id)"
        @filter-client-ip="(ip: string) => (filters.client_ip = ip)"
      >
        <template #footer><SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" /></template>
      </UsageTable>
      <UsageTable
        v-if="tab === 'errors'"
        :rows="errors.items.value"
        :loading="errors.loading.value"
        :show-user="admin"
        :show-account="admin"
        :column-settings-key="admin ? 'usage-log' : 'my-usage-log'"
        show-client-request-id
        :detail-path="(id: number) => `${listPath}/${id}`"
        data-testid="usage-errors"
        @filter-client-request-id="(id: string) => (filters.client_request_id = id)"
        @filter-client-ip="(ip: string) => (filters.client_ip = ip)"
      >
        <template #footer><SPagination v-model:page="errors.page.value" v-model:page-size="errors.pageSize.value" :total="errors.total.value" /></template>
      </UsageTable>
      <UsageIPPanel
        v-if="tab === 'ips'"
        :rows="ips.rows.value"
        :loading="ips.loading.value"
        :active="filters.client_ip"
        @filter="(ip: string) => (filters.client_ip = ip)"
      />
      <template v-for="x in extraTabs" :key="x.key">
        <slot v-if="tab === x.key" :name="`tab-${x.key}`" />
      </template>
    </STabs>
  </div>
</template>
