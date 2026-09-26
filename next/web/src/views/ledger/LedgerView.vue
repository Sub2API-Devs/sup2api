<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SButton, SPageHeader, SPagination, SSelect } from '@sub2api/ui'
import type { LedgerEntry } from '@/api/types'
import { useList } from '@/composables/useList'
import TimeRangeFilter from '@/views/usage/TimeRangeFilter.vue'
import { rangeBounds, type RangeKey } from '@/views/usage/timeRange'
import AdjustBalanceModal from './AdjustBalanceModal.vue'
import LedgerTable from './LedgerTable.vue'
import { LEDGER_KINDS } from './kinds'

const { t } = useI18n()
const route = useRoute()

const range = ref<RangeKey>('month')
const { items, loading, page, pageSize, total, filters, reload } = useList<LedgerEntry>('/ledger', {
  ...rangeBounds('month'),
  // Opened from the users page with ?user_id=<id>.
  user_id: typeof route.query.user_id === 'string' ? route.query.user_id : '',
  kind: ''
})

const kindOptions = computed(() => [{ value: '', label: t('common.all') }, ...LEDGER_KINDS.map((k) => ({ value: k, label: t(`ledger.kinds.${k}`) }))])
const adjustOpen = ref(false)
const adjustUser = computed(() => (/^\d+$/.test(String(filters.user_id || '')) ? Number(filters.user_id) : null))
</script>

<template>
  <div>
    <SPageHeader :title="t('ledger.title')" :description="t('ledger.description')">
      <template #actions>
        <SButton @click="reload">{{ t('common.refresh') }}</SButton>
        <SButton v-permission="'balance:adjust'" variant="primary" @click="adjustOpen = true">{{ t('ledger.adjust.button') }}</SButton>
      </template>
      <template #filters>
        <div class="w-28">
          <label class="input-label">{{ t('usage.filters.userId') }}</label>
          <input v-model.trim="filters.user_id" class="input" inputmode="numeric" placeholder="ID" />
        </div>
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

    <div class="card overflow-hidden">
      <LedgerTable :rows="items" :loading="loading" />
    </div>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />

    <AdjustBalanceModal v-model:open="adjustOpen" :user-id="adjustUser" @done="reload" />
  </div>
</template>
