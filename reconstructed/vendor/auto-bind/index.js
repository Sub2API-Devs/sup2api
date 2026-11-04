/**
 * auto-bind/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: auto-bind@5.0.1
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-bzr73sfg.js:144882-145026 esm-fingerprint
var getAllProperties = (object) => {
  let properties = new Set();
  do for (let key of Reflect.ownKeys(object)) properties.add([object, key]);
  while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);
  return properties;
};
//@ chunk-bzr73sfg.js:145026-145365 esm-fingerprint
function autoBind(selfRef, { include, exclude } = {}) {
  let filter = (key) => {
    let match = (pattern) => (typeof pattern === "string" ? key === pattern : pattern.test(key));
    if (include) return include.some(match);
    if (exclude) return !exclude.some(match);
    return true;
  };
  for (let [object, key] of getAllProperties(selfRef.constructor.prototype)) {
    if (key === "constructor" || !filter(key)) continue;
    let descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (descriptor && typeof descriptor.value === "function") selfRef[key] = selfRef[key].bind(selfRef);
  }
  return selfRef;
}
export { autoBind };
