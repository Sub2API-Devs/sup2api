<script setup lang="ts">
// Client IPs of the searched requests (GET …/summary?group_by=ip), busiest
// first: requests with their share, success rate, tokens, cost and the last
// call. Clicking an address filters the list by it; clicking the active one
// clears that filter.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SCopyButton, STable, type TableColumn } from '@sub2api/ui'
import TimeText from '@/components/TimeText.vue'
import type { UsageSummaryRow } from '@/api/types'
import { formatMoney, formatNumber, formatPercent } from '@/utils/format'

const props = defineProps<{ rows: UsageSummaryRow[]; loading?: boolean; active?: string }>()
const emit = defineEmits<{ (e: 'filter', ip: string): void }>()
const { t } = useI18n()

const LIMIT = 100
const max = computed(() => Math.max(1, ...props.rows.map((r) => Number(r.requests) || 0)))
const columns = computed<TableColumn[]>(() => [
  { key: 'key', label: t('usage.request.clientIP'), width: '280px' },
  { key: 'requests', label: t('usage.summary.requests') },
  { key: 'success', label: t('usage.summary.successRate'), align: 'right', width: '90px' },
  { key: 'tokens', label: t('usage.summary.tokens'), align: 'right', width: '120px' },
  { key: 'total_cost', label: t('usage.summary.cost'), align: 'right', width: '110px' },
  { key: 'last_at', label: t('usage.ips.lastAt'), align: 'right', width: '120px' }
])
</script>

<template>
  <SCard
    :title="t('usage.ips.title')"
    :subtitle="rows.length >= LIMIT ? t('usage.ips.top', { n: LIMIT }) : t('usage.ips.count', { n: rows.length })"
    :padded="false"
    class="mb-4 overflow-hidden"
    data-testid="usage-ip-panel"
  >
    <div class="max-h-96 overflow-y-auto">
      <STable :columns="columns" :rows="rows" :loading="loading" row-key="key" dense :empty-text="t('usage.ips.empty')">
        <template #cell-key="{ row }">
          <div class="flex min-w-0 items-center gap-1">
            <button
              type="button"
              class="min-w-0 truncate rounded-md border px-2 py-0.5 font-mono text-xs transition-colors"
              :class="
                row.key && row.key === active
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-line bg-surface-2/60 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
              "
              :disabled="!row.key"
              :aria-pressed="row.key === active"
              :title="row.key ? (row.key === active ? t('usage.ips.clear') : t('usage.ips.filter', { ip: row.key })) : t('usage.ips.unknown')"
              data-testid="usage-ip-filter"
              @click="emit('filter', row.key === active ? '' : row.key)"
            >
              {{ row.key || t('usage.ips.unknown') }}
            </button>
            <SCopyButton v-if="row.key" :text="row.key" icon-only class="shrink-0" />
          </div>
        </template>
        <template #cell-requests="{ row }">
          <div class="flex items-center gap-2">
            <span class="w-12 shrink-0 text-right font-mono text-xs tabular-nums">{{ formatNumber(row.requests) }}</span>
            <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span class="block h-full rounded-full bg-sky-500/70" :style="{ width: (Number(row.requests) / max) * 100 + '%' }" />
            </span>
          </div>
        </template>
        <template #cell-success="{ row }"
          ><span class="font-mono text-xs tabular-nums">{{ formatPercent(row.success, row.requests) }}</span></template
        >
        <template #cell-tokens="{ row }"
          ><span class="font-mono text-xs tabular-nums">{{ formatNumber((Number(row.input_tokens) || 0) + (Number(row.output_tokens) || 0)) }}</span></template
        >
        <template #cell-total_cost="{ row }"
          ><span class="font-mono text-xs tabular-nums">{{ formatMoney(row.total_cost) }}</span></template
        >
        <template #cell-last_at="{ row }"><TimeText :value="row.last_at" mode="relative" class="text-xs" /></template>
      </STable>
    </div>
  </SCard>
</template>
