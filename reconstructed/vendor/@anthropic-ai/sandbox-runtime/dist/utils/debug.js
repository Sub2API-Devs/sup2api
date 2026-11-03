/**
 * @anthropic-ai/sandbox-runtime/dist/utils/debug.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-r0ads4ty.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-r0ads4ty.js:614-840 esm-fingerprint
function At(e, t) {
  if (!process.env.SRT_DEBUG) return;
  let r = t?.level || "info",
    n = "[SandboxDebug]";
  switch (r) {
    case "error":
      console.error(`${n} ${e}`);
      break;
    case "warn":
      console.warn(`${n} ${e}`);
      break;
    default:
      console.error(`${n} ${e}`);
  }
}

export { At };
