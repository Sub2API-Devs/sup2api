/**
 * @azure/core-tracing/dist/esm/tracingClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-tracing@1.2.0..1.3.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { Qn } from "./instrumenter.js";
import { AZURE_TRACING_SYMBOLS } from "./tracingContext.js";

//@ chunk-mrx6y2r5.js:58616-59724 esm-fingerprint
function Jn(e) {
  let { namespace: namespace, packageName: packageName, packageVersion: packageVersion } = e;
  function o(l, d, u) {
    var m;
    let startSpan = Qn().startSpan(
        l,
        Object.assign(Object.assign({}, u), {
          packageName: packageName,
          packageVersion: packageVersion,
          tracingContext:
            (m = d === null || d === void 0 ? void 0 : d.tracingOptions) === null || m === void 0
              ? void 0
              : m.tracingContext,
        }),
      ),
      { tracingContext: tracingContext, span: span } = startSpan;
    if (!tracingContext.getValue(AZURE_TRACING_SYMBOLS.namespace))
      tracingContext = tracingContext.setValue(AZURE_TRACING_SYMBOLS.namespace, namespace);
    span.setAttribute("az.namespace", tracingContext.getValue(AZURE_TRACING_SYMBOLS.namespace));
    let merged = Object.assign({}, d, {
      tracingOptions: Object.assign(
        Object.assign({}, d === null || d === void 0 ? void 0 : d.tracingOptions),
        { tracingContext: tracingContext },
      ),
    });
    return { span: span, updatedOptions: merged };
  }
  async function i(l, d, u, m) {
    let { span: span, updatedOptions: updatedOptions } = o(l, d, m);
    try {
      let T = await s(updatedOptions.tracingOptions.tracingContext, () =>
        Promise.resolve(u(updatedOptions, span)),
      );
      return (span.setStatus({ status: "success" }), T);
    } catch (error) {
      throw (span.setStatus({ status: "error", error: error }), error);
    } finally {
      span.end();
    }
  }
  function s(l, d, ...u) {
    return Qn().withContext(l, d, ...u);
  }
  function a(l) {
    return Qn().parseTraceparentHeader(l);
  }
  function c(l) {
    return Qn().createRequestHeaders(l);
  }
  return { startSpan: o, withSpan: i, withContext: s, parseTraceparentHeader: a, createRequestHeaders: c };
}

export { Jn };
