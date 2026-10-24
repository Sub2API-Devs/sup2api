<script setup lang="ts">
// Client-attachment layer of the request policy (CONTRACTS §53): which parts of
// a request without a billing header get Claude Code's own rendered text
// (injected attachments) and, for a request that carries them, which parts are
// taken from the client, rendered on the Worker, or erased.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SDisclosure, SOptionMatrix, SSegmented, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import type { OptionMatrixGroup, OptionMatrixRow } from '@sub2api/ui'
import { buildAttachmentFields, injectionAttachments, type BuildAttachmentField } from '../requestPolicy'
import { usePolicyLayers } from '../usePolicyLayerContext'

const { t } = useI18n()
const layers = usePolicyLayers()
const envGroups: Array<{ key: string; fields: BuildAttachmentField[] }> = [
  { key: 'runtime', fields: ['platform_name', 'os_version', 'shell'] },
  { key: 'directories', fields: ['primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory'] },
  { key: 'tools', fields: ['github_cli', 'agent_proxy'] }
]
const envSource = (field: BuildAttachmentField) => layers.view.build_attachment_sources?.[field] ?? 'client'
const envColumns = computed(() => ['client', 'worker', 'erase'].map(value => ({ value, label: t('ccgateway.buildAttachments.' + value) })))
const envMatrix = computed(() => Object.fromEntries(buildAttachmentFields.map(field => ['build_attachment_sources.' + field, envSource(field)])))
const envSections = computed<OptionMatrixGroup[]>(() => envGroups.map(group => ({
  key: group.key,
  label: t('ccgateway.layers.' + group.key),
  rows: group.fields.map((field): OptionMatrixRow => ({ key: 'build_attachment_sources.' + field, label: t('ccgateway.layers.fields.' + field), hint: layers.fieldOrigin('build_attachment_sources.' + field), testid: 'build-attachment-' + field }))
})))
// `change` carries only the cells one interaction set.
const setEnvSources = (patch: Record<string, unknown>) => layers.edit(draft => {
  const sources = { ...draft.build_attachment_sources }
  for (const [path, source] of Object.entries(patch)) sources[path.replace('build_attachment_sources.', '') as BuildAttachmentField] = source as 'client' | 'worker' | 'erase'
  draft.build_attachment_sources = sources
})
// One line for the folded matrix, generated from the values.
const convertSummary = computed(() => {
  const s = (key: string, values?: Record<string, unknown>) => t('ccgateway.levels.convertSummary.' + key, values ?? {})
  const worker = buildAttachmentFields.filter(field => envSource(field) === 'worker')
  const erased = buildAttachmentFields.filter(field => envSource(field) === 'erase').length
  if (!worker.length && !erased) return s('all')
  const parts: string[] = []
  if (worker.length) parts.push(worker.length <= 3 ? s('worker', { fields: worker.map(field => t('ccgateway.layers.fields.' + field)).join(s('list')) }) : s('workerCount', { n: worker.length }))
  if (erased) parts.push(s('erase', { n: erased }))
  if (worker.length + erased < buildAttachmentFields.length) parts.push(s('rest'))
  return parts.join(s('sep'))
})
// An omitted choice is its level's default (LevelInjection): the context's
// injected/setInjection are shared with the prompt card.
</script>

<template>
  <SSettingsGroup
    :key="'environment-' + layers.has.environment"
    :title="t('ccgateway.layers.environment')"
    :description="layers.has.environment ? layers.layerOrigin('environment') : layers.lockedText('environment')"
    :collapsible="!layers.has.environment"
    :default-open="layers.has.environment"
    dense
    data-testid="build-attachments"
    :data-locked="!layers.has.environment || undefined"
  >
    <template #actions>
      <SChip
        v-if="layers.has.environment"
        size="xs"
      >
        {{ t('ccgateway.levels.from.environment') }}
      </SChip>
      <SSegmented
        v-if="layers.toggles"
        :model-value="layers.modeOf('environment')"
        :options="layers.modeOptions"
        size="sm"
        :disabled="layers.disabled || layers.locked('environment')"
        :aria-label="layers.modeLabel('environment')"
        data-testid="layer-mode-environment"
        @update:model-value="layers.setMode('environment', $event)"
      />
    </template>
    <template
      v-if="layers.has.environment"
      #details
    >
      <p>{{ t('ccgateway.levels.injectHint') }}</p>
      <p>{{ t('ccgateway.layers.environmentHint') }}</p>
      <p>{{ t('ccgateway.layers.executionHint') }}</p>
    </template>
    <SSettingRow
      :label="t('ccgateway.levels.inject')"
      :description="t('ccgateway.levels.injectShort')"
      size="sm"
      data-testid="environment-inject"
    >
      <div
        class="flex flex-wrap gap-1.5"
        role="group"
        :aria-label="t('ccgateway.levels.inject')"
      >
        <SChip
          v-for="name in injectionAttachments"
          :key="name"
          :pressed="layers.injected('attachments', name)"
          :icon="layers.injected('attachments', name) ? 'check' : undefined"
          :disabled="!layers.editable('environment')"
          :data-testid="'injection-attachments-' + name"
          @update:pressed="layers.setInjection('attachments', name, $event)"
        >
          {{ t('ccgateway.levels.attachment.' + name) }}
        </SChip>
      </div>
    </SSettingRow>
    <SSettingRow
      :label="t('ccgateway.levels.convert')"
      stacked
      size="sm"
      data-testid="environment-convert"
    >
      <template #description>
        <span data-testid="environment-convert-summary">{{ convertSummary }}</span>
      </template>
      <SDisclosure
        :label="t('ccgateway.levels.convertEdit')"
        :open-label="t('ccgateway.levels.convertClose')"
        class="w-full"
        data-testid="environment-convert-edit"
      >
        <SOptionMatrix
          :model-value="envMatrix"
          :columns="envColumns"
          :groups="envSections"
          :disabled="!layers.editable('environment')"
          :aria-label="t('ccgateway.levels.convert')"
          @change="setEnvSources"
        />
      </SDisclosure>
    </SSettingRow>
  </SSettingsGroup>
</template>
