/**
 * @azure/core-tracing/dist/esm/instrumenter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-tracing@1.2.0..1.3.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { createTracingContext } from "./tracingContext.js";
import { state } from "../commonjs/state-cjs.js";

//@ chunk-mrx6y2r5.js:58159-58287 esm-fingerprint
function createDefaultTracingSpan() {
  return {
    end: () => {},
    isRecording: () => false,
    recordException: () => {},
    setAttribute: () => {},
    setStatus: () => {},
    addEvent: () => {},
  };
}
//@ chunk-mrx6y2r5.js:58287-58496 esm-fingerprint
function createDefaultInstrumenter() {
  return {
    createRequestHeaders: () => ({}),
    parseTraceparentHeader: () => {
      return;
    },
    startSpan: (_name, spanOptions) => ({
      span: createDefaultTracingSpan(),
      tracingContext: createTracingContext({
        parentContext: spanOptions.tracingContext,
      }),
    }),
    withContext(_context, callback, ...callbackArgs) {
      return callback(...callbackArgs);
    },
  };
}
//@ chunk-mrx6y2r5.js:58496-58616 esm-fingerprint
function getInstrumenter() {
  if (!state.instrumenterImplementation) state.instrumenterImplementation = createDefaultInstrumenter();
  return state.instrumenterImplementation;
}
export { getInstrumenter };
