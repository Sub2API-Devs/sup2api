<script setup lang="ts">
import { onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { SAlert, SField, STextarea } from '@sub2api/ui'
import { useDwHost, type Layer } from './host'

// JSON mode of a layer's rules and strategies (new-api's items JSON panel):
// the two arrays as text. Text that parses to an array of named items goes
// into the layer at once; otherwise the error is shown, `invalid` is set and
// the layer keeps its last good value. A change to the layer from elsewhere
// (restoring the defaults, discard, the saved configuration) replaces the
// text; the layer following the text does not, so typing is never
// reformatted. Everything else is checked by the plugin (Validate, Save).
const layer = defineModel<Layer>({ required: true })
const invalid = defineModel<boolean>('invalid', { default: false })
const t = useDwHost().t

type Part = 'rules' | 'strategies'
const parts: Part[] = ['rules', 'strategies']
const text = ref<Record<Part, string>>({ rules: '', strategies: '' })
const errors = ref<Record<Part, string>>({ rules: '', strategies: '' })
// The layer's value each text last matched (compact JSON).
const applied: Record<Part, string> = { rules: '', strategies: '' }

// A new layer (discard, save) always replaces the text, even an invalid one.
for (const part of parts) {
  watch(
    () => [layer.value, JSON.stringify(layer.value[part])] as const,
    ([of, now], old) => {
      if (old && of === old[0] && now === applied[part]) return
      applied[part] = now
      text.value[part] = JSON.stringify(layer.value[part], null, 2)
      errors.value[part] = ''
    },
    { immediate: true }
  )
}

watchEffect(() => (invalid.value = parts.some((p) => errors.value[p] !== '')))
// The layer keeps its last good value once the panel is gone.
onBeforeUnmount(() => (invalid.value = false))

/** The error of a text, '' when it is an array of named items. */
function check(parsed: unknown): string {
  if (!Array.isArray(parsed)) return t('json.notArray')
  const bad = parsed.findIndex((x) => !x || typeof x !== 'object' || typeof x.name !== 'string')
  return bad === -1 ? '' : t('json.unnamed', { i: bad })
}

function edit(part: Part, value: string) {
  text.value[part] = value
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (e) {
    errors.value[part] = (e as Error).message
    return
  }
  errors.value[part] = check(parsed)
  if (errors.value[part]) return
  applied[part] = JSON.stringify(parsed)
  if (part === 'rules') layer.value.rules = parsed as Layer['rules']
  else layer.value.strategies = parsed as Layer['strategies']
}
</script>

<template>
  <div class="dw-list">
    <SField v-for="part in parts" :key="part" :label="t(`json.${part}`)" :hint="t(`json.${part}Hint`)">
      <STextarea :model-value="text[part]" :rows="14" mono :error="!!errors[part]" @update:model-value="edit(part, $event)" />
      <SAlert v-if="errors[part]" tone="danger" class="dw-section">{{ errors[part] }}</SAlert>
    </SField>
  </div>
</template>
