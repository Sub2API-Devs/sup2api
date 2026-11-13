<script setup lang="ts">
// CCGateway settings page. Per-account containers are the only mode (CONTRACTS
// §53.9): the shared container's proxy, authorization and account creation are
// gone; accounts are authorized in the account editor and listed here. The
// settings take settings:read, the account containers the keys of the accounts
// list (the core checks a runtime by account:*, not settings:*): a caller with
// only the latter gets the containers alone.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SHint, SPageHeader } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_PAGE_PERMS } from '@/composables/useOwnership'
import RemoteSettings from './RemoteSettings.vue'
import AccountRuntimes from './AccountRuntimes.vue'
defineProps<{ embedded?: boolean }>()
const { t } = useI18n(), auth = useAuthStore()
const settings = computed(() => auth.has('settings:read'))
const accounts = computed(() => auth.has(ACCOUNT_PAGE_PERMS))
const manage = computed(() => auth.has('settings:manage'))
/** Re-reads the account list after the connection changed. */
const revision = ref(0)
/** Accounts with their own request log setting, shown next to the default level. */
const logOverrides = ref<number | null>(null)
</script>
<template>
  <div class="space-y-5">
    <SPageHeader v-if="!embedded" :title="t('ccgateway.title')" :description="t('ccgateway.description')"><template v-if="auth.has('plugin:read')" #actions><SButton to="/plugins/ccgateway">{{ t('ccgateway.pluginDetail') }}</SButton></template></SPageHeader>
    <template v-if="settings">
      <SHint v-if="!manage">{{ t('ccgateway.readOnly') }}</SHint>
      <RemoteSettings :disabled="!manage" :request-log-overrides="logOverrides" @saved="revision++">
        <template v-if="accounts" #accounts><AccountRuntimes :key="revision" @overrides="logOverrides = $event" /></template>
      </RemoteSettings>
    </template>
    <AccountRuntimes v-else />
  </div>
</template>
