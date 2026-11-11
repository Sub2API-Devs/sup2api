import { onBeforeUnmount, type Ref } from 'vue'
import { useDwHost } from './host'

/**
 * Asks before unsaved edits are lost while `dirty`: closing or reloading the
 * browser tab (the browser's own prompt) and navigating off the current
 * route path. Navigations that only change the query (the dashboard's ?tab=)
 * stay on the page, and the edits with it, so they pass; so does the way to
 * the login page (an expired session), which must not be held up. One
 * question at a time: a navigation while it is asked is dropped. Both hooks
 * go with the component.
 */
export function useLeaveGuard(dirty: Ref<boolean>) {
  const host = useDwHost()

  function onUnload(e: BeforeUnloadEvent) {
    if (!dirty.value) return
    e.preventDefault()
    e.returnValue = '' // older browsers prompt only with returnValue set
  }
  window.addEventListener('beforeunload', onUnload)

  let asking = false
  const removeGuard = host.router.beforeEach(async (to, from) => {
    if (!dirty.value || to.path === from.path || to.path.startsWith('/login')) return true
    if (asking) return false
    asking = true
    try {
      return await host.confirm({ message: host.t('config.leaveConfirm'), confirmText: host.t('config.leave'), danger: true })
    } finally {
      asking = false
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onUnload)
    removeGuard()
  })
}
