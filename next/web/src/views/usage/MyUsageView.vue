<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SPageHeader, type TabItem } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import MyLedgerTab from '@/views/ledger/MyLedgerTab.vue'
import UsageRecords from './UsageRecords.vue'

// Mine > Usage records: the caller's statistics, request log, failed
// requests and client IPs (UsageRecords), plus their balance changes on the
// "ledger" tab (?tab=ledger). The old Usage statistics page redirects here.
const { t } = useI18n()
const auth = useAuthStore()

const extraTabs = computed<TabItem[]>(() => (auth.has('balance:self:read') ? [{ key: 'ledger', label: t('stats.tabs.ledger') }] : []))
const tab = ref('records')

// The page owns the header; the records and the ledger tab each follow their
// own `revision` and report their loading state, so no ref reaches into a
// child's methods. A refresh on the ledger tab reloads only the ledger.
const recordsRevision = ref(0)
const ledgerRevision = ref(0)
const recordsLoading = ref(false)
const ledgerLoading = ref(false)
const loading = computed(() => (tab.value === 'ledger' ? ledgerLoading.value : recordsLoading.value))

function refresh() {
  if (tab.value === 'ledger') ledgerRevision.value++
  else recordsRevision.value++
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.myTitle')" :description="t('usage.myDescription')">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>

    <UsageRecords
      v-model:loading="recordsLoading"
      :revision="recordsRevision"
      list-path="/me/usage"
      summary-path="/me/usage/summary"
      default-range="7d"
      :extra-tabs="extraTabs"
      @update:tab="tab = $event"
    >
      <template #tab-ledger>
        <MyLedgerTab v-model:loading="ledgerLoading" :revision="ledgerRevision" />
      </template>
    </UsageRecords>
  </div>
</template>
