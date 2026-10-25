<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SCode, SCopyButton, SEmpty, SHint, SModal, SSegmented, SSpinner, STabs } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { notifyError } from '@/utils/errors'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'
import { useCcSwitch } from './ccSwitch'
import { SHELLS, clientsFor, gatewayBase, usageURL, type Shell } from './keyClients'
import { revealKey } from './reveal'

// How to use an API key: the configuration of each client of its platforms
// with the full key filled in (revealed on open; a legacy key shows its
// prefix), CC Switch import, and the endpoints it can call.
const props = defineProps<{ apiKey: ApiKey | null; platforms?: string[] | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const openCcSwitch = useCcSwitch()

const base = gatewayBase()
const key = ref('')
const revealed = ref(false)
const loading = ref(false)
const clients = computed(() => clientsFor(props.platforms))
const tab = ref('')
const shell = ref<Shell>(navigator.userAgent.includes('Windows') ? 'powershell' : 'unix')
const client = computed(() => clients.value.find((c) => c.id === tab.value) ?? clients.value[0])
const snippets = computed(() => client.value?.snippets(base, key.value, shell.value) ?? [])
const tabs = computed(() => clients.value.map((c) => ({ key: c.id, label: c.label })))
const usageQuery = computed(() => `curl -H "Authorization: Bearer ${key.value}" ${usageURL(base)}`)
const shellOptions = computed(() => SHELLS.map((s) => ({ value: s, label: t(`apikeys.use.shells.${s}`) })))

watch(() => props.apiKey, async (k) => {
  key.value = k ? `${k.key_prefix}…` : ''
  revealed.value = false
  tab.value = clients.value[0]?.id ?? ''
  if (!k?.copyable) return
  loading.value = true
  try {
    key.value = await revealKey(k.id)
    revealed.value = true
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <SModal :open="!!apiKey" :title="t('apikeys.use.title', { name: apiKey?.name })" width="xl" @update:open="!$event && emit('close')">
    <div v-if="loading" class="flex justify-center py-10"><SSpinner /></div>
    <div v-else class="space-y-4" data-testid="key-use-guide">
      <SAlert v-if="!revealed" tone="warning">{{ t('apikeys.use.noKey') }}</SAlert>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-fg-muted">{{ t('apikeys.use.base') }}</span>
        <SCode inline :text="base" />
        <SCopyButton :text="base" icon-only size="xs" />
      </div>
      <STabs v-if="clients.length" v-model="tab" :tabs="tabs" size="sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <SSegmented v-if="client?.perShell" v-model="shell" :options="shellOptions" size="sm" :aria-label="t('apikeys.use.shell')" />
          <SButton v-if="client && revealed" variant="secondary" size="sm" icon="upload" data-testid="guide-ccswitch" @click="openCcSwitch(client, key)">{{ t('apikeys.ccSwitch.import') }}</SButton>
        </div>
        <div v-for="s in snippets" :key="s.path || 'shell'" class="space-y-1">
          <div class="flex items-center justify-between gap-2 text-xs text-fg-muted">
            <span>{{ s.path ? t('apikeys.use.file', { path: s.path }) : t('apikeys.use.run') }}</span>
            <SCopyButton :text="s.content" size="xs" :disabled="!revealed" />
          </div>
          <SCode :text="s.content" :wrap="false" class="text-xs" data-testid="key-use-snippet" />
        </div>
      </STabs>
      <SEmpty v-else size="sm" icon="code" :text="t('apikeys.use.noClient')" />
      <div class="space-y-1 border-t border-line pt-3">
        <div class="flex items-center justify-between gap-2 text-xs text-fg-muted">
          <span>{{ t('apikeys.use.usage') }}</span>
          <SCopyButton :text="usageQuery" size="xs" :disabled="!revealed" />
        </div>
        <SCode :text="usageQuery" :wrap="false" class="text-xs" data-testid="key-usage-query" />
      </div>
      <div v-if="platforms?.length" class="space-y-2 border-t border-line pt-3">
        <SHint size="xs">{{ t('apikeys.use.endpoints', { base }) }}</SHint>
        <PlatformEndpointsPreview :ids="platforms" />
      </div>
    </div>
    <template #footer>
      <SButton @click="emit('close')">{{ t('common.close') }}</SButton>
    </template>
  </SModal>
</template>
