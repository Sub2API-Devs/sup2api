<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { enumLabel } from './format'
import { useModHost } from './host'
import type { Channel } from './types'

// Price state of a channel, one badge: priced (its billing model as the
// tooltip), free, or not priced (the reason as the tooltip). `problemOnly`
// shows only the not-priced badge (next to a cost), nothing otherwise.
const props = defineProps<{ channel: Channel; problemOnly?: boolean }>()
const t = useModHost().t

const state = computed(() => {
  const c = props.channel
  const p = c.price_state
  if (!p) return null
  if (p.free) return { tone: 'info' as const, label: t('channels.free'), title: '' }
  if (p.priced) return { tone: 'success' as const, label: t('channels.priced'), title: c.billing_model ? t('channels.pricedAs', { model: p.billing_model || c.billing_model }) : '' }
  return { tone: 'warning' as const, label: t('channels.unpriced'), title: p.reason ? enumLabel('priceReason', p.reason) : '' }
})
</script>

<template>
  <template v-if="problemOnly">
    <SBadge v-if="state?.tone === 'warning'" tone="warning" size="xs" :title="state.title || undefined">{{ state.label }}</SBadge>
  </template>
  <SBadge v-else-if="state" :tone="state.tone" :title="state.title || undefined">{{ state.label }}</SBadge>
  <SHint v-else inline>—</SHint>
</template>
