<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SDisclosure, SHint, SSelect, SSettingRow, SSettingsGroup, STextarea } from '@sub2api/ui'
import { useModHost } from '../host'
import AnalysisPromptModal from '../AnalysisPromptModal.vue'
import { GUIDELINES_MAX_BYTES } from './fields'
import { useSettingsForm } from './useSettings'
import NumberRow from './NumberRow.vue'
import SwitchRow from './SwitchRow.vue'
import AnalysisToolsTable from './AnalysisToolsTable.vue'
import CategoryDictTable from './CategoryDictTable.vue'

// AI analysis: the analysis channel (llm channels only), what the AI may
// change on the watch list, the guidelines (empty = built-in), limits, and
// read-only views of the tools and the category dictionary.
const f = useSettingsForm()
const h = useModHost()
const t = h.t
const n = (v: number) => h.i18n.formatNumber(v)

const channelOptions = computed(() => {
  const list = f.llmChannels.value.map((c) => ({
    value: c.id,
    label: `${c.name} · ${c.model}${c.enabled ? '' : ` (${t('disabled')})`}`
  }))
  const id = f.draft.analysis_channel_id
  if (id && !list.some((o) => o.value === id)) list.push({ value: id, label: t('settingsPage.analysis.channelMissing', { id }) })
  return [{ value: 0, label: t('settingsPage.analysis.noChannel') }, ...list]
})

const guideBytes = computed(() => new TextEncoder().encode(String(f.draft.analysis_guidelines || '').trim()).length)
const isDefault = computed(() => String(f.draft.analysis_guidelines || '').trim() === f.defaultGuidelines.value.trim())
const promptOpen = ref(false)
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.analysis')" :description="t('settingsPage.group.analysisHint')">
    <SSettingRow :label="t('settingsPage.f.analysis_channel_id.label')" :description="t('settingsPage.f.analysis_channel_id.desc')">
      <SSelect v-model="f.draft.analysis_channel_id" :options="channelOptions" :disabled="!f.canWrite" size="sm" class="mod-set-channel" />
    </SSettingRow>

    <SwitchRow field="analysis_allow_upgrade" />
    <SwitchRow field="analysis_allow_downgrade" />
    <SwitchRow field="analysis_allow_remove" />

    <SSettingRow :label="t('settingsPage.f.analysis_guidelines.label')" :description="t('settingsPage.f.analysis_guidelines.desc')" :error="f.errorOf('analysis_guidelines')" stacked>
      <STextarea v-model="f.draft.analysis_guidelines" :rows="14" mono :disabled="!f.canWrite" class="mod-set-wide" />
      <div class="mod-set-guide-bar">
        <SHint inline size="xs" class="mod-num">{{ t('settingsPage.analysis.bytes', { used: n(guideBytes), max: n(GUIDELINES_MAX_BYTES) }) }}</SHint>
        <SHint inline size="xs">{{ t(isDefault ? 'settingsPage.analysis.isDefault' : 'settingsPage.analysis.isCustom') }}</SHint>
        <span class="mod-ml-auto mod-set-guide-actions">
          <SButton v-if="f.canWrite && f.defaultGuidelines.value" size="sm" :disabled="isDefault" @click="f.draft.analysis_guidelines = f.defaultGuidelines.value">
            {{ t('settingsPage.analysis.restore') }}
          </SButton>
          <SButton size="sm" icon="eye" @click="promptOpen = true">{{ t('settingsPage.analysis.preview') }}</SButton>
        </span>
      </div>
      <SHint v-if="f.dirtyKeys.value.includes('analysis_guidelines')" size="xs" tone="warning">{{ t('settingsPage.analysis.previewSaved') }}</SHint>
    </SSettingRow>

    <NumberRow field="analysis_timeout_ms" :unit="t('settingsPage.unit.seconds')" />
    <NumberRow field="analysis_concurrency" />
    <NumberRow field="analysis_context_kb" unit="KB" />
    <NumberRow field="analysis_keep_per_user" />

    <div class="mod-set-refs">
      <SDisclosure variant="section" :label="t('settingsPage.analysis.tools')" :description="t('settingsPage.analysis.toolsHint')">
        <AnalysisToolsTable />
      </SDisclosure>
      <SDisclosure variant="section" :label="t('settingsPage.analysis.dict')" :description="t('settingsPage.analysis.dictHint')">
        <CategoryDictTable />
      </SDisclosure>
    </div>
  </SSettingsGroup>
  <AnalysisPromptModal v-model:open="promptOpen" />
</template>

<style scoped>
.mod-set-channel {
  width: 20rem;
  max-width: 100%;
}
.mod-set-wide {
  width: 100%;
}
.mod-set-guide-bar {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}
.mod-set-guide-actions {
  display: inline-flex;
  gap: 0.5rem;
}
.mod-set-refs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 0;
}
</style>
