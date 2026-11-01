<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SField, SHint, SModal, SRadioGroup, SSelect, toast, type SelectOption } from '@sub2api/ui'
import type { Group } from '@/api/types'
import { useGroupsLookup } from '@/composables/lookups'
import { applyFormError } from '@/utils/formErrors'
import { formatNumber } from '@/utils/format'

// Deletes a group that still has API keys. Keys are only loosely bound to a
// group: DELETE /groups/:id?move_keys_to=<id> moves them to another group,
// without it they stay unbound (they answer group_deleted until their owner
// picks another group). The group's accounts only leave the group.
const props = defineProps<{ open: boolean; group: Group | null; keyCount: number }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'deleted'): void }>()
const { t } = useI18n()
const { groups } = useGroupsLookup()

const chosen = ref<'move' | 'unbind'>('move')
const target = ref<number | null>(null)
const errors = ref<Record<string, string>>({})
const busy = ref(false)

const targets = computed<SelectOption[]>(() =>
  groups.value
    .filter(g => g.id !== props.group?.id)
    .map(g => ({ value: g.id, label: g.status === 'active' ? g.name : `${g.name} · ${t('common.disabled')}` }))
)
// Nothing to move to: only unbinding is possible.
const mode = computed({
  get: () => (targets.value.length ? chosen.value : 'unbind'),
  set: (v: 'move' | 'unbind') => (chosen.value = v)
})
const modeOptions = computed<SelectOption[]>(() => [
  { value: 'move', label: t('groups.deleteKeys.move'), disabled: !targets.value.length },
  { value: 'unbind', label: t('groups.deleteKeys.unbind') }
])

watch(
  () => props.open,
  v => {
    if (!v) return
    useGroupsLookup(true)
    target.value = null
    errors.value = {}
    chosen.value = 'move'
  }
)

async function submit() {
  const g = props.group
  if (!g) return
  errors.value = {}
  if (mode.value === 'move' && !target.value) {
    errors.value.move_keys_to = t('common.required')
    return
  }
  busy.value = true
  try {
    await api.del(`/groups/${g.id}`, mode.value === 'move' ? { move_keys_to: target.value } : undefined)
    toast(t('common.deleted'), 'success')
    emit('update:open', false)
    emit('deleted')
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal
    :open="open"
    :title="t('groups.deleteKeys.title', { name: group?.name ?? '' })"
    width="md"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4" data-testid="group-delete">
      <SAlert tone="warning">{{ t('groups.deleteKeys.intro', { k: formatNumber(keyCount) }) }}</SAlert>
      <SRadioGroup v-model="mode" :options="modeOptions" :aria-label="t('groups.deleteKeys.title', { name: group?.name ?? '' })" />
      <SField
        v-if="mode === 'move'"
        :label="t('groups.deleteKeys.target')"
        required
        :hint="t('groups.deleteKeys.moveHint')"
        :error="errors.move_keys_to"
      >
        <SSelect v-model="target" :options="targets" :disabled="busy" data-testid="group-delete-target" />
      </SField>
      <SHint v-else size="xs">{{ t('groups.deleteKeys.unbindHint') }}</SHint>
      <SHint v-if="group?.account_count" size="xs">{{ t('groups.deleteKeys.accounts', { a: formatNumber(group.account_count) }) }}</SHint>
    </div>
    <template #footer>
      <SButton :disabled="busy" @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="danger" :loading="busy" data-testid="group-delete-confirm" @click="submit">{{ t('common.delete') }}</SButton>
    </template>
  </SModal>
</template>
