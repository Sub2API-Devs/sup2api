<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCode, SCopyButton, SDropdown, SField, SHint, SInput, SModal, SPageHeader, SPagination, SSelect, STable, STextarea, toast, type TableColumn } from '@sub2api/ui'
import type { ApiKey, Group } from '@/api/types'
import { fromLocalInput } from '@/api/admin'
import { deleteWithConfirm } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { fetchMyGroups } from '@/composables/lookups'
import { usePlatforms } from '@/composables/platforms'
import { fieldErrors, notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import StatusBadge from '@/components/StatusBadge.vue'
import TimeText from '@/components/TimeText.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'
import KeyGroupCell from './KeyGroupCell.vue'
import ApiKeyCell from './ApiKeyCell.vue'

const { t } = useI18n()
const list = useList<ApiKey>('/me/api-keys')
const platforms = usePlatforms()
platforms.load()

const groups = ref<Group[]>([])
async function loadGroups() {
  try {
    groups.value = await fetchMyGroups()
  } catch (e) {
    notifyError(e)
  }
}
loadGroups()

function groupName(k: ApiKey) {
  return k.group_name || groups.value.find((g) => g.id === k.group_id)?.name || `#${k.group_id}`
}

/** Platforms of the key: reported on the key, else those of its group. */
function keyPlatforms(k: ApiKey): string[] | undefined {
  return k.platforms ?? groups.value.find((g) => g.id === k.group_id)?.platforms
}

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('common.name') },
  { key: 'key_prefix', label: t('apikeys.key') },
  { key: 'group', label: t('common.group') },
  { key: 'status', label: t('common.status') },
  { key: 'expires_at', label: t('apikeys.expiresAt') },
  { key: 'last_used_at', label: t('apikeys.lastUsed') },
  { key: 'created_at', label: t('common.createdAt') },
  { key: 'actions', label: t('common.actions'), align: 'right' }
])

function isExpired(k: ApiKey) {
  return !!k.expires_at && new Date(k.expires_at).getTime() < Date.now()
}

function statusOf(k: ApiKey) {
  return isExpired(k) && k.status === 'active' ? 'expired' : k.status
}

// ------------------------------------------------------------------ create

const createOpen = ref(false)
const creating = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({ name: '', group_id: null as number | null, expires_at: '', allowed_ips: '' })
const ipKey = ref<ApiKey | null>(null)
const ipText = ref('')
const ipSaving = ref(false)
const ipError = ref('')

function ipEntries(value: string) {
  return value.split(/[\s,]+/).filter(Boolean)
}
function editIPs(key: ApiKey) {
  ipKey.value = key
  ipText.value = (key.allowed_ips || []).join('\n')
  ipError.value = ''
}
async function saveIPs() {
  if (!ipKey.value || ipSaving.value) return
  ipSaving.value = true
  ipError.value = ''
  try {
    await api.put(`/me/api-keys/${ipKey.value.id}/ip-allowlist`, { allowed_ips: ipEntries(ipText.value) })
    ipKey.value = null
    toast(t('apikeys.ipAllowlistSaved'), 'success')
    list.reload()
  } catch (e) {
    // The list error is shown under the field only; anything else as a toast.
    ipError.value = fieldErrors(e).allowed_ips || ''
    if (!ipError.value) notifyError(e)
  } finally {
    ipSaving.value = false
  }
}
const groupOptions = computed(() =>
  groups.value.map((g) => ({
    value: g.id,
    label: g.platforms?.length ? `${g.name} · ${g.platforms.map((p) => platforms.label(p)).join(', ')}` : g.name
  }))
)
const selectedGroup = computed(() => groups.value.find((g) => g.id === form.group_id) || null)

function openCreate() {
  loadGroups()
  Object.assign(form, { name: '', group_id: groups.value[0]?.id ?? null, expires_at: '', allowed_ips: '' })
  errors.value = {}
  createOpen.value = true
}

const plaintext = ref('')
const plainOpen = ref(false)

async function submitCreate() {
  errors.value = {}
  if (!form.name.trim()) errors.value.name = t('common.required')
  if (!form.group_id) errors.value.group_id = t('common.required')
  const exp = fromLocalInput(form.expires_at)
  if (exp && new Date(exp).getTime() <= Date.now()) errors.value.expires_at = t('apikeys.expiresInPast')
  if (Object.keys(errors.value).length) return
  creating.value = true
  try {
    const body: Record<string, unknown> = { name: form.name.trim(), group_id: form.group_id, allowed_ips: ipEntries(form.allowed_ips) }
    if (exp) body.expires_at = exp
    const created = await api.post<ApiKey>('/me/api-keys', body)
    createOpen.value = false
    list.reload()
    if (created?.key) {
      plaintext.value = created.key
      plainOpen.value = true
    } else {
      toast(t('common.created'), 'success')
    }
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    creating.value = false
  }
}

function closePlain() {
  plainOpen.value = false
  plaintext.value = ''
}

// ------------------------------------------------------------------ delete

function remove(k: ApiKey) {
  return deleteWithConfirm(`/me/api-keys/${k.id}`, t('apikeys.confirmDelete', { name: k.name }), list.reload)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('apikeys.myTitle')" :description="t('apikeys.myDescription')">
      <template #actions>
        <SButton variant="primary" icon="plus" @click="openCreate">{{ t('apikeys.create') }}</SButton>
      </template>
    </SPageHeader>

    <STable card dense class="api-key-table" :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <span class="font-medium text-fg">{{ row.name }}</span>
        <SHint v-if="row.allowed_ips?.length" size="xs">{{ t('apikeys.ipAllowlistCount', { n: row.allowed_ips.length }) }}</SHint>
      </template>
      <template #cell-key_prefix="{ row }">
        <ApiKeyCell :api-key="row" @rotated="list.reload()" />
      </template>
      <template #cell-group="{ row }"><KeyGroupCell :name="groupName(row)" :platforms="keyPlatforms(row)" /></template>
      <template #cell-status="{ row }">
        <StatusBadge :status="statusOf(row)" :tone="statusOf(row) === 'expired' ? 'warning' : undefined" :labels="{ expired: 'apikeys.expired' }" />
      </template>
      <template #cell-expires_at="{ row }">
        <TimeText :value="row.expires_at" :empty="t('apikeys.noExpiry')" />
      </template>
      <template #cell-last_used_at="{ row }">
        <TimeText :value="row.last_used_at" mode="relative" :empty="t('common.never')" />
      </template>
      <template #cell-created_at="{ row }">
        <TimeText :value="row.created_at" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <SButton variant="ghost" size="sm" data-testid="edit-key-ips" @click="editIPs(row)">{{ t('apikeys.ipAllowlist') }}</SButton>
          <SDropdown :actions="[{ key: 'delete', label: t('common.delete'), danger: true }]" @select="$event === 'delete' && remove(row)" />
        </div>
      </template>
      <template #footer>
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </template>
    </STable>

    <SModal v-model:open="createOpen" :title="t('apikeys.create')">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <SField :label="t('common.name')" required :error="errors.name">
          <SInput v-model="form.name" :placeholder="t('apikeys.namePlaceholder')" />
        </SField>
        <SField :label="t('common.group')" required :error="errors.group_id" :hint="groups.length ? '' : t('apikeys.noGroups')">
          <SSelect v-model="form.group_id" :options="groupOptions" :placeholder="groups.length ? undefined : '—'" />
        </SField>
        <div v-if="selectedGroup" class="rounded-xl bg-surface-2 px-3 py-2 text-xs text-fg-muted">
          <div>{{ t('apikeys.groupMultiplier', { n: selectedGroup.rate_multiplier }) }}</div>
          <div>
            {{ t('apikeys.groupModels') }} · {{ t(selectedGroup.model_filter_mode === 'blacklist' ? 'groups.blacklist' : 'groups.whitelist') }}:
            {{ selectedGroup.model_allowlist?.length ? selectedGroup.model_allowlist.join(', ') : t('common.unlimited') }}
          </div>
          <div v-if="selectedGroup.description" class="mt-0.5">{{ selectedGroup.description }}</div>
          <template v-if="selectedGroup.platforms">
            <div class="mt-2 flex flex-wrap items-center gap-1" data-testid="create-key-platforms">
              <span>{{ t('platforms.keyPlatforms') }}:</span>
              <PlatformBadges v-if="selectedGroup.platforms.length" :ids="selectedGroup.platforms" />
              <SHint v-else inline tone="warning" size="xs">{{ t('platforms.keyNoPlatforms') }}</SHint>
            </div>
            <div v-if="selectedGroup.platforms.length" class="mt-2">
              <div class="mb-1">{{ t('platforms.keyEndpoints') }}:</div>
              <PlatformEndpointsPreview :ids="selectedGroup.platforms" :max="3" />
            </div>
          </template>
        </div>
        <SField :label="t('apikeys.ipAllowlist')" :hint="t('apikeys.ipAllowlistHint')" :error="errors.allowed_ips">
          <STextarea v-model="form.allowed_ips" :aria-label="t('apikeys.ipAllowlist')" mono :rows="3" :maxlength="16384" data-testid="create-key-ips" />
        </SField>
        <SField :label="t('apikeys.expiresAt')" :hint="t('apikeys.expiresHint')" :error="errors.expires_at">
          <SInput v-model="form.expires_at" type="datetime-local" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="createOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitCreate">{{ t('common.create') }}</SButton>
      </template>
    </SModal>

    <SModal :open="!!ipKey" :title="t('apikeys.ipAllowlistEdit')" :persistent="ipSaving" :closable="!ipSaving" @update:open="!$event && (ipKey = null)">
      <SField :label="t('apikeys.ipAllowlist')" :hint="t('apikeys.ipAllowlistHint')" :error="ipError">
        <STextarea v-model="ipText" :aria-label="t('apikeys.ipAllowlist')" mono :rows="6" :maxlength="16384" :disabled="ipSaving" data-testid="edit-key-ip-list" />
      </SField>
      <template #footer>
        <SButton :disabled="ipSaving" @click="ipKey = null">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="ipSaving" data-testid="save-key-ips" @click="saveIPs">{{ t('common.save') }}</SButton>
      </template>
    </SModal>

    <SModal :open="plainOpen" :title="t('apikeys.createdTitle')" persistent :closable="false" @update:open="!$event && closePlain()">
      <div class="space-y-4">
        <SAlert tone="warning">{{ t('apikeys.onceWarning') }}</SAlert>
        <div class="flex items-center gap-2">
          <SCode class="flex-1 select-all text-sm">{{ plaintext }}</SCode>
          <SCopyButton :text="plaintext" variant="secondary" size="md" :label="t('common.copy')" data-testid="copy-plaintext" />
        </div>
      </div>
      <template #footer>
        <SButton variant="primary" @click="closePlain">{{ t('apikeys.savedIt') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
