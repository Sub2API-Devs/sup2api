<template>
  <div>
    <SPageHeader :title="host.t('adminTitle')" />
    <div style="display: flex; flex-direction: column; gap: 1.5rem">
      <div v-if="stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem">
        <SStatCard :label="host.t('totalReferrals')" :value="stats.total_referrals" tone="primary" />
        <SStatCard :label="host.t('totalCommission')" :value="host.i18n.formatMoney(stats.total_commission)" tone="success" />
        <SStatCard :label="host.t('totalCheckins')" :value="stats.total_checkins" tone="info" />
        <SStatCard :label="host.t('todayCheckins')" :value="stats.today_checkins" tone="warning" />
      </div>

      <STabs :tabs="tabs" v-model="activeTab" />

      <SCard v-if="activeTab === 'referrals'">
        <div v-if="referralList.loading.value">{{ host.i18n.t('ui.loading') }}</div>
        <STable v-else :columns="referralColumns" :rows="referralList.items.value">
          <template #cell-commission="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-bound_at="{ value }">{{ host.i18n.formatDateTime(value) }}</template>
        </STable>
        <SPagination v-model:page="referralList.page.value" :page-size="referralList.pageSize.value" :total="referralList.total.value" />
      </SCard>

      <SCard v-if="activeTab === 'commissions'">
        <div v-if="commissionList.loading.value">{{ host.i18n.t('ui.loading') }}</div>
        <STable v-else :columns="commissionColumns" :rows="commissionList.items.value">
          <template #cell-base_amount="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-commission="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-event_type="{ value }">{{ host.t('event.' + value) }}</template>
          <template #cell-created_at="{ value }">{{ host.i18n.formatDateTime(value) }}</template>
        </STable>
        <SPagination v-model:page="commissionList.page.value" :page-size="commissionList.pageSize.value" :total="commissionList.total.value" />
      </SCard>

      <SCard v-if="activeTab === 'checkins'">
        <div v-if="checkinList.loading.value">{{ host.i18n.t('ui.loading') }}</div>
        <STable v-else :columns="checkinColumns" :rows="checkinList.items.value">
          <template #cell-quota_awarded="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-created_at="{ value }">{{ host.i18n.formatDateTime(value) }}</template>
        </STable>
        <SPagination v-model:page="checkinList.page.value" :page-size="checkinList.pageSize.value" :total="checkinList.total.value" />
      </SCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SPageHeader, SStatCard, STabs, SCard, STable, SPagination, useList } from '@sub2api/ui'
import { useGrowthHost } from './host'

const host = useGrowthHost()
const stats = ref<any>(null)
const activeTab = ref('referrals')

const tabs = [
  { key: 'referrals', label: host.t('referrals') },
  { key: 'commissions', label: host.t('commissions') },
  { key: 'checkins', label: host.t('checkins') }
]

const referralColumns = [
  { key: 'user_id', label: host.t('userId') },
  { key: 'code', label: host.t('code') },
  { key: 'inviter_user_id', label: host.t('inviterUserId') },
  { key: 'invitees', label: host.t('invitees') },
  { key: 'commission', label: host.t('totalCommission'), align: 'right' },
  { key: 'bound_at', label: host.t('boundAt') }
]

const commissionColumns = [
  { key: 'inviter_user_id', label: host.t('inviterUserId') },
  { key: 'invitee_user_id', label: host.t('inviteeUserId') },
  { key: 'event_type', label: host.t('eventType') },
  { key: 'base_amount', label: host.t('baseAmount'), align: 'right' },
  { key: 'commission', label: host.t('commission'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

const checkinColumns = [
  { key: 'user_id', label: host.t('userId') },
  { key: 'checkin_date', label: host.t('checkinDate') },
  { key: 'quota_awarded', label: host.t('quotaAwarded'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

const referralList = useList(host.pluginApi, '/admin/referrals', {})
const commissionList = useList(host.pluginApi, '/admin/commissions', {})
const checkinList = useList(host.pluginApi, '/admin/checkins', {})

onMounted(async () => {
  try {
    stats.value = await host.pluginApi.get('/admin/stats')
  } catch (e) {
    host.toast(String(e), 'error')
  }
})
</script>
