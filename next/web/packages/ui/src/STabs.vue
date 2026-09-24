<script setup lang="ts">
import type { TabItem } from './types'
defineProps<{ tabs: TabItem[]; modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <div class="border-b border-gray-200 dark:border-dark-700">
    <nav class="-mb-px flex gap-1 overflow-x-auto" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        role="tab"
        :aria-selected="tab.key === modelValue"
        :disabled="tab.disabled"
        class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        :class="
          tab.key === modelValue
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-dark-400 dark:hover:text-gray-200'
        "
        @click="emit('update:modelValue', tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.badge !== undefined" class="ml-1 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-dark-700">{{ tab.badge }}</span>
      </button>
    </nav>
  </div>
</template>
