/**
 * screens/repl/wakeRouter.ts
 *
 * 2.1.316 新增。唤醒事件路由。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-czq1j3j2.js:383386-383408 placement
var WAKE_TIMEOUT_MS = 60000;
var WAKE_RELEASE_TIMEOUT_MS = WAKE_TIMEOUT_MS;
//@ chunk-czq1j3j2.js:383408-385428 placement
/**
 * 唤醒路由：把 poll/monitor/artifact 等外部事件派发给对应代理（delivered_to_agent）或主线程，超时释放 inFlight，hook 可丢弃(dropped_by_hook)。
 */
function WakeRouter({ clock, store, queue, taskRegistry, dispatchWake }) {
  let dispatched = false;
  let inFlight = new Set();
  let wakeTimers = new Map();
  let failureCounts = new Map();
  let unsubscribes = new Map();
  let deliveredResultsTracker = createDeliveredResultsTracker();
  let dispatchForAgent = (agentId) => {
    wakeTimers.delete(agentId);
    if (dispatched || inFlight.has(agentId)) return;
    let allMessages = queue.getCommandQueueSnapshot();
    let found = buildTaskNotificationText(allMessages, store.getState().tasks).find(
      (entry) => entry.agentId === agentId,
    );
    if (!found || deliveredResultsTracker.holds(allMessages, found)) return;
    inFlight.add(agentId);
    let timeoutHandle = clock.setTimeout(() => {
      logForDebugging(
        `[wakeRouter] dispatch for ${agentId} exceeded ${WAKE_TIMEOUT_MS}ms; releasing inFlight reservation`,
        {
          level: "warn",
        },
      );
      inFlight.delete(agentId);
    }, WAKE_TIMEOUT_MS);
    let consumeDelivered = () => {
      queue.consume(found.consumedCommands, {
        reason: "delivered_to_agent",
      });
    };
    let outcome = "delivered";
    dispatchWake(
      agentId,
      found.prompt,
      consumeDelivered,
      found.resultsOnly,
      found.origin,
      found.noticeLengths,
      found.noticeOwn,
      found.noticeRunIds,
      found.toolsUsed,
    )
      .then((dispatchResult) => {
        if (!isResumeDenied(dispatchResult)) return;
        outcome = "dropped";
        try {
          queue.remove(found.consumedCommands, {
            reason: "dropped_by_hook",
          });
          deliveredResultsTracker.note(allMessages, agentId);
          logForDebugging(
            `[wakeRouter] dropping ${found.consumedCommands.length} event(s) for ${agentId}: ${dispatchResult.deniedByPlugin}`,
          );
        } catch (error) {
          logError(error);
        }
      })
      .catch((error) => {
        let permanent =
          error instanceof AgentStoppedByUserError || error instanceof AgentResumePermanentlyRefusedError;
        let exhausted =
          !isRetryableAgentError(error) &&
          (failureCounts.get(agentId) ?? 0) + 1 >= MAX_TRANSIENT_RESUME_RETRIES;
        outcome = permanent || exhausted ? "dropped" : "retry";
        if (outcome === "dropped") {
          queue.remove(found.consumedCommands, {
            reason: permanent ? "agent_stopped" : "resume_failed",
          });
          pruneSettledChildWork(agentId, taskRegistry);
          releaseMainThreadContext(agentId);
          logForDebugging(
            `[wakeRouter] dropping ${found.consumedCommands.length} event(s) for ${agentId}: ${errorMessage(error)}`,
          );
        } else if (error instanceof ResumeAgentStateError)
          logForDebugging(`[wakeRouter] resume state error for ${agentId}: ${errorMessage(error)}`);
        else logError(error);
      })
      .finally(() => {
        timeoutHandle();
        if (outcome !== "retry" || dispatched) {
          failureCounts.delete(agentId);
          inFlight.delete(agentId);
          if (outcome === "delivered") queue.recheckCommandQueue();
          return;
        }
        let attempts = (failureCounts.get(agentId) ?? 0) + 1;
        failureCounts.set(agentId, attempts);
        unsubscribes.set(
          agentId,
          clock.setTimeout(() => {
            unsubscribes.delete(agentId);
            inFlight.delete(agentId);
            queue.recheckCommandQueue();
          }, jitteredBackoffMs(attempts)),
        );
      });
  };
  let dependencyWatcher = createDependencyWatcher(
    [queue, store],
    () => [queue.getCommandQueueSnapshot(), store.getState().tasks],
    (entries, tasks) => {
      if (entries.length === 0) return;
      let holdsAny = entries.some(
        (entry) =>
          entry.agentId &&
          !isMainAgentCommand(entry) &&
          (entry.mode === "task-notification" || isResultOnlyTaskNotification(entry)),
      )
        ? clock.setTimeout(() => {
            queue.recheckCommandQueue();
          }, WAKE_RELEASE_TIMEOUT_MS)
        : undefined;
      for (let { agentId } of buildTaskNotificationText(entries, tasks)) {
        if (inFlight.has(agentId) || wakeTimers.has(agentId)) continue;
        wakeTimers.set(agentId, setTimeout(dispatchForAgent, 0, agentId));
      }
      return holdsAny;
    },
  );
  return () => {
    dispatched = true;
    dependencyWatcher();
    for (let handle of wakeTimers.values()) clearTimeout(handle);
    wakeTimers.clear();
    for (let unsubscribe of unsubscribes.values()) unsubscribe();
    unsubscribes.clear();
  };
}
//@ chunk-czq1j3j2.js:385428-386086 placement
function resumeStrandedAgent({
  taskRegistry,
  getToolUseContext,
  liveTranscript,
  getCanUseTool,
  addNotification,
}) {
  let strandedResumeRetrier = createStrandedResumeRetrier({
    taskRegistry,
    resume: async (agent, args, userInitiated) => {
      let resumeResult = await resumeAgentBackground({
        agentId: agent,
        prompt: args.text,
        promptOrigin: args.origin,
        promptToolsUsed: args.toolsUsed,
        promptIsMeta: args.isMeta,
        toolUseContext: getToolUseContext(),
        liveTranscript,
        canUseTool: getCanUseTool(),
        userInitiated,
      });
      if (isResumeDenied(resumeResult))
        addNotification(strandedResumeFailedNotification(agent, resumeResult.deniedByPlugin));
      return resumeResult;
    },
    onFailed: (agentId, error) => {
      if (isRetryableAgentError(error) || error instanceof AgentStoppedByUserError) return;
      if (error instanceof ResumeAgentStateError)
        logForDebugging(`stranded resume of ${agentId} failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      else logError(error);
      addNotification(strandedResumeFailedNotification(agentId, errorMessage(error)));
    },
  });
  let unsubscribe = getTaskRunState().agentStrandedMessages.subscribe((messages) => {
    strandedResumeRetrier.dispatch(messages);
  });
  return () => {
    unsubscribe();
    strandedResumeRetrier.dispose();
  };
}
export { WakeRouter, resumeStrandedAgent };
