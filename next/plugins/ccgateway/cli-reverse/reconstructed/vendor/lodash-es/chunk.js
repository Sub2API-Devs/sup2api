/**
 * lodash-es/chunk.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-e6mjh4ff.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isIterateeCall_2 } from "./_mergeWithFamily.js";
import { toInteger_default } from "./toInteger.js";
import { baseSliceAlias } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-e6mjh4ff.js:269-292 placement
var { ceil: nativeCeil, max: nativeMax } = Math;
//@ chunk-e6mjh4ff.js:292-473 placement
function chunk(array, size, guard) {
  if (guard ? isIterateeCall_2(array, size, guard) : size === undefined) size = 1;
  else size = nativeMax(toInteger_default(size), 0);
  var length = array == null ? 0 : array.length;
  if (!length || size < 1) return [];
  var index = 0;
  var resIndex = 0;
  var result = Array(nativeCeil(length / size));
  while (index < length) result[resIndex++] = baseSliceAlias(array, index, (index += size));
  return result;
}
//@ chunk-e6mjh4ff.js:473-483 placement
var chunk_default = chunk;
export { chunk_default };
