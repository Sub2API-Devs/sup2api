<script setup lang="ts">
import { SBadge } from '@sub2api/ui'
import { useModHost } from './host'

// Enabled / disabled state of a channel or flow (missing = deleted).
defineProps<{ enabled?: boolean | null; missing?: boolean; size?: 'xs' | 'sm' }>()
const t = useModHost().t
</script>

<template>
  <SBadge v-if="missing" tone="danger" :size="size">{{ t('channelDeleted') }}</SBadge>
  <SBadge v-else :tone="enabled ? 'success' : 'gray'" :size="size" dot>{{ enabled ? t('enabled') : t('disabled') }}</SBadge>
</template>
