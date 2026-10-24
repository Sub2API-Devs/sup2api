<script setup lang="ts">
// Usage records with their search toolbar: the request list of `listPath`,
// totals and the optional daily trend / client-IP panels from `summaryPath`
// under the same filters. `admin` adds the operator filters and columns.
// The page header (title, refresh) stays with the view; it calls reload().
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SChart, SChip, SPagination, STimeRange, rangeBounds, type RangeKey } from '@sub2api/ui'
import { useList } from '@/composables/useList'
import UsageFilters from './UsageFilters.vue'
import UsageIPPanel from './UsageIPPanel.vue'
import UsageStatsBar from './UsageStatsBar.vue'
import UsageTable from './UsageTable.vue'
import { useUsageSummary } from './useUsageSummary'
import { dailyChartOption, type UsageRow } from './usage'

const props = withDefaults(
  defineProps<{
    listPath: string
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

const range = ref<RangeKey>(props.defaultRange)
const { items, loading, page, pageSize, total, filters, reload: reloadList } = useList<UsageRow>(props.listPath, {
  ...rangeBounds(props.defaultRange),
  model_contains: '',
  success: '',
  client_ip: '',
  // exact match on the client's X-Request-Id (CONTRACTS §14.4)
  client_request_id: ''
})

const showTrend = ref(false)
const showIPs = ref(true)
const days = useUsageSummary(props.summaryPath, filters, 'day')
const ips = useUsageSummary(props.summaryPath, filters, 'ip', showIPs)
const chartOption = computed(() => dailyChartOption(days.rows.value, { requests: t('usage.summary.requests'), cost: t('usage.summary.cost') }))

function reload() {
  reloadList()
  days.reload()
  ips.reload()
}
watch(() => props.revision, reload)
watch(loading, (v) => emit('update:loading', v), { immediate: true })
</script>

<template>
  <div>
    <UsageFilters :model-value="filters" :admin="admin" :group-options="groupOptions" @update:model-value="Object.assign(filters, $event)">
      <template #range>
        <STimeRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" variant="segmented" size="sm" :label="false" />
      </template>
      <template #stats><UsageStatsBar :rows="days.rows.value" :loading="days.loading.value" /></template>
      <template #actions>
        <SChip v-model:pressed="showTrend" icon="chart" data-testid="toggle-usage-trend">{{ t('usage.summary.trend') }}</SChip>
        <SChip v-model:pressed="showIPs" icon="globe" data-testid="toggle-usage-ips">{{ t('usage.ips.title') }}</SChip>
      </template>
    </UsageFilters>

    <SCard v-if="showTrend" :title="t('usage.summary.daily')" class="mb-4">
      <SChart :option="chartOption" height="220px" />
    </SCard>
    <UsageIPPanel v-if="showIPs" :rows="ips.rows.value" :loading="ips.loading.value" :active="filters.client_ip" @filter="(ip: string) => (filters.client_ip = ip)" />

    <UsageTable
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
  </div>
</template>
