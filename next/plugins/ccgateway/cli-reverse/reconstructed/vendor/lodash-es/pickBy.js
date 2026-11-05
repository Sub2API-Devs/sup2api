/**
 * lodash-es/pickBy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-j7eg9eb6.js (1)
 * attribution: placement 1
 */
import { import_arrayMap } from "./toString.js";
import { allKeysIn, pickByBase } from "../../src/utils/git/gitSafeEnv.js";
import { baseIterateeAlias } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-j7eg9eb6.js:1479-1612 placement
function pickBy(object, predicate) {
  if (object == null) return {};
  var props = import_arrayMap(allKeysIn(object), function (prop) {
    return [prop];
  });
  predicate = baseIterateeAlias(predicate);
  return pickByBase(object, props, function (value, path) {
    return predicate(value, path[0]);
  });
}
export { pickBy };
