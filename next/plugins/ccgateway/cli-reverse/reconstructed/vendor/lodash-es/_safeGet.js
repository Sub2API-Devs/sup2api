/**
 * lodash-es/_safeGet.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z20c443b.js (1)
 * attribution: placement 1
 */

//@ chunk-z20c443b.js:142857-142965 placement
function safeGet(object, key) {
  if (key === "constructor" && typeof object[key] === "function") return;
  if (key == "__proto__") return;
  return object[key];
}
export { safeGet };
