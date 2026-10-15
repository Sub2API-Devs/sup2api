// Built-in SchemaField widgets: `ui:widget` name -> control component.
// 'object' is rendered by SchemaObject and 'hidden' renders nothing.
import type { Component } from 'vue'
import ChoiceControl from './ChoiceControl.vue'
import InputControl from './InputControl.vue'
import JsonControl from './JsonControl.vue'
import KeyValueControl from './KeyValueControl.vue'
import MultiSelectControl from './MultiSelectControl.vue'
import ObjectListControl from './ObjectListControl.vue'
import SwitchControl from './SwitchControl.vue'
import TagsControl from './TagsControl.vue'
import TextareaControl from './TextareaControl.vue'
import UrlPresetsControl from './UrlPresetsControl.vue'

export const CONTROLS: Record<string, Component> = {
  text: InputControl,
  secret: InputControl,
  number: InputControl,
  'date-time': InputControl,
  date: InputControl,
  time: InputControl,
  textarea: TextareaControl,
  json: JsonControl,
  select: ChoiceControl,
  segmented: ChoiceControl,
  radio: ChoiceControl,
  'multi-select': MultiSelectControl,
  switch: SwitchControl,
  tags: TagsControl,
  'url-presets': UrlPresetsControl,
  'key-value': KeyValueControl,
  'model-mapping': KeyValueControl,
  'object-list': ObjectListControl
}

/** Widgets laid out below their label in the settings layout. */
export const WIDE_WIDGETS = new Set(['textarea', 'tags', 'key-value', 'model-mapping', 'object-list', 'json', 'multi-select', 'url-presets', 'radio', 'object'])
