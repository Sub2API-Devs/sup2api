<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SOptionMatrix, SSelect, SSettingRow, SSettingsGroup, SDisclosure } from '@sub2api/ui'
import type { OptionMatrixGroup, OptionMatrixRow } from '@sub2api/ui'
import { billingEntrypoints, billingFields, defaultBillingEntrypoint, defaultIdentityLine, featureDifferenceCount, identityLineChoices, injectionAttachments, injectionTools, mergeFeaturePolicy, type BillingEntrypoint, type BuildAttachmentField, type BuildInjection, type FeatureOverrides, type IdentityLineChoice, type RequestPolicy } from './requestPolicy'
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
const envOptions = computed(() => [...(layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : []), ...['client', 'worker', 'erase'].map(value => ({ value, label: t('ccgateway.buildAttachments.' + value) }))])
// Build fills a missing billing header either way; the choice is only whether
// the client's own fields are kept.
const billingOptions = computed(() => [...(layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : []),
  ...(['client', 'worker'] as const).map(value => ({ value, label: t('ccgateway.layers.billingSources.' + value) }))])
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
  else policy.value = next as RequestPolicy
}
function setMode(mode: unknown) {
  if (layered.value) {
    const next = { ...overrides.value }
    if (mode === 'follow') delete next.relay_mode
    else next.relay_mode = mode as 'direct' | 'build'
    overrides.value = next
  } else policy.value = { ...policy.value, relay_mode: mode as 'direct' | 'build' }
}
function differs(section: Section, field: string) {
  if (showEffective.value || !layered.value) return false
  const source = value(section, field)
  return source !== 'follow' && source !== (sourcesOf(props.inherited, section)[field] ?? 'client')
}
// Which layer the applied value came from (account previews only).
function origin(section: string, field?: string) {
  const source = props.sources?.[field ? section + '.' + field : section]
  return source ? t('ccgateway.layers.source', { source: t('ccgateway.layers.' + source) }) : undefined
}
// The entrypoint build writes and, per entrypoint, its identity line: one
// value each, so plain selects; follow drops the key from the overrides.
const followOption = computed(() => layered.value ? [{ value: 'follow', label: t('ccgateway.layers.follow') }] : [])
const entrypointOptions = computed(() => [...followOption.value, ...billingEntrypoints.map(value => ({ value, label: value }))])
const entrypointValue = computed(() => showEffective.value ? resolved.value.build_billing_entrypoint ?? defaultBillingEntrypoint
  : layered.value ? overrides.value.build_billing_entrypoint ?? 'follow' : policy.value.build_billing_entrypoint ?? defaultBillingEntrypoint)
function setEntrypoint(value: unknown) {
  if (layered.value) {
    const next = { ...overrides.value }
    if (value === 'follow') delete next.build_billing_entrypoint
    else next.build_billing_entrypoint = value as BillingEntrypoint
    overrides.value = next
  } else policy.value = { ...policy.value, build_billing_entrypoint: value as BillingEntrypoint }
}
const lineOptions = (entrypoint: BillingEntrypoint) => [...followOption.value,
  ...[...identityLineChoices[entrypoint], 'none'].map(value => ({ value, label: t('ccgateway.layers.identityLines.' + value) }))]
function lineValue(entrypoint: BillingEntrypoint) {
  if (showEffective.value) return resolved.value.build_identity_lines?.[entrypoint] ?? defaultIdentityLine(entrypoint)
  if (layered.value) return overrides.value.build_identity_lines?.[entrypoint] ?? 'follow'
  return policy.value.build_identity_lines?.[entrypoint] ?? defaultIdentityLine(entrypoint)
}
function setLine(entrypoint: BillingEntrypoint, value: unknown) {
  const lines = { ...(layered.value ? overrides.value : policy.value).build_identity_lines }
  if (value === 'follow') delete lines[entrypoint]
  else lines[entrypoint] = value as IdentityLineChoice
  if (!layered.value) policy.value = { ...policy.value, build_identity_lines: lines }
  else {
    const next: FeatureOverrides = { ...overrides.value, build_identity_lines: lines }
    if (!Object.keys(lines).length) delete next.build_identity_lines
    overrides.value = next
  }
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
// A request without a billing header is given, per choice, Claude Code's
// system prompt, attachments and tools (2026-10-23). Row keys are paths in
// build_injection; on/off maps to true/false, follow drops the key.
type InjectionPart = 'attachments' | 'tools'
const injectionOptions = computed(() => [...followOption.value, { value: 'on', label: t('ccgateway.injection.on') }, { value: 'off', label: t('ccgateway.injection.off') }])
const injectionOf = (p: RequestPolicy | FeatureOverrides | undefined): BuildInjection => p?.build_injection ?? {}
function injectionChoice(path: string, from: BuildInjection): boolean | undefined {
  const [part, name] = path.split('.') as [string, string | undefined]
  return part === 'system_prompt' ? from.system_prompt : (from[part as InjectionPart] as Record<string, boolean> | undefined)?.[name!]
}
function injectionValue(path: string) {
  const own = injectionChoice(path, injectionOf(showEffective.value ? resolved.value : layered.value ? overrides.value : policy.value))
  if (own === undefined) return layered.value && !showEffective.value ? 'follow' : 'off'
  return own ? 'on' : 'off'
}
function applyInjection(patch: Record<string, unknown>) {
  const next: BuildInjection = JSON.parse(JSON.stringify(injectionOf(layered.value ? overrides.value : policy.value)))
  for (const [key, value] of Object.entries(patch)) {
    const [part, name] = key.replace(/^build_injection./, '').split('.') as [string, string | undefined]
    const on = value === 'follow' ? undefined : value === 'on'
    if (part === 'system_prompt') {
      if (on === undefined) delete next.system_prompt
      else next.system_prompt = on
      continue
    }
    const set = { ...(next[part as InjectionPart] as Record<string, boolean> | undefined) }
    if (on === undefined) delete set[name!]
    else set[name!] = on
    if (Object.keys(set).length) (next as Record<string, unknown>)[part] = set
    else delete next[part as InjectionPart]
  }
  const empty = !Object.keys(next).length
  if (layered.value) {
    const value = { ...overrides.value }
    if (empty) delete value.build_injection
    else value.build_injection = next
    overrides.value = value
  } else policy.value = { ...policy.value, build_injection: next }
}
const injectionMatrix = computed(() => Object.fromEntries(['system_prompt', ...injectionAttachments.map(k => 'attachments.' + k), ...injectionTools.map(k => 'tools.' + k)]
  .map(path => ['build_injection.' + path, injectionValue(path)])))
function injectionRow(path: string, label: string): OptionMatrixRow {
  const own = injectionChoice(path, injectionOf(layered.value ? overrides.value : undefined))
  const inherited = injectionChoice(path, injectionOf(props.inherited)) ?? false
  return { key: 'build_injection.' + path, label, hint: origin('build_injection.' + path),
    marked: layered.value && !showEffective.value && own !== undefined && own !== inherited,
    effective: injectionChoice(path, injectionOf(resolved.value)) ? 'on' : 'off', testid: 'injection-' + path.replace('.', '-') }
}
const injectionSections = computed<OptionMatrixGroup[]>(() => [
  { key: 'prompt', label: t('ccgateway.injection.prompt'), rows: [injectionRow('system_prompt', t('ccgateway.injection.systemPrompt'))] },
  { key: 'attachments', label: t('ccgateway.injection.attachments'), rows: injectionAttachments.map(k => injectionRow('attachments.' + k, t('ccgateway.injection.attachment.' + k))) },
  { key: 'tools', label: t('ccgateway.injection.tools'), defaultOpen: false, rows: injectionTools.map(k => injectionRow('tools.' + k, k)) }
])
// What the effective policy adds up to, so the header says what the form does.
const summary = computed(() => {
  if (resolved.value.relay_mode !== 'build') return []
  const count = (section: Section, fields: readonly string[], source: string) => fields.filter(field => sourcesOf(resolved.value, section)[field] === source).length
  const chips = [
    ['summaryBilling', count('build_billing_sources', billingFields, 'worker')],
    ['summaryEnv', count('build_attachment_sources', envFields, 'worker')],
    ['summaryErase', count('build_attachment_sources', envFields, 'erase')]
  ].filter(([, n]) => n).map(([key, n]) => t('ccgateway.layers.' + key, { n }))
  const added = Object.entries(injectionMatrix.value).filter(([key]) => injectionChoice(key.replace(/^build_injection./, ''), injectionOf(resolved.value))).length
  return added ? [...chips, t('ccgateway.injection.summary', { n: added })] : chips
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
      <!-- What direct does on its own, with no setting (2026-10-21 decision);
      build's user_id and identity line need no row (2026-10-22). -->
      <SSettingRow
        v-if="resolved.relay_mode === 'direct'"
        :label="t('ccgateway.cliProfile.request')"
        :description="t('ccgateway.buildAttachments.directHint')"
        size="sm"
        data-testid="direct-hint"
      />
    </SSettingsGroup>
    <!-- The billing header is required in both modes and the identity line is
    chosen per entrypoint in both (2026-10-22); the field sources are build's. -->
    <SSettingsGroup
      :title="t('ccgateway.layers.billing')"
      dense
      data-testid="billing-sources"
    >
      <div
        v-if="resolved.relay_mode !== 'direct'"
        class="py-2"
      >
        <SOptionMatrix
          :model-value="billingMatrix"
          :columns="billingOptions"
          :rows="billingRows"
          column-width="8rem"
          :disabled="disabled"
          :aria-label="t('ccgateway.layers.billing')"
          @change="applySources"
        />
      </div>
      <SSettingRow
        :label="t('ccgateway.layers.entrypoint')"
        :description="origin('build_billing_entrypoint') ?? t('ccgateway.layers.entrypointHint')"
        size="sm"
        data-testid="billing-entrypoint"
      >
        <SSelect
          :model-value="entrypointValue"
          :options="entrypointOptions"
          :disabled="disabled"
          data-testid="billing-entrypoint-select"
          @update:model-value="setEntrypoint"
        />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup
      :title="t('ccgateway.layers.identity')"
      dense
      data-testid="identity-lines"
    >
      <template #details>
        <p>{{ t('ccgateway.layers.identityHint') }}</p>
      </template>
      <SSettingRow
        v-for="entrypoint in billingEntrypoints"
        :key="entrypoint"
        :description="origin('build_identity_lines', entrypoint)"
        size="sm"
        :data-testid="'identity-line-' + entrypoint"
      >
        <template #label>
          <span class="font-mono">{{ entrypoint }}</span>
        </template>
        <SSelect
          :model-value="lineValue(entrypoint)"
          :options="lineOptions(entrypoint)"
          :disabled="disabled"
          :data-testid="'identity-line-select-' + entrypoint"
          @update:model-value="value => setLine(entrypoint, value)"
        />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup
      v-if="resolved.relay_mode !== 'direct'"
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
          :columns="envOptions"
          :groups="envSections"
          collapsible
          :disabled="disabled"
          :aria-label="t('ccgateway.layers.environment')"
          @change="applySources"
        />
      </div>
    </SSettingsGroup>
    <SSettingsGroup
      v-if="resolved.relay_mode !== 'direct'"
      :title="t('ccgateway.injection.title')"
      dense
      data-testid="build-injection"
    >
      <template #details>
        <p>{{ t('ccgateway.injection.hint') }}</p>
        <p>{{ t('ccgateway.injection.toolsHint') }}</p>
      </template>
      <div class="py-2">
        <SOptionMatrix
          :model-value="injectionMatrix"
          :columns="injectionOptions"
          :groups="injectionSections"
          collapsible
          :disabled="disabled"
          :aria-label="t('ccgateway.injection.title')"
          @change="applyInjection"
        />
      </div>
    </SSettingsGroup>
    <SDisclosure :label="t('ccgateway.layers.rules')">
      <p>{{ t('ccgateway.layers.rulesHint') }}</p>
    </SDisclosure>
  </section>
</template>
