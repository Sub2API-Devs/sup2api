<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SIcon from './SIcon.vue'
defineProps<{ text?: string; icon?: string }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-400 dark:text-dark-400">
    <SIcon :name="icon || 'inbox'" class="h-10 w-10 opacity-60" />
    <p class="text-sm">{{ text || t('ui.noData') }}</p>
    <slot />
  </div>
</template>
