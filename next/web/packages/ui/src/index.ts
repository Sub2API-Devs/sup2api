// @sub2api/ui — component library shared by the console and native plugins.
// Styling relies on the console's global component classes (.btn, .input,
// .card, .table, .badge, ...), so plugin UIs look native without shipping CSS.

export { default as SAlert } from './SAlert.vue'
export { default as SBadge } from './SBadge.vue'
export { default as SButton } from './SButton.vue'
export { default as SCard } from './SCard.vue'
export { default as SChart } from './SChart.vue'
export { default as SChip } from './SChip.vue'
export { default as SChoiceCards } from './SChoiceCards.vue'
export { default as SConfirmHost } from './SConfirmHost.vue'
export { default as SCopyButton } from './SCopyButton.vue'
export { default as SDateTime } from './SDateTime.vue'
export { default as SDescriptions } from './SDescriptions.vue'
export { default as SDescItem } from './SDescItem.vue'
export { default as SDisclosure } from './SDisclosure.vue'
export { default as SDrawer } from './SDrawer.vue'
export { default as SDropdown } from './SDropdown.vue'
export { default as SEmpty } from './SEmpty.vue'
export { default as SField } from './SField.vue'
export { default as SIcon } from './SIcon.vue'
// Icon vocabulary: the authoritative list of names <SIcon> (and therefore
// manifest ui.menus[].icon) accepts.
export { ICON_NAMES, ICON_PATHS, hasIcon, iconPaths } from './icons'
export { default as SInput } from './SInput.vue'
export { default as SKeyValue } from './SKeyValue.vue'
export { default as SModal } from './SModal.vue'
export { default as SPageHeader } from './SPageHeader.vue'
export { default as SPagination } from './SPagination.vue'
export { default as SProgress } from './SProgress.vue'
export { default as SSegmented } from './SSegmented.vue'
export { default as SSelect } from './SSelect.vue'
export { default as SSettingRow } from './SSettingRow.vue'
export { default as SSettingsGroup } from './SSettingsGroup.vue'
export { default as SSkeleton } from './SSkeleton.vue'
export { default as SSpinner } from './SSpinner.vue'
export { default as SStatCard } from './SStatCard.vue'
export { default as SStatusDot } from './SStatusDot.vue'
export { default as SSteps } from './SSteps.vue'
export { default as SSwitch } from './SSwitch.vue'
export { default as STable } from './STable.vue'
export { default as STabs } from './STabs.vue'
export { default as STagInput } from './STagInput.vue'
export { default as STextarea } from './STextarea.vue'
export { default as STimeRange } from './STimeRange.vue'
export { default as STooltip } from './STooltip.vue'
export { default as SGrid } from './SGrid.vue'
export { default as SStack } from './SStack.vue'
export { default as SCheckbox } from './SCheckbox.vue'
export { default as SRadio } from './SRadio.vue'
export { default as SRadioGroup } from './SRadioGroup.vue'
export { default as SLink } from './SLink.vue'
export { default as SCode } from './SCode.vue'
export { default as SSectionTitle } from './SSectionTitle.vue'
export { default as SHint } from './SHint.vue'
export { default as SToastHost } from './SToastHost.vue'
export { toast, confirm, toastState, confirmState, dismissToast, settleConfirm, pauseToast, resumeToast } from './feedback'
export { copyToClipboard } from './clipboard'
export { default as uiMessages } from './messages'
export { rangeBounds, toLocalInput, fromLocalInput, dayKey } from './timeRange'
export type { RangeKey } from './timeRange'
export type { TableColumn, TabItem, SelectOption, MenuAction, Tone, StatusTone, ChoiceOption, DescItem, StepItem, StepState } from './types'
// Form-item context (custom controls that want SField / SSettingRow ids).
export { FIELD_KEY, useFieldControl } from './field'
export type { FieldContext, ControlSize } from './field'
// JSON Schema form (console: account credentials, plugin settings, declarative
// plugin pages; plugins: any schema-driven form)
export { default as SchemaForm } from './schema/SchemaForm.vue'
export { default as SchemaField } from './schema/SchemaField.vue'
export { SCHEMA_WIDGETS_KEY } from './schema/widgets'
export {
  SECRET_MASK,
  BUILTIN_WIDGETS,
  localizedText,
  uiGet,
  childUI,
  schemaType,
  isSecret,
  enumOptions,
  resolveWidget,
  fieldLabel,
  fieldHelp,
  orderedKeys,
  getPath,
  isVisible,
  withDefaults as schemaWithDefaults,
  validate as validateSchema
} from './schema/schema'
export type { JSONSchema, UISchema, EnumOption, ValidateMessages } from './schema/schema'
