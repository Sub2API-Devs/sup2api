<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, SCard, SDropdown, SEmpty, SIcon, SModal, SPageHeader, SSpinner, STabs, confirm, type MenuAction, type TabItem } from '@sub2api/ui'
import type { Rollout } from '@/api/types'
import { lt } from '@/i18n'
import { errorMessage, notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import { consentPath } from './reviewCache'
import { compareVersions, isPendingConsent, type PluginDetail, type PluginSettings } from './pluginUtil'
import PluginAvatar from './parts/PluginAvatar.vue'
import StatusBadge from './parts/StatusBadge.vue'
import TrustBadge from './parts/TrustBadge.vue'
import OverviewTab from './detail/OverviewTab.vue'
import GrantsTab from './detail/GrantsTab.vue'
import NodesTab from './detail/NodesTab.vue'
import HooksTab from './detail/HooksTab.vue'
import JobsTab from './detail/JobsTab.vue'
import EventsTab from './detail/EventsTab.vue'
import EgressTab from './detail/EgressTab.vue'
import ResourcesTab from './detail/ResourcesTab.vue'
import SettingsTab from './detail/SettingsTab.vue'
import UninstallModal from './detail/UninstallModal.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const key = computed(() => String(route.params.key))
const detail = ref<PluginDetail | null>(null)
const settings = ref<PluginSettings | null>(null)
const loading = ref(true)
const loadError = ref('')
const notFound = ref(false)
const tab = ref(typeof route.query.tab === 'string' ? route.query.tab : 'overview')
const acting = ref('')
const uninstallOpen = ref(false)
const upgradeOpen = ref(false)
const upgradeVersion = ref('')

const name = computed(() => (detail.value ? lt(detail.value.name) || detail.value.key : key.value))
const status = computed(() => detail.value?.status || '')
const canManage = computed(() => auth.has('plugin:manage'))
const inRollout = computed(() => status.value === 'enabling' || status.value === 'upgrading')

const approvedUpgrades = computed(() =>
  (detail.value?.versions || [])
    .filter((v) => v.consent_status === 'approved' && v.version !== detail.value?.active_version)
    .filter((v) => !detail.value?.active_version || compareVersions(v.version, detail.value.active_version) > 0)
    .sort((a, b) => compareVersions(b.version, a.version))
)
const pendingVersions = computed(() => (detail.value?.versions || []).filter((v) => isPendingConsent(v.consent_status)))

const consented = computed(() => (typeof route.query.consented === 'string' ? route.query.consented : ''))
const consentedAction = computed<'enable' | 'upgrade' | null>(() => {
  if (!consented.value || !detail.value || !canManage.value) return null
  if (status.value === 'installed' || status.value === 'disabled') return 'enable'
  if (status.value === 'enabled' && consented.value !== detail.value.active_version) return 'upgrade'
  return null
})

const tabs = computed<TabItem[]>(() => {
  const d = detail.value
  const list: TabItem[] = [
    { key: 'overview', label: t('plugins.detail.tabs.overview') },
    { key: 'grants', label: t('plugins.detail.tabs.grants'), badge: d?.grants?.length },
    { key: 'nodes', label: t('plugins.detail.tabs.nodes'), badge: d?.nodes?.length },
    { key: 'hooks', label: t('plugins.detail.tabs.hooks'), badge: d?.hooks?.length },
    { key: 'jobs', label: t('plugins.detail.tabs.jobs'), badge: d?.jobs?.length },
    { key: 'events', label: t('plugins.detail.tabs.events') }
  ]
  if (auth.has(['plugin:egress:read', 'plugin:manage'])) list.push({ key: 'egress', label: t('plugins.detail.tabs.egress') })
  list.push({ key: 'resources', label: t('plugins.detail.tabs.resources') })
  if (settings.value?.schema) list.push({ key: 'settings', label: t('plugins.detail.tabs.settings') })
  return list
})

watch(tab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } })
})

const moreActions = computed<MenuAction[]>(() => [
  { key: 'refresh', label: t('common.refresh') },
  { key: 'rollout', label: t('plugins.detail.viewRollout') },
  {
    key: 'uninstall',
    label: t('plugins.uninstall.action'),
    danger: true,
    hidden: !auth.has('plugin:uninstall'),
    disabled: status.value === 'enabled' || inRollout.value
  }
])

async function loadSettings() {
  try {
    const s = await api.get<PluginSettings>(`/plugins/${encodeURIComponent(key.value)}/settings`)
    settings.value = s && s.schema ? s : null
  } catch {
    settings.value = null
  }
}

async function load() {
  loadError.value = ''
  notFound.value = false
  try {
    detail.value = await api.get<PluginDetail>(`/plugins/${encodeURIComponent(key.value)}`)
  } catch (e) {
    if (isApiError(e) && e.status === 404) notFound.value = true
    else loadError.value = errorMessage(e)
    detail.value = null
  } finally {
    loading.value = false
  }
  if (detail.value) {
    await loadSettings()
    if (!tabs.value.some((x) => x.key === tab.value)) tab.value = 'overview'
  }
}

async function refreshShell() {
  await usePluginStore().refresh()
  await useAppStore().loadMenus()
}

async function startRollout(action: 'enable' | 'disable' | 'upgrade', version?: string) {
  if (action === 'disable') {
    const ok = await confirm({
      title: t('plugins.detail.disableTitle', { name: name.value }),
      message: t('plugins.detail.disableConfirm'),
      danger: true,
      confirmText: t('common.disable')
    })
    if (!ok) return
  }
  acting.value = action
  try {
    const body = action === 'upgrade' ? { version } : undefined
    await api.post<Rollout>(`/plugins/${encodeURIComponent(key.value)}/${action}`, body)
    upgradeOpen.value = false
    router.push(`/plugins/${encodeURIComponent(key.value)}/rollout`)
  } catch (e) {
    notifyError(e)
  } finally {
    acting.value = ''
  }
}

function openUpgrade() {
  upgradeVersion.value = approvedUpgrades.value[0]?.version || ''
  upgradeOpen.value = true
}

function onMore(k: string) {
  if (k === 'refresh') load()
  else if (k === 'rollout') router.push(`/plugins/${encodeURIComponent(key.value)}/rollout`)
  else if (k === 'uninstall') uninstallOpen.value = true
}

async function onUninstalled() {
  await refreshShell()
  router.push('/plugins')
}

function dismissConsented() {
  const q = { ...route.query }
  delete q.consented
  router.replace({ query: q })
}

watch(key, () => {
  loading.value = true
  load()
})
onMounted(load)
</script>

<template>
  <div>
    <div class="mb-4">
      <RouterLink to="/plugins" class="link inline-flex items-center gap-1 text-sm">
        <SIcon name="arrow-left" class="h-4 w-4" />{{ t('plugins.list.title') }}
      </RouterLink>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><SSpinner size="lg" /></div>

    <SCard v-else-if="!detail">
      <SEmpty icon="plugin" :text="notFound ? t('plugins.detail.notFound', { key }) : loadError || t('common.loadFailed')">
        <SButton size="sm" @click="load">{{ t('common.refresh') }}</SButton>
      </SEmpty>
    </SCard>

    <template v-else>
      <SPageHeader :title="name">
        <template #before>
          <PluginAvatar :name="name" :plugin-key="detail.key" :icon="(detail.manifest as any)?.icon" />
        </template>
        <template #title-extra>
          <span class="font-mono text-sm text-gray-500">{{ detail.active_version ? 'v' + detail.active_version : '' }}</span>
          <span v-if="detail.desired_version && detail.desired_version !== detail.active_version" class="font-mono text-xs text-primary-600 dark:text-primary-400">
            → v{{ detail.desired_version }}
          </span>
          <StatusBadge :status="detail.status" />
          <TrustBadge :trust="detail.trust" />
        </template>
        <template #actions>
          <RouterLink v-if="inRollout" :to="`/plugins/${encodeURIComponent(detail.key)}/rollout`" class="btn btn-secondary btn-md">
            <SSpinner size="sm" />{{ t('plugins.detail.viewRollout') }}
          </RouterLink>
          <template v-if="canManage">
            <SButton
              v-if="status === 'installed' || status === 'disabled'"
              variant="primary"
              :loading="acting === 'enable'"
              @click="startRollout('enable')"
            >
              <SIcon name="play" class="h-4 w-4" />{{ t('common.enable') }}
            </SButton>
            <SButton v-if="status === 'enabled' && approvedUpgrades.length" variant="primary" @click="openUpgrade">
              <SIcon name="upload" class="h-4 w-4" />{{ t('plugins.detail.upgrade') }}
            </SButton>
            <SButton v-if="status === 'enabled'" :loading="acting === 'disable'" @click="startRollout('disable')">
              <SIcon name="stop" class="h-4 w-4" />{{ t('common.disable') }}
            </SButton>
          </template>
          <SDropdown :actions="moreActions" @select="onMore" />
        </template>
      </SPageHeader>

      <p v-if="detail.status_reason" class="-mt-3 mb-4 text-sm text-red-600 dark:text-red-400">{{ detail.status_reason }}</p>

      <!-- consent just recorded -->
      <div
        v-if="consented"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <span class="inline-flex items-center gap-2">
          <SIcon name="check" class="h-5 w-5" />{{ t('plugins.detail.consentedBanner', { version: consented }) }}
        </span>
        <span class="flex gap-2">
          <SButton v-if="consentedAction === 'enable'" size="sm" variant="primary" :loading="acting === 'enable'" @click="startRollout('enable')">
            <SIcon name="play" class="h-4 w-4" />{{ t('plugins.detail.enableNow') }}
          </SButton>
          <SButton
            v-if="consentedAction === 'upgrade'"
            size="sm"
            variant="primary"
            :loading="acting === 'upgrade'"
            @click="startRollout('upgrade', consented)"
          >
            <SIcon name="upload" class="h-4 w-4" />{{ t('plugins.detail.upgradeNow', { version: consented }) }}
          </SButton>
          <SButton size="sm" variant="ghost" @click="dismissConsented">{{ t('common.close') }}</SButton>
        </span>
      </div>

      <!-- versions waiting for consent -->
      <div
        v-for="v in pendingVersions"
        :key="v.version"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200"
      >
        <span class="inline-flex items-center gap-2">
          <SIcon name="shield" class="h-5 w-5" />{{ t('plugins.detail.pendingConsent', { version: v.version }) }}
        </span>
        <RouterLink v-if="auth.has('plugin:install')" :to="consentPath(detail.key, v.version)" class="btn btn-primary btn-sm">
          {{ t('plugins.list.review') }}
        </RouterLink>
      </div>

      <STabs v-model="tab" :tabs="tabs" class="mb-4" />

      <OverviewTab v-if="tab === 'overview'" :detail="detail" />
      <GrantsTab v-else-if="tab === 'grants'" :detail="detail" @changed="load" />
      <NodesTab v-else-if="tab === 'nodes'" :detail="detail" />
      <HooksTab v-else-if="tab === 'hooks'" :detail="detail" />
      <JobsTab v-else-if="tab === 'jobs'" :detail="detail" />
      <EventsTab v-else-if="tab === 'events'" :detail="detail" />
      <EgressTab v-else-if="tab === 'egress'" :detail="detail" @changed="load" />
      <ResourcesTab v-else-if="tab === 'resources'" :detail="detail" @changed="load" />
      <SettingsTab v-else-if="tab === 'settings' && settings" :plugin-key="detail.key" :settings="settings" @saved="loadSettings" />

      <UninstallModal v-model:open="uninstallOpen" :plugin-key="detail.key" :name="name" @done="onUninstalled" />

      <SModal v-model:open="upgradeOpen" :title="t('plugins.detail.upgradeTitle', { name })" width="sm">
        <p class="mb-3 text-sm muted">{{ t('plugins.detail.upgradeHint', { version: detail.active_version || '—' }) }}</p>
        <div class="space-y-2">
          <label
            v-for="v in approvedUpgrades"
            :key="v.version"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
            :class="upgradeVersion === v.version ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30' : 'border-gray-200 dark:border-dark-700'"
          >
            <input v-model="upgradeVersion" type="radio" :value="v.version" />
            <span class="font-mono">v{{ v.version }}</span>
          </label>
        </div>
        <template #footer>
          <SButton @click="upgradeOpen = false">{{ t('common.cancel') }}</SButton>
          <SButton variant="primary" :disabled="!upgradeVersion" :loading="acting === 'upgrade'" @click="startRollout('upgrade', upgradeVersion)">
            {{ t('plugins.detail.upgrade') }}
          </SButton>
        </template>
      </SModal>
    </template>
  </div>
</template>
