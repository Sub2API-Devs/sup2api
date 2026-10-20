<script setup lang="ts">
// Single-request CLI transport: build by default, or direct forwarding.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SInput, SSelect, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import { buildAttachmentFields, type BuildAttachmentField, type BuildAttachmentSource, type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
const requestModes = computed(() => (['direct', 'build'] as const).map(value => ({value, label:t('ccgateway.cliProfile.' + value)})))
const attachmentSources = computed(() => (['client', 'worker'] as const).map(value => ({ value, label: t('ccgateway.buildAttachments.' + value) })))
function setSource(field: BuildAttachmentField, source: BuildAttachmentSource) {
  policy.value = { ...policy.value, build_attachment_sources: { ...policy.value.build_attachment_sources, [field]: source } }
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
      <SSettingRow :label="t('ccgateway.cliProfile.mode')">
        <SSelect
          v-model="policy.relay_mode"
          :options="requestModes"
          data-testid="relay-mode"
        />
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.cliProfile.version')">
        <SInput
          v-model="policy.cli_version"
          placeholder="2.1.302"
          mono
          data-testid="cli-version"
        />
      </SSettingRow>
    </SSettingsGroup>
    <SSettingsGroup
      :title="t('ccgateway.buildAttachments.title')"
      :description="t(policy.relay_mode === 'build' ? 'ccgateway.buildAttachments.hint' : 'ccgateway.buildAttachments.directHint')"
      data-testid="build-attachments"
    >
      <SSettingRow
        v-for="field in buildAttachmentFields"
        :key="field"
        :label="t('ccgateway.policy.attachment_' + field)"
      >
        <SSelect
          :model-value="policy.build_attachment_sources?.[field] ?? 'client'"
          :options="attachmentSources"
          :disabled="policy.relay_mode !== 'build'"
          :data-testid="'build-attachment-' + field"
          :aria-label="t('ccgateway.policy.attachment_' + field)"
          @update:model-value="setSource(field, $event as BuildAttachmentSource)"
        />
      </SSettingRow>
      <SHint class="py-3">
        {{ t('ccgateway.buildAttachments.kept') }}
      </SHint>
    </SSettingsGroup>
  </section>
</template>
