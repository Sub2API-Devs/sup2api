<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SPageHeader, SSkeleton, STitleScope } from '@sub2api/ui'
import StickyView from '@/views/sticky/StickyView.vue'
import BillingSettingsCard from './BillingSettingsCard.vue'
import EnvironmentSettingsCard from './EnvironmentSettingsCard.vue'
import GatewaySettingsCard from './GatewaySettingsCard.vue'
import NotificationsSettingsCard from './NotificationsSettingsCard.vue'
import OffloadSettingsCard from './OffloadSettingsCard.vue'
import SchedulingPolicyView from './SchedulingPolicyView.vue'
import UpdateSourceCard from './UpdateSourceCard.vue'
import { useSettingsNav } from './settingsNav'

const PluginSettings = defineAsyncComponent(() => import('@/views/plugins/PluginSettingsView.vue'))

const { t } = useI18n()

// The page shown is ?tab=<key> (links such as /settings?tab=sticky keep
// working; plugin settings are ?tab=plugin:<key>). The navigation listing them
// is the system settings shell's (CONTRACTS §90).
const { entries, activeTab: active, waiting, missing } = useSettingsNav()
const activePlugin = computed(() => (active.value?.startsWith('plugin:') ? active.value.slice('plugin:'.length) : ''))
const activeLabel = computed(() => entries.value.find((x) => x.tab === active.value)?.label ?? '')
</script>

<template>
  <div class="space-y-5">
    <SPageHeader :title="t('nav.items.settings')" :description="t('settings.description')" />
    <STitleScope :title="activeLabel" class="min-w-0" role="region" :aria-label="activeLabel" data-testid="settings-panel">
      <SAlert v-if="missing" tone="warning" class="mb-4" data-testid="settings-missing">{{ t('settings.missingTab') }}</SAlert>
      <SSkeleton v-if="waiting" height="12rem" data-testid="settings-waiting" />
      <BillingSettingsCard v-else-if="active === 'billing'" />
      <GatewaySettingsCard v-else-if="active === 'gateway'" />
      <EnvironmentSettingsCard v-else-if="active === 'environment'" />
      <NotificationsSettingsCard v-else-if="active === 'notifications'" />
      <SchedulingPolicyView v-else-if="active === 'failure'" />
      <StickyView v-else-if="active === 'sticky'" />
      <OffloadSettingsCard v-else-if="active === 'offload'" />
      <UpdateSourceCard v-else-if="active === 'updates'" />
      <PluginSettings v-else-if="activePlugin" :key="activePlugin" :plugin-key="activePlugin" />
    </STitleScope>
  </div>
</template>
