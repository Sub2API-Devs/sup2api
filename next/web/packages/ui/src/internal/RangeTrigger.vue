<script setup lang="ts">
// Trigger button of the time range pickers: the preset name and `span` (the
// dates it covers, optional) between a clock and a chevron. Claims the
// SField label like the other labelable controls; remaining attrs (aria-*,
// listeners) go to the <button>.
import { useUiT } from '../i18n'
import { useFieldControl } from '../field'
import { RANGE_LABELS, type RangeKey } from '../timeRange'
import SIcon from '../SIcon.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ range: RangeKey; span?: string; size?: 'sm' | 'md'; ariaLabel?: string }>()
const t = useUiT()
const { id, a11y } = useFieldControl(props)
</script>

<template>
  <button
    v-bind="{ ...$attrs, ...a11y }"
    :id="id"
    type="button"
    class="input inline-flex cursor-pointer items-center gap-2 whitespace-nowrap pr-3 text-left"
    :class="size === 'sm' ? 'input-sm' : ''"
  >
    <SIcon name="clock" class="h-4 w-4 shrink-0 text-fg-subtle" />
    <span class="text-fg">{{ t(RANGE_LABELS[range]) }}</span>
    <span v-if="span" class="text-xs text-fg-subtle">{{ span }}</span>
    <SIcon name="chevron-down" class="ml-auto h-4 w-4 shrink-0 text-fg-subtle" />
  </button>
</template>
