<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SIcon } from '@sub2api/ui'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { setLocale, currentLocale } from '@/i18n'
import { formatMoney } from '@/utils/format'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const app = useAppStore()
const auth = useAuthStore()
const plugins = usePluginStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const menuOpen = ref(false)
const pwdOpen = ref(false)
const root = ref<HTMLElement>()

const title = computed(() => (route.meta.title ? t(route.meta.title as string) : ''))
const initial = computed(() => (auth.me?.display_name || auth.me?.email || '?').slice(0, 1).toUpperCase())

function onDoc(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) closeMenu()
}
function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) document.addEventListener('mousedown', onDoc)
}
function closeMenu() {
  menuOpen.value = false
  document.removeEventListener('mousedown', onDoc)
}
onBeforeUnmount(closeMenu)

function toggleLocale() {
  setLocale(currentLocale() === 'zh' ? 'en' : 'zh')
}

async function logout() {
  closeMenu()
  await auth.logout()
  await plugins.reset()
  router.replace('/login')
}
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-xl dark:border-dark-800 dark:bg-dark-900/80 sm:px-6"
  >
    <button class="btn btn-ghost btn-sm lg:hidden" @click="app.mobileNavOpen = true">
      <SIcon name="menu" class="h-5 w-5" />
    </button>
    <div class="min-w-0 flex-1 truncate text-sm font-medium text-gray-500 dark:text-dark-400">{{ title }}</div>

    <RouterLink
      v-if="auth.balance !== null"
      to="/me/ledger"
      class="hidden items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 sm:flex"
    >
      <SIcon name="balance" class="h-4 w-4" />
      {{ t('nav.balance') }} {{ formatMoney(auth.balance, 2) }}
    </RouterLink>

    <button class="btn btn-ghost btn-sm" :title="t('common.language')" @click="toggleLocale">
      <SIcon name="globe" class="h-4 w-4" />
      <span>{{ currentLocale() === 'zh' ? '中' : 'EN' }}</span>
    </button>
    <button class="btn btn-ghost btn-sm" :title="t('common.theme.toggle')" @click="app.toggleTheme()">
      <SIcon :name="app.theme === 'dark' ? 'sun' : 'moon'" class="h-4 w-4" />
    </button>

    <div ref="root" class="relative">
      <button class="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-gray-100 dark:hover:bg-dark-800" @click="toggleMenu">
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {{ initial }}
        </span>
        <span class="hidden max-w-[12rem] truncate text-sm text-gray-700 dark:text-gray-200 md:block">{{ auth.me?.email }}</span>
        <SIcon name="chevron-down" class="h-4 w-4 text-gray-400" />
      </button>
      <div v-if="menuOpen" class="dropdown absolute right-0 mt-2 w-56">
        <div class="border-b border-gray-100 px-4 py-2 dark:border-dark-700">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ auth.me?.display_name || auth.me?.email }}</p>
          <p class="truncate text-xs text-gray-500">{{ auth.me?.roles?.join(', ') }}</p>
        </div>
        <div class="dropdown-item" @click="closeMenu(); pwdOpen = true">
          <SIcon name="lock" class="h-4 w-4" /> {{ t('nav.changePassword') }}
        </div>
        <div class="dropdown-item !text-red-600 dark:!text-red-400" @click="logout">
          <SIcon name="logout" class="h-4 w-4" /> {{ t('nav.logout') }}
        </div>
      </div>
    </div>
    <ChangePasswordDialog v-model:open="pwdOpen" />
  </header>
</template>
