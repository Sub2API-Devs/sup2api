<script setup lang="ts">
import { computed, ref } from 'vue'
import { SField } from '@sub2api/ui'
import type { SegmentRef } from '@/api/pricing'
import PersonalConvertDialog from '@/components/pricing/PersonalConvertDialog.vue'
import UserSearchSelect from '@/components/pricing/UserSearchSelect.vue'
import type { SegmentedUser } from '@/components/pricing/segmentLookup'
import { useAuthStore } from '@/stores/auth'

// Picks one user to price on his own and answers with his personal segment:
// the one he has, or the one the convert dialog gives him when he is still in
// a named segment. Renders nothing for a caller who may not do that.
defineProps<{ label?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'select', segment: SegmentRef): void }>()
const auth = useAuthStore()
const allowed = computed(() => auth.has('user:read') && auth.has('segment:manage'))

/** The user the convert dialog asks about. */
const converting = ref<SegmentedUser | null>(null)
const convertOpen = ref(false)

function pick(user: SegmentedUser) {
  if (user.segment?.kind === 'personal') return emit('select', user.segment)
  converting.value = user
  convertOpen.value = true
}
</script>

<template>
  <div v-if="allowed" data-testid="personal-segment-picker">
    <SField :label="label">
      <UserSearchSelect :disabled="disabled" @select="pick" />
    </SField>
    <PersonalConvertDialog v-model:open="convertOpen" :user="converting" @done="emit('select', $event)" />
  </div>
</template>
