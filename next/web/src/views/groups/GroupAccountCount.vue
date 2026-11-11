<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ProblemIcon from '@/components/ProblemIcon.vue'
import { formatNumber } from '@/utils/format'

// A group's account count; a group without accounts serves nothing, which a
// warning icon in front of the zero says.
defineProps<{ count?: number }>()
const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <ProblemIcon v-if="count === 0" :text="t('platforms.groupNoAccounts')" data-testid="group-no-accounts" />
    {{ formatNumber(count) }}
  </span>
</template>
