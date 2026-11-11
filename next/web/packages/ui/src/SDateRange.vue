<script setup lang="ts">
// Time range picker: a trigger showing the preset (and the dates it covers)
// that opens a panel with the presets on the left and a start / end date
// pair with Apply on the right. Same v-model contract as STimeRange: range,
// from and to (RFC 3339, '' = open; to is exclusive). The end date shown and
// typed is inclusive: Apply sends `to` = the local midnight after it.
// Picking a preset applies it and closes; Escape closes and returns focus to
// the trigger. `label` = false hides the field label (the trigger keeps an
// aria-label). On a compact screen the trigger shows only the preset and the
// panel is a bottom sheet: the presets as a grid, the date pair under them.
// `time` works to the second, as new-api's log filter does: the trigger shows
// both ends in full, the pair is two date-time inputs, and a preset fills
// both ends (an open end closes at the end of today).
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import SField from './SField.vue'
import { useUiT } from './i18n'
import { useFloating } from './floating'
import { useViewport } from './viewport'
import { RANGE_LABELS, closedRangeBounds, dayKey, rangeBounds, toLocalSecondsInput, type RangeKey } from './timeRange'
import DayRangeForm from './internal/DayRangeForm.vue'
import RangeSheet from './internal/RangeSheet.vue'
import RangeTrigger from './internal/RangeTrigger.vue'

const props = withDefaults(
  defineProps<{ range: RangeKey; from: string; to: string; keys?: RangeKey[]; size?: 'sm' | 'md'; label?: boolean; time?: boolean }>(),
  { keys: () => ['today', 'yesterday', '24h', '7d', '14d', '30d', 'month', 'lastMonth', 'custom'], size: 'md', label: true, time: false }
)
const emit = defineEmits<{
  (e: 'update:range', v: RangeKey): void
  (e: 'update:from', v: string): void
  (e: 'update:to', v: string): void
}>()
const t = useUiT()
const { compact } = useViewport()
const open = ref(false)
const anchor = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const panelId = useId()
const floating = useFloating(anchor, panel, { align: 'start', onLost: () => close(false) })

const presets = computed(() => props.keys.filter(k => k !== 'custom'))
const customAllowed = computed(() => props.keys.includes('custom'))

/** "MM-DD ~ MM-DD" of the current bounds (the end inclusive), or '' for an open start. */
const span = computed(() => {
  if (!props.from) return ''
  const a = new Date(props.from)
  if (Number.isNaN(a.getTime())) return ''
  if (props.time) {
    // The last second in range: `to` is exclusive.
    const end = props.to ? new Date(new Date(props.to).getTime() - 1000) : null
    const text = (d: Date) => toLocalSecondsInput(d).replace('T', ' ')
    return `${text(a)} ~ ${end && !Number.isNaN(end.getTime()) ? text(end) : t('ui.now')}`
  }
  const b = props.to ? new Date(new Date(props.to).getTime() - 1) : new Date()
  const s = dayKey(a).slice(5)
  const e = Number.isNaN(b.getTime()) ? '' : dayKey(b).slice(5)
  return s === e ? s : `${s} ~ ${e}`
})

const draftStart = ref('')
const draftEnd = ref('')

/** Local midnight of a "YYYY-MM-DD" value, `plusDays` later. */
function midnight(v: string, plusDays = 0): Date {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d + plusDays)
}

function onDoc(e: MouseEvent) {
  const target = e.target as Node
  if (anchor.value?.contains(target) || panel.value?.contains(target)) return
  close(false)
}
function show() {
  if (open.value) return
  if (props.time) {
    draftStart.value = toLocalSecondsInput(props.from)
    draftEnd.value = toLocalSecondsInput(props.to ? new Date(new Date(props.to).getTime() - 1000) : new Date())
  } else {
    draftStart.value = props.from ? dayKey(props.from) : ''
    draftEnd.value = dayKey(props.to ? new Date(new Date(props.to).getTime() - 1) : new Date())
  }
  open.value = true
  if (compact.value) return
  document.addEventListener('mousedown', onDoc)
  nextTick(() => {
    floating.start()
    panel.value?.querySelector<HTMLElement>('button[aria-pressed="true"], button')?.focus({ preventScroll: true })
  })
}
function close(restore = true) {
  if (!open.value) return
  open.value = false
  floating.stop()
  document.removeEventListener('mousedown', onDoc)
  if (restore) nextTick(() => anchor.value?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }))
}
function toggle() {
  if (open.value) close(false)
  else show()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
  }
}
function pick(k: RangeKey) {
  const b = props.time ? closedRangeBounds(k) : rangeBounds(k)
  emit('update:range', k)
  emit('update:from', b.from)
  emit('update:to', b.to)
  close()
}
function apply() {
  emit('update:range', 'custom')
  if (props.time) {
    // The end typed is the last second in range; `to` is exclusive.
    emit('update:from', new Date(draftStart.value).toISOString())
    emit('update:to', new Date(new Date(draftEnd.value).getTime() + 1000).toISOString())
  } else {
    emit('update:from', midnight(draftStart.value).toISOString())
    emit('update:to', midnight(draftEnd.value, 1).toISOString())
  }
  close()
}
onBeforeUnmount(() => close(false))
defineExpose({ open: show, close: () => close(false) })
</script>

<template>
  <div class="inline-block">
    <SField :label="label ? t('ui.time') : undefined">
      <span ref="anchor" class="inline-block">
        <RangeTrigger
          :range="range"
          :open="open"
          :label="label"
          :span="compact ? '' : span"
          :size="size"
          :controls="compact ? undefined : panelId"
          data-testid="date-range-trigger"
          @click="toggle"
        />
      </span>
    </SField>
    <RangeSheet v-if="compact" :open="open" :range="range" :keys="keys" @update:open="close(false)" @pick="pick">
      <DayRangeForm v-if="customAllowed" v-model:start="draftStart" v-model:end="draftEnd" :time="time" @apply="apply" />
    </RangeSheet>
    <Teleport v-else to="body">
      <div
        v-if="open"
        :id="panelId"
        ref="panel"
        role="dialog"
        :aria-label="t('ui.time')"
        class="fixed z-popover flex gap-3 rounded-card border border-line bg-surface p-3 shadow-popover"
        :style="floating.style.value"
        data-testid="date-range-panel"
        @keydown="onKey"
      >
        <ul class="flex w-32 shrink-0 flex-col gap-0.5" role="list">
          <li v-for="k in presets" :key="k">
            <button
              type="button"
              class="w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors"
              :class="
                k === range
                  ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              "
              :aria-pressed="k === range"
              :data-key="k"
              @click="pick(k)"
            >
              {{ t(RANGE_LABELS[k]) }}
            </button>
          </li>
        </ul>
        <DayRangeForm
          v-if="customAllowed"
          v-model:start="draftStart"
          v-model:end="draftEnd"
          :time="time"
          class="border-l border-line pl-3"
          :class="time ? 'w-64' : 'w-56'"
          @apply="apply"
        />
      </div>
    </Teleport>
  </div>
</template>
