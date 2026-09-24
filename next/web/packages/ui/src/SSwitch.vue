<script setup lang="ts">
defineProps<{ modelValue: boolean; disabled?: boolean; label?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-2" :class="disabled ? 'cursor-not-allowed opacity-50' : ''">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      :class="modelValue ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600'"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span
        class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        :class="modelValue ? 'translate-x-4' : 'translate-x-0.5'"
      />
    </button>
    <span v-if="label || $slots.default" class="text-sm text-gray-700 dark:text-gray-300"><slot>{{ label }}</slot></span>
  </label>
</template>
