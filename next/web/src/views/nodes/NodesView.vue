<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SIcon, SPageHeader, SStatCard, STable, type TableColumn, type Tone } from '@sub2api/ui'
import type { NodeInfo } from '@/api/types'
import { statusTone, type NodePluginState } from '@/api/admin'
import { notifyError } from '@/utils/errors'
import { formatDateTime, formatRelative } from '@/utils/format'

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

function relative(v: string | null | undefined) {
  // Depend on tick so the text refreshes every second.
  void tick.value
  return formatRelative(v, t)
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
}

function pluginBadges(n: NodeInfo): PluginBadge[] {
  return Object.entries(n.plugins || {})
    .map(([key, raw]) => {
      const p = parsePlugin(raw)
      const state = String(p.state || p.status || 'unknown')
      const detail = [
        `${key}${p.version ? ' ' + p.version : ''}`,
        `${t('nodes.state')}: ${state}`,
        p.error ? `${t('nodes.error')}: ${p.error}` : ''
      ]
        .filter(Boolean)
        .join('\n')
      return { key, version: p.version, state, tone: pluginTone(state), detail }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

function pluginTone(state: string): Tone {
  const s = state.toLowerCase()
  if (s === 'running' || s === 'ready' || s === 'active' || s === 'serving' || s === 'healthy') return 'success'
  return statusTone(s)
}

function dotClass(tone: Tone) {
  switch (tone) {
    case 'success':
      return 'text-emerald-500'
    case 'warning':
      return 'text-amber-500'
    case 'danger':
      return 'text-red-500'
    default:
      return 'text-gray-400'
  }
}

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
const pluginIssues = computed(
  () => nodes.value.reduce((acc, n) => acc + pluginBadges(n).filter((p) => p.tone === 'danger' || p.tone === 'warning').length, 0)
)
const versions = computed(() => new Set(nodes.value.map((n) => n.host_version)).size)
</script>

<template>
  <div>
    <SPageHeader :title="t('nodes.title')" :description="t('nodes.description')">
      <template #actions>
        <span class="muted flex items-center gap-1.5 text-xs">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {{ t('nodes.autoRefresh') }}
          <template v-if="lastLoaded">· {{ relative(lastLoaded.toISOString()) }}</template>
        </span>
        <SButton size="sm" @click="load(true)"><SIcon name="refresh" class="h-4 w-4" />{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <SStatCard :label="t('nodes.online')" :value="`${healthy}/${nodes.length}`" icon="node" :tone="healthy < nodes.length ? 'warning' : 'success'" :loading="loading" />
      <SStatCard :label="t('nodes.pluginIssues')" :value="pluginIssues" icon="plugin" :tone="pluginIssues ? 'danger' : 'primary'" :loading="loading" />
      <SStatCard :label="t('nodes.hostVersions')" :value="versions" icon="cpu" :tone="versions > 1 ? 'warning' : 'primary'" :sub="versions > 1 ? t('nodes.mixedVersions') : undefined" :loading="loading" />
    </div>

    <STable :columns="columns" :rows="nodes" :loading="loading" row-key="node_id">
      <template #cell-node_id="{ row }">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 shrink-0 rounded-full" :class="isStale(row) ? 'bg-red-500' : 'bg-emerald-500'" />
          <span class="font-medium text-gray-900 dark:text-white">{{ row.node_id }}</span>
        </div>
        <div class="muted pl-4 font-mono text-xs" :title="row.boot_id">boot {{ String(row.boot_id || '').slice(0, 8) }}</div>
      </template>
      <template #cell-addr="{ row }">
        <code class="font-mono text-xs">{{ row.addr }}</code>
      </template>
      <template #cell-host_version="{ row }">
        <SBadge tone="gray">{{ row.host_version }}</SBadge>
      </template>
      <template #cell-started_at="{ row }">
        <span class="muted" :title="formatDateTime(row.started_at)">{{ relative(row.started_at) }}</span>
      </template>
      <template #cell-last_heartbeat="{ row }">
        <span :class="isStale(row) ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'" :title="formatDateTime(row.last_heartbeat)">
          {{ relative(row.last_heartbeat) }}
        </span>
        <SBadge v-if="isStale(row)" tone="danger" class="ml-2">{{ t('nodes.stale') }}</SBadge>
      </template>
      <template #cell-plugins="{ row }">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="p in pluginBadges(row)"
            :key="p.key"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-0.5 text-xs dark:border-dark-700"
            :title="p.detail"
          >
            <span class="font-medium">{{ p.key }}</span>
            <span v-if="p.version" class="muted font-mono">{{ p.version }}</span>
            <span :class="dotClass(p.tone)">●</span>
          </span>
          <span v-if="!pluginBadges(row).length" class="muted">—</span>
        </div>
      </template>
    </STable>
  </div>
</template>
