<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SCode, SDescItem, SDescriptions, SDisclosure, SHint, SIcon, SLink } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { formatNumber } from '@/utils/format'
import BillingBreakdown from '@/views/prices/BillingBreakdown.vue'
import ExprHistoryModal from '@/views/prices/ExprHistoryModal.vue'
import { billingTone, factText, type UsageRow } from './usage'

// Billing half of an expanded usage record (billing_detail, A.14).
const props = defineProps<{ u: UsageRow }>()
const { t, te } = useI18n()
const auth = useAuthStore()
const historyOpen = ref(false)

type Rule = { cond: string; multiplier: number | string; matched: boolean }
// billing_detail is free-form JSON (api/types: Record<string, any>).
const bd = computed<NonNullable<UsageRow['billing_detail']>>(() => props.u.billing_detail || {})
const breakdown = computed<Record<string, unknown>>(() => bd.value.breakdown || {})
const tierLen = computed<number | undefined>(() => bd.value.breakdown?.vars?.len)
const tierName = computed(() => props.u.matched_tier || bd.value.tier || '')
const rules = computed<Rule[]>(() => (Array.isArray(bd.value.rules) ? bd.value.rules : []))
const ledgerId = computed(() => props.u.ledger_id ?? bd.value.ledger_id ?? null)
const rate = computed(() => bd.value.rate_multiplier ?? props.u.rate_multiplier ?? null)
const inputs = computed(() => [
  ...Object.entries(bd.value.inputs?.params || {}).map(([key, value]) => ({ name: `param("${key}")`, value })),
  ...Object.entries(bd.value.inputs?.headers || {}).map(([key, value]) => ({ name: `header("${key}")`, value }))
])

/** The translation of `prefix.value` when there is one, else the raw value. */
function label(prefix: string, value: string) {
  return te(`${prefix}.${value}`) ? t(`${prefix}.${value}`) : value
}
</script>

<template>
  <SCard variant="flat" :title="t('usage.billing.title')" class="min-w-0" data-testid="usage-billing-facts">
    <template #actions>
      <SBadge :tone="billingTone(u.billing_status)">{{ label('usage.billing.status', u.billing_status) }}</SBadge>
    </template>
    <SDescriptions dense stacked :columns="2">
      <SDescItem :label="t('usage.billing.price')"><div class="flex flex-wrap items-center gap-2">
        <template v-if="u.price">
          <SLink v-if="auth.has('price:read')" :to="`/prices/${u.price.id}`" class="font-mono text-xs">{{ u.price.model }}</SLink>
          <span v-else class="font-mono text-xs">{{ u.price.model }}</span>
          <SBadge :tone="u.price.source === 'sync' ? 'info' : 'primary'">{{ label('prices.source', u.price.source) }}</SBadge>
        </template>
        <template v-else-if="u.price_id">
          <SLink v-if="auth.has('price:read')" :to="`/prices/${u.price_id}`">#{{ u.price_id }}</SLink>
          <span v-else>#{{ u.price_id }}</span>
        </template>
        <SHint v-else inline>—</SHint>
      </div></SDescItem>

      <SDescItem v-if="u.expr_hash" :label="t('prices.expression')"><div class="flex flex-wrap items-center gap-2">
        <span v-if="bd.expr_version !== undefined">v{{ bd.expr_version }}</span>
        <SCode inline :title="u.expr_hash" :text="t('usage.billing.hash', { hash: u.expr_hash.slice(0, 8) })" />
        <SLink v-if="auth.has('price:read')" as="button" class="text-xs" @click="historyOpen = true">{{ t('prices.viewHistory') }}</SLink>
      </div></SDescItem>

      <SDescItem v-if="u.billing_mode" :label="t('prices.modeCol')">{{ label('prices.mode', u.billing_mode) }}</SDescItem>

      <SDescItem v-if="tierName" :label="t('usage.billing.tier')">
        <span class="font-mono">{{ tierName }}</span>
        <SHint v-if="tierLen !== undefined" inline size="xs" class="ml-1"> ({{ t('usage.billing.len', { n: formatNumber(tierLen) }) }}) </SHint>
      </SDescItem>
    </SDescriptions>

    <div class="mt-3 border-t border-line pt-3">
      <BillingBreakdown
        v-if="Object.keys(breakdown).length || u.total_cost"
        :breakdown="breakdown"
        :rate-multiplier="rate"
        :total="u.total_cost"
        :rules="rules"
        :cache-write-labels="{ default: t('usage.tokens.cacheDefaultBucket'), oneHour: t('usage.tokens.cache1hBucket') }"
      />
      <SHint v-else inline>—</SHint>
      <SHint v-if="ledgerId" size="xs" class="mt-2">{{ t('usage.billing.ledger', { id: ledgerId }) }}</SHint>
    </div>

    <SDisclosure v-if="rules.length" :label="t('usage.billing.rules')" :open-label="t('usage.billing.rules')" class="mt-3">
      <ul class="space-y-1">
        <li v-for="(r, i) in rules" :key="i" class="flex flex-wrap items-center gap-2">
          <SCode inline :text="r.cond" />
          <span>×{{ r.multiplier }}</span>
          <SBadge :tone="r.matched ? 'success' : 'gray'">
            <SIcon :name="r.matched ? 'check' : 'x'" class="h-3 w-3" />{{ r.matched ? t('usage.billing.matched') : t('usage.billing.notMatched') }}
          </SBadge>
        </li>
      </ul>
    </SDisclosure>

    <SDisclosure v-if="inputs.length" :label="t('usage.billing.inputs')" :open-label="t('usage.billing.inputs')" class="mt-3">
      <div v-for="input in inputs" :key="input.name" class="break-all font-mono text-xs">{{ input.name }} = {{ factText(input.value) }}</div>
    </SDisclosure>
    <ExprHistoryModal v-model:open="historyOpen" :hash="u.expr_hash" />
  </SCard>
</template>
