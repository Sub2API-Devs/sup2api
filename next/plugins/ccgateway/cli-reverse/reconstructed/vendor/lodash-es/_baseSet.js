/**
 * lodash-es/_baseSet.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-j7eg9eb6.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isObjectAlias,
  castPathAlias,
  toKeyAlias,
  isIndexAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { assignValueIfDifferent } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-j7eg9eb6.js:1053-1348 placement
function baseSet(object, path, value, customizer) {
  if (!isObjectAlias(object)) return object;
  path = castPathAlias(path, object);
  var index = -1;
  var length = path.length;
  var lastIndex = length - 1;
  var nested = object;
  while (nested != null && ++index < length) {
    var key = toKeyAlias(path[index]);
    var newValue = value;
    if (key === "__proto__" || key === "constructor" || key === "prototype") return object;
    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined)
        newValue = isObjectAlias(objValue) ? objValue : isIndexAlias(path[index + 1]) ? [] : {};
    }
    assignValueIfDifferent(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}
export { baseSet };
