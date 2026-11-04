/**
 * utils/hooks/functionHookNoop.ts
 *
 * 2.1.316 新增：函数钩子空实现。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ekmgp3zh.js (1)
 * attribution: placement 1
 */

//@ chunk-ekmgp3zh.js:191-408 placement
var NOOP_FUNCTION_HOOK_REGISTRY = {
  skillDraws() {
    return;
  },
  add() {},
  addFunctionHook(event, matcher, callback, source, options, extra) {
    return extra?.id ?? "function-hook-noop";
  },
  remove() {},
  clear() {},
  get() {
    return new Map();
  },
  getFunctionHooks() {
    return new Map();
  },
  getEntry() {
    return;
  },
  has() {
    return false;
  },
};
export { NOOP_FUNCTION_HOOK_REGISTRY };
