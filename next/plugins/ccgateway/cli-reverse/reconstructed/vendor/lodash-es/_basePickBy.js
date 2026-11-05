/**
 * lodash-es/_basePickBy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-j7eg9eb6.js (1)
 * attribution: placement 1
 */
import {
  baseGetAlias,
  castPathAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { setValueRaw } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-j7eg9eb6.js:1356-1469 placement
function basePickBy(object, paths, predicate) {
  var index = -1;
  var length = paths.length;
  var result = {};
  while (++index < length) {
    var path = paths[index];
    var value = baseGetAlias(object, path);
    if (predicate(value, path)) setValueRaw(result, castPathAlias(path, object), value);
  }
  return result;
}
export { basePickBy };
