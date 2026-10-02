<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SCard, SHint } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { parseNodePlugin, statusTone } from '@/api/admin'
import type { NodeInfo } from '@/api/types'
import type { Release, ShellNode } from '@/api/observability'
const { t } = useI18n(), auth = useAuthStore()
const marker = useId().replace(/:/g, '')
const registered = ref<NodeInfo[]>([]), shells = ref<ShellNode[]>([]), releases = ref<Release[]>([])
const primary = ref(''), shellOK = ref(false), failed = ref(false), tick = ref(Date.now())
const offload = ref<{ enabled: boolean; cpu_threshold_percent: number } | null>(null)
let timer: ReturnType<typeof setInterval> | undefined, inflight = false, disposed = false
const fresh = (date?: string, seconds = 30) => !!date && tick.value - Date.parse(date) < seconds * 1000
async function load() {
  if (inflight) return
  inflight = true
  const results = await Promise.allSettled([
    auth.has('node:read') ? api.list<NodeInfo>('/nodes', { page_size: 200 }) : Promise.resolve(null),
    auth.has('system:update:read') ? api.get<{ nodes: ShellNode[]; primary_node: string }>('/system/upgrades') : Promise.resolve(null),
    auth.has('system:update:read') ? api.get<{ releases: Release[] }>('/system/releases') : Promise.resolve(null),
    auth.has('settings:read') ? api.get<{ enabled: boolean; cpu_threshold_percent: number }>('/system/offload') : Promise.resolve(null)
  ])
  if (!disposed) {
    tick.value = Date.now()
    const [n, s, r, o] = results
    failed.value = n.status === 'rejected' || s.status === 'rejected'
    if (n.status === 'fulfilled') registered.value = n.value?.items || []
    shellOK.value = s.status === 'fulfilled' && !!s.value
    if (s.status === 'fulfilled' && s.value) { shells.value = s.value.nodes || []; primary.value = s.value.primary_node }
    else if (s.status === 'fulfilled') { shells.value = []; primary.value = '' }
    if (r.status === 'fulfilled') releases.value = r.value?.releases || []
    offload.value = o.status === 'fulfilled' ? o.value : null
  }
  inflight = false
}
const cards = computed(() => {
  const ids = [...new Set([...registered.value.map(n => n.node_id), ...shells.value.map(n => n.node_id)])].sort()
  return ids.map((id, index) => {
    const shell = shells.value.find(n => n.node_id === id)
    const core = registered.value.filter(n => n.node_id === id && (!shell || n.boot_id === shell.core_boot_id)).sort((a,b) => Date.parse(b.last_heartbeat) - Date.parse(a.last_heartbeat))[0]
    const plugins = Object.entries(core?.plugins || {}).map(([key, raw]) => ({ key, ...parseNodePlugin(raw) })).sort((a,b) => a.key.localeCompare(b.key))
    return { id, index, shell, core, plugins, stale: !fresh(shell?.last_seen || core?.last_heartbeat), version: releases.value.find(r => r.digest === shell?.release_digest)?.manifest.release_id || core?.host_version || shell?.release_digest.slice(0,12) || '—' }
  })
})
const height = computed(() => 370 + Math.max(1, ...cards.value.map(n => n.plugins.length)) * 128)
const edges = computed(() => {
  if (!shellOK.value || failed.value) return []
  const result: Array<{ from: number; to: number; kind: string }> = []
  for (const from of cards.value) {
    const n = from.shell
    if (!n || from.stale || !n.enabled) continue
    for (const to of cards.value) {
      const target = to.shell
      if (!target || from.id === to.id || !fresh(target.last_seen, 20)) continue
      if (n.mode === 'forward' && to.id === primary.value) result.push({ from: from.index, to: to.index, kind: 'forwarding' })
      if (n.offloading && n.mode === 'local' && n.ready && offload.value?.enabled && target.enabled && target.ready && !target.stopped && target.mode === 'local' && !target.offloading && target.core_boot_id && target.route_revision && target.release_digest === n.release_digest && target.cpu_percent != null && target.cpu_percent < offload.value.cpu_threshold_percent - 10) result.push({ from: from.index, to: to.index, kind: 'offload' })
    }
  }
  return result
})
function path(from: number, to: number) {
  const x = from * 340 + 170, y = to * 340 + 170, top = 16 + Math.abs(to-from) * 9
  return `M ${x} 100 C ${x} ${top}, ${y} ${top}, ${y} 100`
}
onMounted(() => { void load(); timer = setInterval(() => { tick.value = Date.now(); if (document.visibilityState !== 'hidden') void load() }, 5000) })
onBeforeUnmount(() => { disposed = true; clearInterval(timer) })
</script>
<template>
  <SCard :title="t('observe.topology')" class="mb-5">
    <SHint v-if="failed" tone="warning">{{ t('observe.unavailable') }}</SHint>
    <SHint v-if="!shellOK && !shells.length">{{ t('observe.partial') }}</SHint>
    <SHint>{{ t('observe.legend') }}</SHint>
    <div v-if="cards.length" class="overflow-x-auto">
      <svg :width="cards.length * 340" :height="height" role="img" :aria-label="t('observe.topology')">
        <defs><marker :id="marker" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        <g v-for="edge in edges" :key="`${edge.from}-${edge.to}-${edge.kind}`" class="text-primary-500">
          <path :d="path(edge.from,edge.to)" fill="none" stroke="currentColor" stroke-width="2" :stroke-dasharray="edge.kind === 'offload' ? '7 5' : undefined" :marker-end="`url(#${marker})`"><title>{{ cards[edge.from]?.id }} → {{ cards[edge.to]?.id }} · {{ t(`observe.${edge.kind}`) }}</title></path>
        </g>
        <foreignObject v-for="card in cards" :key="card.id" :x="card.index * 340 + 8" y="100" width="324" :height="height - 100">
          <div class="rounded-2xl border-2 p-3 text-sm dark:bg-dark-900" :class="card.stale ? 'border-red-300 bg-red-50' : 'border-primary-200 bg-primary-50/40'">
            <div class="flex flex-wrap items-center gap-2"><strong>{{ card.id }}</strong><SBadge v-if="card.id === primary" tone="purple">{{ t('upgrades.primary') }}</SBadge><SBadge v-if="card.stale" tone="danger">{{ t('nodes.stale') }}</SBadge></div>
            <div v-if="card.shell" class="my-2 space-y-1">
              <div>{{ t('observe.shell') }} · {{ card.shell.mode }} · {{ t(!card.shell.enabled ? 'upgrades.disabled' : card.shell.ready ? 'upgrades.serving' : 'upgrades.waiting') }}</div>
              <div>CPU {{ card.shell.cpu_percent == null ? '—' : card.shell.cpu_percent.toFixed(1) + '%' }} <SBadge :tone="card.shell.offloading ? 'warning' : 'gray'">{{ t(card.shell.offloading ? 'observe.offloading' : 'observe.notOffloading') }}</SBadge></div>
              <SHint size="xs">{{ t('observe.boot') }}: {{ card.shell.shell_boot_id?.slice(0,8) || '—' }}</SHint>
            </div>
            <div class="mt-3 rounded-xl border border-sky-300 bg-white/80 p-3 dark:bg-dark-800">
              <strong>{{ t('observe.core') }} · {{ card.version }}</strong>
              <SBadge v-if="card.core && !fresh(card.core.last_heartbeat)" tone="warning">{{ t('nodes.stale') }}</SBadge>
              <div class="my-1 text-xs">{{ t(card.shell?.stopped ? 'observe.stopped' : card.core ? 'observe.running' : 'observe.unknown') }} · {{ (card.shell?.core_boot_id || card.core?.boot_id)?.slice(0,8) || '—' }}</div>
              <div class="mt-3 text-xs font-semibold text-gray-500">{{ t('observe.plugins') }}</div>
              <div v-for="plugin in card.plugins" :key="plugin.key" class="mt-2 rounded-lg border p-2" :class="plugin.fallback ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-gray-200 dark:border-dark-600'">
                <div class="flex items-center justify-between gap-1"><strong>{{ plugin.key }}</strong><SBadge :tone="statusTone(plugin.state)">{{ plugin.state || '—' }}</SBadge></div>
                <div class="font-mono text-xs">{{ plugin.serving || '—' }}<span v-if="plugin.standby"> → {{ plugin.standby }}</span></div>
                <div v-if="plugin.fallback" class="text-xs text-amber-700 dark:text-amber-300">{{ t('observe.fallback') }}: {{ plugin.fallback }}</div>
                <div class="text-xs text-gray-500">{{ t('observe.instances') }} {{ plugin.instances?.length || 0 }} · {{ t('observe.restarts') }} {{ plugin.instances?.reduce((sum, i) => sum + i.restarts, 0) || 0 }}</div>
                <div v-if="plugin.error" class="truncate text-xs text-red-500" :title="plugin.error">{{ plugin.error }}</div>
              </div>
              <SHint v-if="!card.plugins.length">{{ t('observe.noReport') }}</SHint>
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
    <SHint v-else>{{ t('observe.empty') }}</SHint>
  </SCard>
</template>
