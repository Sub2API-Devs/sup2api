<script setup lang="ts">
import SSwitch from '../../SSwitch.vue'
import type { ControlContext } from './context'

defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <SSwitch :model-value="!!modelValue" :disabled="ctx.locked" :label="ctx.inlineLabel ? ctx.label : undefined" @update:model-value="emit('update:modelValue', $event)" />
</template>
