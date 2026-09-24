<script setup lang="ts">
// Compact, detailed view of a price definition {mode, config, expression}:
// per-request price, per-token prices, or one line per tier. With `compare`,
// values that differ from the compared definition are highlighted.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PriceSyncDef } from '@/api/types'
import { TOKEN_VARS, hasVisualConfig, isSet, normalizeVisual, num, parseExpression, tokenPricesFrom, type TokenPrices, type TokenVar } from './priceExpr'

const props = defineProps<{ def: PriceSyncDef; compare?: PriceSyncDef | null; muted?: boolean }>()
const { t } = useI18n()

interface Line {
  name: string
  max_len: number | null
  flat: number
  prices: TokenPrices
}

type View = { kind: 'per_request'; price: number } | { kind: 'tiers'; lines: Line[]; rules: number } | { kind: 'custom'; expression: string }

function viewOf(d: PriceSyncDef): View {
  const cfg = d.config || {}
  if (d.mode === 'per_request') {
    if (cfg.price !== undefined) return { kind: 'per_request', price: num(cfg.price) }
    const v = parseExpression(d.expression)
    if (v && v.tiers.length === 1) return { kind: 'per_request', price: v.tiers[0].flat }
  }
  if (d.mode === 'per_token') {
    if (TOKEN_VARS.some((k) => cfg[k] !== undefined)) return { kind: 'tiers', lines: [{ name: '', max_len: null, flat: 0, prices: tokenPricesFrom(cfg) }], rules: 0 }
  }
  const vis = hasVisualConfig(cfg) ? normalizeVisual(cfg) : parseExpression(d.expression)
  if (!vis) return { kind: 'custom', expression: d.expression }
  const lines = vis.tiers.map((x) => ({ name: vis.tiers.length > 1 ? x.name : '', max_len: x.max_len, flat: x.flat, prices: tokenPricesFrom(x) }))
  return { kind: 'tiers', lines, rules: vis.rules.length }
}

const view = computed(() => viewOf(props.def))
const other = computed(() => (props.compare ? viewOf(props.compare) : null))

function usd(v: number | null): string {
  if (v === null || v === undefined) return '—'
  return '$' + String(Number(Number(v).toPrecision(8)))
}

/** True when the value differs from the same position of the compared definition. */
function differs(i: number, k: TokenVar | 'flat' | 'price'): boolean {
  const o = other.value
  if (!o) return false
  const v = view.value
  if (v.kind === 'per_request') return o.kind !== 'per_request' || o.price !== v.price
  if (v.kind !== 'tiers') return false
  if (o.kind !== 'tiers') return true
  const a = v.lines[i]
  const b = o.lines[i]
  if (!b) return true
  if (k === 'flat') return num(a.flat) !== num(b.flat)
  if (k === 'price') return false
  const x = a.prices[k]
  const y = b.prices[k]
  return isSet(x) !== isSet(y) || (isSet(x) && num(x) !== num(y))
}

function shownVars(l: Line): TokenVar[] {
  return TOKEN_VARS.filter((k) => isSet(l.prices[k]) || k === 'p' || k === 'c')
}
</script>

<template>
  <div class="text-xs leading-5" :class="muted ? 'text-gray-500 dark:text-dark-400' : 'text-gray-800 dark:text-gray-200'">
    <span v-if="view.kind === 'per_request'" :class="differs(0, 'price') ? 'font-semibold text-amber-600 dark:text-amber-400' : ''">
      {{ t('prices.def.perRequest', { price: usd(view.price) }) }}
    </span>
    <template v-else-if="view.kind === 'tiers'">
      <div v-for="(l, i) in view.lines" :key="i" class="flex flex-wrap gap-x-2">
        <span v-if="l.name" class="muted font-mono">
          {{ l.name }}<template v-if="l.max_len !== null"> ≤{{ l.max_len }}</template><template v-else-if="view.lines.length > 1"> ({{ t('prices.def.otherwise') }})</template>:
        </span>
        <span v-if="num(l.flat)" :class="differs(i, 'flat') ? 'font-semibold text-amber-600 dark:text-amber-400' : ''">
          {{ t('prices.vars.flat') }} {{ usd(l.flat) }}
        </span>
        <span v-for="k in shownVars(l)" :key="k" :class="differs(i, k) ? 'font-semibold text-amber-600 dark:text-amber-400' : ''">
          {{ t(`prices.vars.${k}`) }} {{ usd(l.prices[k]) }}
        </span>
        <span class="muted">{{ t('prices.def.perMillion') }}</span>
      </div>
      <div v-if="view.rules" class="muted">{{ t('prices.def.rules', { n: view.rules }) }}</div>
    </template>
    <span v-else class="block max-w-md truncate font-mono" :title="view.expression">{{ t('prices.summary.custom') }} · {{ view.expression }}</span>
  </div>
</template>
