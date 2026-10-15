<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SDescItem, SDescriptions, SHint, SLink, SModal, SStatusDot } from '@sub2api/ui'
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
const status = computed(() => {
  const r = updates.result
  if (uncertain.value) return t('coreUpdates.checkFailed')
  if (!r) return t('coreUpdates.notChecked')
  if (!r.repository) return t('coreUpdates.disabled')
  if (newVersion.value) return t('coreUpdates.available')
  return t(r.reason || !r.compatible ? 'coreUpdates.blocked' : 'coreUpdates.upToDate')
})
const versionText = computed(() => (version.value ? `v${version.value}` : '—'))
function go(to: RouteLocationRaw) {
  open.value = false
  void router.push(to)
}
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
    <button
      type="button"
      class="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xxs font-medium hover:bg-surface-2"
      :class="newVersion ? 'text-warning-600 dark:text-warning-400' : 'text-fg-muted'"
      :title="`${t('coreUpdates.current')}: ${version || '—'} · ${status}`"
      :aria-label="`${t('coreUpdates.title')} · ${status}`"
      @click="open = true"
    >
      <span class="truncate">{{ version || compact ? versionText : t('coreUpdates.title') }}</span>
      <SStatusDot v-if="newVersion" tone="warning" />
    </button>
    <SModal v-model:open="open" :title="t('coreUpdates.title')">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-xs text-fg-muted">{{ t('coreUpdates.current') }}</p><p class="text-2xl font-semibold">{{ versionText }}</p></div>
          <SButton size="sm" :loading="updates.busy" :disabled="importing" @click="updates.check(true)">{{ t('coreUpdates.check') }}</SButton>
        </div>
        <SHint :tone="uncertain ? 'danger' : newVersion ? 'warning' : 'muted'">{{ status }}</SHint>
        <SAlert v-if="updates.error" tone="danger" dense><span class="break-words">{{ updates.error }}</span></SAlert>
        <template v-if="updates.result">
          <SDescriptions dense label-width="7rem">
            <SDescItem :label="t('coreUpdates.repository')" :value="updates.result.repository || '—'" mono />
            <SDescItem :label="t('coreUpdates.latest')" :value="updates.result.latest_version || '—'" mono />
            <SDescItem :label="t('coreUpdates.checked')" :value="updates.result.checked_at ? formatDateTime(updates.result.checked_at) : '—'" />
          </SDescriptions>
          <SHint v-if="updates.result.repository && (updates.result.reason || !updates.result.compatible)" :tone="uncertain ? 'danger' : 'warning'">{{ updates.result.reason || t('coreUpdates.incompatible') }}</SHint>
          <div v-if="updates.result.notes" class="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-surface-2 p-3 text-sm">{{ updates.result.notes }}</div>
          <SLink v-if="releaseURL" :href="releaseURL" external class="inline-block text-sm">{{ t('coreUpdates.releaseNotes') }} ↗</SLink>
        </template>
        <SHint>{{ t('coreUpdates.importHint') }}</SHint>
        <div class="flex flex-wrap justify-end gap-2">
          <SButton v-if="auth.has('settings:read')" size="sm" @click="go({ path: '/settings', query: { tab: 'updates' } })">{{ t('coreUpdates.configure') }}</SButton>
          <SButton size="sm" @click="go('/system/upgrades')">{{ t('coreUpdates.openUpgrades') }}</SButton>
          <SButton v-if="auth.has('system:update:execute') && newVersion" size="sm" variant="primary" :loading="importing" :disabled="!updates.result?.compatible || updates.busy" @click="importRelease">{{ t('coreUpdates.import') }}</SButton>
        </div>
      </div>
    </SModal>
  </template>
  <span v-else class="inline-block max-w-full truncate px-1.5 text-xxs text-fg-muted" :title="t('coreUpdates.current')">{{ versionText }}</span>
</template>
