/**
 * @opentelemetry/sdk-trace-base/build/src/export/ConsoleSpanExporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";

//@ chunk-3wgj3rdg.js:23700-23716 esm-layout
var import_core_11 = __toESM(require_core());
//@ chunk-3wgj3rdg.js:23716-24428 esm-fingerprint
class ConsoleSpanExporter {
  export(spans, resultCallback) {
    return this._sendSpans(spans, resultCallback);
  }
  shutdown() {
    this._sendSpans([]);
    return this.forceFlush();
  }
  forceFlush() {
    return Promise.resolve();
  }
  _exportInfo(span) {
    return {
      resource: {
        attributes: span.resource.attributes,
      },
      instrumentationScope: span.instrumentationScope,
      traceId: span.spanContext().traceId,
      parentSpanContext: span.parentSpanContext,
      traceState: span.spanContext().traceState?.serialize(),
      name: span.name,
      id: span.spanContext().spanId,
      kind: span.kind,
      timestamp: import_core_11.hrTimeToMicroseconds(span.startTime),
      duration: import_core_11.hrTimeToMicroseconds(span.duration),
      attributes: span.attributes,
      status: span.status,
      events: span.events,
      links: span.links,
    };
  }
  _sendSpans(spans, done) {
    for (let span of spans)
      console.dir(this._exportInfo(span), {
        depth: 3,
      });
    if (done)
      return done({
        code: import_core_11.ExportResultCode.SUCCESS,
      });
  }
}
export { ConsoleSpanExporter };
