<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, STable, type TableColumn } from '@sub2api/ui'
import type { LedgerEntry } from '@/api/types'
import { formatDelta, formatNumber, formatTime } from '@/utils/format'

type Row = LedgerEntry & { user_name?: string; idempotency_key?: string }

const props = withDefaults(defineProps<{ rows: Row[]; loading?: boolean; showUser?: boolean }>(), { showUser: true })
const { t, te } = useI18n()

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [{ key: 'created_at', label: t('common.time'), width: '120px' }]
  if (props.showUser) cols.push({ key: 'user', label: t('common.user') })
  cols.push(
    { key: 'kind', label: t('ledger.cols.kind'), width: '130px' },
    { key: 'delta', label: t('ledger.cols.delta'), align: 'right', width: '130px' },
    { key: 'balance_after', label: t('ledger.cols.balance'), align: 'right', width: '130px' },
    { key: 'note', label: t('ledger.cols.note') }
  )
  return cols
})

function kindLabel(k: string) {
  return te(`ledger.kinds.${k}`) ? t(`ledger.kinds.${k}`) : k
}

function kindTone(k: string) {
  if (k === 'usage') return 'gray'
  if (k === 'admin_adjust') return 'primary'
  if (k === 'refund' || k === 'plugin_credit') return 'success'
  if (k === 'plugin_debit') return 'warning'
  return 'gray'
}

function deltaCls(v: string) {
  const n = Number(v)
  return n > 0 ? 'text-emerald-600 dark:text-emerald-400' : n < 0 ? 'text-red-600 dark:text-red-400' : ''
}

function balance(v: string) {
  return formatNumber(v, 4)
}
</script>

<template>
  <STable :columns="columns" :rows="rows" :loading="loading" dense>
    <template #cell-created_at="{ row }">
      <span class="whitespace-nowrap text-xs" :title="row.created_at">{{ formatTime(row.created_at) }}</span>
    </template>
    <template #cell-user="{ row }">
      <span class="text-sm">{{ row.user_email || row.user_name || '#' + row.user_id }}</span>
    </template>
    <template #cell-kind="{ row }">
      <SBadge :tone="kindTone(row.kind)">{{ kindLabel(row.kind) }}</SBadge>
    </template>
    <template #cell-delta="{ row }">
      <span class="font-mono text-sm" :class="deltaCls(row.delta)">{{ formatDelta(row.delta) }}</span>
    </template>
    <template #cell-balance_after="{ row }">
      <span class="font-mono text-sm">{{ balance(row.balance_after) }}</span>
    </template>
    <template #cell-note="{ row }">
      <div class="max-w-md text-sm">
        <span v-if="row.note">{{ row.note }}</span>
        <span v-if="row.ref_type || row.ref_id" class="muted ml-1 truncate font-mono text-xs" :title="`${row.ref_type}:${row.ref_id}`">
          {{ row.ref_type }}:{{ row.ref_id && row.ref_id.length > 18 ? row.ref_id.slice(0, 18) + '…' : row.ref_id }}
        </span>
        <span v-if="row.plugin_key" class="muted ml-1 text-xs">· {{ row.plugin_key }}</span>
        <span v-if="row.operator_id" class="muted ml-1 text-xs">· {{ t('ledger.operator', { id: row.operator_id }) }}</span>
        <span v-if="!row.note && !row.ref_type && !row.ref_id" class="muted">—</span>
      </div>
    </template>
  </STable>
</template>
