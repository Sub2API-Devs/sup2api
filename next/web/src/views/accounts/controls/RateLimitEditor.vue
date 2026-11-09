<script setup lang="ts">
// The account's rpm / tpm / spm limits (CONTRACTS §18.1, §71) as setting rows;
// the v-model is those three account fields. `controls` hides or fixes single
// limits (common controls); the account editor places the rows in its limits
// group, plugins get it as `host.components.RateLimitEditor`.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSettingRow } from '@sub2api/ui'
import type { ControlView } from '../commonControls'

/** null while an input is empty (saved as 0, unlimited). */
export type RateLimits = Record<RateLimitField, number | null>
type RateLimitField = 'rpm_limit' | 'tpm_limit' | 'spm_limit'

const props = defineProps<{
  modelValue: Partial<RateLimits> | null | undefined
  errors?: Record<string, string>
  disabled?: boolean
  controls?: Partial<Record<RateLimitField, ControlView>>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: RateLimits): void }>()
const { t } = useI18n()

const fields = computed(() =>
  [
    { key: 'rpm_limit' as const, label: t('accounts.rpmLimit'), unit: t('accounts.editorUi.unitRpm'), hint: t('accounts.zeroUnlimited') },
    { key: 'tpm_limit' as const, label: t('accounts.tpmLimit'), unit: t('accounts.editorUi.unitTpm'), hint: t('accounts.zeroUnlimited') },
    { key: 'spm_limit' as const, label: t('accounts.spmLimit'), unit: t('accounts.editorUi.unitSpm'), hint: t('accounts.spmHint') }
  ].filter(f => props.controls?.[f.key]?.visible !== false)
)

function set(key: RateLimitField, v: unknown) {
  const m = props.modelValue
  emit('update:modelValue', { rpm_limit: m?.rpm_limit ?? 0, tpm_limit: m?.tpm_limit ?? 0, spm_limit: m?.spm_limit ?? 0, [key]: v as number | null })
}
</script>

<template>
  <SSettingRow v-for="f in fields" :key="f.key" :label="f.label" :description="controls?.[f.key]?.reason || f.hint" :error="errors?.[f.key]">
    <SInput
      :model-value="modelValue?.[f.key]"
      type="number"
      :min="0"
      :suffix="f.unit"
      :disabled="disabled || controls?.[f.key]?.disabled"
      class="w-full sm:w-48"
      :data-testid="`account-${f.key}`"
      @update:model-value="set(f.key, $event)"
    />
  </SSettingRow>
</template>
