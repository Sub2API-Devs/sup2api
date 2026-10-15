<script setup lang="ts">
// Empty state: icon, `title` (bold, optional), `text` (default "No data"),
// default slot under the text, #actions (buttons) below. `size` lg is the
// full-page variant (more space, bigger icon); sm is compact (inside cards,
// table cells).
import { useUiT } from './i18n'
import SIcon from './SIcon.vue'
withDefaults(defineProps<{ text?: string; icon?: string; title?: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
const t = useUiT()
const SIZE = {
  sm: { root: 'gap-1.5 py-6', icon: 'h-7 w-7', title: 'text-sm', text: 'text-xs' },
  md: { root: 'gap-2 py-12', icon: 'h-10 w-10', title: 'text-sm', text: 'text-sm' },
  lg: { root: 'gap-3 py-20', icon: 'h-14 w-14', title: 'text-base', text: 'text-sm' }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center text-gray-400 dark:text-dark-400" :class="SIZE[size].root">
    <SIcon :name="icon || 'inbox'" class="opacity-60" :class="SIZE[size].icon" />
    <p v-if="title" class="font-semibold text-fg" :class="SIZE[size].title">{{ title }}</p>
    <p class="max-w-md" :class="SIZE[size].text">{{ text || t('ui.noData') }}</p>
    <slot />
    <div v-if="$slots.actions" class="mt-2 flex flex-wrap items-center justify-center gap-2"><slot name="actions" /></div>
  </div>
</template>
