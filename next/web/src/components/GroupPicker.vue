<script setup lang="ts">
import EntityInput from './EntityInput.vue'

// Group picker: multiple (number[]) or single (number | null), over the
// entity lookup. Also a SchemaForm widget (`group-select`): the extra widget
// props (schema, ui) must not land on the root element.
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue: number[] | number | null | undefined; multiple?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number[] | number | null): void }>()
</script>

<template>
  <EntityInput
    kind="group"
    numeric
    :model-value="modelValue"
    :multiple="multiple"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event as number[] | number | null)"
  />
</template>
