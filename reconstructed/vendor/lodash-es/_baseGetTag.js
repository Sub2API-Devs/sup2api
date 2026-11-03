/**
 * lodash-es/_baseGetTag.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-a16kyqj3.js (6)
 * attribution: placement 6
 */
import { dV } from "./_root.js";
import { o } from "./_getRawTag.js";

//@ chunk-a16kyqj3.js:614-650 placement
var S = Object.prototype,
  toString_2 = S.toString;
//@ chunk-a16kyqj3.js:650-681 placement
function s(t) {
  return toString_2.call(t);
}
//@ chunk-a16kyqj3.js:681-689 placement
var n = s;
//@ chunk-a16kyqj3.js:689-761 placement
var y = "[object Null]",
  O = "[object Undefined]",
  a = dV ? dV.toStringTag : void 0;
//@ chunk-a16kyqj3.js:761-843 placement
function v(t) {
  if (t == null) return t === void 0 ? O : y;
  return a && a in Object(t) ? o(t) : n(t);
}
//@ chunk-a16kyqj3.js:843-853 placement
var yre = v;

export { yre };
