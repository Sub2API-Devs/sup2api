/**
 * ecdsa-sig-formatter/src/ecdsa-sig-formatter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ecdsa-sig-formatter@1.0.11
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { d } from "../../safe-buffer/index.js";
import { Q } from "./param-bytes-for-alg.js";

//@ chunk-82d8c88w.js:1328-3287 cjs-fingerprint
var Nns = x(function (Tr, re) {
  var B = d().Buffer,
    Y = Q(),
    _ = 128,
    z = 0,
    Ke = 32,
    Ne = 16,
    He = 2,
    k = Ne | Ke | (z << 6),
    T = He | (z << 6);
  function Ge(e) {
    return e.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function ee(e) {
    if (B.isBuffer(e)) return e;
    else if (typeof e === "string") return B.from(e, "base64");
    throw TypeError("ECDSA signature must be a Base64 string or a Buffer");
  }
  function Je(e, r) {
    e = ee(e);
    var t = Y(r),
      n = t + 1,
      a = e.length,
      i = 0;
    if (e[i++] !== k) throw Error('Could not find expected "seq"');
    var u = e[i++];
    if (u === (_ | 1)) u = e[i++];
    if (a - i < u) throw Error('"seq" specified length of "' + u + '", only "' + (a - i) + '" remaining');
    if (e[i++] !== T) throw Error('Could not find expected "int" for "r"');
    var s = e[i++];
    if (a - i - 2 < s)
      throw Error('"r" specified length of "' + s + '", only "' + (a - i - 2) + '" available');
    if (n < s) throw Error('"r" specified length of "' + s + '", max of "' + n + '" is acceptable');
    var S = i;
    if (((i += s), e[i++] !== T)) throw Error('Could not find expected "int" for "s"');
    var l = e[i++];
    if (a - i !== l) throw Error('"s" specified length of "' + l + '", expected "' + (a - i) + '"');
    if (n < l) throw Error('"s" specified length of "' + l + '", max of "' + n + '" is acceptable');
    var o = i;
    if (((i += l), i !== a))
      throw Error('Expected to consume entire buffer, but "' + (a - i) + '" bytes remain');
    var f = t - s,
      D = t - l,
      allocUnsafe = B.allocUnsafe(f + s + D + l);
    for (i = 0; i < f; ++i) allocUnsafe[i] = 0;
    (e.copy(allocUnsafe, i, S + Math.max(-f, 0), S + s), (i = t));
    for (var Oe = i; i < Oe + D; ++i) allocUnsafe[i] = 0;
    return (
      e.copy(allocUnsafe, i, o + Math.max(-D, 0), o + l),
      (allocUnsafe = allocUnsafe.toString("base64")),
      (allocUnsafe = Ge(allocUnsafe)),
      allocUnsafe
    );
  }
  function X(e, r, t) {
    var n = 0;
    while (r + n < t && e[r + n] === 0) ++n;
    var a = e[r + n] >= _;
    if (a) --n;
    return n;
  }
  function Me(e, r) {
    e = ee(e);
    var t = Y(r),
      n = e.length;
    if (n !== t * 2) throw TypeError('"' + r + '" signatures must be "' + t * 2 + '" bytes, saw "' + n + '"');
    var a = X(e, 0, t),
      i = X(e, t, e.length),
      u = t - a,
      s = t - i,
      S = 2 + u + 1 + 1 + s,
      l = S < _,
      allocUnsafe = B.allocUnsafe((l ? 2 : 3) + S),
      f = 0;
    if (((allocUnsafe[f++] = k), l)) allocUnsafe[f++] = S;
    else ((allocUnsafe[f++] = _ | 1), (allocUnsafe[f++] = S & 255));
    if (((allocUnsafe[f++] = T), (allocUnsafe[f++] = u), a < 0))
      ((allocUnsafe[f++] = 0), (f += e.copy(allocUnsafe, f, 0, t)));
    else f += e.copy(allocUnsafe, f, a, t);
    if (((allocUnsafe[f++] = T), (allocUnsafe[f++] = s), i < 0))
      ((allocUnsafe[f++] = 0), e.copy(allocUnsafe, f, t));
    else e.copy(allocUnsafe, f, t + i);
    return allocUnsafe;
  }
  re.exports = { derToJose: Je, joseToDer: Me };
});

export { Nns };
