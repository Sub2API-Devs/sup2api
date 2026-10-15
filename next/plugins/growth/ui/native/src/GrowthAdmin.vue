<template>
  <div>
    <SPageHeader :title="host.t('adminTitle')" />
    <SStack :gap="6">
      <SGrid template="repeat(auto-fit, minmax(200px, 1fr))">
        <SStatCard v-for="c in statCards" :key="c.key" :label="host.t(c.key)" :value="c.value" :icon="c.icon" :tone="c.tone" :loading="!stats" />
      </SGrid>

      <STabs v-model="activeTab" :tabs="tabs" />

      <SCard :padded="false">
        <GrowthTable :key="current.key" :columns="current.columns" :rows="current.list.items.value" :loading="current.list.loading.value" />
        <SPagination v-model:page="current.list.page.value" v-model:page-size="current.list.pageSize.value" :total="current.list.total.value" class="growth-pager" />
      </SCard>
    </SStack>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useList } from '@sub2api/host'
import { SPageHeader, SGrid, SStack, SStatCard, STabs, SCard, SPagination } from '@sub2api/ui'
import { errorMessage, useGrowthHost } from './host'
import { checkinColumns, commissionColumns, referralColumns } from './columns'
import GrowthTable from './GrowthTable.vue'

type Row = Record<string, any>

const host = useGrowthHost()
const stats = ref<Row | null>(null)
const onError = (e: unknown) => host.toast(errorMessage(e, host.t('loadFailed')), 'error')

// One tab per record list; all three load on mount and paginate independently.
const sections = [
  { key: 'referrals', columns: referralColumns(), list: useList<Row>(host.pluginApi, '/admin/referrals', {}, { onError }) },
  { key: 'commissions', columns: commissionColumns(true), list: useList<Row>(host.pluginApi, '/admin/commissions', {}, { onError }) },
  { key: 'checkins', columns: checkinColumns(true), list: useList<Row>(host.pluginApi, '/admin/checkins', {}, { onError }) }
]
const tabs = sections.map((s) => ({ key: s.key, label: host.t(s.key) }))
const activeTab = ref(sections[0].key)
const current = computed(() => sections.find((s) => s.key === activeTab.value) ?? sections[0])

const statCards = computed(() => {
  const s = stats.value
  const { formatNumber, formatMoney } = host.i18n
  return [
    { key: 'totalReferrals', value: formatNumber(s?.total_referrals ?? 0), icon: 'user', tone: 'primary' as const },
    { key: 'totalCommission', value: formatMoney(s?.total_commission ?? 0), icon: 'balance', tone: 'success' as const },
    { key: 'totalCheckins', value: formatNumber(s?.total_checkins ?? 0), icon: 'check', tone: 'primary' as const },
    { key: 'todayCheckins', value: formatNumber(s?.today_checkins ?? 0), icon: 'clock', tone: 'warning' as const }
  ]
})

onMounted(async () => {
  try {
    stats.value = await host.pluginApi.get('/admin/stats')
  } catch (e) {
    stats.value = {}
    onError(e)
  }
})
</script>
