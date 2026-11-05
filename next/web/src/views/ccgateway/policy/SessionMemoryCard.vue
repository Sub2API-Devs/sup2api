<script setup lang="ts">
// Session memory of the request policy (SESSION-MEMORY-TOOLS-USED-DESIGN.md
// §4.7, 2026-11-05): how long the Worker keeps a session's thread state and
// its tools-used set, in seconds, 24 hours unless chosen otherwise. Not one of
// the level's layers (every level), but a group or an account follows or
// customizes it as a whole like one.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SInput, SSegmented, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import type { SelectOption } from '@sub2api/ui'
import {
  maxSessionMemoryTTL, minSessionMemoryTTL, sessionMemoryFields, sessionMemoryPresets, sessionMemoryTTL, validSessionMemoryTTL,
  type SessionMemoryField
} from '../requestPolicy'
import { usePolicyLayers } from '../usePolicyLayerContext'

const { t } = useI18n()
const layers = usePolicyLayers()
const labels: Record<SessionMemoryField, { label: string; hint: string }> = {
  thread_ttl_seconds: { label: 'ccgateway.sessionMemory.thread', hint: 'ccgateway.sessionMemory.threadHint' },
  tools_ttl_seconds: { label: 'ccgateway.sessionMemory.tools', hint: 'ccgateway.sessionMemory.toolsHint' }
}
const presetOptions = computed<SelectOption[]>(() => sessionMemoryPresets.map(value => ({ value, label: t('ccgateway.sessionMemory.presets.' + value) })))
const ttl = (field: SessionMemoryField) => sessionMemoryTTL(layers.view.session_memory, field)
const valid = (field: SessionMemoryField) => validSessionMemoryTTL(layers.view.session_memory?.[field])
const setTTL = (field: SessionMemoryField, value: number) => layers.edit(draft => { draft.session_memory = { ...draft.session_memory, [field]: value } })
// An emptied field writes nothing: what was set stays until a number is typed.
const setInput = (field: SessionMemoryField, value: unknown) => { if (typeof value === 'number') setTTL(field, value) }
</script>

<template>
  <SSettingsGroup
    :title="t('ccgateway.sessionMemory.title')"
    :description="layers.layerOrigin('session')"
    dense
    data-testid="session-memory"
  >
    <template #actions>
      <SChip size="xs">
        {{ t('ccgateway.sessionMemory.from') }}
      </SChip>
      <SSegmented
        v-if="layers.toggles"
        :model-value="layers.modeOf('session')"
        :options="layers.modeOptions"
        size="sm"
        :disabled="layers.disabled"
        :aria-label="layers.modeLabel('session')"
        data-testid="layer-mode-session"
        @update:model-value="layers.setMode('session', $event)"
      />
    </template>
    <template #details>
      <p>{{ t('ccgateway.sessionMemory.hint') }}</p>
    </template>
    <SSettingRow
      v-for="field in sessionMemoryFields"
      :key="field"
      :label="t(labels[field].label)"
      :description="valid(field) ? t(labels[field].hint) : t('ccgateway.sessionMemory.range')"
      size="sm"
      :data-testid="'session-memory-' + field"
    >
      <SSegmented
        :model-value="ttl(field)"
        :options="presetOptions"
        size="sm"
        :disabled="!layers.editable('session')"
        :aria-label="t(labels[field].label)"
        :data-testid="'session-memory-' + field + '-preset'"
        @update:model-value="setTTL(field, Number($event))"
      />
      <SInput
        :model-value="ttl(field)"
        type="number"
        :min="minSessionMemoryTTL"
        :max="maxSessionMemoryTTL"
        step="1"
        lazy
        :suffix="t('ccgateway.sessionMemory.seconds')"
        :aria-label="t(labels[field].label) + ' ' + t('ccgateway.sessionMemory.custom')"
        :error="!valid(field)"
        :disabled="!layers.editable('session')"
        class="w-36"
        :data-testid="'session-memory-' + field + '-input'"
        @update:model-value="setInput(field, $event)"
      />
    </SSettingRow>
  </SSettingsGroup>
</template>
