/**
 * lodash-es/_safeGet.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */

//@ chunk-dcmhvw5a.js:142711-142819 placement
function safeGet(object, key) {
  if (key === "constructor" && typeof object[key] === "function") return;
  if (key == "__proto__") return;
  return object[key];
}
export { safeGet };
