/**
 * @modelcontextprotocol/sdk/dist/esm/server/zod-compat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (4)
 * attribution: esm-fingerprint 4
 */
import { qgs } from "../../../../../zod/v4/core/parse.js";

//@ chunk-zykv69v4.js:10458-10489 esm-fingerprint
function $Qe(e) {
  return !!e._zod;
}
//@ chunk-zykv69v4.js:10489-10554 esm-fingerprint
function q7(e, t) {
  if ($Qe(e)) return qgs(e, t);
  return e.safeParse(t);
}
//@ chunk-zykv69v4.js:10554-10710 esm-fingerprint
function J$t(e) {
  if (!e) return;
  let t;
  if ($Qe(e)) t = e._zod?.def?.shape;
  else t = e.shape;
  if (!t) return;
  if (typeof t === "function")
    try {
      return t();
    } catch {
      return;
    }
  return t;
}
//@ chunk-zykv69v4.js:10710-11023 esm-fingerprint
function H(e) {
  if ($Qe(e)) {
    let s = e._zod?.def;
    if (s) {
      if (s.value !== void 0) return s.value;
      if (Array.isArray(s.values) && s.values.length > 0) return s.values[0];
    }
  }
  let _def = e._def;
  if (_def) {
    if (_def.value !== void 0) return _def.value;
    if (Array.isArray(_def.values) && _def.values.length > 0) return _def.values[0];
  }
  let a = e.value;
  if (a !== void 0) return a;
  return;
}

export { J$t, $Qe, q7, H };
