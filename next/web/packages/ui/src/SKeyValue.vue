<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiT } from './i18n'
import SInput from './SInput.vue'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'
import { useFieldControl, type ControlSize } from './field'
import { TONE_TEXT } from './tones'

// Editor for a string->string map (JSON object). Keeps row order locally;
// rows with an empty key are dropped from the value. `listId` /
// `valueListId` name <datalist>s for key / value suggestions; `mono` uses a
// monospace font; `separator` draws an arrow between key and value (mapping
// editors); `rowWarn(row, index)` returns a warning shown under a row.
// Inside SField / SSettingRow the group is labelled by the frame's label and
// follows its size; `error` (or the frame's error) marks every cell.
const props = withDefaults(
  defineProps<{
    modelValue: Record<string, string> | null | undefined
    keyLabel?: string
    valueLabel?: string
    keyPlaceholder?: string
    valuePlaceholder?: string
    disabled?: boolean
    listId?: string
    valueListId?: string
    mono?: boolean
    separator?: boolean
    rowWarn?: (row: { key: string; value: string }, index: number) => string | null | undefined | false
    size?: ControlSize
    error?: boolean
    addLabel?: string
  }>(),
  { size: undefined }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void }>()
const t = useUiT()
const { a11y, invalid, size } = useFieldControl(props, false)
const grid = computed(() => (props.separator ? 'grid-cols-[1fr_auto_1fr_auto]' : 'grid-cols-[1fr_1fr_auto]'))

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

function setKey(r: Row, v: unknown) {
  r.k = String(v ?? '')
  sync()
}
function setValue(r: Row, v: unknown) {
  r.v = String(v ?? '')
  sync()
}

function add() {
  rows.value.push({ k: '', v: '' })
}

function remove(i: number) {
  rows.value.splice(i, 1)
  sync()
}

function warn(r: Row, i: number): string {
  return (props.rowWarn && props.rowWarn({ key: r.k, value: r.v }, i)) || ''
}
</script>

<template>
  <div class="space-y-2" role="group" v-bind="a11y">
    <div
      v-if="rows.length"
      class="grid gap-2 text-xs text-gray-500 dark:text-dark-400"
      :class="grid"
      aria-hidden="true"
    >
      <span>{{ keyLabel || t('ui.key') }}</span>
      <span v-if="separator" class="w-4" />
      <span>{{ valueLabel || t('ui.value') }}</span>
      <span class="w-8" />
    </div>
    <div v-for="(r, i) in rows" :key="i">
      <div class="grid items-center gap-2" :class="grid">
        <SInput
          :model-value="r.k"
          :size="size"
          :mono="mono"
          :error="invalid"
          :placeholder="keyPlaceholder"
          :disabled="disabled"
          :list="listId"
          :aria-label="`${keyLabel || t('ui.key')} ${i + 1}`"
          @update:model-value="setKey(r, $event)"
        />
        <SIcon v-if="separator" name="chevron-right" class="h-4 w-4 text-fg-subtle" />
        <SInput
          :model-value="r.v"
          :size="size"
          :mono="mono"
          :error="invalid"
          :placeholder="valuePlaceholder"
          :disabled="disabled"
          :list="valueListId"
          :aria-label="`${valueLabel || t('ui.value')} ${i + 1}`"
          @update:model-value="setValue(r, $event)"
        />
        <SButton
          variant="ghost"
          size="sm"
          icon="x"
          icon-only
          :disabled="disabled"
          :aria-label="t('ui.removeItem', { name: r.k || i + 1 })"
          :title="t('ui.remove')"
          @click="remove(i)"
        />
      </div>
      <p v-if="warn(r, i)" class="mt-1 text-xs" :class="TONE_TEXT.warning">{{ warn(r, i) }}</p>
    </div>
    <SButton size="sm" icon="plus" :disabled="disabled" @click="add">{{ addLabel || t('ui.add') }}</SButton>
  </div>
</template>
