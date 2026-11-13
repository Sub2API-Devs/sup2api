/** A copy of `set` with `key` added (on) or removed; toggled by default. */
export function flip<T>(set: Set<T>, key: T, on = !set.has(key)): Set<T> {
  const next = new Set(set)
  if (on) next.add(key)
  else next.delete(key)
  return next
}
