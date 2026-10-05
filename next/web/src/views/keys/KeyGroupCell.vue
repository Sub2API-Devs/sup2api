<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'

// Group of an API key plus the platforms the key can access (CONTRACTS §13).
// `platforms` undefined: the server did not report them.
defineProps<{ name: string; platforms?: string[] | null }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex min-w-0 items-center gap-2 whitespace-nowrap" data-testid="key-group">
    <div class="max-w-64 truncate" :title="name">{{ name }}</div>
    <div v-if="platforms" class="shrink-0">
      <PlatformBadges v-if="platforms.length" :ids="platforms" />
      <span v-else class="text-[11px] text-amber-600 dark:text-amber-400">{{ t('platforms.keyNoPlatforms') }}</span>
    </div>
  </div>
</template>
