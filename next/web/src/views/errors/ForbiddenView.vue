<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { SButton, SEmpty } from '@sub2api/ui'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
/** The router guard could not load the caller (network, server): nothing is known to be missing. */
const loadFailed = computed(() => route.query.reason === 'load_failed')
const retry = () => {
  const target = route.query.redirect
  router.replace(typeof target === 'string' && target.startsWith('/') ? target : '/dashboard')
}
</script>

<template>
  <SEmpty v-if="loadFailed" size="lg" icon="warning" :title="t('nav.loadFailed.title')" :text="t('nav.loadFailed.desc')">
    <template #actions>
      <SButton variant="primary" icon="refresh" data-testid="forbidden-retry" @click="retry">{{ t('nav.loadFailed.retry') }}</SButton>
    </template>
  </SEmpty>
  <SEmpty v-else size="lg" icon="lock" :title="t('nav.forbidden.title')" :text="t('nav.forbidden.desc', { perm: String(route.query.perm || '') })">
    <template #actions>
      <SButton to="/dashboard" icon="arrow-left">{{ t('common.backHome') }}</SButton>
    </template>
  </SEmpty>
</template>
