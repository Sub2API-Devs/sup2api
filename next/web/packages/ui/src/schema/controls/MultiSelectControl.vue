<script setup lang="ts">
// Several values out of the item enum: a group of checkboxes, labelled by
// the field frame (the checkboxes do not take the frame's label).
import { computed } from 'vue'
import SCheckbox from '../../SCheckbox.vue'
import { useFieldControl } from '../../field'
import { childUI, enumOptions } from '../schema'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: unknown[]): void }>()
const { a11y } = useFieldControl({}, false)
const options = computed(() => enumOptions(props.ctx.schema.items || {}, childUI(props.ctx.ui, 'items'), props.ctx.locale) ?? [])
const selected = computed<unknown[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

function toggle(v: unknown, on: boolean) {
  const rest = selected.value.filter((x) => x !== v)
  emit('update:modelValue', on ? [...rest, v] : rest)
}
</script>

<template>
  <div class="flex flex-wrap gap-x-4 gap-y-2 pt-1" role="group" v-bind="a11y">
    <SCheckbox
      v-for="o in options"
      :key="String(o.value)"
      :model-value="selected.includes(o.value)"
      :label="o.label"
      :disabled="ctx.locked"
      @update:model-value="toggle(o.value, $event)"
    />
  </div>
</template>
