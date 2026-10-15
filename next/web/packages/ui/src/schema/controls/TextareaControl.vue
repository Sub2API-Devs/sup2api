<script setup lang="ts">
import STextarea from '../../STextarea.vue'
import type { ControlContext } from './context'

defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <STextarea
    :mono="!!ctx.options.mono"
    :rows="ctx.options.rows || 4"
    :model-value="modelValue ?? ''"
    :placeholder="ctx.placeholder"
    :disabled="ctx.disabled"
    :readonly="ctx.readonly"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
