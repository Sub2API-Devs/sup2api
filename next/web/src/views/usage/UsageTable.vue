<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, STable, type TableColumn } from '@sub2api/ui'
import { formatMoney, formatNumber, formatTime } from '@/utils/format'
import UsageDetail from './UsageDetail.vue'
import { billingTone, blockingHook, isBlocked, type UsageRow } from './usage'

// Usage records table shared by the admin and "my usage" pages.
const props = withDefaults(
  defineProps<{
    rows: UsageRow[]
    loading?: boolean
    showUser?: boolean
    showAccount?: boolean
    /** Detail endpoint for an id (GET /usage/:id or /me/usage/:id). */
    detailPath?: (id: number) => string
  }>(),
  { showUser: true, showAccount: true }
)
const { t } = useI18n()

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [{ key: 'created_at', label: t('common.time'), width: '110px' }]
  if (props.showUser) cols.push({ key: 'user', label: t('common.user') })
  cols.push({ key: 'group', label: t('common.group') })
  if (props.showAccount) cols.push({ key: 'account', label: t('common.account') })
  cols.push(
    { key: 'model', label: t('common.model') },
    { key: 'input_tokens', label: t('usage.cols.input'), align: 'right' },
    { key: 'output_tokens', label: t('usage.cols.output'), align: 'right' },
    { key: 'total_cost', label: t('usage.cols.cost'), align: 'right' },
    { key: 'status', label: t('common.status') }
  )
  return cols
})

function noUsage(u: UsageRow) {
  return !u.success && !u.input_tokens && !u.output_tokens
}
</script>

<template>
  <STable :columns="columns" :rows="rows" :loading="loading" expandable dense>
    <template #cell-created_at="{ row }">
      <span class="whitespace-nowrap text-xs" :title="row.created_at">{{ formatTime(row.created_at) }}</span>
    </template>
    <template #cell-user="{ row }">
      <span class="text-sm">{{ row.user_email || row.user_name || '#' + row.user_id }}</span>
    </template>
    <template #cell-group="{ row }">
      <span class="text-sm">{{ row.group_name || (row.group_id ? '#' + row.group_id : '—') }}</span>
    </template>
    <template #cell-account="{ row }">
      <span class="text-sm">{{ row.account_name || (row.account_id ? '#' + row.account_id : '—') }}</span>
    </template>
    <template #cell-model="{ row }">
      <span class="font-mono text-xs">{{ row.model || '—' }}</span>
    </template>
    <template #cell-input_tokens="{ row }">
      <span v-if="noUsage(row)" class="muted">—</span>
      <span v-else :title="t('usage.cacheTitle', { r: formatNumber(row.cache_read_tokens), w: formatNumber(row.cache_creation_tokens) })">
        {{ formatNumber(row.input_tokens) }}
        <span v-if="row.cache_read_tokens" class="muted block text-[11px]">+{{ formatNumber(row.cache_read_tokens) }} {{ t('usage.cached') }}</span>
      </span>
    </template>
    <template #cell-output_tokens="{ row }">
      <span v-if="noUsage(row)" class="muted">—</span>
      <span v-else>{{ formatNumber(row.output_tokens) }}</span>
    </template>
    <template #cell-total_cost="{ row }">
      <span v-if="row.billing_status === 'free'" class="muted">{{ t('usage.free') }}</span>
      <template v-else>
        <span class="font-mono text-xs">{{ formatMoney(row.total_cost) }}</span>
        <SBadge v-if="row.billing_status !== 'billed'" class="ml-1" :tone="billingTone(row.billing_status)">
          {{ t(`usage.billing.status.${row.billing_status}`) }}
        </SBadge>
      </template>
    </template>
    <template #cell-status="{ row }">
      <div v-if="row.success" class="flex items-center gap-1">
        <span class="text-emerald-600 dark:text-emerald-400">✓</span>
        <SBadge v-if="row.stream" tone="info">{{ t('usage.stream') }}</SBadge>
      </div>
      <div v-else>
        <div class="flex items-center gap-1">
          <span class="text-red-600 dark:text-red-400">✕</span>
          <SBadge v-if="isBlocked(row)" tone="warning">{{ t('usage.blocked') }}</SBadge>
          <span v-else class="font-mono text-xs text-red-600 dark:text-red-400">{{ row.error_type || row.status_code }}</span>
        </div>
        <p v-if="isBlocked(row)" class="muted max-w-xs truncate text-xs" :title="blockingHook(row)?.note || row.error_message">
          └ {{ t('usage.blockedBy', { plugin: blockingHook(row)?.plugin_key || '—' }) }}<template v-if="blockingHook(row)?.note || row.error_message">: {{ blockingHook(row)?.note || row.error_message }}</template>
        </p>
      </div>
    </template>
    <template #expand="{ row }">
      <UsageDetail :row="row" :path="detailPath ? detailPath(row.id) : undefined" />
    </template>
  </STable>
</template>
