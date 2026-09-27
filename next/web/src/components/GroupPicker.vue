<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSelect, type SelectOption } from '@sub2api/ui'
import { useGroupsLookup } from '@/composables/lookups'

// Group picker: multiple (number[]) or single (number | null). Also a SchemaForm
// widget (`group-select`): the extra widget props (schema, ui) must not land
// on the root element.
defineOptions({ inheritAttrs: false })
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
const availableOptions = computed<SelectOption[]>(() => available.value.map((g) => ({ value: g.id, label: g.name })))
const allOptions = computed<SelectOption[]>(() => groups.value.map((g) => ({ value: g.id, label: g.name })))

function nameOf(id: number) {
  return groups.value.find((g) => g.id === id)?.name || `#${id}`
}

function add(v: unknown) {
  const id = Number(v)
  if (!id) return
  emit('update:modelValue', [...selected.value, id])
}

function remove(id: number) {
  emit(
    'update:modelValue',
    selected.value.filter((x) => x !== id)
  )
}

function single(v: unknown) {
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
    <SSelect
      v-if="!disabled && available.length"
      :model-value="null"
      :options="availableOptions"
      :placeholder="`+ ${t('common.group')}`"
      class="!w-auto !py-1 text-xs"
      @update:model-value="add"
    />
  </div>
  <SSelect v-else :model-value="selected[0] ?? null" :options="allOptions" placeholder="—" :disabled="disabled" @update:model-value="single" />
</template>
