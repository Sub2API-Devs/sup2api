<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import { statusTone } from '../pluginUtil'

// Plugin lifecycle / rollout / node state badge; unknown values are shown raw.
const props = defineProps<{ status?: string | null }>()
const { t, te } = useI18n()
const label = computed(() => {
  const v = props.status || 'unknown'
  return te(`plugins.status.${v}`) ? t(`plugins.status.${v}`) : v
})
</script>

<template>
  <SBadge :tone="statusTone(status)" dot>{{ label }}</SBadge>
</template>
