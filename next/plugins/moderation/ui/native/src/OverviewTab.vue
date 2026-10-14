<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SAlert, SButton, SCard, SChart, SDescriptions, SEmpty, SLink, SProgress, SSegmented, SStatCard, type DescItem } from '@sub2api/ui'
import {
  canManageSettings,
  categoryLabel,
  errorMessage,
  fetchOverview,
  useModHost,
  type Overview,
  type Range,
  type Runtime
} from './host'

const emit = defineEmits<{
  (e: 'runtime', r: Runtime): void
  (e: 'show-user', userId: number): void
  (e: 'go-settings'): void
}>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)

const ranges: Range[] = ['24h', '7d', '30d']
const range = ref<Range>('24h')
const rangeOptions = computed(() => ranges.map((r) => ({ value: r, label: t(`range.${r}`) })))
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

const maxCat = computed(() => Math.max(1, ...(data.value?.top_categories || []).map((c) => c.count)))
const maxUser = computed(() => Math.max(1, ...(data.value?.top_users || []).map((u) => u.count)))

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
      <SSegmented v-model="range" :options="rangeOptions" size="sm" :aria-label="t('rangeLabel')" />
    </div>

    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SAlert v-if="runtime && !runtime.configured" tone="warning" class="mod-block">
      {{ t('overview.notConfigured') }}
      <template v-if="canManageSettings()" #actions>
        <SButton variant="primary" size="sm" icon="settings" @click="emit('go-settings')">{{ t('tabs.settings') }}</SButton>
      </template>
    </SAlert>
    <SAlert v-else-if="runtime && runtime.mode === 'off'" tone="info" class="mod-block">
      {{ t('overview.offHint') }}
      <template v-if="canManageSettings()" #actions>
        <SButton size="sm" icon="settings" @click="emit('go-settings')">{{ t('tabs.settings') }}</SButton>
      </template>
    </SAlert>

    <div class="mod-grid-stats">
      <SStatCard v-for="c in cards" :key="c.key" :label="t(`overview.${c.key}`)" :value="n(c.value)" :icon="c.icon" :tone="c.tone" :loading="first" />
    </div>

    <SCard :title="t('overview.trend')" :subtitle="range === '24h' ? undefined : t('overview.trendHint')" class="mod-section">
      <SChart :option="chart" :loading="loading" height="280px" />
    </SCard>

    <div class="mod-grid-3 mod-section">
      <SCard :title="t('overview.topCategories')">
        <SEmpty v-if="!data?.top_categories?.length" :text="t('overview.noCategories')" icon="chart" />
        <ol v-else class="mod-rank">
          <li v-for="(c, i) in data.top_categories" :key="c.category">
            <div class="mod-rank-row">
              <span class="mod-rank-no">{{ i + 1 }}</span>
              <span class="mod-rank-name" :title="c.category">
                {{ categoryLabel(c.category) }}<code v-if="categoryLabel(c.category) !== c.category" class="mod-code">{{ c.category }}</code>
              </span>
              <span class="mod-rank-count">{{ n(c.count) }}</span>
            </div>
            <SProgress :value="c.count" :max="maxCat" tone="warning" class="mod-rank-bar" aria-hidden="true" />
          </li>
        </ol>
      </SCard>

      <SCard :title="t('overview.topUsers')" :subtitle="t('overview.topUsersHint')">
        <SEmpty v-if="!data?.top_users?.length" :text="t('overview.noUsers')" icon="user" />
        <ol v-else class="mod-rank">
          <li v-for="(u, i) in data.top_users" :key="u.user_id">
            <div class="mod-rank-row">
              <span class="mod-rank-no">{{ i + 1 }}</span>
              <SLink as="button" class="mod-rank-name mod-rank-link" @click="emit('show-user', u.user_id)">{{ t('overview.user', { id: u.user_id }) }}</SLink>
              <span class="mod-rank-count">{{ t('overview.times', { n: n(u.count) }) }}</span>
            </div>
            <SProgress :value="u.count" :max="maxUser" tone="danger" class="mod-rank-bar" aria-hidden="true" />
          </li>
        </ol>
      </SCard>

      <SCard :title="t('overview.runtime')">
        <SEmpty v-if="!runtime" icon="cpu" />
        <template v-else>
          <SDescriptions :items="runtimeRows" label-width="9rem" dense class="mod-num" />
          <SProgress :value="runtime.queue_len" :max="runtime.queue_cap || 1" :label="t('runtime.queue')" tone="info" show-value class="mod-queue" />
        </template>
      </SCard>
    </div>
  </div>
</template>
