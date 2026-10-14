<script setup lang="ts">
// Empty state: icon, `title` (bold, optional), `text` (default "No data"),
// default slot under the text, #actions (buttons) below. `size` lg is the
// full-page variant (more space, bigger icon); sm is compact (inside cards,
// table cells).
import { useUiT } from './i18n'
import SIcon from './SIcon.vue'
withDefaults(defineProps<{ text?: string; icon?: string; title?: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
const t = useUiT()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center text-center text-gray-400 dark:text-dark-400"
    :class="size === 'lg' ? 'gap-3 py-20' : size === 'sm' ? 'gap-1.5 py-6' : 'gap-2 py-12'"
  >
    <SIcon :name="icon || 'inbox'" class="opacity-60" :class="size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-7 w-7' : 'h-10 w-10'" />
    <p v-if="title" class="font-semibold text-fg" :class="size === 'lg' ? 'text-base' : 'text-sm'">{{ title }}</p>
    <p :class="size === 'sm' ? 'text-xs' : 'text-sm'" class="max-w-md">{{ text || t('ui.noData') }}</p>
    <slot />
    <div v-if="$slots.actions" class="mt-2 flex flex-wrap items-center justify-center gap-2"><slot name="actions" /></div>
  </div>
</template>
