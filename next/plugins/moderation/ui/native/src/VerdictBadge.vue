<script setup lang="ts">
import { SBadge } from '@sub2api/ui'
import { enumLabel, verdictTone } from './host'

// Verdict badge: pass=green, flag=amber, block=red, error=gray.
defineProps<{ verdict?: string | null }>()
</script>

<template>
  <SBadge :tone="verdictTone(verdict || undefined)" dot>{{ enumLabel('verdict', verdict) }}</SBadge>
</template>
