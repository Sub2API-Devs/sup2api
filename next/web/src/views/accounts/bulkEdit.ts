// Bulk edit of account core properties: the PATCH body for one account from
// the ticked fields. Group changes are relative to the account's own groups
// (add / remove) or replace them; an account a change would leave as it is
// gets no request (null).
import type { Account } from '@/api/types'

export type GroupMode = 'replace' | 'add' | 'remove'
export interface BulkFields {
  priority: number | null
  weight: number | null
  max_concurrency: number | null
  tpm_limit: number | null
  rpm_limit: number | null
  group_ids: number[]
  groupMode: GroupMode
  proxy_id: number | null
  auto_disable: boolean
}
export type BulkFlags = Record<'priority' | 'weight' | 'max_concurrency' | 'tpm_limit' | 'rpm_limit' | 'groups' | 'proxy' | 'auto_disable', boolean>

/** [min, max] the core accepts (account input validation). */
export const BULK_LIMITS = {
  priority: [0, 1_000_000],
  weight: [1, 1000],
  max_concurrency: [0, 100_000],
  tpm_limit: [0, 1_000_000_000_000],
  rpm_limit: [0, 10_000_000]
} as const

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x))

export function buildBulkPatch(a: Account, v: BulkFields, on: BulkFlags): Record<string, unknown> | null {
  const body: Record<string, unknown> = {}
  const num = (key: 'priority' | 'weight' | 'max_concurrency' | 'tpm_limit' | 'rpm_limit', current: number | undefined) => {
    if (on[key] && v[key] !== null && Number(v[key]) !== (current ?? 0)) body[key] = Number(v[key])
  }
  num('priority', a.priority)
  if (on.weight && v.weight !== null && Number(v.weight) !== (a.weight ?? 1)) body.weight = Number(v.weight)
  num('max_concurrency', a.max_concurrency)
  num('tpm_limit', a.tpm_limit)
  num('rpm_limit', a.rpm_limit)
  if (on.groups) {
    const current = a.group_ids ?? []
    let next: number[]
    if (v.groupMode === 'add') next = [...current, ...v.group_ids.filter((id) => !current.includes(id))]
    else if (v.groupMode === 'remove') next = current.filter((id) => !v.group_ids.includes(id))
    else next = [...v.group_ids]
    if (!sameSet(current, next)) body.group_ids = next
  }
  if (on.proxy && (a.proxy_id ?? null) !== v.proxy_id) body.proxy_id = v.proxy_id
  if (on.auto_disable && (a.auto_disable ?? true) !== v.auto_disable) body.auto_disable = v.auto_disable
  return Object.keys(body).length ? body : null
}
