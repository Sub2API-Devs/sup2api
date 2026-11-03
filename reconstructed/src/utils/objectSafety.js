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

/**
 * 定义可枚举可写属性。
 */
//@ chunk-dcmhvw5a.js:203861-203960 placement
function defineOwnProperty(e, n, r) {
  Object.defineProperty(e, n, { value: r, enumerable: !0, writable: !0, configurable: !0 });
}
/**
 * 对象图中是否含 __proto__ 等危险键。
 */
//@ chunk-dcmhvw5a.js:203960-204245 placement
function hasProtoKeys(e) {
  if (typeof e !== "object" || e === null) return !1;
  let n = new Set([e]),
    r = [e];
  for (let s = r.pop(); s !== void 0; s = r.pop()) {
    if (Object.hasOwn(s, "__proto__")) return !0;
    for (let a of Array.isArray(s) ? s : Object.values(s))
      if (typeof a === "object" && a !== null && !n.has(a)) (n.add(a), r.push(a));
  }
  return !1;
}
/**
 * 去掉危险键并返回数量。
 */
//@ chunk-dcmhvw5a.js:204245-204705 placement
function stripProtoKeys(e) {
  if (!hasProtoKeys(e)) return { stripped: e, count: 0 };
  let n = 0,
    r = new Map(),
    s = [],
    a = (g) => {
      if (typeof g !== "object" || g === null) return g;
      let m = r.get(g);
      if (m === void 0) ((m = Array.isArray(g) ? [] : {}), r.set(g, m), s.push([g, m]));
      return m;
    },
    c = a(e);
  for (let g = s.pop(); g !== void 0; g = s.pop()) {
    let [m, f] = g;
    if (Array.isArray(m) && Array.isArray(f)) {
      for (let h of m) f.push(a(h));
      continue;
    }
    for (let [h, y] of Object.entries(m))
      if (h === "__proto__") n++;
      else Reflect.set(f, h, a(y));
  }
  return { stripped: c, count: n };
}
/**
 * 仅取自有属性。
 */
//@ chunk-dcmhvw5a.js:204705-204760 placement
function getOwn(e, n) {
  return Object.hasOwn(e, n) ? e[n] : void 0;
}

export { getOwn, defineOwnProperty, hasProtoKeys, stripProtoKeys };
