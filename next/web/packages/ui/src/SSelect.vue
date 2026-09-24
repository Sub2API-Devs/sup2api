<script setup lang="ts">
import type { SelectOption } from './types'

// Styled native <select>. Values keep their type (number/string/boolean/null).
const props = defineProps<{
  modelValue: SelectOption['value'] | undefined
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()

function onChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value)
  if (idx < 0) emit('update:modelValue', null)
  else emit('update:modelValue', props.options[idx]?.value ?? null)
}

function selectedIndex(): number {
  return props.options.findIndex((o) => o.value === props.modelValue)
}
</script>

<template>
  <select class="input" :value="selectedIndex()" :disabled="disabled" @change="onChange">
    <option v-if="placeholder !== undefined" :value="-1">{{ placeholder }}</option>
    <option v-for="(o, i) in options" :key="i" :value="i" :disabled="o.disabled">{{ o.label }}</option>
  </select>
</template>
