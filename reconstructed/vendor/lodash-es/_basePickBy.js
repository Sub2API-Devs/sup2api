/**
 * lodash-es/_basePickBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import {
  baseGetAlias,
  castPathAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { setValueRaw } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-3a1caa6f.js:1544-1657 placement
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
