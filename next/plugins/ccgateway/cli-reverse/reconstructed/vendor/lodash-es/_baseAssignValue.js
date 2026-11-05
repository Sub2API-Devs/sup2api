/**
 * lodash-es/_baseAssignValue.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-p5vzmeny.js (1)
 * attribution: placement 1
 */
import { definePropertyFn } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-p5vzmeny.js:325-439 placement
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
