<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SField, SGrid, SHint, SInput, SSegmented, type SelectOption } from '@sub2api/ui'
import type { PriceDef, PriceRule } from '@/api/pricing'
import { applyRule, priceBrief } from './pricingFormat'
import { customFields, startRule, validRule } from './ruleDrafts'
import { priceLabel } from './ruleText'

// One price rule over the global price `base`: none (the price follows the
// level above, named by `inheritLabel`), a multiplier of the global price, or
// a price of its own in the global price's mode. An expression price takes a
// multiplier only; a model without a global price takes no rule at all.
// Every edit emits a whole new rule, valid or not: `valid` says which.
type Kind = 'inherit' | PriceRule['kind']

const props = defineProps<{
  modelValue: PriceRule | null
  base: PriceDef | null
  inheritLabel: string
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: PriceRule | null): void }>()
const { t } = useI18n()

const kind = computed<Kind>(() => props.modelValue?.kind ?? 'inherit')
const expressionOnly = computed(() => props.base?.mode === 'expression')
const options = computed<SelectOption[]>(() => [
  { value: 'inherit', label: props.inheritLabel },
  { value: 'multiplier', label: t('pricing.rule.multiplier') },
  { value: 'custom', label: t('pricing.rule.custom'), disabled: expressionOnly.value }
])
const valid = computed(() => validRule(props.modelValue))
/** The prices of a custom rule; none while the rule is of another kind. */
const custom = computed(() => (props.modelValue?.kind === 'custom' ? { rule: props.modelValue, ...customFields(props.modelValue.mode) } : null))
const preview = computed(() => {
  const applied = applyRule(props.base, props.modelValue)
  return priceBrief(applied) ? t('pricing.rule.applied', { price: priceLabel(t, applied) }) : t('pricing.rule.appliedOpaque')
})
const customHint = computed(() => {
  const perRequest = custom.value?.rule.mode === 'per_request'
  if (valid.value) return perRequest ? t('pricing.rule.requestUnit') : t('pricing.rule.tokenUnit')
  return perRequest ? t('pricing.rule.requestInvalid') : t('pricing.rule.tokenInvalid')
})

/** Token prices are named as in the model price editor. */
const fieldLabel = (key: string) => (key === 'price' ? t('pricing.rule.requestPrice') : t(`prices.vars.${key}`))

function choose(next: Kind) {
  if (next === 'inherit') return emit('update:modelValue', null)
  if (props.base) emit('update:modelValue', startRule(next, props.base))
}
function setPrice(rule: Extract<PriceRule, { kind: 'custom' }>, key: string, price: number | null) {
  emit('update:modelValue', { ...rule, config: { ...rule.config, [key]: price } })
}

defineExpose({ valid })
</script>

<template>
  <div class="flex flex-col items-start gap-2 text-left" data-testid="price-rule-editor">
    <SSegmented
      :model-value="kind"
      :options="options"
      size="sm"
      :disabled="disabled || !base"
      :aria-label="t('pricing.rule.mode')"
      data-testid="price-rule-kind"
      @update:model-value="choose($event as Kind)"
    />
    <SAlert v-if="!base" tone="warning" dense data-testid="price-rule-no-base">{{ t('pricing.rule.noBase') }}</SAlert>
    <SHint v-else-if="expressionOnly" size="xs" data-testid="price-rule-expression-only">{{ t('pricing.rule.expressionOnly') }}</SHint>

    <div v-if="modelValue?.kind === 'multiplier'" class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <SInput
        :model-value="modelValue.multiplier"
        size="sm"
        mono
        inputmode="decimal"
        class="w-24"
        :error="!valid"
        :disabled="disabled"
        :aria-label="t('pricing.rule.multiplier')"
        data-testid="price-rule-multiplier"
        @update:model-value="emit('update:modelValue', { kind: 'multiplier', multiplier: String($event ?? '').trim() })"
      >
        <template #prefix><span class="text-xs text-fg-subtle">×</span></template>
      </SInput>
      <SHint inline size="xs" :tone="valid ? 'muted' : 'danger'" data-testid="price-rule-preview">{{ valid ? preview : t('pricing.rule.multiplierInvalid') }}</SHint>
    </div>

    <template v-if="custom">
      <SGrid :cols-base="2" :gap="2" class="w-full max-w-xs">
        <SField v-for="(key, i) in custom.keys" :key="key" size="sm" :label="fieldLabel(key)" :required="i < custom.required">
          <SInput
            :model-value="custom.rule.config[key]"
            type="number"
            min="0"
            step="any"
            mono
            :disabled="disabled"
            :data-testid="`price-rule-${key}`"
            @update:model-value="setPrice(custom.rule, key, $event as number | null)"
          />
        </SField>
      </SGrid>
      <SHint size="xs" :tone="valid ? 'muted' : 'danger'" data-testid="price-rule-unit">{{ customHint }}</SHint>
    </template>
  </div>
</template>
