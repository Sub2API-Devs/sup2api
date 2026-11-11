<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SDrawer, SHint, SLink, SSectionTitle, SSpinner, confirm, toast } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import type { User } from '@/api/types'
import PriceSimulatorModal from '@/components/pricing/PriceSimulatorModal.vue'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import { useLatestRequest } from '@/components/pricing/latestRequest'
import { validRate } from '@/components/pricing/pricingFormat'
import type { SegmentedUser } from '@/components/pricing/segmentLookup'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import SegmentGroupsEditor from '@/views/segments/SegmentGroupsEditor.vue'
import UserSegmentPanel from './UserSegmentPanel.vue'

// Groups and pricing of one user: the segment he belongs to and what it gives
// him in every group. The settings of a named segment are every member's, so
// they are shown read-only; those of a personal segment are edited here and
// saved with the button in the footer. `changed` tells the list that the
// user is in another segment now.
const props = defineProps<{ open: boolean; user: User | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()

// ------------------------------------------------------------------ the user's segment

// Asked for by user: the list row is out of date as soon as he is moved from here.
async function segmentOf(userId: number): Promise<Segment | null> {
  const { segment: own } = await api.get<SegmentedUser>(`/users/${userId}`)
  return own ? api.get<Segment>(`/segments/${own.id}`) : null
}
const revision = ref(0)
const { result: segment, error } = useLatestRequest(
  () => (props.open && props.user ? { id: props.user.id, revision: revision.value } : null),
  ({ id }) => segmentOf(id),
  0
)

function onMoved() {
  revision.value++
  emit('changed')
}

// ------------------------------------------------------------------ personal settings

const editor = ref<InstanceType<typeof SegmentGroupsEditor>>()
const discount = ref('1')
const saving = ref(false)
watch(segment, (s) => {
  discount.value = s?.discount ?? '1'
})

const editable = computed(() => segment.value?.kind === 'personal' && auth.has('segment:manage'))
const discountChanged = computed(() => discount.value.trim() !== segment.value?.discount)
const dirty = computed(() => editable.value && (discountChanged.value || !!editor.value?.dirty))
const savable = computed(() => dirty.value && validRate(discount.value))

async function save() {
  const s = segment.value
  if (!s || !savable.value) return
  saving.value = true
  try {
    // The discount first: what the editor's save answers is then rated by it.
    if (discountChanged.value) segment.value = await api.patch<Segment>(`/segments/${s.id}`, { discount: discount.value.trim() })
    if (await editor.value?.save()) toast(t('common.saved'), 'success')
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}

async function close() {
  if (dirty.value && !(await confirm({ message: t('users.pricing.discard'), confirmText: t('users.pricing.discardSubmit') }))) return
  emit('update:open', false)
}

const simulatorOpen = ref(false)
</script>

<template>
  <SDrawer :open="open" width="xl" @update:open="close">
    <template #header>
      <div class="flex min-w-0 items-center gap-2">
        <h3 class="truncate text-base font-semibold text-fg">{{ user?.email }}</h3>
        <SegmentBadge :segment="segment ?? user?.segment" class="shrink-0" />
      </div>
      <p class="mt-0.5 truncate text-xs leading-5 text-fg-muted">{{ [user?.display_name, t('users.pricing.action')].filter(Boolean).join(' · ') }}</p>
    </template>

    <div class="space-y-6" data-testid="user-pricing-drawer">
      <SHint v-if="error" tone="danger" role="alert">{{ error }}</SHint>
      <SSpinner v-else-if="!user || !segment" block />
      <template v-else>
        <section>
          <SSectionTitle :title="t('users.pricing.membership')" />
          <UserSegmentPanel v-model:discount="discount" :user="user" :segment="segment" :editable="auth.has('segment:manage')" @changed="onMoved" />
        </section>
        <section>
          <SSectionTitle :title="t('users.pricing.groups')" />
          <SAlert v-if="segment.kind === 'named'" tone="neutral" dense class="mb-3" data-testid="user-pricing-inherited">
            {{ t('users.pricing.inherited', { segment: segment.name }) }}
            <template #actions><SLink to="/segments">{{ t('users.pricing.editSegment') }}</SLink></template>
          </SAlert>
          <SegmentGroupsEditor ref="editor" :segment-id="segment.id" :editable="editable" :discount="discount" />
        </section>
      </template>
    </div>

    <template #footer>
      <SButton v-permission="'price:read'" icon="price" class="me-auto" data-testid="user-pricing-simulate" @click="simulatorOpen = true">{{ t('users.pricing.simulate') }}</SButton>
      <SButton data-testid="user-pricing-close" @click="close">{{ t('common.close') }}</SButton>
      <SButton v-if="editable" variant="primary" :loading="saving" :disabled="!savable" data-testid="user-pricing-save" @click="save">{{ t('common.save') }}</SButton>
    </template>
  </SDrawer>

  <PriceSimulatorModal v-model:open="simulatorOpen" :preset="{ userId: user?.id }" />
</template>
