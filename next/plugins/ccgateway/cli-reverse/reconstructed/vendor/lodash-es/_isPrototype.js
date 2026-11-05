/**
 * lodash-es/_isPrototype.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-wwjb4dqs.js (3)
 * attribution: placement 3
 */

//@ chunk-wwjb4dqs.js:453-477 placement
var objectProto = Object.prototype;
//@ chunk-wwjb4dqs.js:477-568 placement
function isPrototype(value) {
  var Ctor = value && value.constructor;
  var proto = (typeof Ctor == "function" && Ctor.prototype) || objectProto;
  return value === proto;
}
//@ chunk-wwjb4dqs.js:568-579 placement
var isPrototype_default = isPrototype;
export { isPrototype_default };
