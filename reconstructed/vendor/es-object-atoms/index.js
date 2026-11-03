/**
 * es-object-atoms/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-object-atoms@1.1.2
 * pieces: chunk-h6b7mazd.js (9)
 * attribution: cjs-require-graph 9
 */
import { x } from "../../runtime/bun-runtime.js";
import { yo } from "../unresolved-cjs/index.js";

//@ chunk-h6b7mazd.js:7433-7478 cjs-require-graph
var er = x(function (kl, Hn) {
  Hn.exports = Object;
});
//@ chunk-h6b7mazd.js:7478-7522 cjs-require-graph
var $n = x(function (jl, zn) {
  zn.exports = Error;
});
//@ chunk-h6b7mazd.js:7522-7570 cjs-require-graph
var Wn = x(function (Ml, Vn) {
  Vn.exports = EvalError;
});
//@ chunk-h6b7mazd.js:7570-7619 cjs-require-graph
var Jn = x(function (Hl, Gn) {
  Gn.exports = RangeError;
});
//@ chunk-h6b7mazd.js:7619-7672 cjs-require-graph
var Xn = x(function (zl, Kn) {
  Kn.exports = ReferenceError;
});
//@ chunk-h6b7mazd.js:7672-7722 cjs-require-graph
var Qn = x(function ($l, Yn) {
  Yn.exports = SyntaxError;
});
//@ chunk-h6b7mazd.js:7722-7770 cjs-require-graph
var _t = x(function (Vl, Zn) {
  Zn.exports = TypeError;
});
//@ chunk-h6b7mazd.js:7770-7817 cjs-require-graph
var to = x(function (Wl, eo) {
  eo.exports = URIError;
});
//@ chunk-h6b7mazd.js:8181-8285 cjs-require-graph
var go = x(function (ep, bo) {
  var Xa = yo();
  bo.exports = function (t) {
    if (Xa(t) || t === 0) return t;
    return t < 0 ? -1 : 1;
  };
});

export { er, _t, $n, Wn, Jn, Xn, Qn, to, go };
