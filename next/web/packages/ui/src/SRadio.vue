<script setup lang="ts">
// Native <input type="radio" class="radio"> with a label; checked when
// `modelValue === value`. The default slot replaces `label`.
import type { SelectOption } from './types'

withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    value: SelectOption['value']
    label?: string
    disabled?: boolean
    size?: 'xs' | 'sm'
    name?: string
  }>(),
  { size: 'sm' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
</script>

<template>
  <label
    class="flex cursor-pointer items-center"
    :class="[size === 'xs' ? 'gap-1.5' : 'gap-2', disabled ? 'cursor-not-allowed opacity-50' : '']"
  >
    <input type="radio" class="radio" :name="name" :checked="modelValue === value" :disabled="disabled" @change="emit('update:modelValue', value)" />
    <span v-if="label || $slots.default" class="text-gray-700 dark:text-gray-300" :class="size === 'xs' ? 'text-xs' : 'text-sm'"><slot>{{ label }}</slot></span>
  </label>
</template>
