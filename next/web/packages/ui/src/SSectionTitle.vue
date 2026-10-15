<script setup lang="ts">
// <h3 class="section-title"> (`tag` picks h3/h4/p); the `actions` slot sits right-aligned.
import { useTitleVisibility } from './titleContext'
const props = withDefaults(defineProps<{ title?: string; tag?: 'h3' | 'h4' | 'p' }>(), { tag: 'h3' })
const showTitle = useTitleVisibility(() => props.title)
</script>

<template>
  <div
    v-if="$slots.actions"
    class="mb-3 flex items-center justify-between gap-3"
  >
    <component
      :is="tag"
      v-if="showTitle || $slots.default"
      class="section-title !mb-0"
    >
      <slot>{{ title }}</slot>
    </component>
    <div class="ml-auto flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
  <component
    :is="tag"
    v-else-if="showTitle || $slots.default"
    class="section-title"
  >
    <slot>{{ title }}</slot>
  </component>
</template>
