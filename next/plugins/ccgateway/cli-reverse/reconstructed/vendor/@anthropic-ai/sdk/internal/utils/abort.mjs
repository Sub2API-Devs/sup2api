/**
 * @anthropic-ai/sdk/internal/utils/abort.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-vn3g7zt8.js:55776-55943 esm-fingerprint
function linkAbort(external, controller) {
  if (!external) return () => {};
  if (external.aborted) {
    controller.abort();
    return () => {};
  }
  let onAbort = () => controller.abort();
  external.addEventListener("abort", onAbort);
  return () => external.removeEventListener("abort", onAbort);
}
export { linkAbort };
