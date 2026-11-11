import { onBeforeUnmount, type Ref } from 'vue'
import { useDwHost } from './host'

/**
 * Asks before unsaved edits are lost while `dirty`: closing or reloading the
 * browser tab (the browser's own prompt) and navigating off the current
 * route path. Navigations that only change the query (the dashboard's ?tab=)
 * stay on the page, and the edits with it, so they pass. Both hooks go with
 * the component.
 */
export function useLeaveGuard(dirty: Ref<boolean>) {
  const host = useDwHost()

  function onUnload(e: BeforeUnloadEvent) {
    if (!dirty.value) return
    e.preventDefault()
    e.returnValue = '' // older browsers prompt only with returnValue set
  }
  window.addEventListener('beforeunload', onUnload)

  const removeGuard = host.router.beforeEach((to, from) => {
    if (!dirty.value || to.path === from.path) return true
    return host.confirm({ message: host.t('config.leaveConfirm'), confirmText: host.t('config.leave'), danger: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onUnload)
    removeGuard()
  })
}
