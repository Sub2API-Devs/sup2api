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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { getFirstLine, plural } from "../../utils/stringUtils.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isWorkflowsAvailable, isProSubscriber } from "../../utils/workflows/workflowGates.js";
import { sessionWorkflowSize } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";

//@ chunk-9hy503gy.js:6692-7020 placement
/**
 * 渲染 Workflow 工具运行中的进度：详细模式显示完整进度，否则显示一行摘要。
 */
function renderToolUseProgressMessage(c, a) {
  let workflowProgress = collectWorkflowProgress(c.map((d) => d.data));
  if (workflowProgress.agents.length === 0 && workflowProgress.logs.length === 0) return null;
  let m = Boolean(a?.verbose || a?.isTranscriptMode);
  if (m) {
    let columns = a?.terminalSize?.columns ?? 80;
    let width = Math.min(80, Math.max(40, columns - 10));
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(WorkflowProgressBody, {
        collected: workflowProgress,
        verbose: m,
        width,
      }),
    });
  }
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(WorkflowProgressSummary, {
      collected: workflowProgress,
    }),
  });
}
//@ chunk-9hy503gy.js:7020-7751 placement
/**
 * 工作流进度摘要行组件：完成数/总数、运行中数量、状态点（运行/完成/失败）与当前阶段标题。
 */
function WorkflowProgressSummary(props) {
  let $ = w(23);
  let { collected } = props;
  let counts;
  if ($[0] !== collected.agents) {
    counts = countWorkflowAgents(collected.agents);
    $[0] = collected.agents;
    $[1] = counts;
  } else counts = $[1];
  let { done: d, failedCount, running, total, complete } = counts;
  let dotState = failedCount > 0 ? "failed" : complete ? "done" : "running";
  let k;
  let done;
  let total_2;
  let running_2;
  let complete_2;
  let dotState_2;
  let phaseText;
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
    done = d;
    total_2 = total;
    running_2 = running;
    complete_2 = complete;
    dotState_2 = dotState;
    phaseText = M ? phaseTitleSummary(M) : undefined;
    $[2] = collected;
    $[3] = complete;
    $[4] = d;
    $[5] = dotState;
    $[6] = running;
    $[7] = total;
    $[8] = k;
    $[9] = done;
    $[10] = total_2;
    $[11] = running_2;
    $[12] = complete_2;
    $[13] = dotState_2;
    $[14] = phaseText;
  } else {
    k = $[8];
    done = $[9];
    total_2 = $[10];
    running_2 = $[11];
    complete_2 = $[12];
    dotState_2 = $[13];
    phaseText = $[14];
  }
  let U;
  if (
    $[15] !== k ||
    $[16] !== done ||
    $[17] !== total_2 ||
    $[18] !== running_2 ||
    $[19] !== complete_2 ||
    $[20] !== dotState_2 ||
    $[21] !== phaseText
  ) {
    U = jsxProd_default(k, {
      done,
      total: total_2,
      running: running_2,
      complete: complete_2,
      dotState: dotState_2,
      phaseText,
    });
    $[15] = k;
    $[16] = done;
    $[17] = total_2;
    $[18] = running_2;
    $[19] = complete_2;
    $[20] = dotState_2;
    $[21] = phaseText;
    $[22] = U;
  } else U = $[22];
  return U;
}
//@ chunk-9hy503gy.js:7751-8232 placement
/**
 * 渲染 Workflow 工具结果：错误、已在云会话启动（附会话链接与警告），或后台任务行。
 */
function renderToolResultMessage(c) {
  if (c.error)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        color: "error",
        children: [
          jsxProd_default(StatusIcon, {
            status: "error",
            withSpace: true,
          }),
          getFirstLine(c.error),
        ],
      }),
    });
  if (c.status === "remote_launched")
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Running in cloud session \xB7 ",
              }),
              jsxProd_default(Text, {
                color: "suggestion",
                children: c.sessionUrl,
              }),
            ],
          }),
          c.warning
            ? jsxProd_default_2(Text, {
                color: "warning",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "warning",
                    withSpace: true,
                  }),
                  c.warning,
                ],
              })
            : null,
        ],
      }),
    });
  return jsxProd_default(WorkflowTaskRow, {
    taskId: c.taskId,
  });
}
//@ chunk-9hy503gy.js:8232-9910 placement
function WorkflowTaskRow(props) {
  let t = w(23);
  let { taskId } = props;
  let m;
  if (t[0] !== taskId) {
    m = (d) => d.tasks[taskId];
    t[0] = taskId;
    t[1] = m;
  } else m = t[1];
  let appStateSlice = useAppStateSlice(m);
  if (
    appStateSlice?.type === "local_workflow" &&
    (appStateSlice.status === "completed" ||
      appStateSlice.status === "failed" ||
      appStateSlice.status === "killed")
  ) {
    let i;
    if (t[2] !== appStateSlice.endTime || t[3] !== appStateSlice.startTime) {
      i =
        appStateSlice.endTime && appStateSlice.startTime
          ? formatDuration(appStateSlice.endTime - appStateSlice.startTime)
          : undefined;
      t[2] = appStateSlice.endTime;
      t[3] = appStateSlice.startTime;
      t[4] = i;
    } else i = t[4];
    let x = i;
    let f = appStateSlice.status === "failed";
    let C = appStateSlice.status === "killed";
    const status = f || C ? "error" : "success";
    let u;
    if (t[5] !== status) {
      u = jsxProd_default(StatusIcon, {
        status,
        withSpace: true,
      });
      t[5] = status;
      t[6] = u;
    } else u = t[6];
    const g = f ? "Failed" : C ? "Stopped" : "Completed";
    const W = x && ` in ${x}`;
    let p;
    if (t[7] !== appStateSlice.agentCount) {
      p =
        appStateSlice.agentCount > 0 &&
        ` \xB7 ${appStateSlice.agentCount} ${plural(appStateSlice.agentCount, "agent")}`;
      t[7] = appStateSlice.agentCount;
      t[8] = p;
    } else p = t[8];
    let R;
    if (t[9] !== appStateSlice.totalTokens) {
      R = appStateSlice.totalTokens > 0 && ` \xB7 ${formatTokens(appStateSlice.totalTokens)} tokens`;
      t[9] = appStateSlice.totalTokens;
      t[10] = R;
    } else R = t[10];
    let T;
    if (t[11] !== g || t[12] !== W || t[13] !== p || t[14] !== R) {
      T = jsxProd_default_2(Text, {
        dimColor: true,
        children: [g, W, p, R],
      });
      t[11] = g;
      t[12] = W;
      t[13] = p;
      t[14] = R;
      t[15] = T;
    } else T = t[15];
    let M;
    if (t[16] !== u || t[17] !== T) {
      M = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          children: [u, T],
        }),
      });
      t[16] = u;
      t[17] = T;
      t[18] = M;
    } else M = t[18];
    return M;
  }
  if (appStateSlice?.type === "local_workflow") {
    let i;
    if (t[19] === MEMO_CACHE_SENTINEL) {
      i = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Running in background \xB7 ",
            }),
            jsxProd_default(Text, {
              color: "suggestion",
              children: "/workflows",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: " to monitor and save",
            }),
            jsxProd_default(WorkflowSizeNote, {}),
          ],
        }),
      });
      t[19] = i;
    } else i = t[19];
    return i;
  }
  if (isRemoteSessionAvailable()) {
    let i;
    if (t[20] !== taskId) {
      i = jsxProd_default(WorkflowMonitorHint, {
        taskId,
      });
      t[20] = taskId;
      t[21] = i;
    } else i = t[21];
    return i;
  }
  let i;
  if (t[22] === MEMO_CACHE_SENTINEL) {
    i = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            color: "suggestion",
            children: "/workflows",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: " to view dynamic workflow runs",
          }),
        ],
      }),
    });
    t[22] = i;
  } else i = t[22];
  return i;
}
//@ chunk-9hy503gy.js:9910-10553 placement
/**
 * 工作流任务的查看提示：后台运行时提示用 /workflows（或 /tasks）监控，否则提示查看运行中的动态工作流。
 */
function WorkflowMonitorHint(props) {
  let $ = w(10);
  let { taskId } = props;
  let m;
  if ($[0] !== taskId) {
    m = (d) =>
      !d.remoteWorkerReportedGone &&
      d.remoteBackgroundTasks.some((remoteBackgroundTask) => remoteBackgroundTask.id === taskId);
    $[0] = taskId;
    $[1] = m;
  } else m = $[1];
  let isRemote = useAppStateSlice(m);
  let workflowsAvailable = isWorkflowsAvailable();
  let f;
  if ($[2] !== isRemote) {
    f =
      isRemote &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "Running in background \xB7 ",
      });
    $[2] = isRemote;
    $[3] = f;
  } else f = $[3];
  let C;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    C = jsxProd_default(Text, {
      color: "suggestion",
      children: workflowsAvailable ? "/workflows" : "/tasks",
    });
    $[4] = C;
  } else C = $[4];
  const children = !isRemote
    ? " to view running dynamic workflows"
    : workflowsAvailable
      ? " to monitor"
      : " to view";
  let u;
  if ($[5] !== children) {
    u = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[5] = children;
    $[6] = u;
  } else u = $[6];
  let g;
  if ($[7] !== f || $[8] !== u) {
    g = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        children: [f, C, u],
      }),
    });
    $[7] = f;
    $[8] = u;
    $[9] = g;
  } else g = $[9];
  return g;
}
//@ chunk-9hy503gy.js:10553-10909 placement
/**
 * 默认工作流规模的附注：显示当前规模并提示可在 /config 修改（非默认或不受限时不显示）。
 */
function WorkflowSizeNote() {
  let c = w(2);
  let a;
  if (c[0] === MEMO_CACHE_SENTINEL) {
    a = sessionWorkflowSize(getGlobalConfig().workflowSizeGuideline, isProSubscriber());
    c[0] = a;
  } else a = c[0];
  let { size, isDefault } = a;
  if (!isDefault || size === "unrestricted") {
    return null;
  }
  let d;
  if (c[1] === MEMO_CACHE_SENTINEL) {
    d = jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" \xB7 ", size, " size ("],
        }),
        jsxProd_default(Text, {
          color: "suggestion",
          children: "/config",
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: ")",
        }),
      ],
    });
    c[1] = d;
  } else d = c[1];
  return d;
}
//@ chunk-9hy503gy.js:10909-11004 placement
/**
 * 被拒绝的工具调用渲染：显示"动态工作流已取消"。
 */
function renderToolUseRejectedMessage() {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      dimColor: true,
      children: "Dynamic workflow cancelled",
    }),
  });
}
