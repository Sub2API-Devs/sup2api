<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAlert, SBadge, SButton, SDropdown, SIcon, SRowAction, SSwitch, STable, type MenuAction, type TableColumn } from '@sub2api/ui'
import ItemEditorModal from './ItemEditorModal.vue'
import { copyNamer, describeDraft, describeReason, describeStored, nameList } from './describe'
import {
  duplicateEntry,
  entryCanEnable,
  entryEnabled,
  entryName,
  MAX_ITEMS,
  moveEntry,
  readItems,
  removeEntry,
  staleItems,
  toggleEntry,
  writeItems,
  type ItemEntry,
  type Written
} from './items'
import { clone, useDwHost, type Layer, type Rule, type Strategy } from './host'

// Adjustment items of a layer: one row per strategy with its trigger and
// actions as sentences, an inline switch, and edit / duplicate / move /
// delete. Every change is written back through writeItems (a rule nobody
// references any more leaves with its item, and a toast names it) and
// emitted as both lists; the page saves them. The editor opens on a row, or
// on a new item from "Add item".
const props = defineProps<{ rules: Rule[]; strategies: Strategy[]; defaults: Layer | null; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'change', value: { rules: Rule[]; strategies: Strategy[] }): void }>()
const host = useDwHost()
const t = host.t

const entries = computed(() => readItems(props.rules, props.strategies))
const rows = computed(() =>
  entries.value.map((entry, i) => ({
    key: i,
    entry,
    name: entryName(entry),
    enabled: entryEnabled(entry),
    canEnable: entryCanEnable(entry, props.rules),
    parts: entry.draft ? describeDraft(entry.draft, t) : describeStored(entry.strategy, t),
    reason: entry.reason ? describeReason(entry.reason, t) : ''
  }))
)
type Row = (typeof rows.value)[number]
const full = computed(() => props.strategies.length >= MAX_ITEMS)
const stale = computed(() => staleItems(props.rules, props.strategies))

const columns = computed<TableColumn[]>(() => [
  { key: 'index', label: t('it.col.index'), width: '2.5rem', mobile: 'hidden' },
  { key: 'name', label: t('it.col.name'), width: '8.5rem', mobile: 'title' },
  { key: 'kind', label: t('it.col.kind'), width: '6.5rem', mobile: 'subtitle' },
  { key: 'trigger', label: t('it.col.trigger'), mobile: 'meta', mobileSpan: 2 },
  { key: 'adjust', label: t('it.col.adjust'), class: 'dw-it-adjust', mobile: 'meta', mobileSpan: 2 },
  { key: 'enabled', label: t('it.col.enabled'), width: '4rem', mobile: 'status' },
  { key: 'actions', label: t('it.col.actions'), width: '5rem', align: 'right' }
])
const KIND_TONE = { weight_degrade: 'warning', weight_climb: 'success', affinity_clear: 'info' } as const

/** Emits written lists (from a row action or the editor), naming the rules that left with them. */
function emitWritten(written: Written) {
  if (written.dropped.length) host.toast(t('it.dropped', { names: nameList(written.dropped, t) }), 'info')
  emit('change', { rules: written.rules, strategies: written.strategies })
}
const commit = (next: ItemEntry[]) => emitWritten(writeItems(next, props.rules))

const copyName = copyNamer(t)

const menu = (i: number): MenuAction[] => [
  { key: 'duplicate', label: t('it.duplicate'), icon: 'copy', disabled: full.value },
  { key: 'up', label: t('it.up'), disabled: i === 0 },
  { key: 'down', label: t('it.down'), disabled: i >= rows.value.length - 1 },
  { key: 'remove', label: t('it.remove'), icon: 'trash', danger: true, divider: true }
]

async function onMenu(row: Row, key: string) {
  const i = row.key
  if (key === 'duplicate') commit(duplicateEntry(entries.value, i, copyName))
  else if (key === 'up' || key === 'down') commit(moveEntry(entries.value, i, key === 'up' ? -1 : 1))
  else if (
    await host.confirm({ message: t('it.removeConfirm', { name: row.name || t('it.unnamed') }), confirmText: t('it.remove'), danger: true })
  )
    commit(removeEntry(entries.value, i))
}

async function restore() {
  if (!props.defaults) return
  const n = props.defaults.strategies.length
  if (!(await host.confirm({ message: t('it.restoreConfirm', { n }), confirmText: t('it.restore') }))) return
  emit('change', { rules: clone(props.defaults.rules), strategies: clone(props.defaults.strategies) })
}

const editor = ref({ open: false, index: 0, append: false })
const edit = (index: number, append = false) => (editor.value = { open: true, index, append })
</script>

<template>
  <div class="dw-it-table">
    <div class="dw-it-bar">
      <span class="dw-it-bar-title"
        >{{ t('it.title') }} <SBadge size="xs">{{ strategies.length }}</SBadge></span
      >
      <span v-if="!readonly" class="dw-it-bar-actions">
        <SButton size="sm" variant="ghost" :disabled="!defaults" @click="restore">{{ t('it.restore') }}</SButton>
        <SButton
          size="sm"
          icon="plus"
          :disabled="full"
          :title="full ? t('it.max', { n: MAX_ITEMS }) : undefined"
          @click="edit(strategies.length, true)"
          >{{ t('it.add') }}</SButton
        >
      </span>
    </div>
    <SAlert v-if="stale.length" tone="warning" class="dw-it-alert">{{ t('it.stale', { names: nameList(stale, t) }) }}</SAlert>
    <STable
      :columns="columns"
      :rows="rows"
      row-key="key"
      dense
      :empty-text="t('it.empty')"
      :row-class="(r: Row) => (r.enabled ? '' : 'dw-it-off')"
    >
      <template #cell-index="{ row }">
        <span class="dw-num dw-it-muted">{{ row.key + 1 }}</span>
      </template>
      <template #cell-name="{ row }">
        <span class="dw-it-name">{{ row.name || t('it.unnamed') }}</span>
      </template>
      <template #cell-kind="{ row }">
        <span class="dw-chips">
          <SBadge v-for="ty in row.parts.types" :key="ty" size="xs" :tone="row.enabled ? KIND_TONE[ty] : 'gray'">{{
            t(`it.kind.${ty}`)
          }}</SBadge>
        </span>
      </template>
      <template #cell-trigger="{ row }">
        <div class="dw-it-sentence">
          <span v-if="row.reason" class="dw-it-lock" :title="row.reason"><SIcon name="lock" />{{ row.reason }}</span>
          <span>
            <SBadge v-if="row.parts.scope" size="xs" class="dw-it-scope">{{ row.parts.scope }}</SBadge>
            {{ row.parts.trigger }}
          </span>
          <span v-if="row.parts.windows" class="dw-it-muted">{{ row.parts.windows }}</span>
        </div>
      </template>
      <template #cell-adjust="{ row }">
        <div class="dw-it-sentence">
          <span v-for="(a, i) in row.parts.actions" :key="i">{{ a }}</span>
          <span v-if="row.parts.cooldown" class="dw-it-muted">{{ row.parts.cooldown }}</span>
        </div>
      </template>
      <template #cell-enabled="{ row }">
        <SSwitch
          :model-value="row.enabled"
          size="sm"
          :disabled="readonly || (!row.enabled && !row.canEnable)"
          :title="!row.enabled && !row.canEnable ? t('it.cantEnable') : undefined"
          :aria-label="t('it.enableItem', { name: row.name })"
          @update:model-value="commit(toggleEntry(entries, row.key, $event))"
        />
      </template>
      <template #cell-actions="{ row }">
        <span class="dw-it-row-actions">
          <SRowAction :icon="readonly ? 'eye' : 'edit'" :label="t(readonly ? 'it.view' : 'it.edit')" @click="edit(row.key)" />
          <SDropdown v-if="!readonly" :actions="menu(row.key)" :aria-label="t('it.more')" @select="onMenu(row, $event)" />
        </span>
      </template>
    </STable>
    <ItemEditorModal
      v-model:open="editor.open"
      :rules="rules"
      :strategies="strategies"
      :index="editor.index"
      :append="editor.append"
      :readonly="readonly"
      @apply="emitWritten"
    />
  </div>
</template>
