<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SField, SHint, SInput, SPageHeader, STagInput } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import GroupPicker from '@/components/GroupPicker.vue'
import RemoteSettings from './RemoteSettings.vue'
import ProxySettings from './ProxySettings.vue'
import { isTrustedAuthorizationURL, sessionExpired } from './validation'
interface Status { healthy: boolean; logged_in: boolean; auth_method: string }
interface Session { session_id: string; url: string; expires_at: string }
const { t } = useI18n(), auth = useAuthStore()
const base = '/system/ccgateway'
const manage = computed(() => auth.has('settings:manage'))
const status = ref<Status | null>(null), session = ref<Session | null>(null)
const groupIds = ref<number[]>([]), models = ref<string[]>([])
const code = ref(''), name = ref('CCGateway'), connected = ref<string | number | null>(null)
const authBusy = ref(false), remoteBusy = ref(false), proxyBusy = ref(false), revision = ref(0)
const busy = computed(() => authBusy.value || remoteBusy.value || proxyBusy.value)
const error = ref(''), notice = ref(''), confirmLogout = ref(false)
const post = <T,>(path: string, body: unknown = {}) => api.post<T>(`${base}/${path}`, body, { signal: AbortSignal.timeout(55000) })
async function run(action: () => Promise<void>) {
  if (authBusy.value) return
  authBusy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e) { if ((e as { code?: string }).code !== 'step_up_cancelled') error.value = t('ccgateway.failed') } finally { authBusy.value = false }
}
async function refresh() {
  status.value = null
  status.value = await api.get<Status>(`${base}/status`, undefined, { signal: AbortSignal.timeout(55000) })
}
function remoteSaved() { revision.value++; connected.value = null; confirmLogout.value = false; void run(refresh) }
async function start() {
  const data = await post<Session>('auth/start')
  if (!isTrustedAuthorizationURL(data.url) || !data.session_id || sessionExpired(data.expires_at)) throw Error('invalid authorization session')
  session.value = data; code.value = ''
}
async function complete() {
  if (!session.value || sessionExpired(session.value.expires_at)) { error.value = t('ccgateway.auth.expired'); return }
  await post('auth/complete', { session_id: session.value.session_id, code: code.value.trim() })
  code.value = ''; session.value = null; await refresh()
  notice.value = t(status.value?.logged_in ? 'ccgateway.auth.loggedIn' : 'ccgateway.auth.pending')
}
async function cancel() {
  if (session.value && !sessionExpired(session.value.expires_at)) await post('auth/cancel', { session_id: session.value.session_id })
  session.value = null; code.value = ''
}
async function logout() { await post('auth/logout'); session.value = null; code.value = ''; confirmLogout.value = false; connected.value = null; await refresh() }
async function connect() { const data = await post<{ id: string | number }>('connect', { name: name.value.trim(), group_ids: groupIds.value, models: models.value }); connected.value = data.id }
onMounted(() => run(refresh))
onBeforeUnmount(() => { code.value = ''; session.value = null })
</script>
<template>
  <div class="space-y-5">
    <SPageHeader :title="t('ccgateway.title')" :description="t('ccgateway.description')"><template #actions><SButton to="/settings">{{ t('nav.items.settings') }}</SButton></template></SPageHeader>
    <SHint v-if="!manage">{{ t('ccgateway.readOnly') }}</SHint>
    <RemoteSettings :disabled="!manage || authBusy || proxyBusy || !!session" @busy="remoteBusy = $event" @saved="remoteSaved" />
    <ProxySettings :disabled="!manage || authBusy || remoteBusy || !!session" :target-revision="revision" @busy="proxyBusy = $event" />
    <SCard :title="t('ccgateway.auth.title')" :subtitle="t('ccgateway.auth.hint')">
      <template #actions><SButton size="sm" :loading="authBusy" :disabled="busy" @click="run(refresh)">{{ t('common.refresh') }}</SButton></template>
      <div class="space-y-4">
        <div class="flex gap-2"><SBadge :tone="status?.healthy ? 'success' : 'gray'">{{ t(!status ? 'ccgateway.auth.unknown' : status.healthy ? 'ccgateway.auth.healthy' : 'ccgateway.auth.offline') }}</SBadge><SBadge v-if="status" :tone="status.logged_in ? 'success' : 'warning'">{{ t(status.logged_in ? 'ccgateway.auth.loggedIn' : 'ccgateway.auth.loggedOut') }}</SBadge></div>
        <SHint v-if="error" tone="danger" role="alert">{{ error }}</SHint><SHint v-if="notice" tone="success">{{ notice }}</SHint>
        <div v-if="manage" class="flex flex-wrap gap-2"><SButton variant="primary" :disabled="busy || !status?.healthy || !!session" @click="run(start)">{{ t('ccgateway.auth.start') }}</SButton><SButton v-if="status?.logged_in" :disabled="busy" @click="confirmLogout = !confirmLogout">{{ t('ccgateway.auth.logout') }}</SButton></div>
        <div v-if="confirmLogout" class="space-y-2"><SHint tone="warning">{{ t('ccgateway.auth.confirmLogout') }}</SHint><SButton variant="danger" :disabled="busy || !manage" @click="run(logout)">{{ t('common.confirm') }}</SButton><SButton class="ml-2" :disabled="busy" @click="confirmLogout = false">{{ t('common.cancel') }}</SButton></div>
        <form v-if="session" class="space-y-3 rounded-xl border border-primary-200 p-4 dark:border-primary-900" @submit.prevent="run(complete)">
          <a :href="session.url" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline">{{ t('ccgateway.auth.open') }}</a><SHint>{{ t('ccgateway.auth.expires', { time: new Date(session.expires_at).toLocaleString() }) }}</SHint>
          <SField :label="t('ccgateway.auth.code')"><SInput v-model="code" type="password" autocomplete="off" :disabled="busy" required /></SField>
          <div class="flex gap-2"><SButton type="submit" variant="primary" :disabled="busy || !manage || !code.trim()">{{ t('ccgateway.auth.complete') }}</SButton><SButton :disabled="busy" @click="run(cancel)">{{ t('common.cancel') }}</SButton></div>
        </form>
        <form v-if="status?.logged_in && manage && auth.has('account:create')" class="space-y-3 border-t border-gray-100 pt-4 dark:border-dark-800" @submit.prevent="run(connect)">
          <SField :label="t('ccgateway.auth.name')"><SInput v-model="name" :maxlength="100" :disabled="busy" required /></SField><SField :label="t('accounts.groups')"><GroupPicker :model-value="groupIds" multiple :disabled="busy" @update:model-value="groupIds = Array.isArray($event) ? $event : []" /></SField><SField :label="t('ccgateway.auth.models')" :hint="t('ccgateway.auth.modelsHint')"><STagInput v-model="models" :disabled="busy" /></SField><SHint>{{ t('ccgateway.auth.connectHint') }}</SHint>
          <div class="flex flex-wrap items-center gap-3"><SButton type="submit" variant="primary" :disabled="busy || !name.trim() || connected !== null">{{ t('ccgateway.auth.connect') }}</SButton><span v-if="connected !== null" class="text-sm text-emerald-600">{{ t('ccgateway.auth.connected', { id: connected }) }}</span><SButton v-if="auth.has('account:read') || auth.has('account:own:read')" to="/accounts">{{ t('ccgateway.auth.accounts') }}</SButton></div>
        </form>
      </div>
    </SCard>
  </div>
</template>
