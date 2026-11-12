<script setup lang="ts">
// Trigger button of the time range pickers: the preset name and `span` (the
// ends it covers: [start, end], or one date; optional) between a clock and a
// chevron; it opens a dialog (`open`, `controls` = the dialog id while open).
// The span is never cut: where both ends do not fit on the line (a phone,
// times to the second) the end goes under the start and the button grows.
// Claims the SField label like the other labelable controls; with `label`
// false it carries the "Time" name itself. Remaining attrs (data-testid,
// listeners) go to the <button>.
import { useUiT } from '../i18n'
import { useFieldControl } from '../field'
import { RANGE_LABELS, type RangeKey } from '../timeRange'
import SIcon from '../SIcon.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ range: RangeKey; open: boolean; label: boolean; span?: string[]; size?: 'sm' | 'md'; controls?: string }>()
const t = useUiT()
const { id, a11y } = useFieldControl({
  get size() {
    return props.size
  },
  get ariaLabel() {
    return props.label ? undefined : t('ui.time')
  }
})
</script>

<template>
  <button
    v-bind="{ ...$attrs, ...a11y }"
    :id="id"
    type="button"
    class="input inline-flex h-auto cursor-pointer items-center gap-2 py-1 pr-3 text-left"
    :class="size === 'sm' ? 'input-sm min-h-control-sm' : 'min-h-control'"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-controls="open ? controls : undefined"
  >
    <SIcon name="clock" class="h-4 w-4 shrink-0 text-fg-subtle" />
    <span class="shrink-0 whitespace-nowrap text-fg">{{ t(RANGE_LABELS[range]) }}</span>
    <!-- Each end stays whole; the space between them is the only place the line may break. -->
    <span v-if="span?.length" class="min-w-0 text-xs text-fg-subtle">
      <template v-for="(end, i) in span" :key="i">
        <span class="whitespace-nowrap">{{ i < span.length - 1 ? `${end} ~` : end }}</span>{{ ' ' }}
      </template>
    </span>
    <SIcon name="chevron-down" class="ml-auto h-4 w-4 shrink-0 text-fg-subtle" />
  </button>
</template>
