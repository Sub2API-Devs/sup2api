<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SButton, SField, SInput, SPageHeader, SPagination, SSelect, STimeRange, rangeBounds, type RangeKey } from '@sub2api/ui'
import type { LedgerEntry } from '@/api/types'
import { useList } from '@/composables/useList'
import AdjustBalanceModal from './AdjustBalanceModal.vue'
import LedgerTable from './LedgerTable.vue'
import { LEDGER_RANGES, useKindOptions } from './kinds'

const { t } = useI18n()
const route = useRoute()

const range = ref<RangeKey>('month')
const { items, loading, error, page, pageSize, total, filters, reload } = useList<LedgerEntry>('/ledger', {
  ...rangeBounds('month'),
  // Opened from the users page with ?user_id=<id>.
  user_id: typeof route.query.user_id === 'string' ? route.query.user_id : '',
  kind: ''
})

const kindOptions = useKindOptions()
const adjustOpen = ref(false)
const adjustUser = computed(() => (/^\d+$/.test(String(filters.user_id || '')) ? Number(filters.user_id) : null))
</script>

<template>
  <div>
    <SPageHeader :title="t('ledger.title')" :description="t('ledger.description')">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="reload">{{ t('common.refresh') }}</SButton>
        <SButton v-permission="'balance:adjust'" variant="primary" @click="adjustOpen = true">{{ t('ledger.adjust.button') }}</SButton>
      </template>
      <template #filters>
        <SField class="w-28" :label="t('usage.filters.userId')">
          <SInput v-model.trim="filters.user_id" inputmode="numeric" :placeholder="t('common.id')" />
        </SField>
        <SField class="w-40" :label="t('ledger.cols.kind')">
          <SSelect v-model="filters.kind" :options="kindOptions" />
        </SField>
        <STimeRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" :keys="LEDGER_RANGES" />
      </template>
    </SPageHeader>

    <LedgerTable :rows="items" :loading="loading" :error="error" @retry="reload">
      <template #footer><SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" /></template>
    </LedgerTable>

    <AdjustBalanceModal v-model:open="adjustOpen" :user-id="adjustUser" @done="reload" />
  </div>
</template>
