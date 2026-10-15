<script setup lang="ts">
// Monospace JSON text for values without a better widget. Text that does not
// parse is kept and reported in the field frame; values set from outside
// (loaded, reset, defaults) replace the text unless it already says the same
// thing.
import { ref, watch } from 'vue'
import STextarea from '../../STextarea.vue'
import { useUiT } from '../../i18n'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()
const t = useUiT()
const format = (v: unknown) => (v === undefined ? '' : JSON.stringify(v, null, 2))
const text = ref(format(props.modelValue))

function sameValue(s: string, v: unknown): boolean {
  if (!s.trim()) return v === undefined
  try {
    return JSON.stringify(JSON.parse(s)) === JSON.stringify(v)
  } catch {
    return false
  }
}

function onInput(v: unknown) {
  text.value = String(v ?? '')
  if (!text.value.trim()) {
    props.ctx.setError('')
    return emit('update:modelValue', undefined)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text.value)
  } catch {
    return props.ctx.setError(t('ui.schema.invalidJSON'))
  }
  props.ctx.setError('')
  emit('update:modelValue', parsed)
}

watch(
  () => props.modelValue,
  (v) => {
    if (sameValue(text.value, v)) return
    text.value = format(v)
    props.ctx.setError('')
  }
)
</script>

<template>
  <STextarea mono class="text-xs" :rows="ctx.options.rows || 5" :model-value="text" :disabled="ctx.disabled" :readonly="ctx.readonly" @update:model-value="onInput" />
</template>
