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

//@ chunk-vkkcvt15.js:191-308 placement
/**
 * 定义惰性 getter 属性。
 */
function defineLazyGetter(n, e, t) {
  if (typeof t !== "function") return;
  Object.defineProperty(n, e, {
    get: t,
    enumerable: true,
    configurable: true,
  });
}
//@ chunk-vkkcvt15.js:308-425 placement
/**
 * 定义惰性 getter 属性（另一份）。
 */
function defineLazyGetterAlt(n, e, disableModelInvocation) {
  if (typeof disableModelInvocation !== "function") return;
  Object.defineProperty(n, e, {
    get: disableModelInvocation,
    enumerable: true,
    configurable: true,
  });
}
//@ chunk-vkkcvt15.js:425-551 placement
/**
 * 定义 policyGate getter。
 */
function definePolicyGate(n, policyGate) {
  if (typeof policyGate !== "function") return;
  Object.defineProperty(n, "policyGate", {
    get: policyGate,
    enumerable: true,
    configurable: true,
  });
}
export { defineLazyGetter, defineLazyGetterAlt, definePolicyGate };
