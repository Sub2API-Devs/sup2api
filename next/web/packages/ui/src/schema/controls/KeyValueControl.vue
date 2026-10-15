<script setup lang="ts">
// String map editor: key-value, or model-mapping (monospace, arrow between
// requested and upstream model). Labels / placeholders from ui:options.
import { computed } from 'vue'
import SKeyValue from '../../SKeyValue.vue'
import { useUiT } from '../../i18n'
import { localizedText } from '../schema'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void }>()
const t = useUiT()
const mapping = computed(() => props.ctx.widget === 'model-mapping')
const text = (key: string) => (props.ctx.options[key] ? localizedText(props.ctx.options[key], props.ctx.locale) : undefined)
</script>

<template>
  <SKeyValue
    :model-value="modelValue"
    :key-label="text('keyLabel') ?? (mapping ? t('ui.schema.mappingFrom') : undefined)"
    :value-label="text('valueLabel') ?? (mapping ? t('ui.schema.mappingTo') : undefined)"
    :key-placeholder="text('keyPlaceholder')"
    :value-placeholder="text('valuePlaceholder')"
    :mono="mapping || !!ctx.options.mono"
    :separator="mapping"
    :disabled="ctx.locked"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
