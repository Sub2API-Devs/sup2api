/**
 * utils/safeObject.ts
 *
 * 2.1.316 新增。安全对象。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zks0j6kf.js (1)
 * attribution: placement 1
 */

/**
 * 复制对象并去掉 undefined 值，__proto__ 键以自有属性写入（防原型污染）。
 */
//@ chunk-zks0j6kf.js:191-392 placement
function compactEnvObject(t) {
  let e = {};
  for (let [n, r] of Object.entries(t)) {
    if (r === void 0) continue;
    if (n === "__proto__")
      Object.defineProperty(e, n, { value: r, writable: !0, enumerable: !0, configurable: !0 });
    else e[n] = r;
  }
  return e;
}

export { compactEnvObject };
