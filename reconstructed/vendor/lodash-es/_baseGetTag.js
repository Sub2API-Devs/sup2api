/**
 * lodash-es/_baseGetTag.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-a16kyqj3.js (6)
 * attribution: placement 6
 */
import { dV } from "./_root.js";
import { getRawTag_default } from "./_getRawTag.js";

//@ chunk-a16kyqj3.js:614-650 placement
var S = Object.prototype;
var toString = S.toString;
//@ chunk-a16kyqj3.js:650-681 placement
function s(t) {
  return toString.call(t);
}
//@ chunk-a16kyqj3.js:681-689 placement
var n = s;
//@ chunk-a16kyqj3.js:689-761 placement
var y = "[object Null]";
var undefinedTag = "[object Undefined]";
var symToStringTag_2 = dV ? dV.toStringTag : undefined;
//@ chunk-a16kyqj3.js:761-843 placement
function v(value) {
  if (value == null) return value === undefined ? undefinedTag : y;
  return symToStringTag_2 && symToStringTag_2 in Object(value) ? getRawTag_default(value) : n(value);
}
//@ chunk-a16kyqj3.js:843-853 placement
var yre = v;
export { yre };
