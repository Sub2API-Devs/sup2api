<script setup lang="ts">
// Token usage over time: input / output / cache read / cache write stacked
// per bucket, one y-axis (design §5: no dual axis). The legend hides a
// series on click: cache read is usually most of the stack, and hiding it is
// how the other three become readable. The tooltip lists the four, their
// total and the bucket's cost.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChart } from '@sub2api/ui'
import type { UsageSummaryRow } from '@/api/types'
import { useAppStore } from '@/stores/app'
import { bucketLabel, formatCostShort, formatTokens, num, seriesColor, surfaceColor, type Granularity } from './stats'

const props = withDefaults(defineProps<{ rows: UsageSummaryRow[]; buckets: string[]; granularity: Granularity; loading?: boolean; group?: string; height?: string }>(), {
  height: '260px'
})
const { t } = useI18n()
const app = useAppStore()

const option = computed(() => {
  const dark = app.theme === 'dark'
  const byKey = new Map(props.rows.map((r) => [r.key, r]))
  const multiDay = new Set(props.buckets.map((k) => k.slice(0, 10))).size > 1
  const series = [
    { name: t('stats.input'), pick: (r?: UsageSummaryRow) => num(r?.input_tokens) },
    { name: t('stats.output'), pick: (r?: UsageSummaryRow) => num(r?.output_tokens) },
    { name: t('stats.cacheRead'), pick: (r?: UsageSummaryRow) => num(r?.cache_read_tokens) },
    { name: t('stats.cacheWrite'), pick: (r?: UsageSummaryRow) => num(r?.cache_creation_tokens) }
  ]
  return {
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, data: series.map((s) => s.name) },
    grid: { left: 52, right: 12, top: 36, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      formatter: (items: any[]) => {
        if (!items.length) return ''
        const key = props.buckets[items[0].dataIndex]
        const r = byKey.get(key)
        const lines = items.map((it) => `${it.marker}${it.seriesName}<span style="float:right;margin-left:16px">${formatTokens(num(it.value))}</span>`)
        const total = items.reduce((a, it) => a + num(it.value), 0)
        return `<b>${key}</b><br/>${lines.join('<br/>')}<hr style="margin:4px 0;opacity:.3"/>${t('stats.total')}<span style="float:right">${formatTokens(total)}</span><br/>${t('stats.cost')}<span style="float:right">${formatCostShort(num(r?.total_cost))}</span>`
      }
    },
    xAxis: { type: 'category', boundaryGap: false, data: props.buckets.map((k) => bucketLabel(k, props.granularity, multiDay)) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatTokens(v) } },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'line',
      stack: 'tokens',
      symbol: 'none',
      color: seriesColor(i, dark),
      lineStyle: { width: 1.5, color: surfaceColor(dark) },
      areaStyle: { opacity: 0.88, color: seriesColor(i, dark) },
      emphasis: { disabled: true },
      data: props.buckets.map((k) => s.pick(byKey.get(k)))
    }))
  }
})
</script>

<template>
  <SChart :option="option" :height="height" :loading="loading" :group="group" data-testid="token-trend" />
</template>
