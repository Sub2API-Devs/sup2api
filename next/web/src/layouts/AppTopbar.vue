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

/** The pages above this one (meta.parent, followed upwards), outermost first. */
const crumbs = computed(() => {
  const out: Array<{ path: string; label: string }> = []
  const seen = new Set<string>()
  let parent = route.meta.parent
  while (parent && !seen.has(parent) && out.length < 4) {
    seen.add(parent)
    const meta = router.resolve(parent).meta
    out.unshift({ path: parent, label: meta.title ? t(meta.title) : parent })
    parent = meta.parent
  }
  return out
})
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
    class="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-xl sm:px-5"
  >
    <SButton variant="ghost" size="sm" icon="menu" icon-only class="lg:hidden" :aria-label="t('nav.openMenu')" :aria-expanded="app.mobileNavOpen" @click="app.mobileNavOpen = true" />
    <div class="flex min-w-0 flex-1 items-baseline gap-3">
      <nav v-if="crumbs.length" :aria-label="t('nav.breadcrumb')" class="flex min-w-0 shrink items-center gap-1 text-sm text-fg-muted" data-testid="breadcrumbs">
        <template v-for="c in crumbs" :key="c.path">
          <RouterLink :to="c.path" class="truncate hover:text-fg">{{ c.label }}</RouterLink>
          <SIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        </template>
      </nav>
      <h1 class="shrink-0 text-base font-semibold text-fg">{{ title }}</h1>
      <p v-if="app.pageDescription" class="hidden min-w-0 truncate text-xs text-fg-muted md:block" :title="app.pageDescription" data-testid="page-description">{{ app.pageDescription }}</p>
    </div>

    <RouterLink
      v-if="auth.balance !== null"
      :to="{ path: '/me/usage', query: { tab: 'ledger' } }"
      class="hidden items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 sm:flex"
    >
      <SIcon name="balance" class="h-4 w-4" />
      {{ t('nav.balance') }} {{ formatMoney(auth.balance, 2) }}
    </RouterLink>

    <SButton variant="ghost" size="sm" icon="globe" :title="t('common.language')" :aria-label="t('common.language')" @click="toggleLocale">{{ currentLocale() === 'zh' ? '中' : 'EN' }}</SButton>
    <SButton variant="ghost" size="sm" :icon="app.theme === 'dark' ? 'sun' : 'moon'" icon-only :title="t('common.theme.toggle')" :aria-label="t('common.theme.toggle')" @click="app.toggleTheme()" />

    <SDropdown :actions="userActions" width="14rem" @select="onUserAction">
      <template #trigger="{ toggle, attrs }">
        <button type="button" class="flex items-center gap-2 rounded-lg px-1.5 py-0.5 hover:bg-surface-2" :aria-label="t('nav.userMenu')" v-bind="attrs" @click.stop="toggle">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
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
