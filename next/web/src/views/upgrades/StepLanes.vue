<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
const props = defineProps<{ steps: Array<{ step_id: number; node_id: string; action: string; status: string; error?: string }>; events: Array<{ id: number; kind: string; message: string; created_at: string }>; cursor: number }>()
const { t, te } = useI18n()
const progress = computed(() => props.steps.length ? Math.min(100, Math.max(0, Math.round(props.cursor / props.steps.length * 100))) : 0)
const lanes = computed(() => [...new Set(props.steps.map(s => s.node_id))].map(node => ({ node, steps: props.steps.filter(s => s.node_id === node) })))
function label(group: string, value: string) { const key = `upgrades.${group}.${value}`; return te(key) ? t(key) : value }
function duration(step: typeof props.steps[number]) {
  const message = `${step.node_id}: ${step.action}`
  const events = props.events.filter(e => e.message.trim() === message).slice().sort((a,b) => a.id-b.id)
  // On retries use the last start preceding the last completion. A missing
  // start/end is shown as unknown rather than inventing a duration.
  const end = events.filter(e => e.kind === 'done').at(-1)
  const start = events.filter(e => e.kind === 'step' && (!end || e.id < end.id)).at(-1)
  return end && start ? t('observe.seconds', { n: Math.max(0,(Date.parse(end.created_at)-Date.parse(start.created_at))/1000).toFixed(1) }) : t('observe.unknownDuration')
}
</script>
<template>
  <div class="space-y-4">
    <div><div class="mb-2 flex justify-between text-sm"><strong>{{ t('observe.progress') }}</strong><span>{{ progress }}% · {{ cursor }}/{{ steps.length }}</span></div><div role="progressbar" :aria-label="t('observe.progress')" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" class="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700"><div class="h-full rounded-full bg-primary-500 transition-all" :style="{ width: `${progress}%` }" /></div></div>
    <div class="space-y-3 overflow-x-auto">
      <div v-for="lane in lanes" :key="lane.node" class="flex min-w-max items-stretch gap-2">
        <strong class="w-28 shrink-0 self-center truncate text-sm" :title="lane.node">{{ lane.node }}</strong>
        <div v-for="step in lane.steps" :key="step.step_id" class="w-40 shrink-0 rounded-lg border p-3 text-xs" :class="step.status === 'done' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' : step.status === 'failed' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : step.status === 'running' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-gray-200 dark:border-dark-700'" :title="step.error">
          <div class="mb-2 font-semibold">{{ label('actions', step.action) }}</div><SBadge :tone="step.status === 'done' ? 'success' : step.status === 'failed' ? 'danger' : step.status === 'running' ? 'warning' : 'gray'">{{ label('states',step.status) }}</SBadge><div class="mt-2 text-gray-500">{{ duration(step) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
