<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

// Editor for a string->string map (JSON object). Keeps row order locally.
const props = defineProps<{
  modelValue: Record<string, string> | null | undefined
  keyLabel?: string
  valueLabel?: string
  keyPlaceholder?: string
  valuePlaceholder?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void }>()
const { t } = useI18n()

interface Row {
  k: string
  v: string
}
const rows = ref<Row[]>([])

function fromModel(m: Record<string, string> | null | undefined): Row[] {
  return Object.entries(m || {}).map(([k, v]) => ({ k, v: String(v ?? '') }))
}

function toModel(list: Row[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of list) if (r.k.trim()) out[r.k.trim()] = r.v
  return out
}

watch(
  () => props.modelValue,
  (m) => {
    if (JSON.stringify(toModel(rows.value)) !== JSON.stringify(m || {})) rows.value = fromModel(m)
  },
  { immediate: true, deep: true }
)

function sync() {
  emit('update:modelValue', toModel(rows.value))
}

function add() {
  rows.value.push({ k: '', v: '' })
}

function remove(i: number) {
  rows.value.splice(i, 1)
  sync()
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="rows.length" class="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-gray-500 dark:text-dark-400">
      <span>{{ keyLabel || t('ui.key') }}</span>
      <span>{{ valueLabel || t('ui.value') }}</span>
      <span class="w-8" />
    </div>
    <div v-for="(r, i) in rows" :key="i" class="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
      <input v-model="r.k" class="input !py-2" :placeholder="keyPlaceholder" :disabled="disabled" @input="sync" />
      <input v-model="r.v" class="input !py-2" :placeholder="valuePlaceholder" :disabled="disabled" @input="sync" />
      <button type="button" class="btn btn-ghost btn-sm w-8 !px-0" :disabled="disabled" :title="t('ui.remove')" @click="remove(i)">×</button>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" :disabled="disabled" @click="add">+ {{ t('ui.add') }}</button>
  </div>
</template>
