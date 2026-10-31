<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SCard, SChart, SGrid, SHint, SSegmented } from '@sub2api/ui'
import { enumLabel, money, useModHost } from './host'
import CostList from './overview/CostList.vue'
import { barOption, bucketLabel } from './overview/chart'
import { topCosts, type CostRow } from './overview/figures'
import { useOverviewData, type CostRange } from './overview/useOverview'

// "审核费用" card of the overview. Today (GET /status costs): total, by
// source, top channels and auditors. 7 / 30 days (GET /costs): total, by
// source, by channel and the daily trend. Unpriced calls are counted but not
// in the amount (§72.13.3).
const ov = useOverviewData()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)

const range = computed({ get: () => ov.costRange.value, set: (v: CostRange) => (ov.costRange.value = v) })
const today = computed(() => ov.status.data.value?.costs)
const ranged = computed(() => (range.value === 'today' ? null : ov.costs.data.value))
const error = computed(() => (range.value === 'today' ? '' : ov.costs.error.value))

const total = computed(() => (range.value === 'today' ? today.value?.total : ranged.value?.totals))
const sources = computed<CostRow[]>(() => {
  if (range.value === 'today') {
    const c = today.value
    if (!c) return []
    return (['audit', 'analysis', 'manual'] as const).map((k) => ({ key: k, name: t(`overviewP3.cost.${k}`), cost: c[k] })).filter((r) => r.cost?.calls > 0)
  }
  return (ranged.value?.by_source || []).filter((s) => s.summary.calls > 0).map((s) => ({ key: s.source, name: enumLabel('costSource', s.source), cost: s.summary }))
})
const channels = computed<CostRow[]>(() => {
  if (range.value === 'today') return topCosts(today.value?.channels).map((r) => ({ key: r.id, name: ov.channelName(r.id), cost: r.cost }))
  return topCosts((ranged.value?.by_channel || []).map((c) => ({ ...c, cost: c.summary })), 10).map((c) => ({
    key: c.channel_id,
    name: (c.name || `#${c.channel_id}`) + (c.deleted ? ` (${t('cost.deleted')})` : ''),
    sub: c.billing_model || c.model,
    cost: c.summary
  }))
})
const auditors = computed<CostRow[]>(() => topCosts(today.value?.auditors).map((r) => ({ key: r.id, name: ov.auditorName(r.id), cost: r.cost })))

const trend = computed(() => ranged.value?.trend || [])
const hasTrend = computed(() => trend.value.some((p) => Number(p.cost) > 0))
const chart = computed(() =>
  barOption(
    // /costs buckets are UTC days (no tz parameter).
    trend.value.map((p) => bucketLabel(p.bucket, 'day', 0)),
    t('analysis.cost'),
    trend.value.map((p) => Number(p.cost) || 0),
    (v) => money(v)
  )
)
const rangeOptions = computed(() => (['today', '7d', '30d'] as const).map((k) => ({ value: k, label: t(`overviewP3.cost.range.${k}`) })))
</script>

<template>
  <SCard :title="t('cost.title')" :subtitle="t('overviewP3.cost.hint')">
    <template #actions>
      <SSegmented v-model="range" size="sm" :options="rangeOptions" :aria-label="t('overviewP3.cost.rangeLabel')" />
    </template>
    <SAlert v-if="error" tone="danger">{{ error }}</SAlert>
    <template v-else>
      <SAlert v-if="total?.unpriced_calls" tone="warning" dense class="mod-block">
        {{ t('cost.unpriced', { n: n(total.unpriced_calls), tokens: n(total.unpriced_tokens) }) }}
      </SAlert>
      <SGrid template="repeat(auto-fit, minmax(240px, 1fr))">
        <div>
          <p class="mod-cost-label mod-cost-label-top">{{ t('cost.total') }}</p>
          <div class="mod-cost-total">
            <span class="mod-cost-amount mod-num">{{ total ? money(total.cost) : '—' }}</span>
            <SHint inline size="xs">{{ t('cost.calls', { n: n(total?.calls) }) }}<template v-if="total?.free_calls"> · {{ t('cost.free', { n: n(total.free_calls) }) }}</template></SHint>
          </div>
          <SHint v-if="total" size="xs" class="mod-num">{{ t('cost.tokens', { in: n(total.tokens_in), out: n(total.tokens_out) }) }}</SHint>
          <CostList :title="t('cost.bySource')" :rows="sources" class="mod-ov-cost-gap" />
        </div>
        <CostList :title="t('cost.byChannel')" :rows="channels" />
        <CostList v-if="range === 'today'" :title="t('overviewP3.cost.byAuditor')" :rows="auditors" />
      </SGrid>
      <div v-if="range !== 'today' && hasTrend" class="mod-section">
        <p class="mod-cost-label mod-cost-label-top">{{ t('cost.trend') }}</p>
        <SChart :option="chart" :loading="ov.costs.loading.value" height="160px" />
      </div>
    </template>
  </SCard>
</template>

<style scoped>
.mod-ov-cost-gap {
  margin-top: 0.75rem;
}
</style>
