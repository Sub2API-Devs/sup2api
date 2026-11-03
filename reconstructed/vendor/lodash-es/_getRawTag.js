/**
 * lodash-es/_getRawTag.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-a16kyqj3.js (3)
 * attribution: placement 3
 */
import { dV } from "./_root.js";

//@ chunk-a16kyqj3.js:391-473 placement = substituteVariables (0.576)
var e = Object.prototype,
  { hasOwnProperty: hasOwnProperty, toString: toString } = e,
  r = dV ? dV.toStringTag : void 0;
//@ chunk-a16kyqj3.js:473-606 placement
function u(t) {
  var f = hasOwnProperty.call(t, r),
    i = t[r];
  try {
    t[r] = void 0;
    var l = !0;
  } catch (error) {}
  var b = toString.call(t);
  if (l)
    if (f) t[r] = i;
    else delete t[r];
  return b;
}
//@ chunk-a16kyqj3.js:606-614 placement
var o = u;

export { o };
