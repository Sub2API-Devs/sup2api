<script setup lang="ts">
// Where the caller is signed in, and ending those sessions.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SDateTime, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import { notifyError } from '@/utils/errors'

interface Session {
  id: string
  method: string
  ip: string
  user_agent: string
  created_at: string
  last_used_at: string
  current: boolean
}

const { t } = useI18n()
const rows = ref<Session[]>([])
const loading = ref(false)
async function load() {
  loading.value = true
  try {
    rows.value = (await api.get<Session[]>('/me/sessions')) || []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const hasOthers = computed(() => rows.value.some((r) => !r.current))
const canRevokeOthers = computed(() => hasOthers.value && rows.value.some((r) => r.current))

async function revoke(row: Session) {
  if (!(await confirm({ title: t('me.sessions.revoke'), message: t('me.sessions.revokeConfirm'), danger: true }))) return
  try {
    await api.del(`/me/sessions/${row.id}`)
    toast(t('me.sessions.revoked'), 'success')
    await load()
  } catch (e) {
    notifyError(e)
  }
}
async function revokeOthers() {
  if (!(await confirm({ title: t('me.sessions.revokeOthers'), message: t('me.sessions.revokeConfirm'), danger: true }))) return
  try {
    await api.post('/me/sessions/revoke-others', {})
    toast(t('me.sessions.revoked'), 'success')
    await load()
  } catch (e) {
    notifyError(e)
  }
}

/** The browser and system from a User-Agent, enough to recognize a session. */
function device(ua: string): string {
  if (!ua) return t('me.sessions.unknownDevice')
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : ''
  const system = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return [browser, system].filter(Boolean).join(' · ') || ua.slice(0, 60)
}
const methodLabel = (m: string) => (['password', 'two_factor', 'passkey'].includes(m) ? t(`me.sessions.method.${m}`) : '—')

const columns: TableColumn[] = [
  { key: 'device', label: t('me.sessions.device') },
  { key: 'method', label: t('me.sessions.signedInWith'), width: '140px' },
  { key: 'ip', label: 'IP', width: '160px' },
  { key: 'created_at', label: t('me.sessions.since'), width: '160px' },
  { key: 'last_used_at', label: t('me.sessions.lastActive'), width: '120px' },
  { key: 'actions', label: '', align: 'right', width: '90px' }
]
</script>

<template>
  <SCard :title="t('me.sessions.title')" :subtitle="t('me.sessions.description')" :padded="false" data-testid="sessions-card">
    <template #actions>
      <SButton size="sm" :disabled="!canRevokeOthers" data-testid="sessions-revoke-others" @click="revokeOthers">{{ t('me.sessions.revokeOthers') }}</SButton>
    </template>
    <STable :columns="columns" :rows="rows" :loading="loading" row-key="id" dense :empty-text="t('me.sessions.empty')">
      <template #cell-device="{ row }">
        <span :title="row.user_agent">{{ device(row.user_agent) }}</span>
        <SBadge v-if="row.current" tone="success" class="ms-2" data-testid="session-current">{{ t('me.sessions.current') }}</SBadge>
      </template>
      <template #cell-method="{ row }">{{ methodLabel(row.method) }}</template>
      <template #cell-ip="{ row }"><span class="font-mono text-xs">{{ row.ip || '—' }}</span></template>
      <template #cell-created_at="{ row }"><SDateTime muted :value="row.created_at" class="text-xs" /></template>
      <template #cell-last_used_at="{ row }"><SDateTime muted :value="row.last_used_at" mode="relative" class="text-xs" /></template>
      <template #cell-actions="{ row }">
        <SButton v-if="!row.current" size="sm" variant="ghost" data-testid="session-revoke" @click="revoke(row)">{{ t('me.sessions.revoke') }}</SButton>
        <span v-else />
      </template>
    </STable>
  </SCard>
</template>
