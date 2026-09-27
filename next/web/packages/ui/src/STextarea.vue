<script setup lang="ts">
// Styled native <textarea class="input">. Remaining attrs fall through.
withDefaults(
  defineProps<{
    modelValue: string | null | undefined
    rows?: number
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    mono?: boolean
    error?: boolean
    maxlength?: number
  }>(),
  { rows: 4 }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <textarea
    class="input"
    :class="[mono ? 'font-mono' : '', error ? 'input-error' : '']"
    :value="modelValue ?? ''"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :maxlength="maxlength"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
