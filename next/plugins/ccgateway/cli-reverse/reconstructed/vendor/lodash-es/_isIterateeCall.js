/**
 * lodash-es/_isIterateeCall.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-z20c443b.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isObjectAlias,
  isArrayLikeAlias,
  isIndexAlias,
  eqAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-z20c443b.js:143706-143848 placement
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
