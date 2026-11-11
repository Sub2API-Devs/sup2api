import { computed, ref } from 'vue'
import { toast } from '@sub2api/ui'
import type { SegmentGroupPatch, SegmentGroupSetting } from '@/api/pricing'
import { i18n } from '@/i18n'
import { draftedSetting, setDraft, settingPatches, validOverride, type DraftedSetting, type SettingDraft, type SettingDrafts, type SettingSide, type SettingTerms } from './accessRateDrafts'

export interface AccessRateDraftsOptions {
  /** The end the rows differ in. */
  side: SettingSide
  /** Asks the server for the saved settings. */
  fetch: () => Promise<SegmentGroupSetting[]>
  /** What the form around the rows says before it is saved. */
  terms?: () => SettingTerms
}

/**
 * The state of an editor of grants and rates: the saved settings, the drafts
 * on top of them and the rows both give. Nothing is sent until save(), which
 * the editor's parent calls after saving its own form.
 */
export function useAccessRateDrafts(options: AccessRateDraftsOptions) {
  const saved = ref<SegmentGroupSetting[]>([])
  const drafts = ref<SettingDrafts>(new Map())
  const loading = ref(false)
  const error = ref<unknown>(null)
  let request = 0

  /** Fetches the settings again; the drafts stay on them. Only the latest request counts. */
  async function refresh() {
    const current = ++request
    loading.value = true
    error.value = null
    try {
      const settings = await options.fetch()
      if (current === request) saved.value = settings
    } catch (e) {
      if (current === request) error.value = e
    } finally {
      if (current === request) loading.value = false
    }
  }

  /** Starts over: no drafts, the settings fetched anew. */
  function load() {
    drafts.value = new Map()
    saved.value = []
    return refresh()
  }

  const rows = computed<DraftedSetting[]>(() => {
    const terms = options.terms?.()
    return saved.value.map((s) => draftedSetting(options.side, s, drafts.value.get(s[options.side].id), terms))
  })
  const dirty = computed(() => drafts.value.size > 0)

  function change(row: DraftedSetting, draft: SettingDraft) {
    drafts.value = setDraft(drafts.value, row, draft)
  }

  /**
   * Sends the drafts through `put` and shows what the server answers. False
   * when a rate cannot be saved yet (a toast names its row). A failed request
   * rejects and keeps the drafts.
   */
  async function save(put: (items: SegmentGroupPatch[]) => Promise<SegmentGroupSetting[]>): Promise<boolean> {
    if (!dirty.value) return true
    const invalid = rows.value.find((r) => !validOverride(r.rate_override))
    if (invalid) {
      toast(i18n.global.t('pricingAccess.invalidRate', { name: invalid[options.side].name }), 'error')
      return false
    }
    saved.value = await put(settingPatches(options.side, drafts.value))
    drafts.value = new Map()
    return true
  }

  return { rows, loading, error, dirty, refresh, load, change, save }
}
