<script setup lang="ts">
// One group's CC feature policy, edited in a side panel so the list stays
// short. Everything here is a draft of the settings form: closing keeps it,
// the page's save button submits it.
import { useI18n } from 'vue-i18n'
import { SButton, SDisclosure, SDrawer, SHint, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import RequestPolicySettings from './RequestPolicySettings.vue'
import type { FeatureGroup, RequestPolicy } from './requestPolicy'
const open = defineModel<boolean>('open', { required: true })
const group = defineModel<FeatureGroup>('group', { required: true })
defineProps<{ title: string; global: RequestPolicy; latest?: RequestPolicy | null; disabled?: boolean }>()
const { t } = useI18n()
const set = (patch: Partial<FeatureGroup>) => { group.value = { ...group.value, ...patch } }
</script>
<template>
  <SDrawer
    v-model:open="open"
    :title="title"
    width="lg"
  >
    <div
      class="space-y-3"
      data-testid="group-policy-drawer"
    >
      <SDisclosure
        v-if="latest"
        :label="t('ccgateway.layers.latestSaved')"
        variant="section"
        :default-open="true"
      >
        <RequestPolicySettings
          :model-value="latest"
          disabled
        />
      </SDisclosure>
      <SSettingsGroup dense>
        <SSettingRow :label="t('ccgateway.layers.enabled')">
          <SSwitch
            :model-value="group.enabled"
            :disabled="disabled"
            data-testid="group-enabled"
            @update:model-value="set({ enabled: $event })"
          />
        </SSettingRow>
        <SSettingRow
          v-if="group.enabled"
          :label="t('ccgateway.layers.allowAccount')"
          :description="t('ccgateway.layers.allowHint')"
        >
          <SSwitch
            :model-value="group.allow_account_override"
            :disabled="disabled"
            data-testid="group-allow-account"
            @update:model-value="set({ allow_account_override: $event })"
          />
        </SSettingRow>
      </SSettingsGroup>
      <RequestPolicySettings
        v-if="group.enabled"
        :model-value="global"
        :overrides="group.overrides"
        :inherited="global"
        :disabled="disabled"
        @update:overrides="set({ overrides: $event })"
      />
      <SHint v-else>
        {{ t('ccgateway.layers.disabledHint') }}
      </SHint>
    </div>
    <template #footer>
      <SHint
        size="xs"
        class="me-auto"
      >
        {{ t('ccgateway.layers.draftHint') }}
      </SHint>
      <SButton
        size="sm"
        :disabled="disabled || !Object.keys(group.overrides).length"
        data-testid="group-reset"
        @click="set({ overrides: {} })"
      >
        {{ t('ccgateway.layers.resetToGlobal') }}
      </SButton>
    </template>
  </SDrawer>
</template>
