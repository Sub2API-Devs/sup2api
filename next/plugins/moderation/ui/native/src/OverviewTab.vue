<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SAlert, SButton, SCard, SChart, SDescriptions, SEmpty, SGrid, SLink, SProgress, SStatCard, STimeRange, type DescItem, type RangeKey } from '@sub2api/ui'
import RankList from './RankList.vue'
import { canManageSettings, categoryLabel, errorMessage, fetchOverview, useModHost, type Overview, type Runtime } from './host'

const emit = defineEmits<{
  (e: 'runtime', r: Runtime): void
  (e: 'show-user', userId: number): void
  (e: 'go-settings'): void
}>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)
const canSettings = canManageSettings()

const rangeKeys: RangeKey[] = ['24h', '7d', '30d']
const range = ref<RangeKey>('24h')
const data = ref<Overview | null>(null)
const loading = ref(false)
const error = ref('')

async function reload() {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchOverview(range.value)
    if (data.value?.runtime) emit('runtime', data.value.runtime)
  } catch (e) {
    error.value = errorMessage(e, t('overview.loadFailed'))
  } finally {
    loading.value = false
  }
}

watch(range, reload)
onMounted(reload)
defineExpose({ reload })

const totals = computed(() => data.value?.totals)
const runtime = computed(() => data.value?.runtime)
const first = computed(() => loading.value && !data.value)

/** Setup hint above the cards: upstream not configured, or moderation off. */
const notice = computed(() => {
  const r = runtime.value
  if (r && !r.configured) return { tone: 'warning' as const, text: t('overview.notConfigured'), primary: true }
  if (r?.mode === 'off') return { tone: 'info' as const, text: t('overview.offHint'), primary: false }
  return null
})

const cards = computed(() => [
  { key: 'total', icon: 'eyeglass', tone: 'primary' as const, value: totals.value?.total },
  { key: 'pass', icon: 'check', tone: 'success' as const, value: totals.value?.pass },
  { key: 'flag', icon: 'warning', tone: 'warning' as const, value: totals.value?.flag },
  { key: 'block', icon: 'shield', tone: 'danger' as const, value: totals.value?.block },
  { key: 'error', icon: 'x', tone: 'warning' as const, value: totals.value?.error },
  { key: 'denied', icon: 'lock', tone: 'danger' as const, value: totals.value?.denied }
])

// Buckets are UTC hour/day starts. Hours are shown in local time; days keep
// their UTC date so a bucket is never split across two labels.
function bucketLabel(ts: string) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const p = (x: number) => String(x).padStart(2, '0')
  if (range.value === '24h') return `${p(d.getHours())}:00`
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

// Series colours (ECharts takes colours, not tones): green / amber / red / slate.
const colors = { pass: '#22c55e', flag: '#f59e0b', block: '#ef4444', error: '#94a3b8' }

const chart = computed(() => {
  const trend = data.value?.trend || []
  const keys = ['pass', 'flag', 'block', 'error'] as const
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: keys.map((k) => t(`verdict.${k}`)), top: 0 },
    grid: { left: 48, right: 16, top: 36, bottom: 32 },
    xAxis: { type: 'category', data: trend.map((p) => bucketLabel(p.bucket)) },
    yAxis: { type: 'value', minInterval: 1 },
    series: keys.map((k) => ({
      name: t(`verdict.${k}`),
      type: 'bar',
      stack: 'verdict',
      barMaxWidth: 28,
      color: colors[k],
      emphasis: { focus: 'series' },
      data: trend.map((p) => p[k] || 0)
    }))
  }
})

const runtimeRows = computed<DescItem[]>(() => {
  const r = runtime.value
  if (!r) return []
  return [
    { key: 'mode', label: t('runtime.mode'), value: t(`mode.${r.mode || 'off'}`) },
    { key: 'configured', label: t('runtime.configured'), value: r.configured ? t('runtime.yes') : t('runtime.no') },
    { key: 'queue', label: t('runtime.queue'), value: `${n(r.queue_len)} / ${n(r.queue_cap)}` },
    { key: 'dropped', label: t('runtime.dropped'), value: n(r.dropped) },
    { key: 'inflight', label: t('runtime.inflight'), value: n(r.inflight) },
    { key: 'calls', label: t('runtime.calls'), value: n(r.calls) },
    { key: 'errors', label: t('runtime.errors'), value: n(r.errors) },
    { key: 'cacheHits', label: t('runtime.cacheHits'), value: n(r.cache_hits) },
    { key: 'avgLatency', label: t('runtime.avgLatency'), value: t('ms', { n: host.i18n.formatNumber(Math.round(r.avg_latency_ms || 0)) }) },
    { key: 'blockedUsers', label: t('runtime.blockedUsers'), value: n(r.blocked_users) }
  ]
})
</script>

<template>
  <div>
    <div class="mod-toolbar">
      <STimeRange v-model:range="range" from="" to="" :keys="rangeKeys" variant="segmented" size="sm" :label="false" />
    </div>

    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SAlert v-if="notice" :tone="notice.tone" class="mod-block">
      {{ notice.text }}
      <template v-if="canSettings" #actions>
        <SButton :variant="notice.primary ? 'primary' : 'secondary'" size="sm" icon="settings" @click="emit('go-settings')">{{ t('tabs.settings') }}</SButton>
      </template>
    </SAlert>

    <SGrid template="repeat(auto-fit, minmax(190px, 1fr))">
      <SStatCard v-for="c in cards" :key="c.key" :label="t(`overview.${c.key}`)" :value="n(c.value)" :icon="c.icon" :tone="c.tone" :loading="first" />
    </SGrid>

    <SCard :title="t('overview.trend')" :subtitle="range === '24h' ? undefined : t('overview.trendHint')" class="mod-section">
      <SChart :option="chart" :loading="loading" height="280px" />
    </SCard>

    <SGrid template="repeat(auto-fit, minmax(300px, 1fr))" class="mod-section">
      <SCard :title="t('overview.topCategories')">
        <RankList :items="data?.top_categories" :item-key="(c) => c.category" tone="warning" :empty-text="t('overview.noCategories')" empty-icon="chart">
          <template #name="{ item: c }">
            <span class="mod-rank-name" :title="c.category">
              {{ categoryLabel(c.category) }}<code v-if="categoryLabel(c.category) !== c.category" class="mod-code">{{ c.category }}</code>
            </span>
          </template>
          <template #count="{ item: c }">{{ n(c.count) }}</template>
        </RankList>
      </SCard>

      <SCard :title="t('overview.topUsers')" :subtitle="t('overview.topUsersHint')">
        <RankList :items="data?.top_users" :item-key="(u) => u.user_id" tone="danger" :empty-text="t('overview.noUsers')" empty-icon="user">
          <template #name="{ item: u }">
            <SLink as="button" class="mod-rank-name mod-rank-link" @click="emit('show-user', u.user_id)">{{ t('overview.user', { id: u.user_id }) }}</SLink>
          </template>
          <template #count="{ item: u }">{{ t('overview.times', { n: n(u.count) }) }}</template>
        </RankList>
      </SCard>

      <SCard :title="t('overview.runtime')">
        <SEmpty v-if="!runtime" icon="cpu" />
        <template v-else>
          <SDescriptions :items="runtimeRows" label-width="9rem" dense class="mod-num" />
          <SProgress :value="runtime.queue_len" :max="runtime.queue_cap || 1" :label="t('runtime.queue')" tone="info" show-value class="mod-queue" />
        </template>
      </SCard>
    </SGrid>
  </div>
</template>
