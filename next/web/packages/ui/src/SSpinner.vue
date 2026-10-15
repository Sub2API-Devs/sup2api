<script setup lang="ts">
// Spinning ring. Announced as "Loading…" (or `label`) unless `decorative`
// (inside a button that already says aria-busy). `block` centres it in a
// padded block (list / panel placeholders).
import { computed } from 'vue'
import { useUiT } from './i18n'

const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; label?: string; decorative?: boolean; block?: boolean }>(), { size: 'md' })
const t = useUiT()
const SIZE = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-8 w-8' }
const ring = computed(() => ['inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent', SIZE[props.size]])
const a11y = computed(() => (props.decorative ? { 'aria-hidden': 'true' as const } : { role: 'status', 'aria-label': props.label || t('ui.loading') }))
</script>

<template>
  <div v-if="block" class="flex items-center justify-center py-10 text-fg-subtle">
    <span :class="ring" v-bind="a11y" />
  </div>
  <span v-else :class="ring" v-bind="a11y" />
</template>
