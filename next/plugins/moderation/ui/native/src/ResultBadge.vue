<script setup lang="ts">
import { SBadge, SIcon } from '@sub2api/ui'
import { enumLabel } from './format'
import { useModHost } from './host'
import { resultTone } from './tones'

// Record result: pass green, hit amber, block red, overturned blue, error gray.
// `replayed` (a cached hit applied again, ModEvent.replayed) adds a small ↻
// at the end of the badge, explained on hover.
defineProps<{ result?: string | null; replayed?: boolean }>()
const t = useModHost().t
</script>

<template>
  <SBadge :tone="resultTone(result || undefined)" dot>
    {{ enumLabel('result', result) }}
    <SIcon v-if="replayed" name="refresh" class="mod-replay-mark" :label="t('replay.badgeHint')" />
  </SBadge>
</template>
