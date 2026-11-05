/**
 * tools/REPLTool/serialization.ts
 *
 * 值的可 JSON 化判定与冻结副本登记（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (6)
 * attribution: placement 6
 */
import { types } from "util";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n51jggtb.js:86376-86395 placement
/**
 * 保存可序列化副本的 WeakMap。
 */
var weakMap_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n51jggtb.js:86376", () => {
  weakMap_2 = new WeakMap();
});
//@ chunk-n51jggtb.js:86395-86472 placement
/**
 * 建立冻结的空原型副本并登记。
 */
function freezePayload(payload) {
  let token = Object.freeze(Object.create(null));
  weakMap_2.set(token, payload);
  return token;
}
//@ chunk-n51jggtb.js:86472-86504 placement
/**
 * 取出登记过的副本。
 */
function payloadOf(token) {
  return weakMap_2.get(token);
}
//@ chunk-n51jggtb.js:86504-86718 placement
/**
 * 判断值里是否有超过上限的数组。
 */
function isTooDeepOrLarge(value) {
  let stack = [value];
  while (stack.length > 0) {
    let node = stack.pop();
    if (Array.isArray(node)) {
      if (node.length > CLONE_DEPTH_THRESHOLD) return true;
      for (let item of node) stack.push(item);
    } else if (node !== null && typeof node === "object")
      for (let child of Object.values(node)) stack.push(child);
  }
  return false;
}
//@ chunk-n51jggtb.js:86718-86751 placement
/**
 * 可序列化判定的规模阈值。
 */
var MAX_VISITED_NODES = 200000;
var MAX_JSON_TEXT_BYTES = 16777216;
var MAX_OBJECT_DEPTH = 100;
//@ chunk-n51jggtb.js:86751-87732 placement
/**
 * 判定值能否安全写成 JSON（原型、访问器、循环、bigint、键数等），能则返回序列化串。
 */
function cloneSafelyForHooks(value) {
  let tooLongArray = false;
  let visited = 0;
  let stringBytes = 0;
  let seen = new Set();
  let stack = [value];
  let depthStack = [0];
  while (stack.length > 0) {
    if (++visited > MAX_VISITED_NODES || stringBytes > MAX_JSON_TEXT_BYTES) return;
    let node = stack.pop();
    let depth = depthStack.pop();
    if (node === null || typeof node === "boolean") continue;
    if (typeof node === "string") {
      stringBytes += node.length;
      continue;
    }
    if (typeof node === "number") {
      if (!Number.isFinite(node) || Object.is(node, -0)) return;
      continue;
    }
    if (typeof node !== "object" || isUntrustedObject(node) || seen.has(node) || depth >= MAX_OBJECT_DEPTH)
      return;
    seen.add(node);
    let isArray = Array.isArray(node);
    if (
      Object.getPrototypeOf(node) !== (isArray ? Array.prototype : Object.prototype) ||
      types.isBoxedPrimitive(node) ||
      "toJSON" in node
    )
      return;
    let restBudget = MAX_VISITED_NODES - visited - stack.length;
    if (isArray && node.length > restBudget) return;
    let keys = Object.keys(node);
    if (keys.length > restBudget || Reflect.ownKeys(node).length !== keys.length + (isArray ? 1 : 0)) return;
    if (isArray) {
      if (keys.length !== node.length || (keys.length > 0 && keys.at(-1) !== String(keys.length - 1))) return;
      tooLongArray ||= node.length > CLONE_DEPTH_THRESHOLD;
    }
    for (let key of keys) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(node, key);
      if (ownPropertyDescriptor === undefined || !("value" in ownPropertyDescriptor)) return;
      if (ownPropertyDescriptor.value === undefined) {
        if (isArray) return;
        continue;
      }
      if (!isArray) stringBytes += key.length;
      stack.push(ownPropertyDescriptor.value);
      depthStack.push(depth + 1);
    }
  }
  if (!tooLongArray || stringBytes > MAX_JSON_TEXT_BYTES) return;
  try {
    let json = jsonStringify(value);
    return json.length > MAX_JSON_TEXT_BYTES ? undefined : json;
  } catch (error) {
    logError(error);
    return;
  }
}
export { isTooDeepOrLarge, cloneSafelyForHooks, freezePayload, payloadOf };
