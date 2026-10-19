<script setup lang="ts">
// Model list as a tag select (like new-api's channel "模型" field): the chosen
// models are chips inside the box (click copies the id, × removes it), typing
// filters the suggestions below, Enter / comma adds the typed id or the
// highlighted suggestion, pasting a comma / line separated list adds every
// id, Backspace in an empty box removes the last chip. A chip whose model is
// mapped shows the target. Ids are checked by the parent (`invalid` emits).
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SIcon, toast } from '@sub2api/ui'
import { copyText } from '@/utils/format'
import { isModelId, splitModelIds } from '@/views/accounts/modelIds'

const props = defineProps<{ modelValue: string[]; options: string[]; mapping?: Record<string, string>; placeholder?: string; error?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void; (e: 'invalid', model: string): void }>()
const { t } = useI18n()
const draft = ref('')
const open = ref(false)
const active = ref(0)
const box = ref<HTMLInputElement>()
const chosen = computed(() => new Set(props.modelValue))

/** Suggestions matching the typed text, chosen ones last; at most 50. */
const suggestions = computed(() => {
  const q = draft.value.trim().toLowerCase()
  const all = [...new Set(props.options)].filter((m) => !q || m.toLowerCase().includes(q))
  return [...all.filter((m) => !chosen.value.has(m)), ...all.filter((m) => chosen.value.has(m))].slice(0, 50)
})

function add(text: string) {
  const list = [...props.modelValue]
  for (const id of splitModelIds(text)) {
    if (!isModelId(id)) {
      emit('invalid', id)
      return
    }
    if (!list.includes(id)) list.push(id)
  }
  if (list.length !== props.modelValue.length) emit('update:modelValue', list)
}

function toggle(model: string) {
  emit('update:modelValue', chosen.value.has(model) ? props.modelValue.filter((m) => m !== model) : [...props.modelValue, model])
  draft.value = ''
  box.value?.focus()
}

function commit() {
  const typed = draft.value.trim()
  const pick = open.value ? suggestions.value[active.value] : undefined
  draft.value = ''
  // The highlighted suggestion wins only when it matches what was typed.
  if (pick && typed && pick.toLowerCase().includes(typed.toLowerCase()) && !chosen.value.has(pick) && !typed.includes(',')) add(pick)
  else if (typed) add(typed)
}

function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Backspace' && !draft.value && props.modelValue.length) {
    emit('update:modelValue', props.modelValue.slice(0, -1))
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    open.value = true
    const n = suggestions.value.length
    if (n) active.value = (active.value + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!/[,\s]/.test(text.trim())) return
  e.preventDefault()
  add(draft.value + ' ' + text)
  draft.value = ''
}

function onInput() {
  open.value = true
  active.value = 0
}

function onBlur() {
  // Let a click on a suggestion land first.
  window.setTimeout(() => {
    open.value = false
    if (draft.value.trim()) commit()
  }, 150)
}

async function copy(model: string) {
  if (await copyText(model)) toast(t('accounts.editorUi.copiedModel', { model }), 'success')
}
</script>

<template>
  <div class="relative" data-testid="models-tags">
    <div
      class="input input-group !h-auto min-h-control flex-wrap !gap-1.5 !py-1.5 cursor-text"
      :class="error ? 'input-error' : ''"
      @click="box?.focus(); open = true"
    >
      <span
        v-for="model in modelValue"
        :key="model"
        class="inline-flex max-w-full items-center gap-1 rounded-chip px-2 py-0.5 font-mono text-xs"
        :class="mapping?.[model] ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300' : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'"
        data-testid="model-chip"
      >
        <button type="button" class="truncate" :title="mapping?.[model] ? t('accounts.editorUi.mappedTo', { model: mapping[model] }) : t('accounts.editorUi.clickToCopy')" @click.stop="copy(model)">
          {{ model }}<template v-if="mapping?.[model]"> → {{ mapping[model] }}</template>
        </button>
        <button type="button" class="shrink-0 rounded opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" :aria-label="t('accounts.editorUi.removeModel', { model })" @click.stop="toggle(model)">
          <SIcon name="x" class="h-3 w-3" />
        </button>
      </span>
      <input
        ref="box"
        v-model="draft"
        class="!h-7 min-w-[10rem] !flex-1 !p-0.5 font-mono text-sm"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open && suggestions.length > 0"
        :placeholder="modelValue.length ? '' : placeholder"
        :aria-label="placeholder"
        data-testid="models-input"
        @keydown="onKey"
        @paste="onPaste"
        @input="onInput"
        @focus="open = true"
        @blur="onBlur"
      />
    </div>
    <ul
      v-if="open && suggestions.length"
      role="listbox"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-control border border-gray-200 bg-white py-1 shadow-popover dark:border-dark-600 dark:bg-dark-800"
      data-testid="models-suggestions"
    >
      <li
        v-for="(model, i) in suggestions"
        :key="model"
        role="option"
        :aria-selected="chosen.has(model)"
        class="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 font-mono text-xs"
        :class="i === active ? 'bg-surface-2' : 'hover:bg-surface-2'"
        @mousedown.prevent="toggle(model)"
        @mouseenter="active = i"
      >
        <span class="truncate">{{ model }}</span>
        <SIcon v-if="chosen.has(model)" name="check" class="h-3.5 w-3.5 shrink-0 text-primary-600" />
      </li>
    </ul>
  </div>
</template>
