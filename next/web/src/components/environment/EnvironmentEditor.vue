<script setup lang="ts">
// The values of one layer of the environment variables (CONTRACTS §73.3): a
// row per variable the layer may hold. An empty value follows the next layer
// (account → group → global → process environment variable).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSettingRow, localizedText } from '@sub2api/ui'
import type { EnvironmentLayer, EnvironmentValues, EnvironmentVariable } from '@/api/types'
import { useEnvironmentVariables } from '@/composables/lookups'

const props = defineProps<{
  layer: EnvironmentLayer
  /** Server field errors; a variable's error is under `${field}.${key}`. */
  errors?: Record<string, string>
  field: string
  disabled?: boolean
}>()
const model = defineModel<EnvironmentValues>({ required: true })
const { t, locale } = useI18n()
const { variables, process } = useEnvironmentVariables()

const rows = computed(() => variables.value.filter((v) => v.layers.includes(props.layer)))

function description(v: EnvironmentVariable): string {
  const parts = [localizedText(v.help, locale.value), t('settings.environment.range', { min: v.min, max: v.max })]
  if (props.layer === 'global') {
    const p = process.value[v.key]
    parts.push(p ? t('settings.environment.processSet', { name: v.process_env, value: p }) : t('settings.environment.processUnset', { name: v.process_env }))
  }
  return parts.join(' ')
}

/** The global layer shows the process value it falls back to; the others just follow. */
function placeholder(v: EnvironmentVariable): string {
  const p = props.layer === 'global' ? process.value[v.key] : undefined
  return p ? t('settings.environment.followValue', { value: p }) : t('settings.environment.follow')
}

function set(key: string, value: string | number | FileList | null) {
  const next = { ...model.value }
  if (typeof value === 'number' && value !== 0) next[key] = value
  else delete next[key]
  model.value = next
}
</script>

<template>
  <SSettingRow
    v-for="v in rows"
    :key="v.key"
    :label="localizedText(v.name, locale)"
    :description="description(v)"
    :error="errors?.[`${field}.${v.key}`]"
  >
    <SInput
      :model-value="model[v.key] ?? null"
      type="number"
      step="1"
      :min="v.min"
      :max="v.max"
      :suffix="t(`settings.environment.units.${v.unit}`)"
      :placeholder="placeholder(v)"
      :name="`environment-${v.key}`"
      class="w-full sm:w-48"
      :disabled="disabled"
      @update:model-value="set(v.key, $event)"
    />
  </SSettingRow>
</template>
