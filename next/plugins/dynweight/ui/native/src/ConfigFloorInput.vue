<script setup lang="ts">
import { computed } from 'vue'
import { SInput, SSelect } from '@sub2api/ui'
import { enumOptions, useDwHost, type Layer } from './host'

// A weight floor as one control: the amount, then how it is read (a percent
// of the base, 0..100, or a fixed weight, 0..1000000). Shared by the layers
// and the account overrides.
defineProps<{ disabled?: boolean; ariaLabel?: string }>()
const floor = defineModel<{ mode: Layer['min_weight_mode']; value: number | null | undefined }>({ required: true })
const t = useDwHost().t
const modeOptions = computed(() => enumOptions('floor', ['base_percent', 'fixed']))
const percent = computed(() => floor.value.mode === 'base_percent')
</script>

<template>
  <div class="dw-cfg-combo">
    <SInput
      :model-value="floor.value"
      type="number"
      min="0"
      :max="percent ? 100 : 1000000"
      :suffix="percent ? '%' : ''"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @update:model-value="floor = { ...floor, value: $event as number | null }"
    />
    <SSelect
      :model-value="floor.mode"
      :options="modeOptions"
      :aria-label="t('cfg.field.floorMode')"
      :disabled="disabled"
      @update:model-value="floor = { ...floor, mode: $event as Layer['min_weight_mode'] }"
    />
  </div>
</template>
