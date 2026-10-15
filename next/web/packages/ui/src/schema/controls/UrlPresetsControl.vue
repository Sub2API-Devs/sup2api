<script setup lang="ts">
// Base URL with suggestions (ui:options.presets, else schema.examples): a URL
// box with a datalist and a "Presets" picker. With schema.enum the server
// restricted the field to those values (CONTRACTS §21.3: the caller lacks
// account:settings:custom), so it is a plain choice; a stored value outside
// the list (set by an admin) stays selectable so saving other fields keeps it.
import { computed, useId } from 'vue'
import SInput from '../../SInput.vue'
import SSelect from '../../SSelect.vue'
import { useUiT } from '../../i18n'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()
const t = useUiT()
const listId = useId()
const presets = computed<string[]>(() => props.ctx.options.presets || props.ctx.schema.examples || [])
const allowed = computed(() => {
  const list: string[] | null = Array.isArray(props.ctx.schema.enum) ? props.ctx.schema.enum.map(String) : null
  const cur = typeof props.modelValue === 'string' ? props.modelValue : ''
  return list && cur && !list.includes(cur) ? [cur, ...list] : list
})
const choices = computed(() => (allowed.value ?? []).map((p) => ({ value: p, label: p })))
const known = computed(() => !!allowed.value?.includes(String(props.modelValue ?? '')))

const set = (v: unknown) => emit('update:modelValue', v || undefined)
function pickPreset(e: Event) {
  const el = e.target as HTMLSelectElement
  emit('update:modelValue', el.value)
  el.value = ''
}
</script>

<template>
  <SSelect
    v-if="allowed"
    :model-value="known ? modelValue : null"
    :options="choices"
    :placeholder="known ? undefined : ctx.placeholder || '—'"
    :disabled="ctx.locked"
    data-testid="url-enum"
    @update:model-value="set"
  />
  <div v-else class="flex gap-2">
    <SInput
      type="url"
      class="flex-1"
      :model-value="modelValue ?? ''"
      :placeholder="ctx.placeholder || presets[0]"
      :list="listId"
      :disabled="ctx.disabled"
      :readonly="ctx.readonly"
      @update:model-value="set"
    />
    <datalist :id="listId">
      <option v-for="p in presets" :key="p" :value="p" />
    </datalist>
    <select v-if="presets.length" class="input !w-auto" :disabled="ctx.locked" :aria-label="t('ui.schema.presets')" @change="pickPreset">
      <option value="">{{ t('ui.schema.presets') }}</option>
      <option v-for="p in presets" :key="p" :value="p">{{ p }}</option>
    </select>
  </div>
</template>
