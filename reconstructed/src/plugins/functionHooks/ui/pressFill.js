/**
 * plugins/functionHooks/ui/pressFill.ts
 *
 * ui.press 填充遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import { AsyncLocalStorage } from "async_hooks";
import { isDeepStrictEqual } from "util";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-s61vbvea.js:598779-598875 placement
/**
 * 取某环境的按键
 */
function pressForEnv(keptPresses, pressing, environmentId) {
  let s = pressing === undefined ? undefined : keptPresses.get(pressing);
  return s?.environmentId === environmentId ? s.press : undefined;
}
//@ chunk-s61vbvea.js:598875-598945 placement
/**
 * 清掉某环境的按键记录
 */
function dropEnvPresses(keptPresses, n) {
  for (let [r, s] of keptPresses) if (s.environmentId === n) keptPresses.delete(r);
}
//@ chunk-s61vbvea.js:598994-599009 placement
/**
 * 按键上下文 ALS
 */
var pressContextStore = new AsyncLocalStorage();
//@ chunk-s61vbvea.js:599009-599113 placement
/**
 * 若在按键上下文中，记录某分发对应的按键（尚未作答）。
 */
function notePressDispatch(keptPresses, n, environmentId) {
  let s = pressContextStore.getStore();
  if (s !== undefined)
    keptPresses.set(n, {
      environmentId,
      press: s,
      isAnswered: false,
    });
}
//@ chunk-s61vbvea.js:599113-599170 placement
/**
 * 取分发对应的按键 id
 */
function pressIdOf(e, n) {
  return e?.clientId === n ? e.pressId : undefined;
}
//@ chunk-s61vbvea.js:599170-599406 placement
/**
 * 标记某分发的按键已作答，并删除同环境中更早的已作答记录。
 */
function markPressAnswered(keptPresses, n) {
  let r = keptPresses.get(n);
  if (r === undefined) return;
  keptPresses.set(n, {
    ...r,
    isAnswered: true,
  });
  let mapped = [...keptPresses]
    .filter(([, y]) => y.isAnswered && y.environmentId === r.environmentId)
    .map(([y]) => y);
  let max = Math.max(...mapped);
  for (let y of mapped.filter((S) => S < max)) keptPresses.delete(y);
}
//@ chunk-s61vbvea.js:599406-599610 placement
/**
 * （归属疑误：插件函数 hooks）取 press 填充并记录 plugin_function_hooks_press_fill 结果。
 */
function logPressFill(answersPress, clientId) {
  let r = pressIdOf(answersPress, clientId);
  if (r !== undefined) logFeatureOk("plugin_function_hooks_press_fill");
  if (answersPress !== undefined && r === undefined)
    logFeatureSad(
      "plugin_function_hooks_press_fill",
      answersPress.clientId === undefined ? "no_client" : "other_client",
    );
  return r;
}
//@ chunk-s61vbvea.js:599652-599735 placement
/**
 * 包装按键上下文
 */
var withPressContext = (pagePress, uiPressEvent, pressHandler) => ({
  ...pressHandler,
  run: (s, ...h) =>
    pressContextStore.run(isDeepStrictEqual(s, uiPressEvent) ? pagePress : undefined, () =>
      pressHandler.run(s, ...h),
    ),
});
export {
  pressForEnv,
  logPressFill,
  dropEnvPresses,
  notePressDispatch,
  pressContextStore,
  markPressAnswered,
  withPressContext,
};
