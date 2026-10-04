<template>
  <div>
    <SPageHeader :title="host.t('myReferral')" />
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px">
      <SCard :title="host.t('referralCode')">
        <div style="display: flex; align-items: center; gap: 1rem">
          <div class="growth-code">{{ data?.code || '...' }}</div>
          <SButton @click="copyCode" size="sm">{{ copied ? host.t('copied') : host.t('copyCode') }}</SButton>
        </div>
      </SCard>

      <SCard v-if="!data?.inviter_user_id" :title="host.t('bindInviter')">
        <form @submit.prevent="bindCode">
          <SField :label="host.t('inviterCode')" :error="bindError">
            <SInput v-model="inviterCode" :placeholder="host.t('inviterCode')" />
          </SField>
          <SButton type="submit" :loading="binding" style="margin-top: 1rem">{{ host.t('bind') }}</SButton>
        </form>
      </SCard>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem">
        <SStatCard :label="host.t('invitees')" :value="data?.invitees_count || 0" tone="primary" />
        <SStatCard :label="host.t('totalCommission')" :value="host.i18n.formatMoney(data?.total_commission || 0)" tone="success" />
      </div>

      <SCard v-if="data?.recent_commissions?.length" :title="host.t('recentCommissions')">
        <STable :columns="commissionColumns" :rows="data.recent_commissions">
          <template #cell-base_amount="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-commission="{ value }">{{ host.i18n.formatMoney(value) }}</template>
          <template #cell-event_type="{ value }">{{ host.t('event.' + value) }}</template>
          <template #cell-created_at="{ value }">{{ host.i18n.formatDateTime(value) }}</template>
        </STable>
      </SCard>
      <SEmpty v-else :text="host.t('noCommissions')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SPageHeader, SCard, SButton, SInput, SField, SStatCard, STable, SEmpty } from '@sub2api/ui'
import { useGrowthHost } from './host'

const host = useGrowthHost()
const data = ref<any>(null)
const copied = ref(false)
const inviterCode = ref('')
const binding = ref(false)
const bindError = ref('')

const commissionColumns = [
  { key: 'invitee_user_id', label: host.t('inviteeUserId') },
  { key: 'event_type', label: host.t('eventType') },
  { key: 'base_amount', label: host.t('baseAmount'), align: 'right' },
  { key: 'commission', label: host.t('commission'), align: 'right' },
  { key: 'created_at', label: host.t('createdAt') }
]

onMounted(async () => {
  try {
    data.value = await host.pluginApi.get('/me/referral')
  } catch (e) {
    host.toast(String(e), 'error')
  }
})

function copyCode() {
  if (data.value?.code) {
    navigator.clipboard.writeText(data.value.code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

async function bindCode() {
  if (!inviterCode.value.trim()) return
  binding.value = true
  bindError.value = ''
  try {
    await host.pluginApi.post('/me/referral/bind', { code: inviterCode.value.trim() })
    host.toast(host.t('bindSuccess'), 'success')
    data.value = await host.pluginApi.get('/me/referral')
  } catch (e: any) {
    bindError.value = e.message || host.t('bindFailed')
  } finally {
    binding.value = false
  }
}
</script>
