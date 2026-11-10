<script setup lang="ts">
import { computed } from 'vue'
import { SHint } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { categoryLabel, enumLabel, score } from './format'
import { useModHost } from './host'
import type { Outcome, Trace } from './types'
import { outcomeState, stageNumber, stageState, type OutcomeState } from './trace'

// Compact stage results of a record: "第 1 级 ✗ → 第 2 级 ✓ ∥ ✗", numbered as
// in the flow (the trace holds only the stages that ran). Hovering a stage
// lists each auditor's state and top score. A fallback stage is named 补审
// (its number is in the hover text); a stage that reached no verdict is
// marked failed (it was passed over; on records written before 0.8.0:
// error); a replayed cached hit starts with the replay mark.
const props = defineProps<{ trace?: Trace | null }>()
const t = useModHost().t
const catalog = useCatalog()

const MARK: Record<OutcomeState, { text: string; cls: string }> = {
  hit: { text: '✗', cls: 'mod-text-danger' },
  pass: { text: '✓', cls: 'mod-text-success' },
  error: { text: '!', cls: 'mod-text-warning' },
  skipped: { text: '–', cls: 'mod-sub' }
}

function outcomeTitle(o: Outcome): string {
  const state = outcomeState(o)
  const top = o.top_category ? ` · ${categoryLabel(o.top_category)} ${score(o.top_score)}` : ''
  const err = state === 'error' ? ` · ${enumLabel('err', o.err)}` : ''
  return `${catalog.auditorName(o.auditor_id)}: ${t(`trace.${state}`)}${top}${err}`
}

const stages = computed(() =>
  (props.trace?.stages || []).map((st, i) => {
    const outcomes = st.outcomes || []
    const state = stageState(st)
    // no verdict: failed (passed over), or the errored stage of a record written before 0.8.0
    const mark = state === 'failed' ? t('trace.failedShort') : state === 'error' ? t('stageResult.error') : ''
    const name = t('trace.stageN', { n: stageNumber(st, i) })
    const head = mark || st.fallback ? [`${name}${st.fallback ? ` · ${t('flows.role.fallback')}` : ''}${mark ? `: ${enumLabel('stageResult', state)}` : ''}`] : []
    return { key: i, name: st.fallback ? t('flows.role.fallback') : name, outcomes, mark, title: [...head, ...outcomes.map(outcomeTitle)].join('\n') }
  })
)
const replayed = computed(() => !!props.trace?.cache?.hit)
</script>

<template>
  <span v-if="stages.length" class="mod-stage-path">
    <span v-if="replayed" class="mod-sub" :title="t('replay.badgeHint')">↻</span>
    <template v-for="(st, i) in stages" :key="st.key">
      <span v-if="i" class="mod-sub">→</span>
      <span class="mod-stage-step" :title="st.title">
        <span class="mod-sub">{{ st.name }}</span>
        <template v-for="(o, j) in st.outcomes" :key="j">
          <span v-if="j" class="mod-sub">∥</span>
          <b :class="MARK[outcomeState(o)].cls">{{ MARK[outcomeState(o)].text }}</b>
        </template>
        <span v-if="st.mark" class="mod-text-warning">{{ st.mark }}</span>
        <span v-else-if="!st.outcomes.length" class="mod-sub">{{ t('trace.skipped') }}</span>
      </span>
    </template>
  </span>
  <SHint v-else inline>—</SHint>
</template>
