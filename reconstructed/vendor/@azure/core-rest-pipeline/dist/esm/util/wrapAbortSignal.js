/**
 * @azure/core-rest-pipeline/dist/esm/util/wrapAbortSignal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:61450-61768 esm-fingerprint
function Xo(e) {
  if (e instanceof AbortSignal) return { abortSignal: e };
  if (e.aborted) return { abortSignal: AbortSignal.abort(e.reason) };
  let abortController = new AbortController(),
    r = !0;
  function n() {
    if (r) (e.removeEventListener("abort", o), (r = !1));
  }
  function o() {
    (abortController.abort(e.reason), n());
  }
  return (e.addEventListener("abort", o), { abortSignal: abortController.signal, cleanup: n });
}

export { Xo };
