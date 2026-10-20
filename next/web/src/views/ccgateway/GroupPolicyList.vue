<script setup lang="ts">
// Groups with their own CC feature policy. Only configured groups are listed;
// every other group inherits the global defaults, so adding one is the explicit
// step that creates its entry and removing it deletes the entry again. Edits
// are drafts of the settings form and go out with its single save.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SDropdown, SHint, STable, confirm, type MenuAction, type TableColumn } from '@sub2api/ui'
import GroupPolicyDrawer from './GroupPolicyDrawer.vue'
import { featureDifferenceCount, mergeFeaturePolicy, normalizeRequestPolicy, type FeatureGroup, type RequestPolicy } from './requestPolicy'
const policies = defineModel<Record<string, FeatureGroup>>({ required: true })
const props = defineProps<{
  global: RequestPolicy
  /** The latest saved configuration, read after a revision conflict for review. */
  latest?: { request_policy?: Partial<RequestPolicy>; cc_feature_groups?: Record<string, FeatureGroup> } | null
  /** The saved group policies: removing one whose overrides differ asks first. */
  saved: Record<string, FeatureGroup>
  disabled?: boolean
}>()
const { t } = useI18n()
const groups = ref<Array<{ id: number; name: string }>>([])
const failed = ref(false)
const editing = ref<string | null>(null)

async function loadGroups() {
  failed.value = false
  try {
    const all: Array<{ id: number; name: string }> = []
    for (let page = 1; ; page++) {
      const result = await api.list<{ id: number; name: string }>('/groups', { page, page_size: 200 })
      all.push(...result.items)
      if (!result.paged || !result.items.length || all.length >= result.page.total) break
    }
    groups.value = all
  } catch { failed.value = true }
}
onMounted(loadGroups)

const nameOf = (id: string) => groups.value.find(g => String(g.id) === id)?.name ?? `#${id}`
const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('ccgateway.layers.group') },
  { key: 'enabled', label: t('common.status'), nowrap: true },
  { key: 'differences', label: t('ccgateway.layers.diffColumn'), nowrap: true },
  { key: 'account', label: t('ccgateway.layers.accountColumn'), nowrap: true },
  { key: 'actions', label: t('common.actions'), align: 'right' }
])
const rows = computed(() => Object.entries(policies.value)
  .map(([id, group]) => ({ id, name: nameOf(id), ...group, differences: featureDifferenceCount(props.global, group.overrides) }))
  .sort((a, b) => a.name.localeCompare(b.name)))
const addable = computed<MenuAction[]>(() => groups.value
  .filter(g => !policies.value[String(g.id)])
  .map(g => ({ key: String(g.id), label: g.name })))

function update(id: string, group: FeatureGroup) {
  policies.value = { ...policies.value, [id]: group }
}
function add(id: string) {
  update(id, { enabled: true, allow_account_override: true, overrides: {} })
  editing.value = id
}
async function remove(id: string) {
  const unsaved = JSON.stringify(policies.value[id]!.overrides) !== JSON.stringify(props.saved[id]?.overrides ?? {})
  if (unsaved && !await confirm({ title: t('ccgateway.layers.removeGroup'), message: t('ccgateway.layers.removeGroupConfirm'), confirmText: t('ccgateway.layers.removeGroup'), danger: true })) return
  const next = { ...policies.value }
  delete next[id]
  policies.value = next
  if (editing.value === id) editing.value = null
}
// The saved state of the group being edited, merged as it applies, for review.
const latestPolicy = computed(() => {
  if (!props.latest || editing.value == null) return null
  const global = normalizeRequestPolicy(props.latest.request_policy)
  const group = props.latest.cc_feature_groups?.[editing.value]
  return group?.enabled ? mergeFeaturePolicy(global, group.overrides) : global
})
</script>
<template>
  <div
    class="space-y-3"
    data-testid="feature-groups"
  >
    <SAlert
      v-if="failed"
      tone="danger"
      dense
    >
      {{ t('ccgateway.layers.previewFailed') }} <SButton
        size="sm"
        @click="loadGroups"
      >
        {{ t('ccgateway.layers.retry') }}
      </SButton>
    </SAlert>
    <STable
      :columns="columns"
      :rows="rows"
      dense
      card
      :row-attrs="row => ({ 'data-testid': 'group-policy-' + row.id })"
    >
      <template #toolbar>
        <SHint
          size="xs"
          class="min-w-0 flex-1"
        >
          {{ t('ccgateway.layers.groupOptional') }}
        </SHint>
        <SDropdown
          :actions="addable"
          :label="t('ccgateway.layers.addGroup')"
          :disabled="disabled || !addable.length"
          width="14rem"
          max-height="18rem"
          data-testid="group-add"
          @select="add"
        />
      </template>
      <template #empty>
        <SHint size="xs">
          {{ t('ccgateway.layers.noGroupPolicies') }}
        </SHint>
      </template>
      <template #cell-enabled="{ row }">
        <SBadge
          :tone="row.enabled ? 'success' : 'gray'"
          size="xs"
        >
          {{ t(row.enabled ? 'common.enabled' : 'common.disabled') }}
        </SBadge>
      </template>
      <template #cell-differences="{ row }">
        <span :class="row.differences ? 'text-fg' : 'text-fg-muted'">
          {{ row.differences ? t('ccgateway.layers.differences', { n: row.differences }) : t('ccgateway.layers.sameAsGlobal') }}
        </span>
      </template>
      <template #cell-account="{ row }">
        {{ row.enabled ? t(row.allow_account_override ? 'common.yes' : 'common.no') : '—' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1">
          <SButton
            size="sm"
            variant="ghost"
            data-testid="group-configure"
            @click="editing = row.id"
          >
            {{ t('ccgateway.layers.configureGroup') }}
          </SButton>
          <SButton
            size="sm"
            variant="ghost"
            :disabled="disabled"
            data-testid="group-remove"
            @click="remove(row.id)"
          >
            {{ t('ccgateway.layers.removeGroup') }}
          </SButton>
        </div>
      </template>
    </STable>
    <GroupPolicyDrawer
      v-if="editing != null && policies[editing]"
      :open="true"
      :group="policies[editing]"
      :title="nameOf(editing)"
      :global="global"
      :latest="latestPolicy"
      :disabled="disabled"
      @update:open="editing = null"
      @update:group="update(editing!, $event)"
    />
  </div>
</template>
