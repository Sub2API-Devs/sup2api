export interface TableColumn {
  key: string
  label: string
  width?: string
  align?: 'left' | 'right' | 'center'
  class?: string
  /** Keep the cell on one line. */
  nowrap?: boolean
  /**
   * Truncate the cell with an ellipsis: true = max width 16rem, or a CSS
   * width ('12rem'). Default rendering gets the full value as `title`.
   */
  ellipsis?: boolean | string
  /** Extra class of the header cell. */
  headerClass?: string
}

export interface TabItem {
  key: string
  label: string
  badge?: string | number
  disabled?: boolean
}

export interface SelectOption {
  value: string | number | boolean | null
  label: string
  disabled?: boolean
  /** Group entry (<optgroup>): `label` + nested `options`; its own `value` is ignored. */
  options?: SelectOption[]
}

export interface MenuAction {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
  hidden?: boolean
  /** SIcon name shown before the label. */
  icon?: string
  /** Draw a separator line above this item. */
  divider?: boolean
}

/** `purple` is the older name of `accent` (same colours). */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'accent' | 'info'

/** Status tones of SAlert / SChip / SStatusDot / SProgress. */
export type StatusTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

export interface ChoiceOption {
  value: string | number | boolean | null
  label: string
  description?: string
  /** SIcon name. */
  icon?: string
  disabled?: boolean
  tone?: StatusTone
}

export interface DescItem {
  key: string
  label: string
  value?: unknown
  mono?: boolean
  copyable?: boolean
  /** Span both columns (columns = 2). */
  full?: boolean
}

export type StepState = 'done' | 'current' | 'pending' | 'error'

export interface StepItem {
  key: string
  title: string
  description?: string
  state?: StepState
}
