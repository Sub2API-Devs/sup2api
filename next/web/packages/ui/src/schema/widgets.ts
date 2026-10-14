import type { Component, InjectionKey } from 'vue'

/**
 * Host-provided SchemaForm widgets (`ui:widget` name -> component). The
 * console provides its pickers once at startup:
 *   app.provide(SCHEMA_WIDGETS_KEY, { 'proxy-select': ProxyPicker, 'group-select': GroupPicker })
 * so every SchemaForm — the console's and native plugins' — can use them;
 * a form's own `widgets` prop wins per name.
 */
export const SCHEMA_WIDGETS_KEY: InjectionKey<Record<string, Component>> = Symbol('s-schema-widgets')
