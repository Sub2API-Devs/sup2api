<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SCode, SHint, SIcon, SLink, STable, type TableColumn } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import { useCatalog } from './catalog'
import { categoryLabel, enumLabel, ms, score } from './format'
import { useModHost } from './host'
import type { Outcome, Trace } from './types'
import { imagesRefusedNote, outcomeState, stageNumber, stageState, unjudgedStages, type OutcomeState, type StageState } from './trace'

// Per-stage trace of a run: one row per auditor call. Stages carry their
// number in the flow (the trace holds only the stages that ran). A stage
// that reached no verdict is marked failed (it was passed over, earlier
// hits stand; on records written before 0.8.0: error), a fallback stage is
// named 补审. A replayed cached hit says which request its
// verdict comes from; requestLink makes that request a filter link
// (show-request). A call whose images the upstream refused is marked with a
// warning icon (only its text was reviewed). Each cell keeps to one line: the
// stage result, the question set, the error and the images sent are in
// tooltips, a long reason is cut (hover for all of it). A phone card, without
// hover, shows the whole reason and the refused-images note.
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
  { key: 'stage', label: t('trace.stage'), nowrap: true, mobile: 'subtitle' },
  { key: 'auditor', label: t('trace.auditor'), ellipsis: '10rem', mobile: 'title' },
  { key: 'verdict', label: t('trace.verdict'), nowrap: true, mobile: 'status' },
  { key: 'top', label: t('trace.top'), nowrap: true, mobile: 'meta' },
  // LLM auditors give a reason (a phone card also says here that the images were refused); left out when no row has one
  ...(rows.value.some((r) => r.reason || r.images_refused) ? [{ key: 'reason', label: t('detail.f.reason'), grow: true, mobile: 'meta', mobileSpan: 2 } satisfies TableColumn] : []),
  { key: 'model', label: t('trace.model'), ellipsis: '12rem', mobile: 'detail' },
  { key: 'latency_ms', label: t('trace.latency'), align: 'right', nowrap: true, mobile: 'detail' }
])

const VERDICT_TONE: Record<OutcomeState, 'danger' | 'success' | 'gray' | 'warning'> = { hit: 'danger', pass: 'success', skipped: 'gray', error: 'warning' }

/** The note of a call whose images the upstream refused ('' when it did not). */
function refusedText(o: Outcome): string {
  const note = imagesRefusedNote(o)
  return note ? t(note.key, note.params) : ''
}

/** The error of a call ("timeout 504"), in its verdict's tooltip. */
const errText = (o: Outcome) => (o.err ? `${enumLabel('err', o.err)}${o.status ? ` ${o.status}` : ''}` : undefined)

/** Images sent and skipped, in the top hit's tooltip. */
const imagesText = (o: Outcome) => (o.sent_images || o.skipped_images ? t('trace.images', { sent: o.sent_images || 0, skipped: o.skipped_images || 0 }) : undefined)

/** Stages without a verdict and without an auditor call: they have no row, so the head names them. */
const cutStages = computed(() => unjudgedStages(props.trace))

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
      <SBadge v-for="st in cutStages" :key="st.n" tone="warning">{{ t('trace.stageN', { n: st.n }) }} · {{ enumLabel('stageResult', st.state) }}</SBadge>
      <SBadge v-if="trace.skipped" tone="gray">{{ t('trace.skipped') }}</SBadge>
      <SBadge v-if="trace.truncated_run" tone="gray">{{ t('trace.truncated') }}</SBadge>
      <SBadge v-if="trace.input_message_dropped" tone="warning" :title="trace.input_message_dropped">{{ t('trace.inputDropped') }}</SBadge>
      <SHint inline size="xs">{{ ms(trace.latency_ms) }}</SHint>
    </div>
    <STable :columns="columns" :rows="rows" row-key="key" dense :empty-text="t('trace.empty')">
      <template #cell-stage="{ row }">
        <span class="mod-cell-line" :title="enumLabel('stageResult', row.stageResult)">
          {{ t('trace.stageN', { n: row.stage }) }}<template v-if="row.fallback"> · {{ t('flows.role.fallback') }}</template>
          <SBadge v-if="row.stageResult === 'failed' || row.stageResult === 'error'" tone="warning" size="xs">{{ enumLabel('stageResult', row.stageResult) }}</SBadge>
        </span>
      </template>
      <template #cell-auditor="{ row }">
        <span :title="row.rules_version || undefined">{{ catalog.auditorName(row.auditor_id) }}</span>
      </template>
      <template #cell-verdict="{ row }">
        <span class="mod-cell-line">
          <SBadge :tone="VERDICT_TONE[outcomeState(row)]" :title="errText(row)">{{ t(`trace.${outcomeState(row)}`) }}</SBadge>
          <SIcon v-if="row.images_refused" name="warning" class="mod-text-warning" :label="refusedText(row)" />
        </span>
      </template>
      <template #cell-top="{ row }">
        <span :title="imagesText(row)">
          <CategoryChips v-if="row.hits?.length" :categories="row.hits" />
          <span v-else-if="row.top_category" class="mod-num">{{ categoryLabel(row.top_category) }} {{ score(row.top_score) }}</span>
          <SHint v-else inline>—</SHint>
        </span>
      </template>
      <template #cell-reason="{ row, layout }">
        <template v-if="layout === 'card'">
          <p v-if="row.images_refused" class="mod-text-warning">{{ refusedText(row) }}</p>
          <p v-if="row.reason || !row.images_refused">{{ row.reason || '—' }}</p>
        </template>
        <span v-else class="mod-ellipsis" :title="row.reason || undefined">{{ row.reason || '—' }}</span>
      </template>
      <template #cell-model="{ row }">{{ row.model || '—' }}</template>
      <template #cell-latency_ms="{ row }"><span class="mod-num">{{ ms(row.latency_ms) }}</span></template>
    </STable>
  </div>
</template>
