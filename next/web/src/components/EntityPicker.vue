<script setup lang="ts">
// Picks one entity (user, group, API key, account, model, proxy) by name or
// id: opening lists the first candidates of GET /lookup/{kind}, typing
// searches them after a pause. v-model:id is the picked id ('' = none; a
// model's id is its name). With v-model:text bound, typed text can also be
// kept as a "name contains" search; id and text exclude each other, and
// `change` follows every pick or clear with both.
// The first row answers Enter: "Name contains …" for text (when `text` is
// bound), for digits the entity with that id, or "Use ID #n" when the
// list has none (a deleted entity's history can still be searched). A model
// picked by id alone also takes a typed name the list does not have, as its
// last row (requests name models no price lists).
// Closed, it shows "name #id"; an id whose name is not known yet (from a
// link) is looked up, and stays "#id" when the lookup does not know it.
// `mine` lists the caller's own entities, `scope` passes the kind's lookup
// parameters ({ user_id } for api_key, { prefer_group_id } for account) and
// `extra` adds the page's own candidates. A caller who may not look the kind
// up (by permission, or the core answered 403 / 404) gets a text box: digits
// are an id, other text the name search. Also a host component for plugins
// (HOST_COMPONENT_NAMES). What a kind is comes from entity/entities.ts.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSelect, type SelectOption } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { ENTITIES, isEntityId, lookupPermissions, type EntityKind } from './entity/entities'
import { lookupEntities, lookupUnavailable, useEntityNames, type EntityItem, type LookupResult } from './entity/lookup'

const props = withDefaults(
  defineProps<{
    kind: EntityKind
    id?: string
    text?: string
    /** Also the accessible name; the entity's name by default. */
    placeholder?: string
    size?: 'sm' | 'md'
    mine?: boolean
    scope?: Record<string, string | number | undefined>
    extra?: EntityItem[]
    disabled?: boolean
  }>(),
  { id: '', text: undefined, placeholder: undefined, size: undefined, scope: undefined, extra: () => [] }
)
const emit = defineEmits<{ 'update:id': [id: string]; 'update:text': [text: string]; change: [value: { id: string; text: string }] }>()
const { t } = useI18n()
const auth = useAuthStore()
const names = useEntityNames({ mine: () => props.mine })
/** A scope parameter names an entity of another kind, whatever `mine` narrows this one to. */
const scopeNames = useEntityNames()

/** Pause after the last keystroke before the typed text is looked up. */
const SEARCH_DELAY_MS = 250
// Option values: an id or a name search, told apart by the first character.
const ID = '#'
const TEXT = '~'

const entity = computed(() => ENTITIES[props.kind])
const label = computed(() => props.placeholder ?? t(entity.value.label))
const searchesText = computed(() => props.text !== undefined)
const available = computed(() => auth.has(lookupPermissions(props.kind, props.mine)) && !lookupUnavailable(props.kind, props.mine))

function set(id: string, text: string) {
  emit('update:id', id)
  emit('update:text', text)
  emit('change', { id, text })
}

// ---- the list: the lookup's answer for the typed text

const query = ref('')
const found = ref<EntityItem[]>([])
const more = ref(false)
const loading = ref(false)
const failed = ref(false)
let turn = 0
let timer: ReturnType<typeof setTimeout> | undefined

/** SSelect asks on opening ('') and as the user types: the first rows at once, typed text after a pause. */
function search(text: string) {
  query.value = text.trim()
  clearTimeout(timer)
  const asked = ++turn
  loading.value = true
  timer = setTimeout(() => void load(asked), query.value ? SEARCH_DELAY_MS : 0)
}
/** Looks the query up; an answer that a later search overtook is dropped. */
async function load(asked: number) {
  let result: LookupResult | null = null
  try {
    result = await lookupEntities(props.kind, { q: query.value, mine: props.mine, scope: props.scope })
  } catch {
    // Shown as "could not load"; a refused lookup turns the picker into the text box.
  }
  if (asked !== turn) return
  found.value = result?.items ?? []
  more.value = !!result?.more
  failed.value = !result
  loading.value = false
}
onBeforeUnmount(() => clearTimeout(timer))

/** The page's own candidates matching the typed text, then the lookup's; one row an id, the lookup's when both know it. */
const candidates = computed<EntityItem[]>(() => {
  if (loading.value) return []
  const q = query.value.toLowerCase()
  const looked = new Map(found.value.map((item) => [String(item.id), item]))
  const own = props.extra.filter((item) => !q || String(item.id) === query.value || item.name.toLowerCase().includes(q))
  const ownIds = new Set(own.map((item) => String(item.id)))
  return [...own.map((item) => looked.get(String(item.id)) ?? item), ...found.value.filter((item) => !ownIds.has(String(item.id)))]
})

function row(item: EntityItem): SelectOption {
  const inactive = !!item.status && item.status !== 'active'
  return {
    value: ID + item.id,
    label: item.name,
    hint: entity.value.numeric ? `#${item.id}` : undefined,
    description: item.hint || undefined,
    muted: inactive,
    tag: inactive ? t('entity.inactive') : undefined
  }
}
/** Typed text that is an id as it stands: one of the page's own candidates, digits, or any text where the id is the name and names are not searched. */
function typedIsId(v: string): boolean {
  if (props.extra.some((item) => String(item.id) === v)) return true
  return entity.value.numeric ? isEntityId(v) : !searchesText.value
}
// The one place typed text is read: an id is the entity that has it, else the
// bare id; any text is a name search where `text` is bound.
const options = computed<SelectOption[]>(() => {
  const q = query.value
  const asId = !!q && typedIsId(q)
  const hit = asId ? candidates.value.find((item) => String(item.id) === q) : undefined
  const bare = asId && !hit
  const first: SelectOption[] = []
  const last: SelectOption[] = []
  if (hit) first.push(row(hit))
  // Offered while the search runs too, so digits + Enter never wait; only a settled list can say the id is not in it.
  else if (bare && entity.value.numeric) first.push({ value: ID + q, label: t('entity.byId', { id: q }), description: loading.value ? undefined : t('entity.byIdHint'), accent: true })
  // A typed name is more often part of a listed one: the matches keep Enter, and only a settled list offers the text as it stands.
  else if (bare && !loading.value) last.push({ value: ID + q, label: t('entity.asTyped', { text: q }), description: t('entity.asTypedHint'), accent: true })
  if (q && searchesText.value) first.push({ value: TEXT + q, label: t('entity.contains', { text: q }), description: t('entity.containsHint'), accent: true })
  return [...first, ...candidates.value.filter((item) => item !== hit).map(row), ...last]
})
const footer = computed(() => (more.value && !loading.value ? t('entity.more', { n: found.value.length }) : undefined))
/** What a scope parameter did to the list ("Only keys of a@x"), for the first one set. */
const note = computed(() => {
  for (const [param, target] of Object.entries(entity.value.scopes ?? {})) {
    const id = props.scope?.[param]
    if (id !== undefined && id !== '') return t(target.note, { name: scopeNames.name(target.kind, id) ?? `#${id}` })
  }
  return undefined
})

// ---- the value: an id or a name search

const value = computed(() => {
  if (props.id) return ID + props.id
  return props.text ? TEXT + props.text : null
})
const selected = computed<SelectOption | undefined>(() => {
  if (props.text && !props.id) return { value: value.value, label: t('entity.contains', { text: props.text }) }
  if (!props.id) return undefined
  const name = names.name(props.kind, props.id) ?? props.extra.find((item) => String(item.id) === props.id)?.name
  return { value: value.value, label: name ?? `#${props.id}`, hint: name && entity.value.numeric ? `#${props.id}` : undefined }
})
function pick(v: SelectOption['value']) {
  const picked = typeof v === 'string' ? v : ''
  set(picked.startsWith(ID) ? picked.slice(1) : '', picked.startsWith(TEXT) ? picked.slice(1) : '')
}

// ---- the text box of a caller who may not look the kind up

const box = ref('')
watch(
  () => props.id || props.text || '',
  (v) => (box.value = v),
  { immediate: true }
)
const boxPlaceholder = computed(() => {
  if (!entity.value.numeric) return label.value
  return searchesText.value ? t('entity.typeIdOrName', { name: label.value }) : t('entity.typeId', { name: label.value })
})
function typed(v: unknown) {
  const text = String(v ?? '').trim()
  box.value = text
  if (!text || typedIsId(text)) return set(text, '')
  if (searchesText.value) return set('', text)
  // Only an id is taken here: back to the one in effect.
  nextTick(() => (box.value = props.id))
}
</script>

<template>
  <SSelect
    v-if="available"
    :model-value="value"
    :options="options"
    :selected="selected"
    searchable
    remote
    clearable
    tinted
    :loading="loading"
    :icon="entity.icon"
    :placeholder="label"
    :aria-label="label"
    :size="size"
    :disabled="disabled"
    :note="note"
    :footer="footer"
    :no-results="failed ? t('entity.failed') : t('entity.none', { name: label })"
    @search="search"
    @update:model-value="pick"
  />
  <SInput
    v-else
    :model-value="box"
    :icon="entity.icon"
    :placeholder="boxPlaceholder"
    :aria-label="label"
    :inputmode="entity.numeric && !searchesText ? 'numeric' : undefined"
    :size="size"
    :disabled="disabled"
    clearable
    lazy
    @update:model-value="typed"
  />
</template>
