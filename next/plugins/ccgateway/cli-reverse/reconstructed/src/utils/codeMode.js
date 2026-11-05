/**
 * utils/codeMode.ts
 *
 * REPL/code mode 的状态判定：引擎检查、沙箱条件、pin/unpin、定时与分片上限、关闭时的提示文案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8nzbdydx.js (45)
 * attribution: placement 44
 */
import { codeModeAccepted, isAccepted } from "./codeMode/accepted.js";
import {
  REPL_MAIN_THREAD_KEY,
  printPollWiringLoggedState,
  hasCodeModeBeenUsed,
  isCodeModeEnabled,
  willHideCodeModeOnlyTools,
  REPL_SYNC_RUN_MS,
  isCodeModeExperimentEnabled,
} from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { identity } from "./identity.js";
import { getForesightState, codeModeEnvHint } from "./foresightStatus.js";
import { isDiagLogging, isInDiagScope } from "./diagLogs.js";
import { getIsRemoteMode, setOwnEventDeliveryHeld } from "../bootstrap/state.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { alwaysTrue } from "./slowOperations.js";
import { CODE_MODE_LABEL, CODE_MODE_EXPERIMENTAL_LABEL } from "../constants/codeMode.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { matchesToolName } from "../Tool.js";
import { REPL_TOOL_NAME } from "../tools/REPLTool/constants.js";
import { POLL } from "../tools/PollTool/prompt.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8nzbdydx.js:58154-58287 placement
/**
 * 返回 REPL 会话里脚本可见的全局变量名（code mode 只对脚本内可见）。
 */
function replBindingsKept(toolState, agentId) {
  if (codeModeAccepted()) {
    let { ReplSessions } = require("../state/replSessions.js");
    return toolState
      .get(ReplSessions)
      .get(agentId ?? REPL_MAIN_THREAD_KEY)
      ?.scriptGlobalNames();
  }
  return;
}
//@ chunk-8nzbdydx.js:58287-58509 placement
/**
 * 新的 REPL 上下文提示：之前脚本定义的变量与定时器都不存在。
 */
function replStartedEmptyNote() {
  if (codeModeAccepted())
    return "\u26A0 This REPL context is new: variables, functions and timers from earlier scripts in this conversation don't exist in it, even those a compaction summary lists as still defined.";
  return "";
}
//@ chunk-8nzbdydx.js:58509-58561 placement
function emptyRename() {
  return {
    newName: undefined,
    oldName: undefined,
  };
}
//@ chunk-8nzbdydx.js:58561-58577 placement
function onCodeModeRenamed(value) {}
//@ chunk-8nzbdydx.js:58577-58598 placement
function replFlagSetByHand_2() {
  return;
}
//@ chunk-8nzbdydx.js:58598-58641 placement (moved: shares a binding it assigns)
/**
 * 记录 print 模式轮询接线是否已创建（当前无引用）。
 */
var pinnedCodeMode; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var beforePin;
var codeModeBeforePinValue;
var printPollWiringMadeState;
deferInit("chunk-8nzbdydx.js:58598", () => {
  printPollWiringMadeState = identity(
    {
      made: false,
    },
    (state) => {
      state.made = false;
    },
  );
});
//@ chunk-8nzbdydx.js:58641-58680 placement
function isReplOn() {
  return getForesightState().state === "on";
}
//@ chunk-8nzbdydx.js:58680-58720 placement
/**
 * 判断是否是 thin client（REPL 会话存在且非 thin 能力）。
 */
function isThinClient() {
  return codeModeAccepted() && !isDiagLogging() && getIsRemoteMode();
}
//@ chunk-8nzbdydx.js:58968-59291 placement
function logReplEngineCheck(checkResult, held, atStartup) {
  if (codeModeAccepted()) {
    if (printPollWiringLoggedState.logged || (checkResult === "passed" && !atStartup)) return;
    printPollWiringLoggedState.logged = true;
    if (checkResult === "passed") {
      logFeatureOk("repl_engine_check");
      return;
    }
    let message = `REPL mode's engine check failed (${checkResult}); REPL mode is ${held ? "kept off" : "still allowed"}`;
    logForDebugging(message, {
      level: "error",
    });
    logFeatureSad("repl_engine_check", checkResult, {
      held,
    });
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        message,
        "REPL mode's engine check failed",
        checkResult,
      ),
    );
  }
}
//@ chunk-8nzbdydx.js:59291-59603 placement
/**
 * 引擎检查是否允许 code mode；检查跑晚了会记日志。
 */
function doesEngineCheckAllowCodeMode() {
  if (codeModeAccepted()) {
    let { doesEngineResultHold, engineCheckResult, isEngineCheckDone } = require("./bunEngineProbe.js");
    if (!isEngineCheckDone())
      logForDebugging(
        "REPL mode: the engine check ran late, at the first read of the mode, because no start-up call (primeReplEngineCheck) had made it",
      );
    let checkResult = engineCheckResult();
    let held = doesEngineResultHold(checkResult);
    logReplEngineCheck(checkResult, held, true);
    return !held;
  }
  return false;
}
//@ chunk-8nzbdydx.js:59603-59748 placement
/**
 * 启动时先跑一次引擎检查并把结果记下来（prime）。
 */
function primeReplEngineCheck() {
  if (codeModeAccepted()) {
    if (alwaysTrue() && replFlagSetByHand_2() !== false) {
      let { doesEngineResultHold, engineCheckResult } = require("./bunEngineProbe.js");
      let checkResult = engineCheckResult();
      logReplEngineCheck(checkResult, doesEngineResultHold(checkResult), false);
    }
  }
}
//@ chunk-8nzbdydx.js:59748-59786 placement
/**
 * 判断 REPL 脚本是否允许运行（thin client 用另一套判定）。
 */
function mayReplScriptsRun() {
  return isAccepted() ? hasCodeModeBeenUsed() : isCodeModeEnabled();
}
//@ chunk-8nzbdydx.js:59786-59941 placement
/**
 * code mode 下是否对 API 隐藏工具名。
 */
function codeModeHidesToolNamesFromApi(toolNames) {
  if (codeModeAccepted()) {
    if (!mayReplScriptsRun()) return false;
    try {
      let { willListHiddenToolNames } = require("./codeMode/willListHiddenToolNames.lazy.js");
      return !willListHiddenToolNames(toolNames);
    } catch (error) {
      logError(error);
      return true;
    }
  }
  return false;
}
//@ chunk-8nzbdydx.js:59941-59973 placement
function isCodeModeTurnedOff() {
  return isAccepted() && !isCodeModeEnabled();
}
//@ chunk-8nzbdydx.js:59973-60152 placement
function codeModeOffExitHint() {
  return `To use them, exit and start a new session with ${CODE_MODE_LABEL} off: ${codeModeEnvHint(0)} (add --chrome, if you started with it). This conversation can only be continued in ${CODE_MODE_LABEL}.`;
}
//@ chunk-8nzbdydx.js:60152-60374 placement
/**
 * code mode 关闭时的 toast 文案（含 Chrome/computer use 失效的情况）。
 */
function offInCodeModeToast() {
  return isCodeModeTurnedOff()
    ? `No Chrome or computer use: exit and ${codeModeEnvHint(0, "--resume", "step")} \xB7 ${CODE_MODE_EXPERIMENTAL_LABEL} was on earlier in this run`
    : `No Chrome or computer use: exit and ${codeModeEnvHint(0, undefined, "step")} for a new session without ${CODE_MODE_EXPERIMENTAL_LABEL}`;
}
//@ chunk-8nzbdydx.js:60374-60816 placement
/**
 * code mode 关闭时的常驻 notice 文案。
 */
function offInCodeModeNotice() {
  return isCodeModeTurnedOff()
    ? `Claude in Chrome and computer use stay off until you quit Claude Code: ${CODE_MODE_EXPERIMENTAL_LABEL} was on earlier in this run, and a background agent may still be working in it. To use them, exit, ${codeModeEnvHint(0, "--resume", "step")} (add --chrome, if you started with it) and choose this conversation.`
    : `Claude in Chrome and computer use are off, because this session is in ${CODE_MODE_EXPERIMENTAL_LABEL}, which doesn't yet have the safety rules that they need. ${codeModeOffExitHint()}`;
}
//@ chunk-8nzbdydx.js:60816-61377 placement
/**
 * 给模型的 code mode 关闭说明：Chrome 与 computer use 在退出前不可用。
 */
function offInCodeModeNoteForModel() {
  return isCodeModeTurnedOff()
    ? `Claude in Chrome and computer use are not available until the user quits Claude Code: ${CODE_MODE_EXPERIMENTAL_LABEL} was on earlier in this run, and a background agent may still be working in it. If the user asks for either, tell them why, and to exit, ${codeModeEnvHint(0, "--resume", "step")} (adding --chrome if they started with it) and choose this conversation.`
    : `Claude in Chrome and computer use are not available while this session is in ${CODE_MODE_EXPERIMENTAL_LABEL}, where the API does not yet add its safety rules for them. If the user asks for either, tell them why, and this: ${codeModeOffExitHint()}`;
}
//@ chunk-8nzbdydx.js:61377-61405 placement
/**
 * 模型侧「工具还没列出」的提示（复用关闭说明）。
 */
function notListedYetNoteForModel() {
  return offInCodeModeNoteForModel();
}
//@ chunk-8nzbdydx.js:61405-61433 placement
/**
 * 模型侧「工具已过时」的提示（复用关闭说明）。
 */
function pastItsToolsInCodeModeNote() {
  return offInCodeModeNoteForModel();
}
//@ chunk-8nzbdydx.js:61543-61576 placement
/**
 * 标记 REPL 上下文已建立。
 */
function noteReplContextCreated() {
  if (codeModeAccepted()) printPollWiringMadeState.made = true;
}
//@ chunk-8nzbdydx.js:61576-61605 placement
/**
 * REPL 上下文是否已建立。
 */
function hasReplContextBeenCreated() {
  return printPollWiringMadeState.made;
}
//@ chunk-8nzbdydx.js:61984-62001 placement
/**
 * 设置「会话已恢复」标志（当前为空实现）。
 */
function setReplConversationResumed(value) {}
//@ chunk-8nzbdydx.js:62001-62082 placement
/**
 * 沙箱宿主是否提供命令网络列表（已提供过才允许 code mode）。
 */
function sandboxHostListsBlockCodeMode() {
  return (
    codeModeAccepted() &&
    (isInDiagScope() || !isDiagLogging()) &&
    getSessionFeatureValues().commandNetworkListsOffered === true
  );
}
//@ chunk-8nzbdydx.js:62082-62148 placement
/**
 * 判断 code mode 是否被沙箱条件挡下。
 */
function isCodeModeHeldOffBySandbox() {
  return (
    codeModeAccepted() &&
    alwaysTrue() &&
    !isThinClient() &&
    (pinnedCodeMode ?? isReplOn()) &&
    sandboxHostListsBlockCodeMode() &&
    doesEngineCheckAllowCodeMode()
  );
}
//@ chunk-8nzbdydx.js:62148-62302 placement
/**
 * 固定（pin）code mode 状态并记录原状态。
 */
function pinCodeMode(value) {
  if (codeModeAccepted()) {
    if (value) return;
    if (
      value &&
      (sandboxHostListsBlockCodeMode() || !doesEngineCheckAllowCodeMode() || replFlagSetByHand() === false)
    )
      return;
    if (pinnedCodeMode === undefined) {
      beforePin = emptyRename();
      codeModeBeforePinValue = isCodeModeEnabled();
    }
    pinnedCodeMode = value;
    onCodeModeRenamed({
      newName: undefined,
      oldName: value,
    });
    setOwnEventDeliveryHeld(!hasCodeModeBeenUsed());
  }
}
//@ chunk-8nzbdydx.js:62302-62405 placement
/**
 * 取消固定并恢复原状态。
 */
function unpinCodeMode() {
  if (codeModeAccepted()) {
    if (pinnedCodeMode === undefined || beforePin === undefined) return;
    pinnedCodeMode = undefined;
    onCodeModeRenamed(beforePin);
    beforePin = undefined;
    codeModeBeforePinValue = undefined;
    setOwnEventDeliveryHeld(!hasCodeModeBeenUsed());
  }
}
//@ chunk-8nzbdydx.js:62405-62452 placement
/**
 * 取固定前的模型状态。
 */
function codeModeBeforePin() {
  if (codeModeAccepted()) return codeModeBeforePinValue ?? isCodeModeEnabled();
  return false;
}
//@ chunk-8nzbdydx.js:62452-62474 placement
/**
 * REPL 标志是否被手工设置（当前为空实现）。
 */
function replFlagSetByHand() {
  return;
}
//@ chunk-8nzbdydx.js:62474-62498 placement
/**
 * 员工开关名（当前为空字符串）。
 */
function staffSwitchName() {
  return "";
}
//@ chunk-8nzbdydx.js:62498-62523 placement
/**
 * 员工开关是否设成指定值（当前恒 false）。
 */
function staffSwitchNameSetTo(value) {
  return "";
}
//@ chunk-8nzbdydx.js:62523-62547 placement
/**
 * code mode 是否被本机覆盖关掉（当前恒 false）。
 */
function isCodeModeOffByLocalOverride() {
  return false;
}
//@ chunk-8nzbdydx.js:62547-62571 placement
/**
 * code mode 是否被云分组关掉（当前恒 false）。
 */
function isCodeModeOffByCloudGroup() {
  return false;
}
//@ chunk-8nzbdydx.js:63033-63111 placement
function isCountedForContext(tool) {
  if (tool.isMcp === true) return true;
  return (
    !matchesToolName(tool, REPL_TOOL_NAME) &&
    !matchesToolName(tool, POLL) &&
    !matchesToolName(tool, STRUCTUREDOUTPUT)
  );
}
//@ chunk-8nzbdydx.js:63111-63155 placement
/**
 * 判断工具是否因 code mode 而只对脚本可见。
 */
function isHiddenByCodeModeOnly(toolName, tool) {
  return codeModeAccepted() && isCountedForContext(toolName) && willHideCodeModeOnlyTools(tool);
}
//@ chunk-8nzbdydx.js:63548-63573 placement
/**
 * REPL 同步运行时长上限（50 s）。
 */
function replSyncRunMs() {
  return REPL_SYNC_RUN_MS;
}
//@ chunk-8nzbdydx.js:63573-63585 placement
var replClockHeartbeatMs_2 = 1000;
//@ chunk-8nzbdydx.js:63585-63610 placement
/**
 * REPL 时钟心跳间隔（1000 ms）。
 */
function replClockHeartbeatMs() {
  return replClockHeartbeatMs_2;
}
//@ chunk-8nzbdydx.js:63610-63647 placement
/**
 * REPL 定时器宽限与迟到常量。
 */
var REPL_TIMER_LATE_MS = 1000;
var REPL_TIMER_GRACE_MS = 5000;
var replSettleWindowRawMs = 30000;
var replSettleWindowMs_2 = replSettleWindowRawMs;
//@ chunk-8nzbdydx.js:63647-63672 placement
/**
 * REPL settle 窗口（30 s）。
 */
function replSettleWindowMs() {
  return replSettleWindowMs_2;
}
//@ chunk-8nzbdydx.js:63672-63697 placement
/**
 * 无输出后多久脱离（30 s）。
 */
function replDetachAfterMs() {
  return replSettleWindowRawMs;
}
//@ chunk-8nzbdydx.js:63723-63770 placement
/**
 * 取 REPL 单次输出的分片上限（REPL 能力开时才有）。
 */
function getReplPartCap() {
  if (codeModeAccepted() && isCodeModeExperimentEnabled()) return REPL_PART_CAP;
  return;
}
//@ chunk-8nzbdydx.js:63770-63793 placement
/**
 * REPL 分片上限 30000 与工具调用上限 50000 常量。
 */
var REPL_PART_CAP = 30000;
var REPL_TOTAL_CAP = 50000;
//@ chunk-8nzbdydx.js:63793-63818 placement
/**
 * REPL 工具调用次数上限。
 */
function replToolCallCap() {
  return REPL_TOTAL_CAP;
}
//@ chunk-8nzbdydx.js:63818-63829 placement
/**
 * 超限后最多再拒绝的次数。
 */
var REPL_MAX_REFUSALS_WHEN_OVER = 20;
export {
  codeModeBeforePin,
  sandboxHostListsBlockCodeMode,
  setReplConversationResumed,
  unpinCodeMode,
  pinCodeMode,
  replClockHeartbeatMs,
  replSettleWindowMs,
  mayReplScriptsRun,
  codeModeHidesToolNamesFromApi,
  replBindingsKept,
  isHiddenByCodeModeOnly,
  offInCodeModeToast,
  offInCodeModeNotice,
  doesEngineCheckAllowCodeMode,
  isThinClient,
  pinnedCodeMode,
  isReplOn,
  offInCodeModeNoteForModel,
  printPollWiringMadeState,
  isCountedForContext,
  notListedYetNoteForModel,
  primeReplEngineCheck,
  REPL_TIMER_LATE_MS,
  REPL_TIMER_GRACE_MS,
  getReplPartCap,
  replDetachAfterMs,
  replSyncRunMs,
  hasReplContextBeenCreated,
  noteReplContextCreated,
  REPL_PART_CAP,
  REPL_MAX_REFUSALS_WHEN_OVER,
  replToolCallCap,
  replStartedEmptyNote,
  pastItsToolsInCodeModeNote,
  isCodeModeHeldOffBySandbox,
  isCodeModeOffByCloudGroup,
  isCodeModeOffByLocalOverride,
  replFlagSetByHand,
  staffSwitchName,
  staffSwitchNameSetTo,
};
