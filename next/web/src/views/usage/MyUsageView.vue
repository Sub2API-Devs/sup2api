<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SPageHeader, SPagination, SSelect, STabs, type TabItem } from '@sub2api/ui'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import MyLedgerTab from '@/views/ledger/MyLedgerTab.vue'
import TimeRangeFilter from './TimeRangeFilter.vue'
import UsageTable from './UsageTable.vue'
import { rangeBounds, type RangeKey } from './timeRange'
import type { UsageRow } from './usage'

// Mine > Usage records: the caller's request log and, on a second tab, their
// balance and its changes. ?tab=ledger opens the latter. Totals and charts
// live in Mine > Usage statistics (MyStatsView).
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

type TabKey = 'requests' | 'ledger'
const tabs = computed<TabItem[]>(() => {
  const list: TabItem[] = [{ key: 'requests', label: t('usage.tabs.requests') }]
  if (auth.has('balance:self:read')) list.push({ key: 'ledger', label: t('usage.tabs.ledger') })
  return list
})
const tab = ref<TabKey>(route.query.tab === 'ledger' && auth.has('balance:self:read') ? 'ledger' : 'requests')
watch(tab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } })
})

const range = ref<RangeKey>('7d')
const { items, loading, page, pageSize, total, filters, reload } = useList<UsageRow>('/me/usage', {
  ...rangeBounds('7d'),
  model: '',
  success: ''
})

const successOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'true', label: t('usage.success.ok') },
  { value: 'false', label: t('usage.success.failed') }
])

const ledgerRef = ref<InstanceType<typeof MyLedgerTab> | null>(null)

function refresh() {
  if (tab.value === 'ledger') ledgerRef.value?.reload()
  else reload()
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.myTitle')" :description="t('usage.myDescription')">
      <template #actions>
        <SButton @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
      <template v-if="tab === 'requests'" #filters>
        <TimeRangeFilter v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" />
        <div class="w-48">
          <label class="input-label">{{ t('common.model') }}</label>
          <input v-model.trim="filters.model" class="input" placeholder="claude-sonnet-*" />
        </div>
        <div class="w-32">
          <label class="input-label">{{ t('common.status') }}</label>
          <SSelect v-model="filters.success" :options="successOptions" />
        </div>
      </template>
    </SPageHeader>

    <STabs v-if="tabs.length > 1" v-model="tab" :tabs="tabs" class="mb-4" />

    <template v-if="tab === 'requests'">
      <div class="card overflow-hidden">
        <UsageTable :rows="items" :loading="loading" :show-user="false" :show-account="false" :detail-path="(id: number) => `/me/usage/${id}`" />
      </div>
      <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
    </template>

    <MyLedgerTab v-else ref="ledgerRef" />
  </div>
</template>
