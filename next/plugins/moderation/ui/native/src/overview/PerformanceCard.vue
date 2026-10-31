<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SCard, SEmpty, SGrid, SHint, SSectionTitle, SSelect, SSpinner, SStatCard, STable, type TableColumn } from '@sub2api/ui'
import { enumLabel, useModHost } from '../host'
import { browserTZ } from '../stats'
import { groupName } from '../directory'
import { bucketLabels } from './chart'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'
import GranularitySwitch from './GranularitySwitch.vue'
import OverviewLine from './OverviewLine.vue'

// Performance impact (GET /stats/performance): only pre-moderation (users at
// the enforce level, or enforce mode) adds latency. Without a flow the
// figures are per request; with one, that flow's pre runs. Quantiles are
// estimated from the latency buckets.
const ov = useOverviewData()
const t = useModHost().t
const { n, ms, approx } = useFormat()

const data = computed(() => ov.performance.data.value)
const summary = computed(() => data.value?.summary)
const byFlow = computed(() => ov.perf.flow !== null)

const groupOptions = computed(() => [
  { value: null, label: t('overviewP3.perf.allGroups') },
  { value: 0, label: groupName(0) },
  ...ov.groups.value.map((g) => ({ value: g.id, label: g.name }))
])
const flowOptions = computed(() => [
  { value: null, label: t('overviewP3.perf.byRequest') },
  ...ov.flows.value.filter((f) => f.version > 0).map((f) => ({ value: f.id, label: t('overviewP3.perf.flowRuns', { name: f.name }) }))
])

const tiles = computed(() => {
  const s = summary.value
  return [
    { key: 'avg', value: s ? ms(s.avg_ms) : '—', sub: t(byFlow.value ? 'overviewP3.perf.avgFlow' : 'overviewP3.perf.avgSub') },
    { key: 'p95', value: s ? approx(s.p95_ms) : '—', sub: s ? t('overviewP3.perf.quantiles', { p50: approx(s.p50_ms), p99: approx(s.p99_ms) }) : '' },
    { key: 'count', value: n(s?.count), sub: t(byFlow.value ? 'overviewP3.perf.countFlow' : 'overviewP3.perf.countSub') }
  ]
})

const points = computed(() => data.value?.points || [])
const labels = computed(() => bucketLabels(points.value, data.value?.granularity || ov.perf.granularity, browserTZ()))
const series = computed(() => [
  { name: t('overviewP3.perf.avg'), data: points.value.map((p) => Math.round(p.avg_ms)) },
  { name: t('overviewP3.perf.p95'), data: points.value.map((p) => Math.round(p.p95_ms)), dashed: true }
])

const auditorRows = computed(() => [...(data.value?.auditors || [])].sort((a, b) => b.p95_ms - a.p95_ms))
const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('overviewP3.col.auditor') },
  { key: 'count', label: t('overviewP3.col.calls'), align: 'right', nowrap: true },
  { key: 'avg', label: t('overviewP3.perf.avg'), align: 'right', nowrap: true },
  { key: 'p95', label: 'P95', align: 'right', nowrap: true },
  { key: 'p99', label: 'P99', align: 'right', nowrap: true }
])
</script>

<template>
  <SCard :title="t('overviewP3.perf.title')" :subtitle="t('overviewP3.perf.hint')">
    <template #actions>
      <div class="mod-ov-filters">
        <SSelect v-model="ov.perf.group" :options="groupOptions" size="sm" :aria-label="t('overviewP3.perf.group')" class="mod-ov-filter" />
        <SSelect v-model="ov.perf.flow" :options="flowOptions" size="sm" :aria-label="t('overviewP3.perf.flow')" class="mod-ov-filter" />
        <GranularitySwitch v-model="ov.perf.granularity" />
      </div>
    </template>
    <SAlert v-if="ov.performance.error.value" tone="danger">{{ ov.performance.error.value }}</SAlert>
    <SSpinner v-else-if="!data" block />
    <div v-else class="mod-ov-stack">
      <SGrid template="repeat(auto-fit, minmax(200px, 1fr))">
        <SStatCard v-for="x in tiles" :key="x.key" :label="t(`overviewP3.perf.tile.${x.key}`)" :value="x.value" :sub="x.sub" compact />
      </SGrid>
      <OverviewLine v-if="summary?.count" :labels="labels" :series="series" :format="ms" :loading="ov.performance.loading.value" />
      <SEmpty v-else icon="clock" :text="t('overviewP3.perf.none')" size="sm" />
      <div>
        <SSectionTitle tag="p">
          {{ t('overviewP3.perf.auditors') }}
          <SHint inline size="xs" class="mod-ov-title-hint">{{ t('overviewP3.perf.auditorsHint') }}</SHint>
        </SSectionTitle>
        <STable :columns="columns" :rows="auditorRows" row-key="auditor_id" :empty-text="t('overviewP3.perf.noCalls')" dense>
          <template #cell-name="{ row }">
            {{ ov.auditorName(row.auditor_id) }}
            <span v-if="ov.auditorById.value.get(row.auditor_id)" class="mod-sub">{{ enumLabel('auditorType', ov.auditorById.value.get(row.auditor_id)?.type) }}</span>
          </template>
          <template #cell-count="{ row }"><span class="mod-num">{{ n(row.count) }}</span></template>
          <template #cell-avg="{ row }"><span class="mod-num">{{ ms(row.avg_ms) }}</span></template>
          <template #cell-p95="{ row }"><b class="mod-num">{{ approx(row.p95_ms) }}</b></template>
          <template #cell-p99="{ row }"><span class="mod-num">{{ approx(row.p99_ms) }}</span></template>
        </STable>
      </div>
    </div>
  </SCard>
</template>

<style scoped>
.mod-ov-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.mod-ov-filter {
  width: 11rem;
}
.mod-ov-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mod-ov-title-hint {
  margin-left: 0.375rem;
}
</style>
