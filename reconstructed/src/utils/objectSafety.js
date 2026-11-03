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
function defineOwnProperty(e, trackingPath, value) {
  Object.defineProperty(e, trackingPath, {
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
function hasProtoKeys(e) {
  if (typeof e !== "object" || e === null) return false;
  let n = new Set([e]);
  let r = [e];
  for (let s = r.pop(); s !== undefined; s = r.pop()) {
    if (Object.hasOwn(s, "__proto__")) return true;
    for (let a of Array.isArray(s) ? s : Object.values(s))
      if (typeof a === "object" && a !== null && !n.has(a)) {
        n.add(a);
        r.push(a);
      }
  }
  return false;
}
//@ chunk-dcmhvw5a.js:204245-204705 placement
/**
 * 去掉危险键并返回数量。
 */
function stripProtoKeys(e) {
  if (!hasProtoKeys(e))
    return {
      stripped: e,
      count: 0,
    };
  let n = 0;
  let r = new Map();
  let s = [];
  let a = (g) => {
    if (typeof g !== "object" || g === null) return g;
    let m = r.get(g);
    if (m === undefined) {
      m = Array.isArray(g) ? [] : {};
      r.set(g, m);
      s.push([g, m]);
    }
    return m;
  };
  let stripped = a(e);
  for (let g = s.pop(); g !== undefined; g = s.pop()) {
    let [m, f] = g;
    if (Array.isArray(m) && Array.isArray(f)) {
      for (let h of m) f.push(a(h));
      continue;
    }
    for (let [key, value] of Object.entries(m))
      if (key === "__proto__") n++;
      else Reflect.set(f, key, a(value));
  }
  return {
    stripped,
    count: n,
  };
}
//@ chunk-dcmhvw5a.js:204705-204760 placement
/**
 * 仅取自有属性。
 */
function getOwn(e, n) {
  return Object.hasOwn(e, n) ? e[n] : undefined;
}
export { getOwn, defineOwnProperty, hasProtoKeys, stripProtoKeys };
