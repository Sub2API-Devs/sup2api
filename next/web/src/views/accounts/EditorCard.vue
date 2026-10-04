<script setup lang="ts">
// A titled block of the account editor: header (title, description, actions)
// over the body. Kept local: the console's SCard has no description slot
// and a heavier header rule than the editor wants.
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800/40">
    <header class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          {{ title }}
          <slot name="badge" />
        </h3>
        <p v-if="description" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-1.5"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>
