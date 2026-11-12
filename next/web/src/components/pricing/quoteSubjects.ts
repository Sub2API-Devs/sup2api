// Whom the price simulator may quote for, by what the caller may read.
import { useAuthStore } from '@/stores/auth'

/** A quote is for a user or for every member of a user group. */
export type QuoteSubject = 'user' | 'segment'

/** Looking a user up takes user:read; listing the user groups takes segment:read. */
const SUBJECT_PERMS: Record<QuoteSubject, string> = { user: 'user:read', segment: 'segment:read' }

/** The subjects the caller may pick, a user first. */
export function quoteSubjects(auth = useAuthStore()): QuoteSubject[] {
  return (Object.keys(SUBJECT_PERMS) as QuoteSubject[]).filter((subject) => auth.has(SUBJECT_PERMS[subject]))
}

/**
 * Whether the price simulator is of use to the caller: a quote takes
 * price:read, the groups to quote in take group:read, and there must be
 * someone to quote for. Every entry to the simulator asks this, and mounts
 * the dialog only when it holds: the dialog reads the groups as it is set up.
 */
export function canSimulatePrices(auth = useAuthStore()): boolean {
  return auth.has('price:read') && auth.has('group:read') && quoteSubjects(auth).length > 0
}
