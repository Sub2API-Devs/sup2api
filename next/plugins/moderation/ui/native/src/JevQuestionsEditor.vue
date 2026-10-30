<script setup lang="ts">
import { SButton, SField, SInput, STextarea } from '@sub2api/ui'
import { categoryLabel, useModHost, type JevQuestions } from './host'

// A Jev question table (new-api jev-questions-editor): the preamble and one
// row per category with its label, threshold, question and the optional
// answers sent as criteria.true / criteria.false. Shared by the auditor
// editor and the default question set in the settings tab; the toolbar slot
// takes the caller's copy / restore buttons.
const model = defineModel<JevQuestions>({ required: true })
const t = useModHost().t

const addRow = () => model.value.items.push({ category: 'custom/', label: '', question: '', answer_yes: '', answer_no: '', threshold: 0.85 })
</script>

<template>
  <div class="mod-form">
    <div class="mod-toolbar">
      <slot name="toolbar" />
      <SButton size="sm" icon="plus" @click="addRow">{{ t('auditors.addQuestion') }}</SButton>
    </div>
    <SField :label="t('auditors.preamble')">
      <STextarea v-model="model.preamble" :rows="3" :maxlength="2000" />
    </SField>
    <div v-for="(q, i) in model.items" :key="i" class="mod-question">
      <div class="mod-form-row">
        <SField :label="t('auditors.category')" size="sm"><SInput v-model="q.category" size="sm" :maxlength="64" /></SField>
        <SField :label="t('auditors.label')" size="sm"><SInput v-model="q.label" size="sm" :maxlength="64" :placeholder="categoryLabel(q.category)" /></SField>
        <SField :label="t('auditors.threshold')" size="sm"><SInput v-model="q.threshold" type="number" min="0.01" max="1" step="0.01" size="sm" /></SField>
        <SButton size="sm" variant="ghost" icon="trash" :aria-label="t('delete')" @click="model.items.splice(i, 1)" />
      </div>
      <STextarea v-model="q.question" :rows="2" :maxlength="2000" :placeholder="t('auditors.question')" />
      <div class="mod-form-row">
        <SField :label="t('auditors.answerYes')" size="sm"><SInput v-model="q.answer_yes" size="sm" :maxlength="1000" :placeholder="t('auditors.answerPlaceholder')" /></SField>
        <SField :label="t('auditors.answerNo')" size="sm"><SInput v-model="q.answer_no" size="sm" :maxlength="1000" :placeholder="t('auditors.answerPlaceholder')" /></SField>
      </div>
    </div>
  </div>
</template>
