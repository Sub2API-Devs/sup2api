<script setup lang="ts">
import { computed, nextTick, ref, useAttrs, useId, watch } from 'vue'
import type { SelectOption } from './types'
import { useUiT } from './i18n'
import { splitAttrs, useFieldControl, type ControlSize } from './field'
import { useFloating } from './floating'

// Styled native <select>. Values keep their type (number/string/boolean/null).
// An option with `options` renders an <optgroup>; the <option> value is the
// index into the flattened option list so lookup works across groups.
// `searchable` renders a combobox (text filter + listbox, group titles); its
// list is teleported to <body> so scrolling containers and modals do not clip
// it. Attrs: on the <select>; when searchable class / style / data-* go to
// the wrapper and id / name / aria-* to the text input. Inside SField /
// SSettingRow it takes the frame's id, aria-describedby, aria-invalid, size.
defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue: SelectOption['value'] | undefined
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    searchable?: boolean
    noResults?: string
    ariaLabel?: string
    size?: ControlSize
    error?: boolean
  }>(),
  { size: undefined }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: SelectOption['value']): void }>()
const attrs = useAttrs()
const t = useUiT()
const { id, a11y, invalid, size } = useFieldControl(props)

type Row = { group: string; items: { o: SelectOption; idx: number }[] } | { o: SelectOption; idx: number }

// Rows to render (groups keep their children) plus the flat list for lookup.
const rows = computed<Row[]>(() => {
  let idx = 0
  return props.options.map((o) =>
    o.options ? { group: o.label, items: o.options.map((c) => ({ o: c, idx: idx++ })) } : { o, idx: idx++ }
  )
})
const flat = computed(() => props.options.flatMap((o) => o.options ?? [o]))

interface Choice extends SelectOption {
  group?: string
}
const open = ref(false)
const query = ref('')
const active = ref(-1)
const listId = useId()
const root = ref<HTMLElement>()
const menu = ref<HTMLElement>()
const teleported = ref(false)
const floating = useFloating(root, menu, { matchWidth: true, onLost: () => (open.value = false) })
const choices = computed<Choice[]>(() => {
  const list: Choice[] = props.options.flatMap((o) => (o.options ? o.options.map((c) => ({ ...c, group: o.label })) : [o]))
  return props.placeholder === undefined ? list : [{ value: null, label: props.placeholder }, ...list]
})
const filtered = computed(() => choices.value.filter((o) => o.label.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const selectedLabel = computed(() => choices.value.find((o) => o.value === props.modelValue)?.label ?? props.modelValue?.toString() ?? '')
const parts = computed(() => splitAttrs(attrs, (k) => k.startsWith('data-')))

function show() {
  if (props.disabled || open.value) return
  query.value = ''
  open.value = true
  active.value = filtered.value.findIndex((o) => o.value === props.modelValue && !o.disabled)
  if (active.value < 0) active.value = filtered.value.findIndex((o) => !o.disabled)
  teleported.value = !!root.value?.isConnected
  nextTick(() => {
    if (open.value && teleported.value) floating.start()
  })
  scrollActive()
}
function hide() {
  open.value = false
}
watch(open, (v) => {
  if (!v) floating.stop()
})
function scrollActive() {
  nextTick(() => menu.value?.querySelector(`[data-index="${active.value}"]`)?.scrollIntoView?.({ block: 'nearest' }))
}
function search(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (!open.value) show()
  query.value = v
  active.value = filtered.value.findIndex((o) => !o.disabled)
  if (teleported.value) nextTick(() => floating.update())
}
function pick(o: SelectOption) {
  if (props.disabled || o.disabled) return
  emit('update:modelValue', o.value)
  open.value = false
}
function move(from: number, step: number) {
  for (let i = from; i >= 0 && i < filtered.value.length; i += step) {
    if (!filtered.value[i].disabled) {
      active.value = i
      scrollActive()
      return
    }
  }
}
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Escape') {
    if (open.value) {
      e.preventDefault()
      e.stopPropagation()
      open.value = false
    }
  } else if (e.key === 'Enter' && open.value) {
    e.preventDefault()
    const o = filtered.value[active.value]
    if (o) pick(o)
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!open.value) return show()
    const step = e.key === 'ArrowDown' ? 1 : -1
    move(active.value + step, step)
  } else if ((e.key === 'Home' || e.key === 'End') && open.value) {
    e.preventDefault()
    if (e.key === 'Home') move(0, 1)
    else move(filtered.value.length - 1, -1)
  } else if (e.key === 'Tab') {
    open.value = false
  }
}
watch(
  () => props.disabled,
  (value) => {
    if (value) open.value = false
  }
)

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
  <div v-if="searchable" ref="root" class="relative" v-bind="parts.wrap">
    <input
      :id="id"
      class="input pr-8"
      :class="[size === 'sm' ? 'input-sm' : '', invalid ? 'input-error' : '']"
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
      v-bind="{ ...parts.control, ...a11y }"
      @focus="show"
      @click="show"
      @input="search"
      @keydown="onKey"
      @blur="hide"
    />
    <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="m5 7 5 5 5-5H5Z" />
    </svg>
    <!-- Inline while detached (tests, previews); teleported in a live page. -->
    <ul
      v-if="open && !teleported"
      :id="listId"
      ref="menu"
      role="listbox"
      :aria-label="ariaLabel"
      class="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-control border border-gray-200 bg-white py-1 shadow-popover dark:border-dark-600 dark:bg-dark-800"
      @mousedown.prevent
    >
      <template v-for="(o, i) in filtered" :key="i">
        <li
          v-if="o.group && (i === 0 || filtered[i - 1].group !== o.group)"
          role="presentation"
          class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle"
        >
          {{ o.group }}
        </li>
        <li
          :id="`${listId}-${i}`"
          role="option"
          :data-index="i"
          :aria-selected="o.value === modelValue"
          :aria-disabled="o.disabled || undefined"
          class="cursor-pointer py-2 text-sm"
          :class="[
            o.group ? 'pl-5 pr-3' : 'px-3',
            i === active ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200',
            o.disabled ? 'cursor-not-allowed opacity-40' : ''
          ]"
          @mouseenter="active = i"
          @click="pick(o)"
        >
          {{ o.label }}
        </li>
      </template>
      <li v-if="!filtered.length" role="presentation" class="px-3 py-2 text-sm text-fg-muted">{{ noResults ?? t('ui.noResults') }}</li>
    </ul>
    <Teleport v-if="teleported" to="body">
      <ul
        v-if="open"
        :id="listId"
        ref="menu"
        role="listbox"
        :aria-label="ariaLabel"
        class="fixed z-popover max-h-60 overflow-y-auto rounded-control border border-gray-200 bg-white py-1 shadow-popover dark:border-dark-600 dark:bg-dark-800"
        :style="floating.style.value"
        @mousedown.prevent
      >
        <template v-for="(o, i) in filtered" :key="i">
          <li
            v-if="o.group && (i === 0 || filtered[i - 1].group !== o.group)"
            role="presentation"
            class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle"
          >
            {{ o.group }}
          </li>
          <li
            :id="`${listId}-${i}`"
            role="option"
            :data-index="i"
            :aria-selected="o.value === modelValue"
            :aria-disabled="o.disabled || undefined"
            class="cursor-pointer py-2 text-sm"
            :class="[
              o.group ? 'pl-5 pr-3' : 'px-3',
              i === active ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200',
              o.disabled ? 'cursor-not-allowed opacity-40' : ''
            ]"
            @mouseenter="active = i"
            @click="pick(o)"
          >
            {{ o.label }}
          </li>
        </template>
        <li v-if="!filtered.length" role="presentation" class="px-3 py-2 text-sm text-fg-muted">{{ noResults ?? t('ui.noResults') }}</li>
      </ul>
    </Teleport>
  </div>
  <select
    v-else
    :id="id"
    class="input"
    :class="[size === 'sm' ? 'input-sm' : '', invalid ? 'input-error' : '']"
    :value="selectedIndex()"
    :disabled="disabled"
    :aria-label="ariaLabel"
    v-bind="{ ...attrs, ...a11y }"
    @change="onChange"
  >
    <option v-if="placeholder !== undefined" :value="-1">{{ placeholder }}</option>
    <template v-for="(r, i) in rows" :key="i">
      <optgroup v-if="'group' in r" :label="r.group">
        <option v-for="c in r.items" :key="c.idx" :value="c.idx" :disabled="c.o.disabled">{{ c.o.label }}</option>
      </optgroup>
      <option v-else :value="r.idx" :disabled="r.o.disabled">{{ r.o.label }}</option>
    </template>
  </select>
</template>
