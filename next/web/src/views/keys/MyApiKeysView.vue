<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCode, SCopyButton, SEmpty, SIcon, SModal, SPageHeader, SPagination, SRowAction, SSwitch, STable, STooltip, toast, type TableColumn } from '@sub2api/ui'
import type { ApiKey, Group } from '@/api/types'
import { deleteWithConfirm } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { fetchMyGroups } from '@/composables/lookups'
import { usePlatforms } from '@/composables/platforms'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import StatusBadge from '@/components/StatusBadge.vue'
import TimeText from '@/components/TimeText.vue'
import ApiKeyCell from './ApiKeyCell.vue'
import KeyCcSwitchButton from './KeyCcSwitchButton.vue'
import KeyEditor from './KeyEditor.vue'
import KeyGroupCell from './KeyGroupCell.vue'
import KeyGroupSwitch from './KeyGroupSwitch.vue'
import KeyLimitsCell from './KeyLimitsCell.vue'
import KeyQuotaCell from './KeyQuotaCell.vue'
import KeyUsageCell from './KeyUsageCell.vue'
import KeyUsageDrawer from './KeyUsageDrawer.vue'
import KeyUseGuide from './KeyUseGuide.vue'
import { useKeyUsage } from './keyUsage'

const { t } = useI18n()
const list = useList<ApiKey>('/me/api-keys')
const platforms = usePlatforms()
platforms.load()
const canReadUsage = useAuthStore().has('usage:self:read')
const usage = useKeyUsage()
if (canReadUsage) usage.load()

const groups = ref<Group[]>([])
async function loadGroups() {
  try {
    groups.value = await fetchMyGroups()
  } catch (e) {
    notifyError(e)
  }
}
loadGroups()

const groupOf = (k: ApiKey) => groups.value.find((g) => g.id === k.group_id)

/** The key's group cell: name and platforms as reported on the key, else those of its group. */
function groupCell(k: ApiKey) {
  const g = groupOf(k)
  return { name: k.group_name || g?.name || `#${k.group_id}`, multiplier: g?.rate_multiplier, platforms: k.platforms ?? g?.platforms }
}
const groupOptions = computed(() =>
  groups.value.map((g) => ({ value: g.id, label: g.platforms?.length ? `${g.name} · ${g.platforms.map((p) => platforms.label(p)).join(', ')}` : g.name }))
)

const columns = computed(() =>
  ([
    { key: 'name', label: t('common.name') },
    { key: 'key_prefix', label: t('apikeys.key') },
    { key: 'group', label: t('common.group') },
    ...(canReadUsage ? [{ key: 'usage', label: t('apikeys.usage.title') }] : []),
    { key: 'limits', label: t('apikeys.limits.title') },
    { key: 'quota', label: t('apikeys.quota.title') },
    { key: 'status', label: t('common.status') },
    { key: 'expires_at', label: t('apikeys.expiresAt') },
    { key: 'last_used_at', label: t('apikeys.lastUsed') },
    { key: 'created_at', label: t('common.createdAt') },
    { key: 'actions', label: t('common.actions'), align: 'right' }
  ] satisfies TableColumn[]).map((c): TableColumn => ({ ...c, nowrap: true }))
)

function isExpired(k: ApiKey) {
  return !!k.expires_at && new Date(k.expires_at).getTime() < Date.now()
}

function statusOf(k: ApiKey) {
  return isExpired(k) && k.status === 'active' ? 'expired' : k.status
}

// ------------------------------------------------------------------ status and group

const updating = ref(new Set<number>())

/** Applies a PATCH to the key's row in place (the answer is the updated key). */
async function update(k: ApiKey, body: { status?: string; group_id?: number }, done: string) {
  if (updating.value.has(k.id)) return
  updating.value = new Set(updating.value).add(k.id)
  try {
    Object.assign(k, await api.patch<ApiKey>(`/me/api-keys/${k.id}`, body))
    toast(done, 'success')
  } catch (e) {
    notifyError(e)
  } finally {
    const rest = new Set(updating.value)
    rest.delete(k.id)
    updating.value = rest
  }
}
const setEnabled = (k: ApiKey, on: boolean) => update(k, { status: on ? 'active' : 'disabled' }, t(on ? 'apikeys.enabledToast' : 'apikeys.disabledToast'))
const moveToGroup = (k: ApiKey, groupId: number) => update(k, { group_id: groupId }, t('apikeys.groupChanged'))

// ------------------------------------------------------------------ create, edit, use

/** The key whose usage guide is open. */
const useKey = ref<ApiKey | null>(null)
/** The key whose usage drawer is open. */
const usageKey = ref<ApiKey | null>(null)
const editorOpen = ref(false)
/** The key being edited; null while creating. */
const editKey = ref<ApiKey | null>(null)
const plaintext = ref('')

function openEditor(k: ApiKey | null) {
  loadGroups()
  editKey.value = k
  editorOpen.value = true
}

function saved(k: ApiKey) {
  if (editKey.value) {
    Object.assign(editKey.value, k)
    toast(t('common.saved'), 'success')
    return
  }
  list.reload()
  if (k.key) plaintext.value = k.key
  else toast(t('common.created'), 'success')
}

function remove(k: ApiKey) {
  return deleteWithConfirm(`/me/api-keys/${k.id}`, t('apikeys.confirmDelete', { name: k.name }), list.reload)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('nav.items.myApiKeys')" :description="t('apikeys.myDescription')">
      <template #actions>
        <SButton variant="primary" icon="plus" data-testid="create-key" @click="openEditor(null)">{{ t('apikeys.create') }}</SButton>
      </template>
    </SPageHeader>

    <STable card dense :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <span class="inline-flex items-center gap-1.5">
          <span class="font-medium text-fg">{{ row.name }}</span>
          <STooltip v-if="row.allowed_ips?.length" :content="t('apikeys.ipAllowlistCount', { n: row.allowed_ips.length })">
            <SIcon name="shield" class="h-3.5 w-3.5 text-sky-500" data-testid="key-ip-restricted" />
          </STooltip>
        </span>
      </template>
      <template #cell-key_prefix="{ row }">
        <ApiKeyCell :api-key="row" @rotated="list.reload()" />
      </template>
      <template #cell-group="{ row }">
        <KeyGroupSwitch :group-id="row.group_id" :options="groupOptions" :disabled="updating.has(row.id)" @change="moveToGroup(row, $event)">
          <KeyGroupCell v-bind="groupCell(row)" />
        </KeyGroupSwitch>
      </template>
      <template #cell-usage="{ row }">
        <button type="button" class="-m-1 rounded-md p-1 text-left hover:bg-surface-2" :title="t('stats.key.open')" data-testid="open-key-usage" @click="usageKey = row">
          <KeyUsageCell :usage="usage.of(row.id)" />
        </button>
      </template>
      <template #cell-limits="{ row }"><KeyLimitsCell :api-key="row" /></template>
      <template #cell-quota="{ row }"><KeyQuotaCell :api-key="row" /></template>
      <template #cell-status="{ row }">
        <StatusBadge :status="statusOf(row)" :tone="statusOf(row) === 'expired' ? 'warning' : undefined" :labels="{ expired: 'apikeys.expired' }" />
      </template>
      <template #cell-expires_at="{ row }">
        <TimeText :value="row.expires_at" :empty="t('apikeys.noExpiry')" :muted="!isExpired(row)" :class="{ 'text-red-600 dark:text-red-400': isExpired(row) }" />
      </template>
      <template #cell-last_used_at="{ row }">
        <TimeText :value="row.last_used_at" mode="relative" :empty="t('common.never')" />
      </template>
      <template #cell-created_at="{ row }">
        <TimeText :value="row.created_at" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-0.5">
          <SSwitch
            :model-value="row.status === 'active'"
            :disabled="updating.has(row.id)"
            :aria-label="t(row.status === 'active' ? 'common.disable' : 'common.enable')"
            :title="t(row.status === 'active' ? 'common.disable' : 'common.enable')"
            class="mr-2"
            data-testid="key-enabled-switch"
            @update:model-value="setEnabled(row, $event)"
          />
          <SRowAction icon="code" :label="t('apikeys.actions.use')" :title="t('apikeys.use.open')" data-testid="use-key" @click="useKey = row" />
          <KeyCcSwitchButton :api-key="row" :platforms="groupCell(row).platforms" />
          <SRowAction icon="edit" :label="t('common.edit')" data-testid="edit-key" @click="openEditor(row)" />
          <SRowAction icon="trash" :label="t('common.delete')" tone="danger" data-testid="delete-key" @click="remove(row)" />
        </div>
      </template>
      <template #empty>
        <SEmpty icon="key" :title="t('apikeys.empty')" :text="t('apikeys.emptyHint')">
          <template #actions><SButton variant="primary" icon="plus" @click="openEditor(null)">{{ t('apikeys.create') }}</SButton></template>
        </SEmpty>
      </template>
      <template #footer>
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </template>
    </STable>

    <KeyEditor v-model:open="editorOpen" :api-key="editKey" :groups="groups" @saved="saved" />

    <KeyUseGuide :api-key="useKey" :platforms="useKey ? groupCell(useKey).platforms : null" @close="useKey = null" />

    <KeyUsageDrawer v-if="canReadUsage && usageKey" :api-key="usageKey" @close="usageKey = null" />

    <SModal :open="!!plaintext" :title="t('apikeys.createdTitle')" persistent :closable="false" @update:open="!$event && (plaintext = '')">
      <div class="space-y-4">
        <SAlert tone="warning">{{ t('apikeys.onceWarning') }}</SAlert>
        <div class="flex items-center gap-2">
          <SCode class="flex-1 select-all text-sm">{{ plaintext }}</SCode>
          <SCopyButton :text="plaintext" variant="secondary" size="md" :label="t('common.copy')" data-testid="copy-plaintext" />
        </div>
      </div>
      <template #footer>
        <SButton variant="primary" @click="plaintext = ''">{{ t('apikeys.savedIt') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
