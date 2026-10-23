<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SDisclosure, SOptionMatrix, SSegmented, SSelect, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import type { OptionMatrixGroup, OptionMatrixRow, SelectOption } from '@sub2api/ui'
import { billingEntrypoints, billingFields, buildAttachmentFields, customizeLayer, defaultBillingEntrypoint, defaultRequestLevel, followLayer, injectionAttachments, injectionDefault, injectionTools, layerCustomized, levelHasEnvironment, levelHasIdentity, levelHasPromptAndTools, levelOf, mergeFeaturePolicy, requestLevels, type BillingEntrypoint, type BillingField, type BuildAttachmentField, type FeatureLayer, type FeatureOverrides, type RequestLevel, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const overrides = defineModel<FeatureOverrides>('overrides', { default: () => ({}) })
const props = defineProps<{ inherited?: RequestPolicy; disabled?: boolean; sources?: Record<string, string>; effective?: RequestPolicy; showSavedWhenDisabled?: boolean }>()
const { t } = useI18n()
// A group or an account edits overrides over `inherited`; the global layer edits the policy.
const layered = computed(() => !!props.inherited)
// A read-only preview shows what applies rather than the stored draft.
const showEffective = computed(() => !!props.disabled && !!props.effective && !props.showSavedWhenDisabled)
// What every card shows: the applied policy in a preview, else the draft
// (over its parent at a group or an account, so a following layer shows what
// it inherits and a customized one its own values).
const view = computed<RequestPolicy>(() => showEffective.value ? props.effective!
  : props.inherited ? mergeFeaturePolicy(props.inherited, overrides.value) : policy.value)

// ---------------------------------------------------------------- level and layers
// The level picks the layers that apply (contracts features/levels.go); a
// layer above it keeps its choices and applies them again when raised.
const levelName = (level: RequestLevel) => t('ccgateway.levels.names.' + level)
const level = computed(() => levelOf(view.value))
const has = computed(() => ({ identity: levelHasIdentity(level.value), environment: levelHasEnvironment(level.value), prompt: levelHasPromptAndTools(level.value) }))
const locked = (layer: FeatureLayer | 'identity') =>
  (layer === 'identity' && !has.value.identity) || (layer === 'environment' && !has.value.environment) || (layer === 'prompt' && !has.value.prompt)
const lockedText = (layer: 'identity' | 'environment' | 'prompt') =>
  t(layer === 'identity' ? 'ccgateway.levels.lockedPlain' : 'ccgateway.levels.locked', { level: levelName(({ identity: 'micro', environment: 'low', prompt: 'high' } as const)[layer]) })
const levelOptions = computed<SelectOption[]>(() => requestLevels.map(value => ({ value, label: levelName(value) + (value === defaultRequestLevel ? t('ccgateway.levels.defaultMark') : '') })))
const includedLayers = computed(() => [
  { key: 'billing', on: true }, { key: 'identity', on: has.value.identity }, { key: 'environment', on: has.value.environment }, { key: 'prompt', on: has.value.prompt }
])

// ---------------------------------------------------------------- follow or customize, per layer
// Only at a group or an account, and not in a preview of what applies.
const toggles = computed(() => layered.value && !showEffective.value)
const modeOptions = computed<SelectOption[]>(() => [{ value: 'follow', label: t('ccgateway.layers.followParent') }, { value: 'custom', label: t('ccgateway.layers.custom') }])
const modeOf = (layer: FeatureLayer) => layerCustomized(overrides.value, layer) ? 'custom' : 'follow'
const modeLabel = (layer: FeatureLayer) => t('ccgateway.layers.layerMode', { layer: layer === 'level' ? t('ccgateway.levels.title') : t('ccgateway.levels.layerNames.' + layer) })
// Customizing copies every inherited value of the layer; following deletes them.
function setMode(layer: FeatureLayer, mode: unknown) {
  if (!props.inherited) return
  overrides.value = mode === 'custom' ? customizeLayer(overrides.value, props.inherited, layer) : followLayer(overrides.value, layer)
}
const editable = (layer: FeatureLayer) => !props.disabled && !showEffective.value && !locked(layer) && (!layered.value || layerCustomized(overrides.value, layer))

// Every edit goes to the policy (global) or the overrides (group, account),
// writing only the field it sets.
function edit(change: (draft: FeatureOverrides) => void) {
  const draft: FeatureOverrides = JSON.parse(JSON.stringify(layered.value ? overrides.value : policy.value))
  change(draft)
  if (layered.value) overrides.value = draft
  else policy.value = draft as RequestPolicy
}
// Saving writes the level only; relay_mode follows from it in the core.
const setLevel = (value: unknown) => edit(draft => { draft.level = value as RequestLevel; delete draft.relay_mode })

// Which layer the applied values came from (account previews only).
function origin(key: string) {
  const source = props.sources?.[key]
  return source ? t('ccgateway.layers.source', { source: t('ccgateway.layers.' + source) }) : undefined
}
const layerKeys: Record<FeatureLayer, string[]> = {
  level: ['level'],
  billing: ['build_billing_entrypoint', 'build_billing_sources.'],
  environment: ['build_attachment_sources.', 'build_injection.attachments.'],
  prompt: ['build_injection.system_prompt', 'build_injection.tools.']
}
function layerOrigin(layer: FeatureLayer) {
  const found = new Set(Object.entries(props.sources ?? {}).filter(([key]) => layerKeys[layer].some(prefix => prefix.endsWith('.') ? key.startsWith(prefix) : key === prefix)).map(([, source]) => source))
  const list = ['global', 'group', 'account'].filter(source => found.has(source))
  return list.length ? t('ccgateway.layers.source', { source: list.map(source => t('ccgateway.layers.' + source)).join(t('ccgateway.levels.convertSummary.list')) }) : undefined
}

// ---------------------------------------------------------------- billing header
const entrypointOptions = billingEntrypoints.map(value => ({ value, label: value }))
const entrypoint = computed(() => view.value.build_billing_entrypoint ?? defaultBillingEntrypoint)
const setEntrypoint = (value: unknown) => edit(draft => { draft.build_billing_entrypoint = value as BillingEntrypoint })
const sourceOptions = computed<SelectOption[]>(() => (['client', 'worker'] as const).map(value => ({ value, label: t('ccgateway.layers.billingSources.' + value) })))
const billingSource = (field: BillingField) => view.value.build_billing_sources?.[field] ?? 'client'
const setBillingSource = (field: BillingField, value: unknown) => edit(draft => { draft.build_billing_sources = { ...draft.build_billing_sources, [field]: value as 'client' | 'worker' } })

// ---------------------------------------------------------------- environment
const envGroups: Array<{ key: string; fields: BuildAttachmentField[] }> = [
  { key: 'runtime', fields: ['platform_name', 'os_version', 'shell'] },
  { key: 'directories', fields: ['primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory'] },
  { key: 'tools', fields: ['github_cli', 'agent_proxy'] }
]
const envSource = (field: BuildAttachmentField) => view.value.build_attachment_sources?.[field] ?? 'client'
const envColumns = computed(() => ['client', 'worker', 'erase'].map(value => ({ value, label: t('ccgateway.buildAttachments.' + value) })))
const envMatrix = computed(() => Object.fromEntries(buildAttachmentFields.map(field => ['build_attachment_sources.' + field, envSource(field)])))
const envSections = computed<OptionMatrixGroup[]>(() => envGroups.map(group => ({
  key: group.key,
  label: t('ccgateway.layers.' + group.key),
  rows: group.fields.map((field): OptionMatrixRow => ({ key: 'build_attachment_sources.' + field, label: t('ccgateway.layers.fields.' + field), hint: origin('build_attachment_sources.' + field), testid: 'build-attachment-' + field }))
})))
// `change` carries only the cells one interaction set.
const setEnvSources = (patch: Record<string, unknown>) => edit(draft => {
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

// ---------------------------------------------------------------- what a request without a billing header is given
// An omitted choice is its level's default (LevelInjection).
const injected = (part: 'attachments' | 'tools', name: string) =>
  (view.value.build_injection?.[part] as Record<string, boolean> | undefined)?.[name] ?? injectionDefault(part, name)
const systemPrompt = computed(() => view.value.build_injection?.system_prompt ?? injectionDefault('system_prompt'))
function setInjection(part: 'system_prompt' | 'attachments' | 'tools', name: string, on: boolean) {
  edit(draft => {
    const injection = { ...draft.build_injection }
    if (part === 'system_prompt') injection.system_prompt = on
    else injection[part] = { ...injection[part], [name]: on }
    draft.build_injection = injection
  })
}
const toolHints = computed(() => [
  { tools: 'Agent', text: t('ccgateway.levels.toolHints.Agent') },
  { tools: ['WebSearch', 'NotebookEdit'].join(t('ccgateway.levels.convertSummary.list')), text: t('ccgateway.levels.toolHints.deferred') }
])
const identityRules = computed(() => {
  const line = (name: string) => t('ccgateway.layers.identityLines.' + name)
  return [
    { entrypoints: ['cli'], line: line('official_cli') },
    { entrypoints: ['claude-desktop', 'claude-vscode'], line: line('official_cli_sdk') },
    { entrypoints: ['sdk-cli', 'sdk-ts', 'sdk-py'], line: t('ccgateway.levels.identityRule.sdk', { withPrompt: line('official_cli_sdk'), plain: line('agent_sdk') }) },
    { entrypoints: [], line: t('ccgateway.levels.identityRule.otherLine') }
  ]
})
</script>
<template>
  <section
    class="space-y-3"
    data-testid="request-policy"
  >
    <SSettingsGroup
      :title="t('ccgateway.levels.title')"
      :description="layerOrigin('level')"
      dense
      data-testid="request-level-group"
    >
      <template #actions>
        <SSegmented
          v-if="toggles"
          :model-value="modeOf('level')"
          :options="modeOptions"
          size="sm"
          :disabled="disabled"
          :aria-label="modeLabel('level')"
          data-testid="layer-mode-level"
          @update:model-value="setMode('level', $event)"
        />
      </template>
      <template #details>
        <p>{{ t('ccgateway.levels.hint') }}</p>
      </template>
      <div class="space-y-2 py-3">
        <SSegmented
          :model-value="level"
          :options="levelOptions"
          block
          :disabled="!editable('level')"
          :aria-label="t('ccgateway.levels.title')"
          data-testid="request-level"
          @update:model-value="setLevel"
        />
        <div
          class="flex flex-wrap items-center gap-1.5"
          data-testid="level-layers"
        >
          <SChip
            v-for="layer in includedLayers"
            :key="layer.key"
            size="xs"
            :tone="layer.on ? 'primary' : 'neutral'"
            :icon="layer.on ? 'check' : undefined"
            :class="layer.on ? '' : 'opacity-60'"
            :data-on="layer.on || undefined"
          >
            {{ t('ccgateway.levels.layerNames.' + layer.key) }}
          </SChip>
        </div>
        <p class="text-xs text-fg-muted">
          <span data-testid="level-desc">{{ t('ccgateway.levels.desc.' + level) }}</span>
          · <span data-testid="cli-version">CLI <span class="font-mono">{{ view.cli_version }}</span></span>
        </p>
      </div>
    </SSettingsGroup>

    <!-- Every level: a request without a billing header gets the main
    thread's full header; one with it has its two fields converted. -->
    <SSettingsGroup
      :title="t('ccgateway.layers.billing')"
      :description="layerOrigin('billing')"
      dense
      data-testid="billing-sources"
    >
      <template #actions>
        <SChip size="xs">
          {{ t('ccgateway.levels.from.billing') }}
        </SChip>
        <SSegmented
          v-if="toggles"
          :model-value="modeOf('billing')"
          :options="modeOptions"
          size="sm"
          :disabled="disabled"
          :aria-label="modeLabel('billing')"
          data-testid="layer-mode-billing"
          @update:model-value="setMode('billing', $event)"
        />
      </template>
      <SSettingRow
        :label="t('ccgateway.levels.billingMissing')"
        :description="t('ccgateway.levels.billingMissingHint')"
        size="sm"
        data-testid="billing-entrypoint"
      >
        <span class="text-xs text-fg-muted">{{ t('ccgateway.layers.entrypoint') }}</span>
        <SSelect
          :model-value="entrypoint"
          :options="entrypointOptions"
          :disabled="!editable('billing')"
          class="w-40"
          data-testid="billing-entrypoint-select"
          @update:model-value="setEntrypoint"
        />
      </SSettingRow>
      <SSettingRow
        :label="t('ccgateway.levels.billingPresent')"
        :description="t('ccgateway.levels.billingPresentHint')"
        size="sm"
        data-testid="billing-present"
      >
        <template
          v-for="field in billingFields"
          :key="field"
        >
          <span class="text-xs text-fg-muted">{{ t(field === 'cc_version' ? 'ccgateway.levels.version' : 'ccgateway.layers.entrypoint') }}</span>
          <SSegmented
            :model-value="billingSource(field)"
            :options="sourceOptions"
            size="sm"
            :disabled="!editable('billing')"
            :aria-label="t('ccgateway.layers.' + field)"
            :data-testid="'billing-' + field"
            @update:model-value="setBillingSource(field, $event)"
          />
        </template>
      </SSettingRow>
    </SSettingsGroup>

    <!-- The identity line has no settings: a request without one gets the line
    its billing header's entrypoint calls for. -->
    <SSettingsGroup
      :key="'identity-' + has.identity"
      :title="t('ccgateway.layers.identity')"
      :description="has.identity ? undefined : lockedText('identity')"
      :collapsible="!has.identity"
      :default-open="has.identity"
      dense
      data-testid="identity-lines"
      :data-locked="!has.identity || undefined"
    >
      <template
        v-if="has.identity"
        #actions
      >
        <SChip size="xs">
          {{ t('ccgateway.levels.from.identity') }}
        </SChip>
      </template>
      <div class="space-y-1 py-2.5">
        <p
          class="text-sm text-fg"
          data-testid="identity-adaptive"
        >
          {{ t('ccgateway.levels.identityAdaptive') }}
        </p>
        <SDisclosure
          :label="t('ccgateway.levels.identityRules')"
          :open-label="t('ccgateway.levels.identityRulesClose')"
          data-testid="identity-rules"
        >
          <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
            <template
              v-for="rule in identityRules"
              :key="rule.line"
            >
              <dt
                class="text-fg"
                :class="rule.entrypoints.length ? 'font-mono' : ''"
              >
                {{ rule.entrypoints.length ? rule.entrypoints.join(t('ccgateway.levels.convertSummary.list')) : t('ccgateway.levels.identityRule.other') }}
              </dt>
              <dd>{{ rule.line }}</dd>
            </template>
          </dl>
          <p class="mt-1.5">
            {{ t('ccgateway.levels.identityRule.kept') }}
          </p>
        </SDisclosure>
      </div>
    </SSettingsGroup>

    <!-- A layer above the level is folded with the level it needs; opened, it
    shows its kept choices read-only. The key resets the fold on a level change. -->
    <SSettingsGroup
      :key="'environment-' + has.environment"
      :title="t('ccgateway.layers.environment')"
      :description="has.environment ? layerOrigin('environment') : lockedText('environment')"
      :collapsible="!has.environment"
      :default-open="has.environment"
      dense
      data-testid="build-attachments"
      :data-locked="!has.environment || undefined"
    >
      <template #actions>
        <SChip
          v-if="has.environment"
          size="xs"
        >
          {{ t('ccgateway.levels.from.environment') }}
        </SChip>
        <SSegmented
          v-if="toggles"
          :model-value="modeOf('environment')"
          :options="modeOptions"
          size="sm"
          :disabled="disabled || locked('environment')"
          :aria-label="modeLabel('environment')"
          data-testid="layer-mode-environment"
          @update:model-value="setMode('environment', $event)"
        />
      </template>
      <template
        v-if="has.environment"
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
            :pressed="injected('attachments', name)"
            :icon="injected('attachments', name) ? 'check' : undefined"
            :disabled="!editable('environment')"
            :data-testid="'injection-attachments-' + name"
            @update:pressed="setInjection('attachments', name, $event)"
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
            :disabled="!editable('environment')"
            :aria-label="t('ccgateway.levels.convert')"
            @change="setEnvSources"
          />
        </SDisclosure>
      </SSettingRow>
    </SSettingsGroup>

    <SSettingsGroup
      :key="'prompt-' + has.prompt"
      :title="t('ccgateway.levels.promptTools')"
      :description="has.prompt ? layerOrigin('prompt') : lockedText('prompt')"
      :collapsible="!has.prompt"
      :default-open="has.prompt"
      dense
      data-testid="prompt-tools"
      :data-locked="!has.prompt || undefined"
    >
      <template #actions>
        <SChip
          v-if="has.prompt"
          size="xs"
        >
          {{ t('ccgateway.levels.from.prompt') }}
        </SChip>
        <SSegmented
          v-if="toggles"
          :model-value="modeOf('prompt')"
          :options="modeOptions"
          size="sm"
          :disabled="disabled || locked('prompt')"
          :aria-label="modeLabel('prompt')"
          data-testid="layer-mode-prompt"
          @update:model-value="setMode('prompt', $event)"
        />
      </template>
      <template
        v-if="has.prompt"
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
          :disabled="!editable('prompt')"
          data-testid="injection-system_prompt"
          @update:model-value="setInjection('system_prompt', '', $event)"
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
              :pressed="injected('tools', name)"
              :icon="injected('tools', name) ? 'check' : undefined"
              :disabled="!editable('prompt')"
              :data-testid="'injection-tools-' + name"
              @update:pressed="setInjection('tools', name, $event)"
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
    <SDisclosure :label="t('ccgateway.layers.rules')">
      <p>{{ t('ccgateway.layers.rulesHint') }}</p>
    </SDisclosure>
  </section>
</template>
