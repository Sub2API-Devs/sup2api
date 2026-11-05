/**
 * services/mcpServe/callUtils.ts
 *
 * 2.1.316 新增：mcp serve 调用工具函数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9gx98mbf.js (2), chunk-xrwmcqkn.js (2)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEmpty_2 } from "../../../vendor/lodash-es/isEmpty.js";

//@ chunk-9gx98mbf.js:288-364 placement
/**
 * Object.prototype 引用。
 */
var MAP_TAG = "[object Map]";
var SET_TAG = "[object Set]";
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
//@ chunk-9gx98mbf.js:626-636 placement
/**
 * 判断值是否为空（lodash isEmpty）。
 */
var isEmpty = isEmpty_2;
//@ chunk-xrwmcqkn.js:18905-18938 placement
/**
 * 判断值是否为 undefined。
 */
function isUndefined(value) {
  return value === undefined;
}
//@ chunk-xrwmcqkn.js:18938-18948 placement
/**
 * un 的别名。
 */
var isUndefinedAlias = isUndefined;
export { isEmpty, MAP_TAG, SET_TAG, hasOwnProperty, isUndefinedAlias };
