/**
 * lodash-es/_isIterateeCall.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import {
  isObjectAlias,
  isArrayLikeAlias,
  isIndexAlias,
  eqAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-dcmhvw5a.js:143558-143700 placement
function isIterateeCall(value, index, object) {
  if (!isObjectAlias(object)) return false;
  var type = typeof index;
  if (
    type == "number"
      ? isArrayLikeAlias(object) && isIndexAlias(index, object.length)
      : type == "string" && index in object
  )
    return eqAlias(object[index], value);
  return false;
}
export { isIterateeCall };
