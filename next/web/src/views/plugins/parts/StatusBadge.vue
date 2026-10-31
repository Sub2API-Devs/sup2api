<script setup lang="ts">
import { computed } from 'vue'
import { SStatusBadge } from '@sub2api/ui'
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
  <SStatusBadge :status="status" :label="label" :tone="statusTone(status)" />
</template>
