<script setup lang="ts">
// Timestamp, the one way the console and plugins show a time. Modes:
// - absolute: "2026-10-31 15:04:05" (dateOnly: "2026-10-31");
// - time: the clock alone today, "10-30 15:04:05" on another day (log rows);
// - relative: "3m ago" / "3分钟前" (narrow Intl.RelativeTimeFormat);
// - auto (default): relative within 7 days, absolute before.
// The absolute time is the hover title of the other modes. Renders <time
// datetime>. `empty` replaces an empty / invalid value ('—'). Relative texts
// refresh every minute, every second with `live`. `muted` uses the secondary
// text colour.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiLocale } from './i18n'

const props = withDefaults(
  defineProps<{
    value: string | number | Date | null | undefined
    mode?: 'absolute' | 'time' | 'relative' | 'auto'
    empty?: string
    dateOnly?: boolean
    /** Refresh a relative time every second instead of every minute. */
    live?: boolean
    muted?: boolean
  }>(),
  { mode: 'auto', empty: '—' }
)
const locale = useUiLocale()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.mode === 'absolute' || props.mode === 'time') return
  timer = setInterval(() => (now.value = Date.now()), props.live ? 1000 : 60_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const date = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') return null
  const d = props.value instanceof Date ? props.value : new Date(props.value)
  return Number.isNaN(d.getTime()) ? null : d
})
const lang = computed(() => (locale() === 'zh' ? 'zh-CN' : locale()))
const p2 = (x: number) => String(x).padStart(2, '0')
const clock = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
const day = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

const absolute = computed(() => {
  const d = date.value
  if (!d) return ''
  return props.dateOnly ? day(d) : `${day(d)} ${clock(d)}`
})
const time = computed(() => {
  const d = date.value
  if (!d) return ''
  if (d.toDateString() === new Date(now.value).toDateString()) return clock(d)
  return `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${clock(d)}`
})
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1]
]
const relative = computed(() => {
  if (!date.value) return ''
  const diff = (date.value.getTime() - now.value) / 1000
  const abs = Math.abs(diff)
  if (abs < 1) return new Intl.RelativeTimeFormat(lang.value, { numeric: 'auto', style: 'narrow' }).format(0, 'second')
  const rtf = new Intl.RelativeTimeFormat(lang.value, { numeric: 'always', style: 'narrow' })
  for (const [unit, sec] of UNITS) if (abs >= sec) return rtf.format(Math.sign(diff) * Math.floor(abs / sec), unit)
  return rtf.format(0, 'second')
})
const text = computed(() => {
  if (!date.value) return props.empty
  if (props.mode === 'absolute') return absolute.value
  if (props.mode === 'time') return time.value
  if (props.mode === 'relative') return relative.value
  return Math.abs(date.value.getTime() - now.value) < 7 * 86400_000 ? relative.value : absolute.value
})
</script>

<template>
  <time
    v-if="date"
    :datetime="date.toISOString()"
    :title="mode === 'absolute' ? undefined : absolute"
    class="whitespace-nowrap"
    :class="muted ? 'text-fg-muted' : ''"
  >{{ text }}</time>
  <span v-else class="text-fg-subtle">{{ empty }}</span>
</template>
