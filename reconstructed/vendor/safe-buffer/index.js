/**
 * safe-buffer/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: safe-buffer@5.2.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-82d8c88w.js:229-1109 cjs-fingerprint
var d = x(function (V, W) {
  /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */ var A =
      importMetaRequire("buffer"),
    p = A.Buffer;
  function U(e, r) {
    for (var key in e) r[key] = e[key];
  }
  if (p.from && p.alloc && p.allocUnsafe && p.allocUnsafeSlow) W.exports = A;
  else (U(A, V), (V.Buffer = y));
  function y(e, r, t) {
    return p(e, r, t);
  }
  y.prototype = Object.create(p.prototype);
  U(p, y);
  y.from = function (e, r, t) {
    if (typeof e === "number") throw TypeError("Argument must not be a number");
    return p(e, r, t);
  };
  y.alloc = function (e, r, t) {
    if (typeof e !== "number") throw TypeError("Argument must be a number");
    var n = p(e);
    if (r !== void 0)
      if (typeof t === "string") n.fill(r, t);
      else n.fill(r);
    else n.fill(0);
    return n;
  };
  y.allocUnsafe = function (e) {
    if (typeof e !== "number") throw TypeError("Argument must be a number");
    return p(e);
  };
  y.allocUnsafeSlow = function (e) {
    if (typeof e !== "number") throw TypeError("Argument must be a number");
    return A.SlowBuffer(e);
  };
});

export { d };
