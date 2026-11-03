/**
 * utils/cwd.ts
 *
 * 当前工作目录（getCwd）与按调用临时覆盖 cwd（runWithCwdOverride，AsyncLocalStorage）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cwd.ts
 * pieces: chunk-2nmyajw8.js (2), chunk-aepeg2w5.js (9), chunk-fnk5kvbf.js (22), chunk-vk5xfx8n.js (5)
 * attribution: placement 36, callgraph-fingerprint 1, callgraph-witnessed 1
 */
import { AsyncLocalStorage } from "async_hooks";
import { realpathSync } from "fs";
import { cwd } from "process";
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
import { identity } from "./pathClassification.js";
import { isNoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { attributionKeyOrUndefined } from "./turnAttributionKey.js";
import { identity as identity_2 } from "./identity.js";
import { init_react_production, yt } from "../../vendor/react/cjs/react.production.js";

//@ chunk-fnk5kvbf.js:2338-2400 placement
/**
 * 当前调用帧覆盖的 cwd。
 */
function callFrameCwd() {
  let currentCallFrame = getCurrentCallFrame();
  return currentCallFrame?.call === undefined ? undefined : currentCallFrame.cwd;
}
//@ chunk-fnk5kvbf.js:2400-2474 placement
/**
 * 判断调用帧的物理路径是否与给定值相同。
 */
function callFramePhysicalMatches(e) {
  let n = getCurrentCallFrame()?.call;
  return n === undefined || (e !== false && n.physical === e);
}
//@ chunk-fnk5kvbf.js:2474-2561 placement
/**
 * 判断调用帧是否允许目录消失后恢复（且物理路径为空）。
 */
function callFrameRecoversIfGone() {
  let e = getCurrentCallFrame()?.call;
  return e?.recoversIfAlreadyGone === true && e.physical === null;
}
//@ chunk-fnk5kvbf.js:2561-2617 placement
/**
 * 异步解析真实路径（无盘会话返回 undefined）。
 */
async function realPathOutcomeAsync(cwd) {
  return isDiskless() ? undefined : realPathOutcome(await realpathNativeLong(cwd));
}
//@ chunk-fnk5kvbf.js:2617-2661 placement
/**
 * 同步解析真实路径（无盘会话返回 undefined）。
 */
function realPathOutcomeSync(e) {
  return isDiskless() ? undefined : realPathOutcome(realpathNativeLongSync(e));
}
//@ chunk-fnk5kvbf.js:2661-2703 placement
/**
 * 有终端时执行回调，否则走退出流程。
 */
function runOrExit(e) {
  return isRemoteSessionAvailable() ? e() : remoteCallFrameStorage.exit(e);
}
//@ chunk-fnk5kvbf.js:2703-2742 placement
/**
 * 基于给定（或当前）cwd 解析路径。
 */
function resolveFromCwd(cwd, n) {
  return runInRemoteCallFrameMain(cwd ?? getCwd(), n);
}
//@ chunk-fnk5kvbf.js:2742-2793 placement
/**
 * 在给定调用帧的 cwd 下执行，没有调用帧时直接执行。
 */
function withCallFrameCwd(project, n) {
  return project === null ? n() : resolveFromCwd(project.cwd, n);
}
//@ chunk-fnk5kvbf.js:2793-2827 placement
/**
 * 判断是否存在最外层调用帧（区分按调用覆盖与全局 cwd）。
 */
function hasOutermostCallFrame() {
  return getOutermostCallFrame() !== undefined;
}
//@ chunk-fnk5kvbf.js:2827-2986 placement
/**
 * 设置当前工作目录：在调用帧链上逐层更新 cwd（及物理路径），没有调用帧时更新全局 cwd 状态。
 */
function setCwdForCallChain(cwd) {
  let n = identity(cwd);
  let currentCallFrame = getCurrentCallFrame();
  let physical = currentCallFrame?.call === undefined ? undefined : realPathOutcomeSync(n);
  while (currentCallFrame?.call !== undefined) {
    currentCallFrame.cwd = n;
    currentCallFrame.call.physical = physical;
    currentCallFrame = skipFinishedCalls(currentCallFrame.call.outer);
  }
  if (currentCallFrame) currentCallFrame.cwd = n;
  else setCwdState(cwd);
}
//@ chunk-fnk5kvbf.js:2986-3023 placement
/**
 * 返回当前调用帧的 cwd，否则全局 cwd 状态。
 */
function currentOrGlobalCwd() {
  return getCurrentCallFrame()?.cwd ?? getCwdState();
}
//@ chunk-fnk5kvbf.js:3023-3095 placement
/**
 * 取当前工作目录，无项目目录时返回 null。
 */
function getCwdOrNull() {
  if (getCurrentCallFrame()?.cwd === undefined && getOriginalCwdOrNull() === null) return null;
  return getCwd();
}
//@ chunk-fnk5kvbf.js:3095-3179 callgraph-witnessed = getCwd (0)
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
//@ chunk-fnk5kvbf.js:3179-3224 placement
/**
 * 无盘且无调用帧时返回 undefined，否则当前 cwd。
 */
function getCwdIfAvailable() {
  return !hasOutermostCallFrame() && isRemoteSessionAvailable() ? undefined : getCwd();
}
//@ chunk-fnk5kvbf.js:3224-3256 placement
/**
 * 有云端 cwd 时用它，否则保留原值。
 */
function applyCloudCwd(e) {
  return getCloudCwd() ?? e;
}
//@ chunk-fnk5kvbf.js:3256-3291 placement
/**
 * 调用帧覆盖优先，否则应用云端 cwd。
 */
function cwdWithCallFrameOverride(e) {
  return hasOutermostCallFrame() ? e : applyCloudCwd(e);
}
//@ chunk-fnk5kvbf.js:3291-3321 placement
/**
 * 返回当前生效的工作目录（含云端覆盖）。
 */
function getEffectiveCwd() {
  return cwdWithCallFrameOverride(getCwd());
}
//@ chunk-fnk5kvbf.js:3321-3396 placement
/**
 * 同 getCwdOrNull，但异常时返回 null。
 */
function getCwdOrNullSafe() {
  try {
    let cwdOrNull = getCwdOrNull();
    return cwdOrNull === null ? null : cwdWithCallFrameOverride(cwdOrNull);
  } catch {
    return null;
  }
}
//@ chunk-fnk5kvbf.js:3396-3469 placement
/**
 * 沿 call.outer 跳过已结束（isOver）的调用帧。
 */
function skipFinishedCalls(e) {
  let n = e;
  while (n?.call?.isOver === true) n = n.call.outer;
  return n;
}
//@ chunk-fnk5kvbf.js:3469-3505 placement = getAgentContext (1)
function getCurrentCallFrame() {
  return skipFinishedCalls(remoteCallFrameStorage.getStore());
}
//@ chunk-fnk5kvbf.js:3505-3578 placement
function getOutermostCallFrame() {
  let currentCallFrame = getCurrentCallFrame();
  while (currentCallFrame?.call !== undefined)
    currentCallFrame = skipFinishedCalls(currentCallFrame.call.outer);
  return currentCallFrame;
}
//@ chunk-fnk5kvbf.js:3578-3715 placement
function realPathOutcome(e) {
  if (e.real !== undefined) return e.real;
  switch (e.code) {
    case "ENOENT":
      return null;
    case "EPERM":
    case "EACCES":
      return;
    default:
      return false;
  }
}
//@ chunk-aepeg2w5.js:852825-852839 placement = agentContextStorage (0)
/**
 * 一个存 {key} 的 AsyncLocalStorage，由 utils/cwd.ts 与 print 使用（看用法更像按调用链覆盖的 key，而不是代理上下文）。
 */
var contextKeyStorage_2 = new AsyncLocalStorage();
//@ chunk-aepeg2w5.js:852839-852882 placement
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
//@ chunk-aepeg2w5.js:852882-852923 placement = getAgentContext (1)
/**
 * 取当前 ALS 上下文的 key。
 */
function getContextKey() {
  return contextKeyStorage_2.getStore()?.key;
}
//@ chunk-aepeg2w5.js:852923-852976 placement = getAgentContext (1)
/**
 * 清空当前 ALS 上下文的 key。
 */
function clearContextKey() {
  let e = contextKeyStorage_2.getStore();
  if (e) e.key = undefined;
}
//@ chunk-aepeg2w5.js:852976-853069 placement
/**
 * 从消息里取 turn 归属键写入上下文存储。
 */
function recordContextKeyFromMessages(e) {
  let n = contextKeyStorage_2.getStore();
  let r = lastTurnAttributionKey(e.filter((s) => !s.isMeta));
  if (n && r !== undefined) n.key = r;
}
//@ chunk-aepeg2w5.js:853323-853418 placement
/**
 * 取最近一条带 turn 归属键的消息的键。
 */
function lastTurnAttributionKey(e) {
  return e.findLast((n) => attributionKeyOrUndefined(n.turnAttributionKey) !== undefined)?.turnAttributionKey;
}
//@ chunk-aepeg2w5.js:853590-853637 placement
/**
 * 上下文键的接受状态（当前无引用）。
 */
var contextKeyAcceptedState = identity_2(
  {
    accepted: false,
  },
  (e) => {
    e.accepted = false;
  },
);
//@ chunk-aepeg2w5.js:853637-853652 placement
/**
 * 保存上下文键的 AsyncLocalStorage。
 */
var contextKeyStorage = new AsyncLocalStorage();
//@ chunk-aepeg2w5.js:853652-853777 callgraph-fingerprint = runWithCwdOverride (0.279)
function runWithCwdOverride(cwd, fn) {
  if (!("turnAttributionKey" in cwd)) cwd.turnAttributionKey = getContextKey();
  return contextKeyStorage.run(cwd, () => runWithContextKey(cwd.turnAttributionKey, fn));
}
//@ chunk-vk5xfx8n.js:255-280 placement
/**
 * 原样返回输入（占位）。
 */
function identityString(n) {
  return n;
}
//@ chunk-vk5xfx8n.js:280-305 placement
/**
 * 原样返回输入（占位，用于启动 cwd 键）。
 */
function identityPath(n) {
  return n;
}
//@ chunk-vk5xfx8n.js:305-471 placement
/**
 * 计算启动 cwd 的规范化键（解析真实路径）。
 */
function initialCwdKey() {
  let n = "";
  if (
    typeof process !== "undefined" &&
    typeof process.cwd === "function" &&
    typeof realpathSync === "function"
  )
    try {
      let r = cwd();
      try {
        n = identityString(identityPath(r));
      } catch {
        n = identityString(r);
      }
    } catch {}
  return n;
}
//@ chunk-vk5xfx8n.js:471-610 placement
/**
 * 进程启动时的工作目录（git-bash 或环境异常时为 null）。
 */
var INITIAL_CWD_KEY = initialCwdKey();
var launchedCwd = (() => {
  if (typeof process === "undefined" || typeof process.cwd !== "function") return null;
  try {
    return process.cwd();
  } catch {
    return null;
  }
})();
//@ chunk-vk5xfx8n.js:610-746 placement
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
//@ chunk-2nmyajw8.js:3234-3238 placement
init_react_production();
//@ chunk-2nmyajw8.js:3238-3280 placement
function useCwdDerived(o) {
  return yt(onCloudCwdChange, () => applyCloudCwd(o));
}
export {
  getCwd,
  getCwdOrNull,
  runWithCwdOverride,
  hasOutermostCallFrame,
  withCallFrameCwd,
  getContextKey,
  launchedCwd,
  applyCloudCwd,
  runWithContextKey,
  useCwdDerived,
  clearContextKey,
  setCwdForCallChain,
  contextKeyStorage,
  recordContextKeyFromMessages,
  resolveFromCwd,
  getOutermostCallFrame,
  INITIAL_CWD_KEY,
  identityPath,
  getCwdOrNullSafe,
  getEffectiveCwd,
  currentOrGlobalCwd,
  launchCwd,
  callFrameCwd,
  realPathOutcomeSync,
  callFramePhysicalMatches,
  realPathOutcomeAsync,
  callFrameRecoversIfGone,
  runOrExit,
  getCurrentCallFrame,
  initialCwdKey,
  identityString,
  getCwdIfAvailable,
  lastTurnAttributionKey,
};
