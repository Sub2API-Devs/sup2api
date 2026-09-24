<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SIcon } from '@sub2api/ui'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <SIcon name="lock" class="mb-4 h-12 w-12 text-gray-300 dark:text-dark-600" />
    <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('nav.forbidden.title') }}</h1>
    <p class="mt-2 text-sm text-gray-500 dark:text-dark-400">{{ t('nav.forbidden.desc', { perm: String(route.query.perm || '') }) }}</p>
    <RouterLink to="/dashboard" class="btn btn-secondary mt-6">{{ t('nav.forbidden.home') }}</RouterLink>
  </div>
</template>
