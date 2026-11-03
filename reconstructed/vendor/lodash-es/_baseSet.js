/**
 * lodash-es/_baseSet.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import {
  RR,
  Qve,
  Ihe,
  Put,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { assignValueIfDifferent } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-3a1caa6f.js:1241-1536 placement
function baseSet(object, path, value, customizer) {
  if (!RR(object)) return object;
  path = Qve(path, object);
  var index = -1;
  var length = path.length;
  var lastIndex = length - 1;
  var nested = object;
  while (nested != null && ++index < length) {
    var key = Ihe(path[index]);
    var newValue = value;
    if (key === "__proto__" || key === "constructor" || key === "prototype") return object;
    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined) newValue = RR(objValue) ? objValue : Put(path[index + 1]) ? [] : {};
    }
    assignValueIfDifferent(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}
export { baseSet };
