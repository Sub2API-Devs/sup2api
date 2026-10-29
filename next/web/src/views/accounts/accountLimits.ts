import type { Account } from '@/api/types'

/** One figure of an account's limits: what is used now and the cap (0 = none). */
export interface LimitFigure {
  key: 'concurrency' | 'rpm' | 'tpm'
  used: number
  limit: number
}

/** A row of the limits breakdown: the account itself, then each model list (CONTRACTS §68). */
export interface LimitRow {
  /** Models of the list; empty for the account's own row. */
  models: string[]
  figures: LimitFigure[]
}

const figures = (inUse: number, rpm: number, tpm: number, limits: { max_concurrency?: number; rpm_limit?: number; tpm_limit?: number }): LimitFigure[] => [
  { key: 'concurrency', used: inUse, limit: limits.max_concurrency || 0 },
  { key: 'rpm', used: rpm, limit: limits.rpm_limit || 0 },
  { key: 'tpm', used: tpm, limit: limits.tpm_limit || 0 }
]

/** The account's own figures followed by those of its model lists, in their order. */
export function limitRows(a: Account): LimitRow[] {
  const usage = a.rate_usage
  const rows: LimitRow[] = [{ models: [], figures: figures(a.in_use ?? 0, usage?.rpm ?? 0, usage?.tpm ?? 0, a) }]
  ;(a.model_limits || []).forEach((l, i) => {
    const u = usage?.models?.[i]
    rows.push({ models: l.models, figures: figures(u?.in_use ?? 0, u?.rpm ?? 0, u?.tpm ?? 0, l) })
  })
  return rows
}

/** Share of the cap in use, 0–1; 0 without a cap. */
export const usedShare = (f: LimitFigure) => (f.limit > 0 ? Math.min(f.used / f.limit, 1) : 0)

/** Tone of a capped figure: danger at the cap, warning from 80 %. */
export const figureTone = (f: LimitFigure): 'danger' | 'warning' | 'primary' | 'none' =>
  f.limit <= 0 ? 'none' : f.used >= f.limit ? 'danger' : f.used >= f.limit * 0.8 ? 'warning' : 'primary'
