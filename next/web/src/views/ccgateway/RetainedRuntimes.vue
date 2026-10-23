<script setup lang="ts">
// Deleted accounts whose runtime resources are not removed yet: kept for the
// retention days the account type declares, or due (the core is removing
// them and retries until it succeeds). Removing a kept one now, or retrying.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SHint, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from '@/utils/format'
import { notifyError } from '@/utils/errors'

interface RetainedRuntime {
  key: string
  account_id: number
  account_name: string
  account_type: string
  deleted_at: string
  purge_after: string
  due: boolean
}

const { t } = useI18n()
const auth = useAuthStore()
const rows = ref<RetainedRuntime[]>([])
const purging = ref('')
const failed = ref(false)
const columns = computed<TableColumn[]>(() => [
  { key: 'account', label: t('ccgateway.retained.account') },
  { key: 'deleted_at', label: t('ccgateway.retained.deletedAt') },
  { key: 'purge_after', label: t('ccgateway.retained.purgeAfter') },
  { key: 'actions', label: '', align: 'right' },
])

async function load() {
  failed.value = false
  try {
    rows.value = (await api.get<{ runtimes: RetainedRuntime[] }>('/system/ccgateway/runtimes/retained')).runtimes
  } catch {
    failed.value = true
  }
}

async function purge(row: RetainedRuntime) {
  if (purging.value) return
  if (!row.due && !await confirm({ title: t('ccgateway.retained.purge'), message: t('ccgateway.retained.confirm', { name: row.account_name }), confirmText: t('ccgateway.retained.purge'), danger: true })) return
  purging.value = row.key
  try {
    await api.post(`/system/ccgateway/runtimes/${encodeURIComponent(row.key)}/purge`)
    toast(t('ccgateway.retained.purging'), 'success')
    await load()
  } catch (e) {
    notifyError(e)
  } finally {
    purging.value = ''
  }
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div v-if="rows.length || failed" class="space-y-2" data-testid="ccgateway-retained">
    <div class="text-sm font-medium">{{ t('ccgateway.retained.title') }}</div>
    <SHint>{{ t('ccgateway.retained.hint') }}</SHint>
    <SHint v-if="failed" tone="danger">{{ t('ccgateway.retained.loadFailed') }}</SHint>
    <STable v-else :columns="columns" :rows="rows" dense>
      <template #cell-account="{ row }">
        <span class="font-medium">{{ row.account_name }}</span> <span class="font-mono text-xs text-fg-subtle">#{{ row.account_id }}</span>
      </template>
      <template #cell-deleted_at="{ row }"><span class="tabular-nums">{{ formatDateTime(row.deleted_at) }}</span></template>
      <template #cell-purge_after="{ row }">
        <SBadge v-if="row.due" tone="warning">{{ t('ccgateway.retained.due') }}</SBadge>
        <span v-else class="tabular-nums">{{ formatDateTime(row.purge_after) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton v-if="auth.has('settings:manage')" size="sm" variant="ghost" :loading="purging === row.key" :data-testid="`ccgateway-retained-purge-${row.account_id}`" @click="purge(row)">{{ t(row.due ? 'ccgateway.retained.retry' : 'ccgateway.retained.purge') }}</SButton>
      </template>
    </STable>
  </div>
</template>
