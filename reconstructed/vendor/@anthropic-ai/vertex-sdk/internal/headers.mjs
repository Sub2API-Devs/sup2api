/**
 * @anthropic-ai/vertex-sdk/internal/headers.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { f } from "./utils/values.mjs";

//@ chunk-xa96axyz.js:1139-1188 esm-fingerprint
var y = Symbol.for("brand.privateNullableHeaders");
//@ chunk-xa96axyz.js:1188-1617 esm-fingerprint
function* O(e) {
  if (!e) return;
  if (y in e) {
    let { values: values, nulls: nulls } = e;
    yield* values.entries();
    for (let i of nulls) yield [i, null];
    return;
  }
  let t = !1,
    r;
  if (e instanceof Headers) r = e.entries();
  else if (f(e)) r = e;
  else ((t = !0), (r = Object.entries(e ?? {})));
  for (let o of r) {
    let a = o[0];
    if (typeof a !== "string") throw TypeError("expected header name to be a string");
    let i = f(o[1]) ? o[1] : [o[1]],
      n = !1;
    for (let s of i) {
      if (s === void 0) continue;
      if (t && !n) ((n = !0), yield [a, u]);
      yield [a, s];
    }
  }
}
//@ chunk-xa96axyz.js:1617-2219 esm-layout
var u = Symbol("clear"),
  C = new Set(["x-stainless-helper"]),
  P = (e, t) => {
    let r = e
      ? e
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];
    for (let o of t.split(",").map((a) => a.trim())) if (o && !r.includes(o)) r.push(o);
    return r.join(", ");
  },
  E = (e) => {
    let headers = new Headers(),
      r = new Set();
    for (let o of e) {
      let a = new Set();
      for (let [i, n] of O(o)) {
        let lower = i.toLowerCase();
        if (C.has(lower)) {
          if (n === u) continue;
          if (n === null) (headers.delete(i), r.add(lower));
          else (headers.set(i, P(headers.get(i), n)), r.delete(lower));
          continue;
        }
        if (n === u || !a.has(lower)) {
          if ((headers.delete(i), a.add(lower), n === u)) continue;
        }
        if (n === null) (headers.delete(i), r.add(lower));
        else (headers.append(i, n), r.delete(lower));
      }
    }
    return { [y]: !0, values: headers, nulls: r };
  };

export { E };
