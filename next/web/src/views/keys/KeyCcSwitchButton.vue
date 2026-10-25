<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SDropdown } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { notifyError } from '@/utils/errors'
import { useCcSwitch } from './ccSwitch'
import { clientsFor, type KeyClient } from './keyClients'
import { revealKey } from './reveal'

// Imports a key into CC Switch: directly for one client of its platforms, from
// a menu for several, not at all for none or a key that cannot be revealed.
const props = defineProps<{ apiKey: ApiKey; platforms?: string[] | null }>()
const { t } = useI18n()
const open = useCcSwitch()
const clients = computed(() => clientsFor(props.platforms))
const busy = ref(false)
const disabled = computed(() => busy.value || !props.apiKey.copyable)

async function importTo(client?: KeyClient) {
  if (!client || disabled.value) return
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
  <template v-if="clients.length">
    <SDropdown v-if="clients.length > 1" :actions="clients.map((c) => ({ key: c.id, label: c.label }))" :disabled="disabled" @select="importTo(clients.find((c) => c.id === $event))">
      <template #header>{{ t('apikeys.ccSwitch.pick') }}</template>
      <template #trigger="{ toggle, attrs }">
        <SButton variant="ghost" size="sm" icon="upload" icon-right="chevron-down" :loading="busy" :disabled="disabled" v-bind="attrs" data-testid="key-ccswitch" @click.stop="toggle">{{ t('apikeys.ccSwitch.import') }}</SButton>
      </template>
    </SDropdown>
    <SButton v-else variant="ghost" size="sm" icon="upload" :loading="busy" :disabled="disabled" :title="apiKey.copyable ? clients[0].label : t('apikeys.legacyCopyHint')" data-testid="key-ccswitch" @click.stop="importTo(clients[0])">{{ t('apikeys.ccSwitch.import') }}</SButton>
  </template>
</template>
