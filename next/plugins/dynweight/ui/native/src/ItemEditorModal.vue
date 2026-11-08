<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { SAlert, SButton, SIcon, SInput, SModal, SSegmented, SStatusDot, SSwitch } from '@sub2api/ui'
import ItemCard from './ItemCard.vue'
import ItemsJsonPanel from './ItemsJsonPanel.vue'
import { copyNamer, describeDraft, describeProblem, describeReason, describeStored, partsSentence } from './describe'
import {
  directionOf,
  duplicateEntry,
  entryCanEnable,
  entryEnabled,
  entryName,
  MAX_ITEMS,
  MAX_NAME,
  moveEntry,
  newDraft,
  newEntry,
  readItems,
  removeEntry,
  toggleEntry,
  uniqueItemName,
  validateDraft,
  validateLists,
  writeItems,
  type ItemEntry,
  type Written
} from './items'
import { clone, directionTone, enumOptions, useDwHost, type Rule, type Strategy } from './host'

// The items editor (new-api's layout): the items on the left (search, a dot
// for the direction, a red dot for errors), the selected one on the right,
// and the two lists as JSON behind the Visual / JSON switch. It works on its
// own copy: Apply writes the items back (writeItems) and hands both lists to
// the page, which saves them with the rest of the configuration; Cancel
// drops the copy. Apply and the way back from JSON are blocked while
// anything would be refused by the plugin. The table names the rules that
// left (Written.dropped), including those a switch to JSON wrote away.
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ rules: Rule[]; strategies: Strategy[]; index: number; append: boolean; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'apply', value: Written): void }>()
const host = useDwHost()
const t = host.t

interface Row {
  id: number
  entry: ItemEntry
}
let seq = 0
const rows = ref<Row[]>([])
// The rules the items were read from: what an unchanged item writes back.
const base = ref<Rule[]>([])
const selectedId = ref(0)
const search = ref('')
const mode = ref<'visual' | 'json'>('visual')
const modeOptions = computed(() => enumOptions('editMode', ['visual', 'json']))
const json = ref<{ rules: Rule[]; strategies: Strategy[] }>({ rules: [], strategies: [] })
const jsonInvalid = ref(false)
// Rules a switch to JSON wrote away: they left the lists Apply writes against.
let dropped: string[] = []

const entries = computed(() => rows.value.map(r => r.entry))
const selectedIndex = computed(() => rows.value.findIndex(r => r.id === selectedId.value))
const selected = computed(() => rows.value[selectedIndex.value]?.entry ?? null)

function load(rules: Rule[], strategies: Strategy[], select: number) {
  base.value = clone(rules)
  rows.value = readItems(base.value, clone(strategies)).map(entry => ({ id: ++seq, entry }))
  selectedId.value = rows.value[Math.min(select, rows.value.length - 1)]?.id ?? 0
}

watch(open, now => {
  if (!now) return
  mode.value = 'visual'
  search.value = ''
  dropped = []
  load(props.rules, props.strategies, props.index)
  if (props.append) add()
})

// The selected item stays in view (the list is a sideways strip on phones).
const nav = ref<HTMLElement>()
watch(selectedId, () => nextTick(() => nav.value?.querySelector('.is-on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })))

const problems = computed(() => rows.value.map(r => (r.entry.draft ? validateDraft(r.entry.draft, entries.value) : [])))
const partsOf = (e: ItemEntry) => (e.draft ? describeDraft(e.draft, t) : describeStored(e.strategy, t))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value
    .map((row, i) => ({ row, i, direction: directionOf(row.entry.draft ? row.entry.draft.actions : row.entry.strategy.actions) }))
    .filter(({ row }) => !q || `${entryName(row.entry)} ${partsSentence(partsOf(row.entry), t)}`.toLowerCase().includes(q))
})

/** Takes the result of a list operation, keeping the ids of the entries it kept. */
function setEntries(next: ItemEntry[], select: number) {
  const ids = new Map(rows.value.map(r => [r.entry, r.id]))
  rows.value = next.map(entry => ({ id: ids.get(entry) ?? ++seq, entry }))
  selectedId.value = rows.value[Math.max(0, Math.min(select, rows.value.length - 1))]?.id ?? 0
}

function add() {
  if (rows.value.length >= MAX_ITEMS) return host.toast(t('it.max', { n: MAX_ITEMS }), 'warning')
  const name = uniqueItemName(entries.value, n => t('it.newName', { n }))
  setEntries([...entries.value, newEntry(newDraft(name))], rows.value.length)
}

const copyName = copyNamer(t)
const i = () => selectedIndex.value
const duplicate = () => setEntries(duplicateEntry(entries.value, i(), copyName), i() + 1)
const move = (by: -1 | 1) => setEntries(moveEntry(entries.value, i(), by), i() + by)
const remove = () => setEntries(removeEntry(entries.value, i()), i())
function setEnabled(on: boolean) {
  const e = selected.value
  if (e?.draft) e.draft.enabled = on
  else setEntries(toggleEntry(entries.value, i(), on), i())
}

function toJson() {
  const written = writeItems(entries.value, base.value)
  dropped = [...dropped, ...written.dropped]
  json.value = { rules: written.rules, strategies: written.strategies }
  mode.value = 'json'
}

// Valid JSON becomes the items (and the rules they write back against).
watch(
  json,
  now => {
    if (mode.value === 'json') load(now.rules, now.strategies, Math.max(0, selectedIndex.value))
  },
  { deep: true }
)

function setMode(next: 'visual' | 'json') {
  if (next === mode.value) return
  if (next === 'json') return toJson()
  if (jsonInvalid.value) return host.toast(t('it.editor.jsonInvalid'), 'error')
  mode.value = 'visual'
}

function apply() {
  if (mode.value === 'json' && jsonInvalid.value) return host.toast(t('it.editor.jsonInvalid'), 'error')
  const bad = problems.value.findIndex(p => p.length)
  if (bad >= 0) {
    selectedId.value = rows.value[bad].id
    mode.value = 'visual'
    return host.toast(t('it.editor.invalid', { where: entryName(rows.value[bad].entry) || `#${bad + 1}` }), 'error')
  }
  const written = writeItems(entries.value, base.value)
  // A read-only item brings its references over as they are: the lists get the plugin's checks once more.
  const [first] = validateLists(written.rules, written.strategies)
  if (first) return host.toast(describeProblem(first, t), 'error')
  emit('apply', { ...written, dropped: [...dropped, ...written.dropped] })
  open.value = false
}
</script>

<template>
  <SModal v-model:open="open" width="xl" persistent>
    <template #header>
      <div class="dw-it-modal-h">
        <div class="dw-it-modal-t">
          <h3>{{ t(readonly ? 'it.editor.viewTitle' : 'it.editor.title') }}</h3>
          <p>{{ t('it.editor.hint') }}</p>
        </div>
        <SSegmented :model-value="mode" size="sm" :options="modeOptions" @update:model-value="setMode($event as 'visual' | 'json')" />
      </div>
    </template>

    <fieldset v-if="mode === 'json'" class="dw-fieldset" :disabled="readonly">
      <ItemsJsonPanel v-model="json" v-model:invalid="jsonInvalid" :rows="16" />
    </fieldset>
    <div v-else class="dw-it-editor">
      <nav ref="nav" class="dw-it-nav" :aria-label="t('it.editor.list')">
        <SInput
          v-model="search"
          class="dw-it-search"
          size="sm"
          icon="search"
          :placeholder="t('it.editor.search')"
          :aria-label="t('it.editor.search')"
        />
        <div class="dw-it-nav-list">
          <button
            v-for="{ row, i: n, direction } in filtered"
            :key="row.id"
            type="button"
            class="dw-it-nav-item"
            :class="{ 'is-on': row.id === selectedId, 'is-off': !entryEnabled(row.entry) }"
            :aria-current="row.id === selectedId || undefined"
            @click="selectedId = row.id"
          >
            <span class="dw-it-nav-n">{{ n + 1 }}</span>
            <SStatusDot :tone="directionTone[direction ?? 'clear']" size="xs" />
            <span class="dw-it-nav-name">{{ entryName(row.entry) || t('it.unnamed') }}</span>
            <SIcon v-if="!row.entry.draft" name="lock" class="dw-it-nav-lock" />
            <SStatusDot
              v-if="problems[n].length"
              :tone="directionTone.error"
              size="xs"
              :label="t('it.hasErrors')"
              sr-only
              :title="t('it.editor.itemInvalid')"
            />
          </button>
          <p v-if="!filtered.length" class="dw-it-muted dw-it-nav-empty">{{ rows.length ? t('it.editor.noMatch') : t('it.empty') }}</p>
        </div>
        <SButton
          v-if="!readonly"
          class="dw-it-nav-add"
          size="xs"
          variant="ghost"
          icon="plus"
          :disabled="rows.length >= MAX_ITEMS"
          @click="add"
          >{{ t('it.add') }}</SButton
        >
      </nav>

      <fieldset v-if="selected" :key="selectedId" class="dw-fieldset dw-it-pane" :disabled="readonly">
        <div class="dw-it-head">
          <SInput
            v-if="selected.draft"
            v-model="selected.draft.name"
            class="dw-it-head-name"
            size="sm"
            :maxlength="MAX_NAME"
            :aria-label="t('it.card.name')"
            :error="problems[selectedIndex].some(p => p.path === 'name')"
          />
          <strong v-else class="dw-it-head-name">{{ entryName(selected) }}</strong>
          <SSwitch
            :model-value="entryEnabled(selected)"
            size="sm"
            :label="t('enabled')"
            :disabled="!entryEnabled(selected) && !entryCanEnable(selected, base)"
            :title="!entryEnabled(selected) && !entryCanEnable(selected, base) ? t('it.cantEnable') : undefined"
            @update:model-value="setEnabled"
          />
          <span class="dw-it-head-actions">
            <SButton
              class="dw-up"
              size="xs"
              variant="ghost"
              icon="chevron-down"
              icon-only
              :aria-label="t('it.up')"
              :title="t('it.up')"
              :disabled="selectedIndex === 0"
              @click="move(-1)"
            />
            <SButton
              size="xs"
              variant="ghost"
              icon="chevron-down"
              icon-only
              :aria-label="t('it.down')"
              :title="t('it.down')"
              :disabled="selectedIndex >= rows.length - 1"
              @click="move(1)"
            />
            <SButton
              size="xs"
              variant="ghost"
              icon="copy"
              icon-only
              :aria-label="t('it.duplicate')"
              :title="t('it.duplicate')"
              :disabled="rows.length >= MAX_ITEMS"
              @click="duplicate"
            />
            <SButton
              size="xs"
              variant="ghost"
              tone="danger"
              icon="trash"
              icon-only
              :aria-label="t('it.remove')"
              :title="t('it.remove')"
              @click="remove"
            />
          </span>
        </div>
        <ItemCard v-if="selected.draft" v-model="selected.draft" :problems="problems[selectedIndex]" />
        <div v-else class="dw-it-card">
          <SAlert tone="info">{{ describeReason(selected.reason!, t) }}</SAlert>
          <p class="dw-it-note">{{ t('it.editor.readonlyHint') }}</p>
          <p class="dw-it-preview">{{ partsSentence(describeStored(selected.strategy, t), t) }}</p>
          <div>
            <SButton size="sm" icon="code" @click="setMode('json')">{{ t('it.editor.openJson') }}</SButton>
          </div>
        </div>
      </fieldset>
      <p v-else class="dw-it-muted dw-it-pane dw-it-nav-empty">{{ rows.length ? t('it.editor.pick') : t('it.empty') }}</p>
    </div>

    <template #footer>
      <span v-if="!readonly" class="dw-it-muted dw-it-modal-f">{{ t('it.editor.applyHint') }}</span>
      <SButton @click="open = false">{{ t(readonly ? 'it.editor.close' : 'cancel') }}</SButton>
      <SButton v-if="!readonly" variant="primary" @click="apply">{{ t('it.editor.apply') }}</SButton>
    </template>
  </SModal>
</template>
