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
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { mainAgentId } from "../bootstrap/state.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { isCompletedBackgroundAgent, isMainSessionTask as isMainSessionTask_2 } from "../tasks/taskKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { collectAncestorTaskIds } from "../components/CoordinatorAgentStatus.js";
import { isIdleCompletedSubagent } from "../tasks/LocalMainSessionTask.js";

//@ chunk-6vnxsn99.js:70338-70426 fingerprint (2.1.88 match: isLocalAgent, 1)
/**
 * 任务对象是否为本地子代理任务（type === 'local_agent'）。
 */
function isLocalAgent(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_agent";
}
//@ chunk-6vnxsn99.js:71957-72046 placement
function splitViewedTask(task) {
  let teammate = isInProcessTeammateTask(task) ? task : undefined;
  let localAgent = !teammate && isLocalAgent(task) ? task : undefined;
  return {
    teammate,
    localAgent,
  };
}
//@ chunk-6vnxsn99.js:72046-72089 placement
function viewedTaskParts(viewingAgentTaskId, tasks) {
  return splitViewedTask(viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined);
}
//@ chunk-6vnxsn99.js:72089-72163 placement
function viewedTaskId(viewedTask) {
  let { teammate, localAgent } = splitViewedTask(viewedTask);
  return (teammate ?? localAgent)?.id ?? mainAgentId();
}
//@ chunk-6vnxsn99.js:72163-72456 placement
/**
 * 由当前查看的任务计算转录视图状态：是否主会话/队友、消息、进行中的工具调用、会话键与是否加载中。
 */
function getViewedTranscriptState({ viewedTask, transcript, mainIsBusy, mainConversationId }) {
  let { teammate, localAgent } = splitViewedTask(viewedTask);
  let task = teammate ?? localAgent;
  return {
    task,
    isMain: !task,
    isTeammate: !!teammate,
    messages: transcript.messages,
    inProgressToolUseIDs: transcript.inProgressToolUseIDs,
    conversationKey: task ? task.id : mainConversationId,
    isLoading: task ? task.status === "running" && !task.isIdle : mainIsBusy,
  };
}
//@ chunk-e6aww6q8.js:4005336-4005350 sole-consumer
var TEAMMATE_EVICT_DELAY_MS = 30000;
//@ chunk-e6aww6q8.js:4005350-4005439 sole-consumer (2.1.88 match: isLocalAgent, 1)
function isLocalAgent_2(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_agent";
}
//@ chunk-e6aww6q8.js:4005439-4005562 sole-consumer (2.1.88 match: isInProcessTeammateTask, 0.785)
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
function markTaskForEviction(task) {
  if (task.type === "in_process_teammate")
    return {
      ...task,
      evictAfter: task.isIdle ? Date.now() + TEAMMATE_EVICT_DELAY_MS : undefined,
    };
  return {
    ...task,
    retain: false,
    diskLoaded: false,
    evictAfter:
      isTerminalTaskStatus(task.status) && !isCompletedBackgroundAgent(task)
        ? Date.now() + TEAMMATE_EVICT_DELAY_MS
        : undefined,
  };
}
//@ chunk-e6aww6q8.js:4005758-4006270 fingerprint (2.1.88 match: enterTeammateView, 1)
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
//@ chunk-e6aww6q8.js:4006270-4006551 fingerprint (2.1.88 match: exitTeammateView, 0.91)
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
//@ chunk-e6aww6q8.js:4006649-4006927 fingerprint (2.1.88 match: stopOrDismissAgent, 0.937)
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
//@ chunk-18hwfzwa.js:812256-812465 fingerprint (2.1.88 match: release, 0.781)
function release(tasks, viewingAgentTaskId) {
  let ancestorIds;
  return Object.values(tasks).filter((task) => {
    if (!isMainSessionTask_2(task)) return false;
    if (!isTerminalTaskStatus(task.status)) return true;
    if (task.evictAfter !== undefined || task.retain === true) return true;
    if (ancestorIds === undefined) ancestorIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
    return ancestorIds.has(task.id) || !isIdleCompletedSubagent(task);
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
