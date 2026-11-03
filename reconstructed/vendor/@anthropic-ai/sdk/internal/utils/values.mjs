/**
 * @anthropic-ai/sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: esm-fingerprint 4, esm-layout 3
 */
import { pr } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:16686-16774 esm-fingerprint
var Mh = /^[a-z][a-z0-9+.-]*:/i,
  ql = (e) => Mh.test(e),
  Ye = (e) => ((Ye = Array.isArray), Ye(e)),
  Di = Ye;
//@ chunk-hwmsct5x.js:16774-16834 esm-layout
function nr(e) {
  if (typeof e !== "object") return {};
  return e ?? {};
}
//@ chunk-hwmsct5x.js:16834-16897 esm-layout
function Ui(e) {
  if (!e) return !0;
  for (let key in e) return !1;
  return !0;
}
//@ chunk-hwmsct5x.js:16897-16963 esm-fingerprint
function zl(e, n) {
  return Object.prototype.hasOwnProperty.call(e, n);
}
//@ chunk-hwmsct5x.js:16963-17033 esm-fingerprint
function Ni(e) {
  return e != null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-hwmsct5x.js:17033-17198 esm-fingerprint
var Do = (e, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) throw new pr(`${e} must be an integer`);
  if (n < 0) throw new pr(`${e} must be a positive integer`);
  return n;
};
//@ chunk-hwmsct5x.js:17198-17254 esm-layout
var Uo = (e) => {
  try {
    return JSON.parse(e);
  } catch (error) {
    return;
  }
};

export { Ye, zl, Uo, nr, Di, Ni, Do, ql, Ui };
