/**
 * @anthropic-ai/bedrock-sdk/internal/utils/env.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (1), chunk-h87x8cg3.js (1), chunk-qhhcfyds.js (1), chunk-xa96axyz.js (1)
 * attribution: esm-fingerprint 4
 */

//@ chunk-e7naa6k8.js:1533-1720 esm-fingerprint
var u = (e) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[e]?.trim() || void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.(e)?.trim() || void 0;
  return;
};
//@ chunk-h87x8cg3.js:8101-8288 esm-fingerprint
var f = (e) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[e]?.trim() || void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.(e)?.trim() || void 0;
  return;
};
//@ chunk-qhhcfyds.js:1788-1975 esm-fingerprint
var f_qhhc = (e) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[e]?.trim() || void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.(e)?.trim() || void 0;
  return;
};
//@ chunk-xa96axyz.js:790-977 esm-fingerprint
var l = (e) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[e]?.trim() || void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.(e)?.trim() || void 0;
  return;
};

export { u, f, f_qhhc, l };
