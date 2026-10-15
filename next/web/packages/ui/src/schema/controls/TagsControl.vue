<script setup lang="ts">
import STagInput from '../../STagInput.vue'
import type { ControlContext } from './context'

defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void }>()
</script>

<template>
  <STagInput :model-value="modelValue" :placeholder="ctx.placeholder || undefined" :disabled="ctx.locked" @update:model-value="emit('update:modelValue', $event)" />
</template>
