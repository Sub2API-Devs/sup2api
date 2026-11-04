/**
 * services/mcpServe/callUtils.ts
 *
 * 2.1.316 新增：mcp serve 调用工具函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (4)
 * attribution: placement 4
 */
import { isEmpty_2 } from "../../../vendor/lodash-es/isEmpty.js";

//@ chunk-wy9dbk5f.js:17708-17789 placement
/**
 * Object.prototype 引用。
 */
var MAP_TAG = "[object Map]";
var SET_TAG = "[object Set]";
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
//@ chunk-wy9dbk5f.js:18055-18065 placement
/**
 * 判断值是否为空（lodash isEmpty）。
 */
var isEmpty = isEmpty_2;
//@ chunk-wy9dbk5f.js:18065-18098 placement
/**
 * 判断值是否为 undefined。
 */
function isUndefined(value) {
  return value === undefined;
}
//@ chunk-wy9dbk5f.js:18098-18108 placement
/**
 * un 的别名。
 */
var isUndefinedAlias = isUndefined;
export { MAP_TAG, SET_TAG, hasOwnProperty, isUndefinedAlias, isEmpty };
