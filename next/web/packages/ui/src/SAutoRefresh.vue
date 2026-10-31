<script setup lang="ts">
// Auto-refresh interval picker: v-model is the interval in seconds (0 =
// off). `choices` lists the offered seconds (default 0, 10, 30, 60). Pair it
// with useAutoRefresh:
//   const seconds = ref(30)
//   useAutoRefresh(list.reload, () => seconds.value * 1000)
//   <SAutoRefresh v-model="seconds" />
import { computed } from 'vue'
import { useUiT } from './i18n'
import SSelect from './SSelect.vue'
import type { ControlSize } from './field'

const props = withDefaults(defineProps<{ modelValue: number; choices?: number[]; size?: ControlSize; disabled?: boolean }>(), {
  choices: () => [0, 10, 30, 60],
  size: 'sm'
})
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()
const t = useUiT()
const options = computed(() => {
  const list = props.choices.includes(props.modelValue) ? props.choices : [...props.choices, props.modelValue].sort((a, b) => a - b)
  return list.map((n) => ({ value: n, label: n > 0 ? t('ui.autoRefreshEvery', { n }) : t('ui.autoRefreshOff') }))
})
</script>

<template>
  <SSelect
    :model-value="modelValue"
    :options="options"
    :size="size"
    :disabled="disabled"
    :aria-label="t('ui.autoRefresh')"
    :title="t('ui.autoRefresh')"
    data-testid="auto-refresh"
    @update:model-value="emit('update:modelValue', Number($event) || 0)"
  />
</template>
