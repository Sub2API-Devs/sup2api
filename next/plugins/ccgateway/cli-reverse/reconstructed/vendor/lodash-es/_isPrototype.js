/**
 * lodash-es/_isPrototype.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z0q4jgnc.js (3)
 * attribution: placement 3
 */

//@ chunk-z0q4jgnc.js:454-478 placement
var objectProto = Object.prototype;
//@ chunk-z0q4jgnc.js:478-569 placement
function isPrototype(value) {
  var Ctor = value && value.constructor;
  var proto = (typeof Ctor == "function" && Ctor.prototype) || objectProto;
  return value === proto;
}
//@ chunk-z0q4jgnc.js:569-580 placement
var isPrototype_default = isPrototype;
export { isPrototype_default };
