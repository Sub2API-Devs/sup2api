<script setup lang="ts">
import { computed, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SBadge, SButton, SCheckbox, SHint, SModal, STagInput } from '@sub2api/ui'
import { joinList } from './format'
import { errorDetails, setFlowGroups, toastError, useModHost } from './host'
import type { Flow, Group, GroupConflict } from './types'
import type { GroupOwner } from './flowOps'

// Bound groups of one flow, edited in a dialog from the cell (new-api
// flow-groups-cell.tsx; PUT /flows/:id/groups). A group bound to another flow answers 409
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

const labels = computed(() => props.flow.groups.map(props.groupLabel))

function hint(id: number): string {
  const owner = props.owners.get(id)
  if (!owner) return t('flows.groupUnmoderated')
  return owner.flowId === props.flow.id ? '' : t('flows.groupBoundTo', { name: owner.flowName })
}

function show() {
  selected.value = [...props.flow.groups]
  idText.value = props.flow.groups.map(String)
  conflicts.value = null
  open.value = true
}

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
    open.value = false
    emit('saved')
  } catch (e) {
    if (isApiError(e) && e.code === 'group_conflict' && !force) {
      const found = errorDetails(e, 'conflicts')
      if (found.length) {
        conflicts.value = found
        return
      }
    }
    toastError(e)
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
    <span v-if="flow.groups.length" class="mod-groups-list" :title="joinList(labels)">
      <SBadge v-for="(g, i) in labels" :key="flow.groups[i]">{{ g }}</SBadge>
    </span>
    <SBadge v-else tone="warning">{{ t('flows.noGroups') }}</SBadge>
    <span v-if="canWrite" class="mod-inline">
      <SButton size="xs" variant="ghost" icon="edit" icon-only :aria-label="t('flows.editGroups', { name: flow.name })" :title="t('flows.editGroups', { name: flow.name })" @click="show" />
    </span>

    <SModal v-model:open="open" :title="t('flows.editGroups', { name: flow.name })" width="sm">
      <div class="mod-form">
        <SHint size="xs">{{ t('flows.groupsPopoverHint') }}</SHint>
        <ul v-if="allGroups.length" class="mod-groups-pick">
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
      </div>
      <template #footer>
        <SButton @click="open = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving && !conflicts" @click="save(false)">{{ t('save') }}</SButton>
      </template>
    </SModal>

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
