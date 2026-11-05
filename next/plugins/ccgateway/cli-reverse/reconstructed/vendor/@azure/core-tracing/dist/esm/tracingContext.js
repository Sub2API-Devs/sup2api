/**
 * @azure/core-tracing/dist/esm/tracingContext.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-tracing@1.2.0..1.3.1
 * pieces: chunk-b5df2wx1.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { agentPolicy } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { tlsPolicy } from "../../../core-rest-pipeline/dist/esm/policies/tlsPolicy.js";

//@ chunk-b5df2wx1.js:57552-57580 esm-layout
function setSpanContext(agent) {
  return agentPolicy(agent);
}
//@ chunk-b5df2wx1.js:57580-57608 esm-layout
function getSpanContext(tlsSettings) {
  return tlsPolicy(tlsSettings);
}
//@ chunk-b5df2wx1.js:57608-57715 esm-fingerprint
var AZURE_TRACING_SYMBOLS = {
  span: Symbol.for("@azure/core-tracing span"),
  namespace: Symbol.for("@azure/core-tracing namespace"),
};
//@ chunk-b5df2wx1.js:57715-57865 esm-fingerprint
function createTracingContext(options = {}) {
  let context = new AzureTracingContext(options.parentContext);
  if (options.span) context = context.setValue(AZURE_TRACING_SYMBOLS.span, options.span);
  if (options.namespace) context = context.setValue(AZURE_TRACING_SYMBOLS.namespace, options.namespace);
  return context;
}
//@ chunk-b5df2wx1.js:57865-58129 esm-fingerprint
class AzureTracingContext {
  constructor(initialContext) {
    this._contextMap =
      initialContext instanceof AzureTracingContext ? new Map(initialContext._contextMap) : new Map();
  }
  setValue(key, value) {
    let newContext = new AzureTracingContext(this);
    newContext._contextMap.set(key, value);
    return newContext;
  }
  getValue(key) {
    return this._contextMap.get(key);
  }
  deleteValue(key) {
    let newContext = new AzureTracingContext(this);
    newContext._contextMap.delete(key);
    return newContext;
  }
}
export { createTracingContext, AZURE_TRACING_SYMBOLS, setSpanContext, getSpanContext };
