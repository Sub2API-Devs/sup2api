<script setup lang="ts">
// One value out of the enum: select (searchable from SEARCHABLE_FROM options
// unless ui:options.searchable says otherwise), segmented or radio.
import { computed } from 'vue'
import SSelect from '../../SSelect.vue'
import SSegmented from '../../SSegmented.vue'
import SRadioGroup from '../../SRadioGroup.vue'
import { enumOptions } from '../schema'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()
const SEARCHABLE_FROM = 10
const options = computed(() => enumOptions(props.ctx.schema, props.ctx.ui, props.ctx.locale) ?? [])
const searchable = computed(() => props.ctx.options.searchable ?? options.value.length >= SEARCHABLE_FROM)
</script>

<template>
  <SSelect
    v-if="ctx.widget === 'select'"
    :class="ctx.fieldClass"
    :model-value="modelValue"
    :options="options"
    :placeholder="ctx.placeholder || '—'"
    :searchable="!!searchable"
    :disabled="ctx.locked"
    @update:model-value="emit('update:modelValue', $event ?? undefined)"
  />
  <SSegmented
    v-else-if="ctx.widget === 'segmented'"
    :model-value="modelValue"
    :options="options"
    :size="ctx.layout === 'settings' ? 'sm' : 'md'"
    :disabled="ctx.locked"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <SRadioGroup v-else :model-value="modelValue" :options="options" :inline="!!ctx.options.inline" :disabled="ctx.locked" @update:model-value="emit('update:modelValue', $event)" />
</template>
