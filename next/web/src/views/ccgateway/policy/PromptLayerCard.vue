<script setup lang="ts">
// Prompt-and-tools layer of the request policy (CONTRACTS §53): what a request
// without a billing header is given at the high level — Claude Code's system
// prompt and its tools — each choice optional and defaulted by the level.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SSegmented, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import { injectionDefault, injectionTools } from '../requestPolicy'
import { usePolicyLayers } from '../usePolicyLayerContext'

const { t } = useI18n()
const layers = usePolicyLayers()
const systemPrompt = computed(() => layers.view.build_injection?.system_prompt ?? injectionDefault('system_prompt'))
function setSystemPrompt(on: boolean) {
  layers.edit(draft => {
    draft.build_injection = { ...draft.build_injection, system_prompt: on }
  })
}
/** Tools use the context's shared build_injection switch (same as the environment card). */
const setTool = (name: string, on: boolean) => layers.setInjection('tools', name, on)
const toolHints = computed(() => [
  { tools: 'Agent', text: t('ccgateway.levels.toolHints.Agent') },
  { tools: ['WebSearch', 'NotebookEdit'].join(t('ccgateway.levels.convertSummary.list')), text: t('ccgateway.levels.toolHints.deferred') }
])
</script>

<template>
  <SSettingsGroup
    :key="'prompt-' + layers.has.prompt"
    :title="t('ccgateway.levels.promptTools')"
    :description="layers.has.prompt ? layers.layerOrigin('prompt') : layers.lockedText('prompt')"
    :collapsible="!layers.has.prompt"
    :default-open="layers.has.prompt"
    dense
    data-testid="prompt-tools"
    :data-locked="!layers.has.prompt || undefined"
  >
    <template #actions>
      <SChip
        v-if="layers.has.prompt"
        size="xs"
      >
        {{ t('ccgateway.levels.from.prompt') }}
      </SChip>
      <SSegmented
        v-if="layers.toggles"
        :model-value="layers.modeOf('prompt')"
        :options="layers.modeOptions"
        size="sm"
        :disabled="layers.disabled || layers.locked('prompt')"
        :aria-label="layers.modeLabel('prompt')"
        data-testid="layer-mode-prompt"
        @update:model-value="layers.setMode('prompt', $event)"
      />
    </template>
    <template
      v-if="layers.has.prompt"
      #details
    >
      <p>{{ t('ccgateway.levels.promptToolsShort') }}</p>
    </template>
    <SSettingRow
      :label="t('ccgateway.levels.systemPrompt')"
      :description="t('ccgateway.levels.systemPromptHint')"
      size="sm"
    >
      <SSwitch
        :model-value="systemPrompt"
        :disabled="!layers.editable('prompt')"
        data-testid="injection-system_prompt"
        @update:model-value="setSystemPrompt"
      />
    </SSettingRow>
    <SSettingRow
      :label="t('ccgateway.levels.tools')"
      stacked
      size="sm"
      data-testid="injection-tools"
    >
      <template #description>
        <span data-testid="tools-client-note">{{ t('ccgateway.levels.toolsHint') }}</span>
      </template>
      <div class="w-full space-y-1.5">
        <div
          class="flex flex-wrap gap-1.5"
          role="group"
          :aria-label="t('ccgateway.levels.tools')"
        >
          <SChip
            v-for="name in injectionTools"
            :key="name"
            :pressed="layers.injected('tools', name)"
            :icon="layers.injected('tools', name) ? 'check' : undefined"
            :disabled="!layers.editable('prompt')"
            :data-testid="'injection-tools-' + name"
            @update:pressed="setTool(name, $event)"
          >
            {{ name }}
          </SChip>
        </div>
        <ul
          class="space-y-0.5 text-xs leading-5 text-fg-subtle"
          data-testid="tool-hints"
        >
          <li
            v-for="hint in toolHints"
            :key="hint.tools"
          >
            {{ t('ccgateway.levels.toolHintLine', hint) }}
          </li>
        </ul>
      </div>
    </SSettingRow>
  </SSettingsGroup>
</template>
