<script setup lang="ts">
// Single-line SInput widgets: text (email / url input type from `format`),
// secret, number, date-time (RFC 3339 <-> local time), date and time.
import { computed } from 'vue'
import SInput from '../../SInput.vue'
import { fromLocalInput, toLocalInput } from '../../timeRange'
import { isBlank } from '../../value'
import { SECRET_MASK, localizedText, schemaType } from '../schema'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const TEXT_TYPES: Record<string, 'email' | 'url' | undefined> = { email: 'email', uri: 'url', url: 'url' }
/** A stored secret comes back masked: the box stays empty and an empty box keeps it. */
const kept = computed(() => props.ctx.widget === 'secret' && props.modelValue === SECRET_MASK)
const unit = computed(() => (props.ctx.options.unit === undefined ? undefined : localizedText(props.ctx.options.unit, props.ctx.locale)))

const bind = computed(() => {
  const { widget, schema, placeholder, options } = props.ctx
  const v = props.modelValue
  switch (widget) {
    case 'secret':
      return { type: 'password' as const, revealable: true, autocomplete: 'new-password', modelValue: kept.value ? '' : (v ?? ''), placeholder: kept.value ? SECRET_MASK : placeholder }
    case 'number':
      return { type: 'number' as const, modelValue: v ?? null, min: schema.minimum, max: schema.maximum, step: schemaType(schema) === 'integer' ? 1 : 'any', suffix: unit.value, placeholder }
    case 'date-time':
      return { type: 'datetime-local' as const, modelValue: toLocalInput(v) }
    case 'date':
    case 'time':
      return { type: widget as 'date' | 'time', modelValue: v ?? '' }
    default:
      return { type: TEXT_TYPES[schema.format] ?? ('text' as const), modelValue: v ?? '', placeholder, mono: !!options.mono, suffix: unit.value, maxlength: schema.maxLength }
  }
})

function update(v: unknown) {
  switch (props.ctx.widget) {
    case 'secret':
      return emit('update:modelValue', v === '' && kept.value ? SECRET_MASK : String(v ?? ''))
    case 'number':
      return emit('update:modelValue', isBlank(v) ? undefined : v)
    case 'date-time':
      return emit('update:modelValue', fromLocalInput(typeof v === 'string' ? v : '') || undefined)
    case 'date':
    case 'time':
      return emit('update:modelValue', v || undefined)
    default:
      return emit('update:modelValue', v)
  }
}
</script>

<template>
  <SInput :class="ctx.fieldClass" v-bind="bind" :disabled="ctx.disabled" :readonly="ctx.readonly" @update:model-value="update" />
</template>
