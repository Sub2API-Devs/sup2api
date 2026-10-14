<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
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
      <SHint v-else inline tone="warning" size="xs">{{ t('platforms.keyNoPlatforms') }}</SHint>
    </div>
  </div>
</template>
