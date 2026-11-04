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
var regExp = new RegExp("^(?:settings|(?:plugin|skill)(?::[A-Za-z0-9][A-Za-z0-9._-]{0,63})?)$");
var regExp_2 = new RegExp("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$");
//@ chunk-5prdqx1m.js:362-425 placement
/**
 * 经典 PreToolUse id
 */
function classicPreToolUseHookId(hookSource) {
  return typeof hookSource === "string" && regExp.test(hookSource) ? hookSource : undefined;
}
//@ chunk-5prdqx1m.js:425-488 placement
/**
 * 经典钩子 id
 */
function classicHookId(hookPluginId) {
  return typeof hookPluginId === "string" && regExp_2.test(hookPluginId) ? hookPluginId : undefined;
}
//@ chunk-5prdqx1m.js:488-594 placement
function classicPreToolUseHookId_2(hookName, name) {
  if (hookName === `PreToolUse:${name}`) return "PreToolUse";
  return hookName === "tool.check" ? "tool.check" : undefined;
}
//@ chunk-5prdqx1m.js:594-661 placement
/**
 * PreToolUse 或 tool.check
 */
function toolCheckHookId(hookName) {
  return hookName === "PreToolUse" || hookName === "tool.check" ? hookName : undefined;
}
export { classicPreToolUseHookId_2, classicPreToolUseHookId, classicHookId, toolCheckHookId };
