/**
 * @opentelemetry/sdk-trace-base/build/src/MultiSpanProcessor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-3wgj3rdg.js:21878-21894 esm-layout
var import_core_10 = __toESM(require_core());
//@ chunk-3wgj3rdg.js:21894-22439 esm-fingerprint
class MultiSpanProcessor {
  _spanProcessors;
  constructor(_spanProcessors) {
    this._spanProcessors = _spanProcessors;
  }
  forceFlush() {
    let promises = [];
    for (let spanProcessor of this._spanProcessors) promises.push(spanProcessor.forceFlush());
    return new Promise((resolve) => {
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          import_core_10.globalErrorHandler(error || Error("MultiSpanProcessor: forceFlush failed"));
          resolve();
        });
    });
  }
  onStart(span, context) {
    for (let spanProcessor of this._spanProcessors) spanProcessor.onStart(span, context);
  }
  onEnd(span) {
    for (let spanProcessor of this._spanProcessors) spanProcessor.onEnd(span);
  }
  shutdown() {
    let promises = [];
    for (let spanProcessor of this._spanProcessors) promises.push(spanProcessor.shutdown());
    return new Promise((resolve, reject) => {
      Promise.all(promises).then(() => {
        resolve();
      }, reject);
    });
  }
}
export { MultiSpanProcessor };
