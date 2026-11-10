<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SDropdown, SRowAction, type MenuAction } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { notifyError } from '@/utils/errors'
import { keyAppsFor } from './keyApps'
import { useOpenApp } from './openApp'
import { revealKey } from './reveal'

// The Quick setup menu of a key: an import into each app that can take it
// (CC Switch per client, Magpie), then the manual usage guide. A key that
// cannot be revealed has no import to offer: its apps are disabled and the
// header says why.
const props = defineProps<{ apiKey: ApiKey; platforms?: string[] | null }>()
const emit = defineEmits<{ (e: 'guide'): void }>()
const { t } = useI18n()
const openApp = useOpenApp()
const apps = computed(() => keyAppsFor(props.platforms))
const busy = ref(false)
const actions = computed<MenuAction[]>(() => [
  ...apps.value.map(a => ({ key: a.id, label: a.label, disabled: !props.apiKey.copyable })),
  { key: 'guide', label: t('apikeys.apps.guide'), divider: apps.value.length > 0 }
])

async function select(id: string) {
  const app = apps.value.find(a => a.id === id)
  if (!app) return emit('guide')
  busy.value = true
  try {
    openApp(app, await revealKey(props.apiKey.id))
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SDropdown :actions="actions" width="15rem" @select="select">
    <template v-if="apps.length" #header>
      <span data-testid="key-apps-header">{{ apiKey.copyable ? t('apikeys.apps.pick') : t('apikeys.apps.legacy') }}</span>
    </template>
    <template #trigger="{ toggle, attrs }">
      <SRowAction :label="t('apikeys.apps.title')" :loading="busy" v-bind="attrs" data-testid="key-quick-setup" @click="toggle" />
    </template>
  </SDropdown>
</template>
