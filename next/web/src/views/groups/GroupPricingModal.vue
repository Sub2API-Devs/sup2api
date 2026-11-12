<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SModal, STabs, type TabItem } from '@sub2api/ui'
import type { Group } from '@/api/types'
import type { SegmentRef } from '@/api/pricing'
import type { DraftedSetting } from '@/components/pricing/accessRateDrafts'
import GroupPricingEditor from './GroupPricingEditor.vue'
import GroupSegmentsEditor from './GroupSegmentsEditor.vue'
import type { GroupPricingTab } from './groupEditTabs'

// Who may use a group, at which rates and at which model prices, for a caller
// who may read groups and not manage them: the two pricing tabs of the group
// editor, shown and not edited.
const props = defineProps<{ open: boolean; group: Group | null; initialTab?: GroupPricingTab }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { t } = useI18n()

const tab = ref<GroupPricingTab>('segments')
const pricingEditor = ref<InstanceType<typeof GroupPricingEditor>>()
/** The rows of the user groups tab, for the tab that prices per user group. */
const segmentRows = ref<DraftedSetting[]>([])
const tabs = computed<TabItem[]>(() => (['segments', 'pricing'] as const).map((key) => ({ key, label: t(`groups.tabs.${key}`) })))

watch(
  () => props.open,
  (v) => {
    if (v) tab.value = props.initialTab ?? 'segments'
  },
  { immediate: true }
)

/** Shows the model prices of one user group. */
function openPricing(segment: SegmentRef) {
  pricingEditor.value?.select(segment)
  tab.value = 'pricing'
}
</script>

<template>
  <SModal :open="open" :title="group ? t('groups.pricingTitle', { name: group.name }) : ''" width="2xl" @update:open="emit('update:open', $event)">
    <STabs v-if="open && group" v-model="tab" :tabs="tabs" :aria-label="t('groups.pricingTitle', { name: group.name })" data-testid="group-pricing-view">
      <!-- Both tabs stay mounted: the prices tab takes its user groups from the other. -->
      <div class="min-h-[24rem]">
        <GroupSegmentsEditor v-show="tab === 'segments'" :group-id="group.id" :visibility="group.visibility" :default-rate="String(group.rate_multiplier)" @rows="segmentRows = $event" @pricing="openPricing" />
        <GroupPricingEditor v-show="tab === 'pricing'" ref="pricingEditor" :group-id="group.id" :segments="segmentRows" :default-rate="String(group.rate_multiplier)" />
      </div>
    </STabs>
    <template #footer>
      <SButton variant="primary" data-testid="group-pricing-view-close" @click="emit('update:open', false)">{{ t('common.close') }}</SButton>
    </template>
  </SModal>
</template>
