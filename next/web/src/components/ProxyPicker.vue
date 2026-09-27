<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSelect, type SelectOption } from '@sub2api/ui'
import { useProxiesLookup } from '@/composables/lookups'

// Proxy picker (number | null). Also a SchemaForm widget (`proxy-select`): the
// extra widget props (schema, ui, multiple) must not land on the <select>.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ modelValue: number | null | undefined; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const { t } = useI18n()
const { proxies } = useProxiesLookup()

// A selected proxy outside the list (not visible to the caller, CONTRACTS
// §21.2, or beyond the lookup page) stays selectable as "#id" so the select
// does not silently show "no proxy".
const unknownSelected = computed(() => props.modelValue != null && !proxies.value.some((p) => p.id === props.modelValue))

const options = computed<SelectOption[]>(() => [
  ...(unknownSelected.value ? [{ value: props.modelValue as number, label: `#${props.modelValue}` }] : []),
  ...proxies.value.map((p) => ({ value: p.id, label: `${p.name} (${p.protocol}://${p.host}:${p.port})` }))
])

function onChange(v: unknown) {
  emit('update:modelValue', v ? Number(v) : null)
}
</script>

<template>
  <SSelect :model-value="modelValue ?? null" :options="options" :placeholder="t('schema.noProxy')" :disabled="disabled" @update:model-value="onChange" />
</template>
