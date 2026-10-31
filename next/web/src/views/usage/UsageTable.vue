<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SDateTime, SBadge, SEmpty, SIcon, SIPAddress, SSpinner, STable, STableColumnSettings, useTableColumns, type TableColumn } from '@sub2api/ui'
import { formatMoney, formatNumber } from '@/utils/format'
import UsageDetail from './UsageDetail.vue'
import UsageError from './UsageError.vue'
import UsageStatus from './UsageStatus.vue'
import UsageTiming from './UsageTiming.vue'
import UsageTokens from './UsageTokens.vue'
import { billingTone, hashColor, isConverted, type UsageRow } from './usage'

// The usage list: one row per request, its detail (billing trace, request
// facts) expanded under it; cards on narrow screens. Clicking a client IP or
// a client request ID asks the page to filter by it.
const props = withDefaults(
  defineProps<{
    rows: UsageRow[]
    loading?: boolean
    showUser?: boolean
    showAccount?: boolean
    showClientRequestId?: boolean
    detailPath?: (id: number) => string
    columnSettingsKey?: string
  }>(),
  { showUser: true, showAccount: true, showClientRequestId: false }
)
const emit = defineEmits<{
  (e: 'filter-client-request-id', id: string): void
  (e: 'filter-client-ip', ip: string): void
}>()
const { t } = useI18n()
const expanded = ref(new Set<number>())
const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('common.time'), width: '150px', hideable: false },
  ...(props.showUser ? [{ key: 'user', label: t('common.user'), width: '150px' }] : []),
  { key: 'api_key', label: t('usage.request.apiKey'), width: '140px' },
  { key: 'client_ip', label: t('usage.request.clientIP'), width: '170px', format: 'ip', filterable: true },
  { key: 'model', label: props.showAccount ? t('usage.cols.modelAccount') : t('common.model'), width: '210px' },
  { key: 'tokens', label: t('usage.tokens.title'), width: '125px' },
  { key: 'total_cost', label: t('usage.cols.cost'), width: '95px' },
  { key: 'latency', label: t('usage.cols.timing'), width: '140px' },
  { key: 'detail', label: t('usage.cols.detail'), width: '140px' }
])
const columnState = useTableColumns(columns, () => props.columnSettingsKey)
const { visibleColumns, isVisible } = columnState
const keyName = (row: UsageRow) => row.api_key_name || (row.api_key_id ? '#' + row.api_key_id : '—')
const groupName = (row: UsageRow) => row.group_name || (row.group_id ? '#' + row.group_id : '')
const userName = (row: UsageRow) => row.user_email || row.user_name || '#' + row.user_id
/** "×1.5" when the group's rate is not 1. */
function rate(row: UsageRow) {
  const r = Number(row.rate_multiplier)
  return Number.isFinite(r) && r > 0 && r !== 1 ? '×' + formatNumber(r, 2) : ''
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
    <div class="mb-2 flex justify-end">
      <STableColumnSettings :state="columnState" />
    </div>
    <STable
      card
      class="hidden md:block"
      :columns="visibleColumns"
      :rows="rows"
      :loading="loading"
      expandable
      fit-expanded-to-container
      @filter="(_column, ip) => emit('filter-client-ip', ip)"
    >
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
      <template #cell-created_at="{ row }">
        <div class="flex min-w-0 flex-col items-start gap-1">
          <SDateTime :value="row.created_at" mode="time" class="font-mono text-xs tabular-nums" />
          <UsageStatus :row="row" />
          <UsageError v-if="!row.success" :row="row" class="max-w-full" data-testid="usage-error-summary" />
        </div>
      </template>
      <template #cell-user="{ row }">
        <div class="flex min-w-0 items-center gap-2" :title="userName(row)">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xxs font-semibold uppercase text-white"
            :class="hashColor(userName(row))"
            aria-hidden="true"
            >{{ userName(row).replace('#', '').slice(0, 1) }}</span
          >
          <span class="truncate text-sm text-fg-muted">{{ userName(row) }}</span>
        </div>
      </template>
      <template #cell-api_key="{ row }">
        <div class="flex min-w-0 flex-col items-start gap-1" data-testid="usage-client">
          <span class="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-line bg-surface-2/60 px-2 text-xs" :title="keyName(row)">
            <SIcon name="key" class="h-3 w-3 shrink-0 text-fg-subtle" />
            <span class="truncate">{{ keyName(row) }}</span>
          </span>
          <span v-if="groupName(row)" class="max-w-full truncate text-xs text-fg-subtle" :title="groupName(row)">
            {{ groupName(row) }}<span v-if="rate(row)" class="ml-1 tabular-nums opacity-70">{{ rate(row) }}</span>
          </span>
        </div>
      </template>
      <template #cell-model="{ row }">
        <div class="flex min-w-0 flex-col items-start gap-1">
          <span
            class="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-line bg-surface-2/60 px-2 text-xs font-medium"
            :title="row.upstream_model && row.upstream_model !== row.model ? `${row.model} → ${row.upstream_model}` : row.model"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" :class="hashColor(row.model || '')" aria-hidden="true" />
            <span class="truncate font-mono">{{ row.model || '—' }}</span>
            <SIcon v-if="row.upstream_model && row.upstream_model !== row.model" name="arrow-left" class="h-3 w-3 shrink-0 rotate-180 text-fg-subtle" />
          </span>
          <div class="flex max-w-full items-center gap-1.5 text-xxs text-fg-subtle">
            <span
              v-if="showAccount && row.account_id"
              class="flex min-w-0 items-center gap-1"
              :title="row.account_name || undefined"
            >
              <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="hashColor(String(row.account_id))" aria-hidden="true" />
              <span class="shrink-0 font-mono">#{{ row.account_id }}</span>
              <span class="truncate">{{ row.account_name }}</span>
            </span>
            <span v-else-if="!showAccount" class="truncate font-mono">{{ row.upstream_protocol || row.protocol || '—' }}</span>
            <SBadge v-if="isConverted(row)" size="xs" tone="warning" :title="t('usage.convertedFrom', { protocol: row.protocol })">{{ t('usage.converted') }}</SBadge>
          </div>
        </div>
      </template>
      <template #cell-tokens="{ row }"><UsageTokens :row="row" /></template>
      <template #cell-total_cost="{ row }">
        <div class="flex flex-col items-start gap-1">
          <span class="whitespace-nowrap font-mono text-xs font-medium" :class="row.billing_status === 'free' ? 'text-fg-subtle' : ''">{{
            row.billing_status === 'free' ? t('usage.free') : formatMoney(row.total_cost)
          }}</span>
          <SBadge v-if="row.billing_status !== 'billed' && row.billing_status !== 'free'" size="xs" :tone="billingTone(row.billing_status)">{{
            t(`usage.billing.status.${row.billing_status}`)
          }}</SBadge>
        </div>
      </template>
      <template #cell-latency="{ row }"><UsageTiming :row="row" /></template>
      <template #cell-detail="{ row }">
        <div class="min-w-0 space-y-1">
          <p class="truncate text-xs text-fg-muted" :title="row.matched_tier || undefined">{{ row.matched_tier || '—' }}</p>
          <button
            v-if="showClientRequestId && row.client_request_id"
            type="button"
            class="block max-w-full truncate text-left font-mono text-xxs text-fg-subtle hover:text-primary-600"
            :title="t('usage.filterByClientRequestId', { id: row.client_request_id })"
            data-testid="client-request-id"
            @click.stop="emit('filter-client-request-id', row.client_request_id)"
          >
            {{ row.client_request_id }}
          </button>
        </div>
      </template>
      <template #expand="{ row }"><UsageDetail :row="row" :path="detailPath?.(row.id)" /></template>
    </STable>

    <div class="space-y-3 md:hidden">
      <div v-if="loading && !rows.length" class="card p-8 text-center"><SSpinner /></div>
      <SEmpty v-else-if="!rows.length" class="card" :text="t('common.noData')" />
      <article v-for="row in rows" :key="row.id" class="card p-4" :class="loading ? 'opacity-60' : ''" data-testid="mobile-usage-record">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p v-if="isVisible('model')" class="flex items-center gap-1.5 font-mono text-xs font-medium">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="hashColor(row.model || '')" aria-hidden="true" />
              <span class="break-all">{{ row.model || '—' }}</span>
            </p>
            <p class="mt-1 text-xs text-fg-subtle">
              <SDateTime muted :value="row.created_at" mode="time" class="tabular-nums" />
            </p>
          </div>
          <UsageStatus :row="row" />
        </div>
        <UsageError v-if="!row.success" :row="row" class="mt-2" />
        <div v-if="isVisible('tokens') || isVisible('total_cost') || isVisible('latency')" class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-surface-2/60 p-3">
          <div v-if="isVisible('tokens')">
            <p class="mb-1 text-xxs text-fg-subtle">{{ t('usage.tokens.title') }}</p>
            <UsageTokens :row="row" />
          </div>
          <div v-if="isVisible('total_cost')">
            <p class="mb-1 text-xxs text-fg-subtle">{{ t('usage.cols.cost') }}</p>
            <p class="font-mono text-xs font-medium">{{ row.billing_status === 'free' ? t('usage.free') : formatMoney(row.total_cost) }}</p>
            <SBadge v-if="row.billing_status !== 'billed' && row.billing_status !== 'free'" size="xs" class="mt-1" :tone="billingTone(row.billing_status)">{{
              t(`usage.billing.status.${row.billing_status}`)
            }}</SBadge>
          </div>
          <div v-if="isVisible('latency')" class="col-span-2"><UsageTiming :row="row" /></div>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <template v-if="showUser && isVisible('user')">
            <dt class="text-fg-subtle">{{ t('common.user') }}</dt>
            <dd class="truncate">{{ userName(row) }}</dd>
          </template>
          <template v-if="isVisible('api_key')">
            <dt class="text-fg-subtle">{{ t('usage.request.apiKey') }}</dt>
            <dd class="truncate">{{ keyName(row) }}<span v-if="groupName(row)" class="text-fg-subtle"> · {{ groupName(row) }}</span></dd>
          </template>
          <template v-if="showAccount && isVisible('model')">
            <dt class="text-fg-subtle">{{ t('common.account') }}</dt>
            <dd class="truncate">{{ row.account_name || (row.account_id ? '#' + row.account_id : '—') }}</dd>
          </template>
          <template v-if="isVisible('client_ip')">
            <dt class="text-fg-subtle">{{ t('usage.request.clientIP') }}</dt>
            <dd class="min-w-0">
              <SIPAddress :value="row.client_ip" filterable @filter="emit('filter-client-ip', $event)" />
            </dd>
          </template>
          <template v-if="isVisible('detail') && showClientRequestId && row.client_request_id">
            <dt class="text-fg-subtle">{{ t('usage.request.clientId') }}</dt>
            <dd class="min-w-0">
              <button
                type="button"
                class="block max-w-full truncate font-mono text-primary-600"
                :title="t('usage.filterByClientRequestId', { id: row.client_request_id })"
                @click="emit('filter-client-request-id', row.client_request_id)"
              >
                {{ row.client_request_id }}
              </button>
            </dd>
          </template>
        </dl>
        <button type="button" class="mt-3 text-xs font-medium text-primary-600" :aria-expanded="expanded.has(row.id)" @click="toggleMobile(row.id)">
          {{ expanded.has(row.id) ? t('usage.hideDetails') : t('usage.showDetails') }}
        </button>
        <UsageDetail v-if="expanded.has(row.id)" :row="row" :path="detailPath?.(row.id)" class="-mx-4 -mb-4 mt-3 border-t border-line" />
      </article>
      <div v-if="$slots.footer" class="card px-4"><slot name="footer" /></div>
    </div>
  </div>
</template>

<style scoped>
.usage-records :deep(.table) {
  table-layout: fixed;
}
.usage-records :deep(th) {
  white-space: nowrap;
}
.usage-records :deep(td) {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  vertical-align: middle;
}
.usage-records :deep(.s-table-expand > td) {
  padding: 0;
}
</style>
