<script setup lang="ts">
// Usage records, for an operator (`admin`: all users) or for the caller: the
// search bar with the live statistics, and below it what the log type asks for
// - the request list, the failed requests (that list with success=false), the
// client IPs, the user ranking (operator only), plus any type the page adds
// (`extraTabs`, rendered from the #tab-<key> slot, with its own filters in
// #tab-<key>-range and #tab-<key>-filters). Every part but an added type follows
// the same filters, which a link may preset (?user_id=, ?from=, …); Export
// downloads the listed requests as CSV. The log type is ?tab= in the URL. The
// page header (title) stays with the view; its refresh button is rendered
// from the #actions slot beside Export and bumps `revision`. The totals and
// charts are on the overview page (UsageOverview).
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SDateRange, SPagination, STableColumnSettings, type RangeKey, type TabItem } from '@sub2api/ui'
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

// The log type.
const logTypes = computed(() =>
  [
    { key: 'records', label: t('stats.tabs.records') },
    { key: 'errors', label: t('stats.tabs.errors') },
    { key: 'ips', label: t('stats.tabs.ips') },
    ...(props.admin ? [{ key: 'ranking', label: t('stats.tabs.ranking') }] : []),
    ...props.extraTabs
  ].map((x) => ({ value: x.key, label: x.label }))
)
const initialTab = String(route.query.tab || '')
const tab = ref(logTypes.value.some((x) => x.value === initialTab) ? initialTab : 'records')
const { items, loading, page, pageSize, total, filters, reload: reloadList } = useList<UsageRow>(props.listPath, { ...baseFilters, ...fromQuery, ...(tab.value === 'errors' ? { success: 'false' } : {}) })
// A type the page added has its own filters, in place of the search.
const extraOpen = computed(() => props.extraTabs.some((x) => x.key === tab.value))
watch(
  tab,
  (v, old) => {
    emit('update:tab', v)
    if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v === 'records' ? undefined : v } })
    // The failed requests are the list under the status filter.
    if (v === 'errors') filters.success = 'false'
    else if (old === 'errors') filters.success = ''
  },
  { immediate: true }
)
const ips = useUsageSummary(props.summaryPath, filters, 'ip', () => tab.value === 'ips')
// The request types under the search, for the type select: queried without
// the type filter itself, so the other types stay on offer once one is picked.
const protocols = useUsageSummary(props.summaryPath, filters, 'protocol', true, () => ({ protocol: '' }))
const protocolOptions = computed(() => protocols.rows.value.map((r) => r.key).filter((k) => k !== ''))

function reload() {
  reloadList()
  protocols.reload()
  if (tab.value === 'ips') ips.reload()
}
watch(() => props.revision, reload)
watch(loading, (v) => emit('update:loading', v), { immediate: true })

function selectUser(id: string) {
  filters.user_id = id
  tab.value = 'records'
}

// CSV of the searched requests (the list's filters, not its page).
const exporting = ref(false)
const table = ref<InstanceType<typeof UsageTable> | null>(null)
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
    <UsageFilters
      v-model:log-type="tab"
      class="!mb-0"
      :model-value="filters"
      :admin="admin"
      :accounts="showAccount"
      :group-options="groupOptions"
      :protocol-options="protocolOptions"
      :log-types="logTypes"
      :searchable="!extraOpen"
      @update:model-value="Object.assign(filters, $event)"
      @reset="tab = 'records'"
    >
      <template #range>
        <slot v-if="extraOpen" :name="`tab-${tab}-range`" />
        <SDateRange v-else v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" size="sm" :label="false" />
      </template>
      <template #filters>
        <slot v-if="extraOpen" :name="`tab-${tab}-filters`" />
      </template>
      <template v-if="!extraOpen" #stats>
        <UsageLiveStats :realtime-path="`${listPath}/realtime`" :summary-path="summaryPath" :filters="filters" :revision="revision" />
      </template>
      <template #actions>
        <slot name="actions" />
        <SButton v-if="tab === 'records' || tab === 'errors'" type="button" size="sm" icon="download" :loading="exporting" data-testid="export-usage" @click="exportCsv">{{ t('stats.exportCsv') }}</SButton>
        <!-- The table's column settings sit in this row rather than on a row of their own above the table. -->
        <STableColumnSettings v-if="table?.columnState && (tab === 'records' || tab === 'errors')" class="hidden md:block" :state="table.columnState" />
      </template>
    </UsageFilters>

    <UsageTable
      v-show="tab === 'records' || tab === 'errors'"
      ref="table"
      :column-settings="false"
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
  </div>
</template>
