<script setup lang="ts">
// A failed request's status code and error message (errorText), clamped to
// two lines; the whole text in a tooltip on hover or focus.
import { computed } from 'vue'
import { STooltip } from '@sub2api/ui'
import { errorText, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const text = computed(() => errorText(props.row))
</script>

<template>
  <STooltip v-if="text" :content="text" placement="bottom" :delay="150" max-width="28rem">
    <p
      class="line-clamp-2 min-w-0 break-all rounded text-xs text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      tabindex="0"
      data-testid="usage-error-text"
    >
      {{ text }}
    </p>
  </STooltip>
</template>
