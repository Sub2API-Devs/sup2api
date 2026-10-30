<script setup lang="ts">
import { SBadge, SHint, SSectionTitle } from '@sub2api/ui'
import FlowStages from './FlowStages.vue'
import { dt, specText } from './format'
import { useModHost, type FlowVersionDetail } from './host'

// The flow version a record ran with (new-api flow-snapshot-card): name,
// version against the current one, scope and each stage's auditors with the
// thresholds / question set / channel of that version.
defineProps<{ snapshot: FlowVersionDetail; name?: string; current?: number }>()
const t = useModHost().t
</script>

<template>
  <div>
    <SSectionTitle tag="p">{{ t('snapshot.title') }}</SSectionTitle>
    <div class="mod-version-body">
      <div class="mod-history-head">
        <strong>{{ snapshot.name || name || `#${snapshot.flow_id}` }}</strong>
        <span class="mod-num">v{{ snapshot.version }}</span>
        <SBadge v-if="snapshot.deleted" tone="danger">{{ t('snapshot.deleted') }}</SBadge>
        <SBadge v-else-if="snapshot.historical" tone="warning">{{ t('flowRef.now', { v: snapshot.current_version || current || '' }) }}</SBadge>
        <SBadge v-else tone="info">{{ t('flows.current') }}</SBadge>
        <SHint v-if="snapshot.published_at" inline size="xs">{{ t('snapshot.publishedAt', { time: dt(snapshot.published_at) }) }}</SHint>
      </div>
      <div v-if="snapshot.spec" class="mod-sub">{{ specText(snapshot.spec) }}</div>
      <FlowStages :stages="snapshot.stages || []" detailed />
    </div>
  </div>
</template>
