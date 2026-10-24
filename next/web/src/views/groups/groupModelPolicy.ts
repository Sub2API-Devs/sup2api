// Model policy text of the group editor: a line/space/comma separated list of
// patterns merged into the list (existing entries win, duplicates dropped).
// Pure, so both the editor's text box and a caller that owns the draft can use
// it without the component's `commit()`.

/** The patterns of one pasted/typed text, in order (blank entries dropped). */
export function draftPatterns(text: string): string[] {
  return text.trim().split(/[\s,]+/).filter(Boolean)
}

/** `current` plus `text`'s patterns, deduplicated in order. */
export function mergeDraftPatterns(current: string[], text: string): string[] {
  return [...new Set([...current, ...draftPatterns(text)])]
}
