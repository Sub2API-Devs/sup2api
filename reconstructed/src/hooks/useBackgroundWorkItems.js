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
import { init_react_production, P, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { truncateWithEllipsis } from "../services/sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { finalizePendingAsyncHooks } from "../utils/hooks/AsyncHookRegistry.js";
import { isIdleTeammateTask } from "../tasks/taskKinds.js";
import { cleanTaskDescription } from "../utils/taskDescription.js";
import { hashString31 } from "../utils/pastedContent.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { summarizeBackgroundWork } from "../tasks/backgroundTaskLabels.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { todoToolsEnabled } from "../utils/sessionKind.js";
import { useTaskListSnapshot } from "./useTasksV2.js";
import { buildProgressSignature, publishSessionCronSnapshot } from "../services/daemon/sessionCron.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:1094819-1094823 placement
init_react_production();
//@ chunk-18hwfzwa.js:1094823-1094827 placement
init_react_production();
//@ chunk-18hwfzwa.js:1094827-1094839 placement
var PREVIEW_TEXT_MAX_LENGTH = 200;
//@ chunk-18hwfzwa.js:1094839-1094902 placement
function sanitizePreviewText(h) {
  return truncateWithEllipsis(redactSecrets(h).replace(/\s+/g, " ").trim(), PREVIEW_TEXT_MAX_LENGTH);
}
//@ chunk-18hwfzwa.js:1094959-1096710 sole-consumer
/**
 * 把后台任务表转成工作项列表：代理、工作流（按阶段拆开）、shell/monitor、MCP 任务各自生成 id、种类、标签、开始/结束时间与失败标记。
 */
function tasksToWorkItems(tasks) {
  let x = [];
  for (let D of Object.values(tasks)) {
    let L = finalizePendingAsyncHooks.has(D.status);
    switch (D.type) {
      case "local_agent":
      case "in_process_teammate":
        x.push({
          id: D.id,
          kind: "agent",
          label: sanitizePreviewText(D.description),
          startedAt: D.startTime,
          doneAt: D.endTime ?? (isIdleTeammateTask(D) ? 0 : undefined),
          failed: L || undefined,
        });
        break;
      case "local_workflow": {
        let filtered = D.workflowProgress.filter(isWorkflowAgentItem);
        if (filtered.length === 0) {
          x.push({
            id: D.id,
            kind: "workflow",
            label: sanitizePreviewText(D.title ?? D.workflowName ?? D.description),
            startedAt: D.startTime,
            doneAt: D.endTime,
            failed: L || undefined,
          });
          break;
        }
        for (let ke of filtered)
          x.push({
            id: ke.agentId ?? `${D.id}:${ke.index}`,
            kind: "workflow",
            label: sanitizePreviewText(ke.label),
            group: ke.phaseTitle,
            startedAt: ke.startedAt ?? ke.queuedAt ?? D.startTime,
            doneAt:
              ke.state === "done" || ke.state === "error"
                ? (ke.lastProgressAt ??
                  (ke.startedAt !== undefined && ke.durationMs !== undefined
                    ? ke.startedAt + ke.durationMs
                    : undefined))
                : undefined,
            failed: ke.state === "error" || undefined,
          });
        break;
      }
      case "local_bash":
        x.push({
          id: D.id,
          kind: D.kind === "monitor" ? "monitor" : "shell",
          label: sanitizePreviewText(D.kind === "monitor" ? D.description : D.command),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || undefined,
          ...(D.stopsOnExit && {
            stopsOnExit: true,
          }),
        });
        break;
      case "monitor_mcp":
        x.push({
          id: D.id,
          kind: "monitor",
          label: sanitizePreviewText(D.description || `${D.server} \xB7 ${D.tool}`),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || undefined,
        });
        break;
      case "monitor_ws":
        if (D.ambient) break;
        x.push({
          id: D.id,
          kind: "monitor",
          label: sanitizePreviewText(D.description || D.url),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || undefined,
        });
        break;
      case "mcp_task":
        x.push({
          id: D.id,
          kind: "mcp",
          label: sanitizePreviewText(
            D.statusMessage ??
              `${cleanTaskDescription(D.serverName) ?? ""} \xB7 ${cleanTaskDescription(D.toolName) ?? ""}`,
          ),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || D.mcpStatus === "failed" || undefined,
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
  return x;
}
//@ chunk-18hwfzwa.js:1096710-1096759 sole-consumer
function isWorkflowAgentItem(h) {
  return h.type === "workflow_agent";
}
//@ chunk-18hwfzwa.js:1096759-1097017 sole-consumer
function todosToWorkItems(h) {
  if (!h || h.length === 0) return [];
  return h.map((x) => ({
    id: `todo:${hashString31(x.content).toString(36)}`,
    kind: "todo",
    label: sanitizePreviewText(x.status === "in_progress" ? x.activeForm : x.content),
    startedAt: x.status === "pending" ? undefined : 0,
    doneAt: x.status === "completed" ? 0 : undefined,
  }));
}
//@ chunk-18hwfzwa.js:1097017-1097263 affinity
function tasksV2ToWorkItems(taskListSnapshot) {
  if (!taskListSnapshot || taskListSnapshot.length === 0) return [];
  return taskListSnapshot.map((x) => ({
    id: `todo:${x.id}`,
    kind: "todo",
    label: sanitizePreviewText(x.status === "in_progress" ? (x.activeForm ?? x.subject) : x.subject),
    startedAt: x.status === "pending" ? undefined : 0,
    doneAt: x.status === "completed" ? 0 : undefined,
  }));
}
//@ chunk-18hwfzwa.js:1097263-1097296 placement
function selectTasks3(oo) {
  return oo.tasks;
}
//@ chunk-18hwfzwa.js:1097296-1097326 placement
function selectId4(Xt) {
  return Xt.id;
}
//@ chunk-18hwfzwa.js:1097326-1098292 placement
function useBackgroundWorkItems() {
  let $ = w(18);
  let tasks = useAppState(selectTasks3);
  let x = summarizeBackgroundWork(tasks, {
    sessionCrons: false,
  });
  let mainThreadQueueLength = useCommandQueueOrDefault().getMainThreadQueueLength();
  let session = useSession(selectId4);
  let ke;
  if ($[0] !== session) {
    ke = (Re) => Re.todos[session];
    $[0] = session;
    $[1] = ke;
  } else ke = $[1];
  let appState = useAppState(ke);
  let He;
  if ($[2] !== appState) {
    He = todoToolsEnabled() ? appState : undefined;
    $[2] = appState;
    $[3] = He;
  } else He = $[3];
  let We = He;
  let taskListSnapshot = useTaskListSnapshot();
  let Xe;
  if ($[4] !== We || $[5] !== tasks || $[6] !== taskListSnapshot) {
    Xe = [...tasksToWorkItems(tasks), ...todosToWorkItems(We), ...tasksV2ToWorkItems(taskListSnapshot)];
    $[4] = We;
    $[5] = tasks;
    $[6] = taskListSnapshot;
    $[7] = Xe;
  } else Xe = $[7];
  let rt = Xe;
  let kt;
  if ($[8] !== rt) {
    kt = buildProgressSignature(rt);
    $[8] = rt;
    $[9] = kt;
  } else kt = $[9];
  let At = kt;
  let It;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    It = undefined?.join(`
`);
    $[10] = It;
  } else It = $[10];
  let Ot = It;
  const count = x.count;
  const joined = x.kinds.join(",");
  let Lt;
  if (
    $[11] !== x.count ||
    $[12] !== x.drainableMonitors ||
    $[13] !== At ||
    $[14] !== mainThreadQueueLength ||
    $[15] !== Ot ||
    $[16] !== joined
  ) {
    Lt = [count, mainThreadQueueLength, joined, x.drainableMonitors, At, Ot];
    $[11] = x.count;
    $[12] = x.drainableMonitors;
    $[13] = At;
    $[14] = mainThreadQueueLength;
    $[15] = Ot;
    $[16] = joined;
    $[17] = Lt;
  } else Lt = $[17];
  P(() => {
    publishSessionCronSnapshot({
      tasks: x.count,
      queued: mainThreadQueueLength,
      kinds: x.kinds,
      drainableMonitors: x.drainableMonitors,
      items: rt,
      ...false,
    });
  }, Lt);
  return null;
}
//@ chunk-18hwfzwa.js:1098292-1098296 placement
init_react_production();
//@ chunk-18hwfzwa.js:1098296-1098312 placement
var backgroundWorkSignal = qt(null);
//@ chunk-18hwfzwa.js:1098312-1098341 placement
function useBackgroundWorkSignal() {
  return Se(backgroundWorkSignal);
}
//@ chunk-18hwfzwa.js:1098341-1098345 placement
init_react_production();
//@ chunk-18hwfzwa.js:1098345-1098349 placement
init_react_production();
export { useBackgroundWorkSignal, useBackgroundWorkItems, backgroundWorkSignal };
