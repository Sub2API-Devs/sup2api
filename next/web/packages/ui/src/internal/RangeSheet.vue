<script setup lang="ts">
// Phone panel of the time range pickers: a bottom sheet with the `presets`
// as a three-column grid (a tap emits `pick`) and the custom start / end
// inputs (default slot) stacked under it.
import { useUiT } from '../i18n'
import { RANGE_LABELS, type RangeKey } from '../timeRange'
import SButton from '../SButton.vue'
import SDrawer from '../SDrawer.vue'

defineProps<{ open: boolean; range: RangeKey; presets: RangeKey[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'pick', key: RangeKey): void }>()
const t = useUiT()
</script>

<template>
  <SDrawer :open="open" side="bottom" :title="t('ui.time')" @update:open="emit('update:open', $event)">
    <div class="grid grid-cols-3 gap-2" data-testid="range-sheet">
      <SButton
        v-for="k in presets"
        :key="k"
        :variant="k === range ? 'primary' : 'secondary'"
        :aria-pressed="k === range"
        :data-key="k"
        @click="emit('pick', k)"
      >
        {{ t(RANGE_LABELS[k]) }}
      </SButton>
    </div>
    <div v-if="$slots.default" class="mt-4 flex flex-col gap-3">
      <slot />
    </div>
  </SDrawer>
</template>
