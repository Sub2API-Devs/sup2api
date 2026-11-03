/**
 * @anthropic-ai/sdk/internal/request-signal.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */

//@ chunk-hwmsct5x.js:17462-17589 esm-layout
var abortListenerCleanups = new WeakMap(),
  Gl =
    typeof globalThis.FinalizationRegistry === "function"
      ? new globalThis.FinalizationRegistry((e) => releaseAbortListener(e))
      : null;
//@ chunk-hwmsct5x.js:17589-17649 esm-fingerprint
function Oh(e, n) {
  return () => e.removeEventListener("abort", n);
}
//@ chunk-hwmsct5x.js:17649-17686 esm-layout
function registerAbortListenerCleanup(e, n, r) {
  abortListenerCleanups.set(e, Oh(n, r));
}
//@ chunk-hwmsct5x.js:17686-17736 esm-fingerprint
function registerFinalizerCleanup(e, n) {
  if (abortListenerCleanups.has(n)) Gl?.register(e, n, n);
}
/**
 * 执行并移除某对象登记的 abort 监听清理函数，同时注销 FinalizationRegistry 记录。
 */
//@ chunk-hwmsct5x.js:17736-17807 esm-fingerprint
function releaseAbortListener(e) {
  let n = abortListenerCleanups.get(e);
  if (n) (abortListenerCleanups.delete(e), Gl?.unregister(e), n());
}

export { releaseAbortListener, registerFinalizerCleanup, registerAbortListenerCleanup };
