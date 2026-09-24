<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useProxiesLookup } from '@/composables/lookups'

defineProps<{ modelValue: number | null | undefined; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const { t } = useI18n()
const { proxies } = useProxiesLookup()

function onChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  emit('update:modelValue', v ? Number(v) : null)
}
</script>

<template>
  <select class="input" :value="modelValue ?? ''" :disabled="disabled" @change="onChange">
    <option value="">{{ t('schema.noProxy') }}</option>
    <option v-for="p in proxies" :key="p.id" :value="p.id">{{ p.name }} ({{ p.protocol }}://{{ p.host }}:{{ p.port }})</option>
  </select>
</template>
