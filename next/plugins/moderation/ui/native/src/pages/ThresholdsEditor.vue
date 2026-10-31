<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SField, SHint, SInput } from '@sub2api/ui'
import { categoryLabel, useModHost } from '../host'
import { THRESHOLD_PRESETS, parseThresholds, presetThresholds, thresholdPresetOf } from './thresholds'

// OpenAI auditor thresholds (new-api openai-thresholds-editor.tsx): presets
// 宽松 (×1.1, capped at 1) / 默认 / 严格 (×0.75), then per-category inputs;
// empty = the default threshold. The active preset is detected from the values.
const props = defineProps<{ modelValue: Record<string, string>; categories: string[]; defaults: Record<string, number> }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void }>()
const t = useModHost().t

const preset = computed(() => thresholdPresetOf(parseThresholds(props.modelValue), props.categories, props.defaults))

function apply(factor: number) {
  const th = presetThresholds(factor, props.categories, props.defaults)
  emit('update:modelValue', Object.fromEntries(Object.entries(th).map(([k, v]) => [k, String(v)])))
}

function set(c: string, v: unknown) {
  emit('update:modelValue', { ...props.modelValue, [c]: typeof v === 'string' || typeof v === 'number' ? String(v) : '' })
}

const invalid = (c: string) => {
  const v = props.modelValue[c]
  if (v === undefined || String(v).trim() === '') return false
  const x = Number(v)
  return !(x > 0 && x <= 1)
}
</script>

<template>
  <div class="mod-pg-th-editor">
    <div class="mod-pg-th-presets">
      <SButton v-for="p in THRESHOLD_PRESETS" :key="p.id" size="sm" :variant="preset === p.id ? 'primary' : 'secondary'" @click="apply(p.factor)">{{ t(`pagesP3.preset.${p.id}`) }}</SButton>
      <SHint inline size="xs">{{ preset ? t('pagesP3.preset.current', { name: t(`pagesP3.preset.${preset}`) }) : t('pagesP3.preset.custom') }} · {{ t('pagesP3.preset.hint') }}</SHint>
    </div>
    <div class="mod-threshold-grid">
      <SField v-for="c in categories" :key="c" :label="categoryLabel(c)" size="sm" :error="invalid(c) ? t('pagesP3.preset.invalid') : ''">
        <SInput :model-value="modelValue[c] ?? ''" type="number" min="0.01" max="1" step="0.01" size="sm" :placeholder="String(defaults[c] ?? '')" @update:model-value="set(c, $event)" />
      </SField>
    </div>
  </div>
</template>

<style scoped>
.mod-pg-th-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mod-pg-th-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
</style>
