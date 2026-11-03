/**
 * lodash-es/_isPrototype.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z0q4jgnc.js (3)
 * attribution: placement 3
 */

//@ chunk-z0q4jgnc.js:454-478 placement
var Gr = Object.prototype;
//@ chunk-z0q4jgnc.js:478-569 placement
function isPrototype(r) {
  var t = r && r.constructor,
    e = (typeof t == "function" && t.prototype) || Gr;
  return r === e;
}
//@ chunk-z0q4jgnc.js:569-580 placement
var X8e = isPrototype;

export { X8e };
