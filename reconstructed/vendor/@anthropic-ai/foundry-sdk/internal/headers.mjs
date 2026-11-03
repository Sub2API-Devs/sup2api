/**
 * @anthropic-ai/foundry-sdk/internal/headers.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/foundry-sdk@0.4.1..0.5.4
 * pieces: chunk-q01xm7xp.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */

//@ chunk-q01xm7xp.js:308-346 esm-layout
var c = (e) => ((c = Array.isArray), c(e)),
  l = c;
//@ chunk-q01xm7xp.js:346-395 esm-fingerprint
var d = Symbol.for("brand.privateNullableHeaders");
//@ chunk-q01xm7xp.js:395-824 esm-fingerprint
function* h(e) {
  if (!e) return;
  if (d in e) {
    let { values: values, nulls: nulls } = e;
    yield* values.entries();
    for (let i of nulls) yield [i, null];
    return;
  }
  let t = !1,
    n;
  if (e instanceof Headers) n = e.entries();
  else if (l(e)) n = e;
  else ((t = !0), (n = Object.entries(e ?? {})));
  for (let r of n) {
    let o = r[0];
    if (typeof o !== "string") throw TypeError("expected header name to be a string");
    let i = l(r[1]) ? r[1] : [r[1]],
      f = !1;
    for (let s of i) {
      if (s === void 0) continue;
      if (t && !f) ((f = !0), yield [o, a]);
      yield [o, s];
    }
  }
}
//@ chunk-q01xm7xp.js:824-1426 esm-layout
var a = Symbol("clear"),
  b = new Set(["x-stainless-helper"]),
  x = (e, t) => {
    let n = e
      ? e
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];
    for (let r of t.split(",").map((o) => o.trim())) if (r && !n.includes(r)) n.push(r);
    return n.join(", ");
  },
  p = (e) => {
    let headers = new Headers(),
      n = new Set();
    for (let r of e) {
      let o = new Set();
      for (let [i, f] of h(r)) {
        let lower = i.toLowerCase();
        if (b.has(lower)) {
          if (f === a) continue;
          if (f === null) (headers.delete(i), n.add(lower));
          else (headers.set(i, x(headers.get(i), f)), n.delete(lower));
          continue;
        }
        if (f === a || !o.has(lower)) {
          if ((headers.delete(i), o.add(lower), f === a)) continue;
        }
        if (f === null) (headers.delete(i), n.add(lower));
        else (headers.append(i, f), n.delete(lower));
      }
    }
    return { [d]: !0, values: headers, nulls: n };
  };

export { p };
