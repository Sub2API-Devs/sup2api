<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SBadge, SButton, SCheckbox, SHint, SModal, STagInput } from '@sub2api/ui'
import { errorMessage, setFlowGroups, useModHost, type Flow, type Group, type GroupConflict } from './host'
import type { GroupOwner } from './flowOps'

// Bound groups of one flow, edited in place (new-api flow-groups-cell.tsx;
// PUT /flows/:id/groups). A group bound to another flow answers 409
// group_conflict; after confirmation the request is sent again with
// force = true. Saving takes effect at once and creates no version.
const props = defineProps<{
  flow: Flow
  /** every group of the console incl. the default (0); [] when not readable */
  allGroups: Group[]
  owners: ReadonlyMap<number, GroupOwner>
  canWrite: boolean
  groupLabel: (id: number) => string
}>()
const emit = defineEmits<{ (e: 'saved'): void }>()
const host = useModHost()
const t = host.t

const open = ref(false)
const selected = ref<number[]>([])
const idText = ref<string[]>([])
const saving = ref(false)
const conflicts = ref<GroupConflict[] | null>(null)
const trigger = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const pos = ref({ top: 0, left: 0 })

const labels = computed(() => props.flow.groups.map(props.groupLabel))

function hint(id: number): string {
  const owner = props.owners.get(id)
  if (!owner) return t('flows.groupUnmoderated')
  return owner.flowId === props.flow.id ? '' : t('flows.groupBoundTo', { name: owner.flowName })
}

function place() {
  const r = trigger.value?.getBoundingClientRect()
  if (!r) return
  const width = 320
  pos.value = { top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) }
}

function onDoc(e: MouseEvent) {
  const el = e.target as Node
  if (trigger.value?.contains(el) || panel.value?.contains(el) || conflicts.value) return
  close()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !conflicts.value) close()
}

function show() {
  selected.value = [...props.flow.groups]
  idText.value = props.flow.groups.map(String)
  place()
  open.value = true
  document.addEventListener('mousedown', onDoc)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
  nextTick(() => panel.value?.querySelector<HTMLElement>('input')?.focus())
}
function close() {
  open.value = false
  document.removeEventListener('mousedown', onDoc)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
}
onBeforeUnmount(close)

function toggle(id: number, on: boolean) {
  const list = selected.value.filter((x) => x !== id)
  selected.value = on ? [...list, id] : list
}

const wanted = () => (props.allGroups.length ? selected.value : idText.value.map(Number).filter((n) => Number.isInteger(n) && n >= 0))

async function save(force: boolean) {
  saving.value = true
  try {
    await setFlowGroups(props.flow.id, wanted(), force)
    host.toast(t('flows.groupsSaved'), 'success')
    conflicts.value = null
    close()
    emit('saved')
  } catch (e) {
    if (isApiError(e) && e.code === 'group_conflict' && !force) {
      conflicts.value = (e.details?.conflicts || []) as GroupConflict[]
      if (conflicts.value.length) return
      conflicts.value = null
    }
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

const conflictLines = computed(() =>
  (conflicts.value || []).map((c) => t('flows.moveItem', { group: props.groupLabel(c.group_id), flow: props.owners.get(c.group_id)?.flowName ?? `#${c.flow_id}` }))
)
</script>

<template>
  <span class="mod-groups-cell">
    <span v-if="flow.groups.length" class="mod-groups-list" :title="labels.join('、')">
      <SBadge v-for="(g, i) in labels" :key="flow.groups[i]">{{ g }}</SBadge>
    </span>
    <SBadge v-else tone="warning">{{ t('flows.noGroups') }}</SBadge>
    <span v-if="canWrite" ref="trigger" class="mod-inline">
      <SButton size="xs" variant="ghost" icon="edit" icon-only :aria-label="t('flows.editGroups', { name: flow.name })" :title="t('flows.editGroups', { name: flow.name })" @click="open ? close() : show()" />
    </span>

    <Teleport to="body">
      <div v-if="open" ref="panel" class="mod-popover" role="dialog" :aria-label="t('flows.editGroups', { name: flow.name })" :style="{ top: `${pos.top}px`, left: `${pos.left}px` }">
        <SHint size="xs">{{ t('flows.groupsPopoverHint') }}</SHint>
        <ul v-if="allGroups.length" class="mod-popover-list">
          <li v-for="g in allGroups" :key="g.id">
            <SCheckbox :model-value="selected.includes(g.id)" :label="g.name" @update:model-value="toggle(g.id, $event)" />
            <span v-if="hint(g.id)" class="mod-sub" :class="{ 'mod-text-warning': !owners.get(g.id) }">{{ hint(g.id) }}</span>
          </li>
        </ul>
        <template v-else>
          <SHint size="xs">{{ t('flows.groupIdsHint') }}</SHint>
          <STagInput v-model="idText" placeholder="0" :aria-label="t('flows.col.groups')" />
        </template>
        <p v-if="!wanted().length" class="mod-text-warning">{{ t('flows.noGroupsWarn') }}</p>
        <div class="mod-popover-actions">
          <SButton size="sm" @click="close">{{ host.i18n.t('ui.cancel') }}</SButton>
          <SButton size="sm" variant="primary" :loading="saving && !conflicts" @click="save(false)">{{ t('save') }}</SButton>
        </div>
      </div>
    </Teleport>

    <SModal :open="!!conflicts" :title="t('flows.moveTitle', { name: flow.name })" width="md" top @update:open="!$event && (conflicts = null)">
      <p>{{ t('flows.moveDesc', { name: flow.name }) }}</p>
      <ul class="mod-move-list">
        <li v-for="l in conflictLines" :key="l">{{ l }}</li>
      </ul>
      <template #footer>
        <SButton @click="conflicts = null">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save(true)">{{ t('flows.move') }}</SButton>
      </template>
    </SModal>
  </span>
</template>
