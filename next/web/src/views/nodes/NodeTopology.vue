<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SHint } from '@sub2api/ui'
import type { NodeInfo } from '@/api/types'
import type { ShellNode } from '@/api/observability'
import type { NodePluginState } from '@/api/admin'

const props = defineProps<{
  cards: Array<{ id: string; index: number; shell?: ShellNode; core?: NodeInfo; plugins: Array<NodePluginState & { key: string }>; stale: boolean; coreStale: boolean; version: string }>
  edges: Array<{ from: number; to: number; kind: string }>
  primary: string
  uncertain: boolean
}>()
const { t } = useI18n()
const uid = useId().replace(/:/g, '')
const zoom = ref(1)
const width = computed(() => Math.max(1, props.cards.length) * 300 + 40)
const gatewayY = computed(() => 110 + Math.min(props.cards.length, 12) * 12)
const coreY = computed(() => gatewayY.value + 132)
const pluginY = computed(() => coreY.value + 112)
const height = computed(() => pluginY.value + Math.max(1, ...props.cards.map(c => c.plugins.length)) * 68 + 36)
const x = (i: number) => 40 + i * 300
function route(from: number, to: number, kind: string) {
  const a = x(from) + 120, b = x(to) + 120
  const y = gatewayY.value, top = y - 42 - Math.abs(to - from) * 16 - (kind === 'offload' ? 12 : 0)
  return `M ${a} ${y} C ${a} ${top}, ${b} ${top}, ${b} ${y}`
}
const gatewayState = (c: typeof props.cards[number]) => props.uncertain || c.stale ? t('observe.unknown') : !c.shell ? t('observe.unknown') : !c.shell.enabled ? t('upgrades.disabled') : `${c.shell.mode} · ${t(c.shell.ready ? 'upgrades.serving' : 'upgrades.waiting')}`
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-dark-300">
        <span class="flex items-center gap-2"><span class="h-px w-6 bg-slate-400" />{{ t('observe.contains') }}</span>
        <span class="flex items-center gap-2"><span class="h-0.5 w-6 bg-indigo-500" />{{ t('observe.forwarding') }} →</span>
        <span class="flex items-center gap-2"><span class="w-6 border-t-2 border-dashed border-amber-500" />{{ t('observe.offload') }} →</span>
      </div>
      <div class="flex items-center gap-2">
        <SButton size="sm" :disabled="zoom <= 0.6" :aria-label="t('observe.zoomOut')" @click="zoom = Math.max(0.6, +(zoom - 0.2).toFixed(1))">−</SButton>
        <span class="w-12 text-center text-xs tabular-nums">{{ Math.round(zoom * 100) }}%</span>
        <SButton size="sm" :disabled="zoom >= 1.6" :aria-label="t('observe.zoomIn')" @click="zoom = Math.min(1.6, +(zoom + 0.2).toFixed(1))">+</SButton>
        <SButton size="sm" @click="zoom = 1">{{ t('observe.resetView') }}</SButton>
      </div>
    </div>
    <div class="graph-scroll overflow-auto rounded-xl border border-gray-200 dark:border-dark-600" tabindex="0" :aria-label="t('observe.topologyView')">
      <svg :width="width * zoom" :height="height * zoom" :viewBox="`0 0 ${width} ${height}`" role="img" :aria-labelledby="`${uid}-title ${uid}-desc`" class="topology-svg">
        <title :id="`${uid}-title`">{{ t('observe.topology') }}</title>
        <desc :id="`${uid}-desc`">{{ t('observe.topologyHint') }} {{ t('observe.graphLegend') }}</desc>
        <defs>
          <pattern :id="`${uid}-grid`" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.12" /></pattern>
          <marker v-for="kind in ['forwarding', 'offload']" :id="`${uid}-${kind}`" :key="kind" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10Z" :fill="kind === 'forwarding' ? '#6366f1' : '#f59e0b'" /></marker>
        </defs>
        <rect width="100%" height="100%" :fill="`url(#${uid}-grid)`" />
        <g v-for="card in cards" :key="card.id">
          <rect :x="x(card.index) - 16" y="20" width="272" :height="height - 40" rx="18" class="node-boundary" />
          <text :x="x(card.index)" y="48" class="node-name">{{ card.id.length > 24 ? card.id.slice(0, 22) + '…' : card.id }}<title>{{ card.id }}</title></text>
          <text :x="x(card.index)" y="70" class="caption" :class="{ primary: card.id === primary }">{{ card.id === primary ? t('upgrades.primary') : t('observe.clusterNode') }}</text>
        </g>
        <g v-for="edge in edges" :key="`${edge.from}-${edge.to}-${edge.kind}`">
          <path :d="route(edge.from, edge.to, edge.kind)" fill="none" :stroke="edge.kind === 'forwarding' ? '#6366f1' : '#f59e0b'" stroke-width="2.5" :stroke-dasharray="edge.kind === 'offload' ? '7 5' : undefined" :marker-end="`url(#${uid}-${edge.kind})`"><title>{{ cards[edge.from]?.id }} → {{ cards[edge.to]?.id }} · {{ t(`observe.${edge.kind}`) }}</title></path>
        </g>
        <g v-for="card in cards" :key="`components-${card.id}`">
          <!-- Ownership links are always visible and do not imply live traffic. -->
          <path v-if="card.shell && card.core" :d="`M ${x(card.index)+120} ${gatewayY+84} V ${coreY}`" class="ownership" />
          <path v-if="card.plugins.length" :d="`M ${x(card.index)+120} ${coreY+70} V ${coreY+90} H ${x(card.index)+12} V ${pluginY+(card.plugins.length-1)*68+25}`" class="ownership" />
          <g :transform="`translate(${x(card.index)}, ${gatewayY})`">
            <rect width="240" height="84" rx="12" class="gateway-box" :class="{ inactive: uncertain || card.stale || !card.shell?.enabled }" />
            <circle cx="18" cy="22" r="4" :fill="uncertain || card.stale || !card.shell?.ready ? '#94a3b8' : '#10b981'" />
            <text x="30" y="27" class="component-name">{{ t('observe.gateway') }}</text>
            <text x="14" y="48" class="caption">{{ gatewayState(card) }}</text>
            <text x="14" y="68" class="caption">CPU {{ uncertain || card.stale || card.shell?.cpu_percent == null ? '—' : card.shell.cpu_percent.toFixed(1) + '%' }} · {{ t(card.shell?.offloading ? 'observe.offloading' : 'observe.notOffloading') }}</text>
          </g>
          <g :transform="`translate(${x(card.index)}, ${coreY})`">
            <rect width="240" height="70" rx="12" class="core-box" :class="{ inactive: !card.core || card.shell?.stopped || card.coreStale || uncertain }" />
            <text x="14" y="27" class="component-name">{{ t('observe.core') }} · {{ card.version.length > 20 ? card.version.slice(0,18) + '…' : card.version }}<title>{{ card.version }}</title></text>
            <text x="14" y="49" class="caption">{{ t(card.shell?.stopped ? 'observe.stopped' : card.core && !card.coreStale && !uncertain ? 'observe.running' : 'observe.unknown') }}</text>
          </g>
          <g v-for="(plugin, i) in card.plugins" :key="plugin.key" :transform="`translate(${x(card.index)+32}, ${pluginY+i*68})`">
            <path d="M -20 25 H 0" class="ownership" />
            <rect width="208" height="52" rx="10" class="plugin-box" :class="{ problem: plugin.fallback || plugin.error }" />
            <text x="12" y="21" class="plugin-name">{{ plugin.key.length > 18 ? plugin.key.slice(0,16) + '…' : plugin.key }}</text>
            <text x="12" y="40" class="caption">{{ (plugin.serving || '—').slice(0,18) }} · {{ plugin.fallback ? t('observe.fallback') : plugin.state || t('observe.unknown') }}</text>
            <title>{{ plugin.key }} · {{ plugin.serving || '—' }} · {{ plugin.state }}{{ plugin.fallback ? ` · ${t('observe.fallback')}: ${plugin.fallback}` : '' }}{{ plugin.error ? ` · ${plugin.error}` : '' }}</title>
          </g>
          <text v-if="!card.plugins.length" :x="x(card.index)+12" :y="pluginY+25" class="caption">{{ t('observe.noReport') }}</text>
        </g>
      </svg>
    </div>
    <SHint size="xs">{{ t('observe.graphLegend') }} {{ !edges.length && !uncertain ? t('observe.noCrossLinks') : '' }}</SHint>
  </div>
</template>

<style scoped>
.graph-scroll { max-height: 760px; background: #f8fafc; }
.topology-svg { display: block; color: #64748b; font-family: inherit; }
.node-boundary { fill: #ffffffb8; stroke: #cbd5e1; stroke-dasharray: 5 5; }
.node-name, .component-name, .plugin-name { fill: #0f172a; font-weight: 600; font-size: 14px; }
.plugin-name { font-size: 13px; }
.caption { fill: #64748b; font-size: 11px; }
.primary { fill: #8b5cf6; }
.ownership { fill: none; stroke: #94a3b8; stroke-width: 1.5; }
.gateway-box { fill: #ecfdf5; stroke: #34d399; stroke-width: 1.5; }
.core-box { fill: #eff6ff; stroke: #60a5fa; stroke-width: 1.5; }
.plugin-box { fill: #fff; stroke: #cbd5e1; }
.inactive { stroke: #94a3b8; stroke-dasharray: 4 3; }
.problem { fill: #fffbeb; stroke: #f59e0b; }
:global(.dark) .graph-scroll { background: #0f172a; }
:global(.dark) .node-boundary { fill: #1e293bb8; stroke: #475569; }
:global(.dark) .node-name, :global(.dark) .component-name, :global(.dark) .plugin-name { fill: #e2e8f0; }
:global(.dark) .caption { fill: #94a3b8; }
:global(.dark) .gateway-box { fill: #064e3b; }
:global(.dark) .core-box { fill: #172554; }
:global(.dark) .plugin-box { fill: #1e293b; stroke: #475569; }
:global(.dark) .problem { fill: #451a03; stroke: #f59e0b; }
</style>
