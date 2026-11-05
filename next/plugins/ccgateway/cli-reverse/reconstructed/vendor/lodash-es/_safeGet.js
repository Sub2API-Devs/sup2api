/**
 * lodash-es/_safeGet.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z20c443b.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-z20c443b.js:142857-142965 placement
function safeGet(object, key) {
  if (key === "constructor" && typeof object[key] === "function") return;
  if (key == "__proto__") return;
  return object[key];
}
export { safeGet };
