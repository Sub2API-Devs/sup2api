/**
 * @anthropic-ai/sandbox-runtime/dist/utils/debug.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-getdj2mr.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-getdj2mr.js:614-840 esm-fingerprint
function logForDebugging(message, options) {
  if (!process.env.SRT_DEBUG) return;
  let level = options?.level || "info";
  let prefix = "[SandboxDebug]";
  switch (level) {
    case "error":
      console.error(`${prefix} ${message}`);
      break;
    case "warn":
      console.warn(`${prefix} ${message}`);
      break;
    default:
      console.error(`${prefix} ${message}`);
  }
}
export { logForDebugging };
