import type { SelectOption } from '@sub2api/ui'
import { enumOptions } from './format'
import { useModHost } from './host'
import type { WatchLevel } from './types'

// The watch levels a user can be set to, given the user lists of the
// settings (CONTRACTS §72.15): shared by the inline watch actions and the
// watch entry editor.

export const WATCH_LEVELS: readonly WatchLevel[] = ['observe', 'enforce']

/** A watch list action to confirm: add or set a level, or release (level null). */
export interface WatchAction {
  kind: 'add' | 'level' | 'release'
  level: WatchLevel | null
}

/** An allowlisted user cannot be set to the enforce level (the backend answers level/allowlisted). */
export const levelRefused = (level: unknown, allowlisted: boolean | undefined) => level === 'enforce' && !!allowlisted

/** The level choices; enforce is disabled for an allowlisted user. */
export const watchLevelOptions = (allowlisted: boolean | undefined): SelectOption[] =>
  enumOptions('level', WATCH_LEVELS).map((o) => ({ ...o, disabled: levelRefused(o.value, allowlisted) }))

/** What a user list changes about the levels ('' = on neither list); a user on both lists is blocklisted. */
export function userListHint(lists: { allowlisted?: boolean; blocklisted?: boolean }): string {
  const t = useModHost().t
  return lists.blocklisted ? t('lists.blockAlwaysPre') : lists.allowlisted ? t('lists.allowOnlyObserve') : ''
}
