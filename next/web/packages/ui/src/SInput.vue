<script setup lang="ts">
// Styled native <input class="input">. type="number" emits a number (null
// when empty/invalid); type="file" emits the FileList (null when cleared)
// and ignores `modelValue`; every other type emits the raw string. `lazy`
// emits on `change` instead of `input` (default true for datetime-local /
// date / time so half-typed dates do not emit). Remaining attrs (id, name,
// data-testid, ...) fall through to the input.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    type?: 'text' | 'password' | 'number' | 'url' | 'email' | 'search' | 'datetime-local' | 'date' | 'time' | 'file' | 'color'
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    size?: 'sm'
    mono?: boolean
    error?: boolean
    maxlength?: number
    inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
    autocomplete?: string
    lazy?: boolean
  }>(),
  { type: 'text', lazy: undefined }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number | FileList | null): void }>()

const DATE_TYPES = new Set(['datetime-local', 'date', 'time'])
const lazy = computed(() => props.lazy ?? DATE_TYPES.has(props.type))

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  if (props.type === 'file') return emit('update:modelValue', el.files && el.files.length ? el.files : null)
  const v = el.value
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
    :value="type === 'file' ? undefined : (modelValue ?? '')"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :maxlength="maxlength"
    :inputmode="inputmode"
    :autocomplete="autocomplete"
    @input="lazy ? undefined : onInput($event)"
    @change="lazy || type === 'file' ? onInput($event) : undefined"
  />
</template>
