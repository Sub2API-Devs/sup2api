<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SChip, SCode, SGrid, SHint, SPageHeader, SStatCard, SStatusDot, STable, type TableColumn, type Tone, type StatusTone } from '@sub2api/ui'
import type { NodeInfo } from '@/api/types'
import { statusTone, type NodePluginState } from '@/api/admin'
import { notifyError } from '@/utils/errors'
import TimeText from '@/components/TimeText.vue'
import TopologyGraph from './TopologyGraph.vue'

const { t } = useI18n()

/** Heartbeats older than this are considered stale (node likely gone). */
const STALE_SECONDS = 30
const REFRESH_MS = 5000

const nodes = ref<NodeInfo[]>([])
const loading = ref(true)
const lastLoaded = ref<Date | null>(null)
const tick = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
let clock: ReturnType<typeof setInterval> | undefined
let inflight = false
let failures = 0

async function load(manual = false) {
  if (inflight) return
  inflight = true
  try {
    const r = await api.list<NodeInfo>('/nodes', { page_size: 200 })
    nodes.value = [...r.items].sort((a, b) => a.node_id.localeCompare(b.node_id))
    lastLoaded.value = new Date()
    failures = 0
  } catch (e) {
    // Only toast the first failure of a streak (or a manual refresh) to avoid a toast every 5s.
    if (manual || failures === 0) notifyError(e)
    failures++
  } finally {
    inflight = false
    loading.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => {
    if (document.visibilityState !== 'hidden') load()
  }, REFRESH_MS)
  clock = setInterval(() => (tick.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  clearInterval(clock)
})

// ------------------------------------------------------------------ helpers

function ageSeconds(v: string | null | undefined): number {
  if (!v) return Infinity
  const ts = new Date(v).getTime()
  return Number.isNaN(ts) ? Infinity : (tick.value - ts) / 1000
}

function isStale(n: NodeInfo) {
  return ageSeconds(n.last_heartbeat) > STALE_SECONDS
}

function parsePlugin(v: string | Record<string, any> | null | undefined): NodePluginState {
  if (v === null || v === undefined) return {}
  if (typeof v === 'object') return v as NodePluginState
  const s = v.trim()
  if (s.startsWith('{')) {
    try {
      return JSON.parse(s) as NodePluginState
    } catch {
      /* fall through */
    }
  }
  // A bare string is treated as the state.
  return { state: s }
}

interface PluginBadge {
  key: string
  version?: string
  state: string
  tone: Tone
  detail: string
  fallback?: string
  standby?: string
}

function pluginBadges(n: NodeInfo): PluginBadge[] {
  return Object.entries(n.plugins || {})
    .map(([key, raw]) => {
      const p = parsePlugin(raw)
      const state = String(p.state || p.status || 'unknown')
      const detail = [
        `${key}${p.serving ? ' ' + p.serving : ''}`,
        p.standby ? `${t('observe.standby')}: ${p.standby}` : '',
        p.fallback ? `${t('observe.fallback')}: ${p.fallback}` : '',
        `${t('observe.instances')}: ${p.instances?.length || 0}; ${t('observe.restarts')}: ${p.instances?.reduce((sum, i) => sum + i.restarts, 0) || 0}`,
        `${t('nodes.state')}: ${state}`,
        p.error ? `${t('nodes.error')}: ${p.error}` : ''
      ]
        .filter(Boolean)
        .join('\n')
      return { key, version: p.serving, fallback: p.fallback, standby: p.standby, state, tone: p.fallback ? 'warning' as Tone : pluginTone(state), detail }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

function pluginTone(state: string): Tone {
  const s = state.toLowerCase()
  if (s === 'running' || s === 'ready' || s === 'active' || s === 'serving' || s === 'healthy') return 'success'
  return statusTone(s)
}

function dotTone(tone: Tone): StatusTone {
  return tone === 'success' || tone === 'warning' || tone === 'danger' ? tone : 'neutral'
}

/** Plugin badges per node, built once per load. */
const badges = computed(() => new Map(nodes.value.map((n) => [n.boot_id, pluginBadges(n)])))

// ------------------------------------------------------------------ table

const columns = computed<TableColumn[]>(() => [
  { key: 'node_id', label: t('nodes.node') },
  { key: 'addr', label: t('nodes.addr') },
  { key: 'host_version', label: t('common.version') },
  { key: 'started_at', label: t('nodes.uptime') },
  { key: 'last_heartbeat', label: t('nodes.heartbeat') },
  { key: 'plugins', label: t('nodes.plugins') }
])

const healthy = computed(() => nodes.value.filter((n) => !isStale(n)).length)
const pluginIssues = computed(() => [...badges.value.values()].flat().filter((p) => p.tone === 'danger' || p.tone === 'warning').length)
const versions = computed(() => new Set(nodes.value.map((n) => n.host_version)).size)
</script>

<template>
  <div>
    <SPageHeader :title="t('nodes.title')" :description="t('nodes.description')">
      <template #actions>
        <SStatusDot tone="success" pulse size="xs">
          <SHint inline size="xs">
            {{ t('nodes.autoRefresh') }}
            <template v-if="lastLoaded">· <TimeText :value="lastLoaded" mode="relative" live /></template>
          </SHint>
        </SStatusDot>
        <SButton size="sm" icon="refresh" :loading="loading" @click="load(true)">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>

    <SGrid :cols="1" :md-cols="3" class="mb-4">
      <SStatCard :label="t('nodes.online')" :value="`${healthy}/${nodes.length}`" icon="node" :tone="healthy < nodes.length ? 'warning' : 'success'" :loading="loading" />
      <SStatCard :label="t('nodes.pluginIssues')" :value="pluginIssues" icon="plugin" :tone="pluginIssues ? 'danger' : 'primary'" :loading="loading" />
      <SStatCard :label="t('nodes.hostVersions')" :value="versions" icon="cpu" :tone="versions > 1 ? 'warning' : 'primary'" :sub="versions > 1 ? t('nodes.mixedVersions') : undefined" :loading="loading" />
    </SGrid>

    <TopologyGraph />
    <STable card :columns="columns" :rows="nodes" :loading="loading" row-key="boot_id">
      <template #cell-node_id="{ row }">
        <div class="flex items-center gap-2">
          <SStatusDot :tone="isStale(row) ? 'danger' : 'success'" :label="isStale(row) ? t('nodes.stale') : t('nodes.alive')" sr-only />
          <span class="font-medium text-fg">{{ row.node_id }}</span>
        </div>
        <SHint size="xs" class="pl-4 font-mono" :title="row.boot_id">{{ t('observe.boot') }} {{ String(row.boot_id || '').slice(0, 8) }}</SHint>
      </template>
      <template #cell-addr="{ row }">
        <SCode inline :text="row.addr" />
      </template>
      <template #cell-host_version="{ row }">
        <SBadge tone="gray">{{ row.host_version }}</SBadge>
      </template>
      <template #cell-started_at="{ row }">
        <TimeText :value="row.started_at" mode="relative" live />
      </template>
      <template #cell-last_heartbeat="{ row }">
        <TimeText :value="row.last_heartbeat" mode="relative" live :muted="false" :class="isStale(row) ? 'font-medium text-danger-600 dark:text-danger-400' : 'text-fg'" />
        <SBadge v-if="isStale(row)" tone="danger" class="ml-2">{{ t('nodes.stale') }}</SBadge>
      </template>
      <template #cell-plugins="{ row }">
        <div class="flex flex-wrap gap-1.5">
          <SChip v-for="p in badges.get(row.boot_id)" :key="p.key" :title="p.detail" data-testid="node-plugin">
            <span class="inline-flex items-center gap-1.5">
              <SStatusDot :tone="dotTone(p.tone)" :label="p.state" sr-only />
              <span>{{ p.key }}</span>
              <span v-if="p.version" class="font-mono text-fg-muted">{{ p.version }}</span>
              <span v-if="p.standby">→ {{ p.standby }}</span>
              <SBadge v-if="p.fallback" tone="warning">{{ t('observe.fallback') }}</SBadge>
            </span>
          </SChip>
          <SHint v-if="!badges.get(row.boot_id)?.length" inline>—</SHint>
        </div>
      </template>
    </STable>
  </div>
</template>
