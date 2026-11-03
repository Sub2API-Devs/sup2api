/**
 * state/teammateViewHelpers.ts
 *
 * 队友/子代理转录视图的进入、退出与停止/移除，以及任务回收延时。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/teammateViewHelpers.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-6vnxsn99.js (5), chunk-e6aww6q8.js (8)
 * attribution: fingerprint 5, placement 4, sole-consumer 3, affinity 1, layout 1
 */
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { isCompletedBackgroundAgent, isMainSessionTask as isMainSessionTask_2 } from "../tasks/taskKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { mainAgentId } from "../bootstrap/state.js";
import { collectAncestorTaskIds } from "../components/CoordinatorAgentStatus.js";
import { isIdleCompletedSubagent } from "../tasks/LocalMainSessionTask.js";

//@ chunk-e6aww6q8.js:4005336-4005350 sole-consumer
var TEAMMATE_EVICT_DELAY_MS = 30000;
//@ chunk-e6aww6q8.js:4005350-4005439 sole-consumer = isLocalAgent (1)
function isLocalAgent_2(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_agent";
}
//@ chunk-e6aww6q8.js:4005439-4005562 sole-consumer = isInProcessTeammateTask (0.785)
/**
 * 是否是代理类任务（local_agent 或 in_process_teammate）。
 */
function isAgentOrTeammateTask(task) {
  return (
    typeof task === "object" &&
    task !== null &&
    "type" in task &&
    (task.type === "local_agent" || task.type === "in_process_teammate")
  );
}
//@ chunk-e6aww6q8.js:4005562-4005758 affinity
function markTaskForEviction(e) {
  if (e.type === "in_process_teammate")
    return {
      ...e,
      evictAfter: e.isIdle ? Date.now() + TEAMMATE_EVICT_DELAY_MS : undefined,
    };
  return {
    ...e,
    retain: false,
    diskLoaded: false,
    evictAfter:
      isTerminalTaskStatus(e.status) && !isCompletedBackgroundAgent(e)
        ? Date.now() + TEAMMATE_EVICT_DELAY_MS
        : undefined,
  };
}
//@ chunk-e6aww6q8.js:4005758-4006270 fingerprint = enterTeammateView (1)
/**
 * 切换到查看某个队友/子代理的转录视图，打 tengu_transcript_view_enter。
 */
function enterTeammateView(taskId, setAppState) {
  logEvent("tengu_transcript_view_enter", {});
  setAppState((prev) => {
    let task = prev.tasks[taskId];
    let prevId = prev.viewingAgentTaskId;
    let prevTask = prevId !== undefined ? prev.tasks[prevId] : undefined;
    let switching = prevId !== undefined && prevId !== taskId && isAgentOrTeammateTask(prevTask);
    let needsRetain =
      isAgentOrTeammateTask(task) &&
      ((isLocalAgent_2(task) && !task.retain) || task.evictAfter !== undefined);
    let needsView = prev.viewingAgentTaskId !== taskId || prev.viewSelectionMode !== "viewing-agent";
    if (!needsRetain && !needsView && !switching) return prev;
    let tasks = prev.tasks;
    if (switching || needsRetain) {
      tasks = {
        ...prev.tasks,
      };
      if (switching) tasks[prevId] = markTaskForEviction(prevTask);
      if (needsRetain)
        tasks[taskId] = isLocalAgent_2(task)
          ? {
              ...task,
              retain: true,
              evictAfter: undefined,
            }
          : {
              ...task,
              evictAfter: undefined,
            };
    }
    return {
      ...prev,
      viewingAgentTaskId: taskId,
      viewSelectionMode: "viewing-agent",
      tasks,
    };
  });
}
//@ chunk-e6aww6q8.js:4006270-4006551 fingerprint = exitTeammateView (0.91)
/**
 * 退出队友视图回到主线程，打 tengu_transcript_view_exit。
 */
function exitTeammateView(setAppState) {
  logEvent("tengu_transcript_view_exit", {});
  setAppState((prev) => {
    let id = prev.viewingAgentTaskId;
    let cleared = {
      ...prev,
      viewingAgentTaskId: undefined,
      viewSelectionMode: "none",
    };
    if (id === undefined) return prev.viewSelectionMode === "none" ? prev : cleared;
    let task = prev.tasks[id];
    if (!isAgentOrTeammateTask(task)) return cleared;
    return {
      ...cleared,
      tasks: {
        ...prev.tasks,
        [id]: markTaskForEviction(task),
      },
    };
  });
}
//@ chunk-e6aww6q8.js:4006551-4006649 layout
function isTaskFailedOrStopped({ status, error }) {
  return Boolean(error) || (status !== "running" && status !== "completed" && status !== "pending");
}
//@ chunk-e6aww6q8.js:4006649-4006927 fingerprint = stopOrDismissAgent (0.937)
/**
 * 运行中则停止该代理任务，否则从列表中移除。
 */
function stopOrDismissAgent(taskId, setAppState) {
  setAppState((prev) => {
    let task = prev.tasks[taskId];
    if (!isLocalAgent_2(task)) return prev;
    if (task.status === "running") return prev;
    if (task.evictAfter === 0) return prev;
    let viewingThis = prev.viewingAgentTaskId === taskId;
    return {
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...markTaskForEviction(task),
          evictAfter: 0,
        },
      },
      ...(viewingThis && {
        viewingAgentTaskId: undefined,
        viewSelectionMode: "none",
      }),
    };
  });
}
//@ chunk-6vnxsn99.js:70338-70426 fingerprint = isLocalAgent (1)
/**
 * 任务对象是否为本地子代理任务（type === 'local_agent'）。
 */
function isLocalAgent(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_agent";
}
//@ chunk-6vnxsn99.js:71957-72046 placement
function splitViewedTask(e) {
  let n = isInProcessTeammateTask(e) ? e : undefined;
  let localAgent = !n && isLocalAgent(e) ? e : undefined;
  return {
    teammate: n,
    localAgent,
  };
}
//@ chunk-6vnxsn99.js:72046-72089 placement
function viewedTaskParts(viewingAgentTaskId, tasks) {
  return splitViewedTask(viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined);
}
//@ chunk-6vnxsn99.js:72089-72163 placement
function viewedTaskId(e) {
  let { teammate, localAgent } = splitViewedTask(e);
  return (teammate ?? localAgent)?.id ?? mainAgentId();
}
//@ chunk-6vnxsn99.js:72163-72456 placement
/**
 * 由当前查看的任务计算转录视图状态：是否主会话/队友、消息、进行中的工具调用、会话键与是否加载中。
 */
function getViewedTranscriptState({ viewedTask, transcript, mainIsBusy, mainConversationId }) {
  let { teammate, localAgent } = splitViewedTask(viewedTask);
  let u = teammate ?? localAgent;
  return {
    task: u,
    isMain: !u,
    isTeammate: !!teammate,
    messages: transcript.messages,
    inProgressToolUseIDs: transcript.inProgressToolUseIDs,
    conversationKey: u ? u.id : mainConversationId,
    isLoading: u ? u.status === "running" && !u.isIdle : mainIsBusy,
  };
}
//@ chunk-18hwfzwa.js:812256-812465 fingerprint = release (0.781)
function release(tasks, viewingAgentTaskId) {
  let D;
  return Object.values(tasks).filter((L) => {
    if (!isMainSessionTask_2(L)) return false;
    if (!isTerminalTaskStatus(L.status)) return true;
    if (L.evictAfter !== undefined || L.retain === true) return true;
    if (D === undefined) D = collectAncestorTaskIds(tasks, viewingAgentTaskId);
    return D.has(L.id) || !isIdleCompletedSubagent(L);
  });
}
export {
  viewedTaskParts,
  isLocalAgent,
  enterTeammateView,
  exitTeammateView,
  isTaskFailedOrStopped,
  viewedTaskId,
  getViewedTranscriptState,
  stopOrDismissAgent,
  release,
};
