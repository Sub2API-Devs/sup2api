import type { Account, ModelLimit } from '@/api/types'
import { usageLevel, type UsageLevel } from './usageLevel'

/** One figure of an account's limits: what is used now and the cap (0 = none). */
export interface LimitFigure {
  key: 'concurrency' | 'rpm' | 'tpm' | 'sessions'
  used: number
  limit: number
}

/** A row of the limits breakdown: the account itself, then each model list (CONTRACTS §68). */
export interface LimitRow {
  /** Models of the list; empty for the account's own row. */
  models: string[]
  figures: LimitFigure[]
}

type Caps = Partial<Omit<ModelLimit, 'models'>>
type Used = { in_use?: number; rpm?: number; tpm?: number; sessions?: number }

const figures = (u: Used | undefined, caps: Caps): LimitFigure[] => [
  { key: 'concurrency', used: u?.in_use ?? 0, limit: caps.max_concurrency || 0 },
  { key: 'rpm', used: u?.rpm ?? 0, limit: caps.rpm_limit || 0 },
  { key: 'tpm', used: u?.tpm ?? 0, limit: caps.tpm_limit || 0 },
  { key: 'sessions', used: u?.sessions ?? 0, limit: caps.spm_limit || 0 }
]

/** The account's own figures followed by those of its model lists, in their order. */
export function limitRows(a: Account): LimitRow[] {
  const usage = a.rate_usage
  const rows: LimitRow[] = [{ models: [], figures: figures({ ...usage, in_use: a.in_use }, a) }]
  ;(a.model_limits || []).forEach((l, i) => rows.push({ models: l.models, figures: figures(usage?.models?.[i], l) }))
  return rows
}

/** Share of the cap in use, 0–1; 0 without a cap. */
export const usedShare = (f: LimitFigure) => (f.limit > 0 ? Math.min(f.used / f.limit, 1) : 0)

/** Tone of a capped figure: danger at the cap, warning from 80 %; 'none' without a cap. */
export const figureTone = (f: LimitFigure): UsageLevel | 'none' => (f.limit > 0 ? usageLevel(f.used / f.limit) : 'none')
