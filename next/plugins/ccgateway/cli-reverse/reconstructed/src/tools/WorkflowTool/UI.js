/**
 * tools/WorkflowTool/UI.tsx
 *
 * Workflow 工具界面（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1wnh48wm.js (7)
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-1wnh48wm.js:7029-7357 placement
/**
 * 渲染 Workflow 工具运行中的进度：详细模式显示完整进度，否则显示一行摘要。
 */
function renderToolUseProgressMessage(progressMessages, options) {
  let workflowProgress = collectWorkflowProgress(
    progressMessages.map((progressMessage) => progressMessage.data),
  );
  if (workflowProgress.agents.length === 0 && workflowProgress.logs.length === 0) return null;
  let verbose = Boolean(options?.verbose || options?.isTranscriptMode);
  if (verbose) {
    let columns = options?.terminalSize?.columns ?? 80;
    let width = Math.min(80, Math.max(40, columns - 10));
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(WorkflowProgressBody, {
        collected: workflowProgress,
        verbose,
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
//@ chunk-1wnh48wm.js:7357-8088 placement
/**
 * 工作流进度摘要行组件：完成数/总数、运行中数量、状态点（运行/完成/失败）与当前阶段标题。
 */
function WorkflowProgressSummary(props) {
  let $ = useMemoCache(23);
  let { collected } = props;
  let counts;
  if ($[0] !== collected.agents) {
    counts = countWorkflowAgents(collected.agents);
    $[0] = collected.agents;
    $[1] = counts;
  } else counts = $[1];
  let { done: completedCount, failedCount, running, total, complete } = counts;
  let dotState = failedCount > 0 ? "failed" : complete ? "done" : "running";
  let rowComponent;
  let done;
  let total_2;
  let running_2;
  let complete_2;
  let dotState_2;
  let phaseText;
  if (
    $[2] !== collected ||
    $[3] !== complete ||
    $[4] !== completedCount ||
    $[5] !== dotState ||
    $[6] !== running ||
    $[7] !== total
  ) {
    let footer = noWorkflowFooter(collected);
    rowComponent = WorkflowSummaryRow;
    done = completedCount;
    total_2 = total;
    running_2 = running;
    complete_2 = complete;
    dotState_2 = dotState;
    phaseText = footer ? phaseTitleSummary(footer) : undefined;
    $[2] = collected;
    $[3] = complete;
    $[4] = completedCount;
    $[5] = dotState;
    $[6] = running;
    $[7] = total;
    $[8] = rowComponent;
    $[9] = done;
    $[10] = total_2;
    $[11] = running_2;
    $[12] = complete_2;
    $[13] = dotState_2;
    $[14] = phaseText;
  } else {
    rowComponent = $[8];
    done = $[9];
    total_2 = $[10];
    running_2 = $[11];
    complete_2 = $[12];
    dotState_2 = $[13];
    phaseText = $[14];
  }
  let element;
  if (
    $[15] !== rowComponent ||
    $[16] !== done ||
    $[17] !== total_2 ||
    $[18] !== running_2 ||
    $[19] !== complete_2 ||
    $[20] !== dotState_2 ||
    $[21] !== phaseText
  ) {
    element = jsxProd_default(rowComponent, {
      done,
      total: total_2,
      running: running_2,
      complete: complete_2,
      dotState: dotState_2,
      phaseText,
    });
    $[15] = rowComponent;
    $[16] = done;
    $[17] = total_2;
    $[18] = running_2;
    $[19] = complete_2;
    $[20] = dotState_2;
    $[21] = phaseText;
    $[22] = element;
  } else element = $[22];
  return element;
}
//@ chunk-1wnh48wm.js:8088-8569 placement
/**
 * 渲染 Workflow 工具结果：错误、已在云会话启动（附会话链接与警告），或后台任务行。
 */
function renderToolResultMessage(result) {
  if (result.error)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        color: "error",
        children: [
          jsxProd_default(StatusIcon, {
            status: "error",
            withSpace: true,
          }),
          getFirstLine(result.error),
        ],
      }),
    });
  if (result.status === "remote_launched")
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
                children: result.sessionUrl,
              }),
            ],
          }),
          result.warning
            ? jsxProd_default_2(Text, {
                color: "warning",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "warning",
                    withSpace: true,
                  }),
                  result.warning,
                ],
              })
            : null,
        ],
      }),
    });
  return jsxProd_default(WorkflowTaskRow, {
    taskId: result.taskId,
  });
}
//@ chunk-1wnh48wm.js:8569-10247 placement
function WorkflowTaskRow(props) {
  let $ = useMemoCache(23);
  let { taskId } = props;
  let selectSlice;
  if ($[0] !== taskId) {
    selectSlice = (state) => state.tasks[taskId];
    $[0] = taskId;
    $[1] = selectSlice;
  } else selectSlice = $[1];
  let appStateSlice = useAppStateSlice(selectSlice);
  if (
    appStateSlice?.type === "local_workflow" &&
    (appStateSlice.status === "completed" ||
      appStateSlice.status === "failed" ||
      appStateSlice.status === "killed")
  ) {
    let durationText;
    if ($[2] !== appStateSlice.endTime || $[3] !== appStateSlice.startTime) {
      durationText =
        appStateSlice.endTime && appStateSlice.startTime
          ? formatDuration(appStateSlice.endTime - appStateSlice.startTime)
          : undefined;
      $[2] = appStateSlice.endTime;
      $[3] = appStateSlice.startTime;
      $[4] = durationText;
    } else durationText = $[4];
    let durationSuffix = durationText;
    let failed = appStateSlice.status === "failed";
    let killed = appStateSlice.status === "killed";
    const status = failed || killed ? "error" : "success";
    let statusIcon;
    if ($[5] !== status) {
      statusIcon = jsxProd_default(StatusIcon, {
        status,
        withSpace: true,
      });
      $[5] = status;
      $[6] = statusIcon;
    } else statusIcon = $[6];
    const statusLabel = failed ? "Failed" : killed ? "Stopped" : "Completed";
    const durationSuffixText = durationSuffix && ` in ${durationSuffix}`;
    let agentCountText;
    if ($[7] !== appStateSlice.agentCount) {
      agentCountText =
        appStateSlice.agentCount > 0 &&
        ` \xB7 ${appStateSlice.agentCount} ${plural(appStateSlice.agentCount, "agent")}`;
      $[7] = appStateSlice.agentCount;
      $[8] = agentCountText;
    } else agentCountText = $[8];
    let tokenCountText;
    if ($[9] !== appStateSlice.totalTokens) {
      tokenCountText =
        appStateSlice.totalTokens > 0 && ` \xB7 ${formatTokens(appStateSlice.totalTokens)} tokens`;
      $[9] = appStateSlice.totalTokens;
      $[10] = tokenCountText;
    } else tokenCountText = $[10];
    let summaryText;
    if (
      $[11] !== statusLabel ||
      $[12] !== durationSuffixText ||
      $[13] !== agentCountText ||
      $[14] !== tokenCountText
    ) {
      summaryText = jsxProd_default_2(Text, {
        dimColor: true,
        children: [statusLabel, durationSuffixText, agentCountText, tokenCountText],
      });
      $[11] = statusLabel;
      $[12] = durationSuffixText;
      $[13] = agentCountText;
      $[14] = tokenCountText;
      $[15] = summaryText;
    } else summaryText = $[15];
    let result;
    if ($[16] !== statusIcon || $[17] !== summaryText) {
      result = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          children: [statusIcon, summaryText],
        }),
      });
      $[16] = statusIcon;
      $[17] = summaryText;
      $[18] = result;
    } else result = $[18];
    return result;
  }
  if (appStateSlice?.type === "local_workflow") {
    let runningResult;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      runningResult = jsxProd_default(MessageResponse, {
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
      $[19] = runningResult;
    } else runningResult = $[19];
    return runningResult;
  }
  if (isRemoteSessionAvailable()) {
    let monitorHint;
    if ($[20] !== taskId) {
      monitorHint = jsxProd_default(WorkflowMonitorHint, {
        taskId,
      });
      $[20] = taskId;
      $[21] = monitorHint;
    } else monitorHint = $[21];
    return monitorHint;
  }
  let fallbackResult;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    fallbackResult = jsxProd_default(MessageResponse, {
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
    $[22] = fallbackResult;
  } else fallbackResult = $[22];
  return fallbackResult;
}
//@ chunk-1wnh48wm.js:10247-10890 placement
/**
 * 工作流任务的查看提示：后台运行时提示用 /workflows（或 /tasks）监控，否则提示查看运行中的动态工作流。
 */
function WorkflowMonitorHint(props) {
  let $ = useMemoCache(10);
  let { taskId } = props;
  let selectRemote;
  if ($[0] !== taskId) {
    selectRemote = (state) =>
      !state.remoteWorkerReportedGone &&
      state.remoteBackgroundTasks.some((remoteBackgroundTask) => remoteBackgroundTask.id === taskId);
    $[0] = taskId;
    $[1] = selectRemote;
  } else selectRemote = $[1];
  let isRemote = useAppStateSlice(selectRemote);
  let workflowsAvailable = isWorkflowsAvailable();
  let runningNote;
  if ($[2] !== isRemote) {
    runningNote =
      isRemote &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "Running in background \xB7 ",
      });
    $[2] = isRemote;
    $[3] = runningNote;
  } else runningNote = $[3];
  let commandHint;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    commandHint = jsxProd_default(Text, {
      color: "suggestion",
      children: workflowsAvailable ? "/workflows" : "/tasks",
    });
    $[4] = commandHint;
  } else commandHint = $[4];
  const children = !isRemote
    ? " to view running dynamic workflows"
    : workflowsAvailable
      ? " to monitor"
      : " to view";
  let suffixText;
  if ($[5] !== children) {
    suffixText = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[5] = children;
    $[6] = suffixText;
  } else suffixText = $[6];
  let element;
  if ($[7] !== runningNote || $[8] !== suffixText) {
    element = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        children: [runningNote, commandHint, suffixText],
      }),
    });
    $[7] = runningNote;
    $[8] = suffixText;
    $[9] = element;
  } else element = $[9];
  return element;
}
//@ chunk-1wnh48wm.js:10890-11247 placement
/**
 * 默认工作流规模的附注：显示当前规模并提示可在 /config 修改（非默认或不受限时不显示）。
 */
function WorkflowSizeNote() {
  let $ = useMemoCache(2);
  let sizeState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    sizeState = sessionWorkflowSize(getGlobalConfig().workflowSizeGuideline, isProSubscriber());
    $[0] = sizeState;
  } else sizeState = $[0];
  let { size, isDefault } = sizeState;
  if (!isDefault || size === "unrestricted") {
    return null;
  }
  let note;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    note = jsxProd_default_2(Fragment, {
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
    $[1] = note;
  } else note = $[1];
  return note;
}
//@ chunk-1wnh48wm.js:11247-11342 placement
/**
 * 渲染“工作流被拒绝”的工具结果；当前实现只输出 “Dynamic workflow cancelled” 一行（函数被复用来渲染拒绝状态）。
 */
function renderToolUseRejectedMessage() {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      dimColor: true,
      children: "Dynamic workflow cancelled",
    }),
  });
}
export { renderToolResultMessage, renderToolUseProgressMessage, renderToolUseRejectedMessage };
