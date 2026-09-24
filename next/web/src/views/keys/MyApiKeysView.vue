<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SField, SIcon, SModal, SPageHeader, SPagination, SSelect, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { ApiKey, Group } from '@/api/types'
import { fromLocalInput, statusTone } from '@/api/admin'
import { useList } from '@/composables/useList'
import { fetchMyGroups } from '@/composables/lookups'
import { usePlatforms } from '@/composables/platforms'
import { fieldErrors, notifyError } from '@/utils/errors'
import { copyText, formatDateTime, formatRelative } from '@/utils/format'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'
import KeyGroupCell from './KeyGroupCell.vue'

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

function statusLabel(s: string) {
  const k = s === 'expired' ? 'apikeys.expired' : `common.status_.${s}`
  const v = t(k)
  return v === k ? s : v
}

// ------------------------------------------------------------------ create

const createOpen = ref(false)
const creating = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({ name: '', group_id: null as number | null, expires_at: '' })
const groupOptions = computed(() =>
  groups.value.map((g) => ({
    value: g.id,
    label: g.platforms?.length ? `${g.name} · ${g.platforms.map((p) => platforms.label(p)).join(', ')}` : g.name
  }))
)
const selectedGroup = computed(() => groups.value.find((g) => g.id === form.group_id) || null)

function openCreate() {
  loadGroups()
  Object.assign(form, { name: '', group_id: groups.value[0]?.id ?? null, expires_at: '' })
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
    const body: Record<string, unknown> = { name: form.name.trim(), group_id: form.group_id }
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
    errors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    creating.value = false
  }
}

async function copyPlain() {
  if (await copyText(plaintext.value)) toast(t('common.copied'), 'success')
}

function closePlain() {
  plainOpen.value = false
  plaintext.value = ''
}

// ------------------------------------------------------------------ delete

async function remove(k: ApiKey) {
  const ok = await confirm({ title: t('common.delete'), message: t('apikeys.confirmDelete', { name: k.name }), danger: true })
  if (!ok) return
  try {
    await api.del(`/me/api-keys/${k.id}`)
    toast(t('common.deleted'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('apikeys.myTitle')" :description="t('apikeys.myDescription')">
      <template #actions>
        <SButton variant="primary" @click="openCreate">+ {{ t('apikeys.create') }}</SButton>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <span class="font-medium text-gray-900 dark:text-white">{{ row.name }}</span>
      </template>
      <template #cell-key_prefix="{ row }">
        <code class="font-mono text-xs">{{ row.key_prefix }}…</code>
      </template>
      <template #cell-group="{ row }"><KeyGroupCell :name="groupName(row)" :platforms="keyPlatforms(row)" /></template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusOf(row) === 'expired' ? 'warning' : statusTone(row.status)" dot>{{ statusLabel(statusOf(row)) }}</SBadge>
      </template>
      <template #cell-expires_at="{ row }">
        <span class="muted">{{ row.expires_at ? formatDateTime(row.expires_at) : t('apikeys.noExpiry') }}</span>
      </template>
      <template #cell-last_used_at="{ row }">
        <span class="muted" :title="row.last_used_at ? formatDateTime(row.last_used_at) : ''">
          {{ row.last_used_at ? formatRelative(row.last_used_at, t) : t('common.never') }}
        </span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="muted">{{ formatDateTime(row.created_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton variant="ghost" size="sm" class="!text-red-600" @click="remove(row)">
          <SIcon name="trash" class="h-4 w-4" />{{ t('common.delete') }}
        </SButton>
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <SModal v-model:open="createOpen" :title="t('apikeys.create')">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <SField :label="t('common.name')" required :error="errors.name">
          <input v-model="form.name" class="input" :placeholder="t('apikeys.namePlaceholder')" />
        </SField>
        <SField :label="t('common.group')" required :error="errors.group_id" :hint="groups.length ? '' : t('apikeys.noGroups')">
          <SSelect v-model="form.group_id" :options="groupOptions" :placeholder="groups.length ? undefined : '—'" />
        </SField>
        <div v-if="selectedGroup" class="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-dark-900 dark:text-dark-300">
          <div>{{ t('apikeys.groupMultiplier', { n: selectedGroup.rate_multiplier }) }}</div>
          <div>
            {{ t('apikeys.groupModels') }}:
            {{ selectedGroup.model_allowlist?.length ? selectedGroup.model_allowlist.join(', ') : t('common.unlimited') }}
          </div>
          <div v-if="selectedGroup.description" class="mt-0.5">{{ selectedGroup.description }}</div>
          <template v-if="selectedGroup.platforms">
            <div class="mt-2 flex flex-wrap items-center gap-1" data-testid="create-key-platforms">
              <span>{{ t('platforms.keyPlatforms') }}:</span>
              <PlatformBadges v-if="selectedGroup.platforms.length" :ids="selectedGroup.platforms" />
              <span v-else class="text-amber-600 dark:text-amber-400">{{ t('platforms.keyNoPlatforms') }}</span>
            </div>
            <div v-if="selectedGroup.platforms.length" class="mt-2">
              <div class="mb-1">{{ t('platforms.keyEndpoints') }}:</div>
              <PlatformEndpointsPreview :ids="selectedGroup.platforms" :max="3" />
            </div>
          </template>
        </div>
        <SField :label="t('apikeys.expiresAt')" :hint="t('apikeys.expiresHint')" :error="errors.expires_at">
          <input v-model="form.expires_at" type="datetime-local" class="input" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="createOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="creating" @click="submitCreate">{{ t('common.create') }}</SButton>
      </template>
    </SModal>

    <SModal :open="plainOpen" :title="t('apikeys.createdTitle')" persistent :closable="false" @update:open="!$event && closePlain()">
      <div class="space-y-4">
        <div class="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <SIcon name="warning" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ t('apikeys.onceWarning') }}
        </div>
        <div class="flex items-center gap-2">
          <code class="code-block flex-1 select-all !text-sm">{{ plaintext }}</code>
          <SButton @click="copyPlain"><SIcon name="copy" class="h-4 w-4" />{{ t('common.copy') }}</SButton>
        </div>
      </div>
      <template #footer>
        <SButton variant="primary" @click="closePlain">{{ t('apikeys.savedIt') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
