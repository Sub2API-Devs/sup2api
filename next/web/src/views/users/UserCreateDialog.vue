<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SCheckbox, SField, SFormModal, SHint, SInput, toast } from '@sub2api/ui'
import type { Role } from '@/api/types'
import SegmentSelect from '@/components/pricing/SegmentSelect.vue'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { applyFormError } from '@/utils/formErrors'
import { useNamedSegments } from './userSegments'

// New user (POST /users), with the roles the page has loaded. A caller who
// lists and manages segments also says which one the user joins
// (`segment_id`); left out, the server puts him in the default segment.
const props = defineProps<{ open: boolean; roles: Role[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'created'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const segments = useNamedSegments()
const defaultSegmentId = computed(() => segments.value.find((s) => s.is_default)?.id ?? null)
const canPlace = computed(() => auth.has('segment:read') && auth.has('segment:manage'))

const creating = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({ email: '', display_name: '', password: '', role_keys: [] as string[], segment_id: null as number | null })

watch(
  () => props.open,
  (v) => {
    if (!v) return
    Object.assign(form, { email: '', display_name: '', password: '', role_keys: ['user'], segment_id: defaultSegmentId.value })
    errors.value = {}
  }
)

/** Without role:assign only the default "user" role can be given at creation. */
function roleSelectable(key: string) {
  return auth.has('role:assign') || key === 'user'
}

function toggleKey(listRef: string[], key: string) {
  const i = listRef.indexOf(key)
  if (i >= 0) listRef.splice(i, 1)
  else listRef.push(key)
}

/** Supplier is an add-on role: a supplier is a user too, so checking it checks the default role with it. */
function toggleRole(key: string) {
  toggleKey(form.role_keys, key)
  if (key === 'supplier' && form.role_keys.includes('supplier') && !form.role_keys.includes('user')) form.role_keys.push('user')
}

async function submit() {
  errors.value = {}
  if (!form.email.trim()) errors.value.email = t('common.required')
  if (form.password.length < 8) errors.value.password = t('users.passwordTooShort')
  if (Object.keys(errors.value).length) return
  creating.value = true
  try {
    await api.post('/users', {
      email: form.email.trim(),
      display_name: form.display_name.trim(),
      password: form.password,
      role_keys: form.role_keys,
      segment_id: canPlace.value ? (form.segment_id ?? undefined) : undefined
    })
    toast(t('common.created'), 'success')
    emit('update:open', false)
    emit('created')
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <SFormModal :open="open" :title="t('users.create')" :loading="creating" :submit-text="t('common.create')" :submit-attrs="{ 'data-testid': 'user-create-submit' }" data-testid="user-create-dialog" @update:open="emit('update:open', $event)" @submit="submit">
    <SField :label="t('users.email')" required :error="errors.email">
      <SInput v-model="form.email" type="email" autocomplete="off" />
    </SField>
    <SField :label="t('users.displayName')" :error="errors.display_name">
      <SInput v-model="form.display_name" />
    </SField>
    <SField :label="t('users.password')" required :hint="t('users.passwordHint')" :error="errors.password">
      <SInput v-model="form.password" type="password" autocomplete="new-password" revealable />
    </SField>
    <SField :label="t('users.roles')" :error="errors.role_keys">
      <div v-if="roles.length" class="flex flex-wrap gap-x-4 gap-y-2">
        <SCheckbox
          v-for="r in roles"
          :key="r.key"
          :model-value="form.role_keys.includes(r.key)"
          :disabled="!roleSelectable(r.key)"
          :label="lt(r.name) || r.key"
          @update:model-value="toggleRole(r.key)"
        />
      </div>
      <SHint v-else>{{ t('users.rolesUnavailable') }}</SHint>
    </SField>
    <SField v-if="canPlace" :label="t('users.segment')" :hint="t('users.segmentHint')" :error="errors.segment_id">
      <SegmentSelect v-model="form.segment_id" data-testid="user-create-segment" />
    </SField>
  </SFormModal>
</template>
