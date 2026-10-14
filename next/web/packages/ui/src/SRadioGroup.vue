<script setup lang="ts">
// One SRadio per option (or SRadio children in the default slot); `inline`
// lays them out in a wrapping row instead of a column. All radios share
// `name` (a generated one by default) so arrow keys move between them.
// Inside SField / SSettingRow the group is labelled by the frame's label
// (aria-labelledby) unless `ariaLabel` is given; `error` sets aria-invalid.
import { computed, provide, useId } from 'vue'
import SRadio from './SRadio.vue'
import type { SelectOption } from './types'
import { RADIO_NAME_KEY } from './radio'
import { useFieldControl } from './field'

const props = withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    options?: SelectOption[]
    name?: string
    inline?: boolean
    disabled?: boolean
    size?: 'xs' | 'sm' | 'md'
    ariaLabel?: string
    error?: boolean
  }>(),
  { size: 'sm', options: () => [] }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
const uid = useId()
const groupName = computed(() => props.name || uid)
provide(RADIO_NAME_KEY, groupName)
const { a11y } = useFieldControl(props, false)
</script>

<template>
  <div class="flex" :class="inline ? 'flex-wrap items-center gap-x-4 gap-y-2' : 'flex-col gap-2'" role="radiogroup" v-bind="a11y">
    <SRadio
      v-for="(o, i) in options"
      :key="i"
      :model-value="modelValue"
      :value="o.value"
      :label="o.label"
      :name="groupName"
      :size="size"
      :disabled="disabled || o.disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <slot />
  </div>
</template>
