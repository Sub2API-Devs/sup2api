<script setup lang="ts">
import { computed } from 'vue'
import { SBadge } from '@sub2api/ui'
import { trustTone } from '../pluginUtil'
import { useOptionalT } from '@/composables/optionalText'

const props = defineProps<{ trust?: string | null }>()
const tr = useOptionalT()
const label = computed(() => {
  const v = props.trust || 'unsigned'
  return tr(`plugins.trust.${v}`, undefined, v)
})
</script>

<template>
  <SBadge :tone="trustTone(trust)">
    <span v-if="trust === 'official'">✓</span>
    {{ label }}
  </SBadge>
</template>
