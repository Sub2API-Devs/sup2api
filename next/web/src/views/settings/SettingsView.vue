<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SPageHeader, STabLayout } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import StickyView from '@/views/sticky/StickyView.vue'
import BillingSettingsCard from './BillingSettingsCard.vue'
import GatewaySettingsCard from './GatewaySettingsCard.vue'
import FailurePolicySettings from './FailurePolicySettings.vue'
import OffloadSettingsCard from './OffloadSettingsCard.vue'
import UpdateSourceCard from './UpdateSourceCard.vue'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()

const TABS = [
  { key: 'billing', perm: 'settings:read', label: 'settings.tabs.billing' },
  { key: 'gateway', perm: 'settings:read', label: 'settings.tabs.gateway' },
  { key: 'failure', perm: 'settings:read', label: 'failurePolicy.title' },
  { key: 'sticky', perm: 'sticky:read', label: 'settings.tabs.sticky' },
  { key: 'offload', perm: 'settings:read', label: 'settings.tabs.offload' },
  { key: 'updates', perm: 'settings:read', label: 'coreUpdates.sourceTitle' }
]
const tabs = computed(() => TABS.filter((x) => auth.has(x.perm)).map((x) => ({ key: x.key, label: t(x.label) })))
const tab = ref('')
watch(() => route.query.tab, (value) => { if (typeof value === 'string') tab.value = value }, { immediate: true })
/** The selected tab when the user may see it, else the first visible one. */
const active = computed(() => (tabs.value.some((x) => x.key === tab.value) ? tab.value : tabs.value[0]?.key))
</script>

<template>
  <div class="space-y-5">
    <SPageHeader
      :title="t('settings.title')"
      :description="t('settings.description')"
    />
    <STabLayout
      :model-value="active ?? ''"
      :tabs="tabs"
      @update:model-value="tab = $event"
    >
      <BillingSettingsCard v-if="active === 'billing'" />
      <template v-else-if="active === 'gateway'">
        <GatewaySettingsCard />
      </template>
      <FailurePolicySettings v-else-if="active === 'failure'" />
      <StickyView v-else-if="active === 'sticky'" />
      <OffloadSettingsCard v-else-if="active === 'offload'" />
      <UpdateSourceCard v-else-if="active === 'updates'" />
    </STabLayout>
  </div>
</template>
