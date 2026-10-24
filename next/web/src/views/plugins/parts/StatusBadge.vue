<script setup lang="ts">
import { computed } from 'vue'
import { SBadge } from '@sub2api/ui'
import { statusTone } from '../pluginUtil'
import { useOptionalT } from '@/composables/optionalText'

// Plugin lifecycle / rollout / node state badge; unknown values are shown raw.
const props = defineProps<{ status?: string | null }>()
const tr = useOptionalT()
const label = computed(() => {
  const v = props.status || 'unknown'
  return tr(`plugins.status.${v}`, undefined, v)
})
</script>

<template>
  <SBadge :tone="statusTone(status)" dot>{{ label }}</SBadge>
</template>
