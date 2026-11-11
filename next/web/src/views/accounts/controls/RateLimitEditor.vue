<script setup lang="ts">
// The account's rpm / tpm / spm limits (CONTRACTS §18.1, §71) as setting rows;
// the v-model is those three account fields and the session cap's window
// (spm_window_seconds: emitted once given or changed, absent = 1 minute).
// `controls` hides or fixes single limits (common controls; the window shows
// only with spm_limit); the account editor places the rows in its limits group, plugins
// get it as `host.components.RateLimitEditor`.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSettingRow } from '@sub2api/ui'
import type { ControlView } from '../commonControls'
import { SPM_WINDOW_DEFAULT } from '../spmWindow'
import SessionLimitInput from './SessionLimitInput.vue'

/** null while an input is empty (saved as 0, unlimited; an empty window as the default). */
export type RateLimits = Record<RateLimitField, number | null> & { spm_window_seconds?: number | null }
type RateLimitField = 'rpm_limit' | 'tpm_limit' | 'spm_limit'

const props = defineProps<{
  modelValue: Partial<RateLimits> | null | undefined
  errors?: Record<string, string>
  disabled?: boolean
  controls?: Partial<Record<RateLimitField | 'spm_window_seconds', ControlView>>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: RateLimits): void }>()
const { t } = useI18n()

const fields = computed(() =>
  [
    { key: 'rpm_limit' as const, label: t('accounts.rpmLimit'), unit: t('accounts.editorUi.unitRpm'), hint: t('accounts.zeroUnlimited') },
    { key: 'tpm_limit' as const, label: t('accounts.tpmLimit'), unit: t('accounts.editorUi.unitTpm'), hint: t('accounts.zeroUnlimited') },
    { key: 'spm_limit' as const, label: t('accounts.spmLimit'), unit: t('accounts.spmWindow.sessions'), hint: t('accounts.spmHint') }
  ].filter(f => props.controls?.[f.key]?.visible !== false)
)

/** An absent limit is 0; an emptied input stays null. */
function current(key: RateLimitField): number | null {
  const v = props.modelValue?.[key]
  return v === undefined ? 0 : v
}

/** An absent window shows the default; an emptied input stays null. */
const windowSeconds = computed(() =>
  props.modelValue?.spm_window_seconds === undefined ? SPM_WINDOW_DEFAULT : props.modelValue.spm_window_seconds
)
/** The window as given: an absent one stays absent until changed. */
const givenWindow = () =>
  props.modelValue && 'spm_window_seconds' in props.modelValue ? { spm_window_seconds: props.modelValue.spm_window_seconds } : {}

function set(patch: Partial<RateLimits>) {
  emit('update:modelValue', {
    rpm_limit: current('rpm_limit'),
    tpm_limit: current('tpm_limit'),
    spm_limit: current('spm_limit'),
    ...givenWindow(),
    ...patch
  })
}

/** The fields of a row (common controls, server errors): the session row also holds the window. */
const rowFields = (key: RateLimitField) => (key === 'spm_limit' ? (['spm_limit', 'spm_window_seconds'] as const) : [key])
const reason = (key: RateLimitField) =>
  rowFields(key)
    .map(k => props.controls?.[k]?.reason)
    .find(Boolean)
const rowError = (key: RateLimitField) =>
  rowFields(key)
    .map(k => props.errors?.[k])
    .find(Boolean)
</script>

<template>
  <SSettingRow v-for="f in fields" :key="f.key" :label="f.label" :description="reason(f.key) || f.hint" :error="rowError(f.key)">
    <SessionLimitInput
      v-if="f.key === 'spm_limit'"
      :limit="modelValue?.spm_limit"
      :window-seconds="windowSeconds"
      :suffix="f.unit"
      :disabled="disabled"
      :limit-disabled="controls?.spm_limit?.disabled"
      :window-disabled="controls?.spm_window_seconds?.disabled"
      :hide-window="controls?.spm_window_seconds?.visible === false"
      testid="account-spm_limit"
      @update:limit="set({ spm_limit: $event ?? null })"
      @update:window-seconds="set({ spm_window_seconds: $event ?? null })"
    />
    <SInput
      v-else
      :model-value="modelValue?.[f.key]"
      type="number"
      :min="0"
      :suffix="f.unit"
      :disabled="disabled || controls?.[f.key]?.disabled"
      class="w-full sm:w-48"
      :data-testid="`account-${f.key}`"
      @update:model-value="set({ [f.key]: $event as number | null })"
    />
  </SSettingRow>
</template>
