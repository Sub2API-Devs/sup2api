<script setup lang="ts">
// Three small charts under the token trend, each with its own y-axis and the
// same buckets on x: requests (succeeded / failed, in the status colors),
// cost, and the cache hit rate. Sharing `group` with the trend chart, they
// follow its crosshair.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SChart } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { useAppStore } from '@/stores/app'
import { bucketLabel, formatCostShort, hitRate, num, seriesColor, statusColor, type Granularity } from './stats'

const props = defineProps<{ rows: UsageSummaryRow[]; buckets: string[]; granularity: Granularity; loading?: boolean; group?: string }>()
const { t } = useI18n()
const app = useAppStore()

const base = computed(() => {
  const byKey = new Map(props.rows.map((r) => [r.key, r]))
  const multiDay = new Set(props.buckets.map((k) => k.slice(0, 10))).size > 1
  return {
    rows: props.buckets.map((k) => byKey.get(k)),
    grid: { left: 44, right: 8, top: 12, bottom: 24 },
    xAxis: { type: 'category', data: props.buckets.map((k) => bucketLabel(k, props.granularity, multiDay)) }
  }
})

const requests = computed(() => {
  const dark = app.theme === 'dark'
  const { rows, grid, xAxis } = base.value
  const bar = { type: 'bar', stack: 'req', barMaxWidth: 22, emphasis: { disabled: true } }
  return {
    grid,
    xAxis,
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { ...bar, name: t('stats.success'), color: statusColor('ok', dark), data: rows.map((r) => num(r?.success)) },
      { ...bar, name: t('stats.failed'), color: statusColor('bad', dark), itemStyle: { borderRadius: [3, 3, 0, 0] }, data: rows.map((r) => num(r?.requests) - num(r?.success)) }
    ]
  }
})

const cost = computed(() => {
  const dark = app.theme === 'dark'
  const { rows, grid, xAxis } = base.value
  return {
    grid,
    xAxis,
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatCostShort(v) } },
    tooltip: { valueFormatter: (v: number) => formatCostShort(num(v)) },
    series: [{ name: t('stats.cost'), type: 'bar', barMaxWidth: 22, color: seriesColor(6, dark), itemStyle: { borderRadius: [3, 3, 0, 0] }, data: rows.map((r) => num(r?.total_cost)) }]
  }
})

const hit = computed(() => {
  const dark = app.theme === 'dark'
  const { rows, grid, xAxis } = base.value
  return {
    grid,
    xAxis,
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    tooltip: { valueFormatter: (v: number | null) => (v == null ? '—' : `${v}%`) },
    series: [
      {
        name: t('stats.hitRate'),
        type: 'line',
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        connectNulls: false,
        color: seriesColor(2, dark),
        lineStyle: { width: 2 },
        data: rows.map((r) => {
          const h = hitRate(r)
          return h == null ? null : Number((h * 100).toFixed(1))
        })
      }
    ]
  }
})
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="metric-strip">
    <SCard :title="t('stats.requests')" :subtitle="t('stats.requestsHint')">
      <SChart :option="requests" height="150px" :loading="loading" :group="group" />
    </SCard>
    <SCard :title="t('stats.cost')" :subtitle="t('stats.costHint')">
      <SChart :option="cost" height="150px" :loading="loading" :group="group" />
    </SCard>
    <SCard :title="t('stats.hitRate')" :subtitle="t('stats.hitRateHint')">
      <SChart :option="hit" height="150px" :loading="loading" :group="group" />
    </SCard>
  </div>
</template>
