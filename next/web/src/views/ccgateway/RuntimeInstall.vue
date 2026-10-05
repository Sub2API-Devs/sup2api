<script setup lang="ts">
// "Runtime" card of the CCGateway settings: the container images and the
// controller of the per-account containers are published on GHCR; the core
// installs or upgrades them on the Docker host over SSH
// (GET /system/ccgateway/runtime, POST .../runtime/install). Images show their
// short digest; states and failure reasons are codes translated here. The
// account editor links here (#ccgateway-runtime) when a runtime is not_configured.
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SHint, SIcon, confirm, toast } from '@sub2api/ui'
import type { CcgRuntimeImages } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useCcgError } from './ccgError'
import { knownReason } from './ccgAuthFlow'
import { RUNTIME_COMPONENTS, componentImages, runtimeState, shortDigest } from './runtimeInstall'

const props = defineProps<{ disabled?: boolean }>()
const { t } = useI18n()
const auth = useAuthStore()
const describe = useCcgError()
const ANCHOR = 'ccgateway-runtime'

const info = ref<CcgRuntimeImages | null>(null)
const loading = ref(false)
const installing = ref(false)
/** Load or install failure, translated. */
const error = ref<{ title: string; detail: string } | null>(null)
const manage = computed(() => auth.has('settings:manage'))
const state = computed(() => runtimeState(info.value))
const badge = computed(() => ({ notInstalled: 'gray', upToDate: 'success', outdated: 'warning', unknown: 'gray' } as const)[state.value])
/** Why the installed state is unknown (GET reason). */
const readReason = computed(() => {
  const r = info.value?.reason
  if (!r) return ''
  const k = knownReason(r)
  return k ? t(`ccgateway.reason.${k}`) : r
})
const action = computed<'install' | 'upgrade' | null>(() => (state.value === 'notInstalled' ? 'install' : state.value === 'outdated' ? 'upgrade' : null))

async function load() {
  loading.value = true
  error.value = null
  try {
    info.value = await api.get<CcgRuntimeImages>('/system/ccgateway/runtime', undefined, { signal: AbortSignal.timeout(60000) })
  } catch (e) {
    info.value = null
    error.value = { title: t('ccgateway.runtimeInstall.loadFailed'), detail: describe(e) }
  } finally {
    loading.value = false
  }
}

async function install() {
  const what = action.value || 'upgrade'
  const ok = await confirm({
    title: t(`ccgateway.runtimeInstall.${what}`),
    message: t('ccgateway.runtimeInstall.confirmMessage'),
    confirmText: t(`ccgateway.runtimeInstall.${what}`)
  })
  if (!ok) return
  installing.value = true
  error.value = null
  try {
    await api.post('/system/ccgateway/runtime/install', {}, { signal: AbortSignal.timeout(300000) })
    toast(t('ccgateway.runtimeInstall.done'), 'success')
  } catch (e) {
    error.value = { title: t('ccgateway.runtimeInstall.failed'), detail: describe(e) }
  } finally {
    installing.value = false
  }
  if (!error.value) await load()
}

onMounted(async () => {
  await load()
  // Opened from the account editor's "open settings" link.
  if (location.hash === `#${ANCHOR}`) {
    await nextTick()
    document.getElementById(ANCHOR)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
})
</script>

<template>
  <div :id="ANCHOR" data-testid="ccgateway-runtime">
    <SCard :title="t('ccgateway.runtimeInstall.title')" :subtitle="t('ccgateway.runtimeInstall.subtitle')">
      <template #actions>
        <SBadge v-if="info" :tone="badge" dot data-testid="ccgateway-runtime-state" :data-state="state">{{ t(`ccgateway.runtimeInstall.state.${state}`) }}</SBadge>
        <SButton size="sm" :loading="loading" :disabled="installing" :title="t('common.refresh')" :aria-label="t('common.refresh')" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
      </template>
      <div class="space-y-3 text-sm">
        <SHint v-if="readReason" tone="warning">{{ t('ccgateway.runtimeInstall.reason', { message: readReason }) }}</SHint>
        <div v-if="error" class="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-runtime-error">
          <div class="font-medium">{{ error.title }}</div>
          <div v-if="error.detail" class="break-all opacity-80">{{ t('ccgateway.runtimeInstall.reason', { message: error.detail }) }}</div>
        </div>
        <table v-if="info" class="w-full text-xs">
          <thead>
            <tr class="text-left text-gray-500 dark:text-dark-400">
              <th class="py-1 pr-3 font-medium">{{ t('ccgateway.runtimeInstall.component') }}</th>
              <th class="py-1 pr-3 font-medium">{{ t('ccgateway.runtimeInstall.expected') }}</th>
              <th class="py-1 font-medium">{{ t('ccgateway.runtimeInstall.installed') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in RUNTIME_COMPONENTS" :key="c" class="border-t border-gray-100 dark:border-dark-700" :data-component="c">
              <td class="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{{ t(`ccgateway.runtimeInstall.components.${c}`) }}</td>
              <td class="py-1.5 pr-3 font-mono" :title="componentImages(info, c).expected">{{ shortDigest(componentImages(info, c).expected) || '—' }}</td>
              <td class="py-1.5 font-mono" :class="componentImages(info, c).installed && shortDigest(componentImages(info, c).installed) !== shortDigest(componentImages(info, c).expected) ? 'text-amber-600 dark:text-amber-400' : ''" :title="componentImages(info, c).installed">
                {{ shortDigest(componentImages(info, c).installed) || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="info?.installed?.version" class="text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.runtimeInstall.version', { version: info.installed.version }) }}</p>
        <div v-if="manage && info && action" class="flex flex-wrap items-center gap-3">
          <SButton variant="primary" :loading="installing" :disabled="props.disabled || loading" data-testid="ccgateway-runtime-install" @click="install">
            <SIcon v-if="!installing" name="download" class="h-4 w-4" />{{ t(`ccgateway.runtimeInstall.${action}`) }}
          </SButton>
          <span v-if="installing" class="text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.runtimeInstall.installing') }}</span>
        </div>
        <SHint v-else-if="!manage && action" size="xs">{{ t('ccgateway.runtimeInstall.readOnly') }}</SHint>
      </div>
    </SCard>
  </div>
</template>
