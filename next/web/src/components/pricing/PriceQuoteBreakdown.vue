<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SBadge, SGrid, SHint } from '@sub2api/ui'
import type { PriceDef, PriceRule, PricingQuote } from '@/api/pricing'
import { formatMoney } from '@/utils/format'
import SegmentBadge from './SegmentBadge.vue'
import { rateText } from './pricingFormat'
import { priceLevels, rateLevels, type LevelState, type QuoteLevel } from './quoteLevels'
import { priceLabel, ruleText } from './ruleText'

// A quote (POST /pricing/quote) read as one sum: whether the segment may use
// the group, the list price and the rate level by level (the one that applies
// stands out, the ones under it are greyed), and list cost × rate = paid.
// A segment without the grant still gets its price: what it would pay.
const props = defineProps<{ quote: PricingQuote; groupName?: string }>()
const { t } = useI18n()

interface LevelRow {
  key: string
  label: string
  /** What the level is set to; '' = not set. */
  text: string
  state: LevelState
}
interface Chain {
  key: 'price' | 'rate'
  rows: LevelRow[]
}

/** A level of the list price: a rule of the segment or of the group, or the global price itself. */
function priceLevelText(v: PriceRule | PriceDef): string {
  return 'kind' in v ? ruleText(t, v) : priceLabel(t, v)
}

const names = computed(() => ({
  segment: props.quote.segment.name,
  group: props.groupName ?? '',
  base: rateText(props.quote.rate.group_default),
  discount: rateText(props.quote.rate.discount)
}))

function chain<V>(key: Chain['key'], levels: QuoteLevel<string, V>[], text: (v: V) => string): Chain {
  return {
    key,
    rows: levels.map((l) => ({ key: l.key, state: l.state, label: t(`pricingTools.quote.${key}.${l.key}`, names.value), text: l.value === null ? '' : text(l.value) }))
  }
}
const chains = computed(() => [chain('price', priceLevels(props.quote), priceLevelText), chain('rate', rateLevels(props.quote), rateText)])

const ROW_CLASS: Record<LevelState, string> = {
  applies: 'border-primary-500 bg-primary-50/60 text-fg dark:bg-primary-900/20',
  shadowed: 'border-line text-fg-subtle',
  unset: 'border-dashed border-line text-fg-subtle'
}
</script>

<template>
  <div class="space-y-4 text-sm" data-testid="price-quote">
    <div class="flex flex-wrap items-center gap-2" data-testid="price-quote-access">
      <h4 class="mr-1 font-semibold text-fg">{{ t('pricingTools.quote.access.title') }}</h4>
      <SegmentBadge :segment="quote.segment" with-name />
      <SBadge :tone="quote.accessible ? 'success' : 'danger'">{{ t(`pricingTools.quote.access.${quote.access_source}`) }}</SBadge>
    </div>
    <SAlert v-if="!quote.accessible" tone="danger" :title="t('pricingTools.quote.denied')" data-testid="price-quote-denied">
      {{ t('pricingTools.quote.deniedHint') }}
    </SAlert>

    <SGrid :cols="1" :lg-cols="2">
      <section v-for="c in chains" :key="c.key" :data-testid="`price-quote-${c.key}`">
        <h4 class="font-semibold text-fg">{{ t(`pricingTools.quote.${c.key}.title`) }}</h4>
        <SHint size="xs" class="mb-2">{{ t(`pricingTools.quote.${c.key}.hint`) }}</SHint>
        <ol class="space-y-1.5">
          <li
            v-for="row in c.rows"
            :key="row.key"
            class="flex items-center justify-between gap-3 rounded-control border px-3 py-2"
            :class="ROW_CLASS[row.state]"
            :data-level="row.key"
            :data-state="row.state"
          >
            <span class="min-w-0">{{ row.label }}</span>
            <span class="flex shrink-0 items-center gap-2">
              <span :class="row.text ? 'font-mono' : ''">{{ row.text || t('pricingTools.quote.unset') }}</span>
              <SBadge v-if="row.state === 'applies'" tone="primary" size="xs">{{ t('pricingTools.quote.applies') }}</SBadge>
            </span>
          </li>
        </ol>
      </section>
    </SGrid>

    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-4" data-testid="price-quote-paid">
      <h4 class="font-semibold text-fg">{{ t(quote.accessible ? 'pricingTools.quote.paid' : 'pricingTools.quote.paidIfGranted') }}</h4>
      <p class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <SHint inline>{{ t('pricingTools.quote.listCost') }}</SHint>
        <span class="font-mono text-fg">{{ formatMoney(quote.list_cost, 6) }}</span>
        <span class="text-fg-subtle">×</span>
        <SHint inline>{{ t('pricingTools.quote.rateName') }}</SHint>
        <span class="font-mono text-fg">{{ rateText(quote.rate.value) }}</span>
        <span class="text-fg-subtle">=</span>
        <span class="font-mono text-2xl font-semibold text-fg" data-testid="price-quote-cost">{{ formatMoney(quote.cost, 6) }}</span>
      </p>
    </div>
  </div>
</template>
