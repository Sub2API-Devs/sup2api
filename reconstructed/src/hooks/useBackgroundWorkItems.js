/**
 * hooks/useBackgroundWorkItems.ts
 *
 * 2.1.316 新增。后台工作项列表 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: sole-consumer 3, affinity 1, placement 8
 */
import { finalizePendingAsyncHooks } from "../utils/hooks/AsyncHookRegistry.js";
import { xC } from "./_new/useBackgroundWorkItems.helpers-18hw.js";
import { isIdleTeammateTask } from "../tasks/taskKinds.js";
import { vc } from "../utils/taskDescription.js";
import { zhe } from "../utils/pastedContent.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { summarizeBackgroundWork } from "../tasks/backgroundTaskLabels.js";
import { Nu } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { todoToolsEnabled } from "../utils/sessionKind.js";
import { gye } from "./useTasksV2.js";
import { buildProgressSignature, kKo } from "../services/daemon/sessionCron.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { P, j, qt, Se } from "../../vendor/react/cjs/react.production.js";

/**
 * 把后台任务表转成工作项列表：代理、工作流（按阶段拆开）、shell/monitor、MCP 任务各自生成 id、种类、标签、开始/结束时间与失败标记。
 */
//@ chunk-18hwfzwa.js:1094959-1096710 sole-consumer
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
          label: xC(D.description),
          startedAt: D.startTime,
          doneAt: D.endTime ?? (isIdleTeammateTask(D) ? 0 : void 0),
          failed: L || void 0,
        });
        break;
      case "local_workflow": {
        let filtered = D.workflowProgress.filter(rwo);
        if (filtered.length === 0) {
          x.push({
            id: D.id,
            kind: "workflow",
            label: xC(D.title ?? D.workflowName ?? D.description),
            startedAt: D.startTime,
            doneAt: D.endTime,
            failed: L || void 0,
          });
          break;
        }
        for (let ke of filtered)
          x.push({
            id: ke.agentId ?? `${D.id}:${ke.index}`,
            kind: "workflow",
            label: xC(ke.label),
            group: ke.phaseTitle,
            startedAt: ke.startedAt ?? ke.queuedAt ?? D.startTime,
            doneAt:
              ke.state === "done" || ke.state === "error"
                ? (ke.lastProgressAt ??
                  (ke.startedAt !== void 0 && ke.durationMs !== void 0
                    ? ke.startedAt + ke.durationMs
                    : void 0))
                : void 0,
            failed: ke.state === "error" || void 0,
          });
        break;
      }
      case "local_bash":
        x.push({
          id: D.id,
          kind: D.kind === "monitor" ? "monitor" : "shell",
          label: xC(D.kind === "monitor" ? D.description : D.command),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || void 0,
          ...(D.stopsOnExit && { stopsOnExit: !0 }),
        });
        break;
      case "monitor_mcp":
        x.push({
          id: D.id,
          kind: "monitor",
          label: xC(D.description || `${D.server} \xB7 ${D.tool}`),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || void 0,
        });
        break;
      case "monitor_ws":
        if (D.ambient) break;
        x.push({
          id: D.id,
          kind: "monitor",
          label: xC(D.description || D.url),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || void 0,
        });
        break;
      case "mcp_task":
        x.push({
          id: D.id,
          kind: "mcp",
          label: xC(D.statusMessage ?? `${vc(D.serverName) ?? ""} \xB7 ${vc(D.toolName) ?? ""}`),
          startedAt: D.startTime,
          doneAt: D.endTime,
          failed: L || D.mcpStatus === "failed" || void 0,
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
function rwo(h) {
  return h.type === "workflow_agent";
}
//@ chunk-18hwfzwa.js:1096759-1097017 sole-consumer
function todosToWorkItems(h) {
  if (!h || h.length === 0) return [];
  return h.map((x) => ({
    id: `todo:${zhe(x.content).toString(36)}`,
    kind: "todo",
    label: xC(x.status === "in_progress" ? x.activeForm : x.content),
    startedAt: x.status === "pending" ? void 0 : 0,
    doneAt: x.status === "completed" ? 0 : void 0,
  }));
}
//@ chunk-18hwfzwa.js:1097017-1097263 affinity
function tasksV2ToWorkItems(h) {
  if (!h || h.length === 0) return [];
  return h.map((x) => ({
    id: `todo:${x.id}`,
    kind: "todo",
    label: xC(x.status === "in_progress" ? (x.activeForm ?? x.subject) : x.subject),
    startedAt: x.status === "pending" ? void 0 : 0,
    doneAt: x.status === "completed" ? 0 : void 0,
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
  let $ = w(18),
    h = useAppState(selectTasks3),
    x = summarizeBackgroundWork(h, { sessionCrons: !1 }),
    mainThreadQueueLength = Nu().getMainThreadQueueLength(),
    L = useSession(selectId4),
    ke;
  if ($[0] !== L) ((ke = (Re) => Re.todos[L]), ($[0] = L), ($[1] = ke));
  else ke = $[1];
  let Be = useAppState(ke),
    He;
  if ($[2] !== Be) ((He = todoToolsEnabled() ? Be : void 0), ($[2] = Be), ($[3] = He));
  else He = $[3];
  let We = He,
    ze = gye(),
    Xe;
  if ($[4] !== We || $[5] !== h || $[6] !== ze)
    ((Xe = [...tasksToWorkItems(h), ...todosToWorkItems(We), ...tasksV2ToWorkItems(ze)]),
      ($[4] = We),
      ($[5] = h),
      ($[6] = ze),
      ($[7] = Xe));
  else Xe = $[7];
  let rt = Xe,
    kt;
  if ($[8] !== rt) ((kt = buildProgressSignature(rt)), ($[8] = rt), ($[9] = kt));
  else kt = $[9];
  let At = kt,
    It;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((It = (void 0)?.join(`
`)),
      ($[10] = It));
  else It = $[10];
  let Ot = It;
  const count = x.count,
    joined = x.kinds.join(",");
  let Lt;
  if (
    $[11] !== x.count ||
    $[12] !== x.drainableMonitors ||
    $[13] !== At ||
    $[14] !== mainThreadQueueLength ||
    $[15] !== Ot ||
    $[16] !== joined
  )
    ((Lt = [count, mainThreadQueueLength, joined, x.drainableMonitors, At, Ot]),
      ($[11] = x.count),
      ($[12] = x.drainableMonitors),
      ($[13] = At),
      ($[14] = mainThreadQueueLength),
      ($[15] = Ot),
      ($[16] = joined),
      ($[17] = Lt));
  else Lt = $[17];
  return (
    P(() => {
      kKo({
        tasks: x.count,
        queued: mainThreadQueueLength,
        kinds: x.kinds,
        drainableMonitors: x.drainableMonitors,
        items: rt,
        ...!1,
      });
    }, Lt),
    null
  );
}
//@ chunk-18hwfzwa.js:1098292-1098296 placement
j();
//@ chunk-18hwfzwa.js:1098296-1098312 placement
var b8 = qt(null);
//@ chunk-18hwfzwa.js:1098312-1098341 placement
function NCe() {
  return Se(b8);
}
//@ chunk-18hwfzwa.js:1098341-1098345 placement
j();
//@ chunk-18hwfzwa.js:1098345-1098349 placement
j();

export { NCe, useBackgroundWorkItems, b8 };
