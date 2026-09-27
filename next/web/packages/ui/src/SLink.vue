<script setup lang="ts">
// Styled link: <RouterLink class="link"> when `to` is given, `as="button"`
// renders <button type="button" class="link"> (with `disabled`), else <a>.
// `external` opens in a new tab with rel="noopener noreferrer".
import { RouterLink, type RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{ to?: string | RouteLocationRaw; href?: string; external?: boolean; as?: 'a' | 'button'; disabled?: boolean }>(),
  { as: 'a' }
)
</script>

<template>
  <RouterLink v-if="to" class="link" :to="to"><slot /></RouterLink>
  <button v-else-if="as === 'button'" type="button" class="link disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline" :disabled="disabled"><slot /></button>
  <a v-else class="link" :href="href" :target="external ? '_blank' : undefined" :rel="external ? 'noopener noreferrer' : undefined">
    <slot />
  </a>
</template>
