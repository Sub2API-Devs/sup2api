<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { User } from '@/api/types'
import EntityPicker from '@/components/EntityPicker.vue'
import { notifyError } from '@/utils/errors'

// Finds one user (EntityPicker) and hands the parent his row (GET /users/:id):
// the lookup knows his name, the row says which user group he is in. The
// parent shows whom it picked and acts on him; the field itself stays empty.
defineProps<{ placeholder?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'select', user: User): void }>()

const busy = ref(false)

async function pick(id: string) {
  if (!id) return
  busy.value = true
  try {
    emit('select', await api.get<User>(`/users/${id}`))
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <EntityPicker id="" kind="user" :placeholder="placeholder" :disabled="disabled || busy" data-testid="user-pick" @update:id="pick" />
</template>
