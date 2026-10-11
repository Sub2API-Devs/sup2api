<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import type { SelectOption } from './types'

// Styled native <select>. Values keep their type (number/string/boolean/null).
// An option with `options` renders an <optgroup>; the <option> value is the
// index into the flattened option list so lookup works across groups.
const props = defineProps<{
  modelValue: SelectOption['value'] | undefined
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  noResults?: string
  ariaLabel?: string
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

const open = ref(false)
const query = ref('')
const active = ref(-1)
const listId = useId()
const menu = ref<HTMLElement>()
const choices = computed(() => props.placeholder === undefined ? flat.value : [{ value: null, label: props.placeholder }, ...flat.value])
const filtered = computed(() => choices.value.filter(o => o.label.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const selectedLabel = computed(() => choices.value.find(o => o.value === props.modelValue)?.label ?? props.modelValue?.toString() ?? '')

function show() {
  if (props.disabled || open.value) return
  query.value = ''
  open.value = true
  active.value = filtered.value.findIndex(o => o.value === props.modelValue && !o.disabled)
  if (active.value < 0) active.value = filtered.value.findIndex(o => !o.disabled)
  scrollActive()
}
function scrollActive() {
  nextTick(() => menu.value?.children[active.value]?.scrollIntoView?.({ block: 'nearest' }))
}
function search(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  open.value = true
  active.value = filtered.value.findIndex(o => !o.disabled)
}
function pick(o: SelectOption) {
  if (props.disabled || o.disabled) return
  emit('update:modelValue', o.value)
  open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Escape') {
    if (open.value) { e.preventDefault(); e.stopPropagation(); open.value = false }
  } else if (e.key === 'Enter' && open.value) {
    e.preventDefault()
    const o = filtered.value[active.value]
    if (o) pick(o)
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!open.value) return show()
    const step = e.key === 'ArrowDown' ? 1 : -1
    for (let i = active.value + step; i >= 0 && i < filtered.value.length; i += step) {
      if (!filtered.value[i].disabled) { active.value = i; scrollActive(); break }
    }
  }
}
watch(() => props.disabled, value => { if (value) open.value = false })

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
  <div v-if="searchable" class="relative">
    <input
      class="input pr-8"
      role="combobox"
      :aria-label="ariaLabel"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open && active >= 0 ? `${listId}-${active}` : undefined"
      :value="open ? query : selectedLabel"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @focus="show"
      @click="show"
      @input="search"
      @keydown="onKey"
      @blur="open = false"
    />
    <svg class="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m5 7 5 5 5-5H5Z" /></svg>
    <ul v-if="open" :id="listId" ref="menu" role="listbox" :aria-label="ariaLabel" class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-600 dark:bg-dark-800" @mousedown.prevent>
      <li
        v-for="(o, i) in filtered"
        :id="`${listId}-${i}`"
        :key="i"
        role="option"
        :aria-selected="o.value === modelValue"
        :aria-disabled="o.disabled || undefined"
        class="cursor-pointer px-3 py-2 text-sm"
        :class="[i === active ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200', o.disabled ? 'cursor-not-allowed opacity-40' : '']"
        @mouseenter="active = i"
        @click="pick(o)"
      >{{ o.label }}</li>
      <li v-if="!filtered.length" role="presentation" class="px-3 py-2 text-sm text-gray-500">{{ noResults }}</li>
    </ul>
  </div>
  <select v-else class="input" :value="selectedIndex()" :disabled="disabled" :aria-label="ariaLabel" @change="onChange">
    <option v-if="placeholder !== undefined" :value="-1">{{ placeholder }}</option>
    <template v-for="(r, i) in rows" :key="i">
      <optgroup v-if="'group' in r" :label="r.group">
        <option v-for="c in r.items" :key="c.idx" :value="c.idx" :disabled="c.o.disabled">{{ c.o.label }}</option>
      </optgroup>
      <option v-else :value="r.idx" :disabled="r.o.disabled">{{ r.o.label }}</option>
    </template>
  </select>
</template>
