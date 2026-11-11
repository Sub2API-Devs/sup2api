<script setup lang="ts">
import { computed } from 'vue'
import type { UsageLog } from '@/api/types'
import PlatformIcon from '@/components/platform/PlatformIcon.vue'
import { accountPlatform } from './usage'

// The mark of the platform a request reached its upstream account on; nothing
// when the record does not say which (usage.accountPlatform).
const props = defineProps<{ row: Pick<UsageLog, 'upstream_protocol'> }>()
const platform = computed(() => accountPlatform(props.row))
</script>

<template>
  <PlatformIcon v-if="platform" :id="platform" />
</template>
