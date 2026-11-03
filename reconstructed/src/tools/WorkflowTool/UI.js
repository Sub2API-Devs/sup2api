/**
 * tools/WorkflowTool/UI.tsx
 *
 * Workflow 工具界面（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9hy503gy.js (7)
 * attribution: placement 7
 */
import {
  collectWorkflowProgress,
  WorkflowProgressBody,
  countWorkflowAgents,
  noWorkflowFooter,
  WorkflowSummaryRow,
  phaseTitleSummary,
} from "../../components/workflow/WorkflowProgress.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { getFirstLine, plural } from "../../utils/stringUtils.js";
import { rs } from "../../state/AppState.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { wt } from "../../remote/remoteMode.js";
import { isWorkflowsAvailable, isProSubscriber } from "../../utils/workflows/workflowGates.js";
import { sessionWorkflowSize } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";

/**
 * 渲染 Workflow 工具运行中的进度：详细模式显示完整进度，否则显示一行摘要。
 */
//@ chunk-9hy503gy.js:6692-7020 placement
function renderToolUseProgressMessage(c, a) {
  let t = collectWorkflowProgress(c.map((d) => d.data));
  if (t.agents.length === 0 && t.logs.length === 0) return null;
  let m = Boolean(a?.verbose || a?.isTranscriptMode);
  if (m) {
    let d = a?.terminalSize?.columns ?? 80,
      min = Math.min(80, Math.max(40, d - 10));
    return e(MessageResponse, {
      children: e(WorkflowProgressBody, { collected: t, verbose: m, width: min }),
    });
  }
  return e(MessageResponse, { children: e(WorkflowProgressSummary, { collected: t }) });
}
/**
 * 工作流进度摘要行组件：完成数/总数、运行中数量、状态点（运行/完成/失败）与当前阶段标题。
 */
//@ chunk-9hy503gy.js:7020-7751 placement
function WorkflowProgressSummary(c) {
  let $ = w(23),
    { collected: collected } = c,
    counts;
  if ($[0] !== collected.agents)
    ((counts = countWorkflowAgents(collected.agents)), ($[0] = collected.agents), ($[1] = counts));
  else counts = $[1];
  let { done: d, failedCount: failedCount, running: running, total: total, complete: complete } = counts,
    dotState = failedCount > 0 ? "failed" : complete ? "done" : "running",
    k,
    u,
    g,
    W,
    p,
    R,
    T;
  if (
    $[2] !== collected ||
    $[3] !== complete ||
    $[4] !== d ||
    $[5] !== dotState ||
    $[6] !== running ||
    $[7] !== total
  ) {
    let M = noWorkflowFooter(collected);
    k = WorkflowSummaryRow;
    u = d;
    g = total;
    W = running;
    p = complete;
    R = dotState;
    T = M ? phaseTitleSummary(M) : void 0;
    (($[2] = collected),
      ($[3] = complete),
      ($[4] = d),
      ($[5] = dotState),
      ($[6] = running),
      ($[7] = total),
      ($[8] = k),
      ($[9] = u),
      ($[10] = g),
      ($[11] = W),
      ($[12] = p),
      ($[13] = R),
      ($[14] = T));
  } else ((k = $[8]), (u = $[9]), (g = $[10]), (W = $[11]), (p = $[12]), (R = $[13]), (T = $[14]));
  let U;
  if ($[15] !== k || $[16] !== u || $[17] !== g || $[18] !== W || $[19] !== p || $[20] !== R || $[21] !== T)
    ((U = e(k, { done: u, total: g, running: W, complete: p, dotState: R, phaseText: T })),
      ($[15] = k),
      ($[16] = u),
      ($[17] = g),
      ($[18] = W),
      ($[19] = p),
      ($[20] = R),
      ($[21] = T),
      ($[22] = U));
  else U = $[22];
  return U;
}
/**
 * 渲染 Workflow 工具结果：错误、已在云会话启动（附会话链接与警告），或后台任务行。
 */
//@ chunk-9hy503gy.js:7751-8232 placement
function renderToolResultMessage(c) {
  if (c.error)
    return e(MessageResponse, {
      children: r(Text, {
        color: "error",
        children: [e(StatusIcon, { status: "error", withSpace: !0 }), getFirstLine(c.error)],
      }),
    });
  if (c.status === "remote_launched")
    return e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          r(Text, {
            children: [
              e(Text, { dimColor: !0, children: "Running in cloud session \xB7 " }),
              e(Text, { color: "suggestion", children: c.sessionUrl }),
            ],
          }),
          c.warning
            ? r(Text, {
                color: "warning",
                children: [e(StatusIcon, { status: "warning", withSpace: !0 }), c.warning],
              })
            : null,
        ],
      }),
    });
  return e(WorkflowTaskRow, { taskId: c.taskId });
}
//@ chunk-9hy503gy.js:8232-9910 placement
function WorkflowTaskRow(c) {
  let t = w(23),
    { taskId: taskId } = c,
    m;
  if (t[0] !== taskId) ((m = (d) => d.tasks[taskId]), (t[0] = taskId), (t[1] = m));
  else m = t[1];
  let o = rs(m);
  if (
    o?.type === "local_workflow" &&
    (o.status === "completed" || o.status === "failed" || o.status === "killed")
  ) {
    let i;
    if (t[2] !== o.endTime || t[3] !== o.startTime)
      ((i = o.endTime && o.startTime ? formatDuration(o.endTime - o.startTime) : void 0),
        (t[2] = o.endTime),
        (t[3] = o.startTime),
        (t[4] = i));
    else i = t[4];
    let x = i;
    let f = o.status === "failed";
    let C = o.status === "killed";
    const k = f || C ? "error" : "success";
    let u;
    if (t[5] !== k) ((u = e(StatusIcon, { status: k, withSpace: !0 })), (t[5] = k), (t[6] = u));
    else u = t[6];
    const g = f ? "Failed" : C ? "Stopped" : "Completed";
    const W = x && ` in ${x}`;
    let p;
    if (t[7] !== o.agentCount)
      ((p = o.agentCount > 0 && ` \xB7 ${o.agentCount} ${plural(o.agentCount, "agent")}`),
        (t[7] = o.agentCount),
        (t[8] = p));
    else p = t[8];
    let R;
    if (t[9] !== o.totalTokens)
      ((R = o.totalTokens > 0 && ` \xB7 ${formatTokens(o.totalTokens)} tokens`),
        (t[9] = o.totalTokens),
        (t[10] = R));
    else R = t[10];
    let T;
    if (t[11] !== g || t[12] !== W || t[13] !== p || t[14] !== R)
      ((T = r(Text, { dimColor: !0, children: [g, W, p, R] })),
        (t[11] = g),
        (t[12] = W),
        (t[13] = p),
        (t[14] = R),
        (t[15] = T));
    else T = t[15];
    let M;
    if (t[16] !== u || t[17] !== T)
      ((M = e(MessageResponse, { children: r(Text, { children: [u, T] }) })),
        (t[16] = u),
        (t[17] = T),
        (t[18] = M));
    else M = t[18];
    return M;
  }
  if (o?.type === "local_workflow") {
    let i;
    if (t[19] === MEMO_CACHE_SENTINEL)
      ((i = e(MessageResponse, {
        children: r(Text, {
          children: [
            e(Text, { dimColor: !0, children: "Running in background \xB7 " }),
            e(Text, { color: "suggestion", children: "/workflows" }),
            e(Text, { dimColor: !0, children: " to monitor and save" }),
            e(WorkflowSizeNote, {}),
          ],
        }),
      })),
        (t[19] = i));
    else i = t[19];
    return i;
  }
  if (wt()) {
    let i;
    if (t[20] !== taskId) ((i = e(WorkflowMonitorHint, { taskId: taskId })), (t[20] = taskId), (t[21] = i));
    else i = t[21];
    return i;
  }
  let i;
  if (t[22] === MEMO_CACHE_SENTINEL)
    ((i = e(MessageResponse, {
      children: r(Text, {
        children: [
          e(Text, { color: "suggestion", children: "/workflows" }),
          e(Text, { dimColor: !0, children: " to view dynamic workflow runs" }),
        ],
      }),
    })),
      (t[22] = i));
  else i = t[22];
  return i;
}
/**
 * 工作流任务的查看提示：后台运行时提示用 /workflows（或 /tasks）监控，否则提示查看运行中的动态工作流。
 */
//@ chunk-9hy503gy.js:9910-10553 placement
function WorkflowMonitorHint(c) {
  let $ = w(10),
    { taskId: taskId } = c,
    m;
  if ($[0] !== taskId)
    ((m = (d) =>
      !d.remoteWorkerReportedGone &&
      d.remoteBackgroundTasks.some((remoteBackgroundTask) => remoteBackgroundTask.id === taskId)),
      ($[0] = taskId),
      ($[1] = m));
  else m = $[1];
  let isRemote = rs(m),
    workflowsAvailable = isWorkflowsAvailable(),
    f;
  if ($[2] !== isRemote)
    ((f = isRemote && e(Text, { dimColor: !0, children: "Running in background \xB7 " })),
      ($[2] = isRemote),
      ($[3] = f));
  else f = $[3];
  let C;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((C = e(Text, { color: "suggestion", children: workflowsAvailable ? "/workflows" : "/tasks" })),
      ($[4] = C));
  else C = $[4];
  const k = !isRemote
    ? " to view running dynamic workflows"
    : workflowsAvailable
      ? " to monitor"
      : " to view";
  let u;
  if ($[5] !== k) ((u = e(Text, { dimColor: !0, children: k })), ($[5] = k), ($[6] = u));
  else u = $[6];
  let g;
  if ($[7] !== f || $[8] !== u)
    ((g = e(MessageResponse, { children: r(Text, { children: [f, C, u] }) })),
      ($[7] = f),
      ($[8] = u),
      ($[9] = g));
  else g = $[9];
  return g;
}
/**
 * 默认工作流规模的附注：显示当前规模并提示可在 /config 修改（非默认或不受限时不显示）。
 */
//@ chunk-9hy503gy.js:10553-10909 placement
function WorkflowSizeNote() {
  let c = w(2),
    a;
  if (c[0] === MEMO_CACHE_SENTINEL)
    ((a = sessionWorkflowSize(getGlobalConfig().workflowSizeGuideline, isProSubscriber())), (c[0] = a));
  else a = c[0];
  let { size: size, isDefault: isDefault } = a;
  if (!isDefault || size === "unrestricted") {
    return null;
  }
  let d;
  if (c[1] === MEMO_CACHE_SENTINEL)
    ((d = r(Fragment, {
      children: [
        r(Text, { dimColor: !0, children: [" \xB7 ", size, " size ("] }),
        e(Text, { color: "suggestion", children: "/config" }),
        e(Text, { dimColor: !0, children: ")" }),
      ],
    })),
      (c[1] = d));
  else d = c[1];
  return d;
}
//@ chunk-9hy503gy.js:10909-11004 placement
function pe() {
  return e(MessageResponse, { children: e(Text, { dimColor: !0, children: "Dynamic workflow cancelled" }) });
}
