<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import { formatMoney, formatNumber } from '@/utils/format'

// Renders a billing breakdown as produced by POST /prices/preview and stored
// in usage billing_detail.breakdown:
//   {vars:{p,c,cr,cc,cc1h,len}, tiers, items:[{tier,label,quantity?,rate?,expr,cost}],
//    subtotal, base, rules_multiplier}
const props = defineProps<{
  breakdown: unknown
  rateMultiplier?: string | number | null
  total?: string | number | null
  rules?: Array<{ multiplier: number | string; matched: boolean }>
  cacheWriteLabels?: { default: string; oneHour: string }
}>()
const { t, te } = useI18n()

interface Item {
  tier?: string
  label?: string
  quantity?: number | string | null
  rate?: number | string | null
  expr?: string
  cost?: string | number
}

const bd = computed<Record<string, any>>(() => (props.breakdown && typeof props.breakdown === 'object' ? (props.breakdown as Record<string, any>) : {}))
const items = computed<Item[]>(() => (Array.isArray(bd.value.items) ? bd.value.items : []))

function labelOf(l?: string): string {
  if (!l) return t('prices.items.other')
  if (l === 'cc' && props.cacheWriteLabels) return props.cacheWriteLabels.default
  if (l === 'cc1h' && props.cacheWriteLabels) return props.cacheWriteLabels.oneHour
  if (l.startsWith('u:')) return l.slice(2)
  return te(`prices.items.${l}`) ? t(`prices.items.${l}`) : l
}

function isNum(v: unknown) {
  return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v))
}

const rulesMult = computed(() => (isNum(bd.value.rules_multiplier) ? bd.value.rules_multiplier : null))
const rate = computed(() => (isNum(props.rateMultiplier) ? Number(props.rateMultiplier) : null))
const matchedMultipliers = computed(() => (props.rules || []).filter((r) => r.matched).map((r) => r.multiplier))
</script>

<template>
  <div class="space-y-1 text-sm">
    <div v-for="(it, i) in items" :key="i" class="flex flex-wrap items-baseline gap-x-2">
      <span class="text-gray-700 dark:text-gray-300">{{ labelOf(it.label) }}</span>
      <span v-if="isNum(it.quantity) && isNum(it.rate)" class="font-mono text-xs">
        {{ formatNumber(it.quantity, 8) }} × ${{ it.rate }}/M = {{ formatMoney(it.cost, 8) }}
      </span>
      <span v-else class="font-mono text-xs">{{ formatMoney(it.cost, 8) }}</span>
      <SHint v-if="it.expr" inline size="xs" class="font-mono">{{ it.expr }}</SHint>
    </div>
    <p v-if="matchedMultipliers.length && rulesMult !== null" class="font-mono text-xs" data-testid="stacked-multipliers">
      {{ t('prices.items.rules') }}: {{ matchedMultipliers.join(' × ') }} = {{ rulesMult }}
    </p>
    <p v-if="isNum(bd.base) || isNum(total)" class="border-t border-gray-100 pt-1 font-mono text-xs dark:border-dark-700">
      <template v-if="isNum(bd.base)">
        {{ t('prices.items.base') }} {{ formatMoney(bd.base, 8) }}
        <template v-if="rulesMult !== null"> × {{ t('prices.items.rules') }} {{ rulesMult }}</template>
        <template v-if="rate !== null"> × {{ t('prices.items.groupRate') }} {{ rate }}</template>
      </template>
      <template v-if="isNum(total)"><template v-if="isNum(bd.base)"> = </template><span class="font-semibold">{{ formatMoney(total, 8) }}</span></template>
    </p>
  </div>
</template>
