<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SInput, SSettingRow, SSwitch } from '@sub2api/ui'
import type { FailurePolicyForm } from './failurePolicy'

const policy = defineModel<FailurePolicyForm>({ required: true })
defineProps<{ disabled: boolean; errors: Record<string, string> }>()
const { t } = useI18n()
const numbers = [
  { key: 'max_retries', label: 'maxRetries', max: 9, hint: 'maxRetriesHint' },
  { key: 'backoff_ms', label: 'backoff', max: 30000 },
  { key: 'max_wait_ms', label: 'maxWait', max: 120000 }
] as const
</script>

<template>
  <SSettingRow :label="t('failurePolicy.retryEnabled')">
    <SSwitch
      v-model="policy.retry_enabled"
      :disabled="disabled"
      :aria-label="t('failurePolicy.retryEnabled')"
    />
  </SSettingRow>
  <SSettingRow
    v-for="field in numbers"
    :key="field.key"
    :label="t(`failurePolicy.${field.label}`)"
    :description="'hint' in field ? t(`failurePolicy.${field.hint}`) : undefined"
    :error="errors[field.key]"
  >
    <SInput
      v-model="policy[field.key]"
      type="number"
      :min="0"
      :max="field.max"
      :disabled="disabled"
      class="w-full sm:w-48"
    />
  </SSettingRow>
  <SSettingRow :label="t('failurePolicy.retryAfter')">
    <SSwitch
      v-model="policy.respect_retry_after"
      :disabled="disabled"
      :aria-label="t('failurePolicy.retryAfter')"
    />
  </SSettingRow>
  <SSettingRow
    :label="t('failurePolicy.accountEnabled')"
    :description="t('failurePolicy.accountHint')"
  >
    <SSwitch
      v-model="policy.account_enabled"
      :disabled="disabled"
      :aria-label="t('failurePolicy.accountEnabled')"
    />
  </SSettingRow>
</template>
