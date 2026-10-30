<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { enumLabel, useModHost, type Channel } from './host'

// Price column of a channel: priced (as its billing model), free, or not
// priced with the reason as a tooltip and sub line.
const props = defineProps<{ channel: Channel }>()
const t = useModHost().t

const state = computed(() => {
  const c = props.channel
  const p = c.price_state
  if (!p) return null
  if (p.free) return { tone: 'info' as const, label: t('channels.free'), sub: '' }
  if (p.priced) return { tone: 'success' as const, label: t('channels.priced'), sub: c.billing_model ? t('channels.pricedAs', { model: p.billing_model || c.billing_model }) : '' }
  return { tone: 'warning' as const, label: t('channels.unpriced'), sub: p.reason ? enumLabel('priceReason', p.reason) : '' }
})
</script>

<template>
  <template v-if="state">
    <SBadge :tone="state.tone" :title="state.sub">{{ state.label }}</SBadge>
    <div v-if="state.sub && !channel.price_state?.priced" class="mod-sub mod-price-reason">{{ state.sub }}</div>
  </template>
  <SHint v-else inline>—</SHint>
</template>
