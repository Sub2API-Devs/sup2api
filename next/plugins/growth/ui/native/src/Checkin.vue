<template>
  <div>
    <SPageHeader :title="host.t('checkinTitle')" :description="host.t('checkinDesc')" />
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px">
      <SCard>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 2rem">
          <SButton
            v-if="status?.enabled && !status?.checked_in_today"
            @click="doCheckin"
            :loading="checking"
            size="lg"
            class="growth-checkin-btn"
          >
            {{ host.t('checkinButton') }}
          </SButton>
          <div v-else-if="status?.checked_in_today" class="growth-stat">
            <div class="growth-stat-label">{{ host.t('checkedIn') }}</div>
            <div class="growth-stat-value">{{ host.i18n.formatMoney(status.today_quota) }}</div>
          </div>
          <div v-else style="color: var(--color-text-secondary)">{{ host.t('notConfigured') }}</div>
        </div>
      </SCard>

      <div v-if="status?.enabled" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem">
        <SStatCard :label="host.t('consecutiveDays')" :value="status.consecutive_days" :sub="host.t('days')" tone="primary" />
        <SStatCard :label="host.t('totalCheckins')" :value="status.total_checkins" tone="info" />
        <SStatCard :label="host.t('totalQuota')" :value="host.i18n.formatMoney(status.total_quota)" tone="success" />
      </div>

      <SCard v-if="status?.recent_checkins?.length" :title="host.t('recentCheckins')">
        <STable :columns="checkinColumns" :rows="status.recent_checkins">
          <template #cell-quota_awarded="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-created_at="{ value }">{{ host.i18n.formatDateTime(value) }}</template>
        </STable>
      </SCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SPageHeader, SCard, SButton, SStatCard, STable } from '@sub2api/ui'
import { useGrowthHost } from './host'

const host = useGrowthHost()
const status = ref<any>(null)
const checking = ref(false)

const checkinColumns = [
  { key: 'checkin_date', label: host.t('checkinDate') },
  { key: 'quota_awarded', label: host.t('quotaAwarded'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

onMounted(loadStatus)

async function loadStatus() {
  try {
    status.value = await host.pluginApi.get('/me/checkin/status')
  } catch (e) {
    host.toast(String(e), 'error')
  }
}

async function doCheckin() {
  checking.value = true
  try {
    const result = await host.pluginApi.post('/me/checkin', {})
    host.toast(host.t('checkinSuccess') + ': ' + host.i18n.formatMoney(result.quota_awarded), 'success')
    await loadStatus()
  } catch (e: any) {
    host.toast(e.message || host.t('checkinFailed'), 'error')
  } finally {
    checking.value = false
  }
}
</script>
