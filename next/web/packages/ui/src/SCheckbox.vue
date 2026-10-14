<script setup lang="ts">
// Native <input type="checkbox" class="checkbox"> with a label; the default
// slot replaces `label`. `bare` renders only the input (table header/row
// selection). Attrs (id, data-testid, aria-*) go to the <input>; class/style
// to the wrapper label (everything to the input when `bare`). `size` sets
// the text size and the box (xs 14px, sm 16px, md 20px). The checked /
// indeterminate state is written back to the DOM when the parent keeps the
// old value (controlled). Inside SField / SSettingRow it takes the frame's
// id and aria-describedby.
import { ref, useAttrs, watch, computed, nextTick, onMounted, onUpdated } from 'vue'
import { useFieldControl } from './field'

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

const wrapAttrs = computed(() => (props.bare ? {} : { class: attrs.class, style: attrs.style }))
const inputAttrs = computed(() => {
  const base = a11y.value
  if (props.bare) return { ...attrs, ...base }
  const { class: _c, style: _s, ...rest } = attrs
  return { ...rest, ...base }
})
const boxCls = computed(() => [props.size === 'xs' ? 'checkbox-xs' : props.size === 'md' ? 'checkbox-md' : '', invalid.value ? 'input-error' : ''])

const input = ref<HTMLInputElement>()
function syncDom() {
  const el = input.value
  if (!el) return
  el.indeterminate = !!props.indeterminate
  if (el.checked !== !!props.modelValue) el.checked = !!props.modelValue
}
onMounted(syncDom)
onUpdated(syncDom)
watch(() => [props.indeterminate, props.modelValue], () => nextTick(syncDom))

// Click (pointer, label, Space) emits the toggled value; the change event
// that follows in a browser is then ignored. A change without a click
// (setValue / setChecked in tests) emits the new checked state.
let clicked = false
function onClick() {
  if (props.disabled) return
  clicked = true
  Promise.resolve().then(() => (clicked = false))
  emit('update:modelValue', !props.modelValue)
  nextTick(syncDom)
}
function onChange(e: Event) {
  if (clicked) {
    clicked = false
    return
  }
  emit('update:modelValue', (e.target as HTMLInputElement).checked)
  nextTick(syncDom)
}
</script>

<template>
  <input
    v-if="bare"
    :id="id"
    ref="input"
    type="checkbox"
    class="checkbox"
    :class="boxCls"
    v-bind="inputAttrs"
    :checked="modelValue"
    :disabled="disabled"
    @click="onClick" @change="onChange"
  />
  <label
    v-else
    class="flex items-center"
    :class="[size === 'xs' ? 'gap-1.5' : 'gap-2', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']"
    v-bind="wrapAttrs"
  >
    <input :id="id" ref="input" type="checkbox" class="checkbox" :class="boxCls" v-bind="inputAttrs" :checked="modelValue" :disabled="disabled" @click="onClick" @change="onChange" />
    <span v-if="label || $slots.default" class="text-gray-700 dark:text-gray-300" :class="size === 'xs' ? 'text-xs' : 'text-sm'"><slot>{{ label }}</slot></span>
  </label>
</template>
