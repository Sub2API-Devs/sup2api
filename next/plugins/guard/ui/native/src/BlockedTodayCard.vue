<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { SStatCard } from '@sub2api/ui'
import { fetchStats, useGuardHost } from './host'

// Dashboard widget "Blocked today" (slot dashboard.widgets): today's blocks
// and the change vs. the same period yesterday. Click opens the dashboard.
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

const trend = computed(() => {
  if (today.value === null || !yesterday.value) return null
  return ((today.value - yesterday.value) / yesterday.value) * 100
})

function open() {
  host.router.push('/p/guard/dashboard')
}

onMounted(() => {
  load()
  timer = setInterval(load, 60000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="guard-card" role="link" tabindex="0" @click="open" @keydown.enter="open">
    <SStatCard
      :label="t('blockedToday')"
      :value="today === null ? '—' : host.i18n.formatNumber(today)"
      :trend="trend"
      :sub="trend !== null ? t('vsYesterday') : undefined"
      icon="shield"
      tone="danger"
      :loading="loading"
    />
  </div>
</template>

<style scoped>
.guard-card {
  cursor: pointer;
  height: 100%;
}
.guard-card > :deep(*) {
  height: 100%;
}
</style>
