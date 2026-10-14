<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SSelect, type SelectOption } from '@sub2api/ui'
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
  <div
    v-if="multiple"
    class="input flex min-h-[2.75rem] flex-wrap items-center gap-1.5 !py-1.5"
    :class="disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-dark-900' : ''"
  >
    <SChip v-for="id in selected" :key="id" tone="primary" :closable="!disabled" @close="remove(id)">{{ nameOf(id) }}</SChip>
    <SSelect
      v-if="!disabled && available.length"
      :model-value="null"
      :options="availableOptions"
      :placeholder="`+ ${t('common.group')}`"
      class="!w-auto !border-0 !bg-transparent !py-0.5 !pl-1 text-xs text-fg-muted !shadow-none !ring-0"
      @update:model-value="add"
    />
    <span v-else-if="!selected.length" class="px-1 text-sm text-fg-subtle">—</span>
  </div>
  <SSelect v-else :model-value="selected[0] ?? null" :options="allOptions" placeholder="—" :disabled="disabled" @update:model-value="single" />
</template>
