<script setup lang="ts">
// Native CC tool behavior, client attachment handling and unsupported-field handling.
// Client betas pass through; the legacy relay's rewrite policies are not editable here.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSegmented, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import { erasableAttachments, replaceableAttachments, type ErasableAttachment, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
// Client (as sent), server (the Worker's own rendering) or erase, for every type.
const attachmentActions = ['keep', 'gateway', 'erase'] as const
type AttachmentAction = (typeof attachmentActions)[number]
const attachmentOptions = computed(() => attachmentActions.map(value => ({ value, label: t('ccgateway.policy.attachmentAction_' + value) })))
const unknownFieldOptions = computed(() => (['ignore', 'reject'] as const).map(value => ({ value, label: t('ccgateway.policy.' + value) })))
function attachmentAction(type: ErasableAttachment): AttachmentAction {
  if (policy.value.erase_client_attachments?.includes(type)) return 'erase'
  return policy.value.replace_client_attachments?.includes(type) ? 'gateway' : 'keep'
}
// Kept in vocabulary order so the saved policy does not depend on click order.
function setAttachmentAction(type: ErasableAttachment, action: AttachmentAction) {
  const erased = new Set(policy.value.erase_client_attachments ?? [])
  const replaced = new Set<string>(policy.value.replace_client_attachments ?? [])
  erased.delete(type)
  replaced.delete(type)
  if (action === 'erase') erased.add(type)
  if (action === 'gateway') replaced.add(type)
  policy.value.erase_client_attachments = erasableAttachments.filter(name => erased.has(name))
  policy.value.replace_client_attachments = replaceableAttachments.filter(name => replaced.has(name))
}
</script>
<template>
  <section class="space-y-4" data-testid="request-policy">
    <h4 class="text-base font-semibold text-fg">{{ t('ccgateway.features.ccTitle') }}</h4>
    <SSettingsGroup :title="t('ccgateway.features.ccRuntime')" data-testid="cc-runtime-settings">
      <SSettingRow :label="t('ccgateway.policy.toolSearch')" :description="t('ccgateway.policy.toolSearchHint')" for="cc-tool-search">
        <select id="cc-tool-search" v-model="policy.tool_search" class="input w-full sm:w-64" data-testid="tool-search"><option v-for="mode in ['request', 'false', 'true', 'auto']" :key="mode" :value="mode">{{ t('ccgateway.policy.search_' + mode) }}</option><option v-if="policy.tool_search?.startsWith('auto:')" :value="policy.tool_search">{{ policy.tool_search }}</option></select>
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.policy.customToolPrefix')" :description="t('ccgateway.policy.customToolPrefixShort')" for="cc-tool-prefix">
        <template #details>{{ t('ccgateway.policy.customToolPrefixHint') }}</template>
        <div class="w-full sm:w-64">
          <input id="cc-tool-prefix" v-model="policy.custom_tool_prefix" class="input font-mono" type="text" maxlength="32" placeholder="ccgateway" spellcheck="false" data-testid="custom-tool-prefix" />
          <p class="mt-1.5 truncate text-xs text-fg-muted">{{ t('ccgateway.policy.customToolPrefixExample') }} <code class="rounded bg-surface-2 px-1 py-0.5 text-fg">mcp__{{ policy.custom_tool_prefix || 'ccgateway' }}__lookup</code></p>
        </div>
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.policy.thinkingDisabledCompat')" :description="t('ccgateway.policy.thinkingDisabledCompatShort')" for="cc-thinking-compat">
        <template #details>{{ t('ccgateway.policy.thinkingDisabledCompatHint') }}</template>
        <input id="cc-thinking-compat" :checked="policy.thinking_disabled_compat === 'omit'" type="checkbox" role="switch" class="switch" data-testid="thinking-disabled-compat" @change="policy.thinking_disabled_compat = ($event.target as HTMLInputElement).checked ? 'omit' : 'pass'" />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup :title="t('ccgateway.policy.attachments')" :description="t('ccgateway.policy.attachmentsShort')" data-testid="client-attachments">
      <template #details>{{ t('ccgateway.policy.attachmentsHint') }}</template>
      <SSettingRow v-for="type in erasableAttachments" :key="type" :label="t('ccgateway.policy.attachment_' + type)" dense>
        <SSegmented :model-value="attachmentAction(type)" :options="attachmentOptions" size="sm" :aria-label="t('ccgateway.policy.attachment_' + type)" :data-testid="'client-attachment-' + type" @update:model-value="setAttachmentAction(type, $event as AttachmentAction)" />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup :title="t('ccgateway.policy.fallbackTitle')" data-testid="unsupported-requests">
      <SSettingRow :label="t('ccgateway.policy.unknownField')" dense>
        <SSegmented :model-value="policy.unknown_field" :options="unknownFieldOptions" size="sm" :aria-label="t('ccgateway.policy.unknownField')" data-testid="unknown-field" @update:model-value="policy.unknown_field = $event as RequestPolicy['unknown_field']" />
      </SSettingRow>
    </SSettingsGroup>
  </section>
</template>
