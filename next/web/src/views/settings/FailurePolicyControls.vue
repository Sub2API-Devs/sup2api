<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SInput, SSelect, SSettingRow, SSwitch } from '@sub2api/ui'
import { retryAccountSequence, type FailurePolicyForm } from './failurePolicy'

const policy = defineModel<FailurePolicyForm>({ required: true })
defineProps<{ disabled: boolean; errors: Record<string, string> }>()
const { t } = useI18n()
const sequence = computed(() => retryAccountSequence(policy.value).join(' → '))
const egressOptions = computed(() =>
  ['same_proxy', 'proxy_only', 'account_configured'].map(value => ({ value, label: t(`failurePolicy.egresses.${value}`) }))
)
const numbers = [
  { key: 'max_retries', label: 'maxRetries', max: 9, hint: 'maxRetriesHint' },
  { key: 'retries_per_account', label: 'retriesPerAccount', max: 9, hint: 'retriesPerAccountHint' },
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
  <SSettingRow
    :label="t('failurePolicy.switchAccount')"
    :description="t('failurePolicy.switchAccountHint')"
  >
    <SSwitch
      v-model="policy.switch_account"
      :disabled="disabled"
      :aria-label="t('failurePolicy.switchAccount')"
    />
  </SSettingRow>
  <SSettingRow
    :label="t('failurePolicy.resetSticky')"
    :description="t('failurePolicy.resetStickyHint')"
  >
    <SSwitch
      v-model="policy.reset_sticky"
      :disabled="disabled || !policy.switch_account"
      :aria-label="t('failurePolicy.resetSticky')"
    />
  </SSettingRow>
  <SSettingRow
    :label="t('failurePolicy.egress')"
    :description="t('failurePolicy.egressHint')"
    :error="errors.egress"
  >
    <SSelect
      v-model="policy.egress"
      :options="egressOptions"
      :disabled="disabled || !policy.switch_account"
      :aria-label="t('failurePolicy.egress')"
    />
  </SSettingRow>
  <SHint
    v-if="sequence"
    class="py-3"
    data-testid="retry-sequence"
  >
    {{ t('failurePolicy.sequence', { sequence }) }}
    {{ t('failurePolicy.sequenceHint') }}
  </SHint>
  <SSettingRow :label="t('failurePolicy.retryAfter')">
    <SSwitch
      v-model="policy.respect_retry_after"
      :disabled="disabled"
      :aria-label="t('failurePolicy.retryAfter')"
    />
  </SSettingRow>
</template>
