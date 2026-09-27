<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SButton, SIcon } from '@sub2api/ui'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <SIcon name="search" class="mb-4 h-12 w-12 text-gray-300 dark:text-dark-600" />
    <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('nav.notFound.title') }}</h1>
    <p class="mt-2 text-sm text-gray-500 dark:text-dark-400">{{ t('nav.notFound.desc') }}</p>
    <SButton to="/dashboard" class="mt-6">{{ t('nav.forbidden.home') }}</SButton>
  </div>
</template>
