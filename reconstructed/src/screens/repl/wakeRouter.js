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
  _pt,
  bpt,
  jitteredBackoffMs,
  MLt,
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
import { $f } from "../../utils/messageQueueManager.js";
import { strandedResumeFailedNotification } from "../../hooks/notifs/useIDEStatusIndicator.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";

//@ chunk-18hwfzwa.js:345665-345687 placement
var Nae = 60000,
  ABt = Nae;
/**
 * 唤醒路由：把 poll/monitor/artifact 等外部事件派发给对应代理（delivered_to_agent）或主线程，超时释放 inFlight，hook 可丢弃(dropped_by_hook)。
 */
//@ chunk-18hwfzwa.js:345687-347706 placement
function WakeRouter({
  clock: clock,
  store: store,
  queue: queue,
  taskRegistry: taskRegistry,
  dispatchWake: dispatchWake,
}) {
  let ke = !1,
    Re = new Set(),
    Be = new Map(),
    He = new Map(),
    We = new Map(),
    ze = createDeliveredResultsTracker(),
    Xe = (kt) => {
      if ((Be.delete(kt), ke || Re.has(kt))) return;
      let commandQueueSnapshot = queue.getCommandQueueSnapshot(),
        found = buildTaskNotificationText(commandQueueSnapshot, store.getState().tasks).find(
          (Lt) => Lt.agentId === kt,
        );
      if (!found || ze.holds(commandQueueSnapshot, found)) return;
      Re.add(kt);
      let Ot = clock.setTimeout(() => {
          (logForDebugging(
            `[wakeRouter] dispatch for ${kt} exceeded ${Nae}ms; releasing inFlight reservation`,
            { level: "warn" },
          ),
            Re.delete(kt));
        }, Nae),
        Et = () => {
          queue.consume(found.consumedCommands, { reason: "delivered_to_agent" });
        },
        Dt = "delivered";
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
            (queue.remove(found.consumedCommands, { reason: "dropped_by_hook" }),
              ze.note(commandQueueSnapshot, kt),
              logForDebugging(
                `[wakeRouter] dropping ${found.consumedCommands.length} event(s) for ${kt}: ${Lt.deniedByPlugin}`,
              ));
          } catch (error) {
            logError(error);
          }
        })
        .catch((Lt) => {
          let oo = Lt instanceof AgentStoppedByUserError || Lt instanceof AgentResumePermanentlyRefusedError,
            Xt = !_pt(Lt) && (He.get(kt) ?? 0) + 1 >= bpt;
          if (((Dt = oo || Xt ? "dropped" : "retry"), Dt === "dropped"))
            (queue.remove(found.consumedCommands, { reason: oo ? "agent_stopped" : "resume_failed" }),
              pruneSettledChildWork(kt, taskRegistry),
              releaseMainThreadContext(kt),
              logForDebugging(
                `[wakeRouter] dropping ${found.consumedCommands.length} event(s) for ${kt}: ${errorMessage(Lt)}`,
              ));
          else if (Lt instanceof ResumeAgentStateError)
            logForDebugging(`[wakeRouter] resume state error for ${kt}: ${errorMessage(Lt)}`);
          else logError(Lt);
        })
        .finally(() => {
          if ((Ot(), Dt !== "retry" || ke)) {
            if ((He.delete(kt), Re.delete(kt), Dt === "delivered")) queue.recheckCommandQueue();
            return;
          }
          let Lt = (He.get(kt) ?? 0) + 1;
          (He.set(kt, Lt),
            We.set(
              kt,
              clock.setTimeout(() => {
                (We.delete(kt), Re.delete(kt), queue.recheckCommandQueue());
              }, jitteredBackoffMs(Lt)),
            ));
        });
    },
    rt = createDependencyWatcher(
      [queue, store],
      () => [queue.getCommandQueueSnapshot(), store.getState().tasks],
      (kt, At) => {
        if (kt.length === 0) return;
        let Ot = kt.some((Et) => Et.agentId && !$f(Et) && (Et.mode === "task-notification" || MLt(Et)))
          ? clock.setTimeout(() => {
              queue.recheckCommandQueue();
            }, ABt)
          : void 0;
        for (let { agentId: agentId } of buildTaskNotificationText(kt, At)) {
          if (Re.has(agentId) || Be.has(agentId)) continue;
          Be.set(agentId, setTimeout(Xe, 0, agentId));
        }
        return Ot;
      },
    );
  return () => {
    ((ke = !0), rt());
    for (let kt of Be.values()) clearTimeout(kt);
    Be.clear();
    for (let kt of We.values()) kt();
    We.clear();
  };
}
//@ chunk-18hwfzwa.js:347706-348364 placement
function resumeStrandedAgent({
  taskRegistry: taskRegistry,
  getToolUseContext: getToolUseContext,
  liveTranscript: liveTranscript,
  getCanUseTool: getCanUseTool,
  addNotification: addNotification,
}) {
  let ke = createStrandedResumeRetrier({
      taskRegistry: taskRegistry,
      resume: async (Be, He, We) => {
        let ze = await resumeAgentBackground({
          agentId: Be,
          prompt: He.text,
          promptOrigin: He.origin,
          promptToolsUsed: He.toolsUsed,
          promptIsMeta: He.isMeta,
          toolUseContext: getToolUseContext(),
          liveTranscript: liveTranscript,
          canUseTool: getCanUseTool(),
          userInitiated: We,
        });
        if (isResumeDenied(ze)) addNotification(strandedResumeFailedNotification(Be, ze.deniedByPlugin));
        return ze;
      },
      onFailed: (Be, He) => {
        if (_pt(He) || He instanceof AgentStoppedByUserError) return;
        if (He instanceof ResumeAgentStateError)
          logForDebugging(`stranded resume of ${Be} failed: ${errorMessage(He)}`, { level: "warn" });
        else logError(He);
        addNotification(strandedResumeFailedNotification(Be, errorMessage(He)));
      },
    }),
    subscribe = getTaskRunState().agentStrandedMessages.subscribe((Be) => {
      ke.dispatch(Be);
    });
  return () => {
    (subscribe(), ke.dispose());
  };
}

export { WakeRouter, resumeStrandedAgent };
