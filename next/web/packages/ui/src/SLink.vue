<script setup lang="ts">
// Styled link: <RouterLink class="link"> when `to` is given, else <a>.
// `external` opens in a new tab with rel="noopener noreferrer".
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{ to?: string | RouteLocationRaw; href?: string; external?: boolean }>()
</script>

<template>
  <RouterLink v-if="to" class="link" :to="to"><slot /></RouterLink>
  <a v-else class="link" :href="href" :target="external ? '_blank' : undefined" :rel="external ? 'noopener noreferrer' : undefined">
    <slot />
  </a>
</template>
