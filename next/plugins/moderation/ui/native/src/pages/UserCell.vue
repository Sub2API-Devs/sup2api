<script setup lang="ts">
import { watchEffect } from 'vue'
import { SHint, SLink } from '@sub2api/ui'
import { loadUsers, userName } from '../directory'

// A user as "name (#id)" (core /users/:id, loaded in the background; "#id"
// without user:read). `link` makes it a button that emits open.
const props = defineProps<{ id: number | null | undefined; link?: boolean; title?: string }>()
const emit = defineEmits<{ (e: 'open', id: number): void }>()
watchEffect(() => {
  if (props.id) loadUsers([props.id])
})
</script>

<template>
  <SHint v-if="!id" inline>—</SHint>
  <SLink v-else-if="link" as="button" class="mod-pg-user" :title="title" @click.stop="emit('open', id)">{{ userName(id) }}</SLink>
  <span v-else class="mod-pg-user">{{ userName(id) }}</span>
</template>

<style scoped>
.mod-pg-user {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
