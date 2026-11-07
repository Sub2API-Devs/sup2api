<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiT } from './i18n'
import SInput from './SInput.vue'
import SSelect from './SSelect.vue'
import SSegmented from './SSegmented.vue'
import SField from './SField.vue'
import RangeSheet from './internal/RangeSheet.vue'
import RangeTrigger from './internal/RangeTrigger.vue'
import { useViewport } from './viewport'
import { RANGE_LABELS, fromLocalInput, rangeBounds, toLocalInput, type RangeKey } from './timeRange'

// Time range filter: preset select (or a segmented control with
// variant="segmented") + custom from/to (datetime-local). from/to are
// RFC 3339 strings ('' = open). `label` = false hides the field labels
// (the controls keep an aria-label). On a compact screen it is a trigger
// showing the preset that opens a bottom sheet: the presets as a grid, then
// from / to (editing one switches the range to custom).
const props = withDefaults(
  defineProps<{ range: RangeKey; from: string; to: string; keys?: RangeKey[]; variant?: 'select' | 'segmented'; size?: 'sm' | 'md'; label?: boolean }>(),
  { keys: () => ['today', '7d', '30d', 'custom'], variant: 'select', size: 'md', label: true }
)
const emit = defineEmits<{
  (e: 'update:range', v: RangeKey): void
  (e: 'update:from', v: string): void
  (e: 'update:to', v: string): void
}>()
const t = useUiT()
const { compact } = useViewport()
const sheet = ref(false)

const options = computed(() => props.keys.map((k) => ({ value: k, label: t(RANGE_LABELS[k]) })))
const presets = computed(() => props.keys.filter((k) => k !== 'custom'))
const ends = computed(() => [
  { key: 'from' as const, label: t('ui.from'), value: toLocalInput(props.from) },
  { key: 'to' as const, label: t('ui.to'), value: toLocalInput(props.to) }
])

function pick(v: unknown) {
  const key = v as RangeKey
  emit('update:range', key)
  if (key !== 'custom') {
    const b = rangeBounds(key)
    emit('update:from', b.from)
    emit('update:to', b.to)
  }
}
function pickPreset(key: RangeKey) {
  pick(key)
  sheet.value = false
}
// SInput (datetime-local, lazy) emits the local string; convert to RFC 3339.
function setEnd(key: 'from' | 'to', v: unknown) {
  const value = fromLocalInput(typeof v === 'string' ? v : '')
  if (props.range !== 'custom') emit('update:range', 'custom')
  if (key === 'from') emit('update:from', value)
  else emit('update:to', value)
}
</script>

<template>
  <div v-if="compact" class="flex flex-col gap-2">
    <SField :label="label ? t('ui.time') : undefined">
      <RangeTrigger
        :range="range"
        :size="size"
        :aria-label="label ? undefined : t('ui.time')"
        aria-haspopup="dialog"
        :aria-expanded="sheet"
        data-testid="time-range-trigger"
        @click="sheet = true"
      />
    </SField>
    <RangeSheet v-model:open="sheet" :range="range" :presets="presets" @pick="pickPreset">
      <SField v-for="e in ends" :key="e.key" :label="e.label">
        <SInput type="datetime-local" :model-value="e.value" :data-testid="`time-range-${e.key}`" @update:model-value="setEnd(e.key, $event)" />
      </SField>
    </RangeSheet>
  </div>
  <div v-else class="flex flex-wrap items-end gap-2">
    <SField :label="label ? t('ui.time') : undefined" :class="variant === 'segmented' ? '' : 'w-36'">
      <SSegmented v-if="variant === 'segmented'" :model-value="range" :options="options" :size="size" :aria-label="label ? undefined : t('ui.time')" @update:model-value="pick" />
      <SSelect v-else :model-value="range" :options="options" :size="size" :aria-label="label ? undefined : t('ui.time')" @update:model-value="pick" />
    </SField>
    <template v-if="range === 'custom'">
      <SField v-for="e in ends" :key="e.key" :label="label ? e.label : undefined">
        <SInput type="datetime-local" class="!w-52" :size="size" :aria-label="label ? undefined : e.label" :model-value="e.value" @update:model-value="setEnd(e.key, $event)" />
      </SField>
    </template>
  </div>
</template>
