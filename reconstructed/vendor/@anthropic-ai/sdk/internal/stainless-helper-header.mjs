/**
 * @anthropic-ai/sdk/internal/stainless-helper-header.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: esm-fingerprint 3, esm-layout 4
 */

//@ chunk-hwmsct5x.js:49398-49457 esm-fingerprint
var X_STAINLESS_HELPER = "x-stainless-helper",
  X_STAINLESS_HELPER_METHOD = "x-stainless-helper-method";
//@ chunk-hwmsct5x.js:49457-49505 esm-layout
function wr(e) {
  return { ["x-stainless-helper"]: e };
}
//@ chunk-hwmsct5x.js:49505-49552 esm-fingerprint
var Rn = Symbol("anthropic.sdk.stainlessHelper");
//@ chunk-hwmsct5x.js:49552-49613 esm-layout
function yr(e) {
  return typeof e === "object" && e !== null && Rn in e;
}
//@ chunk-hwmsct5x.js:49613-49874 esm-fingerprint
function oa(e, n) {
  let r = new Set();
  if (e) {
    for (let s of e) if (yr(s)) r.add(s[Rn]);
  }
  if (n)
    for (let s of n) {
      if (yr(s)) r.add(s[Rn]);
      let content = s.content;
      if (Array.isArray(content))
        for (let y of content) {
          if (yr(y)) r.add(y[Rn]);
          let w = y?.tool?.definition;
          if (yr(w)) r.add(w[Rn]);
        }
    }
  return Array.from(r);
}
//@ chunk-hwmsct5x.js:49874-49974 esm-layout
function ss(e, n) {
  let r = oa(e, n);
  if (r.length === 0) return {};
  return { ["x-stainless-helper"]: r.join(", ") };
}
//@ chunk-hwmsct5x.js:49974-50044 esm-layout
function is(e) {
  if (yr(e)) return { ["x-stainless-helper"]: e[Rn] };
  return {};
}

export { is, X_STAINLESS_HELPER, wr, X_STAINLESS_HELPER_METHOD, oa, ss };
