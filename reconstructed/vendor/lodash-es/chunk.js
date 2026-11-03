/**
 * lodash-es/chunk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-chabsk0s.js (3)
 * attribution: placement 3
 */
import { isIterateeCall_2 } from "../../src/utils/settings/settingsSourceTrust.js";
import { toInteger_default } from "./toInteger.js";
import { SJt } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-chabsk0s.js:269-292 placement
var { ceil: nativeCeil, max: nativeMax } = Math;
//@ chunk-chabsk0s.js:292-473 placement
function chunk(array, size, guard) {
  if (guard ? isIterateeCall_2(array, size, guard) : size === undefined) size = 1;
  else size = nativeMax(toInteger_default(size), 0);
  var length = array == null ? 0 : array.length;
  if (!length || size < 1) return [];
  var index = 0;
  var resIndex = 0;
  var result = Array(nativeCeil(length / size));
  while (index < length) result[resIndex++] = SJt(array, index, (index += size));
  return result;
}
//@ chunk-chabsk0s.js:473-483 placement
var chunk_default = chunk;
export { chunk_default };
