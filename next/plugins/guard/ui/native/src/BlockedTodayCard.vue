<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { SStatCard } from '@sub2api/ui'
import { fetchStats, useGuardHost } from './host'

// Dashboard widget "Blocked today" (slot dashboard.widgets): today's blocks
// and the change vs. the same period yesterday. The whole card is a link to
// the dashboard (a real <a>, so it is focusable and opens in a new tab too).
const host = useGuardHost()
const t = host.t

const today = ref<number | null>(null)
const yesterday = ref<number | null>(null)
const loading = ref(true)
let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  try {
    const now = new Date()
    const startToday = new Date(now)
    startToday.setHours(0, 0, 0, 0)
    const startYesterday = new Date(startToday.getTime() - 86400000)
    const sameTimeYesterday = new Date(now.getTime() - 86400000)
    const [a, b] = await Promise.all([
      fetchStats({ range: 'today' }),
      fetchStats({ from: startYesterday.toISOString(), to: sameTimeYesterday.toISOString() }).catch(() => null)
    ])
    today.value = a.blocked_total
    yesterday.value = b ? b.blocked_total : null
  } catch {
    today.value = null
  } finally {
    loading.value = false
  }
}

// A real <a> (focusable, opens in a new tab too); plain clicks navigate in-app.
const target = '/p/guard/dashboard'
const href = computed(() => host.router.resolve(target).href)
function open(e: MouseEvent) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  host.router.push(target)
}

const trend = computed(() => {
  if (today.value === null || !yesterday.value) return null
  return ((today.value - yesterday.value) / yesterday.value) * 100
})

onMounted(() => {
  load()
  timer = setInterval(load, 60000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <a :href="href" class="guard-card" :title="t('openDashboard')" @click="open">
    <SStatCard
      class="guard-card-body"
      :label="t('blockedToday')"
      :value="today === null ? '—' : host.i18n.formatNumber(today)"
      :trend="trend"
      :sub="trend !== null ? t('vsYesterday') : undefined"
      icon="shield"
      tone="danger"
      :loading="loading"
    />
  </a>
</template>

<style scoped>
.guard-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;
  border-radius: 1rem;
}
.guard-card:focus-visible {
  outline: 2px solid rgb(20 184 166 / 0.6);
  outline-offset: 2px;
}
.guard-card-body {
  flex: 1;
}
</style>
