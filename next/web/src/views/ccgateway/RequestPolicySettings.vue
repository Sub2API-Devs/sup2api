<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SInput, SSelect, SSettingRow, SSettingsGroup, SDisclosure } from '@sub2api/ui'
import { billingFields, featureDifferenceCount, mergeFeaturePolicy, type BuildAttachmentField, type FeatureOverrides, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const overrides = defineModel<FeatureOverrides>('overrides', { default: () => ({}) })
const props = defineProps<{ inherited?: RequestPolicy; disabled?: boolean; sources?: Record<string, string>; effective?: RequestPolicy; showSavedWhenDisabled?: boolean }>()
const { t } = useI18n()
const layered = computed(() => !!props.inherited)
const resolved = computed(() => props.effective ?? (props.inherited ? mergeFeaturePolicy(props.inherited, overrides.value) : policy.value))
const envGroups: Array<{ key: string; fields: BuildAttachmentField[] }> = [
  { key: 'runtime', fields: ['platform_name', 'os_version', 'shell'] },
  { key: 'directories', fields: ['primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory'] },
  { key: 'tools', fields: ['github_cli', 'agent_proxy'] }
]
function sourceOptions(erase = false) {
  return [...(layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : []), ...['client', 'worker', ...(erase ? ['erase'] : [])].map(value => ({ value, label: t('ccgateway.buildAttachments.' + value) }))]
}
const requestModes = computed(() => [...(layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : []), ...(['direct', 'build'] as const).map(value => ({ value, label: t('ccgateway.cliProfile.' + value) }))])
function value(section: 'build_attachment_sources' | 'build_billing_sources', field: string) {
  if (props.disabled && props.effective && !props.showSavedWhenDisabled) return (resolved.value[section] as Record<string, string>)?.[field] ?? 'client'
  return ((layered.value ? overrides.value : policy.value)[section] as Record<string, string>)?.[field] ?? (layered.value ? 'follow' : 'client')
}
function setSource(section: 'build_attachment_sources' | 'build_billing_sources', field: string, source: unknown) {
  const target = layered.value ? overrides.value : policy.value
  const fields = { ...target[section] } as Record<string, string>
  if (source === 'follow') delete fields[field]
  else fields[field] = String(source)
  if (layered.value) overrides.value = { ...overrides.value, [section]: fields }
  else policy.value = { ...policy.value, schema_version: 2, [section]: fields }
}
function setMode(mode: unknown) {
  if (layered.value) {
    const next = { ...overrides.value }
    if (mode === 'follow') delete next.relay_mode
    else next.relay_mode = mode as 'direct' | 'build'
    overrides.value = next
  } else policy.value = { ...policy.value, schema_version: 2, relay_mode: mode as 'direct' | 'build' }
}
function differs(section: 'build_attachment_sources' | 'build_billing_sources', field: string) {
  if (props.disabled && props.effective && !props.showSavedWhenDisabled) return false
  const source = value(section, field)
  return layered.value && source !== 'follow' && source !== ((props.inherited?.[section] as Record<string, string>)?.[field] ?? 'client')
}
function origin(section: string, field: string) {
  const path = section + '.' + field
  const source = props.sources?.[path]
  const originText = source ? t('ccgateway.layers.source', { source: t('ccgateway.layers.' + source) }) : ''
  if (!layered.value) return originText
  const selected = (resolved.value[section as 'build_attachment_sources' | 'build_billing_sources'] as Record<string, string>)?.[field] ?? 'client'
  return [t('ccgateway.layers.effective', { value: t('ccgateway.buildAttachments.' + selected) }), originText].filter(Boolean).join(' · ')
}
function groupCount(fields: BuildAttachmentField[]) {
  if (!props.inherited) return 0
  return featureDifferenceCount(props.inherited, { build_attachment_sources: Object.fromEntries(fields.filter(f => overrides.value.build_attachment_sources?.[f]).map(f => [f, overrides.value.build_attachment_sources![f]])) })
}
</script>
<template>
  <section
    class="space-y-4"
    data-testid="request-policy"
  >
    <SSettingsGroup
      :title="t('ccgateway.cliProfile.title')"
      data-testid="cli-request-mode"
    >
      <SSettingRow
        :label="t('ccgateway.cliProfile.mode')"
        :description="layered ? t('ccgateway.layers.effective', { value: resolved.relay_mode }) : ''"
      >
        <SSelect
          :model-value="disabled && effective && !showSavedWhenDisabled ? resolved.relay_mode : layered ? overrides.relay_mode ?? 'follow' : policy.relay_mode"
          :options="requestModes"
          :disabled="disabled"
          data-testid="relay-mode"
          @update:model-value="setMode"
        />
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.cliProfile.version')">
        <SInput
          model-value="2.1.304"
          readonly
          mono
          data-testid="cli-version"
        />
      </SSettingRow>
    </SSettingsGroup>
    <SHint
      v-if="resolved.relay_mode === 'direct'"
      data-testid="direct-hint"
    >
      {{ t('ccgateway.buildAttachments.directHint') }}
    </SHint>
    <SSettingsGroup
      :title="t('ccgateway.layers.billing')"
      :description="t('ccgateway.layers.billingHint')"
      data-testid="billing-sources"
    >
      <SSettingRow
        v-for="field in billingFields"
        :key="field"
        :label="t('ccgateway.layers.' + field)"
        :description="origin('build_billing_sources', field)"
        :class="differs('build_billing_sources', field) ? 'border-l-2 border-orange-400 pl-3' : ''"
      >
        <SSelect
          :model-value="value('build_billing_sources', field)"
          :options="sourceOptions()"
          :disabled="disabled || resolved.relay_mode !== 'build'"
          :data-testid="'billing-' + field"
          :aria-label="t('ccgateway.layers.' + field)"
          @update:model-value="setSource('build_billing_sources', field, $event)"
        />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup
      :title="t('ccgateway.buildAttachments.title')"
      :description="t('ccgateway.layers.environmentHint')"
      data-testid="build-attachments"
    >
      <SDisclosure
        v-for="group in envGroups"
        :key="group.key"
        variant="section"
        class="py-4"
        :label="t('ccgateway.layers.' + group.key) + (groupCount(group.fields) ? ' · ' + t('ccgateway.layers.differences', { n: groupCount(group.fields) }) : '')"
        :default-open="true"
      >
        <SSettingRow
          v-for="field in group.fields"
          :key="field"
          :label="t('ccgateway.layers.fields.' + field)"
          :description="origin('build_attachment_sources', field)"
          :class="differs('build_attachment_sources', field) ? 'border-l-2 border-orange-400 pl-3' : ''"
        >
          <SSelect
            :model-value="value('build_attachment_sources', field)"
            :options="sourceOptions(true)"
            :disabled="disabled || resolved.relay_mode !== 'build'"
            :data-testid="'build-attachment-' + field"
            :aria-label="t('ccgateway.layers.fields.' + field)"
            @update:model-value="setSource('build_attachment_sources', field, $event)"
          />
        </SSettingRow>
      </SDisclosure>
      <SHint class="py-3">
        {{ t('ccgateway.layers.executionHint') }}
      </SHint>
    </SSettingsGroup>
    <SDisclosure :label="t('ccgateway.layers.rules')">
      <p>{{ t('ccgateway.layers.rulesHint') }}</p>
    </SDisclosure>
  </section>
</template>
