<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, isApiError, isBridgeMessage, type BridgeMessage, type BridgeMode } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { useAppStore } from '@/stores/app'

// Sandboxed plugin iframe (sandbox="allow-scripts": opaque origin, no
// cookies/storage of the console, no session). All communication goes
// through the postMessage bridge described in @sub2api/host bridge-protocol.
const props = withDefaults(
  defineProps<{
    pluginKey: string
    src: string
    page?: string
    mode?: BridgeMode
    value?: any
    minHeight?: number
  }>(),
  { mode: 'page', page: '', minHeight: 240 }
)
const emit = defineEmits<{ (e: 'change', value: any): void; (e: 'ready'): void }>()

const router = useRouter()
const app = useAppStore()
const frame = ref<HTMLIFrameElement>()
const height = ref(props.minHeight)
const ready = ref(false)
let seq = 0
const pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void; timer: ReturnType<typeof setTimeout> }>()

const locale = computed(() => i18n.global.locale.value as string)
const prefix = computed(() => `/api/v1/p/${props.pluginKey}/`)

function post(msg: BridgeMessage) {
  // The sandboxed frame has an opaque ("null") origin, so "*" is the only
  // usable target origin; the frame only ever receives data meant for it.
  frame.value?.contentWindow?.postMessage(msg, '*')
}

/** Sends a request to the iframe (getValue / setValue / validate). */
function request<T = any>(method: string, params?: any, timeoutMs = 10000): Promise<T> {
  if (!ready.value) return Promise.reject(new Error('plugin frame not ready'))
  const id = `h${++seq}`
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`plugin frame did not answer ${method}`))
    }, timeoutMs)
    pending.set(id, { resolve, reject, timer })
    post({ s2a: 1, kind: 'request', id, method, params })
  })
}

/** Resolves an iframe-supplied path to "/p/<key>/..." or null if it escapes the plugin prefix. */
function pluginPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null
  if (raw.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) return null
  const rel = raw.startsWith(prefix.value) ? raw.slice(prefix.value.length) : raw.replace(/^\/+/, '')
  const url = new URL(rel, 'http://host' + prefix.value)
  if (url.origin !== 'http://host' || !url.pathname.startsWith(prefix.value)) return null
  return url.pathname.slice('/api/v1'.length) + url.search
}

async function handleRequest(id: string, method: string, params: any) {
  const reply = (result?: any, error?: { code: string; message: string; details?: any }) =>
    post({ s2a: 1, kind: 'response', id, result, error })
  try {
    switch (method) {
      case 'api.call': {
        const m = String(params?.method || 'GET').toUpperCase()
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return reply(undefined, { code: 'invalid_argument', message: 'method not allowed' })
        const path = pluginPath(params?.path)
        if (!path) return reply(undefined, { code: 'permission_denied', message: `only ${prefix.value}* is allowed` })
        const query = params?.query && typeof params.query === 'object' ? params.query : undefined
        const data = await api.request(m, path, { query, body: m === 'GET' || m === 'DELETE' ? undefined : params?.body })
        return reply(data)
      }
      case 'navigate': {
        const p = params?.path
        if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//')) return reply(undefined, { code: 'invalid_argument', message: 'invalid path' })
        await router.push(p)
        return reply(true)
      }
      case 'toast': {
        const kind = ['success', 'error', 'info', 'warning'].includes(params?.kind) ? params.kind : 'info'
        toast(String(params?.message ?? '').slice(0, 500), kind)
        return reply(true)
      }
      default:
        return reply(undefined, { code: 'not_found', message: `unknown method ${method}` })
    }
  } catch (e) {
    if (isApiError(e)) return reply(undefined, { code: e.code, message: e.message, details: e.details })
    return reply(undefined, { code: 'internal', message: e instanceof Error ? e.message : String(e) })
  }
}

function onMessage(e: MessageEvent) {
  if (!frame.value || e.source !== frame.value.contentWindow) return
  if (e.origin !== 'null') return
  const msg = e.data
  if (!isBridgeMessage(msg)) return
  switch (msg.kind) {
    case 'ready':
      ready.value = true
      post({ s2a: 1, kind: 'init', plugin: props.pluginKey, page: props.page, mode: props.mode, theme: app.theme, locale: locale.value, value: props.value })
      emit('ready')
      break
    case 'resize':
      if (typeof msg.height === 'number' && Number.isFinite(msg.height)) height.value = Math.min(Math.max(Math.ceil(msg.height), props.minHeight), 8000)
      break
    case 'change':
      emit('change', msg.value)
      break
    case 'request':
      if (typeof msg.id === 'string') handleRequest(msg.id, String(msg.method), msg.params)
      break
    case 'response': {
      const p = pending.get(msg.id)
      if (!p) break
      clearTimeout(p.timer)
      pending.delete(msg.id)
      if (msg.error) p.reject(Object.assign(new Error(msg.error.message || msg.error.code), msg.error))
      else p.resolve(msg.result)
      break
    }
  }
}

watch(
  () => app.theme,
  (theme) => ready.value && post({ s2a: 1, kind: 'theme', theme })
)
watch(locale, (l) => ready.value && post({ s2a: 1, kind: 'locale', locale: l }))
watch(
  () => props.src,
  () => {
    ready.value = false
  }
)

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  for (const p of pending.values()) {
    clearTimeout(p.timer)
    p.reject(new Error('frame closed'))
  }
  pending.clear()
})

defineExpose({
  request,
  getValue: () => request('getValue'),
  setValue: (value: any) => request('setValue', { value }),
  validate: () => request<{ ok: boolean; errors?: Record<string, string> }>('validate'),
  setErrors: (errors: Record<string, string>) => request('setErrors', { errors }).catch(() => undefined),
  isReady: () => ready.value
})
</script>

<template>
  <iframe
    ref="frame"
    :src="src"
    sandbox="allow-scripts"
    referrerpolicy="no-referrer"
    class="block w-full rounded-xl border-0 bg-transparent"
    :style="{ height: height + 'px' }"
    :title="`${pluginKey} ${page}`"
  />
</template>
