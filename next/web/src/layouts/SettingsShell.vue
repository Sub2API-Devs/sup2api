<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SSelect } from '@sub2api/ui'
import { SETTINGS_PAGE, provideSettingsNav, type SettingsEntry } from '@/views/settings/settingsNav'
import { navStateClass } from './navItem'
import { useActiveMenuPath } from './useActiveMenu'

/**
 * System settings (CONTRACTS §90): the navigation of the settings page and of
 * the pages that moved into it from the sidebar, beside whichever of them is
 * open. A side list on a wide screen, a select above the page on a narrow one.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { groups, entries, activeTab } = provideSettingsNav()
const activePath = useActiveMenuPath()

const onSettingsPage = computed(() => route.path === SETTINGS_PAGE)
/** The tab the open page stands for: the settings page's own, or one a page declares (a plugin's settings page). */
const currentTab = computed(() => (onSettingsPage.value ? activeTab.value : route.meta.settingsTab?.(route)))
const active = computed(() => entries.value.find(e => (e.tab ? e.tab === currentTab.value : e.path === activePath.value)))
const options = computed(() => groups.value.flatMap(g => g.entries.map(e => ({ value: e.key, label: `${g.label} · ${e.label}` }))))

function select(e: SettingsEntry | undefined) {
  if (!e || e === active.value) return
  if (e.path) void router.push(e.path)
  // A page's own sub-tab (?sub=) does not carry over to another page.
  else if (onSettingsPage.value) void router.replace({ query: { ...route.query, tab: e.tab, sub: undefined } })
  else void router.push({ path: SETTINGS_PAGE, query: { tab: e.tab } })
}
</script>

<template>
  <div class="grid max-w-screen-2xl gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
    <SSelect
      class="lg:hidden"
      :model-value="active?.key ?? ''"
      :options="options"
      :aria-label="t('settings.navLabel')"
      @update:model-value="select(entries.find(e => e.key === String($event)))"
    />
    <nav class="hidden lg:block" :aria-label="t('settings.navLabel')" data-testid="settings-nav">
      <div v-for="g in groups" :key="g.key" class="mb-4">
        <div class="mb-1 px-3 text-xxs font-semibold uppercase tracking-wider text-fg-subtle">{{ g.label }}</div>
        <button
          v-for="e in g.entries"
          :key="e.key"
          type="button"
          class="mb-0.5 block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
          :class="navStateClass(e === active)"
          :aria-current="e === active ? 'page' : undefined"
          :data-testid="`settings-nav-${e.key}`"
          @click="select(e)"
        >
          {{ e.label }}
        </button>
      </div>
    </nav>
    <div class="min-w-0">
      <slot />
    </div>
  </div>
</template>
