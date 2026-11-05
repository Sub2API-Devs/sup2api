/**
 * lodash-es/_baseKeysIn.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-j7eg9eb6.js (1)
 * attribution: placement 1
 */
import { isObjectAlias } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { keysInOf, hasOwnProperty_2 } from "../../src/utils/git/gitSafeEnv.js";
import { isPrototype_default } from "./_isPrototype.js";

//@ chunk-j7eg9eb6.js:704-834 placement
function baseKeysIn(object) {
  if (!isObjectAlias(object)) return keysInOf(object);
  var isProto = isPrototype_default(object);
  var result = [];
  for (var key in object)
    if (!(key == "constructor" && (isProto || !hasOwnProperty_2.call(object, key)))) result.push(key);
  return result;
}
export { baseKeysIn };
