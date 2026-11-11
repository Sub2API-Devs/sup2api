<script setup lang="ts">
import { SBadge } from '@sub2api/ui'
import { useModHost } from './host'

// The user list of the settings a user is on (0.8.0): allowlist = only
// moderated after the request, never refused; blocklist = always moderated
// first. A user on both lists is blocklisted (the API then reports only
// that).
defineProps<{ allowlisted?: boolean; blocklisted?: boolean; size?: 'xs' | 'sm' }>()
const t = useModHost().t
</script>

<template>
  <SBadge v-if="blocklisted" tone="danger" :size="size" :title="t('lists.blockHint')">{{ t('lists.block') }}</SBadge>
  <SBadge v-else-if="allowlisted" tone="success" :size="size" :title="t('lists.allowHint')">{{ t('lists.allow') }}</SBadge>
</template>
