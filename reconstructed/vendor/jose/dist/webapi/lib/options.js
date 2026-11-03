/**
 * jose/dist/webapi/lib/options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (6), chunk-5h78gfwc.js (2)
 * attribution: esm-layout 4, esm-fingerprint 4
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { Ce } from "../../browser/runtime/ecdhes.js";
import { Ve } from "../../node/esm/lib/check_p2s.js";
import { Xe } from "./key_management.js";
import { Ye } from "../../node/esm/lib/cek.js";
import { P, E, F, f } from "./content_encryption.js";
import { We } from "../../browser/runtime/jwk_to_key.js";
import { Qe } from "../../node/esm/lib/check_key_type.js";
import { se } from "../../browser/runtime/encrypt.js";
import { je, Ur } from "../../node/esm/lib/decrypt_key_management.js";
import { f_2 } from "../../node/esm/util/errors.js";

//@ chunk-2tyrgda4.js:22519-22526 esm-layout
var Tt;
//@ chunk-2tyrgda4.js:22526-22601 esm-layout
var Ut = Xa(() => {
  Ce();
  Ve();
  Xe();
  Ye();
  P();
  E();
  We();
  Qe();
  se();
  F();
  je();
  Tt = Ur;
});
//@ chunk-2tyrgda4.js:22601-23363 esm-fingerprint
function Dr(e, t, r, o, n) {
  if (n.crit !== void 0 && o.crit === void 0)
    throw new e('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!o || o.crit === void 0) return new Set();
  if (
    !Array.isArray(o.crit) ||
    o.crit.length === 0 ||
    o.crit.some((i) => typeof i !== "string" || i.length === 0)
  )
    throw new e('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  let a;
  if (r !== void 0) a = new Map([...Object.entries(r), ...t.entries()]);
  else a = t;
  for (let i of o.crit) {
    if (!a.has(i)) throw new f(`Extension Header Parameter "${i}" is not recognized`);
    if (n[i] === void 0) throw new e(`Extension Header Parameter "${i}" is missing`);
    else if (a.get(i) && o[i] === void 0)
      throw new e(`Extension Header Parameter "${i}" MUST be integrity protected`);
  }
  return new Set(o.crit);
}
//@ chunk-2tyrgda4.js:23363-23369 esm-layout
var X;
//@ chunk-2tyrgda4.js:23369-23395 esm-layout
var pe = Xa(() => {
  E();
  X = Dr;
});
//@ chunk-2tyrgda4.js:23395-23575 esm-fingerprint
var Or = (e, t) => {
    if (t !== void 0 && (!Array.isArray(t) || t.some((r) => typeof r !== "string")))
      throw TypeError(`"${e}" option must be an array of strings`);
    if (!t) return;
    return new Set(t);
  },
  de;
//@ chunk-5h78gfwc.js:27290-28047 esm-fingerprint
function N(e, t, r, n, i) {
  if (i.crit !== void 0 && n?.crit === void 0)
    throw new e('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!n || n.crit === void 0) return new Set();
  if (
    !Array.isArray(n.crit) ||
    n.crit.length === 0 ||
    n.crit.some((a) => typeof a !== "string" || a.length === 0)
  )
    throw new e('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  let o;
  if (r !== void 0) o = new Map([...Object.entries(r), ...t.entries()]);
  else o = t;
  for (let a of n.crit) {
    if (!o.has(a)) throw new f_2(`Extension Header Parameter "${a}" is not recognized`);
    if (i[a] === void 0) throw new e(`Extension Header Parameter "${a}" is missing`);
    if (o.get(a) && n[a] === void 0)
      throw new e(`Extension Header Parameter "${a}" MUST be integrity protected`);
  }
  return new Set(n.crit);
}
//@ chunk-5h78gfwc.js:28047-28225 esm-fingerprint
function ce(e, t) {
  if (t !== void 0 && (!Array.isArray(t) || t.some((r) => typeof r !== "string")))
    throw TypeError(`"${e}" option must be an array of strings`);
  if (!t) return;
  return new Set(t);
}

export { de, Or, X, Tt, Ut, pe, N, ce };
