/**
 * state/teammateViewHelpers.ts
 *
 * 队友/子代理转录视图的进入、退出与停止/移除，以及任务回收延时。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/teammateViewHelpers.ts
 * pieces: chunk-01kgd7xg.js (5), chunk-5xgkngpb.js (8), chunk-czq1j3j2.js (1)
 * attribution: fingerprint 5, placement 4, sole-consumer 3, affinity 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { mainAgentId } from "../bootstrap/state.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { isCompletedBackgroundAgent, isMainSessionTask as isMainSessionTask_2 } from "../tasks/taskKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { collectAncestorTaskIds } from "../components/CoordinatorAgentStatus.js";
import { isIdleCompletedSubagent } from "../tasks/LocalMainSessionTask.js";

//@ chunk-01kgd7xg.js:71636-71724 fingerprint (2.1.88 match: isLocalAgent, 1)
/**
 * 任务对象是否为本地子代理任务（type === 'local_agent'）。
 */
function isLocalAgent(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_agent";
}
//@ chunk-01kgd7xg.js:73324-73413 placement
function splitViewedTask(task) {
  let teammate = isInProcessTeammateTask(task) ? task : undefined;
  let localAgent = !teammate && isLocalAgent(task) ? task : undefined;
  return {
    teammate,
    localAgent,
  };
}
//@ chunk-01kgd7xg.js:73413-73456 placement
function viewedTaskParts(viewingAgentTaskId, tasks) {
  return splitViewedTask(viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined);
}
//@ chunk-01kgd7xg.js:73456-73530 placement
function viewedTaskId(viewedTask) {
  let { teammate, localAgent } = splitViewedTask(viewedTask);
  return (teammate ?? localAgent)?.id ?? mainAgentId();
}
//@ chunk-01kgd7xg.js:73530-73823 placement
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
//@ chunk-5xgkngpb.js:4110802-4110816 sole-consumer
var TEAMMATE_EVICT_DELAY_MS = 30000;
//@ chunk-5xgkngpb.js:4110816-4110905 sole-consumer (2.1.88 match: isLocalAgent, 1)
function isLocalAgent_2(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_agent";
}
//@ chunk-5xgkngpb.js:4110905-4111028 sole-consumer (2.1.88 match: isInProcessTeammateTask, 0.786)
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
//@ chunk-5xgkngpb.js:4111028-4111224 affinity
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
//@ chunk-5xgkngpb.js:4111224-4111736 fingerprint (2.1.88 match: enterTeammateView, 1)
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
//@ chunk-5xgkngpb.js:4111736-4112017 fingerprint (2.1.88 match: exitTeammateView, 0.91)
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
//@ chunk-5xgkngpb.js:4112017-4112115 layout
function isTaskFailedOrStopped({ status, error }) {
  return Boolean(error) || (status !== "running" && status !== "completed" && status !== "pending");
}
//@ chunk-5xgkngpb.js:4112115-4112393 fingerprint (2.1.88 match: stopOrDismissAgent, 1)
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
//@ chunk-czq1j3j2.js:844979-845188 fingerprint (2.1.88 match: release, 0.781)
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
  isLocalAgent,
  isTaskFailedOrStopped,
  exitTeammateView,
  enterTeammateView,
  viewedTaskParts,
  viewedTaskId,
  getViewedTranscriptState,
  stopOrDismissAgent,
  release,
};
