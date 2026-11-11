<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SLink } from '@sub2api/ui'
import type { Group } from '@/api/types'

// How a group prices its models, in a table cell or a detail row: it follows
// the global prices, or so many models are priced in the group and so many
// prices are of user groups. With `link` the summary is a button that asks
// for the prices (`open`).
const props = defineProps<{ group: Pick<Group, 'price_rule_count' | 'segment_rule_count'>; link?: boolean }>()
const emit = defineEmits<{ (e: 'open'): void }>()
const { t } = useI18n()

const lines = computed(() => {
  const { price_rule_count: own, segment_rule_count: ofSegments } = props.group
  return [own ? t('groups.pricingSummary.models', { n: own }) : '', ofSegments ? t('groups.pricingSummary.segments', { n: ofSegments }) : ''].filter(Boolean)
})
</script>

<template>
  <SHint v-if="!lines.length" inline data-testid="group-pricing-summary">{{ t('groups.pricingSummary.global') }}</SHint>
  <component :is="link ? SLink : 'span'" v-else :as="link ? 'button' : undefined" class="text-left" data-testid="group-pricing-summary" @click="link && emit('open')">
    <span v-for="line in lines" :key="line" class="block whitespace-nowrap">{{ line }}</span>
  </component>
</template>
