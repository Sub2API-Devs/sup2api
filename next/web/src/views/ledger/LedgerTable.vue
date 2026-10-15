<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, STable, type TableColumn } from '@sub2api/ui'
import type { LedgerEntry } from '@/api/types'
import TimeText from '@/components/TimeText.vue'
import { formatDelta, formatNumber } from '@/utils/format'
import { KIND_TONE } from './kinds'

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

function deltaCls(v: string) {
  const n = Number(v)
  if (n > 0) return 'text-success-600 dark:text-success-400'
  return n < 0 ? 'text-danger-600 dark:text-danger-400' : ''
}
</script>

<template>
  <STable card :columns="columns" :rows="rows" :loading="loading" dense>
    <template v-if="$slots.toolbar" #toolbar><slot name="toolbar" /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    <template #cell-created_at="{ row }">
      <TimeText :value="row.created_at" mode="time" :muted="false" class="text-xs" />
    </template>
    <template #cell-user="{ row }">
      <span class="text-sm">{{ row.user_email || row.user_name || '#' + row.user_id }}</span>
    </template>
    <template #cell-kind="{ row }">
      <SBadge :tone="KIND_TONE[row.kind] ?? 'gray'">{{ kindLabel(row.kind) }}</SBadge>
    </template>
    <template #cell-delta="{ row }">
      <span class="font-mono text-sm" :class="deltaCls(row.delta)">{{ formatDelta(row.delta) }}</span>
    </template>
    <template #cell-balance_after="{ row }">
      <span class="font-mono text-sm">{{ formatNumber(row.balance_after, 4) }}</span>
    </template>
    <template #cell-note="{ row }">
      <div class="max-w-md text-sm">
        <span v-if="row.note">{{ row.note }}</span>
        <SHint v-if="row.ref_type || row.ref_id" inline size="xs" class="ml-1 truncate font-mono" :title="`${row.ref_type}:${row.ref_id}`">
          {{ row.ref_type }}:{{ row.ref_id && row.ref_id.length > 18 ? row.ref_id.slice(0, 18) + '…' : row.ref_id }}
        </SHint>
        <SHint v-if="row.plugin_key" inline size="xs" class="ml-1">· {{ row.plugin_key }}</SHint>
        <SHint v-if="row.operator_id" inline size="xs" class="ml-1">· {{ t('ledger.operator', { id: row.operator_id }) }}</SHint>
        <SHint v-if="!row.note && !row.ref_type && !row.ref_id" inline>—</SHint>
      </div>
    </template>
  </STable>
</template>
