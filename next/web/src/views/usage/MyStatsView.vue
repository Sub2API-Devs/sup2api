<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SChart, SGrid, SHint, SPageHeader, SStatCard, STable, STimeRange, type TableColumn } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { formatMoney, formatNumber } from '@/utils/format'
import { rangeBounds, type RangeKey } from './timeRange'
import { dailyChartOption } from './usage'

// Mine > Usage statistics: totals, a daily chart and a per-model breakdown of
// the caller's requests (GET /me/usage/summary).
const { t } = useI18n()

const range = ref<RangeKey>('30d')
const filters = reactive({ ...rangeBounds('30d') })

const days = ref<UsageSummaryRow[]>([])
const models = ref<UsageSummaryRow[]>([])
const loading = ref(false)
let seq = 0

async function load() {
  const my = ++seq
  loading.value = true
  try {
    const q = { from: filters.from, to: filters.to }
    const [d, m] = await Promise.all([
      api.get<UsageSummaryRow[]>('/me/usage/summary', { ...q, group_by: 'day' }),
      api.get<UsageSummaryRow[]>('/me/usage/summary', { ...q, group_by: 'model' })
    ])
    if (my !== seq) return
    days.value = d || []
    models.value = m || []
  } catch {
    if (my === seq) {
      days.value = []
      models.value = []
    }
  } finally {
    if (my === seq) loading.value = false
  }
}

watch(() => [filters.from, filters.to], load, { immediate: true })

const totals = computed(() => {
  let requests = 0
  let success = 0
  let input = 0
  let output = 0
  let cost = 0
  for (const r of days.value) {
    requests += Number(r.requests) || 0
    success += Number(r.success) || 0
    input += Number(r.input_tokens) || 0
    output += Number(r.output_tokens) || 0
    cost += Number(r.total_cost) || 0
  }
  return { requests, success, input, output, cost }
})

const successRate = computed(() => (totals.value.requests ? ((totals.value.success / totals.value.requests) * 100).toFixed(1) + '%' : '—'))

const chartOption = computed(() =>
  dailyChartOption(
    [...days.value]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => ({ key: r.key, requests: Number(r.requests) || 0, cost: Number(r.total_cost) || 0 })),
    { requests: t('usage.summary.requests'), cost: t('usage.summary.cost') }
  )
)

const modelRows = computed(() => [...models.value].sort((a, b) => Number(b.total_cost) - Number(a.total_cost)))
const modelColumns = computed<TableColumn[]>(() => [
  { key: 'key', label: t('common.model') },
  { key: 'requests', label: t('usage.summary.requests'), align: 'right' },
  { key: 'success', label: t('usage.summary.successRate'), align: 'right' },
  { key: 'input_tokens', label: t('usage.stats.input'), align: 'right' },
  { key: 'output_tokens', label: t('usage.stats.output'), align: 'right' },
  { key: 'total_cost', label: t('usage.summary.cost'), align: 'right' }
])

function rate(r: UsageSummaryRow) {
  const n = Number(r.requests) || 0
  return n ? ((Number(r.success) / n) * 100).toFixed(1) + '%' : '—'
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.statsTitle')" :description="t('usage.statsDescription')">
      <template #actions>
        <SButton @click="load">{{ t('common.refresh') }}</SButton>
      </template>
      <template #filters>
        <STimeRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" />
      </template>
    </SPageHeader>

    <SGrid class="mb-4" :xl-cols="4">
      <SStatCard :label="t('usage.summary.requests')" :value="formatNumber(totals.requests)" icon="chart" :loading="loading" />
      <SStatCard :label="t('usage.summary.successRate')" :value="successRate" icon="check" tone="success" :loading="loading" />
      <SStatCard
        :label="t('usage.summary.tokens')"
        :value="formatNumber(totals.input + totals.output)"
        :sub="t('usage.summary.tokensSub', { input: formatNumber(totals.input), output: formatNumber(totals.output) })"
        icon="bolt"
        tone="warning"
        :loading="loading"
      />
      <SStatCard :label="t('usage.summary.cost')" :value="formatMoney(totals.cost)" icon="balance" :loading="loading" />
    </SGrid>

    <SCard :title="t('usage.summary.daily')" class="mb-4">
      <SChart v-if="days.length" :option="chartOption" height="220px" :loading="loading" />
      <SHint v-else class="py-12 text-center">{{ t('common.noData') }}</SHint>
    </SCard>

    <SCard :title="t('usage.stats.byModel')" :padded="false">
      <STable :columns="modelColumns" :rows="modelRows" :loading="loading" row-key="key">
        <template #cell-key="{ row }"><span class="font-mono">{{ row.key || '—' }}</span></template>
        <template #cell-requests="{ row }">{{ formatNumber(row.requests) }}</template>
        <template #cell-success="{ row }">{{ rate(row) }}</template>
        <template #cell-input_tokens="{ row }">{{ formatNumber(row.input_tokens || 0) }}</template>
        <template #cell-output_tokens="{ row }">{{ formatNumber(row.output_tokens || 0) }}</template>
        <template #cell-total_cost="{ row }"><span class="font-mono">{{ formatMoney(row.total_cost) }}</span></template>
      </STable>
    </SCard>
  </div>
</template>
