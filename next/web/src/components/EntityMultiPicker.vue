<script setup lang="ts">
// Picks several entities of a kind: the picked ones are chips ("name #id",
// "#id" while the name is unknown), followed by an EntityPicker that adds the
// one picked in it and lists only what is not picked yet. v-model:ids holds
// the ids as strings (a model's id is its name) in the order they were added;
// `change` follows every add and remove. `max` ends the adding, `disabled`
// leaves the chips alone. The other props are the EntityPicker's; a caller who
// may not look the kind up adds ids through its text box (Enter or leaving
// it). Also a host component for plugins (HOST_COMPONENT_NAMES).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip } from '@sub2api/ui'
import EntityPicker from './EntityPicker.vue'
import { ENTITIES, type EntityKind } from './entity/entities'
import { useEntityNames, type EntityItem } from './entity/lookup'

const props = withDefaults(
  defineProps<{
    kind: EntityKind
    ids?: string[]
    /** Of the picker that adds, also its accessible name; "Add <entity>" by default. */
    placeholder?: string
    size?: 'sm' | 'md'
    mine?: boolean
    scope?: Record<string, string | number | undefined>
    extra?: EntityItem[]
    disabled?: boolean
    /** No more can be added once this many are picked. */
    max?: number
  }>(),
  { ids: () => [], placeholder: undefined, size: undefined, scope: undefined, extra: () => [], max: undefined }
)
const emit = defineEmits<{ 'update:ids': [ids: string[]]; change: [ids: string[]] }>()
const { t } = useI18n()
const names = useEntityNames({ mine: () => props.mine, extra: () => props.extra })

const label = computed(() => props.placeholder ?? t('entity.add', { name: t(ENTITIES[props.kind].label) }))
const adds = computed(() => !props.disabled && (props.max === undefined || props.ids.length < props.max))

function set(ids: string[]) {
  emit('update:ids', ids)
  emit('change', ids)
}
/** The picker's id stays '', so a pick leaves it empty for the next one. */
function add(id: string) {
  if (id && !props.ids.includes(id)) set([...props.ids, id])
}
function remove(id: string) {
  set(props.ids.filter((picked) => picked !== id))
}
/**
 * Enter in the text box of a caller without the lookup adds the typed id: the
 * box takes its text on `change`, and a form around must not read the key as
 * "submit". The select answers its own Enter, and an empty box has nothing to add.
 */
function enter(e: KeyboardEvent) {
  const box = e.target as HTMLInputElement
  if (box.getAttribute('role') === 'combobox' || !box.value.trim()) return
  e.preventDefault()
  box.dispatchEvent(new Event('change'))
}
</script>

<template>
  <!-- A one-column grid asks its place for no width of its own (12rem at the
       least): the picker's text field and a long chip would otherwise widen
       a narrow form (a phone) past its edge. -->
  <div class="grid min-w-48 grid-cols-1">
    <div class="flex flex-wrap items-center gap-1.5">
      <SChip
        v-for="picked in ids"
        :key="picked"
        tone="primary"
        :closable="!disabled"
        :close-label="t('entity.remove', { name: names.label(kind, picked) })"
        @close="remove(picked)"
      >
        {{ names.label(kind, picked) }}
      </SChip>
      <EntityPicker
        v-if="adds"
        class="min-w-48 flex-1"
        :kind="kind"
        :placeholder="label"
        :size="size"
        :mine="mine"
        :scope="scope"
        :extra="extra"
        :exclude="ids"
        @update:id="add"
        @keydown.enter="enter"
      />
      <span v-else-if="!ids.length" class="text-sm text-fg-subtle">—</span>
    </div>
  </div>
</template>
