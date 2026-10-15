<script setup lang="ts">
import { useTitleVisibility } from './titleContext'
const props = defineProps<{ title: string; description?: string }>()
const showTitle = useTitleVisibility(() => props.title)
</script>

<template>
  <div
    v-if="showTitle || description || $slots.before || $slots['title-extra'] || $slots.actions"
    class="mb-5 flex flex-wrap items-start justify-between gap-3"
  >
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <slot name="before" />
        <h1
          v-if="showTitle"
          class="truncate text-xl font-semibold text-gray-900 dark:text-white"
        >
          {{ title }}
        </h1>
        <slot name="title-extra" />
      </div>
      <p
        v-if="description"
        class="mt-1 text-sm text-gray-500 dark:text-dark-400"
      >
        {{ description }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
  <div
    v-if="$slots.filters"
    class="mb-4 flex flex-wrap items-end gap-3"
  >
    <slot name="filters" />
  </div>
</template>
