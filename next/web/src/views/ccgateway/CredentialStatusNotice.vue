<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import type { CcgRuntimeHealth } from '@/api/types'
defineProps<{ status?: CcgRuntimeHealth | null }>()
const { t } = useI18n()
</script>

<template>
  <div v-if="status?.status_source === 'local_snapshot'" class="mt-1 space-y-1 text-xs text-fg-muted" data-testid="ccgateway-local-credential-status">
    <p>{{ t(status.credential_present ? 'ccgateway.credentialStatus.saved' : 'ccgateway.credentialStatus.absent') }}</p>
    <p v-if="status.credential_source_unresolved">{{ t('ccgateway.credentialStatus.unresolved') }}</p>
    <SHint v-if="status.access_token_expired === true" tone="warning" size="xs">{{ t('ccgateway.credentialStatus.expired') }}</SHint>
  </div>
</template>
