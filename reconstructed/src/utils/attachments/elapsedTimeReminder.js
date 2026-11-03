/**
 * utils/attachments/elapsedTimeReminder.ts
 *
 * 2.1.316 新增：经过时间提醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { logError } from "../log.js";
import { withTelemetryMessage, toError } from "../errors.js";
import { isSessionTaskNotificationOrigin } from "../backgroundSessionResume.js";
import { isPeerOrObserver } from "../messageProvenance.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:3292891-3292953 placement
/**
 * 按会话根保存的经过时间提醒起点与已报告会话 id。
 */
var elapsedTimeStateByRoot = new SessionRootSlot(() => ({
  start: undefined,
  reportedSessionId: undefined,
}));
//@ chunk-e6aww6q8.js:3292953-3293100 placement
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
//@ chunk-e6aww6q8.js:3293100-3293257 placement
function formatElapsedTime(e) {
  let n = Number.isFinite(e) ? Math.max(0, Math.floor(e / 1000)) : 0;
  return `Elapsed time so far: ${Math.floor(n / 60)}m ${String(n % 60).padStart(2, "0")}s`;
}
//@ chunk-e6aww6q8.js:3293257-3293294 placement
/**
 * 判断该消息来源不应重置经过时间提醒（子代理或特定来源）。
 */
function isNonRestartingOrigin(origin) {
  return isSessionTaskNotificationOrigin(origin) || isPeerOrObserver(origin);
}
//@ chunk-e6aww6q8.js:3293294-3293672 placement
/**
 * 在主会话收到新的用户输入时重置经过时间提醒的起点；子代理、特定来源或空轮询投递不重置，功能关闭时清除起点；失败只记录日志。
 */
function restartElapsedTimeClock({ session, agentId, options }, s) {
  try {
    let h = typeof s.value !== "string" && s.value.length === 0 && !s.isPollDelivery;
    if (agentId || isNonRestartingOrigin(s.origin) || h) return;
    if (!isElapsedTimeReminderEnabled(options.mainLoopModel)) {
      let y = elapsedTimeStateByRoot.peek(session);
      if (y) y.start = undefined;
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
//@ chunk-e6aww6q8.js:3293672-3293958 placement
/**
 * 生成经过时间提醒附件（会话首次时设定起点并上报）。
 */
function getElapsedTimeReminderAttachments({ session }) {
  let n = elapsedTimeStateByRoot.of(session);
  let id = session.id;
  let s = session.host.clock.monotonicNow();
  let start = n.start;
  if (start?.sessionId !== id) {
    start = {
      sessionId: id,
      startedAt: s,
    };
    n.start = start;
  }
  if (n.reportedSessionId !== id) {
    n.reportedSessionId = id;
    logFeatureOk("elapsed_time_reminder");
  }
  return [
    {
      type: "elapsed_time_reminder",
      text: formatElapsedTime(s - start.startedAt),
    },
  ];
}
export { restartElapsedTimeClock, isElapsedTimeReminderEnabled, getElapsedTimeReminderAttachments };
