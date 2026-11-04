/**
 * @anthropic-ai/bedrock-sdk/internal/utils/env.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (1), chunk-h87x8cg3.js (1), chunk-qhhcfyds.js (1), chunk-xa96axyz.js (1)
 * attribution: esm-fingerprint 4
 */

//@ chunk-h87x8cg3.js:8101-8288 esm-fingerprint
var readEnv_2 = (env) => {
  if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || undefined;
  if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
  return;
};
//@ chunk-qhhcfyds.js:1788-1975 esm-fingerprint
var readEnv_3 = (env) => {
  if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || undefined;
  if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
  return;
};
//@ chunk-e7naa6k8.js:1533-1720 esm-fingerprint
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || undefined;
  if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
  return;
};
//@ chunk-xa96axyz.js:790-977 esm-fingerprint
var readEnv_4 = (env) => {
  if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || undefined;
  if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || undefined;
  return;
};
export { readEnv, readEnv_2, readEnv_3, readEnv_4 };
