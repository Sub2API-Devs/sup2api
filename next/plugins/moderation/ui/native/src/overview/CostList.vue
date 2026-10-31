<script setup lang="ts">
import { SHint } from '@sub2api/ui'
import { money, useModHost } from '../host'
import type { CostRow } from './figures'

// A titled list of cost rows (name, amount, calls) of the cost card.
defineProps<{ title: string; rows: CostRow[] }>()
const h = useModHost()
const t = h.t
const n = (v: number) => h.i18n.formatNumber(v)
</script>

<template>
  <div class="mod-ov-costs">
    <p class="mod-cost-label mod-cost-label-top">{{ title }}</p>
    <SHint v-if="!rows.length" size="xs">{{ t('overviewP3.cost.none') }}</SHint>
    <dl v-else class="mod-ov-cost-list">
      <template v-for="r in rows" :key="r.key">
        <dt :title="r.name">
          {{ r.name }}
          <div v-if="r.sub" class="mod-sub">{{ r.sub }}</div>
        </dt>
        <dd class="mod-num">
          {{ r.cost.priced_calls || r.cost.free_calls ? money(r.cost.cost) : t('cost.notPriced') }}
          <div class="mod-sub">
            {{ t('cost.calls', { n: n(r.cost.calls) }) }}<template v-if="r.cost.unpriced_calls"> · {{ t('channels.unpricedN', { n: n(r.cost.unpriced_calls) }) }}</template>
          </div>
        </dd>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.mod-ov-costs {
  min-width: 0;
}
.mod-ov-cost-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.375rem 1rem;
  margin: 0;
  font-size: 0.875rem;
}
.mod-ov-cost-list dt {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mod-ov-cost-list dd {
  margin: 0;
  text-align: right;
}
</style>
