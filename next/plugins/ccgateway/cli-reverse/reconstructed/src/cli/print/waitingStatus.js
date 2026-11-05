/**
 * cli/print/waitingStatus.ts
 *
 * 2.1.316 新增：用量限额等待心跳与等待状态上报
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (8)
 * attribution: placement 8
 */
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { PERSISTENT_WAIT_CHUNK_MS } from "../../services/api/withRetry.js";
import { onUsageLimitWaitsChanged, usageLimitWaits } from "../../services/claudeAiLimits.js";
import { isMainOrAgentQuerySource } from "../../services/api/requestHeaders.js";
import { limitAppliesToModelOrCanonical } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { stopAllRunningTasks } from "../../tasks/stopTask.js";
import { killAutoReactSubscriptions } from "../../services/artifacts/frameLive.js";
import {
  drainQueuedTaskNotifications,
  artifactWatchStopNotice,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { getProcessQueue } from "../../utils/messageQueueManager.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { updateSessionActivity } from "../../utils/concurrentSessions.js";
import { setWorking } from "../../services/artifacts/artifactPresence.js";

//@ chunk-0yw3taqg.js:656047-656500 placement
/**
 * 在主线程等待限流重置时定期向 SDK 宿主发送 usage_limit_wait_heartbeat。
 */
function createUsageLimitWaitHeartbeat({ readMainLoopModel, emit }) {
  let interval;
  let reported = false;
  function stop() {
    if (interval !== undefined) {
      clearInterval(interval);
      interval = undefined;
      reported = false;
    }
  }
  function tick() {
    try {
      let now = Date.now();
      let waits = usageLimitWaitsAfter(now);
      if (waits.length === 0) {
        stop();
        return;
      }
      if (!isUsageLimitWaitNoticeEnabled()) return;
      let notice = earliestRateLimitRetry(waits, readMainLoopModel(), now);
      if (notice) {
        emit(notice);
        if (!reported) {
          reported = true;
          logFeatureOk("usage_limit_wait_heartbeat");
        }
      }
    } catch (error) {
      logError(error);
    }
  }
  function check() {
    let hasWaits = usageLimitWaitsAfter(Date.now()).length > 0;
    if (hasWaits && interval === undefined) {
      interval = setInterval(tick, PERSISTENT_WAIT_CHUNK_MS);
      interval.unref?.();
      tick();
    } else if (hasWaits && !reported) tick();
    else if (!hasWaits) stop();
  }
  let unsubscribe = onUsageLimitWaitsChanged(check);
  check();
  return () => {
    unsubscribe();
    stop();
  };
}
//@ chunk-0yw3taqg.js:656500-656827 placement
function earliestRateLimitRetry(waits, model, now) {
  let earliest;
  for (let wait of waits) {
    if (wait.route === "main_thread") return;
    if (!isMainOrAgentQuerySource(wait.querySource)) continue;
    if (!limitAppliesToModelOrCanonical(wait, model)) continue;
    if (!earliest || wait.retryAtMs < earliest.retryAtMs) earliest = wait;
  }
  if (!earliest) return;
  return {
    type: "system",
    subtype: "api_retry",
    attempt: earliest.attempt,
    max_retries: earliest.maxRetries,
    retry_delay_ms: earliest.retryAtMs - now,
    error_status: 429,
    error: "rate_limit",
  };
}
//@ chunk-0yw3taqg.js:656827-656882 placement
function usageLimitWaitsAfter(now) {
  return usageLimitWaits().filter((wait) => wait.retryAtMs > now);
}
//@ chunk-0yw3taqg.js:656882-656962 placement
function isUsageLimitWaitNoticeEnabled() {
  if (getAPIProvider() === "gateway") return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_sunset", true);
}
//@ chunk-0yw3taqg.js:656962-657067 placement
function teardownAutoReactAndRooms(options) {
  stopAllRunningTasks(options);
  let killed = killAutoReactSubscriptions(options.taskRegistry, {
    durable: false,
  });
  let drained = drainQueuedTaskNotifications(getProcessQueue(), {
    leaveArtifactRooms: true,
  });
  artifactWatchStopNotice(killed, drained);
}
//@ chunk-0yw3taqg.js:657067-657129 placement
var WAITING_STATE_NAMES = {
  running: "busy",
  requires_action: "waiting",
  idle: "idle",
};
//@ chunk-0yw3taqg.js:657129-657395 placement
function createWaitingStatusReporter(storageV5) {
  let last;
  return (state, details) => {
    {
      let name = WAITING_STATE_NAMES[state];
      let waitingFor =
        name !== "waiting"
          ? undefined
          : details?.tool_name === ASKUSERQUESTION || details?.tool_name.startsWith("dialog:")
            ? "input needed"
            : "permission prompt";
      let text = `${name}
${waitingFor ?? ""}`;
      if (text === last) return;
      last = text;
      updateSessionActivity(
        {
          status: name,
          waitingFor,
        },
        storageV5,
      ).then((ok) => {
        if (!ok && last === text) last = undefined;
      });
    }
  };
}
//@ chunk-0yw3taqg.js:657395-657531 placement
function createUserDecisionReporter(host, sessionState) {
  let pending = false;
  function update() {
    setWorking(host, pending && !sessionState.userDecisionPending);
  }
  sessionState.userDecisionPendingChanged.subscribe(update);
  return (next) => {
    pending = next;
    update();
  };
}
export {
  createUsageLimitWaitHeartbeat,
  createUserDecisionReporter,
  createWaitingStatusReporter,
  teardownAutoReactAndRooms,
};
