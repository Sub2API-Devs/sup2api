import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { PermRef } from '@/generated/permissions'

type Value = PermRef | readonly PermRef[] | undefined

/**
 * v-permission="'account:create'"            hide unless the user has it
 * v-permission="['a:read', 'b:read']"        hide unless the user has any
 * v-permission:disable="'account:delete'"    disable instead of hiding
 */
function apply(el: HTMLElement, binding: DirectiveBinding<Value>) {
  const ok = useAuthStore().has(binding.value)
  if (binding.arg === 'disable') {
    ;(el as HTMLButtonElement).disabled = !ok
    el.classList.toggle('pointer-events-none', !ok)
    el.classList.toggle('opacity-50', !ok)
    return
  }
  if (!ok) {
    if (el.dataset.s2aDisplay === undefined) el.dataset.s2aDisplay = el.style.display
    el.style.display = 'none'
  } else if (el.dataset.s2aDisplay !== undefined) {
    el.style.display = el.dataset.s2aDisplay
    delete el.dataset.s2aDisplay
  }
}

export const vPermission: Directive<HTMLElement, Value> = {
  mounted: apply,
  updated: apply
}

declare module 'vue' {
  interface GlobalDirectives {
    vPermission: typeof vPermission
  }
}
