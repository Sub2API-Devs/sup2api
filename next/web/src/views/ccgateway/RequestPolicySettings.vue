<script setup lang="ts">
// Request policy of the CCGateway (CONTRACTS §53, request levels): the level and
// the four layers it enables. The level card lives here; billing, environment
// and prompt are the layer cards, which read the shared context below.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SDisclosure, SSegmented, SSelect, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import type { SelectOption } from '@sub2api/ui'
import {
  defaultRequestLevel, levelHasEnvironment, levelHasIdentity, levelHasPromptAndTools, levelOf, mergeFeaturePolicy, requestLevels,
  type FeatureOverrides, type RequestLevel, type RequestPolicy
} from './requestPolicy'
import { providePolicyLayers } from './usePolicyLayerContext'
import BillingLayerCard from './policy/BillingLayerCard.vue'
import EnvironmentLayerCard from './policy/EnvironmentLayerCard.vue'
import PromptLayerCard from './policy/PromptLayerCard.vue'

const policy = defineModel<RequestPolicy>({ required: true })
const overrides = defineModel<FeatureOverrides>('overrides', { default: () => ({}) })
const props = defineProps<{ inherited?: RequestPolicy; disabled?: boolean; sources?: Record<string, string>; effective?: RequestPolicy; showSavedWhenDisabled?: boolean }>()
const { t } = useI18n()

// What the level card shows: the applied policy in a preview, else the draft
// (over its parent at a group or an account).
const layers = providePolicyLayers({
  draft: () => (props.inherited ? mergeFeaturePolicy(props.inherited, overrides.value) : policy.value),
  effective: () => props.effective,
  disabled: () => props.disabled,
  inherited: () => props.inherited,
  sources: () => props.sources,
  showSavedWhenDisabled: () => props.showSavedWhenDisabled,
  overrides: () => overrides.value,
  setOverrides: (next) => { overrides.value = next },
  setPolicy: (next) => { policy.value = next }
})

// ---------------------------------------------------------------- level
const levelName = (value: RequestLevel) => t('ccgateway.levels.names.' + value)
const level = computed(() => levelOf(layers.view))
const levelOptions = computed<SelectOption[]>(() => requestLevels.map(value => ({ value, label: levelName(value) + (value === defaultRequestLevel ? t('ccgateway.levels.defaultMark') : '') })))
const includedLayers = computed(() => [
  { key: 'billing', on: true },
  { key: 'identity', on: levelHasIdentity(level.value) },
  { key: 'environment', on: levelHasEnvironment(level.value) },
  { key: 'prompt', on: levelHasPromptAndTools(level.value) }
])
// Saving writes the level only; relay_mode follows from it in the core.
const setLevel = (value: unknown) => layers.edit(draft => { draft.level = value as RequestLevel; delete draft.relay_mode })

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
      :description="layers.layerOrigin('level')"
      dense
      data-testid="request-level-group"
    >
      <template #actions>
        <SSegmented
          v-if="layers.toggles"
          :model-value="layers.modeOf('level')"
          :options="layers.modeOptions"
          size="sm"
          :disabled="layers.disabled"
          :aria-label="layers.modeLabel('level')"
          data-testid="layer-mode-level"
          @update:model-value="layers.setMode('level', $event)"
        />
      </template>
      <template #details>
        <p>{{ t('ccgateway.levels.hint') }}</p>
      </template>
      <!-- The level is one choice; what it fixes (the layers it enables, the
      mode it sends with) is read beside it. -->
      <SSettingRow
        size="sm"
        data-testid="request-level-row"
      >
        <template #label>
          <span data-testid="level-desc">{{ t('ccgateway.levels.desc.' + level) }}</span>
        </template>
        <template #description>
          <span
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
            <span data-testid="cli-version">CLI <span class="font-mono">{{ layers.view.cli_version }}</span></span>
          </span>
        </template>
        <SSelect
          :model-value="level"
          :options="levelOptions"
          :disabled="!layers.editable('level')"
          :aria-label="t('ccgateway.levels.title')"
          class="w-40"
          data-testid="request-level"
          @update:model-value="setLevel"
        />
      </SSettingRow>
    </SSettingsGroup>

    <BillingLayerCard />

    <!-- The identity line has no settings: a request without one gets the line
    its billing header's entrypoint calls for. -->
    <SSettingsGroup
      :key="'identity-' + layers.has.identity"
      :title="t('ccgateway.layers.identity')"
      :description="layers.has.identity ? undefined : layers.lockedText('identity')"
      :collapsible="!layers.has.identity"
      :default-open="layers.has.identity"
      dense
      data-testid="identity-lines"
      :data-locked="!layers.has.identity || undefined"
    >
      <template
        v-if="layers.has.identity"
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

    <EnvironmentLayerCard />
    <PromptLayerCard />
    <SDisclosure :label="t('ccgateway.layers.rules')">
      <p>{{ t('ccgateway.layers.rulesHint') }}</p>
    </SDisclosure>
  </section>
</template>
