/**
 * skills/skillPropertyGetters.ts
 *
 * 2.1.316 新增：技能属性读取（策略闸门等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c68nbje9.js (3)
 * attribution: placement 3
 */

//@ chunk-c68nbje9.js:191-308 placement
/**
 * 定义惰性 getter 属性。
 */
function defineLazyGetter(target, key, getter) {
  if (typeof getter !== "function") return;
  Object.defineProperty(target, key, {
    get: getter,
    enumerable: true,
    configurable: true,
  });
}
//@ chunk-c68nbje9.js:308-425 placement
/**
 * 定义惰性 getter 属性（另一份）。
 */
function defineLazyGetterAlt(target, key, disableModelInvocation) {
  if (typeof disableModelInvocation !== "function") return;
  Object.defineProperty(target, key, {
    get: disableModelInvocation,
    enumerable: true,
    configurable: true,
  });
}
//@ chunk-c68nbje9.js:425-551 placement
/**
 * 定义 policyGate getter。
 */
function definePolicyGate(target, policyGate) {
  if (typeof policyGate !== "function") return;
  Object.defineProperty(target, "policyGate", {
    get: policyGate,
    enumerable: true,
    configurable: true,
  });
}
export { defineLazyGetter, defineLazyGetterAlt, definePolicyGate };
