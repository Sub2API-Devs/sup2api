import { h, type FunctionalComponent } from 'vue'
import { uiGet, type JSONSchema, type UISchema } from '@sub2api/ui'
import DurationInput from './DurationInput.vue'
import type { DurationUnit } from './duration'

/**
 * The `duration` schema widget of the settings page (ui:widget, seconds):
 * DurationInput with the units of ui:options.units (default s / m / h).
 */
type Props = { modelValue: number | null | undefined; schema?: JSONSchema; ui?: UISchema; multiple?: boolean; disabled?: boolean }
export const DurationWidget: FunctionalComponent<Props, { 'update:modelValue': (v: number | null) => true }> = (props, { emit }) =>
  h(DurationInput, {
    modelValue: props.modelValue,
    units: uiGet<{ units?: DurationUnit[] }>(props.ui, 'options')?.units,
    disabled: props.disabled,
    'onUpdate:modelValue': (v: number | null) => emit('update:modelValue', v)
  })
DurationWidget.props = ['modelValue', 'schema', 'ui', 'multiple', 'disabled']
DurationWidget.emits = ['update:modelValue']
