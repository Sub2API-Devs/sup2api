<script setup lang="ts">
// Phone panel of the time range pickers: a bottom sheet with the preset
// `keys` (all but custom) as a three-column grid (a tap emits `pick`) and the
// custom start / end inputs (default slot) stacked under it.
import { computed } from 'vue'
import { useUiT } from '../i18n'
import { RANGE_LABELS, type RangeKey } from '../timeRange'
import SButton from '../SButton.vue'
import SDrawer from '../SDrawer.vue'

const props = defineProps<{ open: boolean; range: RangeKey; keys: RangeKey[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'pick', key: RangeKey): void }>()
const t = useUiT()
const presets = computed(() => props.keys.filter(k => k !== 'custom'))
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
