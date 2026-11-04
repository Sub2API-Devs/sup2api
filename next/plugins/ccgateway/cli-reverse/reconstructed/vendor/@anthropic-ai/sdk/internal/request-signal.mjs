/**
 * @anthropic-ai/sdk/internal/request-signal.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
//@ chunk-hwmsct5x.js:17462-17589 esm-layout
var abortListenerCleanups = new WeakMap();
var registry =
  typeof globalThis.FinalizationRegistry === "function"
    ? new globalThis.FinalizationRegistry((controller) => releaseAbortListener(controller))
    : null;
//@ chunk-hwmsct5x.js:17589-17649 esm-fingerprint
function makeCleanup(signal, listener) {
  return () => signal.removeEventListener("abort", listener);
}
//@ chunk-hwmsct5x.js:17649-17686 esm-layout
function registerAbortListenerCleanup(controller, signal, listener) {
  abortListenerCleanups.set(controller, makeCleanup(signal, listener));
}
//@ chunk-hwmsct5x.js:17686-17736 esm-fingerprint
function registerFinalizerCleanup(body, controller) {
  if (abortListenerCleanups.has(controller)) registry?.register(body, controller, controller);
}
//@ chunk-hwmsct5x.js:17736-17807 esm-fingerprint
/**
 * 执行并移除某对象登记的 abort 监听清理函数，同时注销 FinalizationRegistry 记录。
 */
function releaseAbortListener(controller) {
  let cleanup = abortListenerCleanups.get(controller);
  if (cleanup) {
    abortListenerCleanups.delete(controller);
    registry?.unregister(controller);
    cleanup();
  }
}
export { releaseAbortListener, registerFinalizerCleanup, registerAbortListenerCleanup };
