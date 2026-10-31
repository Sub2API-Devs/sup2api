<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SCard, SEmpty, SHint, SSectionTitle, SSpinner, STable, type TableColumn } from '@sub2api/ui'
import { useModHost } from '../host'
import { browserTZ } from '../stats'
import { bucketLabels } from './chart'
import { nodeRows, overAlert } from './figures'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'
import GranularitySwitch from './GranularitySwitch.vue'
import OverviewLine from './OverviewLine.vue'

// Trend (GET /stats/trend): suspicious rate per flow, and hit / error rate of
// every auditor node over the range; error rates above the alert threshold
// are red.
const ov = useOverviewData()
const t = useModHost().t
const { n, pct } = useFormat()

const data = computed(() => ov.trend.data.value)
const alertPercent = computed(() => ov.status.data.value?.error_rate_alert_percent ?? 5)
const flows = computed(() => data.value?.flows || [])
const labels = computed(() => bucketLabels(flows.value[0]?.points || [], data.value?.granularity || ov.trendGranularity.value, browserTZ()))
const series = computed(() => flows.value.map((f) => ({ name: f.name || ov.flowName(f.flow_id), data: f.points.map((p) => +(p.suspicious_rate * 100).toFixed(2)) })))
const fmt = (v: number) => pct(v / 100)

const nodes = computed(() => nodeRows(data.value?.auditors))
const columns = computed<TableColumn[]>(() => [
  { key: 'node', label: t('overviewP3.trend.node') },
  { key: 'audited', label: t('overviewP3.trend.entered'), align: 'right', nowrap: true },
  { key: 'hit', label: t('overviewP3.col.hitRate'), align: 'right', nowrap: true },
  { key: 'error', label: t('overviewP3.col.errorRate'), align: 'right', nowrap: true }
])
</script>

<template>
  <SCard :title="t('overviewP3.trend.title')" :subtitle="t('overviewP3.trend.hint')">
    <template #actions>
      <GranularitySwitch v-model="ov.trendGranularity.value" />
    </template>
    <SAlert v-if="ov.trend.error.value" tone="danger">{{ ov.trend.error.value }}</SAlert>
    <SSpinner v-else-if="!data" block />
    <SEmpty v-else-if="!flows.length" icon="chart" :text="t('overviewP3.noData')" size="sm" />
    <div v-else class="mod-ov-trend">
      <div>
        <SSectionTitle tag="p">{{ t('overviewP3.trend.rate') }}</SSectionTitle>
        <OverviewLine :labels="labels" :series="series" :format="fmt" :loading="ov.trend.loading.value" />
      </div>
      <div>
        <SSectionTitle tag="p">
          {{ t('overviewP3.trend.nodes') }}
          <SHint inline size="xs" class="mod-ov-title-hint">{{ t('overviewP3.trend.nodesHint', { p: alertPercent }) }}</SHint>
        </SSectionTitle>
        <STable :columns="columns" :rows="nodes" row-key="key" :empty-text="t('overviewP3.noData')" dense>
          <template #cell-node="{ row }">{{ ov.flowName(row.flow_id) }} · {{ t('trace.stageN', { n: row.stage }) }} · {{ ov.auditorName(row.auditor_id) }}</template>
          <template #cell-audited="{ row }"><span class="mod-num">{{ n(row.audited) }}</span></template>
          <template #cell-hit="{ row }"><span class="mod-num">{{ pct(row.hitRate) }}</span></template>
          <template #cell-error="{ row }">
            <SBadge v-if="overAlert(row.errorRate, alertPercent)" tone="danger" size="xs" class="mod-num">{{ pct(row.errorRate) }}</SBadge>
            <span v-else class="mod-num">{{ pct(row.errorRate) }}</span>
          </template>
        </STable>
      </div>
    </div>
  </SCard>
</template>

<style scoped>
.mod-ov-trend {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mod-ov-title-hint {
  margin-left: 0.5rem;
}
</style>
