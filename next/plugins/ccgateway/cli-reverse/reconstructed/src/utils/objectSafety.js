/**
 * utils/objectSafety.ts
 *
 * 2.1.316 新增：去掉危险键并返回数量；对象图中是否含 __proto__ 等危险键等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (4)
 * attribution: placement 4
 */

//@ chunk-dcmhvw5a.js:203861-203960 placement
/**
 * 定义可枚举可写属性。
 */
function defineOwnProperty(object, trackingPath, value) {
  Object.defineProperty(object, trackingPath, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
//@ chunk-dcmhvw5a.js:203960-204245 placement
/**
 * 对象图中是否含 __proto__ 等危险键。
 */
function hasProtoKeys(value) {
  if (typeof value !== "object" || value === null) return false;
  let seen = new Set([value]);
  let stack = [value];
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    if (Object.hasOwn(current, "__proto__")) return true;
    for (let child of Array.isArray(current) ? current : Object.values(current))
      if (typeof child === "object" && child !== null && !seen.has(child)) {
        seen.add(child);
        stack.push(child);
      }
  }
  return false;
}
//@ chunk-dcmhvw5a.js:204245-204705 placement
/**
 * 去掉危险键并返回数量。
 */
function stripProtoKeys(value) {
  if (!hasProtoKeys(value))
    return {
      stripped: value,
      count: 0,
    };
  let count = 0;
  let clones = new Map();
  let pending = [];
  let clone = (input) => {
    if (typeof input !== "object" || input === null) return input;
    let clone = clones.get(input);
    if (clone === undefined) {
      clone = Array.isArray(input) ? [] : {};
      clones.set(input, clone);
      pending.push([input, clone]);
    }
    return clone;
  };
  let stripped = clone(value);
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    let [source, target] = next;
    if (Array.isArray(source) && Array.isArray(target)) {
      for (let item of source) target.push(clone(item));
      continue;
    }
    for (let [key, value] of Object.entries(source))
      if (key === "__proto__") count++;
      else Reflect.set(target, key, clone(value));
  }
  return {
    stripped,
    count,
  };
}
//@ chunk-dcmhvw5a.js:204705-204760 placement
/**
 * 仅取自有属性。
 */
function getOwn(object, key) {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}
export { getOwn, defineOwnProperty, hasProtoKeys, stripProtoKeys };
