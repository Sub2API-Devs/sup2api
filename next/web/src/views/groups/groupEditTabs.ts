// The tabs of the group editor and the form fields each of them holds: an
// error on a field opens its tab, a changed field marks it. The tabs without
// fields here are sub-editors that keep their own drafts.

export const GROUP_EDIT_TABS = ['basic', 'segments', 'pricing', 'models', 'accounts', 'advanced'] as const
export type GroupEditTab = (typeof GROUP_EDIT_TABS)[number]

const TAB_FIELDS: Partial<Record<GroupEditTab, readonly string[]>> = {
  basic: ['name', 'description', 'status', 'rate_multiplier', 'visibility'],
  models: ['model_allowlist', 'model_filter_mode'],
  advanced: ['environment', 'conversion_loss_policy']
}

const formTabs = GROUP_EDIT_TABS.filter((tab) => TAB_FIELDS[tab])
const fieldsOf = (tab: GroupEditTab) => TAB_FIELDS[tab] ?? []

/** The first tab with a field in `errors`; a key may name a part of a field ("environment.HTTP_PROXY"). */
export function tabOfErrors(errors: Record<string, string>): GroupEditTab | undefined {
  const keys = Object.keys(errors)
  return formTabs.find((tab) => fieldsOf(tab).some((field) => keys.some((key) => key === field || key.startsWith(`${field}.`))))
}

/** The tabs whose fields differ between two states of the form. */
export function changedTabs(form: Record<string, unknown>, saved: Record<string, unknown>): GroupEditTab[] {
  return formTabs.filter((tab) => fieldsOf(tab).some((field) => JSON.stringify(form[field]) !== JSON.stringify(saved[field])))
}
