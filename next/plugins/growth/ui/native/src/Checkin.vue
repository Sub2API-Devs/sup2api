<template>
  <div>
    <SPageHeader :title="host.t('checkinTitle')" :description="host.t('checkinDesc')" />
    <RemoteView :loading="loading" :error="error" :ready="!!status" @retry="load">
      <SStack :gap="6" class="growth-page">
        <SCard>
          <div class="growth-checkin">
            <SButton v-if="status?.enabled && !status.checked_in_today" variant="primary" size="lg" class="growth-checkin-btn" :loading="checking" @click="doCheckin">
              {{ host.t('checkinButton') }}
            </SButton>
            <div v-else-if="status?.checked_in_today" class="growth-stat">
              <div class="growth-stat-label">{{ host.t('checkedIn') }}</div>
              <div class="growth-stat-value">{{ host.i18n.formatMoney(status.today_quota) }}</div>
            </div>
            <SHint v-else>{{ host.t('notConfigured') }}</SHint>
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
          <GrowthTable :columns="columns" :rows="status.recent_checkins" row-key="checkin_date" />
        </SCard>
      </SStack>
    </RemoteView>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SPageHeader, SCard, SButton, SGrid, SHint, SStack, SStatCard } from '@sub2api/ui'
import { errorMessage, useGrowthHost } from './host'
import { useRemote } from './useRemote'
import { checkinColumns } from './columns'
import RemoteView from './RemoteView.vue'
import GrowthTable from './GrowthTable.vue'

const host = useGrowthHost()
const { data: status, loading, error, load } = useRemote<Record<string, any>>('/me/checkin/status')
const checking = ref(false)
const columns = checkinColumns()

async function doCheckin() {
  checking.value = true
  try {
    const result = await host.pluginApi.post<{ quota_awarded?: number }>('/me/checkin', {})
    host.toast(host.t('checkinSuccessAmount', { amount: host.i18n.formatMoney(result?.quota_awarded) }), 'success')
    await load()
  } catch (e) {
    host.toast(errorMessage(e, host.t('checkinFailed')), 'error')
  } finally {
    checking.value = false
  }
}
</script>
