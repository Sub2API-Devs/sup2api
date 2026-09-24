<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SChart, SPageHeader, SPagination, SSelect, SStatCard } from '@sub2api/ui'
import type { Group, UsageSummaryRow } from '@/api/types'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatNumber } from '@/utils/format'
import TimeRangeFilter from './TimeRangeFilter.vue'
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
  model: '',
  success: '',
  // exact match on the client's X-Request-Id (CONTRACTS §14.4)
  client_request_id: ''
})

const canGroups = auth.has('group:read')
const groups = canGroups ? useGroupsLookup().groups : ref<Group[]>([])
const groupOptions = computed(() => [{ value: '', label: t('common.all') }, ...groups.value.map((g) => ({ value: g.id, label: g.name }))])
const successOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'true', label: t('usage.success.ok') },
  { value: 'false', label: t('usage.success.failed') }
])

// ------------------------------------------------------------------ summary strip

const summary = ref<UsageSummaryRow[]>([])
const summaryLoading = ref(false)
let sSeq = 0

async function loadSummary() {
  if (!auth.has('usage:all:read')) return
  const my = ++sSeq
  summaryLoading.value = true
  try {
    const r = await api.get<UsageSummaryRow[] | { items?: UsageSummaryRow[] }>('/usage/summary', { from: filters.from, to: filters.to, group_by: 'day' })
    if (my !== sSeq) return
    summary.value = Array.isArray(r) ? r : r?.items || []
  } catch {
    if (my === sSeq) summary.value = []
  } finally {
    if (my === sSeq) summaryLoading.value = false
  }
}

watch(() => [filters.from, filters.to], loadSummary, { immediate: true })

const totals = computed(() => {
  let requests = 0
  let success = 0
  let input = 0
  let output = 0
  let cost = 0
  let hasSuccess = false
  for (const r of summary.value) {
    requests += Number(r.requests) || 0
    if (r.success !== undefined) {
      hasSuccess = true
      success += Number(r.success) || 0
    }
    input += Number(r.input_tokens) || 0
    output += Number(r.output_tokens) || 0
    cost += Number(r.total_cost) || 0
  }
  return { requests, success: hasSuccess ? success : null, input, output, cost }
})

const successRate = computed(() => {
  const x = totals.value
  if (x.success === null || !x.requests) return '—'
  return ((x.success / x.requests) * 100).toFixed(1) + '%'
})

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
        <SButton @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
      <template #filters>
        <TimeRangeFilter v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" />
        <div class="w-28">
          <label class="input-label">{{ t('usage.filters.userId') }}</label>
          <input v-model.trim="filters.user_id" class="input" inputmode="numeric" placeholder="ID" />
        </div>
        <div class="w-40">
          <label class="input-label">{{ t('common.group') }}</label>
          <SSelect v-if="canGroups" v-model="filters.group_id" :options="groupOptions" />
          <input v-else v-model.trim="filters.group_id" class="input" inputmode="numeric" placeholder="ID" />
        </div>
        <div class="w-28">
          <label class="input-label">{{ t('usage.filters.accountId') }}</label>
          <input v-model.trim="filters.account_id" class="input" inputmode="numeric" placeholder="ID" />
        </div>
        <div class="w-48">
          <label class="input-label">{{ t('common.model') }}</label>
          <input v-model.trim="filters.model" class="input" placeholder="claude-sonnet-*" />
        </div>
        <div class="w-32">
          <label class="input-label">{{ t('common.status') }}</label>
          <SSelect v-model="filters.success" :options="successOptions" />
        </div>
        <div class="w-56">
          <label class="input-label">{{ t('usage.filters.clientRequestId') }}</label>
          <input
            v-model.trim="filters.client_request_id"
            class="input font-mono"
            :placeholder="t('usage.filters.clientRequestIdPlaceholder')"
            maxlength="128"
            data-testid="filter-client-request-id"
          />
        </div>
      </template>
    </SPageHeader>

    <div class="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SStatCard :label="t('usage.summary.requests')" :value="formatNumber(totals.requests)" icon="chart" :loading="summaryLoading" />
      <SStatCard :label="t('usage.summary.successRate')" :value="successRate" icon="check" tone="success" :loading="summaryLoading" />
      <SStatCard
        :label="t('usage.summary.tokens')"
        :value="formatNumber(totals.input + totals.output)"
        :sub="t('usage.summary.tokensSub', { input: formatNumber(totals.input), output: formatNumber(totals.output) })"
        icon="bolt"
        tone="warning"
        :loading="summaryLoading"
      />
      <SStatCard :label="t('usage.summary.cost')" :value="formatMoney(totals.cost)" icon="balance" :loading="summaryLoading" />
    </div>
    <SCard v-if="summary.length > 1" :title="t('usage.summary.daily')" class="mb-4">
      <SChart :option="chartOption" height="220px" />
    </SCard>

    <div class="card overflow-hidden">
      <UsageTable
        :rows="items"
        :loading="loading"
        show-client-request-id
        :detail-path="(id: number) => `/usage/${id}`"
        @filter-client-request-id="(id: string) => (filters.client_request_id = id)"
      />
    </div>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
  </div>
</template>
