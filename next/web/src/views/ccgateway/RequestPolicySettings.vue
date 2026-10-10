<script setup lang="ts">
// CC features: the catalog of Claude Code execution features (--add-dir, ...),
// Claude Code's tools and error handling inside the Worker, which system
// attachments (environment, model, date...) the model sees and from where, and
// how unsupported client requests are handled. Features the official API
// supports need no setting.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FeatureSupport from './FeatureSupport.vue'
import { attachmentTypes, type AttachmentType, type AttachmentSource, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
const catalogOpen = ref(false)
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
</script>
<template>
  <section class="space-y-4" data-testid="request-policy">
    <div><h4 class="font-semibold">{{ t('ccgateway.features.ccTitle') }}</h4><p class="mt-1 text-xs text-gray-500">{{ t('ccgateway.features.ccHint') }}</p></div>
    <!-- The CC feature catalog (--add-dir, safeguards, ...) is read when opened. -->
    <details class="rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="cc-feature-catalog" @toggle="catalogOpen = catalogOpen || ($event.target as HTMLDetailsElement).open">
      <summary class="cursor-pointer text-sm font-medium">{{ t('ccgateway.features.implementation') }}</summary>
      <FeatureSupport v-if="catalogOpen" scope="cc" class="mt-3" />
    </details>
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="cc-runtime-settings">
      <h5 class="text-sm font-medium">{{ t('ccgateway.features.ccRuntime') }}</h5>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="block text-sm"><span class="font-medium">{{ t('ccgateway.policy.toolSearch') }}</span><select v-model="policy.tool_search" class="input mt-2 w-full" data-testid="tool-search"><option v-for="mode in ['request', 'false', 'true', 'auto']" :key="mode" :value="mode">{{ t('ccgateway.policy.search_' + mode) }}</option><option v-if="policy.tool_search?.startsWith('auto:')" :value="policy.tool_search">{{ policy.tool_search }}</option></select><small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.toolSearchHint') }}</small></label>
        <label class="block text-sm"><span class="font-medium">{{ t('ccgateway.policy.customToolPrefix') }}</span><input v-model="policy.custom_tool_prefix" class="input mt-2 w-full" type="text" maxlength="32" placeholder="ccgateway" data-testid="custom-tool-prefix" /><small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.customToolPrefixHint') }}</small><code class="mt-2 block text-xs">mcp__{{ policy.custom_tool_prefix || 'ccgateway' }}__lookup</code></label>
        <label class="flex items-start gap-2 text-sm md:col-span-2"><input v-model="policy.pass_upstream_errors" type="checkbox" class="mt-1" data-testid="pass-upstream-errors" /><span>{{ t('ccgateway.policy.passUpstreamErrors') }}<small class="mt-1 block text-gray-500">{{ t('ccgateway.policy.passUpstreamErrorsHint') }}</small></span></label>
        <label class="flex items-start gap-2 text-sm md:col-span-2"><input :checked="policy.thinking_disabled_compat === 'omit'" type="checkbox" class="mt-1" data-testid="thinking-disabled-compat" @change="policy.thinking_disabled_compat = ($event.target as HTMLInputElement).checked ? 'omit' : 'pass'" /><span>{{ t('ccgateway.policy.thinkingDisabledCompat') }}<small class="mt-1 block text-gray-500">{{ t('ccgateway.policy.thinkingDisabledCompatHint') }}</small></span></label>
      </div>
    </section>
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="cc-attachments">
      <h5 class="text-sm font-medium">{{ t('ccgateway.policy.attachmentSourceTitle') }}</h5>
      <fieldset class="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-800">
        <legend class="float-left w-full text-sm font-medium">{{ t('ccgateway.policy.attachmentSourceLegend') }}</legend>
        <label v-for="source in ['client', 'gateway', 'both'] as const" :key="source" class="clear-both flex cursor-pointer items-center gap-2 text-sm">
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
          <label v-if="kind !== 'environment'" class="flex items-center justify-between gap-4 text-sm">
            <span>{{ t('ccgateway.policy.attachmentType_' + kind) }}<small class="block text-gray-500">{{ t('ccgateway.policy.effectiveSource', { source: t('ccgateway.policy.attachmentSource_' + (policy.attachment_sources?.[kind] || policy.attachment_source)) }) }}</small></span>
            <select :value="policy.attachment_sources?.[kind] || ''" :data-testid="'attachment-' + kind" class="rounded border p-2 dark:bg-dark-800" @change="setAttachmentSource(kind, $event)">
              <option value="">{{ t('ccgateway.policy.attachmentInherit') }}</option>
              <option v-for="source in ['client', 'gateway']" :key="source" :value="source">{{ t('ccgateway.policy.attachmentSource_' + source) }}</option>
            </select>
          </label>
          <template v-else>
            <label v-for="field in ['workingDirectory', 'platform'] as const" :key="field" class="flex items-center justify-between gap-4 text-sm">
              <span :title="t('ccgateway.policy.environmentFieldsHint')">{{ field }}<small class="block text-gray-500">{{ t('ccgateway.policy.effectiveSource', { source: t('ccgateway.policy.attachmentSource_' + (policy.environment_fields?.[field] || policy.attachment_source)) }) }}</small></span>
              <select :value="policy.environment_fields?.[field] || ''" :data-testid="'environment-' + field" class="rounded border p-2 dark:bg-dark-800" @change="setEnvironmentField(field, $event)">
                <option value="">{{ t('ccgateway.policy.attachmentInherit') }}</option>
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
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="unsupported-requests">
      <h5 class="text-sm font-medium">{{ t('ccgateway.policy.fallbackTitle') }}</h5>
      <div class="grid gap-3 sm:grid-cols-2">
        <fieldset v-for="kind in ['unknown_beta', 'unknown_field'] as const" :key="kind" class="space-y-2">
          <legend class="mb-2 text-sm font-medium">{{ t(kind === 'unknown_beta' ? 'ccgateway.policy.unknownBeta' : 'ccgateway.policy.unknownField') }}</legend>
          <label v-for="action in ['ignore', 'reject'] as const" :key="action" class="flex items-center gap-2 text-sm"><input v-model="policy[kind]" type="radio" :value="action" :data-testid="kind === 'unknown_beta' ? 'unknown-beta' : 'unknown-field'" />{{ t('ccgateway.policy.' + action) }}</label>
        </fieldset>
      </div>
      <p class="text-xs text-gray-500">{{ t('ccgateway.policy.ignoreHint') }}</p>
    </section>
  </section>
</template>
