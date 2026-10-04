<script setup lang="ts">
// Claude authorization of one CCGateway account (one container per account):
// container state, login state, and the code flow (get the link, sign in to
// Claude, paste code#state back). Used by the account editor and by the
// CCGateway page.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SHint, SInput } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { isTrustedAuthorizationURL, sessionExpired } from './validation'

const props = defineProps<{ accountId: number; apiKeyMode?: boolean; compact?: boolean }>()
const emit = defineEmits<{ (e: 'authorized'): void }>()
const { t } = useI18n(), auth = useAuthStore()
const busy = ref(false), error = ref(''), code = ref(''), unavailable = ref(false)
const status = ref<{ status: string; container: string } | null>(null)
const health = ref<{ healthy: boolean; logged_in: boolean } | null>(null)
const session = ref<{ session_id: string; url: string; expires_at: string } | null>(null)
const canManage = computed(() => auth.has('settings:manage'))
const ready = computed(() => status.value?.status === 'ready')
let timer: ReturnType<typeof setInterval> | undefined
let serial = 0

async function refresh() {
  const id = props.accountId, stamp = ++serial
  try {
    const s = await api.get<{ status: string; container: string }>(`/system/ccgateway/accounts/${id}/status`)
    if (stamp !== serial) return
    status.value = s
    unavailable.value = false
    if (s.status === 'ready' && !props.apiKeyMode) {
      const h = await api.get<{ healthy: boolean; logged_in: boolean }>(`/system/ccgateway/accounts/${id}/health`)
      if (stamp === serial) health.value = h
    } else health.value = null
  } catch {
    if (stamp === serial) unavailable.value = true
  }
}

async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch { error.value = t('ccgateway.runtime.failed') } finally { busy.value = false }
}

async function action(name: string) {
  if (!canManage.value) return
  const body = name === 'complete' ? { session_id: session.value?.session_id, code: code.value.trim() } : name === 'cancel' ? { session_id: session.value?.session_id } : {}
  if (name === 'complete' && (!session.value || sessionExpired(session.value.expires_at))) throw Error('expired')
  const data = await api.post<any>(`/system/ccgateway/accounts/${props.accountId}/${name}`, body, { signal: AbortSignal.timeout(95000) })
  if (name === 'start') {
    if (!isTrustedAuthorizationURL(data.url) || !data.session_id || sessionExpired(data.expires_at)) throw Error('invalid session')
    session.value = data
  } else if (name !== 'sync') { session.value = null; code.value = '' }
  await refresh()
  if (name === 'complete' && health.value?.logged_in) emit('authorized')
}

watch(() => props.accountId, () => { ++serial; status.value = null; health.value = null; session.value = null; code.value = ''; void run(refresh) })
onMounted(() => {
  void run(refresh)
  // The core prepares the container in the background (every few seconds).
  timer = setInterval(() => { if (!busy.value && !session.value) void run(refresh) }, 5000)
})
onBeforeUnmount(() => { ++serial; clearInterval(timer); code.value = ''; session.value = null })
</script>

<template>
  <div class="space-y-3 text-sm" data-testid="ccgateway-account-auth">
    <SHint v-if="unavailable" tone="warning">
      {{ t('ccgateway.auth.unavailable') }}
      <RouterLink to="/plugins/ccgateway?tab=settings" class="ml-1 text-primary-600 underline">{{ t('ccgateway.auth.settings') }}</RouterLink>
    </SHint>
    <template v-else>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{{ t('ccgateway.runtime.state') }}: {{ t(`ccgateway.runtime.${ready ? 'ready' : 'pending'}`) }}</span>
        <span v-if="!compact && status?.container" class="font-mono text-xs text-gray-500">{{ status.container }}</span>
        <span v-if="apiKeyMode">{{ t('ccgateway.auth.apiKeyMode') }}</span>
        <span v-else-if="health" :class="health.logged_in ? 'text-emerald-600' : 'text-amber-600'">{{ t(health.logged_in ? 'ccgateway.auth.loggedIn' : 'ccgateway.auth.loggedOut') }}</span>
      </div>
      <SHint v-if="apiKeyMode">{{ t('ccgateway.auth.apiKeyHint') }}</SHint>
      <SHint v-else-if="!ready && status">{{ t('ccgateway.auth.preparing') }}</SHint>
      <SHint v-if="!apiKeyMode && !canManage" tone="warning">{{ t('ccgateway.auth.readOnly') }}</SHint>
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <template v-if="canManage">
        <SHint v-if="!apiKeyMode && ready && !health?.logged_in && !session">{{ t('ccgateway.auth.steps') }}</SHint>
        <div class="flex flex-wrap gap-2">
          <SButton size="sm" :disabled="busy || !!session" @click="run(() => action('sync'))">{{ t('ccgateway.runtime.retry') }}</SButton>
          <SButton v-if="!apiKeyMode" size="sm" variant="primary" :disabled="busy || !!session || !ready" data-testid="ccgateway-auth-start" @click="run(() => action('start'))">{{ t('ccgateway.auth.start') }}</SButton>
        </div>
        <form v-if="session && !apiKeyMode" class="space-y-2" @submit.prevent="run(() => action('complete'))">
          <a :href="session.url" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline">{{ t('ccgateway.auth.open') }}</a>
          <SInput v-model="code" type="password" autocomplete="off" :disabled="busy" :placeholder="t('ccgateway.auth.code')" />
          <div class="flex gap-2">
            <SButton size="sm" variant="primary" type="submit" :disabled="busy || !code.trim()">{{ t('ccgateway.auth.complete') }}</SButton>
            <SButton size="sm" :disabled="busy" @click="run(() => action('cancel'))">{{ t('common.cancel') }}</SButton>
          </div>
        </form>
      </template>
    </template>
  </div>
</template>
