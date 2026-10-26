<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SField, SInput } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { currentLocale, setLocale } from '@/i18n'
import { errorMessage } from '@/utils/errors'

const { t } = useI18n()
const auth = useAuthStore()
const app = useAppStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

// Login rate limit (CONTRACTS §14.2): 429 rate_limited with
// details.retry_after_seconds; the form stays locked until it elapses.
const retryUntil = ref(0)
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
const retryLeft = computed(() => Math.max(0, Math.ceil((retryUntil.value - nowMs.value) / 1000)))

function startCountdown(seconds: number) {
  retryUntil.value = Date.now() + seconds * 1000
  nowMs.value = Date.now()
  clearInterval(timer)
  timer = setInterval(() => {
    nowMs.value = Date.now()
    if (nowMs.value >= retryUntil.value) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

async function submit() {
  if (!email.value || !password.value || retryLeft.value > 0) return
  busy.value = true
  error.value = ''
  try {
    await auth.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (e) {
    if (isApiError(e) && e.code === 'rate_limited') {
      const s = Number(e.details?.retry_after_seconds)
      if (Number.isFinite(s) && s > 0) startCountdown(Math.ceil(s))
      else error.value = t('auth.login.rateLimitedNoTime')
    } else error.value = errorMessage(e) || t('auth.login.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-dark-950">
    <div class="login-bg pointer-events-none absolute inset-0 opacity-70" />
    <div class="absolute right-4 top-4 flex gap-1">
      <SButton variant="ghost" size="sm" :title="t('common.language')" :aria-label="t('common.language')" icon="globe" @click="setLocale(currentLocale() === 'zh' ? 'en' : 'zh')">{{ currentLocale() === 'zh' ? '中' : 'EN' }}</SButton>
      <SButton variant="ghost" size="sm" :title="t('common.theme.toggle')" :aria-label="t('common.theme.toggle')" icon-only :icon="app.theme === 'dark' ? 'sun' : 'moon'" @click="app.toggleTheme()" />
    </div>
    <div class="relative w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center text-center">
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-xl font-bold text-white shadow-lg shadow-primary-500/30">
          S
        </div>
        <h1 class="text-xl font-semibold text-fg">{{ t('auth.login.title') }}</h1>
        <p class="mt-1 text-sm text-fg-muted">{{ t('auth.login.subtitle') }}</p>
      </div>
      <form class="card space-y-4 p-6" @submit.prevent="submit">
        <SAlert v-if="auth.sessionExpired && !error && !retryLeft" tone="warning" dense data-testid="login-expired">{{ t('auth.login.sessionExpired') }}</SAlert>
        <SField :label="t('auth.login.email')">
          <SInput v-model="email" type="email" autocomplete="username" autofocus />
        </SField>
        <SField :label="t('auth.login.password')">
          <SInput v-model="password" type="password" autocomplete="current-password" revealable />
        </SField>
        <SAlert v-if="retryLeft" tone="danger" dense data-testid="login-rate-limited">{{ t('auth.login.rateLimited', { n: retryLeft }) }}</SAlert>
        <SAlert v-else-if="error" tone="danger" dense data-testid="login-error">{{ error }}</SAlert>
        <SButton type="submit" variant="primary" block :loading="busy" :disabled="!email || !password || retryLeft > 0">{{ t('auth.login.submit') }}</SButton>
      </form>
    </div>
  </div>
</template>
