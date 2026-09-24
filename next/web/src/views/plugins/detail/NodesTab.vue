<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, STable, type TableColumn } from '@sub2api/ui'
import { formatBytes, formatDateTime, formatRelative } from '@/utils/format'
import { display, pick, type PluginDetail, type PluginNode } from '../pluginUtil'
import StatusBadge from '../parts/StatusBadge.vue'

// Per-node runtime state. The state object is owned by the runtime (C2);
// well-known fields are pulled out, everything is available as JSON.
const props = defineProps<{ detail: PluginDetail }>()
const { t } = useI18n()

const columns = computed<TableColumn[]>(() => [
  { key: 'node_id', label: t('plugins.nodes.node') },
  { key: 'status', label: t('common.status') },
  { key: 'version', label: t('common.version') },
  { key: 'memory', label: t('plugins.resources.memory') },
  { key: 'cpu', label: t('plugins.resources.cpu') },
  { key: 'threads', label: t('plugins.resources.threads') },
  { key: 'restarts', label: t('plugins.nodes.restarts') },
  { key: 'heartbeat', label: t('plugins.nodes.heartbeat') }
])

const rows = computed(() => props.detail.nodes || [])

function st(n: PluginNode): Record<string, any> {
  return n.state && typeof n.state === 'object' ? n.state : {}
}

function status(n: PluginNode): string {
  if (typeof n.state === 'string') return n.state
  return String(pick(st(n), 'status', 'state', 'phase') ?? '—')
}

function memory(n: PluginNode): string {
  const s = st(n)
  const mb = pick<number>(s, 'memory_mb', 'rss_mb', 'memoryMB')
  const bytes = pick<number>(s, 'rss_bytes', 'memory_bytes', 'rss', 'memory')
  const limit = pick<number>(s, 'memory_limit_mb', 'limit_mb', 'memory_limit')
  const used = mb !== undefined ? `${Math.round(Number(mb))}MB` : bytes !== undefined ? formatBytes(Number(bytes)) : ''
  if (!used) return '—'
  return limit !== undefined ? `${used} / ${limit}MB` : used
}

function cpu(n: PluginNode): string {
  const v = pick<number>(st(n), 'cpu_percent', 'cpu_pct', 'cpu')
  if (v === undefined) return '—'
  return `${Number(v).toFixed(Number(v) < 10 ? 1 : 0)}%`
}

function restarts(n: PluginNode): string {
  const v = pick(st(n), 'restarts', 'restart_count')
  return v === undefined ? '—' : String(v)
}

function restartReason(n: PluginNode): string {
  return String(pick(st(n), 'restart_reason', 'last_restart_reason', 'last_exit', 'error') ?? '')
}
</script>

<template>
  <SCard :padded="false">
    <STable :columns="columns" :rows="rows" row-key="node_id" expandable>
      <template #cell-node_id="{ row }">
        <div class="font-medium">{{ row.node_id }}</div>
        <div class="font-mono text-xs muted">{{ row.addr || '' }}<span v-if="row.boot_id"> · {{ String(row.boot_id).slice(0, 8) }}</span></div>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="status(row)" />
        <div v-if="restartReason(row)" class="mt-0.5 max-w-[14rem] truncate text-xs text-red-500" :title="restartReason(row)">{{ restartReason(row) }}</div>
      </template>
      <template #cell-version="{ row }">
        <span class="font-mono text-sm">{{ display(pick(st(row), 'version', 'active_version')) }}</span>
      </template>
      <template #cell-memory="{ row }">{{ memory(row) }}</template>
      <template #cell-cpu="{ row }">{{ cpu(row) }}</template>
      <template #cell-threads="{ row }">{{ display(pick(st(row), 'threads', 'num_threads')) }}</template>
      <template #cell-restarts="{ row }">{{ restarts(row) }}</template>
      <template #cell-heartbeat="{ row }">
        <span class="whitespace-nowrap text-xs" :title="formatDateTime(row.last_heartbeat)">{{ formatRelative(row.last_heartbeat, t) }}</span>
      </template>
      <template #expand="{ row }">
        <pre class="code-block">{{ JSON.stringify(row.state ?? null, null, 2) }}</pre>
      </template>
    </STable>
  </SCard>
</template>
