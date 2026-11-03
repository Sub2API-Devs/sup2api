/**
 * @anthropic-ai/foundry-sdk/internal/utils/env.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/foundry-sdk@0.4.1..0.5.4
 * pieces: chunk-q01xm7xp.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-q01xm7xp.js:1426-1613 esm-fingerprint
var u = (e) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[e]?.trim() || void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.(e)?.trim() || void 0;
  return;
};

export { u };
