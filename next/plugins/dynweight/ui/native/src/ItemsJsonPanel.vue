<script setup lang="ts">
import { ref } from 'vue'
import { SAlert, SField, STextarea } from '@sub2api/ui'
import { useDwHost, type Layer } from './host'

// JSON mode of a layer's rules and strategies (new-api's items JSON panel):
// the two arrays as text. Text that parses to an array of named items goes
// into the layer at once; otherwise the error is shown and the layer keeps
// its last good value. Everything else is checked by the plugin
// (Validate, Save).
const layer = defineModel<Layer>({ required: true })
const t = useDwHost().t

type Part = 'rules' | 'strategies'
const text = ref<Record<Part, string>>({ rules: JSON.stringify(layer.value.rules, null, 2), strategies: JSON.stringify(layer.value.strategies, null, 2) })
const errors = ref<Record<Part, string>>({ rules: '', strategies: '' })

function edit(part: Part, value: string) {
  text.value[part] = value
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (e) {
    errors.value[part] = (e as Error).message
    return
  }
  const bad = !Array.isArray(parsed) ? -1 : parsed.findIndex((x) => !x || typeof x !== 'object' || typeof x.name !== 'string')
  if (bad !== -1) {
    errors.value[part] = Array.isArray(parsed) ? t('json.unnamed', { i: bad }) : t('json.notArray')
    return
  }
  errors.value[part] = ''
  if (part === 'rules') layer.value.rules = parsed as Layer['rules']
  else layer.value.strategies = parsed as Layer['strategies']
}
</script>

<template>
  <div class="dw-list">
    <SField v-for="part in ['rules', 'strategies'] as const" :key="part" :label="t(`json.${part}`)" :hint="t(`json.${part}Hint`)">
      <STextarea :model-value="text[part]" :rows="14" mono :error="!!errors[part]" @update:model-value="edit(part, $event)" />
      <SAlert v-if="errors[part]" tone="danger" class="dw-section">{{ errors[part] }}</SAlert>
    </SField>
  </div>
</template>
