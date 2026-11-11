import { ref } from 'vue'

// The config dialogs save straight away (an "Apply" that only changed the
// draft left edits unsaved without anyone noticing): the config page hands
// them a save function and they show its outcome.

/** What saving the configuration came to: saved, or not, with the error to show (none when a warning was declined). */
export interface SaveOutcome {
  saved: boolean
  error?: string
}

/**
 * A dialog's Save: runs `save`, spinning meanwhile, and keeps its error for
 * the dialog to show. Resolves whether it saved, i.e. whether to close; a
 * Save while one runs does nothing.
 */
export function useDialogSave() {
  const saving = ref(false)
  const error = ref('')
  async function run(save: () => Promise<SaveOutcome>): Promise<boolean> {
    if (saving.value) return false
    saving.value = true
    error.value = ''
    try {
      const r = await save()
      error.value = r.error ?? ''
      return r.saved
    } finally {
      saving.value = false
    }
  }
  return { saving, error, run }
}
