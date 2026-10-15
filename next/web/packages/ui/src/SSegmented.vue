<script setup lang="ts">
// Segmented control: one of a few options side by side, the chosen one
// raised. A radio group underneath (arrow keys move between options, form
// semantics kept); each radio's value attribute is String(option.value).
// Remaining attrs (data-testid, ...) go to the root. Inside SField /
// SSettingRow the group is labelled by the frame's label unless `ariaLabel`
// is given; `error` sets aria-invalid. The checked radio is written back to
// the DOM when the parent keeps the old value (controlled).
import { ref, useId } from 'vue'
import type { SelectOption } from './types'
import { useFieldControl } from './field'
import { writeBackChecked } from './controlled'

const props = withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    options: SelectOption[]
    name?: string
    disabled?: boolean
    size?: 'sm' | 'md'
    block?: boolean
    ariaLabel?: string
    error?: boolean
  }>(),
  { size: 'md' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
const group = useId()
const { a11y, invalid } = useFieldControl(props, false)
const root = ref<HTMLElement>()

function choose(v: SelectOption['value']) {
  emit('update:modelValue', v)
  writeBackChecked(root, (i) => props.options[i]?.value === props.modelValue)
}
</script>

<template>
  <div
    ref="root"
    role="radiogroup"
    v-bind="a11y"
    class="gap-0.5 rounded-control bg-line/50 p-0.5 ring-1 ring-inset ring-line/70"
    :class="[block ? 'flex w-full' : 'inline-flex', disabled ? 'opacity-50' : '', invalid ? '!ring-red-500' : '']"
  >
    <label
      v-for="(o, i) in options"
      :key="i"
      class="flex flex-1 select-none items-center justify-center whitespace-nowrap rounded-[0.625rem] font-medium transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40"
      :class="[
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        modelValue === o.value ? 'bg-surface text-primary-700 shadow-sm ring-1 ring-black/5 dark:bg-dark-600 dark:text-primary-300 dark:ring-white/5' : 'text-fg-muted',
        disabled || o.disabled ? 'cursor-not-allowed' : modelValue === o.value ? 'cursor-default' : 'cursor-pointer hover:text-fg'
      ]"
    >
      <input
        type="radio"
        class="sr-only"
        :name="name || group"
        :value="String(o.value)"
        :checked="modelValue === o.value"
        :disabled="disabled || o.disabled"
        @change="choose(o.value)"
      />
      {{ o.label }}
    </label>
  </div>
</template>
