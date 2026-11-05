/**
 * @anthropic-ai/sdk/internal/request-signal.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-vn3g7zt8.js:17830-17957 esm-layout
var abortListenerCleanups = new WeakMap();
var registry =
  typeof globalThis.FinalizationRegistry === "function"
    ? new globalThis.FinalizationRegistry((controller) => releaseAbortListener(controller))
    : null;
//@ chunk-vn3g7zt8.js:17957-18017 esm-fingerprint
function makeCleanup(signal, listener) {
  return () => signal.removeEventListener("abort", listener);
}
//@ chunk-vn3g7zt8.js:18017-18054 esm-layout
function registerAbortListenerCleanup(controller, signal, listener) {
  abortListenerCleanups.set(controller, makeCleanup(signal, listener));
}
//@ chunk-vn3g7zt8.js:18054-18104 esm-fingerprint
function registerFinalizerCleanup(body, controller) {
  if (abortListenerCleanups.has(controller)) registry?.register(body, controller, controller);
}
//@ chunk-vn3g7zt8.js:18104-18175 esm-fingerprint
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
