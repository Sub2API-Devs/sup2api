<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SHint, SModal } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { useUpdatesStore } from '@/stores/updates'
import { notifyError } from '@/utils/errors'
import { formatDateTime } from '@/utils/format'

defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const auth = useAuthStore(), updates = useUpdatesStore(), router = useRouter()
const open = ref(false), importing = ref(false)
const basic = ref<{ version: string; managed: boolean } | null>(null)
const allowed = computed(() => auth.has('system:update:read') && basic.value?.managed === true)
const version = computed(() => (basic.value?.version || updates.result?.current_version)?.replace(/^v/, ''))
onMounted(async () => { try { basic.value = await api.get('/system/version') } catch { /* version unavailable remains explicitly unknown */ } })
const newVersion = computed(() => !updates.error && updates.result?.has_update)
const releaseURL = computed(() => {
  try {
    const url = new URL(updates.result?.release_url || '')
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : ''
  } catch { return '' }
})
const uncertain = computed(() => !!updates.error || !!updates.result?.repository && !updates.result.latest_version)
const status = computed(() => uncertain.value ? t('coreUpdates.checkFailed') : !updates.result ? t('coreUpdates.notChecked')
  : !updates.result.repository ? t('coreUpdates.disabled') : newVersion.value ? t('coreUpdates.available')
  : updates.result.reason || !updates.result.compatible ? t('coreUpdates.blocked') : t('coreUpdates.upToDate'))
watch(allowed, can => { if (can) void updates.check(); else { open.value = false; updates.invalidate() } }, { immediate: true })
async function importRelease() {
  if (!updates.result?.tag || !updates.result.compatible || updates.error) return
  importing.value = true
  try {
    const release = await api.post<{ digest: string }>('/system/releases/import', { repository: updates.result.repository, tag: updates.result.tag })
    open.value = false
    await router.push({ path: '/system/upgrades', query: { release: release.digest } })
  } catch (e) { notifyError(e) } finally { importing.value = false }
}
</script>

<template>
  <template v-if="allowed">
    <button type="button" class="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium hover:bg-gray-100 dark:hover:bg-dark-700"
      :class="newVersion ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-dark-400'"
      :title="`${t('coreUpdates.current')}: ${version || '—'} · ${status}`" :aria-label="`${t('coreUpdates.title')} · ${status}`" @click="open = true">
      <span class="truncate">{{ version ? `v${version}` : compact ? '—' : t('coreUpdates.title') }}</span>
      <span v-if="newVersion" class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
    </button>
    <SModal v-model:open="open" :title="t('coreUpdates.title')">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-xs text-gray-500">{{ t('coreUpdates.current') }}</p><p class="text-2xl font-semibold">{{ version ? `v${version}` : '—' }}</p></div>
          <SButton size="sm" :loading="updates.busy" :disabled="importing" @click="updates.check(true)">{{ t('coreUpdates.check') }}</SButton>
        </div>
        <SHint :tone="uncertain ? 'danger' : newVersion ? 'warning' : 'muted'">{{ status }}</SHint>
        <p v-if="updates.error" role="alert" class="break-words text-sm text-red-600 dark:text-red-400">{{ updates.error }}</p>
        <template v-if="updates.result">
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt class="text-gray-500">{{ t('coreUpdates.repository') }}</dt><dd class="break-all">{{ updates.result.repository || '—' }}</dd>
            <dt class="text-gray-500">{{ t('coreUpdates.latest') }}</dt><dd>{{ updates.result.latest_version || '—' }}</dd>
            <dt class="text-gray-500">{{ t('coreUpdates.checked') }}</dt><dd>{{ updates.result.checked_at ? formatDateTime(updates.result.checked_at) : '—' }}</dd>
          </dl>
          <SHint v-if="updates.result.repository && (updates.result.reason || !updates.result.compatible)" :tone="uncertain ? 'danger' : 'warning'">{{ updates.result.reason || t('coreUpdates.incompatible') }}</SHint>
          <div v-if="updates.result.notes" class="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm dark:bg-dark-800">{{ updates.result.notes }}</div>
          <a v-if="releaseURL" :href="releaseURL" target="_blank" rel="noopener noreferrer" class="inline-block text-sm text-primary-600 dark:text-primary-400">{{ t('coreUpdates.releaseNotes') }} ↗</a>
        </template>
        <SHint>{{ t('coreUpdates.importHint') }}</SHint>
        <div class="flex flex-wrap justify-end gap-2">
          <SButton v-if="auth.has('settings:read')" size="sm" @click="open = false; router.push({ path: '/settings', query: { tab: 'updates' } })">{{ t('coreUpdates.configure') }}</SButton>
          <SButton size="sm" @click="open = false; router.push('/system/upgrades')">{{ t('coreUpdates.openUpgrades') }}</SButton>
          <SButton v-if="auth.has('system:update:execute') && newVersion" size="sm" variant="primary" :loading="importing" :disabled="!updates.result?.compatible || updates.busy" @click="importRelease">{{ t('coreUpdates.import') }}</SButton>
        </div>
      </div>
    </SModal>
  </template>
  <span v-else class="inline-block max-w-full truncate px-1.5 text-[11px] text-gray-500 dark:text-dark-400" :title="t('coreUpdates.current')">{{ version ? `v${version}` : '—' }}</span>
</template>
