/**
 * cli/print/waitingStatus.ts
 *
 * 2.1.316 新增：用量限额等待心跳与等待状态上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (8)
 * attribution: placement 8
 */
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { PERSISTENT_WAIT_CHUNK_MS } from "../../services/api/withRetry.js";
import { onUsageLimitWaitsChanged, usageLimitWaits } from "../../services/claudeAiLimits.js";
import { isMainOrAgentQuerySource } from "../../services/api/requestHeaders.js";
import { JKn } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { stopAllRunningTasks } from "../../tasks/stopTask.js";
import { killAutoReactSubscriptions } from "../../services/artifacts/frameLive.js";
import {
  drainQueuedTaskNotifications,
  artifactWatchStopNotice,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { mg } from "../../utils/messageQueueManager.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { updateSessionActivity } from "../../utils/concurrentSessions.js";
import { eyt } from "../../services/artifacts/artifactPresence.js";

/**
 * 在主线程等待限流重置时定期向 SDK 宿主发送 usage_limit_wait_heartbeat。
 */
//@ chunk-tyg7f3ek.js:613969-614422 placement
function createUsageLimitWaitHeartbeat({ readMainLoopModel: readMainLoopModel, emit: emit }) {
  let r,
    s = !1;
  function h() {
    if (r !== void 0) (clearInterval(r), (r = void 0), (s = !1));
  }
  function y() {
    try {
      let now = Date.now(),
        P = px(now);
      if (P.length === 0) {
        h();
        return;
      }
      if (!KG()) return;
      let L = earliestRateLimitRetry(P, readMainLoopModel(), now);
      if (L) {
        if ((emit(L), !s)) ((s = !0), logFeatureOk("usage_limit_wait_heartbeat"));
      }
    } catch (error) {
      logError(error);
    }
  }
  function S() {
    let w = px(Date.now()).length > 0;
    if (w && r === void 0) ((r = setInterval(y, PERSISTENT_WAIT_CHUNK_MS)), r.unref?.(), y());
    else if (w && !s) y();
    else if (!w) h();
  }
  let R = onUsageLimitWaitsChanged(S);
  return (
    S(),
    () => {
      (R(), h());
    }
  );
}
//@ chunk-tyg7f3ek.js:614422-614749 placement
function earliestRateLimitRetry(e, n, r) {
  let s;
  for (let h of e) {
    if (h.route === "main_thread") return;
    if (!isMainOrAgentQuerySource(h.querySource)) continue;
    if (!JKn(h, n)) continue;
    if (!s || h.retryAtMs < s.retryAtMs) s = h;
  }
  if (!s) return;
  return {
    type: "system",
    subtype: "api_retry",
    attempt: s.attempt,
    max_retries: s.maxRetries,
    retry_delay_ms: s.retryAtMs - r,
    error_status: 429,
    error: "rate_limit",
  };
}
//@ chunk-tyg7f3ek.js:614749-614804 placement
function px(e) {
  return usageLimitWaits().filter((n) => n.retryAtMs > e);
}
//@ chunk-tyg7f3ek.js:614804-614884 placement
function KG() {
  if (getAPIProvider() === "gateway") return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_sunset", !0);
}
//@ chunk-tyg7f3ek.js:614884-614989 placement
function teardownAutoReactAndRooms(e) {
  stopAllRunningTasks(e);
  let n = killAutoReactSubscriptions(e.taskRegistry, { durable: !1 }),
    r = drainQueuedTaskNotifications(mg(), { leaveArtifactRooms: !0 });
  artifactWatchStopNotice(n, r);
}
//@ chunk-tyg7f3ek.js:614989-615051 placement
var VG = { running: "busy", requires_action: "waiting", idle: "idle" };
//@ chunk-tyg7f3ek.js:615051-615317 placement
function createWaitingStatusReporter(e) {
  let n;
  return (r, s) => {
    {
      let h = VG[r],
        y =
          h !== "waiting"
            ? void 0
            : s?.tool_name === ASKUSERQUESTION || s?.tool_name.startsWith("dialog:")
              ? "input needed"
              : "permission prompt",
        S = `${h}
${y ?? ""}`;
      if (S === n) return;
      ((n = S),
        updateSessionActivity({ status: h, waitingFor: y }, e).then((R) => {
          if (!R && n === S) n = void 0;
        }));
    }
  };
}
//@ chunk-tyg7f3ek.js:615317-615453 placement
function createUserDecisionReporter(e, n) {
  let r = !1;
  function s() {
    eyt(e, r && !n.userDecisionPending);
  }
  return (
    n.userDecisionPendingChanged.subscribe(s),
    (h) => {
      ((r = h), s());
    }
  );
}

export {
  createUsageLimitWaitHeartbeat,
  createUserDecisionReporter,
  createWaitingStatusReporter,
  teardownAutoReactAndRooms,
};
