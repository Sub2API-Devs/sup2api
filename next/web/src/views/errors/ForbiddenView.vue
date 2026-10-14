<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SButton, SEmpty } from '@sub2api/ui'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <SEmpty size="lg" icon="lock" :title="t('nav.forbidden.title')" :text="t('nav.forbidden.desc', { perm: String(route.query.perm || '') })">
    <template #actions>
      <SButton to="/dashboard" icon="arrow-left">{{ t('common.backHome') }}</SButton>
    </template>
  </SEmpty>
</template>
