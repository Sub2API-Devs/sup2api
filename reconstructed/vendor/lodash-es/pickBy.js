/**
 * lodash-es/pickBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import { s9e } from "./toString.js";
import { allKeysIn, pickByBase } from "../../src/utils/git/gitSafeEnv.js";
import { nz } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-3a1caa6f.js:1667-1800 placement
function pickBy(object, predicate) {
  if (object == null) return {};
  var props = s9e(allKeysIn(object), function (prop) {
    return [prop];
  });
  predicate = nz(predicate);
  return pickByBase(object, props, function (value, path) {
    return predicate(value, path[0]);
  });
}
export { pickBy };
