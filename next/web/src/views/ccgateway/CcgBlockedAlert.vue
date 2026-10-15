<script setup lang="ts">
// A container the core stopped (no proxy, proxy or account disabled): why,
// what to do, and the fixes — pick a proxy, open the proxies, synchronize
// again. `mode` picks the advice: a new account's draft, a re-authorization
// draft, or a saved account's own container.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton } from '@sub2api/ui'
import { blockReason } from './ccgAuthFlow'
import { useCcgText } from './ccgError'

const props = defineProps<{ reason?: string; mode: 'draft' | 'reauth' | 'saved'; canManage: boolean; syncing?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'fix-proxy'): void; (e: 'sync'): void }>()
const { t } = useI18n()
const { blockedTitle } = useCcgText()
const blocked = computed(() => blockReason(props.reason))
const advice = computed(() => {
  if (props.mode === 'reauth') return 'fixReauth'
  return props.mode === 'draft' && blocked.value !== 'account_disabled' ? 'fixDraft' : 'fix'
})
</script>

<template>
  <SAlert tone="danger" dense :title="blockedTitle(reason)" data-testid="ccgateway-auth-blocked" :data-reason="blocked">
    {{ t(`ccgateway.accountAuth.blocked.${advice}.${blocked}`) }}
    <template #actions>
      <SButton v-if="blocked === 'no_proxy' || blocked === 'proxy_disabled'" size="sm" variant="primary" icon="proxy" data-testid="ccgateway-auth-fix-proxy" @click="emit('fix-proxy')">{{ t('ccgateway.accountAuth.blocked.pickProxy') }}</SButton>
      <SButton v-if="blocked === 'proxy_disabled'" size="sm" variant="ghost" to="/proxies">{{ t('ccgateway.accountAuth.blocked.openProxies') }}</SButton>
      <SButton v-if="canManage" size="sm" variant="ghost" icon="refresh" :loading="syncing" :disabled="disabled" @click="emit('sync')">{{ t('ccgateway.accountAuth.resync') }}</SButton>
    </template>
  </SAlert>
</template>
