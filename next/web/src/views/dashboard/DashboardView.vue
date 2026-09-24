<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SCard, SChart, SPageHeader, SStatCard } from '@sub2api/ui'
import type { Account, UsageSummaryRow } from '@/api/types'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatNumber, startOfToday } from '@/utils/format'

const { t } = useI18n()
const auth = useAuthStore()

const canAll = computed(() => auth.has('usage:all:read'))
const loading = ref(true)
const today = ref<{ requests: number; cost: number; success: number } | null>(null)
const yesterdayRequests = ref<number | null>(null)
const accounts = ref<{ available: number; total: number } | null>(null)
const trend = ref<UsageSummaryRow[]>([])
const myToday = ref<number | null>(null)

function sum(rows: UsageSummaryRow[]) {
  return rows.reduce(
    (a, r) => ({ requests: a.requests + Number(r.requests || 0), cost: a.cost + Number(r.total_cost || 0), success: a.success + Number(r.success ?? r.requests ?? 0) }),
    { requests: 0, cost: 0, success: 0 }
  )
}

async function loadUsage() {
  if (!canAll.value) return
  const rows = (await api.get<UsageSummaryRow[]>('/usage/summary', { from: utcDaysAgo(6).toISOString(), to: new Date().toISOString(), group_by: 'day' })) || []
  trend.value = rows
  const todayKey = dayKey(utcDaysAgo(0))
  const yKey = dayKey(utcDaysAgo(1))
  const todayRows = rows.filter((r) => String(r.key).slice(0, 10) === todayKey)
  today.value = sum(todayRows)
  const y = rows.filter((r) => String(r.key).slice(0, 10) === yKey)
  yesterdayRequests.value = y.length ? sum(y).requests : null
}

// Usage summary day keys are UTC dates ("YYYY-MM-DD").
function utcDaysAgo(n: number): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - n))
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function loadAccounts() {
  if (!auth.has('account:read')) return
  const res = await api.list<Account>('/accounts', { page_size: 200 })
  const now = Date.now()
  const available = res.items.filter(
    (a) => a.status === 'active' && a.schedulable !== false && !a.orphaned && !(a.cooldown_until && new Date(a.cooldown_until).getTime() > now)
  ).length
  accounts.value = { available, total: res.page.total || res.items.length }
}

async function loadMine() {
  if (canAll.value || !auth.has('usage:self:read')) return
  const res = await api.list('/me/usage', { from: startOfToday().toISOString(), page_size: 1 })
  myToday.value = res.page.total
}

const trendPct = computed(() => {
  if (!today.value || !yesterdayRequests.value) return null
  return ((today.value.requests - yesterdayRequests.value) / yesterdayRequests.value) * 100
})

const chartOption = computed(() => {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) days.push(dayKey(utcDaysAgo(i)))
  const byDay = new Map(trend.value.map((r) => [String(r.key).slice(0, 10), r]))
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('dashboard.requests'), t('dashboard.cost')], top: 0 },
    xAxis: { type: 'category', data: days.map((d) => d.slice(5)) },
    yAxis: [{ type: 'value' }, { type: 'value', splitLine: { show: false } }],
    series: [
      { name: t('dashboard.requests'), type: 'bar', barMaxWidth: 28, data: days.map((d) => Number(byDay.get(d)?.requests || 0)) },
      { name: t('dashboard.cost'), type: 'line', smooth: true, yAxisIndex: 1, data: days.map((d) => Number(byDay.get(d)?.total_cost || 0)) }
    ]
  }
})

onMounted(async () => {
  loading.value = true
  await Promise.allSettled([loadUsage(), loadAccounts(), loadMine(), auth.refreshBalance()])
  loading.value = false
})
</script>

<template>
  <div>
    <SPageHeader :title="t('dashboard.title')" :description="t('dashboard.welcome', { name: auth.me?.display_name || auth.me?.email || '' })" />
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <template v-if="canAll">
        <SStatCard
          :label="t('dashboard.todayRequests')"
          :value="formatNumber(today?.requests ?? 0)"
          :sub="today ? t('dashboard.successRate', { n: today.requests ? ((today.success / today.requests) * 100).toFixed(1) : '100' }) : undefined"
          :trend="trendPct"
          icon="usage"
          :loading="loading"
        />
        <SStatCard :label="t('dashboard.todayCost')" :value="formatMoney(today?.cost ?? 0, 2)" icon="price" tone="success" :loading="loading" />
      </template>
      <SStatCard
        v-else-if="auth.has('usage:self:read')"
        :label="t('dashboard.myTodayRequests')"
        :value="formatNumber(myToday ?? 0)"
        icon="usage"
        :loading="loading"
      />
      <SStatCard
        v-if="accounts"
        :label="t('dashboard.availableAccounts')"
        :value="`${accounts.available}/${accounts.total}`"
        icon="account"
        :tone="accounts.available === 0 ? 'danger' : accounts.available < accounts.total ? 'warning' : 'primary'"
      />
      <SStatCard v-if="auth.balance !== null" :label="t('dashboard.balance')" :value="formatMoney(auth.balance, 2)" icon="balance" tone="warning" />
      <PluginSlot name="dashboard.widgets" />
    </div>

    <SCard v-if="canAll" class="mt-6" :title="t('dashboard.trend')">
      <SChart :option="chartOption" :loading="loading" height="300px" />
    </SCard>
  </div>
</template>
