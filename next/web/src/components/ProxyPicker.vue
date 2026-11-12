<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import EntityInput from './EntityInput.vue'

// Proxy picker (number | null = no proxy), over the entity lookup. A selected
// proxy the caller cannot see (CONTRACTS §21.2) shows as "#id" and stays
// selected. Also a SchemaForm widget (`proxy-select`): the extra widget props
// (schema, ui, multiple) must not land on the root element.
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue: number | null | undefined; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const { t } = useI18n()
</script>

<template>
  <EntityInput
    kind="proxy"
    numeric
    :model-value="modelValue"
    :placeholder="t('schema.noProxy')"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event as number | null)"
  />
</template>
