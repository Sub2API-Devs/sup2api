<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import type { Group } from '@/api/types'
import GroupBadge from '@/components/platform/GroupBadge.vue'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'

// What a key of the group gets: rate, models, platforms and their endpoints.
defineProps<{ group: Group }>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-1.5 rounded-xl bg-surface-2 px-3 py-2 text-xs text-fg-muted" data-testid="key-group-details">
    <GroupBadge :name="group.name" :platforms="group.platforms" :rate="group.rate_multiplier" />
    <div>
      {{ t('apikeys.groupModels') }} · {{ t(group.model_filter_mode === 'blacklist' ? 'groups.blacklist' : 'groups.whitelist') }}:
      {{ group.model_allowlist?.length ? group.model_allowlist.join(', ') : t('common.unlimited') }}
    </div>
    <div v-if="group.description">{{ group.description }}</div>
    <template v-if="group.platforms">
      <SHint v-if="!group.platforms.length" tone="warning" size="xs">{{ t('platforms.keyNoPlatforms') }}</SHint>
      <div v-else>
        <div class="mb-1">{{ t('platforms.keyEndpoints') }}:</div>
        <PlatformEndpointsPreview :ids="group.platforms" :max="3" />
      </div>
    </template>
  </div>
</template>
