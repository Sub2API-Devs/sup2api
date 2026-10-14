<script setup lang="ts">
// Toggle switch: a native <input type="checkbox" role="switch" class="switch">
// (aria-checked mirrors `modelValue`), optionally followed by a text label.
// inheritAttrs: false — class / style go to the outer element; id,
// data-testid, aria-*, title, name and every other attr go to the <input>.
// Click and Space toggle. `describedby` is aria-describedby of the input.
// Inside SField / SSettingRow it takes the frame's id (so the row label is
// its <label for>) and aria-describedby. The checked state is written back
// to the DOM when the parent keeps the old value (controlled).
import { computed, nextTick, ref, useAttrs } from 'vue'
import { splitAttrs, useFieldControl, type ControlSize } from './field'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{ modelValue: boolean; disabled?: boolean; label?: string; describedby?: string; ariaLabel?: string; size?: ControlSize; error?: boolean }>(),
  { size: undefined }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
const attrs = useAttrs()
const { id, a11y, size } = useFieldControl(props)
const input = ref<HTMLInputElement>()
const parts = computed(() => splitAttrs(attrs, () => false))
const describedBy = computed(() => [props.describedby, a11y.value['aria-describedby']].filter(Boolean).join(' ') || undefined)

// Click (pointer, label, Space) emits the toggled value; the change event
// that follows in a browser is then ignored. A change without a click
// (setChecked in tests, form scripts) emits the new checked state.
let clicked = false
function writeBack() {
  nextTick(() => {
    if (input.value && input.value.checked !== !!props.modelValue) input.value.checked = !!props.modelValue
  })
}
function onClick() {
  if (props.disabled) return
  clicked = true
  Promise.resolve().then(() => (clicked = false))
  emit('update:modelValue', !props.modelValue)
  writeBack()
}
function onChange(e: Event) {
  if (clicked) {
    clicked = false
    return
  }
  emit('update:modelValue', (e.target as HTMLInputElement).checked)
  writeBack()
}
</script>

<template>
  <label
    class="inline-flex items-center gap-2 align-middle"
    :class="[disabled ? 'cursor-not-allowed' : 'cursor-pointer', parts.wrap.class]"
    :style="parts.wrap.style as any"
  >
    <input
      :id="id"
      ref="input"
      type="checkbox"
      role="switch"
      class="switch"
      :class="size === 'sm' ? 'switch-sm' : ''"
      :checked="modelValue"
      :aria-checked="modelValue ? 'true' : 'false'"
      :disabled="disabled"
      v-bind="{ ...a11y, ...parts.control }"
      :aria-describedby="describedBy"
      @click="onClick"
      @change="onChange"
    />
    <span v-if="label || $slots.default" class="text-sm text-gray-700 dark:text-gray-300" :class="disabled ? 'opacity-50' : ''"><slot>{{ label }}</slot></span>
  </label>
</template>
