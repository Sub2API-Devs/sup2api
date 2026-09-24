<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSelect } from '@sub2api/ui'
import { fromLocalInput, rangeBounds, toLocalInput, type RangeKey } from './timeRange'

// Time range filter: preset select + custom from/to (datetime-local).
// from/to are RFC 3339 strings ('' = open).
const props = withDefaults(
  defineProps<{ range: RangeKey; from: string; to: string; keys?: RangeKey[] }>(),
  { keys: () => ['today', '7d', '30d', 'custom'] }
)
const emit = defineEmits<{
  (e: 'update:range', v: RangeKey): void
  (e: 'update:from', v: string): void
  (e: 'update:to', v: string): void
}>()
const { t } = useI18n()

const labels: Record<RangeKey, string> = {
  all: 'common.all',
  today: 'common.today',
  '7d': 'common.last7d',
  '30d': 'common.last30d',
  month: 'common.thisMonth',
  custom: 'usage.range.custom'
}

const options = computed(() => props.keys.map((k) => ({ value: k, label: t(labels[k]) })))

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
    <div class="w-36">
      <label class="input-label">{{ t('common.time') }}</label>
      <SSelect :model-value="range" :options="options" @update:model-value="pick" />
    </div>
    <template v-if="range === 'custom'">
      <div>
        <label class="input-label">{{ t('common.from') }}</label>
        <input type="datetime-local" class="input !w-52" :value="toLocalInput(from)" @change="emit('update:from', fromLocalInput(($event.target as HTMLInputElement).value))" />
      </div>
      <div>
        <label class="input-label">{{ t('common.to') }}</label>
        <input type="datetime-local" class="input !w-52" :value="toLocalInput(to)" @change="emit('update:to', fromLocalInput(($event.target as HTMLInputElement).value))" />
      </div>
    </template>
  </div>
</template>
