<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProxiesLookup } from '@/composables/lookups'

const props = defineProps<{ modelValue: number | null | undefined; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const { t } = useI18n()
const { proxies } = useProxiesLookup()

// A selected proxy outside the list (not visible to the caller, CONTRACTS
// §21.2, or beyond the lookup page) stays selectable as "#id" so the select
// does not silently show "no proxy".
const unknownSelected = computed(() => props.modelValue != null && !proxies.value.some((p) => p.id === props.modelValue))

function onChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  emit('update:modelValue', v ? Number(v) : null)
}
</script>

<template>
  <select class="input" :value="modelValue ?? ''" :disabled="disabled" @change="onChange">
    <option value="">{{ t('schema.noProxy') }}</option>
    <option v-if="unknownSelected" :value="modelValue">#{{ modelValue }}</option>
    <option v-for="p in proxies" :key="p.id" :value="p.id">{{ p.name }} ({{ p.protocol }}://{{ p.host }}:{{ p.port }})</option>
  </select>
</template>
