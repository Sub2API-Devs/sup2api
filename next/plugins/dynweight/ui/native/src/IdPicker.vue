<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { SSelect } from '@sub2api/ui'
import { searchAccounts, useCatalog } from './catalog'
import type { Named } from './host'

// A group or account picked by name, as its id in a string; '' is the
// `empty` option when given. Ids in `exclude` are not offered. Groups are
// filtered from the catalog, accounts searched on the core as typed. A typed
// id is offered as it is, and a selected id the catalog does not list shows
// as its name or "#id", so a picker without the catalog still takes ids.
const props = defineProps<{ kind: 'group' | 'account'; empty?: string; exclude?: string[] }>()
const id = defineModel<string>({ required: true })
const catalog = useCatalog()

const query = ref('')
const found = ref<Named[] | null>(null) // account search results, null = none yet
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

function search(q: string) {
  if (props.kind !== 'account') return
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const mine = ++seq
    const r = await searchAccounts(q)
    if (mine === seq) found.value = r
  }, 250)
}
onBeforeUnmount(() => clearTimeout(timer))

// SSelect hands its text input's native events through.
function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value.trim()
  search(query.value)
}
function onFocus() {
  query.value = ''
  if (!found.value) search('')
}

const isId = (v: string) => /^\d+$/.test(v) && Number(v) > 0
const nameOf = (v: string) => (props.kind === 'group' ? catalog.groupName(Number(v)) : catalog.accountName(Number(v)))
const items = computed(() => (props.kind === 'group' ? catalog.state.groups : (found.value ?? [])))
const options = computed(() => {
  const listed = new Set(items.value.map((x) => String(x.id)))
  const unlisted = (v: string) => isId(v) && !listed.has(v)
  return [
    ...(props.empty === undefined ? [] : [{ value: '', label: props.empty }]),
    ...items.value.map((x) => ({ value: String(x.id), label: `${x.name} #${x.id}` })),
    ...(unlisted(id.value) ? [{ value: id.value, label: nameOf(id.value) }] : []),
    ...(unlisted(query.value) && query.value !== id.value ? [{ value: query.value, label: `#${query.value}` }] : [])
  ].filter((o) => !props.exclude?.includes(o.value))
})
</script>

<template>
  <SSelect
    :model-value="id"
    :options="options"
    searchable
    @update:model-value="id = String($event ?? '')"
    @input="onInput"
    @focus="onFocus"
  />
</template>
