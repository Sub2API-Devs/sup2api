/**
 * node-forge/lib/baseN.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:3501-4980 cjs-fingerprint
var aT = x(function (ofe, oT) {
  var Zb = {};
  oT.exports = Zb;
  var iT = {};
  Zb.encode = function (e, n, r) {
    if (typeof n !== "string") throw TypeError('"alphabet" must be a string.');
    if (r !== void 0 && typeof r !== "number") throw TypeError('"maxline" must be a number.');
    var s = "";
    if (!(e instanceof Uint8Array)) s = o3(e, n);
    else {
      var h = 0,
        y = n.length,
        charAt = n.charAt(0),
        S = [0];
      for (h = 0; h < e.length; ++h) {
        for (var w = 0, R = e[h]; w < S.length; ++w) ((R += S[w] << 8), (S[w] = R % y), (R = (R / y) | 0));
        while (R > 0) (S.push(R % y), (R = (R / y) | 0));
      }
      for (h = 0; e[h] === 0 && h < e.length - 1; ++h) s += charAt;
      for (h = S.length - 1; h >= 0; --h) s += n[S[h]];
    }
    if (r) {
      var regExp = new RegExp(".{1," + r + "}", "g");
      s = s.match(regExp).join(`\r
`);
    }
    return s;
  };
  Zb.decode = function (e, n) {
    if (typeof e !== "string") throw TypeError('"input" must be a string.');
    if (typeof n !== "string") throw TypeError('"alphabet" must be a string.');
    var r = iT[n];
    if (!r) {
      r = iT[n] = [];
      for (var s = 0; s < n.length; ++s) r[n.charCodeAt(s)] = s;
    }
    e = e.replace(/\s/g, "");
    var h = n.length,
      charAt = n.charAt(0),
      b = [0];
    for (var s = 0; s < e.length; s++) {
      var S = r[e.charCodeAt(s)];
      if (S === void 0) return;
      for (var w = 0, R = S; w < b.length; ++w) ((R += b[w] * h), (b[w] = R & 255), (R >>= 8));
      while (R > 0) (b.push(R & 255), (R >>= 8));
    }
    for (var D = 0; e[D] === charAt && D < e.length - 1; ++D) b.push(0);
    if (typeof Buffer < "u") return Buffer.from(b.reverse());
    return new Uint8Array(b.reverse());
  };
  function o3(e, n) {
    var r = 0,
      s = n.length,
      charAt = n.charAt(0),
      y = [0];
    for (r = 0; r < e.length(); ++r) {
      for (var b = 0, at = e.at(r); b < y.length; ++b)
        ((at += y[b] << 8), (y[b] = at % s), (at = (at / s) | 0));
      while (at > 0) (y.push(at % s), (at = (at / s) | 0));
    }
    var w = "";
    for (r = 0; e.at(r) === 0 && r < e.length() - 1; ++r) w += charAt;
    for (r = y.length - 1; r >= 0; --r) w += n[y[r]];
    return w;
  }
});

export { aT };
