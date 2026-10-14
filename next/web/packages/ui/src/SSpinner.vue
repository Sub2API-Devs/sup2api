<script setup lang="ts">
// Spinning ring. Announced as "Loading…" (or `label`) unless `decorative`
// (inside a button that already says aria-busy). `block` centres it in a
// padded block (list / panel placeholders).
import { useUiT } from './i18n'

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; label?: string; decorative?: boolean; block?: boolean }>(), { size: 'md' })
const t = useUiT()
</script>

<template>
  <div v-if="block" class="flex items-center justify-center py-10 text-fg-subtle">
    <span
      class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      :class="size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'"
      role="status"
      :aria-label="label || t('ui.loading')"
    />
  </div>
  <span
    v-else
    class="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    :class="size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'"
    :role="decorative ? undefined : 'status'"
    :aria-label="decorative ? undefined : label || t('ui.loading')"
    :aria-hidden="decorative ? 'true' : undefined"
  />
</template>
