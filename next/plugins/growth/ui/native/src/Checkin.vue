<template>
  <div>
    <SPageHeader :title="host.t('checkinTitle')" :description="host.t('checkinDesc')" />
    <div v-if="loading && !status" class="growth-center"><SSpinner /></div>
    <SCard v-else-if="loadError && !status" class="growth-page">
      <SEmpty icon="warning" :text="loadError">
        <SButton size="sm" @click="loadStatus">{{ host.t('retry') }}</SButton>
      </SEmpty>
    </SCard>
    <SStack v-else :gap="6" class="growth-page">
      <SCard>
        <div class="growth-checkin">
          <SButton
            v-if="status?.enabled && !status?.checked_in_today"
            variant="primary"
            size="lg"
            class="growth-checkin-btn"
            :loading="checking"
            @click="doCheckin"
          >
            {{ host.t('checkinButton') }}
          </SButton>
          <div v-else-if="status?.checked_in_today" class="growth-stat">
            <div class="growth-stat-label">{{ host.t('checkedIn') }}</div>
            <div class="growth-stat-value">{{ host.i18n.formatMoney(status.today_quota) }}</div>
          </div>
          <p v-else class="growth-muted">{{ host.t('notConfigured') }}</p>
        </div>
      </SCard>

      <SGrid v-if="status?.enabled" template="repeat(auto-fit, minmax(150px, 1fr))">
        <SStatCard
          :label="host.t('consecutiveDays')"
          :value="host.t('daysValue', { n: host.i18n.formatNumber(status.consecutive_days ?? 0) })"
          icon="clock"
          tone="primary"
        />
        <SStatCard :label="host.t('totalCheckins')" :value="host.i18n.formatNumber(status.total_checkins ?? 0)" icon="check" tone="warning" />
        <SStatCard :label="host.t('totalQuota')" :value="host.i18n.formatMoney(status.total_quota)" icon="balance" tone="success" />
      </SGrid>

      <SCard v-if="status?.recent_checkins?.length" :title="host.t('recentCheckins')" :padded="false">
        <STable :columns="checkinColumns" :rows="status.recent_checkins" row-key="checkin_date">
          <template #cell-quota_awarded="{ row }">{{ host.i18n.formatMoney(row.quota_awarded) }}</template>
          <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        </STable>
      </SCard>
    </SStack>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SPageHeader, SCard, SButton, SEmpty, SGrid, SSpinner, SStack, SStatCard, STable, type TableColumn } from '@sub2api/ui'
import { errorMessage, useGrowthHost } from './host'

const host = useGrowthHost()
const status = ref<any>(null)
const loading = ref(false)
const loadError = ref('')
const checking = ref(false)

const checkinColumns: TableColumn[] = [
  { key: 'checkin_date', label: host.t('checkinDate') },
  { key: 'quota_awarded', label: host.t('quotaAwarded'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

onMounted(loadStatus)

async function loadStatus() {
  loading.value = true
  loadError.value = ''
  try {
    status.value = await host.pluginApi.get('/me/checkin/status')
  } catch (e) {
    loadError.value = errorMessage(e, host.t('loadFailed'))
    if (status.value) host.toast(loadError.value, 'error')
  } finally {
    loading.value = false
  }
}

async function doCheckin() {
  checking.value = true
  try {
    const result = await host.pluginApi.post<{ quota_awarded?: number }>('/me/checkin', {})
    host.toast(host.t('checkinSuccessAmount', { amount: host.i18n.formatMoney(result?.quota_awarded) }), 'success')
    await loadStatus()
  } catch (e) {
    host.toast(errorMessage(e, host.t('checkinFailed')), 'error')
  } finally {
    checking.value = false
  }
}
</script>
