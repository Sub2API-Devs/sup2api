/**
 * @anthropic-ai/foundry-sdk/internal/utils/env.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/foundry-sdk@0.4.1..0.5.4
 * pieces: chunk-5g2k022m.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-5g2k022m.js:1426-1613 esm-fingerprint
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || undefined;
  if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
  return;
};
export { readEnv };
