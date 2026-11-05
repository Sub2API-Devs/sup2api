/**
 * utils/hooks/hookRunContext.ts
 *
 * 记录本轮是否出现过可外部运行的 hook（callback/function 之外的 aSetHook 标记）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nt9amew5.js (3)
 * attribution: placement 3
 */
import { identity } from "../identity.js";

//@ chunk-nt9amew5.js:16303-16349 placement
var hookState = identity(
  {
    aSetHook: false,
  },
  (state) => {
    state.aSetHook = false;
  },
);
//@ chunk-nt9amew5.js:16349-16491 placement
/**
 * 按本批 hook 打出“存在可外部运行的 hook”标记（callback/function 之外或有插件根/设备转发）。
 */
function noteHooks(hooks) {
  hookState.aSetHook ||= hooks.some(
    ({ hook, pluginRoot, deviceForwarded }) =>
      (hook.type !== "callback" && hook.type !== "function") ||
      pluginRoot !== undefined ||
      deviceForwarded === true,
  );
}
//@ chunk-nt9amew5.js:16491-16525 placement
/**
 * 本轮是否出现过可外部运行的 hook。
 */
function hasSetHook() {
  return hookState.aSetHook;
}
export { noteHooks, hasSetHook };
