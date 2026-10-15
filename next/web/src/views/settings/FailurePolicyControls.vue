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
    :label="t('failurePolicy.maxRetries')"
    :description="t('failurePolicy.maxRetriesHint')"
    :error="errors.max_retries"
  >
    <SInput
      v-model="policy.max_retries"
      type="number"
      :min="0"
      :max="9"
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
    v-if="policy.switch_account"
    :label="t('failurePolicy.retriesPerAccount')"
    :description="t('failurePolicy.retriesPerAccountHint')"
    :error="errors.retries_per_account"
  >
    <SInput
      v-model="policy.retries_per_account"
      type="number"
      :min="0"
      :max="9"
      :disabled="disabled"
      :aria-label="t('failurePolicy.retriesPerAccount')"
      class="w-full sm:w-48"
    />
  </SSettingRow>
  <SSettingRow
    v-if="policy.switch_account"
    :label="t('failurePolicy.egress')"
    :description="t('failurePolicy.egressHint')"
    :error="errors.egress"
  >
    <SSelect
      v-model="policy.egress"
      :options="egressOptions"
      :disabled="disabled"
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
  <SSettingRow
    v-for="field in numbers"
    :key="field.key"
    :label="t(`failurePolicy.${field.label}`)"
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
</template>
