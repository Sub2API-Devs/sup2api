<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SHint, SOptionMatrix, SSelect, SSettingRow, SSettingsGroup, SDisclosure } from '@sub2api/ui'
import type { OptionMatrixGroup, OptionMatrixRow } from '@sub2api/ui'
import { billingFields, featureDifferenceCount, mergeFeaturePolicy, type BuildAttachmentField, type FeatureOverrides, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const overrides = defineModel<FeatureOverrides>('overrides', { default: () => ({}) })
const props = defineProps<{ inherited?: RequestPolicy; disabled?: boolean; sources?: Record<string, string>; effective?: RequestPolicy; showSavedWhenDisabled?: boolean }>()
const { t } = useI18n()
type Section = 'build_attachment_sources' | 'build_billing_sources'
const layered = computed(() => !!props.inherited)
const resolved = computed(() => props.effective ?? (props.inherited ? mergeFeaturePolicy(props.inherited, overrides.value) : policy.value))
// A read-only preview shows what applies rather than the stored draft.
const showEffective = computed(() => !!props.disabled && !!props.effective && !props.showSavedWhenDisabled)
// Billing and the environment are two matrices; a row key is the field's path
// in the policy, so both write through applySources.
const envGroups: Array<{ key: string; fields: BuildAttachmentField[] }> = [
  { key: 'runtime', fields: ['platform_name', 'os_version', 'shell'] },
  { key: 'directories', fields: ['primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory'] },
  { key: 'tools', fields: ['github_cli', 'agent_proxy'] }
]
const envFields = envGroups.flatMap(group => group.fields)
function sourceOptions(erase: boolean) {
  return [...(layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : []), ...['client', 'worker', ...(erase ? ['erase'] : [])].map(value => ({ value, label: t('ccgateway.buildAttachments.' + value) }))]
}
const requestModes = computed(() => [...(layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : []), ...(['direct', 'build'] as const).map(value => ({ value, label: t('ccgateway.cliProfile.' + value) }))])
const sourcesOf = (policy: RequestPolicy | FeatureOverrides | undefined, section: Section) => (policy?.[section] ?? {}) as Record<string, string>
function value(section: Section, field: string) {
  if (showEffective.value) return sourcesOf(resolved.value, section)[field] ?? 'client'
  return sourcesOf(layered.value ? overrides.value : policy.value, section)[field] ?? (layered.value ? 'follow' : 'client')
}
// `change` carries only the cells this interaction set, so an explicit choice is
// stored even when it matches what the row already showed, and the untouched
// fields are never materialized into stored sources.
function applySources(patch: Record<string, unknown>) {
  let next: RequestPolicy | FeatureOverrides = layered.value ? overrides.value : policy.value
  for (const [path, source] of Object.entries(patch)) {
    const [section, field] = path.split('.') as [Section, string]
    const fields: Record<string, string> = { ...sourcesOf(next, section) }
    if (source === 'follow') delete fields[field]
    else fields[field] = String(source)
    next = { ...next, [section]: fields }
  }
  if (layered.value) overrides.value = next as FeatureOverrides
  else policy.value = { ...(next as RequestPolicy), schema_version: 2 }
}
function setMode(mode: unknown) {
  if (layered.value) {
    const next = { ...overrides.value }
    if (mode === 'follow') delete next.relay_mode
    else next.relay_mode = mode as 'direct' | 'build'
    overrides.value = next
  } else policy.value = { ...policy.value, schema_version: 2, relay_mode: mode as 'direct' | 'build' }
}
function differs(section: Section, field: string) {
  if (showEffective.value || !layered.value) return false
  const source = value(section, field)
  return source !== 'follow' && source !== (sourcesOf(props.inherited, section)[field] ?? 'client')
}
// Which layer the applied value came from (account previews only).
function origin(section: Section, field: string) {
  const source = props.sources?.[section + '.' + field]
  return source ? t('ccgateway.layers.source', { source: t('ccgateway.layers.' + source) }) : undefined
}
function groupCount(fields: readonly string[]) {
  if (!props.inherited) return 0
  const own = sourcesOf(overrides.value, 'build_attachment_sources')
  return featureDifferenceCount(props.inherited, { build_attachment_sources: Object.fromEntries(fields.filter(f => own[f]).map(f => [f, own[f]])) })
}
function row(section: Section, field: string, label: string, testid: string): OptionMatrixRow {
  return {
    key: section + '.' + field,
    label: t(label),
    hint: origin(section, field),
    marked: differs(section, field),
    effective: sourcesOf(resolved.value, section)[field] ?? 'client',
    testid
  }
}
const matrixOf = (section: Section, fields: readonly string[]) => Object.fromEntries(fields.map(field => [section + '.' + field, value(section, field)]))
const billingMatrix = computed(() => matrixOf('build_billing_sources', billingFields))
const envMatrix = computed(() => matrixOf('build_attachment_sources', envFields))
const billingRows = computed(() => billingFields.map(field => row('build_billing_sources', field, 'ccgateway.layers.' + field, 'billing-' + field)))
// The global layer shows every group; a layer over a parent opens only the
// groups it changes, so a group that follows everywhere is just its header row.
const envSections = computed<OptionMatrixGroup[]>(() => envGroups.map(group => {
  const changed = groupCount(group.fields)
  return {
    key: group.key,
    label: t('ccgateway.layers.' + group.key),
    badge: changed ? t('ccgateway.layers.differences', { n: changed }) : undefined,
    defaultOpen: !layered.value || changed > 0,
    rows: group.fields.map(field => row('build_attachment_sources', field, 'ccgateway.layers.fields.' + field, 'build-attachment-' + field))
  }
}))
// What the effective policy adds up to, so the header says what the form does.
const summary = computed(() => {
  if (resolved.value.relay_mode !== 'build') return []
  const count = (section: Section, fields: readonly string[], source: string) => fields.filter(field => sourcesOf(resolved.value, section)[field] === source).length
  return [
    ['summaryBilling', count('build_billing_sources', billingFields, 'worker')],
    ['summaryEnv', count('build_attachment_sources', envFields, 'worker')],
    ['summaryErase', count('build_attachment_sources', envFields, 'erase')]
  ].filter(([, n]) => n).map(([key, n]) => t('ccgateway.layers.' + key, { n }))
})
</script>
<template>
  <section
    class="space-y-3"
    data-testid="request-policy"
  >
    <SSettingsGroup
      :title="t('ccgateway.cliProfile.title')"
      dense
      data-testid="cli-request-mode"
    >
      <template
        v-if="summary.length"
        #actions
      >
        <SChip
          v-for="text in summary"
          :key="text"
          size="xs"
        >
          {{ text }}
        </SChip>
      </template>
      <SSettingRow
        :label="t('ccgateway.cliProfile.mode')"
        size="sm"
      >
        <template #description>
          <span data-testid="cli-version">CLI <span class="font-mono">{{ resolved.cli_version }}</span></span>
          <template v-if="layered">
            · {{ t('ccgateway.layers.effective', { value: resolved.relay_mode }) }}
          </template>
        </template>
        <SSelect
          :model-value="showEffective ? resolved.relay_mode : layered ? overrides.relay_mode ?? 'follow' : policy.relay_mode"
          :options="requestModes"
          :disabled="disabled"
          data-testid="relay-mode"
          @update:model-value="setMode"
        />
      </SSettingRow>
    </SSettingsGroup>
    <SHint
      v-if="resolved.relay_mode === 'direct'"
      data-testid="direct-hint"
    >
      {{ t('ccgateway.buildAttachments.directHint') }}
    </SHint>
    <template v-else>
      <SSettingsGroup
        :title="t('ccgateway.layers.billing')"
        dense
        data-testid="billing-sources"
      >
        <template #details>
          {{ t('ccgateway.layers.billingHint') }}
        </template>
        <div class="py-2">
          <SOptionMatrix
            :model-value="billingMatrix"
            :columns="sourceOptions(false)"
            :rows="billingRows"
            :disabled="disabled"
            :aria-label="t('ccgateway.layers.billing')"
            @change="applySources"
          />
        </div>
      </SSettingsGroup>
      <SSettingsGroup
        :title="t('ccgateway.layers.environment')"
        dense
        data-testid="build-attachments"
      >
        <template #details>
          <p>{{ t('ccgateway.layers.environmentHint') }}</p>
          <p>{{ t('ccgateway.layers.executionHint') }}</p>
        </template>
        <div class="py-2">
          <SOptionMatrix
            :model-value="envMatrix"
            :columns="sourceOptions(true)"
            :groups="envSections"
            collapsible
            :disabled="disabled"
            :aria-label="t('ccgateway.layers.environment')"
            @change="applySources"
          />
        </div>
      </SSettingsGroup>
    </template>
    <SDisclosure :label="t('ccgateway.layers.rules')">
      <p>{{ t('ccgateway.layers.rulesHint') }}</p>
    </SDisclosure>
  </section>
</template>
