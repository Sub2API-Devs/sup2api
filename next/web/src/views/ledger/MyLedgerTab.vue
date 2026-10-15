<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SField, SGrid, SPagination, SSelect, SStatCard, STimeRange, rangeBounds, type RangeKey } from '@sub2api/ui'
import type { LedgerEntry } from '@/api/types'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, formatMoney } from '@/utils/format'
import LedgerTable from './LedgerTable.vue'
import { LEDGER_RANGES, useKindOptions } from './kinds'

// "Balance changes" tab of Mine > Usage records: the caller's balance and
// their own ledger (GET /me/balance, GET /me/ledger).
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
const kindOptions = useKindOptions()

const negative = computed(() => Number(balance.value) < 0)

function reloadAll() {
  loadBalance()
  auth.refreshBalance()
  reload()
}

defineExpose({ reload: reloadAll })
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <SField class="w-40" :label="t('ledger.cols.kind')">
        <SSelect v-model="filters.kind" :options="kindOptions" />
      </SField>
      <STimeRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" :keys="LEDGER_RANGES" />
    </div>

    <SGrid :cols="1" :md-cols="3" class="mb-5">
      <SStatCard
        :label="t('ledger.balance')"
        :value="formatMoney(balance)"
        :sub="updatedAt ? t('ledger.updatedAt', { time: formatDateTime(updatedAt) }) : undefined"
        icon="balance"
        :tone="negative ? 'danger' : 'primary'"
        :loading="balanceLoading"
      />
      <SAlert v-if="negative" tone="danger" class="self-center md:col-span-2" data-testid="ledger-negative">{{ t('ledger.negativeHint') }}</SAlert>
    </SGrid>

    <LedgerTable :rows="items" :loading="loading" :show-user="false">
      <template #footer><SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" /></template>
    </LedgerTable>
  </div>
</template>
