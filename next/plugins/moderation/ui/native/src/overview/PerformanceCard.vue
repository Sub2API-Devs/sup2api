<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { SChart, SGrid, SSegmented, SSelect, STable, type TableColumn } from '@sub2api/ui'
import AsyncCard from './AsyncCard.vue'
import { onOverviewTick } from './tick'
import { useCatalog } from '../catalog'
import { bucketLabel, lineChart } from '../charts'
import { enumLabel, enumOptions, latency, num } from '../format'
import { fetchPerformance, useModHost } from '../host'
import type { StatsQuery } from '../types'
import { useAsync } from '../useAsync'

// Performance impact (new-api performance-section): only pre moderation
// (enforce-level users, enforce mode) adds latency. Quantiles approximate the
// 9 latency buckets; filter by group or flow (the flow's pre runs).
const t = useModHost().t
const catalog = useCatalog()

const q = reactive<Required<StatsQuery>>({ granularity: 'hour', group_id: '', flow_id: '' })
const perf = useAsync(() => fetchPerformance(q), () => t('stats.loadFailed'))
watch(q, perf.reload, { immediate: true })
onOverviewTick(perf.reload)

const granularityOptions = computed(() => enumOptions('stats.granularity', ['hour', 'day']))
const groupOptions = computed(() => [{ value: '', label: t('stats.allGroups') }, ...catalog.groupOptions()])
const flowOptions = computed(() => [{ value: '', label: t('perf.byRequest') }, ...catalog.state.flows.map((f) => ({ value: f.id, label: t('perf.flowPre', { name: f.name }) }))])

const data = computed(() => perf.data.value)
const byFlow = computed(() => q.flow_id !== '')
const tiles = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    { key: 'avg', value: latency(s.avg_ms), note: byFlow.value ? t('perf.avgFlowNote') : t('perf.avgNote') },
    { key: 'p95', value: `≈ ${latency(s.p95_ms)}`, note: t('perf.p95Note', { p50: latency(s.p50_ms), p99: latency(s.p99_ms) }) },
    { key: 'count', value: num(s.count), note: byFlow.value ? t('perf.countFlowNote') : t('perf.countNote') }
  ]
})

const chart = computed(() => {
  const points = data.value?.points || []
  return lineChart(
    points.map((p) => bucketLabel(p.ts, q.granularity)),
    [
      { name: t('perf.avg'), data: points.map((p) => Math.round(p.avg_ms)) },
      { name: t('perf.p95'), data: points.map((p) => Math.round(p.p95_ms)), dashed: true }
    ],
    latency
  )
})

const auditors = computed(() => [...(data.value?.auditors || [])].sort((a, b) => b.p95_ms - a.p95_ms))
const columns = computed<TableColumn[]>(() => [
  { key: 'auditor', label: t('trace.auditor') },
  { key: 'count', label: t('stats.calls'), align: 'right', nowrap: true },
  { key: 'avg', label: t('perf.avg'), align: 'right', nowrap: true },
  { key: 'p95', label: t('perf.p95'), align: 'right', nowrap: true }
])
</script>

<template>
  <AsyncCard :title="t('perf.title')" :subtitle="t('perf.hint')" :error="perf.error.value" :loading="perf.loading.value" :empty="!data" :empty-text="t('stats.noData')">
    <template #actions>
      <SSelect v-model="q.group_id" :options="groupOptions" size="sm" :aria-label="t('stats.group')" class="mod-filter-sm" />
      <SSelect v-model="q.flow_id" :options="flowOptions" size="sm" :aria-label="t('events.col.flow')" class="mod-filter-sm" />
      <SSegmented v-model="q.granularity" :options="granularityOptions" size="sm" />
    </template>
    <div class="mod-stack">
      <SGrid template="repeat(auto-fit, minmax(180px, 1fr))">
        <div v-for="tile in tiles" :key="tile.key" class="mod-tile">
          <div class="mod-sub">{{ t(`perf.tile.${tile.key}`) }}</div>
          <div class="mod-tile-value mod-num">{{ tile.value }}</div>
          <div class="mod-sub">{{ tile.note }}</div>
        </div>
      </SGrid>
      <SChart v-if="data?.points?.length" :option="chart" :loading="perf.loading.value" height="220px" />
      <p v-else class="mod-sub mod-center">{{ t('perf.noPre') }}</p>
      <p class="mod-cost-label">{{ t('perf.auditors') }} <span class="mod-sub">{{ t('perf.auditorsHint') }}</span></p>
      <STable :columns="columns" :rows="auditors" row-key="auditor_id" dense :empty-text="t('perf.noAuditors')">
        <template #cell-auditor="{ row }">
          {{ catalog.auditorName(row.auditor_id) }}
          <span v-if="catalog.auditor(row.auditor_id)" class="mod-sub">{{ enumLabel('auditorType', catalog.auditor(row.auditor_id)?.type) }}</span>
        </template>
        <template #cell-count="{ row }"><span class="mod-num">{{ num(row.count) }}</span></template>
        <template #cell-avg="{ row }"><span class="mod-num">{{ latency(row.avg_ms) }}</span></template>
        <template #cell-p95="{ row }"><span class="mod-num">≈ {{ latency(row.p95_ms) }}</span></template>
      </STable>
    </div>
  </AsyncCard>
</template>
