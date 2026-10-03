<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueFlow, MarkerType, useVueFlow, type Node, type Edge, type NodeMouseEvent, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls, ControlButton } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force'
import { SButton, SHint } from '@sub2api/ui'
import type { NodeInfo } from '@/api/types'
import type { ShellNode } from '@/api/observability'
import type { NodePluginState } from '@/api/admin'
import TopologyCircle from './TopologyCircle.vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

type Card = { id: string; index: number; shell?: ShellNode; core?: NodeInfo; plugins: Array<NodePluginState & { key: string }>; stale: boolean; coreStale: boolean; version: string }
type CircleData = { label: string; subtitle: string; kind: string; size: number; color: string; dim: boolean; inactive: boolean; cluster: string; role: 'primary' | 'follower' | ''; roleLabel: string; visitLabel: string; details: Array<{ label: string; value: string }> }
type CircleNode = Node<CircleData> & { data: CircleData }
const props = defineProps<{ cards: Card[]; edges: Array<{ from: string; to: string; kind: string }>; primary: string; uncertain: boolean; visit?: { entry: string; core: string; boot: string } | null }>()
const { t } = useI18n()
const flowID = `topology-${useId()}`
const { fitView, zoomIn, zoomOut } = useVueFlow({ id: flowID })
const nodes = shallowRef<CircleNode[]>([]), links = shallowRef<Edge[]>([])
const selectedID = ref('')
const overview = ref(false)
const knownPrimary = computed(() => !props.uncertain && props.primary && props.cards.some(c => c.id === props.primary && c.shell?.node_id === c.id) ? props.primary : '')
const followerCount = computed(() => knownPrimary.value ? props.cards.filter(c => c.shell && c.id !== knownPrimary.value).length : 0)
const pinned = new Set<string>()
let structure = '', initialized = false
const idFor = (host: string, kind: string, plugin = '') => JSON.stringify([host, kind, plugin])
const chosen = computed(() => nodes.value.find(n => n.id === selectedID.value))
const adjacent = computed(() => {
  const ids = new Set<string>(selectedID.value ? [selectedID.value] : [])
  for (const e of links.value) if (e.source === selectedID.value || e.target === selectedID.value) { ids.add(e.source); ids.add(e.target) }
  return ids
})
const visibleNodes = computed(() => nodes.value.map(n => ({ ...n, selected: n.id === selectedID.value, data: { ...n.data, dim: !!selectedID.value && !adjacent.value.has(n.id) } })))
const visibleEdges = computed(() => links.value.map(e => ({ ...e, style: { ...e.style, opacity: selectedID.value && e.source !== selectedID.value && e.target !== selectedID.value ? 0.12 : 0.8 } })))

function refresh() {
  const old = new Map(nodes.value.map(n => [n.id, n]))
  const nextNodes: CircleNode[] = [], nextEdges: Edge[] = []
  const add = (card: Card, kind: string, label: string, subtitle: string, size: number, color: string, inactive: boolean, details: CircleData['details'], plugin = '') => {
    const id = idFor(card.id, kind, plugin)
    const role = kind === 'gateway' && knownPrimary.value ? card.id === knownPrimary.value ? 'primary' : 'follower' : ''
    const visitLabel = kind === 'gateway' && card.id === props.visit?.entry ? t('observe.currentEntry') : kind === 'core' && card.id === props.visit?.core && !!props.visit.boot && card.core?.boot_id === props.visit.boot ? t('observe.responseCore') : ''
    if (visitLabel) details.unshift({ label: t('observe.visitIdentity'), value: visitLabel })
    nextNodes.push({ id, type: 'circle', position: old.get(id)?.position || { x: 0, y: 0 }, data: { label, subtitle, kind, size, color, inactive, dim: false, cluster: card.id, role, roleLabel: role ? t(`observe.${role}Role`) : '', visitLabel, details }, draggable: true, connectable: false })
    return id
  }
  const internal = (source: string, target: string) => nextEdges.push({ id: JSON.stringify([source,target,'owns']), source, target, type: 'straight', selectable: false, style: { stroke: '#94a3b8', strokeWidth: 1.4 } })
  for (const c of props.cards) {
    const unknown = props.uncertain || c.stale
    const main = c.id === knownPrimary.value
    const gateway = c.shell ? add(c, 'gateway', c.id, t('observe.gateway'), main ? 132 : 106, main ? '#8b5cf6' : '#10b981', unknown || !c.shell.enabled, [
      { label: t('observe.upgradeRole'), value: knownPrimary.value ? t(main ? 'observe.primaryRole' : 'observe.followerRole') : t('observe.unknown') },
      { label: t('observe.gateway'), value: unknown ? t('observe.unknown') : `${c.shell.mode} · ${t(c.shell.ready ? 'upgrades.serving' : 'upgrades.waiting')}` },
      { label: 'CPU', value: unknown || c.shell.cpu_percent == null ? '—' : c.shell.cpu_percent.toFixed(1)+'%' },
      { label: t('observe.offloadState'), value: unknown ? t('observe.unknown') : t(c.shell.offloading ? 'observe.offloading' : 'observe.notOffloading') },
      { label: t('observe.boot'), value: c.shell.shell_boot_id || '—' }
    ]) : ''
    const core = add(c, 'core', t('observe.core'), c.version, 78, '#6366f1', props.uncertain || !c.core || c.coreStale || !!c.shell?.stopped, [
      { label: t('upgrades.version'), value: c.version },
      { label: t('upgrades.status'), value: t(c.shell?.stopped ? 'observe.stopped' : c.core && !c.coreStale && !props.uncertain ? 'observe.running' : 'observe.unknown') },
      { label: t('observe.boot'), value: c.core?.boot_id || '—' },
      { label: t('observe.address'), value: c.core?.addr || '—' }
    ])
    if (gateway) internal(gateway, core)
    for (const p of c.plugins) {
      const plugin = add(c, 'plugin', p.key, p.serving || '—', 56, p.fallback || p.error ? '#f59e0b' : '#38bdf8', props.uncertain || c.coreStale || !c.core || !!c.shell?.stopped, [
        { label: t('upgrades.version'), value: p.serving || '—' },
        { label: t('upgrades.status'), value: p.state || t('observe.unknown') },
        { label: t('observe.fallback'), value: p.fallback || '—' },
        { label: t('observe.standby'), value: p.standby || '—' },
        { label: t('upgrades.reason'), value: p.error || '—' }
      ], p.key)
      internal(core, plugin)
    }
  }
  const valid = new Set(nextNodes.map(n => n.id))
  if (knownPrimary.value) {
    const source = idFor(knownPrimary.value, 'gateway')
    for (const c of props.cards) {
      const target = idFor(c.id, 'gateway')
      if (source === target || !valid.has(target)) continue
      nextEdges.push({ id: JSON.stringify([source,target,'coordination']), source, target, type: 'default', label: t('observe.coordination'), selectable: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#887498' }, style: { stroke: '#887498', strokeWidth: 2, strokeDasharray: '3 7' },
        labelStyle: { fill: '#887498', fontSize: 14 }, labelBgStyle: { fill: 'var(--topology-label-bg)' } })
    }
  }
  for (const e of props.edges) {
    const source = idFor(e.from, 'gateway'), target = idFor(e.to, 'gateway')
    if (!valid.has(source) || !valid.has(target)) continue
    const color = e.kind === 'offload' ? '#f59e0b' : '#8b5cf6'
    nextEdges.push({ id: JSON.stringify([source,target,e.kind]), source, target, type: 'smoothstep', label: t(`observe.${e.kind}`), selectable: false,
      markerEnd: { type: MarkerType.ArrowClosed, color }, style: { stroke: color, strokeWidth: 2.5, strokeDasharray: e.kind === 'offload' ? '7 5' : undefined }, labelStyle: { fill: color, fontSize: 11 }, labelBgStyle: { fill: 'var(--topology-label-bg)' } })
  }
  nodes.value = nextNodes; links.value = nextEdges
  if (selectedID.value && !valid.has(selectedID.value)) selectedID.value = ''
  for (const id of pinned) if (!valid.has(id)) pinned.delete(id)
  const signature = knownPrimary.value + '|' + [...valid].sort().join('|')
  if (signature !== structure) { structure = signature; layout(false) }
}

interface Particle extends SimulationNodeDatum { id: string; cluster: string; radius: number; kind: string }
function layout(reset = true) {
  if (reset) pinned.clear()
  const clusters = [...new Set(nodes.value.map(n => n.data.cluster))].sort()
  const columns = Math.ceil(Math.sqrt(clusters.length))
  const followers = clusters.filter(id => id !== knownPrimary.value)
  const centers = new Map(clusters.map((id,i) => {
    if (!knownPrimary.value) return [id,{x:(i%columns)*430,y:Math.floor(i/columns)*400}] as const
    if (id === knownPrimary.value) return [id,{x:0,y:0}] as const
    const angle = -Math.PI/2 + followers.indexOf(id)*2*Math.PI/followers.length
    const radius = Math.max(420,followers.length*105)
    return [id,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius*0.86}] as const
  }))
  const particles: Particle[] = nodes.value.map(n => {
    const center = centers.get(n.data.cluster)!
    const prior = initialized && !reset
    return { id:n.id,cluster:n.data.cluster,kind:n.data.kind,radius:n.data.size/2+30,
      x:prior ? n.position.x+n.data.size/2 : center.x+(n.data.kind==='gateway' ? -90 : n.data.kind==='core' ? 25 : 80),
      y:prior ? n.position.y+n.data.size/2 : center.y,
      ...(pinned.has(n.id) ? {fx:n.position.x+n.data.size/2,fy:n.position.y+n.data.size/2} : n.data.role === 'primary' ? {fx:0,fy:0} : {}) }
  })
  const connections: SimulationLinkDatum<Particle>[] = links.value.map(e=>({source:e.source,target:e.target}))
  const simulation = forceSimulation(particles)
    .force('charge',forceManyBody().strength(-650))
    .force('link',forceLink<Particle,SimulationLinkDatum<Particle>>(connections).id(n=>n.id).distance(l => {
      const a=l.source as Particle,b=l.target as Particle
      return a.cluster===b.cluster ? a.kind==='gateway' ? 165 : 126 : 350
    }).strength(l=>(l.source as Particle).cluster===(l.target as Particle).cluster ? 0.8 : 0.06))
    .force('collision',forceCollide<Particle>().radius(n=>n.radius).iterations(3))
    .force('x',forceX<Particle>(n=>centers.get(n.cluster)!.x).strength(0.13))
    .force('y',forceY<Particle>(n=>centers.get(n.cluster)!.y).strength(0.13))
    .stop()
  simulation.tick(220)
  const positions=new Map(particles.map(n=>[n.id,n]))
  nodes.value=nodes.value.map(n=>{const p=positions.get(n.id)!;return {...n,position:{x:(p.x||0)-n.data.size/2,y:(p.y||0)-n.data.size/2}}})
  if (!initialized || reset) void nextTick(()=>fitView({padding:0.15,duration:250}))
  initialized=true
}
function dragged(event: NodeDragEvent) {
  for (const moved of event.nodes) {
    const current=nodes.value.find(n=>n.id===moved.id)
    if (current) current.position={...moved.position}
    pinned.add(moved.id)
  }
  nodes.value = [...nodes.value]
}
function select(event: NodeMouseEvent) { selectedID.value=event.node.id }
let firstDimensions = true
function firstFit() { if (firstDimensions) { firstDimensions=false; void fitView({padding:0.15}) } }
watch(()=>[props.cards,props.edges,props.primary,props.uncertain,props.visit,t('observe.core')],refresh,{deep:true,immediate:true})
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-violet-50 px-3 py-2 text-sm dark:bg-violet-950/30">
      <template v-if="knownPrimary"><span class="font-semibold text-violet-700 dark:text-violet-300">★ {{ t('observe.primarySummary', { node: knownPrimary }) }}</span><span class="text-gray-600 dark:text-gray-300">{{ t('observe.followerSummary', { count: followerCount }) }}</span></template>
      <span v-else class="text-gray-500 dark:text-gray-400">{{ t('observe.primaryUnknown') }}</span>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-dark-300">
        <span v-if="knownPrimary"><i class="legend-dot bg-violet-500" />{{ t('observe.primaryRole') }}</span><span><i class="legend-dot bg-emerald-500" />{{ knownPrimary ? t('observe.followerRole') : t('observe.gateway') }}</span><span><i class="legend-dot bg-indigo-500" />{{ t('observe.core') }}</span><span><i class="legend-dot bg-sky-400" />{{ t('observe.plugins') }}</span>
      </div>
      <div class="flex flex-wrap gap-2"><SButton size="sm" :aria-pressed="overview" @click="overview = !overview">{{ t(overview ? 'observe.hideOverview' : 'observe.showOverview') }}</SButton><SButton size="sm" @click="layout(true)">{{ t('observe.relayout') }}</SButton><SButton size="sm" @click="fitView({padding:0.15,duration:250})">{{ t('observe.fitView') }}</SButton></div>
    </div>
    <div class="topology-canvas relative overflow-hidden rounded-xl border border-gray-200 dark:border-dark-600" :aria-label="t('observe.topologyView')">
      <VueFlow :id="flowID" :nodes="visibleNodes" :edges="visibleEdges" :min-zoom="0.15" :max-zoom="3" :nodes-connectable="false" :edges-updatable="false" :delete-key-code="null" :zoom-on-scroll="true" :pan-on-drag="true" :select-nodes-on-drag="false" @node-click="select" @node-drag="dragged" @node-drag-stop="dragged" @pane-click="selectedID = ''" @nodes-initialized="firstFit">
        <template #node-circle="node"><TopologyCircle :data="node.data" :selected="node.selected" /></template>
        <Background pattern-color="#94a3b8" :gap="24" :size="1" />
        <Controls :show-interactive="false" position="bottom-left">
          <template #control-zoom-in><ControlButton :title="t('observe.zoomIn')" :aria-label="t('observe.zoomIn')" @click="zoomIn()">＋</ControlButton></template>
          <template #control-zoom-out><ControlButton :title="t('observe.zoomOut')" :aria-label="t('observe.zoomOut')" @click="zoomOut()">−</ControlButton></template>
          <template #control-fit-view><ControlButton :title="t('observe.fitView')" :aria-label="t('observe.fitView')" @click="fitView({padding:0.15,duration:250})">⤢</ControlButton></template>
        </Controls>
        <MiniMap v-if="overview" :node-color="n => n.data.color" :node-stroke-color="n => n.data.color" :node-border-radius="100" pannable zoomable position="bottom-right" />
      </VueFlow>
      <aside v-if="chosen" class="absolute right-3 top-3 z-10 max-h-[340px] w-64 max-w-[calc(100%-24px)] overflow-auto rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-dark-600 dark:bg-dark-900/95">
        <div class="mb-3 flex items-start justify-between gap-2"><div><div class="break-all text-sm font-semibold">{{ chosen.data.label }}</div><div class="mt-1 break-all text-xs text-gray-500">{{ chosen.data.cluster }} · {{ t(`observe.${chosen.data.kind === 'plugin' ? 'plugins' : chosen.data.kind}`) }}</div></div><button type="button" :aria-label="t('observe.closeDetails')" @click="selectedID=''">×</button></div>
        <dl class="space-y-2"><div v-for="(detail,i) in chosen.data.details" :key="i"><dt class="text-[11px] text-gray-500">{{ detail.label }}</dt><dd class="break-all text-xs">{{ detail.value }}</dd></div></dl>
      </aside>
    </div>
    <SHint size="xs">{{ t('observe.visitHint') }} {{ t('observe.canvasHelp') }} {{ t('observe.graphLegend') }} {{ knownPrimary ? t('observe.coordinationHint') : t('observe.primaryUnknown') }} {{ !edges.length && !uncertain ? t('observe.noCrossLinks') : '' }}</SHint>
  </div>
</template>

<style scoped>
.topology-canvas { height: 640px; background: #f8fafc; --topology-label-bg: #fff; }
.legend-dot { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 100%; }
:global(.dark) .topology-canvas { background: #111827; --topology-label-bg: #172033; }
.topology-canvas :deep(.vue-flow__node-circle) { border: 0; background: transparent; }
.topology-canvas :deep(.vue-flow__minimap) { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
:global(.dark) .topology-canvas :deep(.vue-flow__minimap) { background: #1e293b; border-color: #475569; }
:global(.dark) .topology-canvas :deep(.vue-flow__controls-button) { background: #1e293b; border-color: #475569; fill: #e2e8f0; }
@media(max-width:640px) { .topology-canvas { height: 560px; } .topology-canvas :deep(.vue-flow__minimap) { width: 120px; height: 80px; } }
</style>
