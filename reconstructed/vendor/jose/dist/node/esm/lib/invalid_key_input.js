/**
 * jose/dist/node/esm/lib/invalid_key_input.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4), chunk-5h78gfwc.js (2)
 * attribution: esm-layout 1, esm-fingerprint 5
 */

//@ chunk-2tyrgda4.js:6891-6904 esm-layout
var L = () => {};
//@ chunk-2tyrgda4.js:6904-7322 esm-fingerprint
function wt(e, t, ...r) {
  if (r.length > 2) {
    let o = r.pop();
    e += `one of type ${r.join(", ")}, or ${o}.`;
  } else if (r.length === 2) e += `one of type ${r[0]} or ${r[1]}.`;
  else e += `of type ${r[0]}.`;
  if (t == null) e += ` Received ${t}`;
  else if (typeof t === "function" && t.name) e += ` Received function ${t.name}`;
  else if (typeof t === "object" && t != null) {
    if (t.constructor && t.constructor.name) e += ` Received an instance of ${t.constructor.name}`;
  }
  return e;
}
//@ chunk-2tyrgda4.js:7322-7400 esm-fingerprint
function Be(e, t, ...r) {
  return wt(`Key for the ${e} algorithm must be `, t, ...r);
}
//@ chunk-2tyrgda4.js:7400-7442 esm-fingerprint
var A = (e, ...t) => wt("Key must be ", e, ...t);
//@ chunk-5h78gfwc.js:4387-4811 esm-fingerprint
function Le(e, t, ...r) {
  if (((r = r.filter(Boolean)), r.length > 2)) {
    let n = r.pop();
    e += `one of type ${r.join(", ")}, or ${n}.`;
  } else if (r.length === 2) e += `one of type ${r[0]} or ${r[1]}.`;
  else e += `of type ${r[0]}.`;
  if (t == null) e += ` Received ${t}`;
  else if (typeof t === "function" && t.name) e += ` Received function ${t.name}`;
  else if (typeof t === "object" && t != null) {
    if (t.constructor?.name) e += ` Received an instance of ${t.constructor.name}`;
  }
  return e;
}
//@ chunk-5h78gfwc.js:4811-4917 esm-fingerprint
var U = (e, ...t) => Le("Key must be ", e, ...t),
  Pe = (e, t, ...r) => Le(`Key for the ${e} algorithm must be `, t, ...r);

export { U, A, L, Be, Pe };
