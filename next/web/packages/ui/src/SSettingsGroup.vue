<script setup lang="ts">
// A titled block of settings: SSettingRow children separated by dividers.
// The `details` slot is a longer explanation of the whole group, collapsed
// behind a toggle. Remaining attrs (data-testid, ...) go to the root.
import SDisclosure from './SDisclosure.vue'

defineProps<{ title?: string; description?: string }>()
</script>

<template>
  <section class="rounded-xl border border-line bg-surface">
    <header v-if="title || $slots.title || $slots.actions" class="flex items-start justify-between gap-3 rounded-t-xl border-b border-line bg-surface-2/60 px-4 py-3">
      <div class="min-w-0">
        <slot name="title"><h5 class="text-sm font-semibold text-fg">{{ title }}</h5></slot>
        <p v-if="description" class="mt-0.5 max-w-3xl text-xs leading-5 text-fg-muted">{{ description }}</p>
        <SDisclosure v-if="$slots.details" class="mt-1"><slot name="details" /></SDisclosure>
      </div>
      <div class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
    </header>
    <div class="divide-y divide-line px-4"><slot /></div>
  </section>
</template>
