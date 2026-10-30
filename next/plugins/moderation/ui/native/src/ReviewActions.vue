<script setup lang="ts">
import { SButton } from '@sub2api/ui'
import { useModHost, type ReviewStatus } from './host'

// The bulk review buttons of a selection: false positive, confirmed, reset.
defineProps<{ loading?: boolean }>()
const emit = defineEmits<{ (e: 'review', status: ReviewStatus): void }>()
const t = useModHost().t
</script>

<template>
  <SButton size="sm" :loading="loading" @click="emit('review', 'false_positive')">{{ t('review.falsePositive') }}</SButton>
  <SButton size="sm" variant="danger" :loading="loading" @click="emit('review', 'confirmed')">{{ t('review.confirmed') }}</SButton>
  <SButton size="sm" variant="ghost" :loading="loading" @click="emit('review', 'pending')">{{ t('review.reset') }}</SButton>
</template>
