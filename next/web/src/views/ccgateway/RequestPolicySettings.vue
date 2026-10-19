<script setup lang="ts">
// Single-request CLI transport: build by default, or direct forwarding.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSelect, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import { type RequestPolicy } from './requestPolicy'
const policy = defineModel<RequestPolicy>({ required: true })
const { t } = useI18n()
const requestModes = computed(() => (['direct', 'build'] as const).map(value => ({value, label:t('ccgateway.cliProfile.' + value)})))
</script>
<template>
  <section class="space-y-4" data-testid="request-policy">
    <SSettingsGroup :title="t('ccgateway.cliProfile.title')" data-testid="cli-request-mode">
      <SSettingRow :label="t('ccgateway.cliProfile.mode')">
        <SSelect v-model="policy.relay_mode" :options="requestModes" data-testid="relay-mode" />
      </SSettingRow>
      <SSettingRow :label="t('ccgateway.cliProfile.version')">
        <SInput v-model="policy.cli_version" placeholder="2.1.302" mono data-testid="cli-version" />
      </SSettingRow>
    </SSettingsGroup>
  </section>
</template>
