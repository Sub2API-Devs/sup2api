<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SField, SHint, SInput, SFormModal, SSegmented, SSelect, SSwitch, STextarea } from '@sub2api/ui'
import JevQuestionsEditor from './JevQuestionsEditor.vue'
import { useCatalog } from './catalog'
import { applyErrorsOrToast, clearErrors, type FieldErrors } from './forms'
import { auditorConfig, auditorFormOf } from './auditorForm'
import { AUDITOR_TYPES, hasQuestions as typeHasQuestions } from './flowOps'
import { THRESHOLD_PRESETS, presetThresholds, thresholdOverrides, thresholdPresetOf } from './thresholdPresets'
import { categoryLabel, enumLabel, enumOptions } from './format'
import { fetchAuditor, saveAuditor, useModHost } from './host'
import type { Auditor, AuditorDraft, AuditorTryTarget, AuditorType, Defaults } from './types'

// Creates or edits an auditor (auditor null = new): OpenAI moderation
// thresholds with presets, Jev questions, an LLM verdict prompt, or an LLM
// question table (the Jev question editor without thresholds); bound to one
// channel of its type. Jev and both LLM types have an image switch (the LLM
// model may not support images; off = text only). "Try" runs the unsaved edits. `readonly` shows
// the auditor without saving or trying (read users). The list row is shown
// at once and replaced by GET /auditors/:id unless the form was edited.
const props = defineProps<{ auditor: Auditor | null; defaults: Defaults | null; readonly?: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'saved'): void; (e: 'try', target: AuditorTryTarget): void }>()
const host = useModHost()
const t = host.t
const catalog = useCatalog()

const CHANNEL_TYPE: Record<AuditorType, string> = { openai_moderation: 'openai_moderation', typesafe: 'typesafe', llm_verdict: 'llm', llm_questions: 'llm' }
const typeOptions = computed(() => enumOptions('auditorType', AUDITOR_TYPES))
const toolChoiceOptions = ['required', 'function', 'auto'].map((v) => ({ value: v, label: v }))

const form = reactive(auditorFormOf(null))
const errs = reactive<FieldErrors>({})
const saving = ref(false)

const channelOptions = computed(() =>
  catalog.state.channels
    .filter((c) => c.type === CHANNEL_TYPE[form.type])
    .map((c) => ({
      value: c.id,
      label: `${c.name}${c.type === 'llm' && c.protocol ? ` · ${enumLabel('protocol', c.protocol)}` : ''}${c.enabled ? '' : ` (${t('disabled')})`}`
    }))
)
const firstChannel = () => Number(channelOptions.value[0]?.value || 0)

function fill(a: Auditor | null) {
  Object.assign(form, auditorFormOf(a))
  form.channel_id ||= firstChannel()
}
const snapshot = () => JSON.stringify(form)

watch(open, async (v) => {
  if (!v) return
  const a = props.auditor
  clearErrors(errs)
  fill(a)
  if (!a) return
  const shown = snapshot()
  const fresh = await fetchAuditor(a.id).catch(() => null)
  if (fresh && open.value && props.auditor?.id === a.id && snapshot() === shown) fill(fresh)
})

function copyDefault() {
  const d = props.defaults?.default
  if (!d) return
  form.ownQuestions = true
  form.questions = { preamble: d.preamble, items: d.items.map((q) => ({ ...q })) }
}

/** The OpenAI overrides of the form (a cleared input is not an override), for the preset shown. */
const formThresholds = computed(() => thresholdOverrides(form.thresholds))
const presetOptions = computed(() => enumOptions('auditors.preset', THRESHOLD_PRESETS.map((p) => p.id)))
const formPreset = computed(() => (props.defaults ? thresholdPresetOf(props.defaults, formThresholds.value) : null))
function applyPreset(id: unknown) {
  const p = THRESHOLD_PRESETS.find((x) => x.id === id)
  if (!p || !props.defaults) return
  form.thresholds = Object.fromEntries(Object.entries(presetThresholds(props.defaults, p.factor)).map(([k, v]) => [k, String(v)]))
}

const config = () => auditorConfig(form)
const draft = (): AuditorDraft => ({ name: form.name, type: form.type, channel_id: Number(form.channel_id), config: config() })
const hasQuestions = computed(() => typeHasQuestions(form.type))

const title = computed(() => {
  const a = props.auditor
  if (!a) return t('auditors.add')
  return t(props.readonly ? 'auditors.viewTitle' : 'auditors.editTitle', { name: a.name })
})

async function save() {
  if (props.readonly) return
  clearErrors(errs)
  saving.value = true
  try {
    await saveAuditor(props.auditor?.id ?? null, draft())
    host.toast(t('saved'), 'success')
    open.value = false
    emit('saved')
  } catch (e) {
    applyErrorsOrToast(errs, e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SFormModal v-model:open="open" :title="title" width="2xl" :loading="saving" @submit="save">
    <div class="mod-form">
      <fieldset class="mod-fieldset" :disabled="readonly">
        <div class="mod-form-row">
          <SField :label="t('auditors.col.name')" required :error="errs.name">
            <SInput v-model="form.name" :maxlength="64" />
          </SField>
          <SField :label="t('auditors.col.type')" :error="errs.type">
            <SSelect v-model="form.type" :options="typeOptions" :disabled="!!auditor" @update:model-value="form.channel_id = firstChannel()" />
          </SField>
          <SField :label="t('auditors.col.channel')" required :error="errs.channel_id" :hint="channelOptions.length ? '' : t('auditors.noChannelOfType')">
            <SSelect v-model="form.channel_id" :options="channelOptions" />
          </SField>
        </div>
        <SAlert v-if="errs.config" tone="danger" dense>{{ errs.config }}</SAlert>

        <template v-if="form.type === 'openai_moderation'">
          <div class="mod-inline mod-gap">
            <SSegmented :model-value="formPreset ?? ''" :options="presetOptions" size="sm" @update:model-value="applyPreset" />
            <SBadge v-if="!formPreset" tone="info" size="xs">{{ t('auditors.preset.custom') }}</SBadge>
          </div>
          <SHint size="xs">{{ t('auditors.thresholdsHint') }}</SHint>
          <div class="mod-threshold-grid">
            <SField v-for="c in defaults?.openai_categories || []" :key="c" :label="categoryLabel(c)" size="sm">
              <SInput v-model="form.thresholds[c]" type="number" min="0.01" max="1" step="0.01" size="sm" :placeholder="String(defaults?.openai_thresholds[c] ?? '')" />
            </SField>
          </div>
        </template>

        <template v-else-if="hasQuestions">
          <SHint v-if="form.type === 'llm_questions'" size="xs">{{ t('auditors.llmQuestionsHint') }}</SHint>
          <SField :label="t(form.type === 'typesafe' ? 'auditors.reviewImages' : 'auditors.modelImages')" :hint="t(form.type === 'typesafe' ? 'auditors.reviewImagesHint' : 'auditors.modelImagesHint')">
            <SSwitch v-model="form.review_images" />
          </SField>
          <SField :label="t('auditors.ownQuestions')" :hint="form.ownQuestions ? '' : t('auditors.useDefault', { v: defaults?.default_version || '' })">
            <SSwitch v-model="form.ownQuestions" />
          </SField>
          <JevQuestionsEditor v-if="form.ownQuestions" v-model="form.questions" :hide-threshold="form.type === 'llm_questions'">
            <template #toolbar><SButton size="sm" @click="copyDefault">{{ t('auditors.copyDefault') }}</SButton></template>
          </JevQuestionsEditor>
          <SHint v-if="auditor?.rules_version" size="xs">{{ t('auditors.rulesVersion', { v: auditor.rules_version }) }}</SHint>
        </template>

        <template v-else>
          <SField :label="t('auditors.systemPrompt')" :hint="t('auditors.systemPromptHint')">
            <STextarea v-model="form.system_prompt" :rows="6" :placeholder="defaults?.llm_system_prompt.slice(0, 200) + '…'" />
          </SField>
          <SField :label="t('auditors.categories')" :hint="t('auditors.categoriesHint')">
            <STextarea v-model="form.categories" :rows="4" :placeholder="(defaults?.llm_categories || []).slice(0, 3).map((c) => `${c.id}: ${c.description}`).join('\n')" />
          </SField>
          <div class="mod-form-row">
            <SField :label="t('auditors.toolChoice')">
              <SSelect v-model="form.tool_choice" :options="toolChoiceOptions" />
            </SField>
            <SField :label="t('auditors.maxTurns')"><SInput v-model="form.max_turns" type="number" min="1" max="5" /></SField>
            <SField :label="t('auditors.temperature')"><SInput v-model="form.temperature" type="number" min="0" max="2" step="0.1" /></SField>
            <SField :label="t('auditors.maxTokens')"><SInput v-model="form.max_tokens" type="number" min="64" max="4096" /></SField>
          </div>
          <SField :label="t('auditors.flagAsHitLabel')" :hint="t('auditors.flagAsHitHint')">
            <SSwitch v-model="form.flag_as_hit" />
          </SField>
          <SField :label="t('auditors.modelImages')" :hint="t('auditors.modelImagesHint')">
            <SSwitch v-model="form.review_images" />
          </SField>
        </template>
      </fieldset>
    </div>
    <template v-if="readonly" #footer>
      <SButton @click="open = false">{{ host.i18n.t('ui.close') }}</SButton>
    </template>
    <template v-else #footer-start>
      <SButton icon="play" :disabled="!form.channel_id" @click="emit('try', { id: auditor?.id ?? null, name: form.name || t('auditors.unsaved'), type: form.type, draft: draft() })">{{ t('auditors.tryDraft') }}</SButton>
    </template>
  </SFormModal>
</template>
