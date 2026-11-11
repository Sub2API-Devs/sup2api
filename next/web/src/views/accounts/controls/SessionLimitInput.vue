<script setup lang="ts">
// A session cap and its window (spm_limit, spm_window_seconds; CONTRACTS §71)
// on one line: "[20] sessions / every [5] [minutes | hours]". Both models are
// null while their input is empty (cap 0, default window). The window's number
// and unit stay local while typing (60 minutes does not turn into 1 hour); an
// outside change of the window reloads them. Used by the account editor, the
// model limit cards and the bulk edit.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSelect, type ControlSize } from '@sub2api/ui'
import { joinWindow, splitWindow, unitMax, WINDOW_UNITS, type WindowParts } from '../spmWindow'

const props = defineProps<{
  /** Text after the cap (e.g. "sessions"). */
  suffix?: string
  limitMax?: number
  size?: ControlSize
  disabled?: boolean
  /** The window alone is fixed (common controls). */
  windowDisabled?: boolean
  /** The window is hidden (common controls): only the cap shows. */
  hideWindow?: boolean
  error?: boolean
  /** Accessible name of the cap input outside an SField / SSettingRow. */
  ariaLabel?: string
  /** data-testid of the cap input; the window's inputs add `-window` and `-window-unit`. */
  testid?: string
}>()
const limit = defineModel<number | null | undefined>('limit')
const windowSeconds = defineModel<number | null | undefined>('windowSeconds')
const { t } = useI18n()

const parts = ref<WindowParts>(splitWindow(windowSeconds.value ?? null))
watch(windowSeconds, s => {
  if (joinWindow(parts.value) !== (s ?? null)) parts.value = splitWindow(s ?? null, parts.value.unit)
})
function setWindow(p: Partial<WindowParts>) {
  parts.value = { ...parts.value, ...p }
  windowSeconds.value = joinWindow(parts.value)
}

const unitOptions = computed(() => WINDOW_UNITS.map(u => ({ value: u, label: t(`accounts.spmWindow.units.${u}`, parts.value.value ?? 2) })))
const testId = (part: string) => (props.testid ? `${props.testid}${part}` : undefined)
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
    <SInput
      :model-value="limit"
      type="number"
      :min="0"
      :max="limitMax"
      :suffix="suffix"
      :size="size"
      :disabled="disabled"
      :error="error"
      :aria-label="ariaLabel"
      :class="suffix ? 'w-36' : 'w-24'"
      :data-testid="testId('')"
      @update:model-value="limit = $event as number | null"
    />
    <div v-if="!hideWindow" class="flex items-center gap-2">
      <span class="whitespace-nowrap text-sm text-fg-muted">{{ t('accounts.spmWindow.every') }}</span>
      <SInput
        :model-value="parts.value"
        type="number"
        :min="1"
        :max="unitMax(parts.unit)"
        step="any"
        :size="size"
        :disabled="disabled || windowDisabled"
        :error="error"
        :aria-label="t('accounts.spmWindow.length')"
        class="w-20"
        :data-testid="testId('-window')"
        @update:model-value="setWindow({ value: $event as number | null })"
      />
      <SSelect
        :model-value="parts.unit"
        :options="unitOptions"
        :size="size"
        :disabled="disabled || windowDisabled"
        :aria-label="t('accounts.spmWindow.unit')"
        class="w-24"
        :data-testid="testId('-window-unit')"
        @update:model-value="setWindow({ unit: $event as WindowParts['unit'] })"
      />
    </div>
  </div>
</template>
