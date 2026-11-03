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
function createTracingClient(options) {
  let { namespace, packageName, packageVersion } = options;
  function startSpan(name, operationOptions, spanOptions) {
    var m;
    let p = Qn().startSpan(
      name,
      Object.assign(Object.assign({}, spanOptions), {
        packageName,
        packageVersion,
        tracingContext:
          (m =
            operationOptions === null || operationOptions === undefined
              ? undefined
              : operationOptions.tracingOptions) === null || m === undefined
            ? undefined
            : m.tracingContext,
      }),
    );
    let { tracingContext, span } = p;
    if (!tracingContext.getValue(AZURE_TRACING_SYMBOLS.namespace))
      tracingContext = tracingContext.setValue(AZURE_TRACING_SYMBOLS.namespace, namespace);
    span.setAttribute("az.namespace", tracingContext.getValue(AZURE_TRACING_SYMBOLS.namespace));
    let updatedOptions = Object.assign({}, operationOptions, {
      tracingOptions: Object.assign(
        Object.assign(
          {},
          operationOptions === null || operationOptions === undefined
            ? undefined
            : operationOptions.tracingOptions,
        ),
        {
          tracingContext,
        },
      ),
    });
    return {
      span,
      updatedOptions,
    };
  }
  async function withSpan(name, operationOptions, callback, spanOptions) {
    let { span, updatedOptions } = startSpan(name, operationOptions, spanOptions);
    try {
      let result = await withContext(updatedOptions.tracingOptions.tracingContext, () =>
        Promise.resolve(callback(updatedOptions, span)),
      );
      span.setStatus({
        status: "success",
      });
      return result;
    } catch (err) {
      span.setStatus({
        status: "error",
        error: err,
      });
      throw err;
    } finally {
      span.end();
    }
  }
  function withContext(context, callback, ...callbackArgs) {
    return Qn().withContext(context, callback, ...callbackArgs);
  }
  function parseTraceparentHeader(traceparentHeader) {
    return Qn().parseTraceparentHeader(traceparentHeader);
  }
  function createRequestHeaders(tracingContext) {
    return Qn().createRequestHeaders(tracingContext);
  }
  return {
    startSpan,
    withSpan,
    withContext,
    parseTraceparentHeader,
    createRequestHeaders,
  };
}
export { createTracingClient };
