<script setup lang="ts">
// Segmented control: one of a few options side by side, the chosen one
// raised. A radio group underneath (arrow keys move between options, form
// semantics kept); each radio's value attribute is String(option.value).
// Remaining attrs (data-testid, ...) go to the root.
import { useId } from 'vue'
import type { SelectOption } from './types'

withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    options: SelectOption[]
    name?: string
    disabled?: boolean
    size?: 'sm' | 'md'
    block?: boolean
    ariaLabel?: string
  }>(),
  { size: 'md' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
const group = useId()
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="ariaLabel"
    class="gap-0.5 rounded-xl bg-gray-100 p-0.5 ring-1 ring-inset ring-gray-200/70 dark:bg-dark-800 dark:ring-dark-700"
    :class="[block ? 'flex w-full' : 'inline-flex', disabled ? 'opacity-50' : '']"
  >
    <label
      v-for="(o, i) in options"
      :key="i"
      class="flex flex-1 select-none items-center justify-center whitespace-nowrap rounded-[0.625rem] font-medium transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40"
      :class="[
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        modelValue === o.value ? 'bg-white text-primary-700 shadow-sm ring-1 ring-black/5 dark:bg-dark-600 dark:text-primary-300 dark:ring-white/5' : 'text-gray-500 dark:text-dark-300',
        disabled || o.disabled ? 'cursor-not-allowed' : modelValue === o.value ? 'cursor-default' : 'cursor-pointer hover:text-gray-800 dark:hover:text-white'
      ]"
    >
      <input
        type="radio"
        class="sr-only"
        :name="name || group"
        :value="String(o.value)"
        :checked="modelValue === o.value"
        :disabled="disabled || o.disabled"
        @change="emit('update:modelValue', o.value)"
      />
      {{ o.label }}
    </label>
  </div>
</template>
