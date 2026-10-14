<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SProgress } from '@sub2api/ui'
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
    <SProgress :value="progress" size="md" show-value :label="`${t('observe.progress')} · ${cursor}/${steps.length}`" data-testid="upgrade-progress" />
    <div class="space-y-3 overflow-x-auto">
      <div v-for="lane in lanes" :key="lane.node" class="flex min-w-max items-stretch gap-2">
        <strong class="w-28 shrink-0 self-center truncate text-sm" :title="lane.node">{{ lane.node }}</strong>
        <div v-for="step in lane.steps" :key="step.step_id" class="w-40 shrink-0 rounded-lg border p-3 text-xs" :class="step.status === 'done' ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : step.status === 'failed' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20' : step.status === 'running' ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20' : 'border-line'" :title="step.error">
          <div class="mb-2 font-semibold">{{ label('actions', step.action) }}</div><SBadge :tone="step.status === 'done' ? 'success' : step.status === 'failed' ? 'danger' : step.status === 'running' ? 'warning' : 'gray'">{{ label('states',step.status) }}</SBadge><div class="mt-2 text-fg-muted">{{ duration(step) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
