<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SField, SInput, STextarea } from '@sub2api/ui'
import { categoryLabel, useModHost, type JevQuestions } from '../host'
import { JEV_MAX_ITEMS, jevIssues } from './fields'

// Editor of a Jev question set: preamble, then one card per question
// (category, label, threshold, question, optional yes / no answers). Edits
// the given reactive set in place; `disabled` shows it read-only.
const props = defineProps<{ set: JevQuestions; disabled?: boolean }>()
const t = useModHost().t

const issues = computed(() => jevIssues(props.set))
const bad = (index: number, field: string) => issues.value.some((x) => x.index === index && x.field === field)

function add() {
  props.set.items.push({ category: 'custom/', label: '', question: '', threshold: 0.85 })
}
function remove(i: number) {
  props.set.items.splice(i, 1)
}
</script>

<template>
  <div class="mod-form">
    <SField :label="t('auditors.preamble')" :error="bad(-1, 'preamble') ? t('settingsPage.err.tooLong', { max: 2000 }) : ''">
      <STextarea v-model="set.preamble" :rows="3" :disabled="disabled" />
    </SField>
    <div v-for="(q, i) in set.items" :key="i" class="mod-question">
      <div class="mod-form-row">
        <SField :label="t('auditors.category')" size="sm" :error="bad(i, 'category') ? t('settingsPage.jev.categoryErr') : ''">
          <SInput v-model="q.category" size="sm" mono :disabled="disabled" />
        </SField>
        <SField :label="t('auditors.label')" size="sm" :error="bad(i, 'label') ? t('settingsPage.err.tooLong', { max: 64 }) : ''">
          <SInput v-model="q.label" size="sm" :placeholder="categoryLabel(q.category)" :disabled="disabled" />
        </SField>
        <SField :label="t('auditors.threshold')" size="sm" :error="bad(i, 'threshold') ? t('settingsPage.jev.thresholdErr') : ''">
          <SInput v-model="q.threshold" type="number" min="0.01" max="1" step="0.01" size="sm" :disabled="disabled" />
        </SField>
        <SButton v-if="!disabled" size="sm" variant="ghost" icon="trash" :aria-label="t('delete')" :disabled="set.items.length <= 1" @click="remove(i)" />
      </div>
      <SField :label="t('auditors.question')" size="sm" :error="bad(i, 'question') ? t('settingsPage.jev.questionErr') : ''">
        <STextarea v-model="q.question" :rows="2" :disabled="disabled" />
      </SField>
      <div class="mod-form-row">
        <SField :label="t('settingsPage.jev.answerYes')" size="sm" :error="bad(i, 'answer') ? t('settingsPage.err.tooLong', { max: 1000 }) : ''">
          <SInput v-model="q.answer_yes" size="sm" :disabled="disabled" />
        </SField>
        <SField :label="t('settingsPage.jev.answerNo')" size="sm">
          <SInput v-model="q.answer_no" size="sm" :disabled="disabled" />
        </SField>
      </div>
    </div>
    <div v-if="!disabled" class="mod-toolbar mod-set-jev-add">
      <SButton size="sm" icon="plus" :disabled="set.items.length >= JEV_MAX_ITEMS" @click="add">{{ t('auditors.addQuestion') }}</SButton>
    </div>
  </div>
</template>

<style scoped>
.mod-set-jev-add {
  justify-content: flex-start;
  margin-bottom: 0;
}
</style>
