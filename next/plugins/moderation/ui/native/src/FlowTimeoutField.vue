<script setup lang="ts">
import { computed, ref } from 'vue'
import { SField, SHint, SInput, SRadio } from '@sub2api/ui'
import { manualTimeoutMs, TOTAL_TIMEOUT_MAX_MS, TOTAL_TIMEOUT_MIN_MS } from './flowOps'
import { ms } from './format'
import { useModHost } from './host'

// Total flow timeout (new-api flow-timeout-field.tsx): automatic (0, the sum
// of each stage's slowest channel timeout, filled at publish) or a manual
// 1–120 s value. A manual value below the automatic one may cut the last
// stage off.
const props = defineProps<{ modelValue: number; autoMs: number; disabled: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()
const t = useModHost().t

// Text being typed; null = show the stored value. An entry that cannot be a
// manual value (empty, 0 or less; 0 means automatic) is not stored: it shows
// an error, and leaving the box shows the stored value again, so what the
// box shows on publish is what gets published.
const typing = ref<string | null>(null)
const manual = computed(() => props.modelValue > 0)
const autoText = computed(() => ms(props.autoMs))
const invalid = computed(() => typing.value !== null && manualTimeoutMs(typing.value) === null)

function setMode(mode: unknown) {
  typing.value = null
  if (mode === 'auto') emit('update:modelValue', 0)
  else if (!manual.value) emit('update:modelValue', Math.min(TOTAL_TIMEOUT_MAX_MS, Math.max(TOTAL_TIMEOUT_MIN_MS, props.autoMs)))
}

function onSeconds(v: unknown) {
  const raw = String(v ?? '')
  typing.value = raw
  const n = manualTimeoutMs(raw)
  if (n !== null) emit('update:modelValue', n)
}
</script>

<template>
  <SField :label="t('flows.timeoutTitle')" class="mod-config-wide" :error="invalid ? t('flows.timeoutInvalid', { value: modelValue / 1000 }) : ''">
    <div class="mod-timeout" role="radiogroup" :aria-label="t('flows.timeoutTitle')">
      <SRadio :model-value="manual ? 'manual' : 'auto'" value="auto" :label="t('flows.timeoutAuto', { value: autoText })" :disabled="disabled" @update:model-value="setMode" />
      <div class="mod-timeout-manual">
        <SRadio :model-value="manual ? 'manual' : 'auto'" value="manual" :label="t('flows.timeoutManual')" :disabled="disabled" @update:model-value="setMode" />
        <template v-if="manual">
          <SInput
            :model-value="typing ?? String(modelValue / 1000)"
            type="number"
            :min="1"
            :max="120"
            :step="0.5"
            size="sm"
            class="mod-timeout-input"
            :disabled="disabled"
            :aria-label="t('flows.timeoutSecondsAria')"
            @update:model-value="onSeconds"
            @blur="typing = null"
          />
          <span class="mod-sub">{{ t('flows.timeoutSeconds') }}</span>
        </template>
      </div>
    </div>
    <p v-if="manual && modelValue < autoMs" class="mod-text-warning">{{ t('flows.timeoutTruncate', { value: autoText }) }}</p>
    <SHint size="xs">{{ t('flows.timeoutHint') }}</SHint>
  </SField>
</template>
