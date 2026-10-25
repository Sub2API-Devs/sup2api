<script setup lang="ts">
// A table row action: an icon above a short label, of one fixed width so the
// actions of every row line up (whatever their labels). `tone` danger turns
// it red on hover; `loading` shows a spinner instead of the icon. Attrs
// (aria-haspopup, data-testid, ...) go to the <button>.
import SIcon from './SIcon.vue'
import SSpinner from './SSpinner.vue'

withDefaults(defineProps<{ icon: string; label: string; tone?: 'default' | 'danger'; disabled?: boolean; loading?: boolean; title?: string }>(), { tone: 'default' })
defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
</script>

<template>
  <button
    type="button"
    class="inline-flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-fg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50"
    :class="tone === 'danger' ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400' : 'hover:bg-surface-2 hover:text-primary-600 dark:hover:text-primary-400'"
    :disabled="disabled || loading"
    :title="title || label"
    :aria-busy="loading || undefined"
    @click.stop="$emit('click', $event)"
  >
    <SSpinner v-if="loading" size="sm" decorative />
    <SIcon v-else :name="icon" class="h-4 w-4" />
    <span class="w-full truncate text-center text-xs leading-4">{{ label }}</span>
  </button>
</template>
