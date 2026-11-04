/**
 * lodash-es/_baseAssignValue.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import { definePropertyFn } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-3a1caa6f.js:499-613 placement
function baseAssignValue(object, key, value) {
  if (key == "__proto__" && definePropertyFn)
    definePropertyFn(object, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
  else object[key] = value;
}
export { baseAssignValue };
