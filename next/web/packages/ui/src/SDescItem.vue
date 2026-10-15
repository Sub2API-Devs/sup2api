<script setup lang="ts">
// One label / value pair of SDescriptions (child syntax). The default slot
// is the value (else `value`, '—' when empty); #label replaces `label`.
// `mono` uses a monospace font, `copyable` adds a copy button (copies
// `value`), `full` spans every column.
import { computed, inject } from 'vue'
import SCopyButton from './SCopyButton.vue'
import { DESC_KEY } from './descriptions'
import { displayValue, isBlank } from './value'

const props = defineProps<{ label?: string; value?: unknown; mono?: boolean; copyable?: boolean; full?: boolean }>()
const ctx = inject(DESC_KEY, null)
const labelWidth = computed(() => ctx?.labelWidth.value ?? '8rem')
const shown = computed(() => displayValue(props.value))
</script>

<template>
  <div
    class="min-w-0"
    :class="[full ? 'sm:col-span-full' : '', ctx?.stacked.value ? '' : 'sm:flex sm:gap-4', ctx?.dense.value ? 'py-1' : 'py-1.5']"
  >
    <dt class="shrink-0 text-sm text-gray-500 dark:text-dark-400" :style="ctx?.stacked.value ? undefined : { width: labelWidth }">
      <slot name="label">{{ label }}</slot>
    </dt>
    <dd class="mt-0.5 flex min-w-0 flex-1 items-start gap-1 break-words text-sm text-gray-800 sm:mt-0 dark:text-gray-200">
      <span class="min-w-0" :class="mono ? 'font-mono text-xs leading-5' : ''"><slot>{{ shown }}</slot></span>
      <SCopyButton v-if="copyable && !isBlank(value)" :text="String(value)" icon-only class="-my-1.5 shrink-0" />
    </dd>
  </div>
</template>
