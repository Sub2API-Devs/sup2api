<script setup lang="ts">
// Timestamp. mode absolute: localized date + time; relative: "3 minutes
// ago" / "in 2 hours"; auto (default): relative within 7 days, absolute
// before. The full absolute time is the hover title. Renders <time
// datetime>. `empty` replaces an empty / invalid value ('—'). `dateOnly`
// drops the time. Relative texts refresh every minute.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiLocale } from './i18n'

const props = withDefaults(defineProps<{ value: string | number | Date | null | undefined; mode?: 'absolute' | 'relative' | 'auto'; empty?: string; dateOnly?: boolean }>(), {
  mode: 'auto',
  empty: '—'
})
const locale = useUiLocale()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.mode !== 'absolute') timer = setInterval(() => (now.value = Date.now()), 60_000)
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
const absolute = computed(() => {
  if (!date.value) return ''
  const o: Intl.DateTimeFormatOptions = props.dateOnly
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  return new Intl.DateTimeFormat(lang.value, o).format(date.value)
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
  const rtf = new Intl.RelativeTimeFormat(lang.value, { numeric: 'auto' })
  if (abs < 45) return rtf.format(0, 'second')
  for (const [unit, sec] of UNITS) if (abs >= sec) return rtf.format(Math.round(diff / sec), unit)
  return rtf.format(0, 'second')
})
const text = computed(() => {
  if (!date.value) return props.empty
  if (props.mode === 'absolute') return absolute.value
  if (props.mode === 'relative') return relative.value
  return Math.abs(date.value.getTime() - now.value) < 7 * 86400_000 ? relative.value : absolute.value
})
</script>

<template>
  <time v-if="date" :datetime="date.toISOString()" :title="absolute" class="whitespace-nowrap">{{ text }}</time>
  <span v-else class="text-fg-subtle">{{ empty }}</span>
</template>
