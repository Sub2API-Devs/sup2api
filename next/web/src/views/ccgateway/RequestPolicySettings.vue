<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { attachmentTypes, defaultRequestPolicy, type AttachmentType, type AttachmentSource, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
function setAttachmentSource(type: AttachmentType, event: Event) {
 const value = (event.target as HTMLSelectElement).value
 const sources = { ...policy.value.attachment_sources }
 if (value) sources[type] = value as AttachmentSource
 else delete sources[type]
 policy.value = { ...policy.value, attachment_sources: sources }
}
function setEnvironmentField(field: 'workingDirectory' | 'platform', event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const fields = { ...policy.value.environment_fields }
  if (value) fields[field] = value as 'client' | 'gateway'
  else delete fields[field]
  policy.value = { ...policy.value, environment_fields: fields }
}
const supportedBetas = defaultRequestPolicy().betas
const bodyFeatures = [
  { id: 'model', field: 'model' },
  { id: 'output', field: 'max_tokens' },
  { id: 'stream', field: 'stream' },
  { id: 'system', field: 'system' },
  { id: 'midSystem', field: 'messages[].role: system' },
  { id: 'tools', field: 'tools[].name / description / input_schema / defer_loading' },
  { id: 'choice', field: 'tool_choice.type' },
  { id: 'thinking', field: 'thinking.type / budget_tokens' },
  { id: 'cache', field: 'cache_control.type / ttl' },
  { id: 'schema', field: 'output_config.format / output_format' },
  { id: 'effort', field: 'output_config.effort' },
  { id: 'speed', field: 'speed' }
] as const
</script>
<template>
  <section class="space-y-5 rounded-xl border border-gray-200 p-4 dark:border-dark-700" data-testid="request-policy">
    <div>
      <h4 class="font-semibold">
        {{ t('ccgateway.policy.title') }}
      </h4>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('ccgateway.policy.hint') }}
      </p>
    </div>
    <div>
      <h5 class="font-semibold">
        {{ t('ccgateway.policy.headerTitle') }}
      </h5>
      <p class="mt-1 text-xs leading-5 text-gray-500">
        {{ t('ccgateway.policy.headerHint') }}
      </p>
    </div>

    <div class="space-y-2">
      <h6 class="font-mono text-sm font-medium">anthropic-beta</h6>
      <p class="text-xs leading-5 text-gray-500">
        {{ t('ccgateway.policy.betaValuesHint') }}
      </p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <div v-for="rule in supportedBetas" :key="rule.name" class="rounded-lg bg-gray-50 p-3 dark:bg-dark-800">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <code class="break-all text-xs">{{ rule.name }}</code
          ><span class="text-xs text-teal-600">{{ t(`ccgateway.policy.mapping_${rule.mapping}`) }}</span>
        </div>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{
            t(
              `ccgateway.policy.description_${rule.mapping === 'forward' && rule.name === 'context-1m-2025-08-07' ? 'context' : rule.mapping}`
            )
          }}
        </p>
      </div>
    </div>
    <fieldset class="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-800">
      <legend class="float-left w-full text-sm font-medium">
        {{ t('ccgateway.policy.unknownBeta') }}
      </legend>
      <label
        v-for="action in ['ignore', 'reject'] as const"
        :key="action"
        class="flex clear-both cursor-pointer items-center gap-2 text-sm"
      >
        <input v-model="policy.unknown_beta" type="radio" :value="action" data-testid="unknown-beta" />{{ t(`ccgateway.policy.${action}`) }}
      </label>
    </fieldset>
    <div>
      <h5 class="font-semibold">
        {{ t('ccgateway.policy.bodyTitle') }}
      </h5>
      <p class="mt-1 text-xs leading-5 text-gray-500">
        {{ t('ccgateway.policy.bodyHint') }}
      </p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-dark-700">
        <input v-model="policy.allow_fast" type="checkbox" class="mt-1" data-testid="allow-fast" />
        <span class="min-w-0"
          ><span class="block text-sm font-medium">{{ t('ccgateway.policy.fast') }}</span>
          <span class="mt-2 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.fastHint') }}</span>
        </span>
      </label>
      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-dark-700">
        <input v-model="policy.allow_effort" type="checkbox" class="mt-1" data-testid="allow-effort" />
        <span class="min-w-0"
          ><span class="block text-sm font-medium">{{ t('ccgateway.policy.effort') }}</span>
          <span class="mt-2 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.effortHint') }}</span>
        </span>
      </label>
    </div>
    <label class="block rounded-lg border border-gray-200 p-4 dark:border-dark-700">
      <span class="block text-sm font-medium">{{ t('ccgateway.policy.toolSearch') }}</span>
      <span class="mt-1 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.toolSearchHint') }}</span>
      <select v-model="policy.tool_search" class="input mt-3 w-full">
        <option v-for="mode in ['request', 'false', 'true', 'auto']" :key="mode" :value="mode">
          {{ t(`ccgateway.policy.search_${mode}`) }}
        </option>
        <option v-if="policy.tool_search?.startsWith('auto:')" :value="policy.tool_search">{{ policy.tool_search }}</option>
      </select>
    </label>
    <label class="block rounded-lg border border-gray-200 p-4 dark:border-dark-700">
      <span class="block text-sm font-medium">{{ t('ccgateway.policy.customToolPrefix') }}</span>
      <input v-model="policy.custom_tool_prefix" class="input mt-3 w-full" type="text" maxlength="32" placeholder="ccgateway" data-testid="custom-tool-prefix" />
      <span class="mt-2 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.customToolPrefixHint') }}</span>
      <code class="mt-2 block text-xs">mcp__{{ policy.custom_tool_prefix || 'ccgateway' }}__lookup</code>
    </label>
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-700">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-xs text-gray-500 dark:bg-dark-800">
          <tr>
            <th class="px-3 py-2">
              {{ t('ccgateway.policy.featureName') }}
            </th>
            <th class="px-3 py-2">
              {{ t('ccgateway.policy.requestField') }}
            </th>
            <th class="px-3 py-2">
              {{ t('ccgateway.policy.effect') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
          <tr v-for="f in bodyFeatures" :key="f.id">
            <td class="px-3 py-3 align-top">
              <span class="block whitespace-nowrap font-medium">{{ t(`ccgateway.policy.bodyFeatures.${f.id}.name`) }}</span>
            </td>
            <td class="px-3 py-3 align-top">
              <code class="text-xs">{{ f.field }}</code>
            </td>
            <td class="min-w-48 px-3 py-3 text-xs leading-5 text-gray-500">
              {{ t(`ccgateway.policy.bodyFeatures.${f.id}.hint`) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <h5 class="font-semibold">
      {{ t('ccgateway.policy.fallbackTitle') }}
    </h5>
    <div class="grid gap-3 lg:grid-cols-2">
      <fieldset class="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-800">
        <legend class="float-left w-full text-sm font-medium">
          {{ t('ccgateway.policy.unknownField') }}
        </legend>
        <label
          v-for="action in ['ignore', 'reject'] as const"
          :key="action"
          class="flex clear-both cursor-pointer items-center gap-2 text-sm"
        >
          <input v-model="policy.unknown_field" type="radio" :value="action" data-testid="unknown-field" />{{
            t(`ccgateway.policy.${action}`)
          }}
        </label>
      </fieldset>
    </div>
    <p class="text-xs leading-5 text-gray-500">
      {{ t('ccgateway.policy.ignoreHint') }}
    </p>
    <h5 class="font-semibold">
      {{ t('ccgateway.policy.upstreamErrorsTitle') }}
    </h5>
    <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-dark-700">
      <input v-model="policy.pass_upstream_errors" type="checkbox" class="mt-1" data-testid="pass-upstream-errors" />
      <span class="min-w-0"
        ><span class="block text-sm font-medium">{{ t('ccgateway.policy.passUpstreamErrors') }}</span>
        <span class="mt-2 block text-xs leading-5 text-gray-500">{{ t('ccgateway.policy.passUpstreamErrorsHint') }}</span>
      </span>
    </label>
    <h5 class="font-semibold">
      {{ t('ccgateway.policy.attachmentSourceTitle') }}
    </h5>
    <fieldset class="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-800">
      <legend class="float-left w-full text-sm font-medium">
        {{ t('ccgateway.policy.attachmentSourceLegend') }}
      </legend>
      <label
        v-for="source in ['client', 'gateway', 'both'] as const"
        :key="source"
        class="flex clear-both cursor-pointer items-center gap-2 text-sm"
      >
        <input v-model="policy.attachment_source" type="radio" :value="source" data-testid="attachment-source" />
        <span class="min-w-0">
          <span class="block font-medium">{{ t(`ccgateway.policy.attachmentSource_${source}`) }}</span>
          <span class="block text-xs text-gray-500">{{ t(`ccgateway.policy.attachmentSource_${source}_hint`) }}</span>
        </span>
      </label>
    </fieldset>
    <div class="space-y-3" data-testid="attachment-overrides">
      <p class="text-xs text-gray-500">{{ t('ccgateway.policy.attachmentRulesHint') }}</p>
      <template v-for="kind in attachmentTypes" :key="kind">
        <label class="flex items-center justify-between gap-4 text-sm">
          <span>{{ t('ccgateway.policy.attachmentType_' + kind) }}<small class="block text-gray-500">{{ t('ccgateway.policy.effectiveSource', { source: t('ccgateway.policy.attachmentSource_' + (policy.attachment_sources?.[kind] || policy.attachment_source)) }) }}</small></span>
          <select :value="policy.attachment_sources?.[kind] || ''" :data-testid="'attachment-' + kind" class="rounded border p-2 dark:bg-dark-800" @change="setAttachmentSource(kind, $event)">
            <option value="">{{ t('ccgateway.policy.attachmentInherit') }}</option>
            <option v-for="source in ['client', 'gateway', 'both']" :key="source" :value="source">{{ t('ccgateway.policy.attachmentSource_' + source) }}</option>
          </select>
        </label>
        <template v-if="kind === 'environment'">
          <label v-for="field in ['workingDirectory', 'platform'] as const" :key="field" class="flex items-center justify-between gap-4 text-sm">
            <span :title="t('ccgateway.policy.environmentFieldsHint')">{{ field }}<small class="block text-gray-500">{{ t('ccgateway.policy.effectiveSource', { source: t('ccgateway.policy.attachmentSource_' + (policy.environment_fields?.[field] || policy.attachment_sources?.environment || policy.attachment_source)) }) }}</small></span>
            <select :value="policy.environment_fields?.[field] || ''" :data-testid="'environment-' + field" class="rounded border p-2 dark:bg-dark-800" @change="setEnvironmentField(field, $event)">
              <option value="">{{ t('ccgateway.policy.environmentInherit') }}</option>
              <option value="client">{{ t('ccgateway.policy.attachmentSource_client') }}</option>
              <option value="gateway">{{ t('ccgateway.policy.attachmentSource_gateway') }}</option>
            </select>
          </label>
        </template>
      </template>
      <label v-for="side in ['client', 'gateway'] as const" :key="side" class="flex items-center justify-between gap-4 text-sm">
        <span>{{ t('ccgateway.policy.unknownAttachment_' + side) }}</span>
        <select v-model="policy[side === 'client' ? 'unknown_client_attachment' : 'unknown_gateway_attachment']" :data-testid="'unknown-attachment-' + side" class="rounded border p-2 dark:bg-dark-800">
          <option value="pass">{{ t('ccgateway.policy.attachmentPass') }}</option>
          <option value="ignore">{{ t('ccgateway.policy.attachmentIgnore') }}</option>
        </select>
      </label>
      <p class="text-xs text-gray-500">{{ t('ccgateway.policy.attachmentProtectedHint') }}</p>
    </div>
  </section>
</template>
