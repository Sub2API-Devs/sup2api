<script setup lang="ts">
import { SBadge } from '@sub2api/ui'
import { useModHost } from './host'

// Marks a record as a replayed cached hit (ModEvent.replayed): the verdict
// of an earlier request applied again, not a new violation.
defineProps<{ size?: 'xs' | 'sm' }>()
const t = useModHost().t
</script>

<template>
  <SBadge :size="size" tone="gray" :title="t('replay.badgeHint')">{{ t('replay.badge') }}</SBadge>
</template>
