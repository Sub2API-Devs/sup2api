/**
 * @azure/core-tracing/dist/esm/tracingClient.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-tracing@1.2.0..1.3.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 */
import { getInstrumenter } from "./instrumenter.js";
import { AZURE_TRACING_SYMBOLS } from "./tracingContext.js";

//@ chunk-b5df2wx1.js:58616-59724 esm-fingerprint
function createTracingClient(options) {
  let { namespace, packageName, packageVersion } = options;
  function startSpan(name, operationOptions, spanOptions) {
    var spanContext;
    let span = getInstrumenter().startSpan(
      name,
      Object.assign(Object.assign({}, spanOptions), {
        packageName,
        packageVersion,
        tracingContext:
          (spanContext =
            operationOptions === null || operationOptions === undefined
              ? undefined
              : operationOptions.tracingOptions) === null || spanContext === undefined
            ? undefined
            : spanContext.tracingContext,
      }),
    );
    let { tracingContext, span: span_2 } = span;
    if (!tracingContext.getValue(AZURE_TRACING_SYMBOLS.namespace))
      tracingContext = tracingContext.setValue(AZURE_TRACING_SYMBOLS.namespace, namespace);
    span_2.setAttribute("az.namespace", tracingContext.getValue(AZURE_TRACING_SYMBOLS.namespace));
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
      span: span_2,
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
    return getInstrumenter().withContext(context, callback, ...callbackArgs);
  }
  function parseTraceparentHeader(traceparentHeader) {
    return getInstrumenter().parseTraceparentHeader(traceparentHeader);
  }
  function createRequestHeaders(tracingContext) {
    return getInstrumenter().createRequestHeaders(tracingContext);
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
