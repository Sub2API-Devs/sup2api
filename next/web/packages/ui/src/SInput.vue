<script setup lang="ts">
// Styled native <input class="input">. type="number" emits a number (null
// when empty/invalid); every other type emits the raw string. Remaining
// attrs (id, name, data-testid, ...) fall through to the input.
const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    type?: 'text' | 'password' | 'number' | 'url' | 'email' | 'search'
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    size?: 'sm'
    mono?: boolean
    error?: boolean
    maxlength?: number
    inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
    autocomplete?: string
  }>(),
  { type: 'text' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number | null): void }>()

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (props.type !== 'number') return emit('update:modelValue', v)
  if (v === '') return emit('update:modelValue', null)
  const n = Number(v)
  emit('update:modelValue', Number.isNaN(n) ? null : n)
}
</script>

<template>
  <input
    class="input"
    :class="[size === 'sm' ? 'input-sm' : '', mono ? 'font-mono' : '', error ? 'input-error' : '']"
    :type="type"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :maxlength="maxlength"
    :inputmode="inputmode"
    :autocomplete="autocomplete"
    @input="onInput"
  />
</template>
