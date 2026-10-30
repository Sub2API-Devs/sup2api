<script setup lang="ts">
import { computed } from 'vue'
import { SHint, SLink } from '@sub2api/ui'
import { userName } from './users'

// A user as "name #id" (name from the core when readable, else "#id");
// `link` makes it a button that emits click.
const props = defineProps<{ userId: number | null | undefined; link?: boolean; title?: string }>()
const emit = defineEmits<{ (e: 'click', id: number): void }>()
const name = computed(() => userName(props.userId))
</script>

<template>
  <SHint v-if="!userId" inline>—</SHint>
  <component :is="link ? SLink : 'span'" v-else :as="link ? 'button' : undefined" class="mod-user" :title="title" @click.stop="link && emit('click', userId)">
    <span v-if="name" class="mod-user-name">{{ name }}</span>
    <span class="mod-num" :class="name ? 'mod-sub' : ''">#{{ userId }}</span>
  </component>
</template>
