<template>
  <div>
    <SPageHeader :title="host.t('myReferral')" />
    <div v-if="loading && !data" class="growth-center"><SSpinner /></div>
    <SCard v-else-if="loadError && !data" class="growth-page">
      <SEmpty icon="warning" :text="loadError">
        <SButton size="sm" @click="load">{{ host.t('retry') }}</SButton>
      </SEmpty>
    </SCard>
    <SStack v-else :gap="6" class="growth-page">
      <SCard :title="host.t('referralCode')">
        <div class="growth-code-row">
          <div class="growth-code">{{ data?.code || '—' }}</div>
          <SCopyButton :text="data?.code" :label="host.t('copyCode')" variant="secondary" />
        </div>
      </SCard>

      <SCard v-if="data && !data.inviter_user_id" :title="host.t('bindInviter')">
        <form @submit.prevent="bindCode">
          <SField :label="host.t('inviterCode')" :error="bindError">
            <SInput v-model="inviterCode" :error="!!bindError" :placeholder="host.t('inviterCode')" />
          </SField>
          <div class="growth-form-actions">
            <SButton type="submit" variant="primary" :loading="binding" :disabled="!inviterCode.trim()">{{ host.t('bind') }}</SButton>
          </div>
        </form>
      </SCard>

      <SGrid template="repeat(auto-fit, minmax(200px, 1fr))">
        <SStatCard :label="host.t('invitees')" :value="host.i18n.formatNumber(data?.invitees_count || 0)" icon="user" tone="primary" />
        <SStatCard :label="host.t('totalCommission')" :value="host.i18n.formatMoney(data?.total_commission || 0)" icon="balance" tone="success" />
      </SGrid>

      <SCard :title="host.t('recentCommissions')" :padded="false">
        <STable :columns="commissionColumns" :rows="data?.recent_commissions || []" :empty-text="host.t('noCommissions')">
          <template #cell-base_amount="{ row }">{{ host.i18n.formatMoney(row.base_amount) }}</template>
          <template #cell-commission="{ row }">{{ host.i18n.formatMoney(row.commission) }}</template>
          <template #cell-event_type="{ row }">{{ host.t('event.' + row.event_type) }}</template>
          <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        </STable>
      </SCard>
    </SStack>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SPageHeader, SCard, SButton, SCopyButton, SEmpty, SGrid, SInput, SField, SSpinner, SStack, SStatCard, STable, type TableColumn } from '@sub2api/ui'
import { errorMessage, useGrowthHost } from './host'

const host = useGrowthHost()
const data = ref<any>(null)
const loading = ref(false)
const loadError = ref('')
const inviterCode = ref('')
const binding = ref(false)
const bindError = ref('')

const commissionColumns: TableColumn[] = [
  { key: 'invitee_user_id', label: host.t('inviteeUserId') },
  { key: 'event_type', label: host.t('eventType') },
  { key: 'base_amount', label: host.t('baseAmount'), align: 'right' },
  { key: 'commission', label: host.t('commission'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await host.pluginApi.get('/me/referral')
  } catch (e) {
    loadError.value = errorMessage(e, host.t('loadFailed'))
    if (data.value) host.toast(loadError.value, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function bindCode() {
  const code = inviterCode.value.trim()
  if (!code) return
  binding.value = true
  bindError.value = ''
  try {
    await host.pluginApi.post('/me/referral/bind', { code })
    host.toast(host.t('bindSuccess'), 'success')
    inviterCode.value = ''
    await load()
  } catch (e) {
    bindError.value = errorMessage(e, host.t('bindFailed'))
  } finally {
    binding.value = false
  }
}
</script>
