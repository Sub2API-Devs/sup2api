<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SInput } from '@sub2api/ui'
import type { EffectiveRate } from '@/api/pricing'
import { validOverride } from './accessRateDrafts'
import { effectiveRate, inheritedRate, rateText } from './pricingFormat'

// The rate of a segment in a group, compact enough for a table cell. Empty
// (null) follows the group's default times the segment's discount, which the
// placeholder shows; a value replaces both. The line underneath says where
// the rate comes from, or what is wrong with the value.
const props = defineProps<{
  modelValue: string | null
  rate: Pick<EffectiveRate, 'group_default' | 'discount'>
  disabled?: boolean
  ariaLabel?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()
const { t } = useI18n()

const inherited = computed(() => rateText(inheritedRate(props.rate)))
const valid = computed(() => validOverride(props.modelValue))
const source = computed(() => {
  if (!valid.value) return t('pricing.rate.invalid')
  const group = rateText(props.rate.group_default)
  switch (effectiveRate(props.rate, props.modelValue).source) {
    case 'segment':
      return t('pricing.rate.override', { rate: inherited.value })
    case 'discount':
      return t('pricing.rate.discounted', { group, discount: rateText(props.rate.discount) })
    default:
      return t('pricing.rate.groupDefault', { group })
  }
})
</script>

<template>
  <div class="inline-flex flex-col gap-0.5 text-left" data-testid="rate-override">
    <SInput
      :model-value="modelValue ?? ''"
      size="sm"
      mono
      inputmode="decimal"
      clearable
      class="w-40"
      :error="!valid"
      :disabled="disabled"
      :placeholder="t('pricing.rate.follow', { rate: inherited })"
      :aria-label="ariaLabel || t('pricing.rate.label')"
      data-testid="rate-override-input"
      @update:model-value="emit('update:modelValue', String($event ?? '').trim() || null)"
    >
      <template v-if="modelValue !== null" #prefix><span class="text-xs text-fg-subtle">×</span></template>
    </SInput>
    <SHint size="xs" :tone="valid ? 'muted' : 'danger'" class="whitespace-nowrap leading-4" data-testid="rate-override-source">{{ source }}</SHint>
  </div>
</template>
