<script setup lang="ts">
import { computed } from 'vue'
import { SInput, SSettingRow } from '@sub2api/ui'
import { useModHost } from '../host'
import { NUMBER_FIELDS } from './fields'
import { useSettingsForm } from './useSettings'

// A number setting: label and description from settingsPage.f.<key>, range
// from NUMBER_FIELDS (shown divided by its scale), unit after the input.
const props = defineProps<{ field: string; unit?: string }>()
const f = useSettingsForm()
const t = useModHost().t
const spec = computed(() => NUMBER_FIELDS[props.field])
const scale = computed(() => spec.value?.scale || 1)
const value = computed({
  get: () => (typeof f.draft[props.field] === 'number' ? f.draft[props.field] / scale.value : f.draft[props.field]),
  set: (v: number | null) => (f.draft[props.field] = v === null ? null : Math.round(v * scale.value))
})
const range = computed(() => t('settingsPage.range', { min: spec.value.min / scale.value, max: spec.value.max / scale.value }))
</script>

<template>
  <SSettingRow :label="t(`settingsPage.f.${field}.label`)" :error="f.errorOf(field)">
    <template #description>{{ t(`settingsPage.f.${field}.desc`) }} {{ range }}</template>
    <SInput
      v-model="value"
      type="number"
      :min="spec.min / scale"
      :max="spec.max / scale"
      step="1"
      :suffix="unit"
      :disabled="!f.canWrite"
      size="sm"
      class="mod-set-number"
    />
  </SSettingRow>
</template>

<style scoped>
.mod-set-number {
  width: 10rem;
}
</style>
