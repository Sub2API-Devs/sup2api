/**
 * tools/AgentTool/backgroundGates.ts
 *
 * 2.1.316 新增。后台代理开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-apw2zhyn.js (16)
 * attribution: placement 16
 */
import { identity } from "../../utils/identity.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isBackgroundTasksDisabled } from "./AgentTool.js";
import { isInProcessTeammate } from "../../utils/teammate.js";
import { env } from "../../utils/env.js";
import { isBareMode } from "../../utils/envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-apw2zhyn.js:370-968 placement
/**
 * 后台 Bash 通知状态（回复结束后停止等）及相关提示文案。
 */
var backgroundBashNoticeState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BACKGROUND_COMMAND_STOP_NOTICE;
deferInit("chunk-apw2zhyn.js:370", () => {
  backgroundBashNoticeState = identity(
    {
      work: null,
      text: null,
      stopsAfterReply: false,
      sentBashTextStops: null,
    },
    (state) => {
      state.work = null;
      state.text = null;
      state.stopsAfterReply = false;
      state.sentBashTextStops = null;
    },
  );
  BACKGROUND_COMMAND_STOP_NOTICE =
    "In this session, once your reply ends and until the user writes again, you may not be told when a background command ends, and a few minutes later the command is likely stopped along with every other process left running here; run in the foreground, with a long enough `timeout`, any command that must finish and can finish within the foreground maximum, and otherwise tell the user it will likely be stopped a few minutes after your reply.";
});
//@ chunk-apw2zhyn.js:968-993 placement
/**
 * 设置后台 bash 通知的工作探测函数。
 */
function setBackgroundBashWorkProbe(work) {
  backgroundBashNoticeState.work = work;
}
//@ chunk-apw2zhyn.js:993-1030 placement
/**
 * 探测当前是否有后台 bash 工作。
 */
function hasBackgroundBashWork() {
  return backgroundBashNoticeState.work?.() ?? false;
}
//@ chunk-apw2zhyn.js:1030-1076 placement
/**
 * 设置后台 bash 停止探测函数并清除已判定标记。
 */
function setBackgroundBashStopProbe(text) {
  backgroundBashNoticeState.text = text;
  backgroundBashNoticeState.stopsAfterReply = false;
}
//@ chunk-apw2zhyn.js:1076-1175 placement
/**
 * 判断回复后后台 bash 是否会被停止（结果缓存）。
 */
function hasBackgroundBashStopAfterReply() {
  if (!backgroundBashNoticeState.stopsAfterReply && backgroundBashNoticeState.text?.() === true)
    backgroundBashNoticeState.stopsAfterReply = true;
  return backgroundBashNoticeState.stopsAfterReply;
}
//@ chunk-apw2zhyn.js:1175-1268 placement
/**
 * 记录已发送的后台停止提示。
 */
function noteBackgroundStopNoticeSent(text) {
  if (text !== undefined)
    backgroundBashNoticeState.sentBashTextStops =
      (backgroundBashNoticeState.sentBashTextStops ?? true) && text.includes(BACKGROUND_COMMAND_STOP_NOTICE);
}
//@ chunk-apw2zhyn.js:1268-1315 placement
/**
 * 是否已发送过后台停止提示。
 */
function stopNoticeWasSent() {
  return backgroundBashNoticeState.sentBashTextStops === true;
}
//@ chunk-apw2zhyn.js:1315-1372 placement
/**
 * 宿主策略或全局开关是否禁用后台任务。
 */
function isBackgroundTasksOff() {
  return getHostAgentPolicy().backgroundTasksDisabled || isBackgroundTasksDisabled();
}
//@ chunk-apw2zhyn.js:1439-1502 placement
/**
 * 后台 shell 是否在别处保留（或回复后会被停止）。
 */
function backgroundShellsKeptElsewhere() {
  return getHostAgentPolicy().backgroundShellsKeptElsewhere || hasBackgroundBashStopAfterReply();
}
//@ chunk-apw2zhyn.js:1502-1544 placement
/**
 * 是否可启动后台代理（且不是 in-process 队友）。
 */
function canLaunchBackgroundAgent() {
  return hasBackgroundBashStopAfterReply() && !isBackgroundAgentLaunchDisabled() && !isInProcessTeammate();
}
//@ chunk-apw2zhyn.js:1544-1644 placement
function isBackgroundShellDisabled() {
  let hostAgentPolicy = getHostAgentPolicy();
  return (
    (hostAgentPolicy.backgroundTasksDisabled && !hostAgentPolicy.backgroundShellsKeptElsewhere) ||
    isBackgroundTasksDisabled()
  );
}
//@ chunk-apw2zhyn.js:1644-1815 placement
function isBackgroundAgentLaunchDisabled() {
  let hostAgentPolicy = getHostAgentPolicy();
  return (
    (hostAgentPolicy.backgroundTasksDisabled && hostAgentPolicy.backgroundLaunchRule === undefined) ||
    hostAgentPolicy.backgroundAgentLaunchDisabled ||
    env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS ||
    isBareMode()
  );
}
//@ chunk-apw2zhyn.js:1815-1877 placement
/**
 * 前台代理转后台是否被禁用。
 */
function isForegroundAgentMoveOff() {
  return isBackgroundTasksOff() || getHostAgentPolicy().backgroundAgentLaunchDisabled;
}
//@ chunk-apw2zhyn.js:1877-2035 placement
function isForegroundAgentMoveDisabled() {
  let hostAgentPolicy = getHostAgentPolicy();
  if (!hostAgentPolicy.foregroundAgentMovesAdmitted) return isForegroundAgentMoveOff();
  return (
    hostAgentPolicy.backgroundAgentLaunchDisabled || env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS || isBareMode()
  );
}
//@ chunk-apw2zhyn.js:2035-2138 placement
function isBackgroundLaunchOptIn() {
  let hostAgentPolicy = getHostAgentPolicy();
  return (
    hostAgentPolicy.backgroundLaunchRule !== undefined &&
    !hostAgentPolicy.backgroundLaunchByDefault &&
    !isBackgroundAgentLaunchDisabled()
  );
}
//@ chunk-apw2zhyn.js:2138-2199 placement
/**
 * 是否默认后台启动且允许启动。
 */
function isBackgroundLaunchByDefault() {
  return getHostAgentPolicy().backgroundLaunchByDefault && !isBackgroundAgentLaunchDisabled();
}
export {
  isForegroundAgentMoveOff,
  isBackgroundAgentLaunchDisabled,
  isBackgroundLaunchByDefault,
  isForegroundAgentMoveDisabled,
  isBackgroundTasksOff,
  setBackgroundBashWorkProbe,
  setBackgroundBashStopProbe,
  noteBackgroundStopNoticeSent,
  hasBackgroundBashStopAfterReply,
  hasBackgroundBashWork,
  isBackgroundShellDisabled,
  isBackgroundLaunchOptIn,
  canLaunchBackgroundAgent,
  backgroundShellsKeptElsewhere,
  BACKGROUND_COMMAND_STOP_NOTICE,
  stopNoticeWasSent,
};
