// Unsaved edits by row key, as plain data: what the editors that keep drafts
// (useDrafts.ts) and the modules that say what a draft is (ruleDrafts.ts,
// accessRateDrafts.ts) share.

/** The drafts with `draft` on `key`; undefined takes the draft of the row away: it reads as saved again. */
export function withDraft<K, D>(drafts: ReadonlyMap<K, D>, key: K, draft: D | undefined): ReadonlyMap<K, D> {
  const next = new Map(drafts)
  if (draft === undefined) next.delete(key)
  else next.set(key, draft)
  return next
}

/** The drafts left once `sent` is saved: those made or changed after it was sent. */
export function unsent<K, D>(drafts: ReadonlyMap<K, D>, sent: ReadonlyMap<K, D>): ReadonlyMap<K, D> {
  return new Map([...drafts].filter(([key, draft]) => !sent.has(key) || sent.get(key) !== draft))
}
