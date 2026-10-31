<script setup lang="ts">
import { SSegmented } from '@sub2api/ui'
import { useModHost } from '../host'
import type { Granularity } from '../stats'

// "By hour (today) / by day (last 14 days)" switch of the overview charts.
defineProps<{ modelValue: Granularity }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Granularity): void }>()
const t = useModHost().t
</script>

<template>
  <SSegmented
    :model-value="modelValue"
    size="sm"
    :aria-label="t('overviewP3.granularity.label')"
    :options="[
      { value: 'hour', label: t('overviewP3.granularity.hour') },
      { value: 'day', label: t('overviewP3.granularity.day') }
    ]"
    @update:model-value="emit('update:modelValue', $event as Granularity)"
  />
</template>
