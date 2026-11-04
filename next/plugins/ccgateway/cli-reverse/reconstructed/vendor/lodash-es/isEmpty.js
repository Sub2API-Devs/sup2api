/**
 * lodash-es/isEmpty.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-wy9dbk5f.js (1)
 * attribution: placement 1
 */
import {
  isArrayLikeAlias,
  isBufferDefault,
  baseIsTypedArrayAlias,
  baseIsArgumentsAlias,
  getTag,
  baseKeysAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isArrayAlias } from "./toString.js";
import { MAP_TAG, SET_TAG, hasOwnProperty } from "../../src/services/mcpServe/callUtils.js";
import { isPrototype_default } from "./_isPrototype.js";

//@ chunk-wy9dbk5f.js:17789-18055 placement
/**
 * lodash isEmpty：null、空数组/字符串/arguments、空 Map/Set、无自有属性的对象为空。
 */
function isEmpty_2(value) {
  if (value == null) return true;
  if (
    isArrayLikeAlias(value) &&
    (isArrayAlias(value) ||
      typeof value == "string" ||
      typeof value.splice == "function" ||
      isBufferDefault(value) ||
      baseIsTypedArrayAlias(value) ||
      baseIsArgumentsAlias(value))
  )
    return !value.length;
  var tag = getTag(value);
  if (tag == MAP_TAG || tag == SET_TAG) return !value.size;
  if (isPrototype_default(value)) return !baseKeysAlias(value).length;
  for (var key in value) if (hasOwnProperty.call(value, key)) return false;
  return true;
}
export { isEmpty_2 };
