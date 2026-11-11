<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SCheckbox, SHint, SModal, STagInput } from '@sub2api/ui'
import { errorDetails, setFlowGroups, toastError, useModHost } from './host'
import type { Flow, Group, GroupConflict } from './types'
import { flowBindingsInactive, type GroupOwner } from './bindingOps'

// Bound groups of one flow, edited from the flow list's row action (new-api
// flow-groups-cell.tsx; PUT /flows/:id/groups). A group bound to another flow
// answers 409 group_conflict; after confirmation the request is sent again
// with force = true. Saving takes effect at once and creates no version. The
// bindings of a disabled or unpublished flow do not apply (0.8.0): the dialog
// says so.
const props = defineProps<{
  open: boolean
  flow: Flow | null
  /** every group of the console incl. the default (0); [] when not readable */
  allGroups: Group[]
  owners: ReadonlyMap<number, GroupOwner>
  groupLabel: (id: number) => string
}>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const host = useModHost()
const t = host.t

const selected = ref<number[]>([])
const idText = ref<string[]>([])
const saving = ref(false)
const conflicts = ref<GroupConflict[] | null>(null)

const name = computed(() => props.flow?.name ?? '')
const inactive = computed(() => !!props.flow && flowBindingsInactive(props.flow))

watch(
  () => [props.open, props.flow] as const,
  ([open, f]) => {
    if (!open || !f) return
    selected.value = [...f.groups]
    idText.value = f.groups.map(String)
    conflicts.value = null
  },
  { immediate: true }
)

function hint(id: number): string {
  const owner = props.owners.get(id)
  if (!owner) return t('flows.groupUnmoderated')
  return owner.flowId === props.flow?.id ? '' : t('flows.groupBoundTo', { name: owner.flowName })
}

function toggle(id: number, on: boolean) {
  const list = selected.value.filter((x) => x !== id)
  selected.value = on ? [...list, id] : list
}

const wanted = () => (props.allGroups.length ? selected.value : idText.value.map(Number).filter((n) => Number.isInteger(n) && n >= 0))

async function save(force: boolean) {
  if (!props.flow) return
  saving.value = true
  try {
    await setFlowGroups(props.flow.id, wanted(), force)
    host.toast(t('flows.groupsSaved'), 'success')
    conflicts.value = null
    emit('update:open', false)
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
  (conflicts.value || []).map((c) =>
    t('flows.moveItem', { group: props.groupLabel(c.group_id), flow: c.flow_id ? (props.owners.get(c.group_id)?.flowName ?? `#${c.flow_id}`) : t('bindings.exempt') })
  )
)
</script>

<template>
  <SModal :open="open" :title="t('flows.editGroups', { name })" width="sm" @update:open="emit('update:open', $event)">
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
      <p v-if="!wanted().length" class="mod-text-warning">{{ flow?.accounts?.length ? t('flows.accountsOnly', { n: flow.accounts.length }) : t('flows.noGroupsWarn') }}</p>
      <p v-if="inactive" class="mod-text-warning">{{ t('flows.bindingsInactiveHint') }}</p>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton variant="primary" :loading="saving && !conflicts" @click="save(false)">{{ t('save') }}</SButton>
    </template>
  </SModal>

  <SModal :open="!!conflicts" :title="t('flows.moveTitle', { name })" width="md" top @update:open="!$event && (conflicts = null)">
    <p>{{ t('flows.moveDesc', { name }) }}</p>
    <ul class="mod-move-list">
      <li v-for="l in conflictLines" :key="l">{{ l }}</li>
    </ul>
    <template #footer>
      <SButton @click="conflicts = null">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton variant="primary" :loading="saving" @click="save(true)">{{ t('flows.move') }}</SButton>
    </template>
  </SModal>
</template>
