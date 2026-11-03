/**
 * plugins/functionHooks/sites/classicHookIds.ts
 *
 * 经典钩子（PreToolUse 等）与 tool.check 站点 id 映射（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5prdqx1m.js (5)
 * attribution: placement 5
 */

//@ chunk-5prdqx1m.js:191-362 placement
var regExp = new RegExp("^(?:settings|(?:plugin|skill)(?::[A-Za-z0-9][A-Za-z0-9._-]{0,63})?)$"),
  regExp_2 = new RegExp("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$");
//@ chunk-5prdqx1m.js:362-425 placement
function sjn(n) {
  return typeof n === "string" && regExp.test(n) ? n : void 0;
}
//@ chunk-5prdqx1m.js:425-488 placement
function ijn(n) {
  return typeof n === "string" && regExp_2.test(n) ? n : void 0;
}
//@ chunk-5prdqx1m.js:488-594 placement
function classicPreToolUseHookId(n, e) {
  if (n === `PreToolUse:${e}`) return "PreToolUse";
  return n === "tool.check" ? "tool.check" : void 0;
}
//@ chunk-5prdqx1m.js:594-661 placement
function MLs(n) {
  return n === "PreToolUse" || n === "tool.check" ? n : void 0;
}

export { classicPreToolUseHookId, sjn, ijn, MLs };
