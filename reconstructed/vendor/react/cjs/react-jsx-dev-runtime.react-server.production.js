/**
 * react/cjs/react-jsx-dev-runtime.react-server.production.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: react@19.3.0..19.3.1
 * pieces: chunk-nn4p932b.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 */

//@ chunk-nn4p932b.js:191-269 esm-fingerprint
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  x = Symbol.for("react.fragment");
//@ chunk-nn4p932b.js:269-485 esm-fingerprint
function jsx(o, t, s) {
  var l = null;
  if ((s !== void 0 && (l = "" + s), t.key !== void 0 && (l = "" + t.key), "key" in t)) {
    s = {};
    for (var key in t) key !== "key" && (s[key] = t[key]);
  } else s = t;
  return (
    (t = s.ref),
    { $$typeof: REACT_ELEMENT_TYPE, type: o, key: l, ref: t !== void 0 ? t : null, props: s }
  );
}
//@ chunk-nn4p932b.js:485-501 esm-layout
var Fragment = x,
  e = jsx,
  r = jsx;

export { r, e, Fragment };
