<script setup lang="ts">
// Filter strip of a page or a chart area: the filter controls in the
// default slot, wrapping on narrow screens; `#end` content sits on the
// right (a time zone note, an export button). With @reset bound a Reset
// button appears, enabled while `dirty` (filters differ from the defaults).
// `card` (default true) draws the card frame; false for a strip inside one.
import { useUiT } from './i18n'
import SButton from './SButton.vue'

withDefaults(defineProps<{ card?: boolean; dirty?: boolean; ariaLabel?: string; onReset?: () => void }>(), {
  card: true,
  ariaLabel: undefined,
  onReset: undefined
})
const t = useUiT()
</script>

<template>
  <div role="group" :aria-label="ariaLabel" class="flex flex-wrap items-center gap-2" :class="card ? 'card p-3' : ''" data-testid="filter-bar">
    <slot />
    <SButton v-if="onReset" size="sm" variant="ghost" icon="refresh" :disabled="!dirty" data-testid="filter-reset" @click="onReset()">{{ t('ui.resetFilters') }}</SButton>
    <div v-if="$slots.end" class="ms-auto flex items-center gap-2">
      <slot name="end" />
    </div>
  </div>
</template>
