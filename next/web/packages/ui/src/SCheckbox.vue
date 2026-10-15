<script setup lang="ts">
// Native <input type="checkbox" class="checkbox"> with a label; the default
// slot replaces `label`. `bare` renders only the input (table header/row
// selection). Attrs (id, data-testid, aria-*) go to the <input>; class/style
// to the wrapper label (everything to the input when `bare`). `size` sets
// the text size and the box (xs 14px, sm 16px, md 20px). The checked /
// indeterminate state is written back to the DOM when the parent keeps the
// old value (controlled). Inside SField / SSettingRow it takes the frame's
// id and aria-describedby.
import { computed, onMounted, onUpdated, ref, useAttrs } from 'vue'
import { splitAttrs, useFieldControl } from './field'
import { useCheckboxModel } from './controlled'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
    indeterminate?: boolean
    size?: 'xs' | 'sm' | 'md'
    bare?: boolean
    error?: boolean
    ariaLabel?: string
  }>(),
  { size: 'sm' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
const attrs = useAttrs()
const { id, a11y, invalid } = useFieldControl(props)
const input = ref<HTMLInputElement>()

const parts = computed(() => (props.bare ? { wrap: {}, control: attrs } : splitAttrs(attrs)))
const BOX = { xs: 'checkbox-xs', sm: '', md: 'checkbox-md' }
const inputProps = computed(() => ({
  id: id.value,
  type: 'checkbox',
  ...parts.value.control,
  ...a11y.value,
  checked: props.modelValue,
  disabled: props.disabled
}))

function syncDom() {
  const el = input.value
  if (!el) return
  el.indeterminate = !!props.indeterminate
  if (el.checked !== !!props.modelValue) el.checked = !!props.modelValue
}
onMounted(syncDom)
onUpdated(syncDom)
const { onClick, onChange } = useCheckboxModel(props, emit, input, syncDom)
</script>

<template>
  <input v-if="bare" ref="input" class="checkbox" :class="[BOX[size], { 'input-error': invalid }]" v-bind="inputProps" @click="onClick" @change="onChange" />
  <label
    v-else
    class="flex items-center"
    :class="[size === 'xs' ? 'gap-1.5' : 'gap-2', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']"
    v-bind="parts.wrap"
  >
    <input ref="input" class="checkbox" :class="[BOX[size], { 'input-error': invalid }]" v-bind="inputProps" @click="onClick" @change="onChange" />
    <span v-if="label || $slots.default" class="text-gray-700 dark:text-gray-300" :class="size === 'xs' ? 'text-xs' : 'text-sm'"><slot>{{ label }}</slot></span>
  </label>
</template>
