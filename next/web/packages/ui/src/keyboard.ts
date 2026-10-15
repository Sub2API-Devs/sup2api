// Arrow-key navigation shared by STabs and SDropdown.

const KEYS = {
  horizontal: { ArrowRight: 1, ArrowLeft: -1 },
  vertical: { ArrowDown: 1, ArrowUp: -1 }
} as const

/**
 * Index to move to for a navigation key in a wrapping list of `count`
 * items, `current` being the focused one (-1 = none): arrows of the given
 * orientation step and wrap, Home / End jump to the ends. Returns -1 for
 * other keys.
 */
export function navIndex(key: string, current: number, count: number, orientation: keyof typeof KEYS): number {
  if (!count) return -1
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const step = (KEYS[orientation] as Record<string, number>)[key]
  if (!step) return -1
  if (current < 0) return step > 0 ? 0 : count - 1
  return (current + step + count) % count
}
