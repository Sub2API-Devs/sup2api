<template>
  <section class="card space-y-4 border border-gray-200 p-5 dark:border-dark-700" aria-label="CCGateway 内建插件">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="font-semibold">CCGateway <span class="ml-2 text-xs text-blue-600">内建 · 本地 Docker</span></h3>
        <p class="mt-1 text-sm text-gray-500">通过 Claude Code 提供 Messages API，每个容器使用一套独立授权。</p>
      </div>
      <button class="btn btn-secondary btn-sm" :disabled="busy" @click="run(refresh)">刷新状态</button>
    </div>
    <p class="text-sm" role="status">{{ status ? (status.logged_in ? '已授权 · ' + status.auth_method : '容器已连接 · 尚未授权') : '网关未连接' }}</p>
    <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
    <p v-if="notice" class="text-sm text-emerald-600" role="status">{{ notice }}</p>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" :disabled="busy || !status || !!session" @click="run(start)">获取授权链接</button>
      <button v-if="status?.logged_in" class="btn btn-secondary" :disabled="busy" @click="confirmLogout = !confirmLogout">退出授权</button>
    </div>
    <div v-if="confirmLogout" class="space-y-2 text-sm">
      <p>退出后，该容器关联的账号将无法继续调用模型。</p>
      <button class="btn btn-danger btn-sm" :disabled="busy" @click="run(logout)">确认退出授权</button>
    </div>
    <form v-if="session" class="space-y-3 rounded border border-blue-200 p-4" @submit.prevent="run(complete)">
      <a :href="session.url" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">打开 Claude 授权页面</a>
      <p class="text-xs text-gray-500">链接于 {{ new Date(session.expires_at).toLocaleTimeString() }} 过期。完成授权后，将页面给出的完整授权码粘贴到下方。</p>
      <label class="block text-sm">授权码（code#state）
        <input v-model="code" type="password" autocomplete="off" class="input mt-1 w-full" required />
      </label>
      <div class="flex gap-2">
        <button class="btn btn-primary" :disabled="busy || !code.trim()">完成授权</button>
        <button type="button" class="btn btn-secondary" :disabled="busy" @click="run(cancel)">取消</button>
      </div>
    </form>
    <form v-if="status?.logged_in" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700" @submit.prevent="run(connect)">
      <label class="block text-sm">账号名称<input v-model="name" class="input mt-1 w-full" maxlength="100" required /></label>
      <p class="text-xs text-gray-500">创建 Anthropic API Key 账号；已有默认分组时自动绑定，否则需在账号管理中分配分组。可在账号管理中停用或删除。</p>
      <button class="btn btn-primary" :disabled="busy || connected">{{ connected ? '已接入账号' : '接入账号调度' }}</button>
      <RouterLink to="/admin/accounts" class="ml-3 text-sm text-blue-600">账号管理</RouterLink>
    </form>
    <details class="text-sm text-gray-500">
      <summary class="cursor-pointer">本地 Docker 配置</summary>
      <p class="mt-2">使用仓库 deploy/docker-compose.ccgateway.yml 启动容器；后端与容器配置相同的 CCG_ADMIN_KEY 和 CCG_API_KEY。后端默认连接 http://127.0.0.1:8787，也可通过 CCGATEWAY_URL 指定同一 Docker 网络中的网关地址。</p>
      <p class="mt-2">当前支持文本、图片、工具往返和流式响应；不支持扩展思考、beta 功能及 count_tokens。服务在线不代表模型调用已验证。</p>
    </details>
  </section>
  <TotpStepUpDialog :controller="stepUp" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import TotpStepUpDialog from '@/components/auth/TotpStepUpDialog.vue'
import { isStepUpCancelled, useStepUp } from '@/composables/useStepUp'

interface Status { healthy: boolean; logged_in: boolean; auth_method: string }
interface Session { session_id: string; url: string; expires_at: string }
const base = '/admin/plugins/builtin/ccgateway'
const stepUp = useStepUp()
const post = <T,>(path: string, body: unknown) => stepUp.run(() => apiClient.post<T>(`${base}/${path}`, body, { timeout: 55000 }))
const status = ref<Status | null>(null)
const session = ref<Session | null>(null)
const code = ref('')
const name = ref('CCGateway（本地 Docker）')
const busy = ref(false)
const connected = ref(false)
const confirmLogout = ref(false)
const error = ref('')
const notice = ref('')
async function run(action: () => Promise<void>) {
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e: unknown) {
    if (isStepUpCancelled(e)) return
    const failure = e as { response?: { data?: { message?: string } }; message?: string }
    error.value = failure.response?.data?.message || failure.message || '操作失败，请重试'
  } finally { busy.value = false }
}
async function refresh() {
  try { status.value = (await apiClient.get<Status>(`${base}/status`, { timeout: 55000 })).data }
  catch (e) { status.value = null; throw e }
}
async function start() {
  const { data } = await post<Session>('auth/start', {})
  const url = new URL(data.url)
  if (url.protocol !== 'https:' || !['claude.com', 'claude.ai', 'platform.claude.com', 'console.anthropic.com'].includes(url.host)) throw new Error('授权链接无效')
  session.value = data; code.value = ''
}
async function complete() {
  await post('auth/complete', { session_id: session.value?.session_id, code: code.value.trim() })
  code.value = ''; session.value = null; await refresh()
  notice.value = status.value?.logged_in ? '授权成功，可以接入账号调度。' : '授权回调已完成，但登录状态尚未确认，请刷新状态。'
}
async function cancel() {
  if (session.value && Date.parse(session.value.expires_at) > Date.now()) {
    await post('auth/cancel', { session_id: session.value.session_id })
  }
  session.value = null; code.value = ''
}
async function logout() {
  await post('auth/logout', {})
  session.value = null; code.value = ''; confirmLogout.value = false; await refresh()
}
async function connect() {
  const { data } = await post<{ id: number }>('connect', { name: name.value })
  connected.value = true; notice.value = `已创建账号 #${data.id}，可在账号管理中配置分组。`
}
onMounted(() => run(refresh))
</script>
