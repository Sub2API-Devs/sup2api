<script setup lang="ts">
import { STable, type TableColumn } from '@sub2api/ui'
import { useGrowthHost } from './host'

// STable with the growth cell formats: money, time and commission event types.
defineProps<{ columns: TableColumn[]; rows: Record<string, any>[]; loading?: boolean; rowKey?: string; emptyText?: string }>()
const host = useGrowthHost()
const MONEY = ['commission', 'base_amount', 'quota_awarded']
const TIME = ['created_at', 'bound_at']
</script>

<template>
  <STable :columns="columns" :rows="rows" :loading="loading" :row-key="rowKey" :empty-text="emptyText || host.t('noData')">
    <template v-for="k in MONEY" :key="k" #[`cell-${k}`]="{ row }">{{ host.i18n.formatMoney(row[k]) }}</template>
    <template v-for="k in TIME" :key="k" #[`cell-${k}`]="{ row }">{{ host.i18n.formatDateTime(row[k]) }}</template>
    <template #cell-event_type="{ row }">{{ host.t('event.' + row.event_type) }}</template>
  </STable>
</template>
