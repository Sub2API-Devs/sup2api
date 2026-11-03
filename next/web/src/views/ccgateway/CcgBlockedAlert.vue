<script setup lang="ts">
// A container the core stopped: a deleted account's runtime, or the runtime of
// an account that stayed red for park_after_hours (account_parked, which the
// button starts again). This says why and offers to synchronize again.
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
      <SButton size="sm" variant="ghost" :icon="reason === 'account_parked' ? 'play' : 'refresh'" :loading="syncing" :disabled="disabled" data-testid="ccgateway-auth-blocked-sync" @click="emit('sync')">{{ reason === 'account_parked' ? t('ccgateway.runtimes.start') : t('ccgateway.accountAuth.resync') }}</SButton>
    </template>
  </SAlert>
</template>
