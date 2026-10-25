<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import GroupBadge from '@/components/platform/GroupBadge.vue'

// Group of an API key as a badge of the platforms the key can access
// (CONTRACTS §13) and its rate multiplier. `platforms` undefined: the server
// did not report them; empty: the key reaches no platform.
defineProps<{ name: string; multiplier?: string | number; platforms?: string[] | null }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex min-w-0 max-w-72 items-center gap-2 whitespace-nowrap" data-testid="key-group">
    <GroupBadge :name="name" :platforms="platforms" :rate="multiplier" />
    <SHint v-if="platforms && !platforms.length" inline tone="warning" size="xs">{{ t('platforms.keyNoPlatforms') }}</SHint>
  </div>
</template>
