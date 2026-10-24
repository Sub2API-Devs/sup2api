<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SPageHeader, STabs, type TabItem } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import MyLedgerTab from '@/views/ledger/MyLedgerTab.vue'
import UsageRecords from './UsageRecords.vue'

// Mine > Usage records: the caller's request log and, on a second tab, their
// balance and its changes. ?tab=ledger opens the latter. Charts by model
// live in Mine > Usage statistics (MyStatsView).
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

type TabKey = 'requests' | 'ledger'
const tabs = computed<TabItem[]>(() => {
  const list: TabItem[] = [{ key: 'requests', label: t('usage.tabs.requests') }]
  if (auth.has('balance:self:read')) list.push({ key: 'ledger', label: t('usage.tabs.ledger') })
  return list
})
const tab = ref<TabKey>(route.query.tab === 'ledger' && auth.has('balance:self:read') ? 'ledger' : 'requests')
watch(tab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } })
})

// The page owns the header; the open tab follows `revision` and reports its
// loading state, so no ref reaches into a child's methods.
const revision = ref(0)
const loading = ref(false)

function refresh() {
  revision.value++
}
</script>

<template>
  <div>
    <SPageHeader :title="t('usage.myTitle')" :description="t('usage.myDescription')">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>

    <STabs v-model="tab" :tabs="tabs">
      <!-- v-show: the search survives a visit to the ledger tab -->
      <UsageRecords v-show="tab === 'requests'" v-model:loading="loading" :revision="revision" list-path="/me/usage" summary-path="/me/usage/summary" default-range="7d" />
      <MyLedgerTab v-if="tab === 'ledger'" v-model:loading="loading" :revision="revision" />
    </STabs>
  </div>
</template>
