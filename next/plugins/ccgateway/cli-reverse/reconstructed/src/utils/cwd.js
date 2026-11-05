/**
 * utils/cwd.ts
 *
 * 当前工作目录（getCwd）与按调用临时覆盖 cwd（runWithCwdOverride，AsyncLocalStorage）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cwd.ts
 * pieces: chunk-0993wma0.js (5), chunk-exfmq47h.js (8), chunk-gcy2kcsb.js (1), chunk-sbrfdm61.js (23), chunk-tkka6eha.js (2)
 * attribution: placement 36, callgraph-fingerprint 1, layout 1, callgraph-witnessed 1
 */
import { realpathSync } from "fs";
import { cwd } from "process";
import { AsyncLocalStorage } from "async_hooks";
import {
  isDiskless,
  setCwdState,
  getCwdState,
  getOriginalCwdOrNull,
  getOriginalCwd,
  getCloudCwd,
  onCloudCwdChange,
} from "../bootstrap/state.js";
import { realpathNativeLong, realpathNativeLongSync } from "./fsJunctions.js";
import {
  isRemoteSessionAvailable,
  remoteCallFrameStorage,
  runInRemoteCallFrameMain,
} from "../remote/remoteMode.js";
import { identity as identity_2 } from "./pathClassification.js";
import { isNoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { identity } from "./identity.js";
import { attributionKeyOrUndefined } from "./turnAttributionKey.js";
import { init_react_production, useSyncExternalStore } from "../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0993wma0.js:255-280 placement
/**
 * 原样返回输入（占位）。
 */
function identityString(path) {
  return path;
}
//@ chunk-0993wma0.js:280-305 placement
/**
 * 原样返回输入（占位，用于启动 cwd 键）。
 */
function identityPath(path) {
  return path;
}
//@ chunk-0993wma0.js:305-471 placement
/**
 * 计算启动 cwd 的规范化键（解析真实路径）。
 */
function initialCwdKey() {
  let key = "";
  if (
    typeof process !== "undefined" &&
    typeof process.cwd === "function" &&
    typeof realpathSync === "function"
  )
    try {
      let current = cwd();
      try {
        key = identityString(identityPath(current));
      } catch {
        key = identityString(current);
      }
    } catch {}
  return key;
}
//@ chunk-0993wma0.js:471-610 placement
/**
 * 进程启动时的工作目录（git-bash 或环境异常时为 null）。
 */
var INITIAL_CWD_KEY; // deferred: uses initialCwdKey of its import cycle while loading; runs once the cycle is complete
var launchedCwd;
deferInit("chunk-0993wma0.js:471", () => {
  INITIAL_CWD_KEY = initialCwdKey();
  launchedCwd = (() => {
    if (typeof process === "undefined" || typeof process.cwd !== "function") return null;
    try {
      return process.cwd();
    } catch {
      return null;
    }
  })();
});
//@ chunk-0993wma0.js:610-746 placement
/**
 * 启动时的工作目录；后台会话（CLAUDE_CODE_SESSION_KIND=bg）返回 null。
 */
function launchCwd() {
  if (launchedCwd === null) return null;
  let envClaudeCodeSessionKind = process.env.CLAUDE_CODE_SESSION_KIND;
  return envClaudeCodeSessionKind !== undefined && String(envClaudeCodeSessionKind).trim() === "bg"
    ? null
    : launchedCwd;
}
//@ chunk-sbrfdm61.js:2506-2568 placement
/**
 * 当前调用帧覆盖的 cwd。
 */
function callFrameCwd() {
  let currentCallFrame = getCurrentCallFrame();
  return currentCallFrame?.call === undefined ? undefined : currentCallFrame.cwd;
}
//@ chunk-sbrfdm61.js:2568-2610 layout
function callFramePhysicalCwd() {
  return getCurrentCallFrame()?.call?.physical;
}
//@ chunk-sbrfdm61.js:2610-2684 placement
/**
 * 判断调用帧的物理路径是否与给定值相同。
 */
function callFramePhysicalMatches(physical) {
  let frame = getCurrentCallFrame()?.call;
  return frame === undefined || (physical !== false && frame.physical === physical);
}
//@ chunk-sbrfdm61.js:2684-2771 placement
/**
 * 判断调用帧是否允许目录消失后恢复（且物理路径为空）。
 */
function callFrameRecoversIfGone() {
  let frame = getCurrentCallFrame()?.call;
  return frame?.recoversIfAlreadyGone === true && frame.physical === null;
}
//@ chunk-sbrfdm61.js:2771-2829 placement
/**
 * 异步解析真实路径（无盘会话返回 undefined）。
 */
async function realPathOutcomeAsync(path) {
  return isDiskless() ? undefined : realPathOutcome(path, await realpathNativeLong(path));
}
//@ chunk-sbrfdm61.js:2829-2875 placement
/**
 * 同步解析真实路径（无盘会话返回 undefined）。
 */
function realPathOutcomeSync(path) {
  return isDiskless() ? undefined : realPathOutcome(path, realpathNativeLongSync(path));
}
//@ chunk-sbrfdm61.js:2875-2917 placement
/**
 * 有终端时执行回调，否则走退出流程。
 */
function runOrExit(fn) {
  return isRemoteSessionAvailable() ? fn() : remoteCallFrameStorage.exit(fn);
}
//@ chunk-sbrfdm61.js:2917-2956 placement
/**
 * 基于给定（或当前）cwd 解析路径。
 */
function resolveFromCwd(cwd, fn) {
  return runInRemoteCallFrameMain(cwd ?? getCwd(), fn);
}
//@ chunk-sbrfdm61.js:2956-3007 placement
/**
 * 在给定调用帧的 cwd 下执行，没有调用帧时直接执行。
 */
function withCallFrameCwd(project, fn) {
  return project === null ? fn() : resolveFromCwd(project.cwd, fn);
}
//@ chunk-sbrfdm61.js:3007-3041 placement
/**
 * 判断是否存在最外层调用帧（区分按调用覆盖与全局 cwd）。
 */
function hasOutermostCallFrame() {
  return getOutermostCallFrame() !== undefined;
}
//@ chunk-sbrfdm61.js:3041-3200 placement
/**
 * 设置当前工作目录：在调用帧链上逐层更新 cwd（及物理路径），没有调用帧时更新全局 cwd 状态。
 */
function setCwdForCallChain(cwd) {
  let normalizedCwd = identity_2(cwd);
  let currentCallFrame = getCurrentCallFrame();
  let physical = currentCallFrame?.call === undefined ? undefined : realPathOutcomeSync(normalizedCwd);
  while (currentCallFrame?.call !== undefined) {
    currentCallFrame.cwd = normalizedCwd;
    currentCallFrame.call.physical = physical;
    currentCallFrame = skipFinishedCalls(currentCallFrame.call.outer);
  }
  if (currentCallFrame) currentCallFrame.cwd = normalizedCwd;
  else setCwdState(cwd);
}
//@ chunk-sbrfdm61.js:3200-3237 placement
/**
 * 返回当前调用帧的 cwd，否则全局 cwd 状态。
 */
function currentOrGlobalCwd() {
  return getCurrentCallFrame()?.cwd ?? getCwdState();
}
//@ chunk-sbrfdm61.js:3237-3309 placement
/**
 * 取当前工作目录，无项目目录时返回 null。
 */
function getCwdOrNull() {
  if (getCurrentCallFrame()?.cwd === undefined && getOriginalCwdOrNull() === null) return null;
  return getCwd();
}
//@ chunk-sbrfdm61.js:3309-3393 callgraph-witnessed (2.1.88 match: getCwd, 0)
/**
 * 当前工作目录：优先取按调用覆盖的 cwd（runWithCwdOverride），失败时回退会话原始 cwd；没有项目目录时原样抛出。
 */
function getCwd() {
  try {
    return currentOrGlobalCwd();
  } catch (error) {
    if (isNoProjectDirectoryError(error) && getOriginalCwdOrNull() === null) throw error;
    return getOriginalCwd();
  }
}
//@ chunk-sbrfdm61.js:3393-3438 placement
/**
 * 无盘且无调用帧时返回 undefined，否则当前 cwd。
 */
function getCwdIfAvailable() {
  return !hasOutermostCallFrame() && isRemoteSessionAvailable() ? undefined : getCwd();
}
//@ chunk-sbrfdm61.js:3438-3470 placement
/**
 * 有云端 cwd 时用它，否则保留原值。
 */
function applyCloudCwd(cwd) {
  return getCloudCwd() ?? cwd;
}
//@ chunk-sbrfdm61.js:3470-3505 placement
/**
 * 调用帧覆盖优先，否则应用云端 cwd。
 */
function cwdWithCallFrameOverride(cwd) {
  return hasOutermostCallFrame() ? cwd : applyCloudCwd(cwd);
}
//@ chunk-sbrfdm61.js:3505-3535 placement
/**
 * 返回当前生效的工作目录（含云端覆盖）。
 */
function getEffectiveCwd() {
  return cwdWithCallFrameOverride(getCwd());
}
//@ chunk-sbrfdm61.js:3535-3610 placement
/**
 * 同 getCwdOrNull，但异常时返回 null。
 */
function getCwdOrNullSafe() {
  try {
    let cwd = getCwdOrNull();
    return cwd === null ? null : cwdWithCallFrameOverride(cwd);
  } catch {
    return null;
  }
}
//@ chunk-sbrfdm61.js:3610-3683 placement
/**
 * 沿 call.outer 跳过已结束（isOver）的调用帧。
 */
function skipFinishedCalls(frame) {
  let current = frame;
  while (current?.call?.isOver === true) current = current.call.outer;
  return current;
}
//@ chunk-sbrfdm61.js:3683-3719 placement
function getCurrentCallFrame() {
  return skipFinishedCalls(remoteCallFrameStorage.getStore());
}
//@ chunk-sbrfdm61.js:3719-3792 placement
function getOutermostCallFrame() {
  let currentCallFrame = getCurrentCallFrame();
  while (currentCallFrame?.call !== undefined)
    currentCallFrame = skipFinishedCalls(currentCallFrame.call.outer);
  return currentCallFrame;
}
//@ chunk-sbrfdm61.js:3792-3982 placement
function realPathOutcome(path, outcome) {
  if (outcome.real !== undefined) return outcome.real;
  switch (outcome.code) {
    case "ENOENT":
      return null;
    case "EPERM":
    case "EACCES":
      return;
    case "UNKNOWN":
    case "EUNKNOWN":
    case "EISDIR":
      return false;
    default:
      return false;
  }
}
//@ chunk-gcy2kcsb.js:227-272 placement
/**
 * 上下文键的接受状态（当前无引用）。
 */
var contextKeyAcceptedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gcy2kcsb.js:227", () => {
  contextKeyAcceptedState = identity(
    {
      accepted: false,
    },
    (state) => {
      state.accepted = false;
    },
  );
});
//@ chunk-exfmq47h.js:875208-875222 placement
/**
 * 一个存 {key} 的 AsyncLocalStorage，由 utils/cwd.ts 与 print 使用（看用法更像按调用链覆盖的 key，而不是代理上下文）。
 */
var contextKeyStorage_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:875208", () => {
  contextKeyStorage_2 = new AsyncLocalStorage();
});
//@ chunk-exfmq47h.js:875222-875265 placement
/**
 * 在给定 key 的 ALS 上下文中运行函数。
 */
function runWithContextKey(key, fn) {
  return contextKeyStorage_2.run(
    {
      key,
    },
    fn,
  );
}
//@ chunk-exfmq47h.js:875265-875306 placement
/**
 * 取当前 ALS 上下文的 key。
 */
function getContextKey() {
  return contextKeyStorage_2.getStore()?.key;
}
//@ chunk-exfmq47h.js:875306-875359 placement
/**
 * 清空当前 ALS 上下文的 key。
 */
function clearContextKey() {
  let store = contextKeyStorage_2.getStore();
  if (store) store.key = undefined;
}
//@ chunk-exfmq47h.js:875359-875452 placement (2.1.88 match: getAgentContext, 0.72)
/**
 * 从消息里取 turn 归属键写入上下文存储。
 */
function recordContextKeyFromMessages(messages) {
  let store = contextKeyStorage_2.getStore();
  let key = lastTurnAttributionKey(messages.filter((message) => !message.isMeta));
  if (store && key !== undefined) store.key = key;
}
//@ chunk-exfmq47h.js:875706-875801 placement
/**
 * 取最近一条带 turn 归属键的消息的键。
 */
function lastTurnAttributionKey(messages) {
  return messages.findLast((message) => attributionKeyOrUndefined(message.turnAttributionKey) !== undefined)
    ?.turnAttributionKey;
}
//@ chunk-exfmq47h.js:875973-875988 placement
/**
 * 保存上下文键的 AsyncLocalStorage。
 */
var contextKeyStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:875973", () => {
  contextKeyStorage = new AsyncLocalStorage();
});
//@ chunk-exfmq47h.js:875988-876113 callgraph-fingerprint (2.1.88 match: runWithCwdOverride, 0.278)
function runWithCwdOverride(cwd, fn) {
  if (!("turnAttributionKey" in cwd)) cwd.turnAttributionKey = getContextKey();
  return contextKeyStorage.run(cwd, () => runWithContextKey(cwd.turnAttributionKey, fn));
}
//@ chunk-tkka6eha.js:3236-3240 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tkka6eha.js:3236", () => {
  init_react_production();
});
//@ chunk-tkka6eha.js:3240-3282 placement
function useCwdDerived(getCwd) {
  return useSyncExternalStore(onCloudCwdChange, () => applyCloudCwd(getCwd));
}
export {
  getCwd,
  getCwdOrNull,
  contextKeyStorage,
  runWithContextKey,
  getCwdOrNullSafe,
  getEffectiveCwd,
  applyCloudCwd,
  hasOutermostCallFrame,
  lastTurnAttributionKey,
  clearContextKey,
  setCwdForCallChain,
  getContextKey,
  launchedCwd,
  runWithCwdOverride,
  launchCwd,
  getOutermostCallFrame,
  callFrameCwd,
  currentOrGlobalCwd,
  realPathOutcomeAsync,
  callFramePhysicalMatches,
  callFrameRecoversIfGone,
  runOrExit,
  realPathOutcomeSync,
  withCallFrameCwd,
  initialCwdKey,
  INITIAL_CWD_KEY,
  identityString,
  getCwdIfAvailable,
  resolveFromCwd,
  useCwdDerived,
  contextKeyAcceptedState,
  recordContextKeyFromMessages,
  getCurrentCallFrame,
  identityPath,
  callFramePhysicalCwd,
};
