<script setup lang="ts">
// One setting: label and short description on the left, its control on the
// right (below it on narrow screens, or always with `stacked` for wide
// controls). The `details` slot is a longer explanation, collapsed behind a
// toggle. `for` makes the label a <label> for that control id. Remaining
// attrs (data-testid, ...) go to the root. `dense` is for rows of a label and
// a small control only.
import SDisclosure from './SDisclosure.vue'

defineProps<{ label?: string; description?: string; stacked?: boolean; dense?: boolean; for?: string }>()
</script>

<template>
  <div class="grid gap-3" :class="[dense ? 'py-2.5' : 'py-4', stacked ? '' : 'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8']">
    <div class="min-w-0">
      <component :is="$props.for ? 'label' : 'p'" :for="$props.for" class="text-sm font-medium text-fg">
        <slot name="label">{{ label }}</slot>
      </component>
      <p v-if="description || $slots.description" class="mt-1 max-w-3xl text-xs leading-5 text-fg-muted">
        <slot name="description">{{ description }}</slot>
      </p>
      <SDisclosure v-if="$slots.details" class="mt-1.5"><slot name="details" /></SDisclosure>
    </div>
    <div class="flex min-w-0 flex-wrap items-center gap-2" :class="stacked ? '' : 'sm:justify-end'"><slot /></div>
  </div>
</template>
