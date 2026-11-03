/**
 * @anthropic-ai/bedrock-sdk/internal/utils/log.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (6), chunk-qhhcfyds.js (6)
 * attribution: esm-fingerprint 8, esm-layout 4
 */

//@ chunk-h87x8cg3.js:10486-10538 esm-fingerprint
var Z = { off: 0, error: 200, warn: 300, info: 400, debug: 500 };
//@ chunk-h87x8cg3.js:10538-10552 esm-layout
function noopLog() {}
//@ chunk-h87x8cg3.js:10552-10621 esm-layout
function C(e, t, r) {
  if (!t || Z[e] > Z[r]) return noopLog;
  else return t[e].bind(t);
}
//@ chunk-h87x8cg3.js:10621-10674 esm-fingerprint
var Le = { error: noopLog, warn: noopLog, info: noopLog, debug: noopLog },
  weakMap = new WeakMap();
//@ chunk-h87x8cg3.js:10674-10845 esm-fingerprint
function He(e, t) {
  let r = weakMap.get(e);
  if (r && r[0] === t) return r[1];
  let n = { error: C("error", e, t), warn: C("warn", e, t), info: C("info", e, t), debug: C("debug", e, t) };
  return (weakMap.set(e, [t, n]), n);
}
//@ chunk-h87x8cg3.js:10845-10925 esm-fingerprint
function S_2(e) {
  let logger = e.logger,
    r = e.logLevel ?? "off";
  if (!logger) return Le;
  return He(logger, r);
}
//@ chunk-qhhcfyds.js:1975-2027 esm-fingerprint
var T = { off: 0, error: 200, warn: 300, info: 400, debug: 500 };
//@ chunk-qhhcfyds.js:2027-2041 esm-layout
function noopLog_2() {}
//@ chunk-qhhcfyds.js:2041-2110 esm-layout
function getLevelWriter(e, t, r) {
  if (!t || T[e] > T[r]) return noopLog_2;
  else return t[e].bind(t);
}
//@ chunk-qhhcfyds.js:2110-2162 esm-fingerprint
var Y = { error: noopLog_2, warn: noopLog_2, info: noopLog_2, debug: noopLog_2 },
  weakMap_2 = new WeakMap();
//@ chunk-qhhcfyds.js:2162-2332 esm-fingerprint
function X(e, t) {
  let r = weakMap_2.get(e);
  if (r && r[0] === t) return r[1];
  let n = {
    error: getLevelWriter("error", e, t),
    warn: getLevelWriter("warn", e, t),
    info: getLevelWriter("info", e, t),
    debug: getLevelWriter("debug", e, t),
  };
  return (weakMap_2.set(e, [t, n]), n);
}
//@ chunk-qhhcfyds.js:2332-2410 esm-fingerprint
function _(e) {
  let logger = e.logger,
    r = e.logLevel ?? "off";
  if (!logger) return Y;
  return X(logger, r);
}

export { S_2, _ };
