/**
 * lodash-es/_safeGet.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */

//@ chunk-dcmhvw5a.js:142711-142819 placement
function safeGet(e, n) {
  if (n === "constructor" && typeof e[n] === "function") return;
  if (n == "__proto__") return;
  return e[n];
}

export { safeGet };
