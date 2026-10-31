/** Indices are zero-based within the supplied rows. The source array is never mutated. */
export interface TableReorderEvent<T> {
  row: T
  key: string | number
  from: number
  to: number
  rows: T[]
}

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
  /** False keeps a required column visible in the column picker. */
  hideable?: boolean
  /** Initial visibility when column settings are enabled. */
  defaultHidden?: boolean
  /** Built-in cell rendering; a cell slot still takes precedence. */
  format?: 'ip'
  /** IP cells: show a copy button (default true). */
  copyable?: boolean
  /** IP cells: clicking the address emits STable's filter event (default false). */
  filterable?: boolean
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
  /** Renders a menuitemcheckbox; omitted for ordinary actions. */
  checked?: boolean
}

/**
 * Badge tone. `neutral` (the StatusTone name) and `gray` are the same colour;
 * `purple` is the older name of `accent`. Prefer the StatusTone names.
 */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'neutral' | 'purple' | 'accent' | 'info'

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

/** One field of an SOptionMatrix: a row of radios under the shared columns. */
export interface OptionMatrixRow {
  key: string
  label: string
  /** Second line under the label (e.g. what an inherited value resolves to). */
  hint?: string
  /** Narrows the choices; columns missing here render disabled. */
  options?: SelectOption[]
  disabled?: boolean
  /** Draws a marker beside the label (e.g. differs from the inherited value). */
  marked?: boolean
  /** The value that applies while the row's own value defers (e.g. "follow"); its cell is tinted. */
  effective?: SelectOption['value']
  testid?: string
}

/** A labelled block of SOptionMatrix rows whose header sets them all at once. */
export interface OptionMatrixGroup {
  key: string
  label: string
  rows: OptionMatrixRow[]
  /** Short text beside the label (e.g. a count of changed rows). */
  badge?: string
  /** Applies when the matrix is `collapsible`; open unless false. */
  defaultOpen?: boolean
}
