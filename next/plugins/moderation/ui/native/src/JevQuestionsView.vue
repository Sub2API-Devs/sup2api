<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { questionDiff } from './auditorForm'
import { categoryLabel } from './format'
import { useModHost } from './host'
import type { JevQuestions } from './types'

// A question table, read only: the preamble and every row with its
// category, threshold, question and answers. With `compare` (the table being
// edited) each row says whether the edited table has it the same, changed or
// not at all, and how many rows the edited table adds. Used for the default
// set in the auditor editor (AuditorDefaultsDrawer) and the settings tab.
const props = defineProps<{ questions: JevQuestions; compare?: JevQuestions; hideThreshold?: boolean }>()
const t = useModHost().t

const TONE = { same: 'gray', changed: 'warning', missing: 'danger' } as const
const diff = computed(() => (props.compare ? questionDiff(props.compare, props.questions) : null))
const rows = computed(() => diff.value?.rows ?? props.questions.items.map((question) => ({ question, state: null })))
</script>

<template>
  <div class="mod-form">
    <div>
      <div class="mod-view-head">
        <span class="mod-sub">{{ t('auditors.preamble') }}</span>
        <SBadge v-if="diff && !diff.preambleSame" tone="warning" size="xs">{{ t('auditors.diff.changed') }}</SBadge>
      </div>
      <p class="mod-prewrap mod-view-text">{{ questions.preamble || '—' }}</p>
    </div>
    <div v-for="(r, i) in rows" :key="r.question.category" class="mod-question">
      <div class="mod-view-head">
        <strong>{{ i + 1 }}. {{ r.question.label || categoryLabel(r.question.category) }}</strong>
        <code class="mod-code-plain">{{ r.question.category }}</code>
        <SBadge v-if="!hideThreshold" tone="info" size="xs">{{ t('auditors.threshold') }} {{ r.question.threshold }}</SBadge>
        <SBadge v-if="r.state" :tone="TONE[r.state]" size="xs">{{ t(`auditors.diff.${r.state}`) }}</SBadge>
      </div>
      <p class="mod-prewrap mod-view-text">{{ r.question.question }}</p>
      <SHint v-if="r.question.answer_yes" size="xs">{{ t('auditors.answerYes') }}：{{ r.question.answer_yes }}</SHint>
      <SHint v-if="r.question.answer_no" size="xs">{{ t('auditors.answerNo') }}：{{ r.question.answer_no }}</SHint>
    </div>
    <SHint v-if="diff?.extra" size="xs">{{ t('auditors.diff.extra', { n: diff.extra }) }}</SHint>
  </div>
</template>
