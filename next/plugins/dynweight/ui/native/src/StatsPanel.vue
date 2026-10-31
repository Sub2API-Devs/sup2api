<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SDescriptions, SDisclosure } from '@sub2api/ui'
import { errorMessage, fetchStats, useDwHost, type RuntimeStats } from './host'

// This node's runtime counters (GET /stats), loaded when opened: the node
// and its start, evaluate runs and their outcomes, flushes, dropped samples
// and the event log.
const host = useDwHost()
const t = host.t
const stats = ref<RuntimeStats | null>(null)
const error = ref('')
const open = ref(false)

async function reload() {
  if (!open.value) return
  try {
    stats.value = await fetchStats()
    error.value = ''
  } catch (e) {
    error.value = errorMessage(e, t('stats.loadFailed'))
  }
}
defineExpose({ reload })

function toggle(v: boolean) {
  open.value = v
  reload()
}

const SHOWN = [
  'degraded_keys', 'pending_keys', 'config_version', 'runs_total', 'run_failures_total', 'last_run_ms', 'last_run_at',
  'evaluations_total', 'applied_total', 'skipped_total', 'lost_total', 'base_resets_total', 'key_failures_total', 'changed_total',
  'resets_total', 'observed_total', 'dropped_samples_total', 'flushes_total', 'flush_failures_total', 'flushed_keys_total',
  'flushed_samples_total', 'events_logged_total', 'events_log_dropped_total', 'sticky_clears_total', 'sticky_clear_failures_total'
]

const items = computed(() => {
  const s = stats.value
  if (!s) return []
  const time = (k: string) => (s[k] ? host.i18n.formatDateTime(Number(s[k]) * 1000) : '—')
  const value = (k: string) => (k === 'last_run_at' ? time(k) : host.i18n.formatNumber(Number(s[k] ?? 0)))
  const runs = Number(s.runs_total ?? 0)
  return [
    { key: 'node_id', label: t('stats.node_id'), value: String(s.node_id ?? '—') },
    { key: 'started_at', label: t('stats.started_at'), value: time('started_at') },
    { key: 'enabled', label: t('stats.enabled'), value: t(s.enabled ? 'stats.on' : 'stats.off') },
    ...SHOWN.map((k) => ({ key: k, label: t(`stats.${k}`), value: value(k) })),
    { key: 'avg', label: t('stats.avg_run_ms'), value: runs ? host.i18n.formatNumber(Number(s.run_busy_us_total) / runs / 1000, 1) : '—' }
  ]
})
</script>

<template>
  <SDisclosure variant="section" :label="t('stats.title')" :description="t('stats.hint')" :open="open" @update:open="toggle">
    <template #actions>
      <SButton v-if="open" size="sm" variant="ghost" icon="refresh" icon-only :aria-label="t('refresh')" @click="reload" />
    </template>
    <p v-if="error" class="dw-sub">{{ error }}</p>
    <SDescriptions :items="items" :columns="3" dense />
  </SDisclosure>
</template>
