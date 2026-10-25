<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SDropdown, SRowAction } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { notifyError } from '@/utils/errors'
import { useCcSwitch } from './ccSwitch'
import { clientsFor, type KeyClient } from './keyClients'
import { revealKey } from './reveal'

// Imports a key into CC Switch: directly for one client of its platforms, from
// a menu for several; disabled without a client or for a key that cannot be
// revealed.
const props = defineProps<{ apiKey: ApiKey; platforms?: string[] | null }>()
const { t } = useI18n()
const open = useCcSwitch()
const clients = computed(() => clientsFor(props.platforms))
const busy = ref(false)
const disabled = computed(() => !clients.value.length || !props.apiKey.copyable)
const title = computed(() => (!props.apiKey.copyable ? t('apikeys.legacyCopyHint') : clients.value.length ? t('apikeys.ccSwitch.import') : t('apikeys.ccSwitch.noClient')))

async function importTo(client?: KeyClient) {
  if (!client || disabled.value || busy.value) return
  busy.value = true
  try {
    open(client, await revealKey(props.apiKey.id))
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SDropdown v-if="clients.length > 1" :actions="clients.map((c) => ({ key: c.id, label: c.label }))" :disabled="disabled" @select="importTo(clients.find((c) => c.id === $event))">
    <template #header>{{ t('apikeys.ccSwitch.pick') }}</template>
    <template #trigger="{ toggle, attrs }">
      <SRowAction icon="upload" label="CC Switch" :title="title" :loading="busy" :disabled="disabled" v-bind="attrs" data-testid="key-ccswitch" @click="toggle" />
    </template>
  </SDropdown>
  <SRowAction v-else icon="upload" label="CC Switch" :title="title" :loading="busy" :disabled="disabled" data-testid="key-ccswitch" @click="importTo(clients[0])" />
</template>
