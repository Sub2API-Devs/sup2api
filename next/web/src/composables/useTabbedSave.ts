import { ref, type Ref } from 'vue'
import type { TabItem } from '@sub2api/ui'
import { notifyError } from '@/utils/errors'

/** One part of a tabbed editor's save: its own form, or a sub-editor with drafts of its own. */
export interface SaveStep<Tab extends string> {
  /** The tab that shows what the step saves; a function when only the failure tells which (a form whose fields are spread over tabs). */
  tab: Tab | (() => Tab)
  /** False: it was not saved and its tab says why. A rejection is shown as an error and counts as false. */
  save: () => boolean | Promise<boolean>
}

/**
 * Saving an editor whose tabs each hold a part of what is saved. The steps
 * run in order and the first that fails ends the run with its tab in front
 * (`shown`), so the dialog stays open on what has to be corrected and the
 * later steps wait for the next attempt.
 */
export function useTabbedSave<Tab extends string>(shown: Ref<Tab>) {
  const saving = ref(false)

  async function saved(step: SaveStep<Tab>): Promise<boolean> {
    try {
      return await step.save()
    } catch (e) {
      notifyError(e)
      return false
    }
  }

  /** True when every step was saved. */
  async function run(steps: SaveStep<Tab>[]): Promise<boolean> {
    saving.value = true
    try {
      for (const step of steps) {
        if (await saved(step)) continue
        shown.value = typeof step.tab === 'function' ? step.tab() : step.tab
        return false
      }
      return true
    } finally {
      saving.value = false
    }
  }

  return { saving, run }
}

/** The tabs with a dot on those that hold unsaved changes. */
export function markUnsaved(tabs: TabItem[], unsaved: (key: string) => boolean | undefined): TabItem[] {
  return tabs.map((tab) => (unsaved(tab.key) ? { ...tab, badge: '•' } : tab))
}
