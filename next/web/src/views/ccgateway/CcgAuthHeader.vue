<script setup lang="ts">
// Heading of the Claude Code authorization panels (new account flow and the
// saved account's re-authorization): key icon, title and the login state.
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon } from '@sub2api/ui'

defineProps<{ title: string; state?: 'authorized' | 'loggedOut' | null; badgeTestid?: string }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2 font-medium text-fg">
      <SIcon name="key" class="h-4 w-4 text-primary-500" />{{ title }}
    </div>
    <SBadge v-if="state === 'authorized'" tone="success" :data-testid="badgeTestid"><SIcon name="check" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.authorized') }}</SBadge>
    <SBadge v-else-if="state === 'loggedOut'" tone="warning" :data-testid="badgeTestid">{{ t('ccgateway.accountAuth.loggedOut') }}</SBadge>
  </div>
</template>
