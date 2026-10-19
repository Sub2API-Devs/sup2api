<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SEmpty, SIcon, SSpinner, STable, type TableColumn } from '@sub2api/ui'
import TimeText from '@/components/TimeText.vue'
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
  { key: 'created_at', label: t('common.time'), width: '110px' },
  ...(props.showUser ? [{ key: 'user', label: t('common.user'), width: '150px' }] : []),
  { key: 'api_key', label: t('usage.request.apiKey'), width: '140px' },
  { key: 'model', label: props.showAccount ? t('usage.cols.modelAccount') : t('common.model'), width: '210px' },
  { key: 'tokens', label: t('usage.tokens.title'), width: '125px' },
  { key: 'total_cost', label: t('usage.cols.cost'), width: '95px' },
  { key: 'latency', label: t('usage.cols.timing'), width: '140px' },
  { key: 'client_ip', label: t('usage.cols.ip'), width: '140px' },
  { key: 'detail', label: t('usage.cols.detail'), width: '140px' }
])
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
    <STable card class="hidden md:block" :columns="columns" :rows="rows" :loading="loading" expandable fit-expanded-to-container>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
      <template #cell-created_at="{ row }">
        <div class="flex flex-col items-start gap-1">
          <TimeText :value="row.created_at" mode="time" :muted="false" class="font-mono text-xs tabular-nums" />
          <UsageStatus :row="row" />
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
      <template #cell-client_ip="{ row }">
        <button
          v-if="row.client_ip"
          type="button"
          class="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 font-mono text-xs text-amber-700 transition-colors hover:border-amber-400 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300"
          :title="t('usage.ips.filter', { ip: row.client_ip })"
          data-testid="usage-ip"
          @click.stop="emit('filter-client-ip', row.client_ip)"
        >
          <span class="truncate">{{ row.client_ip }}</span>
        </button>
        <span v-else class="text-fg-subtle">—</span>
      </template>
      <template #cell-detail="{ row }">
        <div class="min-w-0 space-y-1">
          <UsageError v-if="!row.success" :row="row" />
          <p v-else class="truncate text-xs text-fg-muted" :title="row.matched_tier || undefined">{{ row.matched_tier || '—' }}</p>
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
            <p class="flex items-center gap-1.5 font-mono text-xs font-medium">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="hashColor(row.model || '')" aria-hidden="true" />
              <span class="break-all">{{ row.model || '—' }}</span>
            </p>
            <p class="mt-1 text-xs text-fg-subtle">
              <TimeText :value="row.created_at" mode="time" class="tabular-nums" />
            </p>
          </div>
          <UsageStatus :row="row" />
        </div>
        <UsageError v-if="!row.success" :row="row" class="mt-2" />
        <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-surface-2/60 p-3">
          <div>
            <p class="mb-1 text-xxs text-fg-subtle">{{ t('usage.tokens.title') }}</p>
            <UsageTokens :row="row" />
          </div>
          <div>
            <p class="mb-1 text-xxs text-fg-subtle">{{ t('usage.cols.cost') }}</p>
            <p class="font-mono text-xs font-medium">{{ row.billing_status === 'free' ? t('usage.free') : formatMoney(row.total_cost) }}</p>
            <SBadge v-if="row.billing_status !== 'billed' && row.billing_status !== 'free'" size="xs" class="mt-1" :tone="billingTone(row.billing_status)">{{
              t(`usage.billing.status.${row.billing_status}`)
            }}</SBadge>
          </div>
          <div class="col-span-2"><UsageTiming :row="row" /></div>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <template v-if="showUser">
            <dt class="text-fg-subtle">{{ t('common.user') }}</dt>
            <dd class="truncate">{{ userName(row) }}</dd>
          </template>
          <dt class="text-fg-subtle">{{ t('usage.request.apiKey') }}</dt>
          <dd class="truncate">{{ keyName(row) }}<span v-if="groupName(row)" class="text-fg-subtle"> · {{ groupName(row) }}</span></dd>
          <template v-if="showAccount">
            <dt class="text-fg-subtle">{{ t('common.account') }}</dt>
            <dd class="truncate">{{ row.account_name || (row.account_id ? '#' + row.account_id : '—') }}</dd>
          </template>
          <dt class="text-fg-subtle">{{ t('usage.request.clientIP') }}</dt>
          <dd class="min-w-0">
            <button
              v-if="row.client_ip"
              type="button"
              class="break-all text-left font-mono text-amber-700 dark:text-amber-300"
              :title="t('usage.ips.filter', { ip: row.client_ip })"
              @click="emit('filter-client-ip', row.client_ip)"
            >
              {{ row.client_ip }}
            </button>
            <span v-else class="text-fg-subtle">—</span>
          </dd>
          <template v-if="showClientRequestId && row.client_request_id">
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
  min-width: 1000px;
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
