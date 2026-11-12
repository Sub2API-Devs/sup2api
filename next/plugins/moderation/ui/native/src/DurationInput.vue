<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SInput, SSelect } from '@sub2api/ui'
import { useModHost } from './host'
import { ALL_DURATION_UNITS, joinDuration, splitDuration, type DurationUnit } from './duration'

// A duration in seconds edited as a number and a unit (duration.ts). The
// unit picked applies to the number typed: 10 with minutes is 600 seconds.
const props = withDefaults(defineProps<{ modelValue: number | null | undefined; units?: readonly DurationUnit[]; disabled?: boolean }>(), {
  units: () => ALL_DURATION_UNITS
})
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const t = useModHost().t

const n = ref<number | null>(null)
const unit = ref<DurationUnit>('s')
watch(
  () => [props.modelValue, props.units] as const,
  ([v, units]) => {
    if (v === joinDuration(n.value, unit.value) && units.includes(unit.value)) return
    ;({ n: n.value, unit: unit.value } = splitDuration(v, units))
  },
  { immediate: true }
)
const unitOptions = computed(() => props.units.map((u) => ({ value: u, label: t(`duration.${u}`) })))

function set(next: { n?: number | null; unit?: DurationUnit }) {
  if (next.n !== undefined) n.value = next.n
  if (next.unit) unit.value = next.unit
  emit('update:modelValue', joinDuration(n.value, unit.value))
}
</script>

<template>
  <div class="mod-inline mod-gap">
    <SInput :model-value="n" type="number" min="1" class="mod-grow" :disabled="disabled" data-testid="mod-duration-n" @update:model-value="set({ n: $event as number | null })" />
    <SSelect :model-value="unit" :options="unitOptions" :disabled="disabled" data-testid="mod-duration-unit" @update:model-value="set({ unit: $event as DurationUnit })" />
  </div>
</template>
