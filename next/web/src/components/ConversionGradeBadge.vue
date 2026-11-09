<script setup lang="ts">
// Route grade of a protocol conversion (CONVERT-MATRIX §5.1): native, good,
// fair, discouraged or local estimate; the tooltip shows the protocol chain.
// `converted` labels a converted grade as "Converted · fair" (usage rows).
import { computed } from 'vue'
import { SBadge } from '@sub2api/ui'
import { useOptionalT } from '@/composables/optionalText'
import { gradeTone, hopsText } from '@/utils/conversion'

const props = defineProps<{ grade: string; via?: string[]; converted?: boolean; size?: 'xs' | 'sm' }>()
const tr = useOptionalT()

const label = computed(() => {
  const name = tr(`accounts.conversion.grades.${props.grade}`, undefined, props.grade)
  return props.converted && props.grade !== 'local' && props.grade !== 'native'
    ? tr('accounts.conversion.convertedGrade', { grade: name })
    : name
})
const title = computed(() => hopsText(props.via) || tr(`accounts.conversion.gradeHints.${props.grade}`, undefined, ''))
</script>

<template>
  <SBadge :tone="gradeTone(grade)" :size="size" :title="title || undefined" data-testid="conversion-grade">{{ label }}</SBadge>
</template>
