<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SHint, SInput, SSelect } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { isTrustedAuthorizationURL, sessionExpired } from './validation'
const { t } = useI18n(), auth = useAuthStore()
const accounts = ref<Array<{ value: number; label: string }>>([])
const selected = ref<number | null>(null), busy = ref(false), error = ref(''), code = ref('')
const status = ref<{ status: string; container: string } | null>(null)
const health = ref<{ healthy: boolean; logged_in: boolean } | null>(null)
const session = ref<{ session_id: string; url: string; expires_at: string } | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
let serial = 0
async function refresh() {
  const id = selected.value, stamp = ++serial
  if (!id) return
  const s = await api.get<{ status: string; container: string }>(`/system/ccgateway/accounts/${id}/status`)
  if (stamp !== serial || id !== selected.value) return
  status.value = s
  if (s.status === 'ready') {
    const h = await api.get<{ healthy: boolean; logged_in: boolean }>(`/system/ccgateway/accounts/${id}/health`)
    if (stamp === serial && id === selected.value) health.value = h
  } else health.value = null
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch { error.value = t('ccgateway.runtime.failed') } finally { busy.value = false }
}
async function action(name: string) {
  if (!selected.value || !auth.has('settings:manage')) return
  const body = name === 'complete' ? { session_id: session.value?.session_id, code: code.value.trim() } : name === 'cancel' ? { session_id: session.value?.session_id } : {}
  if (name === 'complete' && (!session.value || sessionExpired(session.value.expires_at))) throw Error('expired')
  const data = await api.post<any>(`/system/ccgateway/accounts/${selected.value}/${name}`, body, { signal: AbortSignal.timeout(95000) })
  if (name === 'start') {
    if (!isTrustedAuthorizationURL(data.url) || !data.session_id || sessionExpired(data.expires_at)) throw Error('invalid session')
    session.value = data
  } else if (name !== 'sync') { session.value = null; code.value = '' }
  await refresh()
}
watch(selected, () => { ++serial; status.value = null; health.value = null; session.value = null; code.value = ''; void run(refresh) })
onMounted(async () => {
  await run(async () => {
    const r = await api.list<{ id: number; name: string }>('/accounts', { plugin_key: 'ccgateway', page_size: 200 })
    accounts.value = r.items.map(a => ({ value: a.id, label: `${a.name} #${a.id}` }))
    selected.value = accounts.value[0]?.value ?? null
    await refresh()
  })
  timer = setInterval(() => { if (!busy.value && selected.value) void run(refresh) }, 5000)
})
onBeforeUnmount(() => { ++serial; clearInterval(timer); code.value = ''; session.value = null })
</script>
<template>
  <SCard :title="t('ccgateway.runtime.title')">
    <div class="space-y-4">
      <SHint>{{ t('ccgateway.runtime.hint') }}</SHint>
      <SHint tone="warning">{{ t('ccgateway.runtime.switchHint') }}</SHint>
      <SButton to="/accounts">{{ t('ccgateway.auth.accounts') }}</SButton>
      <SSelect v-model="selected" :options="accounts" :disabled="busy" :placeholder="t('ccgateway.runtime.select')" />
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <template v-if="selected">
        <p>{{ t('ccgateway.runtime.state') }}: {{ t(`ccgateway.runtime.${status?.status === 'ready' ? 'ready' : 'pending'}`) }}</p>
        <p v-if="status?.container" class="font-mono text-sm">{{ status.container }}</p>
        <p v-if="health">{{ t(health.logged_in ? 'ccgateway.auth.loggedIn' : 'ccgateway.auth.loggedOut') }}</p>
        <div v-if="auth.has('settings:manage')" class="flex gap-2">
          <SButton :disabled="busy || !!session" @click="run(() => action('sync'))">{{ t('ccgateway.runtime.retry') }}</SButton>
          <SButton :disabled="busy || !!session || status?.status !== 'ready'" @click="run(() => action('start'))">{{ t('ccgateway.auth.start') }}</SButton>
        </div>
        <form v-if="session" class="space-y-3" @submit.prevent="run(() => action('complete'))">
          <a :href="session.url" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline">{{ t('ccgateway.auth.open') }}</a>
          <SInput v-model="code" type="password" autocomplete="off" :disabled="busy" :placeholder="t('ccgateway.auth.code')" />
          <SButton type="submit" :disabled="busy || !code.trim()">{{ t('ccgateway.auth.complete') }}</SButton>
          <SButton :disabled="busy" @click="run(() => action('cancel'))">{{ t('common.cancel') }}</SButton>
        </form>
      </template>
    </div>
  </SCard>
</template>
