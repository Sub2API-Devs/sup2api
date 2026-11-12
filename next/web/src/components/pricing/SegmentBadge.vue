<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon } from '@sub2api/ui'
import type { SegmentRef } from '@/api/pricing'

// A user group as a chip. A named one shows its name; a personal one is
// always accent with the person mark, and names its user (the segment's name
// is the user's email) only with `withName`: next to the user it would repeat.
defineProps<{ segment?: SegmentRef | null; withName?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <span v-if="!segment" class="text-fg-subtle" data-testid="segment-badge">—</span>
  <SBadge v-else-if="segment.kind === 'personal'" tone="accent" class="max-w-full" :title="segment.name" data-testid="segment-badge" data-kind="personal">
    <SIcon name="user" class="h-3 w-3 shrink-0" />
    <span class="truncate">{{ withName ? t('pricing.segment.personalOf', { name: segment.name }) : t('pricing.segment.personal') }}</span>
  </SBadge>
  <SBadge v-else tone="gray" class="max-w-full" :title="segment.name" data-testid="segment-badge" data-kind="named">
    <span class="truncate">{{ segment.name }}</span>
  </SBadge>
</template>
