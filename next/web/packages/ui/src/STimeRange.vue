<script setup lang="ts">
import { computed } from 'vue'
import { useUiT } from './i18n'
import SInput from './SInput.vue'
import SSelect from './SSelect.vue'
import SSegmented from './SSegmented.vue'
import { fromLocalInput, rangeBounds, toLocalInput, type RangeKey } from './timeRange'

// Time range filter: preset select (or a segmented control with
// variant="segmented") + custom from/to (datetime-local). from/to are
// RFC 3339 strings ('' = open). `label` = false hides the field labels.
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

const labels: Record<RangeKey, string> = {
  all: 'ui.all',
  '1h': 'ui.lastHour',
  '24h': 'ui.last24h',
  today: 'ui.today',
  '7d': 'ui.last7d',
  '30d': 'ui.last30d',
  month: 'ui.thisMonth',
  custom: 'ui.custom'
}

const options = computed(() => props.keys.map((k) => ({ value: k, label: t(labels[k]) })))

// SInput (datetime-local, lazy) emits the local string; convert to RFC 3339.
function local(v: unknown): string {
  return fromLocalInput(typeof v === 'string' ? v : '')
}

function pick(v: unknown) {
  const key = v as RangeKey
  emit('update:range', key)
  if (key !== 'custom') {
    const b = rangeBounds(key)
    emit('update:from', b.from)
    emit('update:to', b.to)
  }
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-2">
    <div :class="variant === 'segmented' ? '' : 'w-36'">
      <label v-if="label" class="input-label">{{ t('ui.time') }}</label>
      <SSegmented v-if="variant === 'segmented'" :model-value="range" :options="options" :size="size" :aria-label="t('ui.time')" @update:model-value="pick" />
      <SSelect v-else :model-value="range" :options="options" :size="size" :aria-label="label ? undefined : t('ui.time')" @update:model-value="pick" />
    </div>
    <template v-if="range === 'custom'">
      <div>
        <label v-if="label" class="input-label">{{ t('ui.from') }}</label>
        <SInput type="datetime-local" class="!w-52" :size="size" :aria-label="t('ui.from')" :model-value="toLocalInput(from)" @update:model-value="emit('update:from', local($event))" />
      </div>
      <div>
        <label v-if="label" class="input-label">{{ t('ui.to') }}</label>
        <SInput type="datetime-local" class="!w-52" :size="size" :aria-label="t('ui.to')" :model-value="toLocalInput(to)" @update:model-value="emit('update:to', local($event))" />
      </div>
    </template>
  </div>
</template>
