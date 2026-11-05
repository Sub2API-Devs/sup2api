/**
 * utils/attachments/elapsedTimeReminder.ts
 *
 * 2.1.316 新增：经过时间提醒
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { logError } from "../log.js";
import { withTelemetryMessage, toError } from "../errors.js";
import { isSessionTaskNotificationOrigin } from "../backgroundSessionResume.js";
import { isPeerOrObserver } from "../messageProvenance.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3377949-3378011 placement
/**
 * 按会话根保存的经过时间提醒起点与已报告会话 id。
 */
var elapsedTimeStateByRoot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3377949", () => {
  elapsedTimeStateByRoot = new SessionRootSlot(() => ({
    start: undefined,
    reportedSessionId: undefined,
  }));
});
//@ chunk-5xgkngpb.js:3378011-3378158 placement
/**
 * 判断当前模型是否启用经过时间提醒（出错视为关闭）。
 */
function isElapsedTimeReminderEnabled(mainLoopModel) {
  try {
    return isModelCapabilityEnabled("elapsed_time_reminder", getCanonicalName(mainLoopModel), mainLoopModel);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "elapsed time reminder gate failed; treated as off"));
    return false;
  }
}
//@ chunk-5xgkngpb.js:3378158-3378315 placement
function formatElapsedTime(elapsedMs) {
  let elapsedSeconds = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs / 1000)) : 0;
  return `Elapsed time so far: ${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`;
}
//@ chunk-5xgkngpb.js:3378315-3378351 placement
/**
 * 判断该消息来源不应重置经过时间提醒（子代理或特定来源）。
 */
function isNonRestartingOrigin(origin) {
  return isSessionTaskNotificationOrigin(origin) || isPeerOrObserver(origin);
}
//@ chunk-5xgkngpb.js:3378351-3378729 placement
/**
 * 在主会话收到新的用户输入时重置经过时间提醒的起点；子代理、特定来源或空轮询投递不重置，功能关闭时清除起点；失败只记录日志。
 */
function restartElapsedTimeClock({ session, agentId, options }, queuedCommand) {
  try {
    let isEmptyTurn =
      typeof queuedCommand.value !== "string" &&
      queuedCommand.value.length === 0 &&
      !queuedCommand.isPollDelivery;
    if (agentId || isNonRestartingOrigin(queuedCommand.origin) || isEmptyTurn) return;
    if (!isElapsedTimeReminderEnabled(options.mainLoopModel)) {
      let state = elapsedTimeStateByRoot.peek(session);
      if (state) state.start = undefined;
      return;
    }
    elapsedTimeStateByRoot.of(session).start = {
      sessionId: session.id,
      startedAt: session.host.clock.monotonicNow(),
    };
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "elapsed time reminder restart failed; clock left as it was"),
    );
  }
}
//@ chunk-5xgkngpb.js:3378729-3379015 placement
/**
 * 生成经过时间提醒附件（会话首次时设定起点并上报）。
 */
function getElapsedTimeReminderAttachments({ session }) {
  let state = elapsedTimeStateByRoot.of(session);
  let id = session.id;
  let nowMs = session.host.clock.monotonicNow();
  let start = state.start;
  if (start?.sessionId !== id) {
    start = {
      sessionId: id,
      startedAt: nowMs,
    };
    state.start = start;
  }
  if (state.reportedSessionId !== id) {
    state.reportedSessionId = id;
    logFeatureOk("elapsed_time_reminder");
  }
  return [
    {
      type: "elapsed_time_reminder",
      text: formatElapsedTime(nowMs - start.startedAt),
    },
  ];
}
export { isElapsedTimeReminderEnabled, getElapsedTimeReminderAttachments, restartElapsedTimeClock };
