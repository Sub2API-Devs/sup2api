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
import { ge } from "../../utils/identity.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isBackgroundTasksDisabled } from "./AgentTool.js";
import { isInProcessTeammate } from "../../utils/teammate.js";
import { env } from "../../utils/env.js";
import { isBareMode } from "../../utils/envUtils.js";

/**
 * 后台 Bash 通知状态（回复结束后停止等）及相关提示文案。
 */
//@ chunk-apw2zhyn.js:370-968 placement
var backgroundBashNoticeState = ge(
    { work: null, text: null, stopsAfterReply: !1, sentBashTextStops: null },
    (e) => {
      ((e.work = null), (e.text = null), (e.stopsAfterReply = !1), (e.sentBashTextStops = null));
    },
  ),
  BACKGROUND_COMMAND_STOP_NOTICE =
    "In this session, once your reply ends and until the user writes again, you may not be told when a background command ends, and a few minutes later the command is likely stopped along with every other process left running here; run in the foreground, with a long enough `timeout`, any command that must finish and can finish within the foreground maximum, and otherwise tell the user it will likely be stopped a few minutes after your reply.";
//@ chunk-apw2zhyn.js:968-993 placement
function R_i(e) {
  backgroundBashNoticeState.work = e;
}
//@ chunk-apw2zhyn.js:993-1030 placement
function S7r() {
  return backgroundBashNoticeState.work?.() ?? !1;
}
//@ chunk-apw2zhyn.js:1030-1076 placement
function x_i(e) {
  ((backgroundBashNoticeState.text = e), (backgroundBashNoticeState.stopsAfterReply = !1));
}
//@ chunk-apw2zhyn.js:1076-1175 placement
function T_() {
  if (!backgroundBashNoticeState.stopsAfterReply && backgroundBashNoticeState.text?.() === !0)
    backgroundBashNoticeState.stopsAfterReply = !0;
  return backgroundBashNoticeState.stopsAfterReply;
}
//@ chunk-apw2zhyn.js:1175-1268 placement
function Mts(e) {
  if (e !== void 0)
    backgroundBashNoticeState.sentBashTextStops =
      (backgroundBashNoticeState.sentBashTextStops ?? !0) && e.includes(BACKGROUND_COMMAND_STOP_NOTICE);
}
//@ chunk-apw2zhyn.js:1268-1315 placement
function P_i() {
  return backgroundBashNoticeState.sentBashTextStops === !0;
}
//@ chunk-apw2zhyn.js:1315-1372 placement
function uf() {
  return getHostAgentPolicy().backgroundTasksDisabled || isBackgroundTasksDisabled();
}
//@ chunk-apw2zhyn.js:1439-1502 placement
function _5e() {
  return getHostAgentPolicy().backgroundShellsKeptElsewhere || T_();
}
//@ chunk-apw2zhyn.js:1502-1544 placement
function b5e() {
  return T_() && !isBackgroundAgentLaunchDisabled() && !isInProcessTeammate();
}
//@ chunk-apw2zhyn.js:1544-1644 placement
function isBackgroundShellDisabled() {
  let e = getHostAgentPolicy();
  return (e.backgroundTasksDisabled && !e.backgroundShellsKeptElsewhere) || isBackgroundTasksDisabled();
}
//@ chunk-apw2zhyn.js:1644-1815 placement
function isBackgroundAgentLaunchDisabled() {
  let e = getHostAgentPolicy();
  return (
    (e.backgroundTasksDisabled && e.backgroundLaunchRule === void 0) ||
    e.backgroundAgentLaunchDisabled ||
    env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS ||
    isBareMode()
  );
}
//@ chunk-apw2zhyn.js:1815-1877 placement
function C4() {
  return uf() || getHostAgentPolicy().backgroundAgentLaunchDisabled;
}
//@ chunk-apw2zhyn.js:1877-2035 placement
function isForegroundAgentMoveDisabled() {
  let e = getHostAgentPolicy();
  if (!e.foregroundAgentMovesAdmitted) return C4();
  return e.backgroundAgentLaunchDisabled || env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS || isBareMode();
}
//@ chunk-apw2zhyn.js:2035-2138 placement
function isBackgroundLaunchOptIn() {
  let e = getHostAgentPolicy();
  return (
    e.backgroundLaunchRule !== void 0 && !e.backgroundLaunchByDefault && !isBackgroundAgentLaunchDisabled()
  );
}
//@ chunk-apw2zhyn.js:2138-2199 placement
function VTn() {
  return getHostAgentPolicy().backgroundLaunchByDefault && !isBackgroundAgentLaunchDisabled();
}

export {
  C4,
  isBackgroundAgentLaunchDisabled,
  VTn,
  isForegroundAgentMoveDisabled,
  uf,
  R_i,
  x_i,
  Mts,
  T_,
  S7r,
  isBackgroundShellDisabled,
  isBackgroundLaunchOptIn,
  b5e,
  _5e,
  BACKGROUND_COMMAND_STOP_NOTICE,
  P_i,
};
