<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SInput, SSettingRow, SSwitch } from '@sub2api/ui'
import { retryAccountSequence, type FailurePolicyForm } from './failurePolicy'
const policy = defineModel<FailurePolicyForm>({ required: true })
defineProps<{ disabled: boolean; errors: Record<string, string> }>()
const { t } = useI18n()
const sequence = computed(() => retryAccountSequence(policy.value).join(' → '))
</script>
<template>
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
      :disabled="disabled || !policy.retry_enabled"
      class="w-full sm:w-48"
    />
  </SSettingRow>
  <SSettingRow
    :label="t('failurePolicy.switchAccount')"
    :description="t('failurePolicy.switchAccountHint')"
  >
    <SSwitch
      v-model="policy.switch_account"
      :disabled="disabled || !policy.retry_enabled"
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
      :disabled="disabled || !policy.retry_enabled"
      :aria-label="t('failurePolicy.retriesPerAccount')"
      class="w-full sm:w-48"
    />
  </SSettingRow>
  <SSettingRow
    :label="t('failurePolicy.backoff')"
    :description="t('failurePolicy.backoffHint')"
    :error="errors.backoff_ms"
  >
    <SInput
      v-model="policy.backoff_ms"
      type="number"
      :min="0"
      :max="30000"
      :disabled="disabled || !policy.retry_enabled"
      class="w-full sm:w-48"
    />
  </SSettingRow>
  <div
    v-if="sequence"
    class="py-3"
    data-testid="retry-sequence"
  >
    <SHint>{{ t('failurePolicy.sequence', { sequence }) }} {{ t('failurePolicy.sequenceHint') }}</SHint>
  </div>
</template>
