<script setup lang="ts">
// Beside a usage record's upstream protocol: the conversion grade ("Converted ·
// fair", the protocol chain on hover) and a marker when content was lost
// (CONVERT-MATRIX §7). A record without a conversion trace that still went to
// another protocol keeps the plain "converted" badge.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SIcon } from '@sub2api/ui'
import ConversionGradeBadge from '@/components/ConversionGradeBadge.vue'
import { lostCategories } from '@/utils/conversion'
import { convertedGrade, isConverted, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow; size?: 'xs' | 'sm' }>()
const { t } = useI18n()

const grade = computed(() => convertedGrade(props.row))
const lossTitle = computed(() => {
  const categories = lostCategories(props.row.conversion)
  return categories.length
    ? t('usage.conversion.lossy', {
        categories: categories.map(c => t(`accounts.conversion.categories.${c}`)).join(t('usage.conversion.separator'))
      })
    : ''
})
</script>

<template>
  <ConversionGradeBadge v-if="grade" :grade="grade" :via="row.conversion?.hops" :size="size" converted />
  <SBadge v-else-if="isConverted(row)" :size="size" tone="warning" :title="t('usage.convertedFrom', { protocol: row.protocol })">{{
    t('usage.converted')
  }}</SBadge>
  <span
    v-if="lossTitle"
    class="inline-flex shrink-0 text-warning-600 dark:text-warning-400"
    :title="lossTitle"
    :aria-label="lossTitle"
    role="img"
    data-testid="usage-conversion-loss"
  >
    <SIcon name="warning" class="h-3.5 w-3.5" />
  </span>
</template>
