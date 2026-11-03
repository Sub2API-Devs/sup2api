/**
 * @azure/core-tracing/dist/esm/instrumenter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-tracing@1.2.0..1.3.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { ld } from "./tracingContext.js";
import { state } from "../commonjs/state-cjs.js";

//@ chunk-mrx6y2r5.js:58159-58287 esm-fingerprint
function kp() {
  return {
    end: () => {},
    isRecording: () => !1,
    recordException: () => {},
    setAttribute: () => {},
    setStatus: () => {},
    addEvent: () => {},
  };
}
//@ chunk-mrx6y2r5.js:58287-58496 esm-fingerprint
function bp() {
  return {
    createRequestHeaders: () => ({}),
    parseTraceparentHeader: () => {
      return;
    },
    startSpan: (e, t) => ({ span: kp(), tracingContext: ld({ parentContext: t.tracingContext }) }),
    withContext(e, t, ...r) {
      return t(...r);
    },
  };
}
//@ chunk-mrx6y2r5.js:58496-58616 esm-fingerprint
function Qn() {
  if (!state.instrumenterImplementation) state.instrumenterImplementation = bp();
  return state.instrumenterImplementation;
}

export { Qn };
