export interface TableColumn {
  key: string
  label: string
  width?: string
  align?: 'left' | 'right' | 'center'
  class?: string
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
}

export interface MenuAction {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
  hidden?: boolean
}

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'info'
