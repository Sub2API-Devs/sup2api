<script setup lang="ts">
// A timestamp as text. mode: 'datetime' (formatDateTime), 'time' (formatTime:
// today shows only the clock) or 'relative' ("3m ago", with the full time as
// the tooltip). `empty` is shown for a missing value; `live` re-renders a
// relative time every second; `muted` (default) uses the secondary text colour.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function startTimer() {
  clearInterval(timer)
  timer = props.live && props.mode === 'relative' ? setInterval(() => tick.value++, 1000) : undefined
}
onMounted(startTimer)
watch(() => [props.live, props.mode], startTimer)
onBeforeUnmount(() => clearInterval(timer))

const iso = computed(() => {
  const v = props.value
  if (v === null || v === undefined || v === '') return undefined
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
})
const text = computed(() => {
  void tick.value
  const v = props.value
  if (v === null || v === undefined || v === '') return props.empty
  if (props.mode === 'relative') return formatRelative(v, t)
  return props.mode === 'time' ? formatTime(v) : formatDateTime(v)
})
const title = computed(() => (props.mode !== 'datetime' && iso.value ? formatDateTime(props.value) : undefined))
</script>

<template>
  <time :datetime="iso" :title="title" class="whitespace-nowrap" :class="muted ? 'text-fg-muted' : ''">{{ text }}</time>
</template>
