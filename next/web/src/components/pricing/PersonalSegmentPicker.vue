<script setup lang="ts">
import { computed, ref } from 'vue'
import { SField } from '@sub2api/ui'
import type { User } from '@/api/types'
import type { SegmentRef } from '@/api/pricing'
import { useAuthStore } from '@/stores/auth'
import PersonalConvertDialog from './PersonalConvertDialog.vue'
import UserPick from './UserPick.vue'

// Picks one user to price on his own and answers with his personal segment:
// the one he has, or the one the convert dialog gives him when he is still in
// a named segment (`created` true: there is one more of them now). Renders
// nothing for a caller who may not do that.
defineProps<{ label?: string; hint?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'select', segment: SegmentRef, created: boolean): void }>()
const auth = useAuthStore()
const allowed = computed(() => auth.has('user:read') && auth.has('segment:manage'))

/** The user the convert dialog asks about. */
const converting = ref<User | null>(null)
const convertOpen = ref(false)

function pick(user: User) {
  if (user.segment?.kind === 'personal') return emit('select', user.segment, false)
  converting.value = user
  convertOpen.value = true
}
</script>

<template>
  <div v-if="allowed" data-testid="personal-segment-picker">
    <SField :label="label" :hint="hint">
      <UserPick :disabled="disabled" @select="pick" />
    </SField>
    <PersonalConvertDialog v-model:open="convertOpen" :user="converting" @done="emit('select', $event, true)" />
  </div>
</template>
