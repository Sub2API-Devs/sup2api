/**
 * @anthropic-ai/sdk/internal/headers.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { Di } from "./utils/values.mjs";

//@ chunk-hwmsct5x.js:43223-43273 esm-fingerprint
var Eu = Symbol.for("brand.privateNullableHeaders");
//@ chunk-hwmsct5x.js:43273-43707 esm-fingerprint
function* Vh(e) {
  if (!e) return;
  if (Eu in e) {
    let { values: values, nulls: nulls } = e;
    yield* values.entries();
    for (let y of nulls) yield [y, null];
    return;
  }
  let n = !1,
    r;
  if (e instanceof Headers) r = e.entries();
  else if (Di(e)) r = e;
  else ((n = !0), (r = Object.entries(e ?? {})));
  for (let s of r) {
    let h = s[0];
    if (typeof h !== "string") throw TypeError("expected header name to be a string");
    let y = Di(s[1]) ? s[1] : [s[1]],
      w = !1;
    for (let S of y) {
      if (S === void 0) continue;
      if (n && !w) ((w = !0), yield [h, Zo]);
      yield [h, S];
    }
  }
}
//@ chunk-hwmsct5x.js:43707-44319 esm-layout
var Zo = Symbol("clear"),
  Xh = new Set(["x-stainless-helper"]),
  Jh = (e, n) => {
    let r = e
      ? e
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    for (let s of n.split(",").map((h) => h.trim())) if (s && !r.includes(s)) r.push(s);
    return r.join(", ");
  },
  T = (e) => {
    let headers = new Headers(),
      r = new Set();
    for (let s of e) {
      let h = new Set();
      for (let [y, w] of Vh(s)) {
        let lower = y.toLowerCase();
        if (Xh.has(lower)) {
          if (w === Zo) continue;
          if (w === null) (headers.delete(y), r.add(lower));
          else (headers.set(y, Jh(headers.get(y), w)), r.delete(lower));
          continue;
        }
        if (w === Zo || !h.has(lower)) {
          if ((headers.delete(y), h.add(lower), w === Zo)) continue;
        }
        if (w === null) (headers.delete(y), r.add(lower));
        else (headers.append(y, w), r.delete(lower));
      }
    }
    return { [Eu]: !0, values: headers, nulls: r };
  };

export { T };
