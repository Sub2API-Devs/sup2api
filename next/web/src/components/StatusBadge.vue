<script setup lang="ts">
// Status badge of a list row: tone from statusTone() (@/api/admin), label from
// common.status_.<status> (falls back to the raw value). `labels` maps a status
// to another i18n key (e.g. { expired: 'apikeys.expired' }); `tone` overrides
// the computed tone.
import { computed } from 'vue'
import { SBadge, type Tone } from '@sub2api/ui'
import { statusTone } from '@/api/admin'
import { useOptionalT } from '@/composables/optionalText'

const props = withDefaults(
  defineProps<{ status: string | null | undefined; labels?: Record<string, string>; tone?: Tone; dot?: boolean }>(),
  { labels: undefined, tone: undefined, dot: true }
)
const tr = useOptionalT()
const label = computed(() => {
  const s = props.status || ''
  return s ? tr(props.labels?.[s] ?? `common.status_.${s}`, undefined, s) : '—'
})
</script>

<template>
  <SBadge :tone="tone ?? statusTone(status)" :dot="dot" data-testid="status-badge" :data-status="status">{{ label }}</SBadge>
</template>
