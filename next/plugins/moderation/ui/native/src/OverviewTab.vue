<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SButton, SCard, SChart, SEmpty, SIcon, SStatCard } from '@sub2api/ui'
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

const runtimeRows = computed(() => {
  const r = runtime.value
  if (!r) return []
  return [
    { k: t('runtime.mode'), v: t(`mode.${r.mode || 'off'}`) },
    { k: t('runtime.configured'), v: r.configured ? t('runtime.yes') : t('runtime.no') },
    { k: t('runtime.queue'), v: `${n(r.queue_len)} / ${n(r.queue_cap)}` },
    { k: t('runtime.dropped'), v: n(r.dropped) },
    { k: t('runtime.inflight'), v: n(r.inflight) },
    { k: t('runtime.calls'), v: n(r.calls) },
    { k: t('runtime.errors'), v: n(r.errors) },
    { k: t('runtime.cacheHits'), v: n(r.cache_hits) },
    { k: t('runtime.avgLatency'), v: t('ms', { n: host.i18n.formatNumber(Math.round(r.avg_latency_ms || 0)) }) },
    { k: t('runtime.blockedUsers'), v: n(r.blocked_users) }
  ]
})

const queuePct = computed(() => {
  const r = runtime.value
  if (!r || !r.queue_cap) return 0
  return Math.min(100, (r.queue_len / r.queue_cap) * 100)
})
</script>

<template>
  <div>
    <div class="mod-toolbar">
      <select v-model="range" class="input mod-w-40">
        <option v-for="r in ranges" :key="r" :value="r">{{ t(`range.${r}`) }}</option>
      </select>
    </div>

    <p v-if="error" class="mod-alert mod-alert-danger">{{ error }}</p>

    <div v-if="runtime && !runtime.configured" class="mod-callout">
      <SIcon name="warning" class="mod-callout-icon" />
      <p class="mod-callout-text">{{ t('overview.notConfigured') }}</p>
      <SButton v-if="canManageSettings()" variant="primary" size="sm" @click="emit('go-settings')">
        <SIcon name="settings" class="mod-icon" />{{ t('tabs.settings') }}
      </SButton>
    </div>
    <div v-else-if="runtime && runtime.mode === 'off'" class="mod-callout mod-callout-info">
      <SIcon name="info" class="mod-callout-icon" />
      <p class="mod-callout-text">{{ t('overview.offHint') }}</p>
      <SButton v-if="canManageSettings()" size="sm" @click="emit('go-settings')">
        <SIcon name="settings" class="mod-icon" />{{ t('tabs.settings') }}
      </SButton>
    </div>

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
            <div class="mod-bar"><div class="mod-bar-fill mod-bar-amber" :style="{ width: (c.count / maxCat) * 100 + '%' }" /></div>
          </li>
        </ol>
      </SCard>

      <SCard :title="t('overview.topUsers')" :subtitle="t('overview.topUsersHint')">
        <SEmpty v-if="!data?.top_users?.length" :text="t('overview.noUsers')" icon="user" />
        <ol v-else class="mod-rank">
          <li v-for="(u, i) in data.top_users" :key="u.user_id">
            <div class="mod-rank-row">
              <span class="mod-rank-no">{{ i + 1 }}</span>
              <a class="link mod-rank-name" @click="emit('show-user', u.user_id)">{{ t('overview.user', { id: u.user_id }) }}</a>
              <span class="mod-rank-count">{{ t('overview.times', { n: n(u.count) }) }}</span>
            </div>
            <div class="mod-bar"><div class="mod-bar-fill" :style="{ width: (u.count / maxUser) * 100 + '%' }" /></div>
          </li>
        </ol>
      </SCard>

      <SCard :title="t('overview.runtime')">
        <SEmpty v-if="!runtime" icon="cpu" />
        <template v-else>
          <dl class="kv">
            <template v-for="r in runtimeRows" :key="r.k">
              <dt>{{ r.k }}</dt>
              <dd class="mod-num">{{ r.v }}</dd>
            </template>
          </dl>
          <div class="mod-bar mod-bar-queue" :title="t('runtime.queue')">
            <div class="mod-bar-fill mod-bar-teal" :style="{ width: queuePct + '%' }" />
          </div>
        </template>
      </SCard>
    </div>
  </div>
</template>
