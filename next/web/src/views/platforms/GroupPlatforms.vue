<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SIcon } from '@sub2api/ui'
import type { Group } from '@/api/types'
import PlatformBadges from './PlatformBadges.vue'

// Platforms a group can serve (from the account types of its accounts), or
// a warning when it cannot serve anything.
const props = defineProps<{ group: Pick<Group, 'platforms' | 'account_count'>; hint?: boolean }>()
const { t } = useI18n()

const ids = computed(() => props.group.platforms || [])
const noAccounts = computed(() => props.group.account_count === 0)
</script>

<template>
  <div data-testid="group-platforms">
    <p v-if="noAccounts" class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" data-testid="group-no-accounts">
      <SIcon name="warning" class="h-3.5 w-3.5 shrink-0" />{{ t('platforms.groupNoAccounts') }}
    </p>
    <p v-else-if="!ids.length" class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <SIcon name="warning" class="h-3.5 w-3.5 shrink-0" />{{ t('platforms.groupNoPlatforms') }}
    </p>
    <template v-else>
      <PlatformBadges :ids="ids" />
      <p v-if="hint" class="muted mt-1 text-xs">{{ t('platforms.groupHint') }}</p>
    </template>
  </div>
</template>
