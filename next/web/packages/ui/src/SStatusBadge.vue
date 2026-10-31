<script setup lang="ts">
// Status badge of a list row or detail header. Tone from statusTone()
// (`tones` adds or overrides statuses, `tone` forces one); label from the
// library's `ui.status.<status>` messages, `labels` (status → text) or
// `label`, else the raw status. An empty status shows '—'.
import { computed } from 'vue'
import { useUiT } from './i18n'
import SBadge from './SBadge.vue'
import { statusTone } from './status'
import type { Tone } from './types'

const props = withDefaults(
  defineProps<{
    status: string | null | undefined
    label?: string
    labels?: Record<string, string>
    tone?: Tone
    tones?: Record<string, Tone>
    dot?: boolean
    size?: 'xs' | 'sm'
  }>(),
  { label: undefined, labels: undefined, tone: undefined, tones: undefined, dot: true, size: 'sm' }
)
const t = useUiT()
const text = computed(() => {
  const s = props.status || ''
  if (props.label) return props.label
  if (!s) return '—'
  if (props.labels?.[s]) return props.labels[s]
  const key = `ui.status.${s.toLowerCase()}`
  const r = t(key)
  return r === key ? s : r
})
</script>

<template>
  <SBadge :tone="tone ?? statusTone(status, tones)" :dot="dot" :size="size" data-testid="status-badge" :data-status="status">{{ text }}</SBadge>
</template>
