<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SChart, SPageHeader, SPagination, STimeRange } from '@sub2api/ui'
import UsageSummaryCards from '@/components/UsageSummaryCards.vue'
import UsageFilters from './UsageFilters.vue'
import type { Group, UsageSummaryRow } from '@/api/types'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import UsageTable from './UsageTable.vue'
import { rangeBounds, type RangeKey } from './timeRange'
import { dailyChartOption, type UsageRow } from './usage'

const { t } = useI18n()
const auth = useAuthStore()

const range = ref<RangeKey>('today')
const { items, loading, page, pageSize, total, filters, reload } = useList<UsageRow>('/usage', {
  ...rangeBounds('today'),
  user_id: '',
  group_id: '',
  account_id: '',
  model_contains: '',
  success: '',
  // exact match on the client's X-Request-Id (CONTRACTS §14.4)
  client_request_id: ''
})

const canGroups = auth.has('group:read')
const groups = canGroups ? useGroupsLookup().groups : ref<Group[]>([])
const groupOptions = computed(() => [{ value: '', label: t('common.all') }, ...groups.value.map((g) => ({ value: g.id, label: g.name }))])

// ------------------------------------------------------------------ summary strip

const summary = ref<UsageSummaryRow[]>([])
const summaryLoading = ref(false)
let sSeq = 0

async function loadSummary() {
  if (!auth.has('usage:all:read')) return
  const my = ++sSeq
  summaryLoading.value = true
  try {
    const r = await api.get<UsageSummaryRow[] | { items?: UsageSummaryRow[] }>('/usage/summary', { ...filters, group_by: 'day' })
    if (my !== sSeq) return
    summary.value = Array.isArray(r) ? r : r?.items || []
  } catch {
    if (my === sSeq) summary.value = []
  } finally {
    if (my === sSeq) summaryLoading.value = false
  }
}

watch(filters, loadSummary, { deep: true, immediate: true })

const chartOption = computed(() =>
  dailyChartOption(
    [...summary.value]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => ({ key: r.key, requests: Number(r.requests) || 0, cost: Number(r.total_cost) || 0 })),
    { requests: t('usage.summary.requests'), cost: t('usage.summary.cost') }
  )
)

function refresh() {
  reload()
  loadSummary()
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.title')" :description="t('usage.description')">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
      <template #filters>
        <STimeRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" />
        <UsageFilters :model-value="filters" admin :group-options="canGroups ? groupOptions : undefined" @update:model-value="Object.assign(filters, $event)" />
      </template>
    </SPageHeader>

    <UsageSummaryCards :rows="summary" :loading="summaryLoading" />
    <SCard v-if="summary.length > 1" :title="t('usage.summary.daily')" class="mb-4">
      <SChart :option="chartOption" height="220px" />
    </SCard>

    <UsageTable
      :rows="items"
      :loading="loading"
      show-client-request-id
      :detail-path="(id: number) => `/usage/${id}`"
      @filter-client-request-id="(id: string) => (filters.client_request_id = id)"
    >
      <template #footer><SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" /></template>
    </UsageTable>
  </div>
</template>
