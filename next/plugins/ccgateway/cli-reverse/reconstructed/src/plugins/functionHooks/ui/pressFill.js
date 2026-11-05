/**
 * plugins/functionHooks/ui/pressFill.ts
 *
 * ui.press 填充遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (8)
 * attribution: placement 8
 */
import { AsyncLocalStorage } from "async_hooks";
import { isDeepStrictEqual } from "util";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:516178-516274 placement
/**
 * 取某环境的按键
 */
function pressForEnv(keptPresses, pressing, environmentId) {
  let entry = pressing === undefined ? undefined : keptPresses.get(pressing);
  return entry?.environmentId === environmentId ? entry.press : undefined;
}
//@ chunk-7jxyna5q.js:516274-516344 placement
/**
 * 清掉某环境的按键记录
 */
function dropEnvPresses(keptPresses, environmentId) {
  for (let [pressId, entry] of keptPresses)
    if (entry.environmentId === environmentId) keptPresses.delete(pressId);
}
//@ chunk-7jxyna5q.js:516393-516408 placement
/**
 * 按键上下文 ALS
 */
var pressContextStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:516393", () => {
  pressContextStore = new AsyncLocalStorage();
});
//@ chunk-7jxyna5q.js:516408-516512 placement
/**
 * 若在按键上下文中，记录某分发对应的按键（尚未作答）。
 */
function notePressDispatch(keptPresses, pressId, environmentId) {
  let press = pressContextStore.getStore();
  if (press !== undefined)
    keptPresses.set(pressId, {
      environmentId,
      press,
      isAnswered: false,
    });
}
//@ chunk-7jxyna5q.js:516512-516569 placement
/**
 * 取分发对应的按键 id
 */
function pressIdOf(answersPress, clientId) {
  return answersPress?.clientId === clientId ? answersPress.pressId : undefined;
}
//@ chunk-7jxyna5q.js:516569-516805 placement
/**
 * 标记某分发的按键已作答，并删除同环境中更早的已作答记录。
 */
function markPressAnswered(keptPresses, pressId) {
  let entry = keptPresses.get(pressId);
  if (entry === undefined) return;
  keptPresses.set(pressId, {
    ...entry,
    isAnswered: true,
  });
  let mapped = [...keptPresses]
    .filter(([, answered]) => answered.isAnswered && answered.environmentId === entry.environmentId)
    .map(([id]) => id);
  let max = Math.max(...mapped);
  for (let id of mapped.filter((older) => older < max)) keptPresses.delete(id);
}
//@ chunk-7jxyna5q.js:516805-517009 placement
/**
 * （归属疑误：插件函数 hooks）取 press 填充并记录 plugin_function_hooks_press_fill 结果。
 */
function logPressFill(answersPress, clientId) {
  let pressId = pressIdOf(answersPress, clientId);
  if (pressId !== undefined) logFeatureOk("plugin_function_hooks_press_fill");
  if (answersPress !== undefined && pressId === undefined)
    logFeatureSad(
      "plugin_function_hooks_press_fill",
      answersPress.clientId === undefined ? "no_client" : "other_client",
    );
  return pressId;
}
//@ chunk-7jxyna5q.js:517051-517134 placement
/**
 * 包装按键上下文
 */
var withPressContext = (pagePress, uiPressEvent, pressHandler) => ({
  ...pressHandler,
  run: (request, ...rest) =>
    pressContextStore.run(isDeepStrictEqual(request, uiPressEvent) ? pagePress : undefined, () =>
      pressHandler.run(request, ...rest),
    ),
});
export {
  logPressFill,
  pressForEnv,
  dropEnvPresses,
  notePressDispatch,
  pressContextStore,
  markPressAnswered,
  withPressContext,
};
