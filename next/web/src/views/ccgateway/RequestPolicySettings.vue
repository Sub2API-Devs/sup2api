<script setup lang="ts">
// Native CC tool behavior, client attachment erasure and unsupported-field handling.
// Client betas pass through; the legacy relay's rewrite policies are not editable here.
import { useI18n } from 'vue-i18n'
import { SRadio } from '@sub2api/ui'
import { erasableAttachments, type ErasableAttachment, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
// Kept in vocabulary order so the saved policy does not depend on click order.
function setErased(type: ErasableAttachment, erased: boolean) {
  const selected = new Set(policy.value.erase_client_attachments ?? [])
  if (erased) selected.add(type)
  else selected.delete(type)
  policy.value.erase_client_attachments = erasableAttachments.filter(name => selected.has(name))
}
</script>
<template>
  <section class="space-y-4" data-testid="request-policy">
    <h4 class="font-semibold">{{ t('ccgateway.features.ccTitle') }}</h4>
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="cc-runtime-settings">
      <h5 class="text-sm font-medium">{{ t('ccgateway.features.ccRuntime') }}</h5>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="block text-sm"><span class="font-medium">{{ t('ccgateway.policy.toolSearch') }}</span><select v-model="policy.tool_search" class="input mt-2 w-full" data-testid="tool-search"><option v-for="mode in ['request', 'false', 'true', 'auto']" :key="mode" :value="mode">{{ t('ccgateway.policy.search_' + mode) }}</option><option v-if="policy.tool_search?.startsWith('auto:')" :value="policy.tool_search">{{ policy.tool_search }}</option></select><small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.toolSearchHint') }}</small></label>
        <label class="block text-sm"><span class="font-medium">{{ t('ccgateway.policy.customToolPrefix') }}</span><input v-model="policy.custom_tool_prefix" class="input mt-2 w-full" type="text" maxlength="32" placeholder="ccgateway" data-testid="custom-tool-prefix" /><small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.customToolPrefixHint') }}</small><code class="mt-2 block text-xs">mcp__{{ policy.custom_tool_prefix || 'ccgateway' }}__lookup</code></label>
        <label class="flex items-start gap-2 text-sm md:col-span-2"><input :checked="policy.thinking_disabled_compat === 'omit'" type="checkbox" class="mt-1" data-testid="thinking-disabled-compat" @change="policy.thinking_disabled_compat = ($event.target as HTMLInputElement).checked ? 'omit' : 'pass'" /><span>{{ t('ccgateway.policy.thinkingDisabledCompat') }}<small class="mt-1 block text-gray-500">{{ t('ccgateway.policy.thinkingDisabledCompatHint') }}</small></span></label>
        <fieldset class="text-sm md:col-span-2" data-testid="erase-client-attachments">
          <legend class="font-medium">{{ t('ccgateway.policy.eraseAttachments') }}</legend>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <label v-for="type in erasableAttachments" :key="type" class="flex items-center gap-2"><input :checked="policy.erase_client_attachments?.includes(type)" type="checkbox" :data-testid="'erase-' + type" @change="setErased(type, ($event.target as HTMLInputElement).checked)" />{{ t('ccgateway.policy.erase_' + type) }}</label>
          </div>
          <small class="mt-2 block text-gray-500">{{ t('ccgateway.policy.eraseAttachmentsHint') }}</small>
        </fieldset>
      </div>
    </section>
    <section class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-dark-700" data-testid="unsupported-requests">
      <h5 class="text-sm font-medium">{{ t('ccgateway.policy.fallbackTitle') }}</h5>
      <fieldset class="space-y-2">
        <legend class="mb-2 text-sm font-medium">{{ t('ccgateway.policy.unknownField') }}</legend>
        <SRadio
          v-for="action in ['ignore', 'reject'] as const"
          :key="action"
          :model-value="policy.unknown_field"
          :value="action"
          name="unknown-field"
          :data-testid="'unknown-field-' + action"
          @update:model-value="policy.unknown_field = action"
        >
          {{ t('ccgateway.policy.' + action) }}
        </SRadio>
      </fieldset>
    </section>
  </section>
</template>
