<script setup lang="ts">
// Auto-refresh interval picker: v-model is the interval in seconds (0 =
// off). `choices` lists the offered seconds (default 0, 10, 30, 60). Pair it
// with useAutoRefresh:
//   const seconds = ref(30)
//   useAutoRefresh(list.reload, () => seconds.value * 1000)
//   <SAutoRefresh v-model="seconds" />
//
// A button with a menu rather than a select, so it stays one control wide in a
// toolbar. It shows the current interval, or just its name when off.
import { computed } from 'vue'
import { useUiT } from './i18n'
import SButton from './SButton.vue'
import SDropdown from './SDropdown.vue'
import type { MenuAction } from './types'

const props = withDefaults(defineProps<{ modelValue: number; choices?: number[]; size?: 'sm' | 'md'; disabled?: boolean }>(), {
  choices: () => [0, 10, 30, 60],
  size: 'md'
})
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()
const t = useUiT()
const every = (n: number) => t('ui.autoRefreshEvery', { n })
const actions = computed<MenuAction[]>(() => {
  const list = props.choices.includes(props.modelValue) ? props.choices : [...props.choices, props.modelValue].sort((a, b) => a - b)
  return list.map((n) => ({ key: String(n), label: n > 0 ? every(n) : t('ui.autoRefreshOff'), checked: n === props.modelValue }))
})
</script>

<template>
  <SDropdown :actions="actions" width="9rem" :disabled="disabled" @select="emit('update:modelValue', Number($event))">
    <template #trigger="{ toggle, attrs }">
      <SButton
        icon="refresh"
        icon-right="chevron-down"
        :size="size"
        :disabled="disabled"
        :title="t('ui.autoRefresh')"
        :aria-label="modelValue > 0 ? `${t('ui.autoRefresh')}: ${every(modelValue)}` : t('ui.autoRefresh')"
        data-testid="auto-refresh"
        v-bind="attrs"
        @click.stop="toggle"
      >
        {{ modelValue > 0 ? every(modelValue) : t('ui.autoRefresh') }}
      </SButton>
    </template>
  </SDropdown>
</template>
