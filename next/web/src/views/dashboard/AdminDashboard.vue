<script setup lang="ts">
// The operator dashboard (usage:all:read, design §4.4): today's figures from
// GET /usage/overview (calendar days in the browser's time zone; the users
// and accounts cards only with the permission to read them), the charts of a
// chosen range from /usage/summary, the users who spent most and the share of
// each group. A ranked user or a group opens the usage records filtered by it.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCard, SDateRange, SGrid, SSegmented, SStatCard, rangeBounds, type RangeKey } from '@sub2api/ui'
import type { UsageOverview, UsageSummaryRow } from '@/api/types'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import DistributionCard from '@/components/stats/DistributionCard.vue'
import RankingBars from '@/components/stats/RankingBars.vue'
import UsageCharts from '@/components/stats/UsageCharts.vue'
import { autoGranularity, browserTZ, formatMs, formatTokens, hitRate, hourAllowed, num, rowTokens, type Granularity, type RankMetric } from '@/components/stats/stats'
import { useUsageSummary } from '@/views/usage/useUsageSummary'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_KEYS } from '@/composables/useOwnership'
import { errorMessage } from '@/utils/errors'
import { formatMoney, formatNumber } from '@/utils/format'

const props = withDefaults(defineProps<{ revision?: number }>(), { revision: 0 })
const emit = defineEmits<{ (e: 'update:loading', v: boolean): void }>()
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

// Today's figures.
const overview = ref<UsageOverview | null>(null)
const overviewError = ref<unknown>(null)
const loadingOverview = ref(false)
async function loadOverview() {
  loadingOverview.value = true
  overviewError.value = null
  try {
    overview.value = await api.get<UsageOverview>('/usage/overview', { tz: browserTZ() })
  } catch (e) {
    overviewError.value = e
  } finally {
    loadingOverview.value = false
  }
}

const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) + '%' : '—')
const cards = computed(() => {
  const o = overview.value
  const today = o?.today
  const cost = num(today?.total_cost)
  const standard = num(today?.standard_cost)
  const y = num(o?.yesterday.requests)
  const h = hitRate(today)
  return {
    requests: num(today?.requests),
    trend: y ? ((num(today?.requests) - y) / y) * 100 : null,
    success: pct(num(today?.success), num(today?.requests)),
    requests30: num(o?.last_30d.requests),
    cost,
    standard: Math.abs(standard - cost) > 1e-9 ? standard : null,
    cost30: num(o?.last_30d.total_cost),
    users: o?.users,
    accounts: o?.accounts,
    tokens: today ? rowTokens(today) : 0,
    input: num(today?.input_tokens),
    output: num(today?.output_tokens),
    read: num(today?.cache_read_tokens),
    write: num(today?.cache_creation_tokens),
    hit: h == null ? '—' : (h * 100).toFixed(1) + '%',
    rpm: num(o?.last_5m.requests) / 5,
    tpm: num(o?.last_5m.tokens) / 5,
    firstToken: num(today?.first_token_ms_avg),
    latency: num(today?.latency_ms_avg)
  }
})
const accountsTone = computed<'primary' | 'warning' | 'danger'>(() => {
  const a = cards.value.accounts
  if (!a) return 'primary'
  return a.available === 0 && a.total ? 'danger' : a.auto_disabled ? 'warning' : 'primary'
})
const first = computed(() => loadingOverview.value && !overview.value)

// The charts' range: last 7 days by default, automatic granularity.
const range = ref<RangeKey>('7d')
const filters = reactive({ ...rangeBounds('7d') })
const picked = ref<Granularity | null>(null)
watch(() => [filters.from, filters.to], () => (picked.value = null))
const canHour = computed(() => hourAllowed(filters.from, filters.to))
const granularity = computed<Granularity>(() => {
  const g = picked.value ?? autoGranularity(filters.from, filters.to)
  return g === 'hour' && !canHour.value ? 'day' : g
})

// Top users and groups of the range.
const metric = ref<RankMetric>('cost')
const users = useUsageSummary('/usage/summary', filters, 'user', true, () => ({ order: metric.value, limit: 10 }))
const groups = useUsageSummary('/usage/summary', filters, 'group')
const userLabel = (r: UsageSummaryRow) => r.user_email || `#${r.key}`
function openRecords(query: Record<string, string>) {
  router.push({ path: '/usage', query: { ...query, from: filters.from || undefined, to: filters.to || undefined } })
}

const chartsRevision = ref(0)
function reload() {
  loadOverview()
  users.reload()
  groups.reload()
  chartsRevision.value++
}
watch(() => props.revision, reload)
loadOverview()
watch(() => loadingOverview.value || users.loading.value || groups.loading.value, (v) => emit('update:loading', v), { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <SAlert v-if="overviewError" tone="danger">
      {{ t('stats.loadFailed', { msg: errorMessage(overviewError) }) }}
      <template #actions><SButton size="sm" icon="refresh" @click="loadOverview">{{ t('stats.retry') }}</SButton></template>
    </SAlert>
    <SGrid :cols="2" :xl-cols="4" data-testid="admin-dashboard-cards">
      <SStatCard
        :label="t('stats.admin.todayRequests')"
        :value="formatNumber(cards.requests)"
        :trend="cards.trend"
        :sub="t('stats.admin.successRate', { p: cards.success })"
        :sub2="t('stats.admin.last30dRequests', { n: formatNumber(cards.requests30) })"
        icon="usage"
        to="/usage"
        :loading="first"
      />
      <SStatCard
        :label="t('stats.admin.todayRevenue')"
        :value="formatMoney(cards.cost, 2)"
        :sub="cards.standard !== null ? t('stats.admin.standard', { cost: formatMoney(cards.standard, 2) }) : undefined"
        :sub2="t('stats.admin.last30dCost', { cost: formatMoney(cards.cost30, 2) })"
        icon="price"
        tone="success"
        :loading="first"
      />
      <SStatCard
        v-if="cards.users"
        :label="t('stats.admin.activeUsers')"
        :value="formatNumber(cards.users.active_today)"
        :sub="t('stats.admin.usersSub', { n: formatNumber(cards.users.new_today), total: formatNumber(cards.users.total) })"
        icon="user"
        tone="info"
        to="/users"
        data-testid="card-users"
      />
      <SStatCard
        v-if="cards.accounts"
        :label="t('stats.admin.accounts')"
        :value="`${formatNumber(cards.accounts.available)}/${formatNumber(cards.accounts.total)}`"
        :sub="t('stats.admin.accountsSub', { auto: formatNumber(cards.accounts.auto_disabled), disabled: formatNumber(cards.accounts.disabled) })"
        icon="account"
        :tone="accountsTone"
        :to="auth.has([...ACCOUNT_KEYS.read]) ? '/accounts' : undefined"
        data-testid="card-accounts"
      />
      <SStatCard
        :label="t('dashboard.user.todayTokens')"
        :value="formatTokens(cards.tokens)"
        :sub="t('dashboard.user.tokensSub', { input: formatTokens(cards.input), output: formatTokens(cards.output) })"
        :sub2="t('dashboard.user.cacheSub', { read: formatTokens(cards.read), write: formatTokens(cards.write) })"
        icon="bolt"
        tone="warning"
        :loading="first"
      />
      <SStatCard :label="t('dashboard.user.hitRate')" :value="cards.hit" :sub="t('dashboard.user.hitRateSub')" icon="check" tone="success" :loading="first" />
      <SStatCard
        :label="t('dashboard.user.performance')"
        :value="t('dashboard.user.rpm', { n: formatNumber(cards.rpm, 1) })"
        :sub="t('dashboard.user.tpm', { n: formatTokens(cards.tpm) })"
        icon="cpu"
        tone="accent"
        :loading="first"
      />
      <SStatCard
        :label="t('dashboard.user.response')"
        :value="formatMs(cards.firstToken)"
        :sub="t('dashboard.user.firstTokenLabel')"
        :sub2="t('dashboard.user.duration', { t: formatMs(cards.latency) })"
        icon="clock"
        tone="info"
        :loading="first"
      />
      <PluginSlot name="dashboard.widgets" />
    </SGrid>

    <div class="card flex flex-wrap items-center gap-2 p-3">
      <SDateRange v-model:range="range" v-model:from="filters.from" v-model:to="filters.to" size="sm" :label="false" />
      <SSegmented
        :model-value="granularity"
        :options="[
          { value: 'day', label: t('stats.day') },
          { value: 'hour', label: t('stats.hour'), disabled: !canHour }
        ]"
        size="sm"
        :aria-label="t('stats.granularity')"
        @update:model-value="picked = $event as Granularity"
      />
      <span class="ms-auto text-xs text-fg-subtle">{{ t('stats.tz', { tz: browserTZ() }) }}</span>
    </div>
    <UsageCharts summary-path="/usage/summary" :filters="filters" :granularity="granularity" layout="dashboard" :revision="chartsRevision" group="dashboard-admin" model-sources />

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SCard :title="t('stats.userSpend')" :subtitle="t('stats.clickToFilter')">
        <template #actions>
          <SSegmented
            v-model="metric"
            size="sm"
            :aria-label="t('stats.userSpend')"
            :options="[
              { value: 'cost', label: t('stats.byCost') },
              { value: 'requests', label: t('stats.byRequests') },
              { value: 'tokens', label: t('stats.byTokens') }
            ]"
            data-testid="user-spend-metric"
          />
        </template>
        <RankingBars :rows="users.rows.value" :metric="metric" :loading="users.loading.value" :label-of="userLabel" @select="openRecords({ user_id: $event })" />
      </SCard>
      <DistributionCard
        :title="t('stats.groupDist')"
        :key-label="t('stats.group')"
        :rows="groups.rows.value"
        :loading="groups.loading.value"
        selectable
        @select="openRecords({ group_name: $event })"
      />
    </div>
  </div>
</template>
