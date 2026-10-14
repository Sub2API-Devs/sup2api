<template>
  <div>
    <SPageHeader :title="host.t('adminTitle')" />
    <SStack :gap="6">
      <SGrid template="repeat(auto-fit, minmax(200px, 1fr))">
        <SStatCard :label="host.t('totalReferrals')" :value="host.i18n.formatNumber(stats?.total_referrals ?? 0)" icon="user" tone="primary" :loading="!stats" />
        <SStatCard :label="host.t('totalCommission')" :value="host.i18n.formatMoney(stats?.total_commission ?? 0)" icon="balance" tone="success" :loading="!stats" />
        <SStatCard :label="host.t('totalCheckins')" :value="host.i18n.formatNumber(stats?.total_checkins ?? 0)" icon="check" tone="primary" :loading="!stats" />
        <SStatCard :label="host.t('todayCheckins')" :value="host.i18n.formatNumber(stats?.today_checkins ?? 0)" icon="clock" tone="warning" :loading="!stats" />
      </SGrid>

      <STabs v-model="activeTab" :tabs="tabs" />

      <SCard v-if="activeTab === 'referrals'" :padded="false">
        <STable :columns="referralColumns" :rows="referralList.items.value" :loading="referralList.loading.value" :empty-text="host.t('noData')">
          <template #cell-commission="{ row }">{{ host.i18n.formatMoney(row.commission) }}</template>
          <template #cell-bound_at="{ row }">{{ host.i18n.formatDateTime(row.bound_at) }}</template>
        </STable>
        <SPagination
          v-model:page="referralList.page.value"
          v-model:page-size="referralList.pageSize.value"
          :total="referralList.total.value"
          class="growth-pager"
        />
      </SCard>

      <SCard v-if="activeTab === 'commissions'" :padded="false">
        <STable :columns="commissionColumns" :rows="commissionList.items.value" :loading="commissionList.loading.value" :empty-text="host.t('noData')">
          <template #cell-base_amount="{ row }">{{ host.i18n.formatMoney(row.base_amount) }}</template>
          <template #cell-commission="{ row }">{{ host.i18n.formatMoney(row.commission) }}</template>
          <template #cell-event_type="{ row }">{{ host.t('event.' + row.event_type) }}</template>
          <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        </STable>
        <SPagination
          v-model:page="commissionList.page.value"
          v-model:page-size="commissionList.pageSize.value"
          :total="commissionList.total.value"
          class="growth-pager"
        />
      </SCard>

      <SCard v-if="activeTab === 'checkins'" :padded="false">
        <STable :columns="checkinColumns" :rows="checkinList.items.value" :loading="checkinList.loading.value" :empty-text="host.t('noData')">
          <template #cell-quota_awarded="{ row }">{{ host.i18n.formatMoney(row.quota_awarded) }}</template>
          <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        </STable>
        <SPagination
          v-model:page="checkinList.page.value"
          v-model:page-size="checkinList.pageSize.value"
          :total="checkinList.total.value"
          class="growth-pager"
        />
      </SCard>
    </SStack>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useList } from '@sub2api/host'
import { SPageHeader, SGrid, SStack, SStatCard, STabs, SCard, STable, SPagination, type TableColumn } from '@sub2api/ui'
import { errorMessage, useGrowthHost } from './host'

type Row = Record<string, any>

const host = useGrowthHost()
const stats = ref<any>(null)
const activeTab = ref('referrals')

const tabs = [
  { key: 'referrals', label: host.t('referrals') },
  { key: 'commissions', label: host.t('commissions') },
  { key: 'checkins', label: host.t('checkins') }
]

const referralColumns: TableColumn[] = [
  { key: 'user_id', label: host.t('userId') },
  { key: 'code', label: host.t('code') },
  { key: 'inviter_user_id', label: host.t('inviterUserId') },
  { key: 'invitees', label: host.t('invitees') },
  { key: 'commission', label: host.t('totalCommission'), align: 'right' },
  { key: 'bound_at', label: host.t('boundAt') }
]

const commissionColumns: TableColumn[] = [
  { key: 'inviter_user_id', label: host.t('inviterUserId') },
  { key: 'invitee_user_id', label: host.t('inviteeUserId') },
  { key: 'event_type', label: host.t('eventType') },
  { key: 'base_amount', label: host.t('baseAmount'), align: 'right' },
  { key: 'commission', label: host.t('commission'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

const checkinColumns: TableColumn[] = [
  { key: 'user_id', label: host.t('userId') },
  { key: 'checkin_date', label: host.t('checkinDate') },
  { key: 'quota_awarded', label: host.t('quotaAwarded'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

const onError = (e: unknown) => host.toast(errorMessage(e, host.t('loadFailed')), 'error')
const referralList = useList<Row>(host.pluginApi, '/admin/referrals', {}, { onError })
const commissionList = useList<Row>(host.pluginApi, '/admin/commissions', {}, { onError })
const checkinList = useList<Row>(host.pluginApi, '/admin/checkins', {}, { onError })

onMounted(async () => {
  try {
    stats.value = await host.pluginApi.get('/admin/stats')
  } catch (e) {
    stats.value = {}
    onError(e)
  }
})
</script>
