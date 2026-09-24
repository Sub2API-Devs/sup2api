<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SDropdown, SPageHeader, SPagination, SSelect, STable, confirm, toast, type MenuAction, type TableColumn } from '@sub2api/ui'
import type { ApiKey, Group } from '@/api/types'
import { statusTone } from '@/api/admin'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatDateTime, formatRelative } from '@/utils/format'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('apikey:all:manage'))
const list = useList<ApiKey>('/api-keys', { q: '', user_id: '', status: '' })
// Group names come from the key itself (group_name) or the groups lookup when readable.
const groups = auth.has('group:read') ? useGroupsLookup().groups : ref<Group[]>([])

function groupName(k: ApiKey) {
  return k.group_name || groups.value.find((g) => g.id === k.group_id)?.name || `#${k.group_id}`
}

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', label: t('common.id'), width: '64px' },
    { key: 'name', label: t('common.name') },
    { key: 'user', label: t('common.user') },
    { key: 'key_prefix', label: t('apikeys.key') },
    { key: 'group', label: t('common.group') },
    { key: 'status', label: t('common.status') },
    { key: 'expires_at', label: t('apikeys.expiresAt') },
    { key: 'last_used_at', label: t('apikeys.lastUsed') },
    { key: 'created_at', label: t('common.createdAt') }
  ]
  if (canManage.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right' })
  return cols
})

const statusOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'active', label: t('common.status_.active') },
  { value: 'disabled', label: t('common.status_.disabled') }
])

function statusLabel(s: string) {
  const k = `common.status_.${s}`
  const v = t(k)
  return v === k ? s : v
}

function actions(k: ApiKey): MenuAction[] {
  return [
    { key: 'enable', label: t('common.enable'), hidden: k.status === 'active' },
    { key: 'disable', label: t('common.disable'), hidden: k.status !== 'active' },
    { key: 'delete', label: t('common.delete'), danger: true }
  ]
}

async function onAction(k: ApiKey, action: string) {
  try {
    if (action === 'enable' || action === 'disable') {
      await api.patch(`/api-keys/${k.id}`, { status: action === 'enable' ? 'active' : 'disabled' })
      toast(t('common.updated'), 'success')
    } else if (action === 'delete') {
      const ok = await confirm({ title: t('common.delete'), message: t('apikeys.confirmDelete', { name: k.name }), danger: true })
      if (!ok) return
      await api.del(`/api-keys/${k.id}`)
      toast(t('common.deleted'), 'success')
    }
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('apikeys.allTitle')" :description="t('apikeys.allDescription')">
      <template #filters>
        <input v-model="list.filters.q" class="input !w-64" :placeholder="t('apikeys.searchPlaceholder')" />
        <input v-model="list.filters.user_id" class="input !w-32" inputmode="numeric" :placeholder="t('apikeys.userId')" />
        <div class="w-40">
          <SSelect v-model="list.filters.status" :options="statusOptions" />
        </div>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <span class="font-medium text-gray-900 dark:text-white">{{ row.name }}</span>
      </template>
      <template #cell-user="{ row }">
        <span>{{ row.user_email || (row.user_id ? `#${row.user_id}` : '—') }}</span>
      </template>
      <template #cell-key_prefix="{ row }">
        <code class="font-mono text-xs">{{ row.key_prefix }}…</code>
      </template>
      <template #cell-group="{ row }">{{ groupName(row) }}</template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</SBadge>
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
        <SDropdown :actions="actions(row)" @select="onAction(row, $event)" />
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
  </div>
</template>
