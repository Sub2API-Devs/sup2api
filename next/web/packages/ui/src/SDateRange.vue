<script lang="ts">
import { defineComponent, h } from 'vue'
import { useFieldControl } from './field'

// Inner trigger: claims the SField label like the other labelable controls.
const Trigger = defineComponent({
  inheritAttrs: false,
  props: { ariaLabel: String, size: String },
  setup(p, { attrs, slots }) {
    const { id, a11y } = useFieldControl({ size: p.size, ariaLabel: p.ariaLabel })
    return () => h('button', { ...attrs, ...a11y.value, id: id.value, type: 'button' }, slots.default?.())
  }
})
</script>

<script setup lang="ts">
// Time range picker: a trigger showing the preset (and the dates it covers)
// that opens a panel with the presets on the left and a start / end date
// pair with Apply on the right. Same v-model contract as STimeRange: range,
// from and to (RFC 3339, '' = open; to is exclusive). The end date shown and
// typed is inclusive: Apply sends `to` = the local midnight after it.
// Picking a preset applies it and closes; Escape closes and returns focus to
// the trigger. `label` = false hides the field label (the trigger keeps an
// aria-label).
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import SField from './SField.vue'
import SIcon from './SIcon.vue'
import { useUiT } from './i18n'
import { useFloating } from './floating'
import { RANGE_LABELS, dayKey, rangeBounds, type RangeKey } from './timeRange'

const props = withDefaults(
  defineProps<{ range: RangeKey; from: string; to: string; keys?: RangeKey[]; size?: 'sm' | 'md'; label?: boolean }>(),
  { keys: () => ['today', 'yesterday', '24h', '7d', '14d', '30d', 'month', 'lastMonth', 'custom'], size: 'md', label: true }
)
const emit = defineEmits<{
  (e: 'update:range', v: RangeKey): void
  (e: 'update:from', v: string): void
  (e: 'update:to', v: string): void
}>()
const t = useUiT()
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
  const b = props.to ? new Date(new Date(props.to).getTime() - 1) : new Date()
  const s = dayKey(a).slice(5)
  const e = Number.isNaN(b.getTime()) ? '' : dayKey(b).slice(5)
  return s === e ? s : `${s} ~ ${e}`
})

const draftStart = ref('')
const draftEnd = ref('')
const valid = computed(() => !!draftStart.value && !!draftEnd.value && draftStart.value <= draftEnd.value)

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
  draftStart.value = props.from ? dayKey(props.from) : ''
  draftEnd.value = dayKey(props.to ? new Date(new Date(props.to).getTime() - 1) : new Date())
  open.value = true
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
  const b = rangeBounds(k)
  emit('update:range', k)
  emit('update:from', b.from)
  emit('update:to', b.to)
  close()
}
function apply() {
  if (!valid.value) return
  emit('update:range', 'custom')
  emit('update:from', midnight(draftStart.value).toISOString())
  emit('update:to', midnight(draftEnd.value, 1).toISOString())
  close()
}
onBeforeUnmount(() => close(false))
defineExpose({ open: show, close: () => close(false) })
</script>

<template>
  <div class="inline-block">
    <SField :label="label ? t('ui.time') : undefined">
      <span ref="anchor" class="inline-block">
        <Trigger
          class="input inline-flex cursor-pointer items-center gap-2 whitespace-nowrap pr-3 text-left"
          :class="size === 'sm' ? 'input-sm' : ''"
          :size="size"
          :aria-label="label ? undefined : t('ui.time')"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :aria-controls="open ? panelId : undefined"
          data-testid="date-range-trigger"
          @click="toggle"
        >
          <SIcon name="clock" class="h-4 w-4 shrink-0 text-fg-subtle" />
          <span class="text-fg">{{ t(RANGE_LABELS[range]) }}</span>
          <span v-if="span" class="text-xs text-fg-subtle">{{ span }}</span>
          <SIcon name="chevron-down" class="ml-auto h-4 w-4 shrink-0 text-fg-subtle" />
        </Trigger>
      </span>
    </SField>
    <Teleport to="body">
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
        <form v-if="customAllowed" class="flex w-56 flex-col gap-2 border-l border-line pl-3" @submit.prevent="apply">
          <span class="text-xs font-medium text-fg-muted">{{ t('ui.custom') }}</span>
          <label class="flex flex-col gap-1 text-xs text-fg-subtle">
            {{ t('ui.startDate') }}
            <input v-model="draftStart" type="date" class="input input-sm" :max="draftEnd || undefined" data-testid="date-range-start" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-fg-subtle">
            {{ t('ui.endDate') }}
            <input v-model="draftEnd" type="date" class="input input-sm" :min="draftStart || undefined" data-testid="date-range-end" />
          </label>
          <button type="submit" class="btn btn-primary btn-sm mt-auto" :disabled="!valid" data-testid="date-range-apply">
            {{ t('ui.apply') }}
          </button>
        </form>
      </div>
    </Teleport>
  </div>
</template>
