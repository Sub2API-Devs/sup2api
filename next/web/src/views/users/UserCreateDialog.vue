<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SCheckbox, SField, SFormModal, SInput, toast } from '@sub2api/ui'
import type { Role } from '@/api/types'
import SegmentSelect from '@/components/pricing/SegmentSelect.vue'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useAssignableRoles, withSupplierUser, DEFAULT_ROLE } from '@/composables/useAssignableRoles'
import { applyFormError } from '@/utils/formErrors'
import { useNamedSegments } from './userSegments'

// New user (POST /users). The roles offered are the caller's managed roles
// (useAssignableRoles) and the default role, which needs no managed list
// (CONTRACTS POST /users); `roles` (the page's role list) only names it. A
// caller who lists and manages segments also says which one the user joins
// (`segment_id`); left out, the server puts the user in the default segment.
const props = defineProps<{ open: boolean; roles: Role[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'created'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const managed = useAssignableRoles()
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

/** The default role, then the managed ones. */
const roleOptions = computed(() => {
  const def = props.roles.find((r) => r.key === DEFAULT_ROLE)
  const first = managed.get(DEFAULT_ROLE) ? [] : [{ key: DEFAULT_ROLE, name: def?.name ?? DEFAULT_ROLE }]
  return [...first, ...managed.roles.value]
})

/** Non-default roles take role:assign; any role must be one the caller may grant. */
function roleSelectable(key: string) {
  if (key === DEFAULT_ROLE) return managed.defaultWithin()
  return auth.has('role:assign') && managed.assignable(key)
}

/** Supplier is an add-on role: checking it checks the default role with it. */
function toggleRole(key: string) {
  const keys = form.role_keys.includes(key) ? form.role_keys.filter((k) => k !== key) : [...form.role_keys, key]
  form.role_keys = key === 'supplier' ? withSupplierUser(keys) : keys
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
      <div class="flex flex-wrap gap-x-4 gap-y-2">
        <SCheckbox
          v-for="r in roleOptions"
          :key="r.key"
          :model-value="form.role_keys.includes(r.key)"
          :disabled="!roleSelectable(r.key)"
          :label="lt(r.name) || r.key"
          :data-role="r.key"
          @update:model-value="toggleRole(r.key)"
        />
      </div>
    </SField>
    <SField v-if="canPlace" :label="t('users.segment')" :hint="t('users.segmentHint')" :error="errors.segment_id">
      <SegmentSelect v-model="form.segment_id" data-testid="user-create-segment" />
    </SField>
  </SFormModal>
</template>
