<template>
  <div>
    <SPageHeader :title="host.t('myReferral')" />
    <RemoteView :loading="loading" :error="error" :ready="!!data" @retry="load">
      <SStack :gap="6" class="growth-page">
        <SCard :title="host.t('referralCode')">
          <div class="growth-code-row">
            <div class="growth-code">{{ data?.code || '—' }}</div>
            <SCopyButton :text="data?.code" variant="secondary" />
          </div>
        </SCard>

        <SCard v-if="data && !data.inviter_user_id" :title="host.t('bindInviter')">
          <form @submit.prevent="bindCode">
            <SField :label="host.t('inviterCode')" :error="bindError">
              <SInput v-model="inviterCode" :placeholder="host.t('inviterCode')" />
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
          <GrowthTable :columns="columns" :rows="data?.recent_commissions || []" :empty-text="host.t('noCommissions')" />
        </SCard>
      </SStack>
    </RemoteView>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SPageHeader, SCard, SButton, SCopyButton, SGrid, SInput, SField, SStack, SStatCard } from '@sub2api/ui'
import { errorMessage, useGrowthHost } from './host'
import { useRemote } from './useRemote'
import { commissionColumns } from './columns'
import RemoteView from './RemoteView.vue'
import GrowthTable from './GrowthTable.vue'

const host = useGrowthHost()
const { data, loading, error, load } = useRemote<Record<string, any>>('/me/referral')
const inviterCode = ref('')
const binding = ref(false)
const bindError = ref('')
const columns = commissionColumns()

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
