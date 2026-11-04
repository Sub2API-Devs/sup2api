/**
 * hooks/useBackgroundWorkItems.ts
 *
 * 2.1.316 新增。后台工作项列表 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 12, sole-consumer 3, affinity 1
 */
import {
  init_react_production,
  useEffect,
  createContext,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
import { truncateWithEllipsis } from "../services/sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { finalizePendingAsyncHooks } from "../utils/hooks/AsyncHookRegistry.js";
import { isIdleTeammateTask } from "../tasks/taskKinds.js";
import { cleanTaskDescription } from "../utils/taskDescription.js";
import { hashString31 } from "../utils/pastedContent.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { summarizeBackgroundWork } from "../tasks/backgroundTaskLabels.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { todoToolsEnabled } from "../utils/sessionKind.js";
import { useTaskListSnapshot } from "./useTasksV2.js";
import { buildProgressSignature, publishSessionCronSnapshot } from "../services/daemon/sessionCron.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1094819-1094823 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1094819", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1094823-1094827 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1094823", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1094827-1094839 placement
var PREVIEW_TEXT_MAX_LENGTH = 200;
//@ chunk-18hwfzwa.js:1094839-1094902 placement
function sanitizePreviewText(text) {
  return truncateWithEllipsis(redactSecrets(text).replace(/\s+/g, " ").trim(), PREVIEW_TEXT_MAX_LENGTH);
}
//@ chunk-18hwfzwa.js:1094959-1096710 sole-consumer
/**
 * 把后台任务表转成工作项列表：代理、工作流（按阶段拆开）、shell/monitor、MCP 任务各自生成 id、种类、标签、开始/结束时间与失败标记。
 */
function tasksToWorkItems(tasks) {
  let items = [];
  for (let task of Object.values(tasks)) {
    let isFailed = finalizePendingAsyncHooks.has(task.status);
    switch (task.type) {
      case "local_agent":
      case "in_process_teammate":
        items.push({
          id: task.id,
          kind: "agent",
          label: sanitizePreviewText(task.description),
          startedAt: task.startTime,
          doneAt: task.endTime ?? (isIdleTeammateTask(task) ? 0 : undefined),
          failed: isFailed || undefined,
        });
        break;
      case "local_workflow": {
        let filtered = task.workflowProgress.filter(isWorkflowAgentItem);
        if (filtered.length === 0) {
          items.push({
            id: task.id,
            kind: "workflow",
            label: sanitizePreviewText(task.title ?? task.workflowName ?? task.description),
            startedAt: task.startTime,
            doneAt: task.endTime,
            failed: isFailed || undefined,
          });
          break;
        }
        for (let agentItem of filtered)
          items.push({
            id: agentItem.agentId ?? `${task.id}:${agentItem.index}`,
            kind: "workflow",
            label: sanitizePreviewText(agentItem.label),
            group: agentItem.phaseTitle,
            startedAt: agentItem.startedAt ?? agentItem.queuedAt ?? task.startTime,
            doneAt:
              agentItem.state === "done" || agentItem.state === "error"
                ? (agentItem.lastProgressAt ??
                  (agentItem.startedAt !== undefined && agentItem.durationMs !== undefined
                    ? agentItem.startedAt + agentItem.durationMs
                    : undefined))
                : undefined,
            failed: agentItem.state === "error" || undefined,
          });
        break;
      }
      case "local_bash":
        items.push({
          id: task.id,
          kind: task.kind === "monitor" ? "monitor" : "shell",
          label: sanitizePreviewText(task.kind === "monitor" ? task.description : task.command),
          startedAt: task.startTime,
          doneAt: task.endTime,
          failed: isFailed || undefined,
          ...(task.stopsOnExit && {
            stopsOnExit: true,
          }),
        });
        break;
      case "monitor_mcp":
        items.push({
          id: task.id,
          kind: "monitor",
          label: sanitizePreviewText(task.description || `${task.server} \xB7 ${task.tool}`),
          startedAt: task.startTime,
          doneAt: task.endTime,
          failed: isFailed || undefined,
        });
        break;
      case "monitor_ws":
        if (task.ambient) break;
        items.push({
          id: task.id,
          kind: "monitor",
          label: sanitizePreviewText(task.description || task.url),
          startedAt: task.startTime,
          doneAt: task.endTime,
          failed: isFailed || undefined,
        });
        break;
      case "mcp_task":
        items.push({
          id: task.id,
          kind: "mcp",
          label: sanitizePreviewText(
            task.statusMessage ??
              `${cleanTaskDescription(task.serverName) ?? ""} \xB7 ${cleanTaskDescription(task.toolName) ?? ""}`,
          ),
          startedAt: task.startTime,
          doneAt: task.endTime,
          failed: isFailed || task.mcpStatus === "failed" || undefined,
        });
        break;
      case "remote_agent":
      case "dream":
      case "auto_mode_scan":
      case "local_memory_import":
      case "post_turn_memory":
        break;
      default:
    }
  }
  return items;
}
//@ chunk-18hwfzwa.js:1096710-1096759 sole-consumer
function isWorkflowAgentItem(item) {
  return item.type === "workflow_agent";
}
//@ chunk-18hwfzwa.js:1096759-1097017 sole-consumer
function todosToWorkItems(todos) {
  if (!todos || todos.length === 0) return [];
  return todos.map((todo) => ({
    id: `todo:${hashString31(todo.content).toString(36)}`,
    kind: "todo",
    label: sanitizePreviewText(todo.status === "in_progress" ? todo.activeForm : todo.content),
    startedAt: todo.status === "pending" ? undefined : 0,
    doneAt: todo.status === "completed" ? 0 : undefined,
  }));
}
//@ chunk-18hwfzwa.js:1097017-1097263 affinity
function tasksV2ToWorkItems(taskListSnapshot) {
  if (!taskListSnapshot || taskListSnapshot.length === 0) return [];
  return taskListSnapshot.map((task) => ({
    id: `todo:${task.id}`,
    kind: "todo",
    label: sanitizePreviewText(
      task.status === "in_progress" ? (task.activeForm ?? task.subject) : task.subject,
    ),
    startedAt: task.status === "pending" ? undefined : 0,
    doneAt: task.status === "completed" ? 0 : undefined,
  }));
}
//@ chunk-18hwfzwa.js:1097263-1097296 placement
function selectTasks3(state) {
  return state.tasks;
}
//@ chunk-18hwfzwa.js:1097296-1097326 placement
function selectId4(session) {
  return session.id;
}
//@ chunk-18hwfzwa.js:1097326-1098292 placement
function useBackgroundWorkItems() {
  let $ = useMemoCache(18);
  let tasks = useAppState(selectTasks3);
  let summary = summarizeBackgroundWork(tasks, {
    sessionCrons: false,
  });
  let mainThreadQueueLength = useCommandQueueOrDefault().getMainThreadQueueLength();
  let session = useSession(selectId4);
  let selectTodos;
  if ($[0] !== session) {
    selectTodos = (state) => state.todos[session];
    $[0] = session;
    $[1] = selectTodos;
  } else selectTodos = $[1];
  let appState = useAppState(selectTodos);
  let todos;
  if ($[2] !== appState) {
    todos = todoToolsEnabled() ? appState : undefined;
    $[2] = appState;
    $[3] = todos;
  } else todos = $[3];
  let todos_2 = todos;
  let taskListSnapshot = useTaskListSnapshot();
  let items;
  if ($[4] !== todos_2 || $[5] !== tasks || $[6] !== taskListSnapshot) {
    items = [
      ...tasksToWorkItems(tasks),
      ...todosToWorkItems(todos_2),
      ...tasksV2ToWorkItems(taskListSnapshot),
    ];
    $[4] = todos_2;
    $[5] = tasks;
    $[6] = taskListSnapshot;
    $[7] = items;
  } else items = $[7];
  let workItems = items;
  let signature;
  if ($[8] !== workItems) {
    signature = buildProgressSignature(workItems);
    $[8] = workItems;
    $[9] = signature;
  } else signature = $[9];
  let progressSignature = signature;
  let joinedKinds;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    joinedKinds = undefined?.join(`
`);
    $[10] = joinedKinds;
  } else joinedKinds = $[10];
  let kindsText = joinedKinds;
  const count = summary.count;
  const joined = summary.kinds.join(",");
  let effectDeps;
  if (
    $[11] !== summary.count ||
    $[12] !== summary.drainableMonitors ||
    $[13] !== progressSignature ||
    $[14] !== mainThreadQueueLength ||
    $[15] !== kindsText ||
    $[16] !== joined
  ) {
    effectDeps = [
      count,
      mainThreadQueueLength,
      joined,
      summary.drainableMonitors,
      progressSignature,
      kindsText,
    ];
    $[11] = summary.count;
    $[12] = summary.drainableMonitors;
    $[13] = progressSignature;
    $[14] = mainThreadQueueLength;
    $[15] = kindsText;
    $[16] = joined;
    $[17] = effectDeps;
  } else effectDeps = $[17];
  useEffect(() => {
    publishSessionCronSnapshot({
      tasks: summary.count,
      queued: mainThreadQueueLength,
      kinds: summary.kinds,
      drainableMonitors: summary.drainableMonitors,
      items: workItems,
      ...false,
    });
  }, effectDeps);
  return null;
}
//@ chunk-18hwfzwa.js:1098292-1098296 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1098292", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1098296-1098312 placement
var backgroundWorkSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1098296", () => {
  backgroundWorkSignal = createContext(null);
});
//@ chunk-18hwfzwa.js:1098312-1098341 placement
function useBackgroundWorkSignal() {
  return useContext(backgroundWorkSignal);
}
//@ chunk-18hwfzwa.js:1098341-1098345 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1098341", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1098345-1098349 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1098345", () => {
  init_react_production();
});
export { useBackgroundWorkSignal, useBackgroundWorkItems, backgroundWorkSignal };
