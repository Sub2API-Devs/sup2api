<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import type { AccountTypePlatform } from '@/api/types'
import PlatformBadge from '@/components/platform/PlatformBadge.vue'

// The platforms an account type supports, as brand badges; one whose plugin
// is not enabled is marked unavailable. A dash when the type declares none.
defineProps<{ items: AccountTypePlatform[] }>()
const { t } = useI18n()
</script>

<template>
  <span v-if="items.length" class="inline-flex flex-wrap items-center gap-1" data-testid="type-platforms">
    <PlatformBadge
      v-for="p in items"
      :id="p.id"
      :key="p.id"
      :label="p.label"
      :unavailable="p.available === false ? t('platforms.unavailableHint', { id: p.id }) : undefined"
    />
  </span>
  <SHint v-else inline size="xs">—</SHint>
</template>
