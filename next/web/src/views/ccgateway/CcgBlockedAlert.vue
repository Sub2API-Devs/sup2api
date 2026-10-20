<script setup lang="ts">
// A container the core stopped: only a deleted account's runtime is stopped
// (account and proxy status never stop one), so this says why and offers to
// synchronize again.
import { useI18n } from 'vue-i18n'
import { SAlert, SButton } from '@sub2api/ui'
import { useCcgText } from './ccgError'

defineProps<{ reason?: string; canManage: boolean; syncing?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'sync'): void }>()
const { t } = useI18n()
const { blockedTitle } = useCcgText()
</script>

<template>
  <SAlert tone="danger" dense :title="blockedTitle(reason)" data-testid="ccgateway-auth-blocked" :data-reason="reason">
    <template v-if="canManage" #actions>
      <SButton size="sm" variant="ghost" icon="refresh" :loading="syncing" :disabled="disabled" @click="emit('sync')">{{ t('ccgateway.accountAuth.resync') }}</SButton>
    </template>
  </SAlert>
</template>
