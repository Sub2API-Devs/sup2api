<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CcgRuntimeHealth } from '@/api/types'
defineProps<{ status?: CcgRuntimeHealth | null }>()
const { t } = useI18n()
</script>

<template>
  <div v-if="status?.status_source === 'local_snapshot'" class="mt-1 space-y-1 text-xs text-gray-500 dark:text-dark-400" data-testid="ccgateway-local-credential-status">
    <p>{{ t(status.credential_present ? 'ccgateway.credentialStatus.saved' : 'ccgateway.credentialStatus.absent') }}</p>
    <p v-if="status.credential_source_unresolved">{{ t('ccgateway.credentialStatus.unresolved') }}</p>
    <p v-if="status.access_token_expired === true" class="text-amber-600 dark:text-amber-400">{{ t('ccgateway.credentialStatus.expired') }}</p>
  </div>
</template>
