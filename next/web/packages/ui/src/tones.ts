// Literal class strings per status tone (Tailwind scans this file).
import type { StatusTone } from './types'

/** Tinted block: border + background + text (SAlert). */
export const TONE_BLOCK: Record<StatusTone, string> = {
  neutral: 'border-line bg-surface-2 text-fg',
  primary: 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-100',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100',
  danger: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-100',
  accent: 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-100'
}

/** Icon / accent text colour. */
export const TONE_TEXT: Record<StatusTone, string> = {
  neutral: 'text-fg-muted',
  primary: 'text-primary-600 dark:text-primary-400',
  info: 'text-sky-600 dark:text-sky-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  accent: 'text-violet-600 dark:text-violet-400'
}

/** Solid fill (dots, progress bars). */
export const TONE_FILL: Record<StatusTone, string> = {
  neutral: 'bg-gray-400 dark:bg-dark-500',
  primary: 'bg-primary-500',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  accent: 'bg-violet-500'
}

/** Soft chip (SChip). */
export const TONE_CHIP: Record<StatusTone, string> = {
  neutral: 'border-line bg-surface text-fg',
  primary: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800/60 dark:bg-primary-900/30 dark:text-primary-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300',
  accent: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-300'
}

export const TONE_ICON: Record<StatusTone, string> = {
  neutral: 'info',
  primary: 'info',
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'warning',
  accent: 'info'
}

export function toneOf(v: string | undefined): StatusTone {
  if (v === 'error') return 'danger'
  if (v === 'gray') return 'neutral'
  if (v === 'purple') return 'accent'
  return v && v in TONE_FILL ? (v as StatusTone) : 'neutral'
}
