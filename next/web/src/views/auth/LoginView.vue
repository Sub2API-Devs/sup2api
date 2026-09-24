<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SField, SIcon } from '@sub2api/ui'
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

async function submit() {
  if (!email.value || !password.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (e) {
    error.value = errorMessage(e) || t('auth.login.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-dark-950">
    <div class="login-bg pointer-events-none absolute inset-0 opacity-70" />
    <div class="absolute right-4 top-4 flex gap-1">
      <button class="btn btn-ghost btn-sm" @click="setLocale(currentLocale() === 'zh' ? 'en' : 'zh')">
        <SIcon name="globe" class="h-4 w-4" /> {{ currentLocale() === 'zh' ? '中' : 'EN' }}
      </button>
      <button class="btn btn-ghost btn-sm" @click="app.toggleTheme()">
        <SIcon :name="app.theme === 'dark' ? 'sun' : 'moon'" class="h-4 w-4" />
      </button>
    </div>
    <div class="relative w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center text-center">
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-xl font-bold text-white shadow-lg shadow-primary-500/30">
          S
        </div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('auth.login.title') }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('auth.login.subtitle') }}</p>
      </div>
      <form class="card space-y-4 p-6" @submit.prevent="submit">
        <SField :label="t('auth.login.email')">
          <input v-model="email" type="email" class="input" autocomplete="username" autofocus />
        </SField>
        <SField :label="t('auth.login.password')">
          <input v-model="password" type="password" class="input" autocomplete="current-password" />
        </SField>
        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{{ error }}</p>
        <SButton type="submit" variant="primary" block :loading="busy" :disabled="!email || !password">{{ t('auth.login.submit') }}</SButton>
      </form>
    </div>
  </div>
</template>
