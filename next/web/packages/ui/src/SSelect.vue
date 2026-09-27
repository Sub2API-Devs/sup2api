<script setup lang="ts">
import { computed } from 'vue'
import type { SelectOption } from './types'

// Styled native <select>. Values keep their type (number/string/boolean/null).
// An option with `options` renders an <optgroup>; the <option> value is the
// index into the flattened option list so lookup works across groups.
const props = defineProps<{
  modelValue: SelectOption['value'] | undefined
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()

type Row = { group: string; items: { o: SelectOption; idx: number }[] } | { o: SelectOption; idx: number }

// Rows to render (groups keep their children) plus the flat list for lookup.
const rows = computed<Row[]>(() => {
  let idx = 0
  return props.options.map((o) =>
    o.options ? { group: o.label, items: o.options.map((c) => ({ o: c, idx: idx++ })) } : { o, idx: idx++ }
  )
})
const flat = computed(() => props.options.flatMap((o) => o.options ?? [o]))

function onChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value)
  if (idx < 0) emit('update:modelValue', null)
  else emit('update:modelValue', flat.value[idx]?.value ?? null)
}

function selectedIndex(): number {
  return flat.value.findIndex((o) => o.value === props.modelValue)
}
</script>

<template>
  <select class="input" :value="selectedIndex()" :disabled="disabled" @change="onChange">
    <option v-if="placeholder !== undefined" :value="-1">{{ placeholder }}</option>
    <template v-for="(r, i) in rows" :key="i">
      <optgroup v-if="'group' in r" :label="r.group">
        <option v-for="c in r.items" :key="c.idx" :value="c.idx" :disabled="c.o.disabled">{{ c.o.label }}</option>
      </optgroup>
      <option v-else :value="r.idx" :disabled="r.o.disabled">{{ r.o.label }}</option>
    </template>
  </select>
</template>
