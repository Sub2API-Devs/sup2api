<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SButton, SEmpty } from '@sub2api/ui'

const { t } = useI18n()
</script>

<template>
  <SEmpty size="lg" icon="search" :title="t('nav.notFound.title')" :text="t('nav.notFound.desc')">
    <template #actions>
      <SButton to="/dashboard" icon="arrow-left">{{ t('common.backHome') }}</SButton>
    </template>
  </SEmpty>
</template>
