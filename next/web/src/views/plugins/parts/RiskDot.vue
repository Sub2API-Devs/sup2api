<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { riskDotClass } from '../pluginUtil'

defineProps<{ risk: string; label?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-1.5" :title="t(`plugins.risk.${risk}`)">
    <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full" :class="riskDotClass(risk)" />
    <span v-if="label" class="text-xs">{{ t(`plugins.risk.${risk}`) }}</span>
  </span>
</template>
