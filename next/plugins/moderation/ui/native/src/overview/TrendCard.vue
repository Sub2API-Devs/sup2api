<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { SChart, SSegmented, STable, type TableColumn } from '@sub2api/ui'
import AsyncCard from './AsyncCard.vue'
import RateCell from '../RateCell.vue'
import { onOverviewTick } from './tick'
import { useCatalog } from '../catalog'
import { alignPoints, bucketLabel, lineChart } from '../charts'
import { num, pct } from '../format'
import { fetchTrend, useModHost, type Granularity, type StatsQuery } from '../host'
import { useAsync } from '../useAsync'

// Trend (new-api trend-card): suspicious rate per flow; hit and error rate per
// auditor node over the range, error rates above the alert threshold in red.
const props = defineProps<{ alertPercent: number }>()
const t = useModHost().t
const catalog = useCatalog()

const q = reactive<StatsQuery & { granularity: Granularity }>({ granularity: 'day' })
const trend = useAsync(() => fetchTrend(q), () => t('stats.loadFailed'))
watch(q, trend.reload, { immediate: true })
onOverviewTick(trend.reload)

const granularityOptions = computed(() => (['hour', 'day'] as Granularity[]).map((v) => ({ value: v, label: t(`stats.granularity.${v}`) })))
const flows = computed(() => trend.data.value?.flows || [])

const chart = computed(() => {
  const { ts, values } = alignPoints(
    flows.value.map((f) => f.points),
    (p) => Number((p.suspicious_rate * 100).toFixed(2))
  )
  return lineChart(
    ts.map((x) => bucketLabel(x, q.granularity)),
    flows.value.map((f, i) => ({ name: f.name || catalog.flowName(f.flow_id), data: values[i] })),
    (v) => `${v}%`
  )
})

/** One row per auditor node: totals of the range and their rates. */
const nodes = computed(() =>
  (trend.data.value?.auditors || []).map((a) => {
    const sum = a.points.reduce((s, p) => ({ audited: s.audited + p.audited, hit: s.hit + p.hit, errors: s.errors + p.errors }), { audited: 0, hit: 0, errors: 0 })
    const flowName = flows.value.find((f) => f.flow_id === a.flow_id)?.name || catalog.flowName(a.flow_id)
    return {
      key: `${a.flow_id}-${a.stage}-${a.auditor_id}`,
      node: `${flowName} · ${t('trace.stageN', { n: a.stage })} · ${catalog.auditorName(a.auditor_id)}`,
      audited: sum.audited,
      hitRate: sum.audited ? sum.hit / sum.audited : 0,
      errorRate: sum.audited ? sum.errors / sum.audited : 0
    }
  })
)
const columns = computed<TableColumn[]>(() => [
  { key: 'node', label: t('trendCard.node') },
  { key: 'audited', label: t('trendCard.entered'), align: 'right', nowrap: true },
  { key: 'hitRate', label: t('stats.hitRate'), align: 'right', nowrap: true },
  { key: 'errorRate', label: t('stats.errorRate'), align: 'right', nowrap: true }
])
</script>

<template>
  <AsyncCard
    :title="t('trendCard.title')"
    :subtitle="t('trendCard.hint')"
    :error="trend.error.value"
    :loading="trend.loading.value"
    :empty="!flows.length"
    :empty-text="t('stats.noData')"
  >
    <template #actions><SSegmented v-model="q.granularity" :options="granularityOptions" size="sm" /></template>
    <div class="mod-stack">
      <p class="mod-cost-label mod-cost-label-top">{{ t('trendCard.suspiciousRate') }}</p>
      <SChart :option="chart" :loading="trend.loading.value" height="240px" />
      <p class="mod-cost-label">{{ t('trendCard.nodes') }} <span class="mod-sub">{{ t('trendCard.nodesHint', { p: pct(props.alertPercent / 100) }) }}</span></p>
      <STable :columns="columns" :rows="nodes" row-key="key" dense :empty-text="t('stats.noData')">
        <template #cell-audited="{ row }"><span class="mod-num">{{ num(row.audited) }}</span></template>
        <template #cell-hitRate="{ row }"><RateCell :rate="row.hitRate" /></template>
        <template #cell-errorRate="{ row }"><RateCell :rate="row.errorRate" :alert-percent="alertPercent" /></template>
      </STable>
    </div>
  </AsyncCard>
</template>
