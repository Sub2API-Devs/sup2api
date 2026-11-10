<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SCode, SHint, SLink, STable, type TableColumn } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import { useCatalog } from './catalog'
import { categoryLabel, enumLabel, ms, score } from './format'
import { useModHost } from './host'
import type { Outcome, Trace } from './types'
import { outcomeState, stageNumber, stageState, type OutcomeState, type StageState } from './trace'

// Per-stage trace of a run: one row per auditor call. Stages carry their
// number in the flow (the trace holds only the stages that ran). A stage
// that reached no verdict is marked failed (it was passed over, earlier
// hits stand; on records written before 0.8.0: error), a fallback stage is
// named 补审. A replayed cached hit says which request its
// verdict comes from; requestLink makes that request a filter link
// (show-request).
const props = defineProps<{ trace: Trace; requestLink?: boolean }>()
const emit = defineEmits<{ (e: 'show-request', requestId: string): void }>()
const t = useModHost().t
const catalog = useCatalog()

interface Row extends Outcome {
  key: string
  stage: number
  stageResult: StageState
  fallback: boolean
}

const rows = computed<Row[]>(() =>
  (props.trace.stages || []).flatMap((st, i) =>
    (st.outcomes || []).map((o, j) => ({ ...o, key: `${i}-${j}`, stage: stageNumber(st, i), stageResult: stageState(st), fallback: !!st.fallback }))
  )
)

const columns = computed<TableColumn[]>(() => [
  { key: 'stage', label: t('trace.stage'), nowrap: true },
  { key: 'auditor', label: t('trace.auditor') },
  { key: 'verdict', label: t('trace.verdict'), nowrap: true },
  { key: 'top', label: t('trace.top') },
  { key: 'model', label: t('trace.model'), ellipsis: '10rem' },
  { key: 'latency_ms', label: t('trace.latency'), align: 'right', nowrap: true }
])

const VERDICT_TONE: Record<OutcomeState, 'danger' | 'success' | 'gray' | 'warning'> = { hit: 'danger', pass: 'success', skipped: 'gray', error: 'warning' }

/** Failed stages without an auditor call (cut off before any answered): they have no row, so the head names them. */
const cutStages = computed(() => (props.trace.stages || []).flatMap((st, i) => (stageState(st) === 'failed' && !st.outcomes?.length ? [stageNumber(st, i)] : [])))

/** The request a replayed hit took its verdict from ('' when the trace does not name it). */
const replay = computed(() => (props.trace.cache?.hit ? { source: props.trace.cache.source_request_id || '' } : null))
</script>

<template>
  <div>
    <SAlert v-if="replay" tone="info" dense class="mod-replay-note">
      <template v-if="replay.source">
        {{ t('replay.from') }}
        <SLink v-if="requestLink" as="button" :title="t('replay.showSource')" @click="emit('show-request', replay.source)"><SCode inline :text="replay.source" /></SLink>
        <SCode v-else inline :text="replay.source" />
        {{ t('replay.fromTail') }}
      </template>
      <template v-else>{{ t('replay.noSource') }}</template>
    </SAlert>
    <div class="mod-trace-head">
      <SBadge v-if="trace.overturned" tone="info">{{ t('trace.overturned') }}</SBadge>
      <SBadge v-if="trace.errored" tone="warning">{{ t('trace.errored') }}</SBadge>
      <SBadge v-for="n in cutStages" :key="n" tone="warning">{{ t('trace.stageN', { n }) }} · {{ t('stageResult.failed') }}</SBadge>
      <SBadge v-if="trace.skipped" tone="gray">{{ t('trace.skipped') }}</SBadge>
      <SBadge v-if="trace.truncated_run" tone="gray">{{ t('trace.truncated') }}</SBadge>
      <SBadge v-if="trace.input_message_dropped" tone="warning" :title="trace.input_message_dropped">{{ t('trace.inputDropped') }}</SBadge>
      <SHint inline size="xs">{{ ms(trace.latency_ms) }}</SHint>
    </div>
    <STable :columns="columns" :rows="rows" row-key="key" dense :empty-text="t('trace.empty')">
      <template #cell-stage="{ row }">
        {{ t('trace.stageN', { n: row.stage }) }}<template v-if="row.fallback"> · {{ t('flows.role.fallback') }}</template>
        <div v-if="row.stageResult === 'failed' || row.stageResult === 'error'"><SBadge tone="warning" size="xs">{{ enumLabel('stageResult', row.stageResult) }}</SBadge></div>
        <div v-else class="mod-sub">{{ enumLabel('stageResult', row.stageResult) }}</div>
      </template>
      <template #cell-auditor="{ row }">
        {{ catalog.auditorName(row.auditor_id) }}
        <div v-if="row.rules_version" class="mod-sub">{{ row.rules_version }}</div>
      </template>
      <template #cell-verdict="{ row }">
        <SBadge :tone="VERDICT_TONE[outcomeState(row)]">{{ t(`trace.${outcomeState(row)}`) }}</SBadge>
        <div v-if="row.err" class="mod-sub">{{ enumLabel('err', row.err) }}<template v-if="row.status"> {{ row.status }}</template></div>
      </template>
      <template #cell-top="{ row }">
        <CategoryChips v-if="row.hits?.length" :categories="row.hits" wrap />
        <span v-else-if="row.top_category" class="mod-num">{{ categoryLabel(row.top_category) }} {{ score(row.top_score) }}</span>
        <SHint v-else inline>—</SHint>
        <div v-if="row.reason" class="mod-sub">{{ row.reason }}</div>
        <div v-if="row.sent_images || row.skipped_images" class="mod-sub">{{ t('trace.images', { sent: row.sent_images || 0, skipped: row.skipped_images || 0 }) }}</div>
      </template>
      <template #cell-model="{ row }">{{ row.model || '—' }}</template>
      <template #cell-latency_ms="{ row }"><span class="mod-num">{{ ms(row.latency_ms) }}</span></template>
    </STable>
  </div>
</template>
