<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SChart, SPageHeader, SPagination, SSelect, SStatCard } from '@sub2api/ui'
import { useList } from '@/composables/useList'
import { formatMoney, formatNumber } from '@/utils/format'
import TimeRangeFilter from './TimeRangeFilter.vue'
import UsageTable from './UsageTable.vue'
import { dayKey, rangeBounds, type RangeKey } from './timeRange'
import { dailyChartOption, type DailyPoint, type UsageRow } from './usage'

const { t } = useI18n()

const range = ref<RangeKey>('7d')
const { items, loading, page, pageSize, total, filters, reload } = useList<UsageRow>('/me/usage', {
  ...rangeBounds('7d'),
  model: '',
  success: ''
})

const successOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'true', label: t('usage.success.ok') },
  { value: 'false', label: t('usage.success.failed') }
])

// Daily chart: computed from up to CHART_LIMIT records of the selected range.
const CHART_LIMIT = 200
const chartRows = ref<UsageRow[]>([])
const chartTotal = ref(0)
const chartLoading = ref(false)
let cSeq = 0

async function loadChart() {
  const my = ++cSeq
  chartLoading.value = true
  try {
    const r = await api.list<UsageRow>('/me/usage', { from: filters.from, to: filters.to, page: 1, page_size: CHART_LIMIT })
    if (my !== cSeq) return
    chartRows.value = r.items
    chartTotal.value = r.page?.total ?? r.items.length
  } catch {
    if (my === cSeq) chartRows.value = []
  } finally {
    if (my === cSeq) chartLoading.value = false
  }
}

watch(() => [filters.from, filters.to], loadChart, { immediate: true })

const points = computed<DailyPoint[]>(() => {
  const map = new Map<string, DailyPoint>()
  for (const r of chartRows.value) {
    const k = dayKey(r.created_at)
    const p = map.get(k) || { key: k, requests: 0, cost: 0 }
    p.requests++
    p.cost += Number(r.total_cost) || 0
    map.set(k, p)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
})

const sums = computed(() => points.value.reduce((s, p) => ({ requests: s.requests + p.requests, cost: s.cost + p.cost }), { requests: 0, cost: 0 }))

const chartOption = computed(() => dailyChartOption(points.value, { requests: t('usage.summary.requests'), cost: t('usage.summary.cost') }))

function refresh() {
  reload()
  loadChart()
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.myTitle')" :description="t('usage.myDescription')">
      <template #actions>
        <SButton @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
      <template #filters>
        <TimeRangeFilter v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" />
        <div class="w-48">
          <label class="input-label">{{ t('common.model') }}</label>
          <input v-model.trim="filters.model" class="input" placeholder="claude-sonnet-*" />
        </div>
        <div class="w-32">
          <label class="input-label">{{ t('common.status') }}</label>
          <SSelect v-model="filters.success" :options="successOptions" />
        </div>
      </template>
    </SPageHeader>

    <div class="mb-4 grid gap-4 lg:grid-cols-[1fr_1fr_3fr]">
      <SStatCard :label="t('usage.summary.requests')" :value="formatNumber(chartTotal || sums.requests)" icon="chart" :loading="chartLoading" />
      <SStatCard
        :label="t('usage.summary.cost')"
        :value="formatMoney(sums.cost)"
        :sub="chartTotal > CHART_LIMIT ? t('usage.summary.partial', { n: CHART_LIMIT }) : undefined"
        icon="balance"
        :loading="chartLoading"
      />
      <SCard :padded="false">
        <div class="px-3 pt-2">
          <SChart v-if="points.length" :option="chartOption" height="160px" :loading="chartLoading" />
          <p v-else class="muted py-12 text-center text-sm">{{ t('common.noData') }}</p>
        </div>
      </SCard>
    </div>

    <div class="card overflow-hidden">
      <UsageTable :rows="items" :loading="loading" :show-user="false" :show-account="false" :detail-path="(id: number) => `/me/usage/${id}`" />
    </div>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
  </div>
</template>
