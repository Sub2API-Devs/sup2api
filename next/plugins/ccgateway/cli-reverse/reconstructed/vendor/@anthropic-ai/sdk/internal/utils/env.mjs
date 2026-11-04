/**
 * @anthropic-ai/sdk/internal/utils/env.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-3wydcdvj.js:4532-4720 esm-fingerprint
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || undefined;
  if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
  return;
};
export { readEnv };
