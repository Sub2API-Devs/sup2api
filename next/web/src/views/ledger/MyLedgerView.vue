<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SPageHeader, SPagination, SSelect, SStatCard } from '@sub2api/ui'
import type { LedgerEntry } from '@/api/types'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, formatMoney } from '@/utils/format'
import TimeRangeFilter from '@/views/usage/TimeRangeFilter.vue'
import { rangeBounds, type RangeKey } from '@/views/usage/timeRange'
import LedgerTable from './LedgerTable.vue'
import { LEDGER_KINDS } from './kinds'

// "Mine > Usage records": the caller's balance and their own ledger.
const { t } = useI18n()
const auth = useAuthStore()

const balance = ref<string | null>(null)
const updatedAt = ref<string | null>(null)
const balanceLoading = ref(false)

async function loadBalance() {
  balanceLoading.value = true
  try {
    const r = await api.get<{ balance: string; updated_at?: string }>('/me/balance')
    balance.value = r?.balance ?? null
    updatedAt.value = r?.updated_at ?? null
  } catch {
    balance.value = null
  } finally {
    balanceLoading.value = false
  }
}

onMounted(() => {
  loadBalance()
  auth.refreshBalance()
})

const range = ref<RangeKey>('month')
const { items, loading, page, pageSize, total, filters, reload } = useList<LedgerEntry>('/me/ledger', { ...rangeBounds('month'), kind: '' })
const kindOptions = computed(() => [{ value: '', label: t('common.all') }, ...LEDGER_KINDS.map((k) => ({ value: k, label: t(`ledger.kinds.${k}`) }))])

const negative = computed(() => Number(balance.value) < 0)

function refresh() {
  loadBalance()
  auth.refreshBalance()
  reload()
}
</script>

<template>
  <div>
    <SPageHeader :title="t('ledger.myTitle')" :description="t('ledger.myDescription')">
      <template #actions>
        <SButton @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
      <template #filters>
        <div class="w-40">
          <label class="input-label">{{ t('ledger.cols.kind') }}</label>
          <SSelect v-model="filters.kind" :options="kindOptions" />
        </div>
        <TimeRangeFilter
          v-model:range="range"
          v-model:from="filters.from"
          v-model:to="filters.to"
          :keys="['all', 'today', '7d', '30d', 'month', 'custom']"
        />
      </template>
    </SPageHeader>

    <div class="mb-5 grid gap-4 md:grid-cols-3">
      <SStatCard
        :label="t('ledger.balance')"
        :value="formatMoney(balance)"
        :sub="updatedAt ? t('ledger.updatedAt', { time: formatDateTime(updatedAt) }) : undefined"
        icon="balance"
        :tone="negative ? 'danger' : 'primary'"
        :loading="balanceLoading"
      />
      <div v-if="negative" class="card card-body text-sm text-red-600 dark:text-red-400 md:col-span-2">
        {{ t('ledger.negativeHint') }}
      </div>
    </div>

    <div class="card overflow-hidden">
      <LedgerTable :rows="items" :loading="loading" :show-user="false" />
    </div>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
  </div>
</template>
