/**
 * screens/repl/wakeRouter.ts
 *
 * 2.1.316 新增。唤醒事件路由。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import {
  createDeliveredResultsTracker,
  buildTaskNotificationText,
  isRetryableAgentError,
  MAX_TRANSIENT_RESUME_RETRIES,
  jitteredBackoffMs,
  isResultOnlyTaskNotification,
  createStrandedResumeRetrier,
} from "../../cli/print/lowLatencySubmit.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  isResumeDenied,
  AgentStoppedByUserError,
  AgentResumePermanentlyRefusedError,
  ResumeAgentStateError,
  resumeAgentBackground,
} from "../../tools/AgentTool/resumeAgent.js";
import { logError } from "../../utils/log.js";
import { pruneSettledChildWork } from "../../tasks/LocalAgentTask/childWork.js";
import { releaseMainThreadContext } from "../../tasks/taskKinds.js";
import { errorMessage } from "../../utils/errors.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { strandedResumeFailedNotification } from "../../hooks/notifs/useIDEStatusIndicator.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";

//@ chunk-18hwfzwa.js:345665-345687 placement
var WAKE_TIMEOUT_MS = 60000;
var WAKE_RELEASE_TIMEOUT_MS = WAKE_TIMEOUT_MS;
//@ chunk-18hwfzwa.js:345687-347706 placement
/**
 * 唤醒路由：把 poll/monitor/artifact 等外部事件派发给对应代理（delivered_to_agent）或主线程，超时释放 inFlight，hook 可丢弃(dropped_by_hook)。
 */
function WakeRouter({ clock, store, queue, taskRegistry, dispatchWake }) {
  let ke = false;
  let Re = new Set();
  let Be = new Map();
  let He = new Map();
  let We = new Map();
  let deliveredResultsTracker = createDeliveredResultsTracker();
  let Xe = (kt) => {
    Be.delete(kt);
    if (ke || Re.has(kt)) return;
    let commandQueueSnapshot = queue.getCommandQueueSnapshot();
    let found = buildTaskNotificationText(commandQueueSnapshot, store.getState().tasks).find(
      (Lt) => Lt.agentId === kt,
    );
    if (!found || deliveredResultsTracker.holds(commandQueueSnapshot, found)) return;
    Re.add(kt);
    let Ot = clock.setTimeout(() => {
      logForDebugging(
        `[wakeRouter] dispatch for ${kt} exceeded ${WAKE_TIMEOUT_MS}ms; releasing inFlight reservation`,
        {
          level: "warn",
        },
      );
      Re.delete(kt);
    }, WAKE_TIMEOUT_MS);
    let Et = () => {
      queue.consume(found.consumedCommands, {
        reason: "delivered_to_agent",
      });
    };
    let Dt = "delivered";
    dispatchWake(
      kt,
      found.prompt,
      Et,
      found.resultsOnly,
      found.origin,
      found.noticeLengths,
      found.noticeOwn,
      found.noticeRunIds,
      found.toolsUsed,
    )
      .then((Lt) => {
        if (!isResumeDenied(Lt)) return;
        Dt = "dropped";
        try {
          queue.remove(found.consumedCommands, {
            reason: "dropped_by_hook",
          });
          deliveredResultsTracker.note(commandQueueSnapshot, kt);
          logForDebugging(
            `[wakeRouter] dropping ${found.consumedCommands.length} event(s) for ${kt}: ${Lt.deniedByPlugin}`,
          );
        } catch (error) {
          logError(error);
        }
      })
      .catch((error) => {
        let oo =
          error instanceof AgentStoppedByUserError || error instanceof AgentResumePermanentlyRefusedError;
        let Xt = !isRetryableAgentError(error) && (He.get(kt) ?? 0) + 1 >= MAX_TRANSIENT_RESUME_RETRIES;
        Dt = oo || Xt ? "dropped" : "retry";
        if (Dt === "dropped") {
          queue.remove(found.consumedCommands, {
            reason: oo ? "agent_stopped" : "resume_failed",
          });
          pruneSettledChildWork(kt, taskRegistry);
          releaseMainThreadContext(kt);
          logForDebugging(
            `[wakeRouter] dropping ${found.consumedCommands.length} event(s) for ${kt}: ${errorMessage(error)}`,
          );
        } else if (error instanceof ResumeAgentStateError)
          logForDebugging(`[wakeRouter] resume state error for ${kt}: ${errorMessage(error)}`);
        else logError(error);
      })
      .finally(() => {
        Ot();
        if (Dt !== "retry" || ke) {
          He.delete(kt);
          Re.delete(kt);
          if (Dt === "delivered") queue.recheckCommandQueue();
          return;
        }
        let Lt = (He.get(kt) ?? 0) + 1;
        He.set(kt, Lt);
        We.set(
          kt,
          clock.setTimeout(() => {
            We.delete(kt);
            Re.delete(kt);
            queue.recheckCommandQueue();
          }, jitteredBackoffMs(Lt)),
        );
      });
  };
  let dependencyWatcher = createDependencyWatcher(
    [queue, store],
    () => [queue.getCommandQueueSnapshot(), store.getState().tasks],
    (kt, At) => {
      if (kt.length === 0) return;
      let Ot = kt.some(
        (Et) =>
          Et.agentId &&
          !isMainAgentCommand(Et) &&
          (Et.mode === "task-notification" || isResultOnlyTaskNotification(Et)),
      )
        ? clock.setTimeout(() => {
            queue.recheckCommandQueue();
          }, WAKE_RELEASE_TIMEOUT_MS)
        : undefined;
      for (let { agentId } of buildTaskNotificationText(kt, At)) {
        if (Re.has(agentId) || Be.has(agentId)) continue;
        Be.set(agentId, setTimeout(Xe, 0, agentId));
      }
      return Ot;
    },
  );
  return () => {
    ke = true;
    dependencyWatcher();
    for (let kt of Be.values()) clearTimeout(kt);
    Be.clear();
    for (let kt of We.values()) kt();
    We.clear();
  };
}
//@ chunk-18hwfzwa.js:347706-348364 placement
function resumeStrandedAgent({
  taskRegistry,
  getToolUseContext,
  liveTranscript,
  getCanUseTool,
  addNotification,
}) {
  let strandedResumeRetrier = createStrandedResumeRetrier({
    taskRegistry,
    resume: async (Be, He, userInitiated) => {
      let ze = await resumeAgentBackground({
        agentId: Be,
        prompt: He.text,
        promptOrigin: He.origin,
        promptToolsUsed: He.toolsUsed,
        promptIsMeta: He.isMeta,
        toolUseContext: getToolUseContext(),
        liveTranscript,
        canUseTool: getCanUseTool(),
        userInitiated,
      });
      if (isResumeDenied(ze)) addNotification(strandedResumeFailedNotification(Be, ze.deniedByPlugin));
      return ze;
    },
    onFailed: (Be, He) => {
      if (isRetryableAgentError(He) || He instanceof AgentStoppedByUserError) return;
      if (He instanceof ResumeAgentStateError)
        logForDebugging(`stranded resume of ${Be} failed: ${errorMessage(He)}`, {
          level: "warn",
        });
      else logError(He);
      addNotification(strandedResumeFailedNotification(Be, errorMessage(He)));
    },
  });
  let Re = getTaskRunState().agentStrandedMessages.subscribe((Be) => {
    strandedResumeRetrier.dispatch(Be);
  });
  return () => {
    Re();
    strandedResumeRetrier.dispose();
  };
}
export { WakeRouter, resumeStrandedAgent };
