<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SDropdown, SIcon, type MenuAction } from '@sub2api/ui'
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

const pwdOpen = ref(false)

const title = computed(() => (route.meta.title ? t(route.meta.title as string) : ''))
const initial = computed(() => (auth.me?.display_name || auth.me?.email || '?').slice(0, 1).toUpperCase())

const userActions = computed<MenuAction[]>(() => [
  { key: 'password', label: t('nav.changePassword'), icon: 'lock' },
  { key: 'logout', label: t('nav.logout'), icon: 'logout', danger: true }
])
function onUserAction(key: string) {
  if (key === 'password') pwdOpen.value = true
  else if (key === 'logout') void logout()
}

function toggleLocale() {
  setLocale(currentLocale() === 'zh' ? 'en' : 'zh')
}

async function logout() {
  await auth.logout()
  await plugins.reset()
  router.replace('/login')
}
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-xl sm:px-6"
  >
    <SButton variant="ghost" size="sm" icon="menu" icon-only class="lg:hidden" :aria-label="t('nav.openMenu')" :aria-expanded="app.mobileNavOpen" @click="app.mobileNavOpen = true" />
    <div class="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">{{ title }}</div>

    <RouterLink
      v-if="auth.balance !== null"
      :to="{ path: '/me/usage', query: { tab: 'ledger' } }"
      class="hidden items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 sm:flex"
    >
      <SIcon name="balance" class="h-4 w-4" />
      {{ t('nav.balance') }} {{ formatMoney(auth.balance, 2) }}
    </RouterLink>

    <SButton variant="ghost" size="sm" icon="globe" :title="t('common.language')" :aria-label="t('common.language')" @click="toggleLocale">{{ currentLocale() === 'zh' ? '中' : 'EN' }}</SButton>
    <SButton variant="ghost" size="sm" :icon="app.theme === 'dark' ? 'sun' : 'moon'" icon-only :title="t('common.theme.toggle')" :aria-label="t('common.theme.toggle')" @click="app.toggleTheme()" />

    <SDropdown :actions="userActions" width="14rem" @select="onUserAction">
      <template #trigger="{ toggle, attrs }">
        <button type="button" class="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-surface-2" :aria-label="t('nav.userMenu')" v-bind="attrs" @click.stop="toggle">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {{ initial }}
          </span>
          <span class="hidden max-w-[12rem] truncate text-sm text-fg md:block">{{ auth.me?.email }}</span>
          <SIcon name="chevron-down" class="h-4 w-4 text-fg-subtle" />
        </button>
      </template>
      <template #header>
        <p class="truncate text-sm font-medium text-fg">{{ auth.me?.display_name || auth.me?.email }}</p>
        <p class="truncate text-xs text-fg-muted">{{ auth.me?.roles?.join(', ') }}</p>
      </template>
    </SDropdown>
    <ChangePasswordDialog v-model:open="pwdOpen" />
  </header>
</template>
