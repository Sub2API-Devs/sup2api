<script setup lang="ts">
// A timestamp as text. mode: 'datetime' (formatDateTime), 'time' (formatTime:
// today shows only the clock) or 'relative' ("3m ago", with the full time as
// the tooltip). `empty` is shown for a missing value; `live` re-renders a
// relative time every second (fixed at mount); `muted` (default) uses the secondary text colour.
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime, formatRelative, formatTime } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    value: string | number | Date | null | undefined
    mode?: 'datetime' | 'time' | 'relative'
    empty?: string
    live?: boolean
    muted?: boolean
  }>(),
  { mode: 'datetime', empty: '—', live: false, muted: true }
)
const { t } = useI18n()

const now = ref(Date.now())
const timer = props.live && props.mode === 'relative' ? setInterval(() => (now.value = Date.now()), 1000) : undefined
onBeforeUnmount(() => clearInterval(timer))

const date = computed(() => {
  const v = props.value
  const d = v === null || v === undefined || v === '' ? null : new Date(v)
  return d && !Number.isNaN(d.getTime()) ? d : null
})
const text = computed(() => {
  const d = date.value
  if (!d) return props.value ? String(props.value) : props.empty
  if (props.mode === 'time') return formatTime(d)
  if (props.mode === 'datetime') return formatDateTime(d)
  void now.value // re-render a live relative time every tick
  return formatRelative(d, t)
})
</script>

<template>
  <time
    :datetime="date?.toISOString()"
    :title="date && mode !== 'datetime' ? formatDateTime(date) : undefined"
    class="whitespace-nowrap"
    :class="muted ? 'text-fg-muted' : ''"
  >{{ text }}</time>
</template>
