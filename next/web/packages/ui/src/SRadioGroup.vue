<script setup lang="ts">
// One SRadio per option; `inline` lays them out in a wrapping row instead
// of a column.
import SRadio from './SRadio.vue'
import type { SelectOption } from './types'

withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    options: SelectOption[]
    name?: string
    inline?: boolean
    disabled?: boolean
    size?: 'xs' | 'sm'
  }>(),
  { size: 'sm' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
</script>

<template>
  <div class="flex" :class="inline ? 'flex-wrap items-center gap-x-4 gap-y-2' : 'flex-col gap-2'" role="radiogroup">
    <SRadio
      v-for="(o, i) in options"
      :key="i"
      :model-value="modelValue"
      :value="o.value"
      :label="o.label"
      :name="name"
      :size="size"
      :disabled="disabled || o.disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>
