<script setup lang="ts">
// Native <input type="checkbox" class="checkbox"> with a label; the default
// slot replaces `label`.
defineProps<{ modelValue: boolean; label?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <label class="flex cursor-pointer items-center gap-2" :class="disabled ? 'cursor-not-allowed opacity-50' : ''">
    <input
      type="checkbox"
      class="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="label || $slots.default" class="text-sm text-gray-700 dark:text-gray-300"><slot>{{ label }}</slot></span>
  </label>
</template>
