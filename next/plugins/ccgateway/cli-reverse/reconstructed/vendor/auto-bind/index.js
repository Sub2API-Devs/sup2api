/**
 * auto-bind/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: auto-bind@5.0.1
 * pieces: chunk-2avr6cej.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-2avr6cej.js:144801-144945 esm-fingerprint
var getAllProperties = (object) => {
  let properties = new Set();
  do for (let key of Reflect.ownKeys(object)) properties.add([object, key]);
  while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);
  return properties;
};
//@ chunk-2avr6cej.js:144945-145284 esm-fingerprint
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
