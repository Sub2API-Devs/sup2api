/**
 * @anthropic-ai/sdk/internal/utils/env.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-3wydcdvj.js:4532-4720 esm-fingerprint
var cS = (e) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[e]?.trim() || void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.(e)?.trim() || void 0;
  return;
};

export { cS };
