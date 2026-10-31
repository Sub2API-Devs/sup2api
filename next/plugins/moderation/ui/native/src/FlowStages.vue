<script setup lang="ts">
import { SBadge } from '@sub2api/ui'
import { enumLabel } from './format'
import { useModHost } from './host'
import type { FlowVersionAuditor, FlowVersionStage } from './types'

// Stages of a flow version: combine mode and auditors; `detailed` adds each
// auditor's channel, model and parameters as they ran (flow snapshot).
defineProps<{ stages: FlowVersionStage[]; detailed?: boolean }>()
const t = useModHost().t

function params(a: FlowVersionAuditor): string {
  const parts = [a.channel_name, a.model].filter(Boolean) as string[]
  const th = Object.keys(a.thresholds || {}).length
  if (th) parts.push(t('auditors.overrides', { n: th }))
  if (a.questions?.items?.length) parts.push(t('auditors.questions', { n: a.questions.items.length }))
  if (a.categories?.length) parts.push(t('snapshot.categories', { n: a.categories.length }))
  return parts.join(' · ')
}
</script>

<template>
  <div v-for="s in stages" :key="s.stage" class="mod-version-stage">
    <strong>{{ t('trace.stageN', { n: s.stage }) }}</strong>
    <span v-if="s.combine && s.auditors.length > 1" class="mod-sub">{{ enumLabel('combine', s.combine) }}<template v-if="s.combine === 'at_least'"> {{ s.n }}</template></span>
    <span v-for="a in s.auditors" :key="a.auditor_id" class="mod-version-auditor">
      <SBadge :tone="a.deleted ? 'danger' : 'gray'">
        {{ a.name || `#${a.auditor_id}` }}<template v-if="a.deleted"> · {{ t('flows.deletedAuditor') }}</template>
      </SBadge>
      <span v-if="detailed && params(a)" class="mod-sub"> {{ params(a) }}</span>
    </span>
  </div>
</template>
