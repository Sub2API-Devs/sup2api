<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGroupsLookup } from '@/composables/lookups'

// Group picker: multiple (number[]) or single (number | null).
const props = defineProps<{ modelValue: number[] | number | null | undefined; multiple?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number[] | number | null): void }>()
const { t } = useI18n()
const { groups } = useGroupsLookup()

const selected = computed<number[]>(() => {
  const v = props.modelValue
  if (Array.isArray(v)) return v
  return v === null || v === undefined ? [] : [v]
})

const available = computed(() => groups.value.filter((g) => !selected.value.includes(g.id)))

function nameOf(id: number) {
  return groups.value.find((g) => g.id === id)?.name || `#${id}`
}

function add(e: Event) {
  const id = Number((e.target as HTMLSelectElement).value)
  ;(e.target as HTMLSelectElement).value = ''
  if (!id) return
  emit('update:modelValue', [...selected.value, id])
}

function remove(id: number) {
  emit(
    'update:modelValue',
    selected.value.filter((x) => x !== id)
  )
}

function single(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  emit('update:modelValue', v ? Number(v) : null)
}
</script>

<template>
  <div v-if="multiple" class="flex flex-wrap items-center gap-1.5">
    <span
      v-for="id in selected"
      :key="id"
      class="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
    >
      {{ nameOf(id) }}
      <button v-if="!disabled" type="button" class="opacity-60 hover:opacity-100" @click="remove(id)">×</button>
    </span>
    <select v-if="!disabled && available.length" class="input !w-auto !py-1 text-xs" @change="add">
      <option value="">+ {{ t('common.group') }}</option>
      <option v-for="g in available" :key="g.id" :value="g.id">{{ g.name }}</option>
    </select>
  </div>
  <select v-else class="input" :value="selected[0] ?? ''" :disabled="disabled" @change="single">
    <option value="">—</option>
    <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
  </select>
</template>
