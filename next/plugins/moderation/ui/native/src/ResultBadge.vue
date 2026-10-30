<script setup lang="ts">
import { SBadge } from '@sub2api/ui'
import { enumLabel, resultTone } from './host'

// Record result: pass green, hit amber, block red, overturned blue, error gray.
defineProps<{ result?: string | null }>()
</script>

<template>
  <SBadge :tone="resultTone(result || undefined)" dot>{{ enumLabel('result', result) }}</SBadge>
</template>
