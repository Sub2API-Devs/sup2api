<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SDateRange, SPageHeader, SSelect, rangeBounds, type RangeKey, type TabItem } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { LEDGER_RANGES, useKindOptions } from '@/views/ledger/kinds'
import MyLedgerTab from '@/views/ledger/MyLedgerTab.vue'
import UsageRecords from './UsageRecords.vue'

// Mine > Usage records: the caller's request log, failed requests and client
// IPs (UsageRecords), plus their balance changes under the "ledger" log type
// (?tab=ledger), which has its own time range and kind in the search bar.
const { t } = useI18n()
const auth = useAuthStore()

const extraTabs = computed<TabItem[]>(() => (auth.has('balance:self:read') ? [{ key: 'ledger', label: t('stats.tabs.ledger') }] : []))
const tab = ref('records')

const ledgerRange = ref<RangeKey>('month')
const ledgerFilters = reactive({ ...rangeBounds('month'), kind: '' })
// Without a field label the empty choice names the filter, like the search bar's.
const kinds = useKindOptions()
const kindChoices = computed(() => kinds.value.map((x) => (x.value === '' ? { ...x, label: t('ledger.cols.kind') } : x)))

// The page owns the header and the refresh button, which sits in the search
// bar (#actions of UsageRecords) rather than on a row of its own; the records
// and the ledger tab each follow their own `revision` and report their
// loading state, so no ref reaches into a child's methods. A refresh under the
// ledger type reloads only the ledger.
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
    <SPageHeader :title="t('usage.myTitle')" :description="t('usage.myDescription')" />

    <UsageRecords
      v-model:loading="recordsLoading"
      :revision="recordsRevision"
      list-path="/me/usage"
      summary-path="/me/usage/summary"
      default-range="7d"
      :extra-tabs="extraTabs"
      @update:tab="tab = $event"
    >
      <template #actions>
        <SButton size="sm" :loading="loading" icon="refresh" @click="refresh">{{ t('common.refresh') }}</SButton>
      </template>
      <template #tab-ledger-range>
        <SDateRange v-model:range="ledgerRange" v-model:from="ledgerFilters.from" v-model:to="ledgerFilters.to" :keys="LEDGER_RANGES" size="sm" :label="false" />
      </template>
      <template #tab-ledger-filters>
        <SSelect v-model="ledgerFilters.kind" size="sm" :aria-label="t('ledger.cols.kind')" :options="kindChoices" data-testid="filter-ledger-kind" />
      </template>
      <template #tab-ledger>
        <MyLedgerTab v-model:loading="ledgerLoading" :filters="ledgerFilters" :revision="ledgerRevision" />
      </template>
    </UsageRecords>
  </div>
</template>
