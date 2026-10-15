import type { Component } from 'vue'
import type { JSONSchema, UISchema } from '../schema'

/**
 * A schema field resolved by SchemaField and handed to its widget control
 * (`ctx` prop). Controls take `modelValue` + `ctx` and emit
 * `update:modelValue`.
 */
export interface ControlContext {
  widget: string
  name: string
  /** Dotted path of the field (error lookup). */
  path: string
  schema: JSONSchema
  ui?: UISchema
  /** Whole form value (ui:visibleWhen). */
  root: any
  errors: Record<string, string>
  widgets?: Record<string, Component>
  layout: 'stacked' | 'settings'
  /** Rendered without its own label (array items, root object). */
  bare: boolean
  label: string
  help: string
  details: string
  placeholder: string
  /** ui:options. */
  options: Record<string, any>
  locale: string
  /** The form / field is disabled. */
  disabled: boolean
  /** schema readOnly / ui:readonly: text controls stay focusable (readonly attribute). */
  readonly: boolean
  /** disabled || readonly: for controls without a readonly state (select, switch, lists). */
  locked: boolean
  /** Width class of single-line controls (narrow on the right of a settings row). */
  fieldClass: string
  /** The switch carries the label itself (stacked layout). */
  inlineLabel: boolean
  /** Shows a message in the field frame while typed text is not a value yet ('' clears it). */
  setError: (message: string) => void
}
