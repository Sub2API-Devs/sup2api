/**
 * @azure/core-tracing/dist/esm/tracingContext.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-tracing@1.2.0..1.3.1
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { js } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { fa } from "../../../core-rest-pipeline/dist/esm/policies/tlsPolicy.js";

//@ chunk-mrx6y2r5.js:57552-57580 esm-layout
function ad(e) {
  return js(e);
}
//@ chunk-mrx6y2r5.js:57580-57608 esm-layout
function cd(e) {
  return fa(e);
}
//@ chunk-mrx6y2r5.js:57608-57715 esm-fingerprint
var AZURE_TRACING_SYMBOLS = {
  span: Symbol.for("@azure/core-tracing span"),
  namespace: Symbol.for("@azure/core-tracing namespace"),
};
//@ chunk-mrx6y2r5.js:57715-57865 esm-fingerprint
function ld(e = {}) {
  let t = new AzureTracingContext(e.parentContext);
  if (e.span) t = t.setValue(AZURE_TRACING_SYMBOLS.span, e.span);
  if (e.namespace) t = t.setValue(AZURE_TRACING_SYMBOLS.namespace, e.namespace);
  return t;
}
//@ chunk-mrx6y2r5.js:57865-58129 esm-fingerprint
class AzureTracingContext {
  constructor(e) {
    this._contextMap = e instanceof AzureTracingContext ? new Map(e._contextMap) : new Map();
  }
  setValue(e, t) {
    let r = new AzureTracingContext(this);
    return (r._contextMap.set(e, t), r);
  }
  getValue(e) {
    return this._contextMap.get(e);
  }
  deleteValue(e) {
    let t = new AzureTracingContext(this);
    return (t._contextMap.delete(e), t);
  }
}

export { ld, AZURE_TRACING_SYMBOLS, ad, cd };
