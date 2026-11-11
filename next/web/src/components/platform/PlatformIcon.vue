<script setup lang="ts">
import { computed } from 'vue'
import { usePlatforms } from '@/composables/platforms'
import BrandMark from './BrandMark.vue'
import { platformBrand } from './brands'

// A platform's brand mark in its vendor's colour, named by the platform's label.
const props = defineProps<{ id: string }>()
const platforms = usePlatforms()
platforms.load()
const brand = computed(() => platformBrand(props.id))
</script>

<template>
  <BrandMark :brand="brand" :label="platforms.label(id)" :data-platform="id" />
</template>
