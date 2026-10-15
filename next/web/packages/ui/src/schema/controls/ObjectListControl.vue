<script setup lang="ts">
// Array of objects: one bordered block per item (title from
// ui:options.itemTitle, "{n}" = 1-based index) with move up / down / remove
// buttons, and an Add button disabled at maxItems.
import { computed, ref, watch } from 'vue'
import SButton from '../../SButton.vue'
import SIcon from '../../SIcon.vue'
import { useUiT } from '../../i18n'
import SchemaField from '../SchemaField.vue'
import { childUI, localizedText, schemaType, withDefaults as fillDefaults } from '../schema'
import type { ControlContext } from './context'

const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: unknown[]): void }>()
const t = useUiT()
const itemSchema = computed(() => props.ctx.schema.items || {})
const items = computed<unknown[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
const canAdd = computed(() => props.ctx.schema.maxItems === undefined || items.value.length < props.ctx.schema.maxItems)

// Stable keys per item, so removing or moving one keeps the others' state.
let keySeq = 0
const itemKeys = ref<number[]>([])
watch(
  () => items.value.length,
  (n) => {
    const k = itemKeys.value.slice(0, n)
    while (k.length < n) k.push(++keySeq)
    itemKeys.value = k
  },
  { immediate: true }
)

function itemTitle(i: number): string {
  const tpl = props.ctx.options.itemTitle
  return tpl === undefined ? t('ui.item', { n: i + 1 }) : localizedText(tpl, props.ctx.locale).replace('{n}', String(i + 1))
}

/** Emits the edited list; `keys` (same edit applied to the item keys) keeps item state. */
function commit(list: unknown[], keys = itemKeys.value) {
  itemKeys.value = keys
  emit('update:modelValue', list)
}
function add() {
  const item = fillDefaults(itemSchema.value, schemaType(itemSchema.value) === 'object' ? {} : undefined)
  commit([...items.value, item], [...itemKeys.value, ++keySeq])
}
function setItem(i: number, v: unknown) {
  commit(items.value.map((x, j) => (j === i ? v : x)))
}
function remove(i: number) {
  commit(
    items.value.filter((_, j) => j !== i),
    itemKeys.value.filter((_, j) => j !== i)
  )
}
function move(i: number, j: number) {
  const swap = <T,>(list: T[]) => list.map((x, k) => (k === i ? list[j] : k === j ? list[i] : x))
  commit(swap(items.value), swap(itemKeys.value))
}
</script>

<template>
  <div class="w-full space-y-3">
    <div v-for="(item, i) in items" :key="itemKeys[i]" class="rounded-xl border border-gray-200 p-3 dark:border-dark-700" data-testid="schema-list-item">
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-fg-muted">{{ itemTitle(i) }}</span>
        <div v-if="!ctx.locked" class="flex items-center gap-0.5">
          <SButton variant="ghost" size="sm" square :aria-label="t('ui.moveUp')" :title="t('ui.moveUp')" :disabled="i === 0" @click="move(i, i - 1)">
            <SIcon name="chevron-down" class="h-3.5 w-3.5 rotate-180" />
          </SButton>
          <SButton variant="ghost" size="sm" icon="chevron-down" icon-only :aria-label="t('ui.moveDown')" :title="t('ui.moveDown')" :disabled="i === items.length - 1" @click="move(i, i + 1)" />
          <SButton variant="ghost" size="sm" icon="x" icon-only tone="danger" :aria-label="t('ui.removeItem', { name: itemTitle(i) })" :title="t('ui.remove')" @click="remove(i)" />
        </div>
      </div>
      <SchemaField
        :name="String(i)"
        :path="`${ctx.path}.${i}`"
        :schema="itemSchema"
        :ui="childUI(ctx.ui, 'items')"
        :model-value="item"
        :root="ctx.root"
        :errors="ctx.errors"
        :disabled="ctx.disabled"
        :widgets="ctx.widgets"
        bare
        @update:model-value="setItem(i, $event)"
      />
    </div>
    <SButton v-if="!ctx.locked" size="sm" icon="plus" :disabled="!canAdd" @click="add">{{ t('ui.add') }}</SButton>
  </div>
</template>
