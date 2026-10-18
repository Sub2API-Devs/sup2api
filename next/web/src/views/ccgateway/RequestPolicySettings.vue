<script setup lang="ts">
// Native CC tool behavior, client attachment handling and unsupported-field handling.
// Client betas pass through; the legacy relay's rewrite policies are not editable here.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SCode, SDisclosure, SSegmented, SSelect, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import { attachmentRows, attachmentChildren, attachmentAction, setAttachmentAction, type AttachmentAction, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
// Client (as sent), server (the Worker's own rendering) or erase, for every type.
const attachmentActions = ['keep', 'gateway', 'erase'] as const
const attachmentOptions = computed(() => attachmentActions.map(value => ({ value, label: t('ccgateway.policy.attachmentAction_' + value) })))
// The saved value may be a numeric auto threshold (auto:N): kept selectable as is.
const toolSearchOptions = computed(() => [
  ...(['request', 'false', 'true', 'auto'] as const).map(value => ({ value, label: t('ccgateway.policy.search_' + value) })),
  ...(policy.value.tool_search?.startsWith('auto:') ? [{ value: policy.value.tool_search, label: policy.value.tool_search }] : [])
])
const unknownFieldOptions = computed(() => (['ignore', 'reject'] as const).map(value => ({ value, label: t('ccgateway.policy.' + value) })))
const requestModes = computed(() => (['direct', 'build', 'native'] as const).map(value => ({value, label:t('ccgateway.cliProfile.' + value)})))
</script>
<template>
  <section class="space-y-4" data-testid="request-policy">
    <SSettingsGroup :title="t('ccgateway.cliProfile.title')" data-testid="cli-request-mode">
      <SSettingRow :label="t('ccgateway.cliProfile.mode')" :description="t('ccgateway.cliProfile.modeHint')">
        <SSelect v-model="policy.relay_mode" :options="requestModes" data-testid="relay-mode" />
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.cliProfile.version')" :description="t('ccgateway.cliProfile.versionHint')">
        <SInput v-model="policy.cli_version" placeholder="2.1.302" mono data-testid="cli-version" />
      </SSettingRow>
    </SSettingsGroup>
    <div v-if="policy.relay_mode === 'native'" class="space-y-4">
    <h4 class="text-base font-semibold text-fg">{{ t('ccgateway.features.ccTitle') }}</h4>
    <SSettingsGroup :title="t('ccgateway.features.ccRuntime')" data-testid="cc-runtime-settings">
      <SSettingRow :label="t('ccgateway.policy.toolSearch')" :description="t('ccgateway.policy.toolSearchHint')">
        <SSelect :model-value="policy.tool_search" :options="toolSearchOptions" class="w-full sm:w-64" data-testid="tool-search" @update:model-value="policy.tool_search = String($event)" />
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.policy.customToolPrefix')" :description="t('ccgateway.policy.customToolPrefixShort')">
        <template #details>{{ t('ccgateway.policy.customToolPrefixHint') }}</template>
        <div class="w-full sm:w-64">
          <SInput v-model="policy.custom_tool_prefix" mono :maxlength="32" placeholder="ccgateway" spellcheck="false" data-testid="custom-tool-prefix" />
          <p class="mt-1.5 truncate text-xs text-fg-muted">{{ t('ccgateway.policy.customToolPrefixExample') }} <SCode inline>mcp__{{ policy.custom_tool_prefix || 'ccgateway' }}__lookup</SCode></p>
        </div>
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.policy.thinkingDisabledCompat')" :description="t('ccgateway.policy.thinkingDisabledCompatShort')">
        <template #details>{{ t('ccgateway.policy.thinkingDisabledCompatHint') }}</template>
        <SSwitch :model-value="policy.thinking_disabled_compat === 'omit'" data-testid="thinking-disabled-compat" @update:model-value="policy.thinking_disabled_compat = $event ? 'omit' : 'pass'" />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup :title="t('ccgateway.policy.attachments')" :description="t('ccgateway.policy.attachmentsShort')" data-testid="client-attachments">
      <template #details>{{ t('ccgateway.policy.attachmentsHint') }}</template>
      <template v-for="type in attachmentRows" :key="type">
        <SDisclosure v-if="attachmentChildren(type).length" variant="section" :label="t('ccgateway.policy.attachment_' + type)" class="py-2.5" :data-testid="'attachment-group-' + type">
          <template #actions>
            <span v-if="!attachmentAction(policy, type)" class="text-xs text-fg-muted">{{ t('ccgateway.policy.attachmentMixed') }}</span>
            <SSegmented :model-value="attachmentAction(policy, type)" :options="attachmentOptions" size="sm" :aria-label="t('ccgateway.policy.attachment_' + type)" :data-testid="'client-attachment-' + type" @update:model-value="setAttachmentAction(policy, type, $event as AttachmentAction)" />
          </template>
          <div class="ml-2 divide-y divide-line border-l border-line pl-4">
            <SSettingRow v-for="child in attachmentChildren(type)" :key="child" :label="t('ccgateway.policy.attachment_' + child)" dense>
              <SSegmented :model-value="attachmentAction(policy, child)" :options="attachmentOptions" size="sm" :aria-label="t('ccgateway.policy.attachment_' + child)" :data-testid="'client-attachment-' + child" @update:model-value="setAttachmentAction(policy, child, $event as AttachmentAction)" />
            </SSettingRow>
          </div>
        </SDisclosure>
        <SSettingRow v-else :label="t('ccgateway.policy.attachment_' + type)" dense>
          <SSegmented :model-value="attachmentAction(policy, type)" :options="attachmentOptions" size="sm" :aria-label="t('ccgateway.policy.attachment_' + type)" :data-testid="'client-attachment-' + type" @update:model-value="setAttachmentAction(policy, type, $event as AttachmentAction)" />
        </SSettingRow>
      </template>
    </SSettingsGroup>
    <SSettingsGroup :title="t('ccgateway.policy.fallbackTitle')" data-testid="unsupported-requests">
      <SSettingRow :label="t('ccgateway.policy.unknownField')" dense>
        <SSegmented :model-value="policy.unknown_field" :options="unknownFieldOptions" size="sm" :aria-label="t('ccgateway.policy.unknownField')" data-testid="unknown-field" @update:model-value="policy.unknown_field = $event as RequestPolicy['unknown_field']" />
      </SSettingRow>
    </SSettingsGroup>
    </div>
  </section>
</template>
