<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SHint, SSettingRow } from '@sub2api/ui'
import { canManage, clearVerdictCache, toastError, useModHost } from './host'

// The row under the verdict cache days of the settings tab: says when the
// stored settings keep the cache off (`off`: the retired cache_ttl_seconds
// = 0), and lets moderation:manage users empty the verdict cache of every
// node (POST /verdict-cache/clear) — its own action, not part of the save.
// Renders nothing when there is neither to show.
defineProps<{ off: boolean }>()
const host = useModHost()
const t = host.t

const canClear = computed(() => canManage())
const clearing = ref(false)
async function clear() {
  const ok = await host.confirm({ title: t('settingsTab.clearCache'), message: t('settingsTab.clearCacheConfirm'), confirmText: t('settingsTab.clearCache'), danger: true })
  if (!ok) return
  clearing.value = true
  try {
    await clearVerdictCache()
    host.toast(t('settingsTab.cacheCleared'), 'success')
  } catch (e) {
    toastError(e)
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <SSettingRow v-if="canClear || off" :label="t('settingsTab.clearCache')" :description="t('settingsTab.clearCacheHint')">
    <div class="mod-form mod-setting-control">
      <SHint v-if="off" size="xs" tone="warning">{{ t('settingsTab.cacheOff') }}</SHint>
      <SButton v-if="canClear" size="sm" icon="trash" :loading="clearing" data-testid="mod-clear-cache" @click="clear">{{ t('settingsTab.clearCache') }}</SButton>
    </div>
  </SSettingRow>
</template>
