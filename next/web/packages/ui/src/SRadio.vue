<script setup lang="ts">
// Native <input type="radio" class="radio"> with a label; checked when
// `modelValue === value`. The default slot replaces `label`. `size` sets the
// text size and the circle (xs 14px, sm 16px, md 20px). Inside SRadioGroup
// the group's name applies when `name` is not given. The checked state is
// written back to the DOM when the parent keeps the old value (controlled).
import { inject, nextTick, ref } from 'vue'
import type { SelectOption } from './types'
import { RADIO_NAME_KEY } from './radio'

const props = withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    value: SelectOption['value']
    label?: string
    disabled?: boolean
    size?: 'xs' | 'sm' | 'md'
    name?: string
  }>(),
  { size: 'sm' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
const groupName = inject(RADIO_NAME_KEY, null)
const input = ref<HTMLInputElement>()

function onChange() {
  emit('update:modelValue', props.value)
  nextTick(() => {
    const want = props.modelValue === props.value
    if (input.value && input.value.checked !== want) input.value.checked = want
  })
}
</script>

<template>
  <label
    class="flex items-center"
    :class="[size === 'xs' ? 'gap-1.5' : 'gap-2', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']"
  >
    <input
      ref="input"
      type="radio"
      class="radio"
      :class="size === 'xs' ? 'radio-xs' : size === 'md' ? 'radio-md' : ''"
      :name="name || groupName || undefined"
      :value="String(value)"
      :checked="modelValue === value"
      :disabled="disabled"
      @change="onChange"
    />
    <span v-if="label || $slots.default" class="text-gray-700 dark:text-gray-300" :class="size === 'xs' ? 'text-xs' : 'text-sm'"><slot>{{ label }}</slot></span>
  </label>
</template>
