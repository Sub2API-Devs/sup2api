<script setup lang="ts">
// Usage records, for an operator (`admin`: all users) or for the caller: the
// search bar with the live statistics, and the tabs - the request list, the
// failed requests, the client IPs, the user ranking (operator only), plus any
// tab the page adds (`extraTabs`, rendered from the #tab-<key> slot). Every
// part follows the same filters, which a link may preset (?user_id=, ?from=,
// …); Export downloads them as CSV. The open tab is ?tab= in the URL. The
// page header (title, refresh) stays with the view and bumps `revision`. The
// totals and charts are on the overview page (UsageOverview).
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SDateRange, SPagination, STabs, type RangeKey, type TabItem } from '@sub2api/ui'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { exportUsage } from './exportUsage'
import UsageFilters from './UsageFilters.vue'
import UsageIPPanel from './UsageIPPanel.vue'
import UsageLiveStats from './UsageLiveStats.vue'
import UsageTable from './UsageTable.vue'
import UserRanking from './UserRanking.vue'
import { useUsageSummary } from './useUsageSummary'
import { baseUsageFilters, queryUsageFilters } from './usageFilters'
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

// Which account served a request is shown to operators who may read accounts
// (the server leaves it out for everyone else, CONTRACTS §66.5).
const showAccount = computed(() => props.admin && auth.has('account:read'))

const range = ref<RangeKey>(props.defaultRange)
const baseFilters = baseUsageFilters(props.defaultRange)
// A link from the dashboard opens the page already filtered.
const fromQuery = queryUsageFilters(route.query, props.admin)
if (fromQuery.from || fromQuery.to) range.value = 'custom'
const { items, loading, page, pageSize, total, filters, reload: reloadList } = useList<UsageRow>(props.listPath, { ...baseFilters, ...fromQuery })

// Tabs.
const tabs = computed<TabItem[]>(() => [
  { key: 'records', label: t('stats.tabs.records'), badge: total.value || undefined },
  { key: 'errors', label: t('stats.tabs.errors') },
  { key: 'ips', label: t('stats.tabs.ips') },
  ...(props.admin ? [{ key: 'ranking', label: t('stats.tabs.ranking') }] : []),
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

function reload() {
  reloadList()
  if (tab.value === 'errors') errors.reload()
  if (tab.value === 'ips') ips.reload()
}
watch(() => props.revision, reload)
const busy = computed(() => loading.value || (tab.value === 'errors' && errors.loading.value))
watch(busy, (v) => emit('update:loading', v), { immediate: true })

function selectUser(id: string) {
  filters.user_id = id
  tab.value = 'records'
}

// CSV of the searched requests (the list's filters, not its page).
const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    await exportUsage(`${props.listPath}/export`, filters)
  } catch (e) {
    notifyError(e)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UsageFilters class="!mb-0" :model-value="filters" :admin="admin" :accounts="showAccount" :group-options="groupOptions" @update:model-value="Object.assign(filters, $event)">
      <template #range>
        <SDateRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" size="sm" :label="false" />
      </template>
      <template #stats>
        <UsageLiveStats :realtime-path="`${listPath}/realtime`" :summary-path="summaryPath" :filters="filters" :revision="revision" />
      </template>
      <template #actions>
        <SButton type="button" size="sm" icon="download" :loading="exporting" data-testid="export-usage" @click="exportCsv">{{ t('stats.exportCsv') }}</SButton>
      </template>
    </UsageFilters>

    <STabs v-model="tab" :tabs="tabs">
      <UsageTable
        v-show="tab === 'records'"
        :rows="items"
        :loading="loading"
        :show-user="admin"
        :show-account="showAccount"
        :column-settings-key="admin ? 'usage-log' : 'my-usage-log'"
        show-client-request-id
        :detail-path="(id: number) => `${listPath}/${id}`"
        @filter-client-request-id="(id: string) => (filters.client_request_id = id)"
        @filter-client-ip="(ip: string) => (filters.client_ip = ip)"
        @filter-account-id="(id: number) => (filters.account_id = String(id))"
      >
        <template #footer><SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" /></template>
      </UsageTable>
      <UsageTable
        v-if="tab === 'errors'"
        :rows="errors.items.value"
        :loading="errors.loading.value"
        :show-user="admin"
        :show-account="showAccount"
        :column-settings-key="admin ? 'usage-log' : 'my-usage-log'"
        show-client-request-id
        :detail-path="(id: number) => `${listPath}/${id}`"
        data-testid="usage-errors"
        @filter-client-request-id="(id: string) => (filters.client_request_id = id)"
        @filter-client-ip="(ip: string) => (filters.client_ip = ip)"
        @filter-account-id="(id: number) => (filters.account_id = String(id))"
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
      <UserRanking v-if="admin && tab === 'ranking'" :summary-path="summaryPath" :filters="filters" :revision="revision" @select="selectUser" />
      <template v-for="x in extraTabs" :key="x.key">
        <slot v-if="tab === x.key" :name="`tab-${x.key}`" />
      </template>
    </STabs>
  </div>
</template>
