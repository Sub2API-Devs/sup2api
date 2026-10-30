<script setup lang="ts">
import { computed } from 'vue'
import { SHint } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { categoryLabel, enumLabel, score, useModHost, type Outcome, type Trace } from './host'
import { outcomeState, type OutcomeState } from './trace'

// Compact stage results of a record: "第 1 级 ✗ → 第 2 级 ✓ ∥ ✗". Hovering a
// stage lists each auditor's state and top score.
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
    return { n: i + 1, outcomes, title: outcomes.map(outcomeTitle).join('\n') }
  })
)
</script>

<template>
  <span v-if="stages.length" class="mod-stage-path">
    <template v-for="(st, i) in stages" :key="st.n">
      <span v-if="i" class="mod-sub">→</span>
      <span class="mod-stage-step" :title="st.title">
        <span class="mod-sub">{{ t('trace.stageN', { n: st.n }) }}</span>
        <template v-for="(o, j) in st.outcomes" :key="j">
          <span v-if="j" class="mod-sub">∥</span>
          <b :class="MARK[outcomeState(o)].cls">{{ MARK[outcomeState(o)].text }}</b>
        </template>
        <span v-if="!st.outcomes.length" class="mod-sub">{{ t('trace.skipped') }}</span>
      </span>
    </template>
  </span>
  <SHint v-else inline>—</SHint>
</template>
