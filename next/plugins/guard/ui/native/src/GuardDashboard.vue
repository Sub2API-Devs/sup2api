<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { SButton, SCard, SChart, SEmpty, SIcon, SPageHeader, SStatCard, STable } from '@sub2api/ui'
import { isApiError } from '@sub2api/host'
import RulesEditor from './RulesEditor.vue'
import { fetchStats, useGuardHost, type Range, type Stats } from './host'

// "Request guard" dashboard (wireframe A.13): blocking trend, top rules,
// recent blocks; rule management in a modal.
const host = useGuardHost()
const t = host.t

const range = ref<Range>('today')
const stats = ref<Stats | null>(null)
const loading = ref(false)
const error = ref('')
const rulesOpen = ref(false)

const ranges: Range[] = ['today', '24h', '7d', '30d']

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await fetchStats({ range: range.value })
  } catch (e) {
    error.value = isApiError(e) ? e.message : t('loadFailed')
  } finally {
    loading.value = false
  }
}

watch(range, load)
onMounted(load)

function label(ts: string, bucket: 'hour' | 'day') {
  const d = new Date(ts)
  const p = (x: number) => String(x).padStart(2, '0')
  return bucket === 'day' ? `${p(d.getMonth() + 1)}-${p(d.getDate())}` : `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:00`
}

const chart = computed(() => {
  const s = stats.value
  const trend = s?.trend || []
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('blocked'), t('requests')], top: 0 },
    grid: { left: 48, right: 48, top: 36, bottom: 32 },
    xAxis: { type: 'category', data: trend.map((p) => label(p.ts, s?.bucket || 'hour')) },
    yAxis: [
      { type: 'value', minInterval: 1 },
      { type: 'value', minInterval: 1, splitLine: { show: false } }
    ],
    series: [
      { name: t('blocked'), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, color: '#ef4444', data: trend.map((p) => p.blocked) },
      { name: t('requests'), type: 'line', smooth: true, yAxisIndex: 1, color: '#14b8a6', lineStyle: { type: 'dashed' }, data: trend.map((p) => p.total) }
    ]
  }
})

const rate = computed(() => {
  const s = stats.value
  if (!s || !s.requests_total) return '0%'
  return ((s.blocked_total / s.requests_total) * 100).toFixed(2) + '%'
})

const maxHits = computed(() => Math.max(1, ...(stats.value?.top_rules || []).map((r) => r.hits)))

const recentColumns = computed(() => [
  { key: 'occurred_at', label: t('col.time') },
  { key: 'rule_name', label: t('col.rule') },
  { key: 'model', label: t('col.model') },
  { key: 'user_id', label: t('col.user') },
  { key: 'snippet', label: t('col.snippet') },
  { key: 'request_id', label: t('col.request') }
])
</script>

<template>
  <div class="guard-dashboard">
    <SPageHeader :title="t('title')" :description="t('subtitle')">
      <template #actions>
        <select v-model="range" class="input !w-40">
          <option v-for="r in ranges" :key="r" :value="r">{{ t(`range.${r}`) }}</option>
        </select>
        <SButton :loading="loading" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
        <SButton v-if="host.can('rules:read')" variant="primary" @click="rulesOpen = true">
          <SIcon name="shield" class="h-4 w-4" />{{ t('manageRules') }}
        </SButton>
      </template>
    </SPageHeader>

    <p v-if="error" class="guard-error">{{ error }}</p>

    <div class="guard-grid-3">
      <SStatCard :label="t('blocked')" :value="host.i18n.formatNumber(stats?.blocked_total ?? 0)" icon="shield" tone="danger" :loading="loading && !stats" />
      <SStatCard :label="t('requests')" :value="host.i18n.formatNumber(stats?.requests_total ?? 0)" icon="usage" :loading="loading && !stats" />
      <SStatCard :label="t('blockRate')" :value="rate" icon="chart" tone="warning" :loading="loading && !stats" />
    </div>

    <SCard :title="t('trend')" class="guard-section">
      <SChart :option="chart" :loading="loading" height="280px" />
    </SCard>

    <div class="guard-grid-2 guard-section">
      <SCard :title="t('topRules')">
        <SEmpty v-if="!stats?.top_rules?.length" :text="t('noBlocks')" icon="shield" />
        <ol v-else class="guard-top">
          <li v-for="(r, i) in stats.top_rules" :key="r.rule_id">
            <div class="guard-top-row">
              <span class="guard-rank">{{ i + 1 }}</span>
              <span class="guard-rule-name" :title="r.pattern">
                {{ r.name }}
                <code>{{ r.kind === 'regex' ? `/${r.pattern}/` : `"${r.pattern}"` }}</code>
              </span>
              <span class="guard-hits">{{ t('hits', { n: r.hits }) }}</span>
            </div>
            <div class="guard-bar"><div class="guard-bar-fill" :style="{ width: (r.hits / maxHits) * 100 + '%' }" /></div>
          </li>
        </ol>
      </SCard>

      <SCard :title="t('recent')" :padded="false">
        <STable :columns="recentColumns" :rows="stats?.recent || []" row-key="request_id" dense>
          <template #cell-occurred_at="{ value }">{{ host.i18n.formatDateTime(value) }}</template>
          <template #cell-snippet="{ value }"><span class="guard-snippet" :title="value">{{ value || '—' }}</span></template>
          <template #cell-request_id="{ value }"><code class="guard-code">{{ String(value || '').slice(0, 10) }}</code></template>
        </STable>
      </SCard>
    </div>

    <RulesEditor v-model:open="rulesOpen" @saved="load" />
  </div>
</template>

<style scoped>
.guard-grid-3 {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.guard-grid-2 {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
}
.guard-section {
  margin-top: 1.25rem;
}
.guard-error {
  margin-bottom: 1rem;
  border-radius: 0.75rem;
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}
.guard-top {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.guard-top-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.guard-rank {
  width: 1.25rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
.guard-rule-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.guard-rule-name code,
.guard-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-left: 0.25rem;
}
.guard-hits {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.guard-bar {
  margin-top: 0.25rem;
  margin-left: 1.75rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
}
.guard-bar-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #f87171, #ef4444);
}
.guard-snippet {
  display: inline-block;
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
