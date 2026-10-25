<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'

// Group of an API key, its rate multiplier when it is not ×1, plus the
// platforms the key can access (CONTRACTS §13). `platforms` undefined: the
// server did not report them.
const props = defineProps<{ name: string; multiplier?: string | number; platforms?: string[] | null }>()
const { t } = useI18n()
const rate = computed(() => (props.multiplier === undefined || Number(props.multiplier) === 1 ? '' : String(props.multiplier)))
</script>

<template>
  <div class="flex min-w-0 items-center gap-2 whitespace-nowrap" data-testid="key-group">
    <span class="max-w-56 truncate font-medium text-fg" :title="name">{{ name }}</span>
    <span v-if="rate" class="text-xs tabular-nums text-fg-muted" :title="t('apikeys.groupMultiplier', { n: rate })">×{{ rate }}</span>
    <template v-if="platforms">
      <PlatformBadges v-if="platforms.length" :ids="platforms" size="xs" nowrap />
      <SHint v-else inline tone="warning" size="xs">{{ t('platforms.keyNoPlatforms') }}</SHint>
    </template>
  </div>
</template>
