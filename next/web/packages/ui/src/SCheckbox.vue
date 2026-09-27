<script setup lang="ts">
// Native <input type="checkbox" class="checkbox"> with a label; the default
// slot replaces `label`. `bare` renders only the input (table header/row
// selection). Attrs (id, data-testid, aria-*) go to the <input>; class/style
// to the wrapper label (everything to the input when `bare`).
import { ref, useAttrs, watch, computed } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
    indeterminate?: boolean
    size?: 'xs' | 'sm'
    bare?: boolean
  }>(),
  { size: 'sm' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
const attrs = useAttrs()

const wrapAttrs = computed(() => (props.bare ? {} : { class: attrs.class, style: attrs.style }))
const inputAttrs = computed(() => {
  if (props.bare) return attrs
  const { class: _c, style: _s, ...rest } = attrs
  return rest
})

const input = ref<HTMLInputElement>()
watch(
  () => [props.indeterminate, input.value] as const,
  ([v, el]) => {
    if (el) el.indeterminate = !!v
  },
  { immediate: true, flush: 'post' }
)

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).checked)
}
</script>

<template>
  <input
    v-if="bare"
    ref="input"
    type="checkbox"
    class="checkbox"
    v-bind="inputAttrs"
    :checked="modelValue"
    :disabled="disabled"
    @change="onChange"
  />
  <label
    v-else
    class="flex cursor-pointer items-center"
    :class="[size === 'xs' ? 'gap-1.5' : 'gap-2', disabled ? 'cursor-not-allowed opacity-50' : '']"
    v-bind="wrapAttrs"
  >
    <input ref="input" type="checkbox" class="checkbox" v-bind="inputAttrs" :checked="modelValue" :disabled="disabled" @change="onChange" />
    <span v-if="label || $slots.default" class="text-gray-700 dark:text-gray-300" :class="size === 'xs' ? 'text-xs' : 'text-sm'"><slot>{{ label }}</slot></span>
  </label>
</template>
