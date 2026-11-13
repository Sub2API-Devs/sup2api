import { computed, ref, watch, type Ref } from 'vue'
import type { AssignableRole, PluginReview, ReviewUserPermission } from '@/api/types'
import { useAssignableRoles } from '@/composables/useAssignableRoles'
import { useAuthStore } from '@/stores/auth'
import { asArray } from '../pluginUtil'

const same = (a: string[], b: string[]) => a.length === b.length && a.every((k) => b.includes(k))

/**
 * The roles the consent page lets the caller give each permission the
 * consent creates (CONTRACTS: new_permission_roles). Only with role:define;
 * the super admin may name any role, others only custom roles on their
 * managed list that they do not hold themselves (the server's rule). Each
 * permission starts at its manifest default roles; only a permission whose
 * choice differs is sent, so an untouched one keeps the default, built-in
 * roles included.
 */
export function useNewPermissionRoles(review: Ref<PluginReview | null>) {
  const auth = useAuthStore()
  const managed = useAssignableRoles()
  const choices = computed<AssignableRole[]>(() => {
    if (!auth.has('role:define')) return []
    if (auth.me?.superuser) return managed.roles.value
    return managed.roles.value.filter((r) => !r.builtin && r.grantable && !auth.me?.roles.includes(r.key))
  })
  const perms = computed(() => asArray<ReviewUserPermission>(review.value?.user_permissions).filter((p) => p.new))
  const overrides = ref<Record<string, string[]>>({})
  watch(review, () => (overrides.value = {}))

  const selectable = (role: string) => choices.value.some((c) => c.key === role)
  const initial = (p: ReviewUserPermission) => (p.default_roles || []).filter(selectable)
  const selected = (p: ReviewUserPermission) => overrides.value[p.key] ?? initial(p)
  const changed = (p: ReviewUserPermission) => !!overrides.value[p.key] && !same(overrides.value[p.key], initial(p))
  /** Changed, and a default role the caller cannot name drops out (it is sent without it). */
  const dropsDefaults = (p: ReviewUserPermission) => changed(p) && (p.default_roles || []).some((r) => !selectable(r))

  function toggle(p: ReviewUserPermission, role: string, on: boolean) {
    const base = selected(p).filter((r) => r !== role)
    overrides.value = { ...overrides.value, [p.key]: on ? [...base, role] : base }
  }

  /** new_permission_roles of the consent: the changed permissions only. */
  const payload = () => Object.fromEntries(perms.value.filter(changed).map((p) => [p.key, selected(p)]))

  return { choices, perms, selected, changed, dropsDefaults, toggle, payload }
}
