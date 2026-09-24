<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import { trustTone } from '../pluginUtil'

const props = defineProps<{ trust?: string | null }>()
const { t, te } = useI18n()
const label = computed(() => {
  const v = props.trust || 'unsigned'
  return te(`plugins.trust.${v}`) ? t(`plugins.trust.${v}`) : v
})
</script>

<template>
  <SBadge :tone="trustTone(trust)">
    <span v-if="trust === 'official'">✓</span>
    {{ label }}
  </SBadge>
</template>
