<script setup lang="ts">
// Card (.card surface, the same one SSettingsGroup and STable card use).
// Header shows `title` / #title, `subtitle` and #actions; #footer is a
// bordered bar at the bottom. `padded` = false removes the body padding
// (tables, lists). `variant` flat drops the shadow (cards inside cards).
withDefaults(defineProps<{ title?: string; subtitle?: string; padded?: boolean; variant?: 'default' | 'flat' }>(), { padded: true, variant: 'default' })
</script>

<template>
  <section class="card" :class="variant === 'flat' ? '!shadow-none' : ''">
    <header v-if="title || $slots.title || $slots.actions" class="card-header flex items-center justify-between gap-3">
      <div class="min-w-0">
        <slot name="title">
          <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        </slot>
        <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">{{ subtitle }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="padded ? 'card-body' : ''">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-dark-700"><slot name="footer" /></footer>
  </section>
</template>
