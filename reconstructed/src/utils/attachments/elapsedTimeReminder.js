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
import { zfe } from "../backgroundSessionResume.js";
import { isPeerOrObserver } from "../messageProvenance.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:3292891-3292953 placement
var YZe = new SessionRootSlot(() => ({ start: void 0, reportedSessionId: void 0 }));
/**
 * 判断当前模型是否启用经过时间提醒（出错视为关闭）。
 */
//@ chunk-e6aww6q8.js:3292953-3293100 placement
function isElapsedTimeReminderEnabled(e) {
  try {
    return isModelCapabilityEnabled("elapsed_time_reminder", getCanonicalName(e), e);
  } catch (error) {
    return (
      logError(withTelemetryMessage(toError(error), "elapsed time reminder gate failed; treated as off")),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:3293100-3293257 placement
function formatElapsedTime(e) {
  let n = Number.isFinite(e) ? Math.max(0, Math.floor(e / 1000)) : 0;
  return `Elapsed time so far: ${Math.floor(n / 60)}m ${String(n % 60).padStart(2, "0")}s`;
}
//@ chunk-e6aww6q8.js:3293257-3293294 placement
function XAr(e) {
  return zfe(e) || isPeerOrObserver(e);
}
/**
 * 在主会话收到新的用户输入时重置经过时间提醒的起点；子代理、特定来源或空轮询投递不重置，功能关闭时清除起点；失败只记录日志。
 */
//@ chunk-e6aww6q8.js:3293294-3293672 placement
function restartElapsedTimeClock({ session: session, agentId: agentId, options: options }, s) {
  try {
    let h = typeof s.value !== "string" && s.value.length === 0 && !s.isPollDelivery;
    if (agentId || XAr(s.origin) || h) return;
    if (!isElapsedTimeReminderEnabled(options.mainLoopModel)) {
      let peek = YZe.peek(session);
      if (peek) peek.start = void 0;
      return;
    }
    YZe.of(session).start = { sessionId: session.id, startedAt: session.host.clock.monotonicNow() };
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "elapsed time reminder restart failed; clock left as it was"),
    );
  }
}
/**
 * 生成经过时间提醒附件（会话首次时设定起点并上报）。
 */
//@ chunk-e6aww6q8.js:3293672-3293958 placement
function getElapsedTimeReminderAttachments({ session: session }) {
  let of = YZe.of(session),
    id = session.id,
    monotonicNow = session.host.clock.monotonicNow(),
    start = of.start;
  if (start?.sessionId !== id) ((start = { sessionId: id, startedAt: monotonicNow }), (of.start = start));
  if (of.reportedSessionId !== id) ((of.reportedSessionId = id), logFeatureOk("elapsed_time_reminder"));
  return [{ type: "elapsed_time_reminder", text: formatElapsedTime(monotonicNow - start.startedAt) }];
}

export { restartElapsedTimeClock, isElapsedTimeReminderEnabled, getElapsedTimeReminderAttachments };
