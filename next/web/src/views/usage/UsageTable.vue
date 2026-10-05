<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SSpinner, STable, type TableColumn } from '@sub2api/ui'
import { formatMoney, formatNumber, formatTime } from '@/utils/format'
import UsageDetail from './UsageDetail.vue'
import UsageStatus from './UsageStatus.vue'
import UsageTokens from './UsageTokens.vue'
import { billingTone, isConverted, type UsageRow } from './usage'

const props = withDefaults(
  defineProps<{
    rows: UsageRow[]
    loading?: boolean
    showUser?: boolean
    showAccount?: boolean
    showClientRequestId?: boolean
    detailPath?: (id: number) => string
  }>(),
  { showUser: true, showAccount: true, showClientRequestId: false }
)
const emit = defineEmits<{ (e: 'filter-client-request-id', id: string): void }>()
const { t } = useI18n()
const expanded = ref(new Set<number>())
const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [{ key: 'created_at', label: t('common.time'), width: '110px' }]
  if (props.showUser) cols.push({ key: 'user', label: t('common.user'), width: '180px' })
  cols.push(
    { key: 'model', label: t('common.model'), width: '220px' },
    { key: 'group', label: props.showAccount ? t('usage.cols.route') : t('common.group'), width: '190px' },
    { key: 'tokens', label: t('usage.tokens.title'), width: '125px' },
    { key: 'latency', label: t('usage.request.latency'), width: '135px' },
    { key: 'total_cost', label: t('usage.cols.cost'), align: 'right', width: '100px' },
    { key: 'status', label: t('common.status'), width: '150px' }
  )
  return cols
})
function groupLabel(row: UsageRow) {
  return row.group_name || (row.group_id ? '#' + row.group_id : '—')
}
function toggleMobile(id: number) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}
</script>

<template>
  <div class="usage-records">
    <STable class="hidden md:block" :columns="columns" :rows="rows" :loading="loading" expandable>
      <template #cell-created_at="{ row }">
        <div class="space-y-1.5">
          <span class="whitespace-nowrap text-xs tabular-nums" :title="row.created_at">{{ formatTime(row.created_at) }}</span>
          <button
            v-if="showClientRequestId && row.client_request_id"
            type="button"
            class="block max-w-[8rem] truncate text-left font-mono text-xs text-gray-400 hover:text-primary-600"
            :title="t('usage.filterByClientRequestId', { id: row.client_request_id })"
            data-testid="client-request-id"
            @click.stop="emit('filter-client-request-id', row.client_request_id)"
          >
            {{ row.client_request_id }}
          </button>
        </div>
      </template>
      <template #cell-user="{ row }"
        ><span class="block max-w-[11rem] truncate text-sm" :title="row.user_email || row.user_name">{{
          row.user_email || row.user_name || '#' + row.user_id
        }}</span></template
      >
      <template #cell-model="{ row }">
        <div class="space-y-1.5">
          <span class="block max-w-[15rem] truncate font-mono text-xs font-medium" :title="row.model">{{ row.model || '—' }}</span>
          <div class="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{{ row.upstream_protocol || row.protocol || '—' }}</span
            ><SBadge v-if="isConverted(row)" tone="warning" :title="t('usage.convertedFrom', { protocol: row.protocol })">{{
              t('usage.converted')
            }}</SBadge>
          </div>
        </div>
      </template>
      <template #cell-group="{ row }">
        <div class="space-y-1.5">
          <span class="block max-w-[13rem] truncate text-sm" :title="groupLabel(row)">{{ groupLabel(row) }}</span>
          <span v-if="showAccount" class="block max-w-[13rem] truncate text-xs text-gray-400" :title="row.account_name">{{
            row.account_name || (row.account_id ? '#' + row.account_id : '—')
          }}</span>
          <span v-else-if="row.api_key_name" class="block max-w-[13rem] truncate text-xs text-gray-400">{{ row.api_key_name }}</span>
        </div>
      </template>
      <template #cell-tokens="{ row }"><UsageTokens :row="row" /></template>
      <template #cell-latency="{ row }"
        ><div class="space-y-1 text-xs tabular-nums">
          <span>{{ row.latency_ms ? formatNumber(row.latency_ms / 1000, 2) + ' s' : '—' }}</span>
          <p v-if="row.first_token_ms" class="whitespace-nowrap text-gray-400" :title="t('usage.request.firstToken')">
            {{ t('usage.request.firstToken') }} {{ formatNumber(row.first_token_ms / 1000, 2) }} s
          </p>
        </div></template
      >
      <template #cell-total_cost="{ row }"
        ><div class="space-y-1.5">
          <span class="whitespace-nowrap font-mono text-xs" :class="row.billing_status === 'free' ? 'text-gray-400' : ''">{{
            row.billing_status === 'free' ? t('usage.free') : formatMoney(row.total_cost)
          }}</span>
          <div v-if="row.billing_status !== 'billed' && row.billing_status !== 'free'">
            <SBadge :tone="billingTone(row.billing_status)">{{ t(`usage.billing.status.${row.billing_status}`) }}</SBadge>
          </div>
        </div></template
      >
      <template #cell-status="{ row }"><UsageStatus :row="row" /></template>
      <template #expand="{ row }"><UsageDetail :row="row" :path="detailPath?.(row.id)" /></template>
    </STable>

    <div class="divide-y divide-gray-100 dark:divide-dark-700 md:hidden">
      <div v-if="loading && !rows.length" class="p-8 text-center"><SSpinner /></div>
      <p v-else-if="!rows.length" class="p-8 text-center text-sm text-gray-400">{{ t('common.noData') }}</p>
      <article v-for="row in rows" :key="row.id" class="p-4" :class="loading ? 'opacity-60' : ''" data-testid="mobile-usage-record">
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="break-all font-mono text-xs font-medium">{{ row.model || '—' }}</p>
            <p class="mt-1 text-xs text-gray-400">{{ formatTime(row.created_at) }} · {{ row.upstream_protocol || row.protocol || '—' }}</p>
          </div>
          <UsageStatus :row="row" />
        </div>
        <p v-if="showUser" class="mb-1 truncate text-sm">{{ row.user_email || row.user_name || '#' + row.user_id }}</p>
        <p class="truncate text-sm" :title="groupLabel(row)">{{ groupLabel(row) }}</p>
        <p v-if="showAccount" class="mt-1 truncate text-xs text-gray-400">
          {{ row.account_name || (row.account_id ? '#' + row.account_id : '—') }}
        </p>
        <div class="mt-3 grid grid-cols-2 gap-6">
          <UsageTokens :row="row" />
          <div class="space-y-1 text-right text-xs">
            <p>{{ row.billing_status === 'free' ? t('usage.free') : formatMoney(row.total_cost) }}</p>
            <p v-if="row.billing_status !== 'billed' && row.billing_status !== 'free'">
              <SBadge :tone="billingTone(row.billing_status)">{{ t(`usage.billing.status.${row.billing_status}`) }}</SBadge>
            </p>
            <p class="text-gray-400">
              {{ t('usage.request.latency') }} {{ row.latency_ms ? formatNumber(row.latency_ms / 1000, 2) + ' s' : '—' }}
            </p>
            <p v-if="row.first_token_ms" class="text-gray-400">
              {{ t('usage.request.firstToken') }} {{ formatNumber(row.first_token_ms / 1000, 2) }} s
            </p>
          </div>
        </div>
        <button
          v-if="showClientRequestId && row.client_request_id"
          class="mt-3 block max-w-full truncate font-mono text-xs text-primary-600"
          :title="t('usage.filterByClientRequestId', { id: row.client_request_id })"
          @click="emit('filter-client-request-id', row.client_request_id)"
        >
          {{ row.client_request_id }}
        </button>
        <button type="button" class="mt-3 text-xs text-primary-600" :aria-expanded="expanded.has(row.id)" @click="toggleMobile(row.id)">
          {{ expanded.has(row.id) ? t('usage.hideDetails') : t('usage.showDetails') }}
        </button>
        <UsageDetail v-if="expanded.has(row.id)" :row="row" :path="detailPath?.(row.id)" />
      </article>
    </div>
  </div>
</template>

<style scoped>
.usage-records :deep(.table) {
  min-width: 1050px;
  table-layout: fixed;
}
.usage-records :deep(th) {
  white-space: nowrap;
}
.usage-records :deep(td) {
  padding-top: 1rem;
  padding-bottom: 1rem;
  vertical-align: middle;
}
.usage-records :deep(.s-table-expand > td) {
  padding: 0;
}
</style>
