<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMoney, formatNumber } from '@/utils/format'

// Renders a billing breakdown as produced by POST /prices/preview and stored
// in usage billing_detail.breakdown:
//   {vars:{p,c,cr,cc,cc1h,len}, tiers, items:[{tier,label,quantity?,rate?,expr,cost}],
//    subtotal, base, rules_multiplier}
// Unknown shapes fall back to a key/value list.
const props = defineProps<{
  breakdown: unknown
  rateMultiplier?: string | number | null
  total?: string | number | null
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
  if (l.startsWith('u:')) return l.slice(2)
  return te(`prices.items.${l}`) ? t(`prices.items.${l}`) : l
}

function isNum(v: unknown) {
  return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))
}

const rulesMult = computed(() => (isNum(bd.value.rules_multiplier) ? Number(bd.value.rules_multiplier) : 1))
const rate = computed(() => (isNum(props.rateMultiplier) ? Number(props.rateMultiplier) : null))

const extra = computed(() =>
  items.value.length
    ? []
    : Object.entries(bd.value).filter(([k]) => !['vars', 'tiers', 'items', 'subtotal', 'base', 'rules_multiplier'].includes(k))
)

function display(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<template>
  <div class="space-y-1 text-sm">
    <div v-for="(it, i) in items" :key="i" class="flex flex-wrap items-baseline gap-x-2">
      <span class="text-gray-700 dark:text-gray-300">{{ labelOf(it.label) }}</span>
      <span v-if="isNum(it.quantity) && isNum(it.rate)" class="font-mono text-xs">
        {{ formatNumber(it.quantity) }} × ${{ it.rate }}/M = {{ formatMoney(it.cost, 6) }}
      </span>
      <span v-else class="font-mono text-xs">{{ formatMoney(it.cost, 6) }}</span>
      <code v-if="it.expr" class="muted font-mono text-[11px]">{{ it.expr }}</code>
    </div>
    <dl v-if="extra.length" class="kv">
      <template v-for="[k, v] in extra" :key="k">
        <dt class="font-mono text-xs">{{ k }}</dt>
        <dd class="font-mono text-xs">{{ display(v) }}</dd>
      </template>
    </dl>
    <p v-if="isNum(bd.subtotal) || isNum(total)" class="border-t border-gray-100 pt-1 font-mono text-xs dark:border-dark-700">
      <template v-if="isNum(bd.subtotal)">
        {{ t('prices.items.subtotal') }} {{ formatMoney(bd.subtotal, 6) }}
        <template v-if="rulesMult !== 1"> × {{ t('prices.items.rules') }} {{ rulesMult }} = {{ formatMoney(bd.base, 6) }}</template>
      </template>
      <template v-if="rate !== null"> × {{ t('prices.items.groupRate') }} {{ rate.toFixed(2) }}</template>
      <template v-if="isNum(total)"> = <span class="font-semibold">{{ formatMoney(total, 6) }}</span></template>
    </p>
  </div>
</template>
