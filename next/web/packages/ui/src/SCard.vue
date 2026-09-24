<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string; padded?: boolean }>()
</script>

<template>
  <section class="card">
    <header v-if="title || $slots.title || $slots.actions" class="card-header flex items-center justify-between gap-3">
      <div class="min-w-0">
        <slot name="title">
          <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        </slot>
        <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">{{ subtitle }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="padded === false ? '' : 'card-body'">
      <slot />
    </div>
  </section>
</template>
