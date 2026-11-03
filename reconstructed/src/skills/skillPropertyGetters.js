/**
 * skills/skillPropertyGetters.ts
 *
 * 2.1.316 新增：技能属性读取（策略闸门等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vkkcvt15.js (3)
 * attribution: placement 3
 */

/**
 * 定义惰性 getter 属性。
 */
//@ chunk-vkkcvt15.js:191-308 placement
function defineLazyGetter(n, e, t) {
  if (typeof t !== "function") return;
  Object.defineProperty(n, e, { get: t, enumerable: !0, configurable: !0 });
}
/**
 * 定义惰性 getter 属性（另一份）。
 */
//@ chunk-vkkcvt15.js:308-425 placement
function defineLazyGetterAlt(n, e, t) {
  if (typeof t !== "function") return;
  Object.defineProperty(n, e, { get: t, enumerable: !0, configurable: !0 });
}
/**
 * 定义 policyGate getter。
 */
//@ chunk-vkkcvt15.js:425-551 placement
function definePolicyGate(n, e) {
  if (typeof e !== "function") return;
  Object.defineProperty(n, "policyGate", { get: e, enumerable: !0, configurable: !0 });
}

export { defineLazyGetter, defineLazyGetterAlt, definePolicyGate };
