<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SCard, SChart, SEmpty, SGrid, SHint, STable, type TableColumn } from '@sub2api/ui'
import { enumLabel, errorMessage, fetchCosts, money, useModHost, type Costs } from './host'

// "审核费用" card of the overview (§72.13.3): GET /costs?range=, totals, by
// source, by channel, trend; unpriced calls are counted but not in the amount.
const props = defineProps<{ range: string }>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)

const data = ref<Costs | null>(null)
const loading = ref(false)
const error = ref('')

async function reload() {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchCosts(props.range)
  } catch (e) {
    error.value = errorMessage(e, t('cost.loadFailed'))
  } finally {
    loading.value = false
  }
}
watch(() => props.range, reload, { immediate: true })
defineExpose({ reload })

const totals = computed(() => data.value?.totals)
const sources = computed(() => (data.value?.by_source || []).filter((s) => s.summary.calls > 0))
const channels = computed(() => (data.value?.by_channel || []).filter((c) => c.summary.calls > 0))

const channelColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('channels.col.name') },
  { key: 'calls', label: t('cost.callsCol'), align: 'right', nowrap: true },
  { key: 'cost', label: t('analysis.cost'), align: 'right', nowrap: true }
])

function bucketLabel(ts: string) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const p = (x: number) => String(x).padStart(2, '0')
  if (props.range === '24h') return `${p(d.getHours())}:00`
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

const chart = computed(() => {
  const trend = data.value?.trend || []
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => money(v) },
    grid: { left: 56, right: 12, top: 12, bottom: 24 },
    xAxis: { type: 'category', data: trend.map((p) => bucketLabel(p.bucket)) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => '$' + v } },
    series: [{ name: t('analysis.cost'), type: 'bar', barMaxWidth: 20, color: '#6366f1', data: trend.map((p) => Number(p.cost) || 0) }]
  }
})
const hasTrend = computed(() => (data.value?.trend || []).some((p) => Number(p.cost) > 0))
</script>

<template>
  <SCard :title="t('cost.title')" :subtitle="t('cost.hint')">
    <SAlert v-if="error" tone="danger">{{ error }}</SAlert>
    <template v-else>
      <SAlert v-if="totals?.unpriced_calls" tone="warning" class="mod-block">
        {{ t('cost.unpriced', { n: n(totals.unpriced_calls), tokens: n(totals.unpriced_tokens) }) }}
      </SAlert>
      <SGrid template="repeat(auto-fit, minmax(260px, 1fr))">
        <div>
          <div class="mod-cost-total">
            <span class="mod-cost-amount mod-num">{{ totals ? money(totals.cost) : '—' }}</span>
            <SHint inline size="xs">{{ t('cost.calls', { n: n(totals?.calls) }) }}<template v-if="totals?.free_calls"> · {{ t('cost.free', { n: n(totals.free_calls) }) }}</template></SHint>
          </div>
          <SHint v-if="totals" size="xs" class="mod-num">{{ t('cost.tokens', { in: n(totals.tokens_in), out: n(totals.tokens_out) }) }}</SHint>
          <p class="mod-cost-label">{{ t('cost.bySource') }}</p>
          <SEmpty v-if="!loading && !sources.length" :text="t('cost.empty')" icon="chart" />
          <ul v-else class="mod-scores">
            <li v-for="s in sources" :key="s.source">
              <span>{{ enumLabel('costSource', s.source) }} <span class="mod-sub mod-num">{{ t('cost.calls', { n: n(s.summary.calls) }) }}</span></span>
              <span class="mod-num">{{ money(s.summary.cost) }}</span>
            </li>
          </ul>
        </div>
        <div>
          <p class="mod-cost-label mod-cost-label-top">{{ t('cost.byChannel') }}</p>
          <STable :columns="channelColumns" :rows="channels" row-key="channel_id" :loading="loading && !data" :empty-text="t('cost.empty')" dense>
            <template #cell-name="{ row }">
              {{ row.name || `#${row.channel_id}` }}
              <SBadge v-if="row.deleted" size="xs" tone="gray" class="mod-ml">{{ t('cost.deleted') }}</SBadge>
              <div class="mod-sub">{{ row.billing_model || row.model }}</div>
            </template>
            <template #cell-calls="{ row }">
              <span class="mod-num">{{ n(row.summary.calls) }}</span>
              <div v-if="row.summary.unpriced_calls" class="mod-sub mod-num">{{ t('channels.unpricedN', { n: n(row.summary.unpriced_calls) }) }}</div>
            </template>
            <template #cell-cost="{ row }"><span class="mod-num">{{ money(row.summary.cost) }}</span></template>
          </STable>
        </div>
      </SGrid>
      <div v-if="hasTrend" class="mod-section">
        <p class="mod-cost-label mod-cost-label-top">{{ t('cost.trend') }}</p>
        <SChart :option="chart" :loading="loading" height="160px" />
      </div>
    </template>
  </SCard>
</template>
