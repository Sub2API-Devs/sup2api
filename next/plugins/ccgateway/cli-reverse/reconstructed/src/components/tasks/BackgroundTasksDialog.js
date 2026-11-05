/**
 * components/tasks/BackgroundTasksDialog.tsx
 *
 * 后台任务对话框（↓ 打开）：列出 bash、子代理、队友、工作流、远程会话、monitor，查看详情、停止（ctrl+x ctrl+k）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/BackgroundTasksDialog.tsx
 * pieces: chunk-czq1j3j2.js (77)
 * attribution: placement 21, sole-consumer 15, affinity 7, file-local 2, layout 28, fingerprint 3, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
  useContext,
  useEffectEvent,
} from "../../../vendor/react/cjs/react.production.js";
import { RemoteAgentTask } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isSubagentHistoryEnabled } from "../messages/UserPromptMessage.js";
import { processBatched } from "../../services/mcp/client.js";
import { getSessionSubagentsDir } from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";
import { repeatString, collapseWhitespace } from "../../utils/stringUtils.js";
import { TREE_GLYPHS } from "../../../vendor/chart.js/dist/chart.js";
import { formatRelativeTimeAgo, truncateToWidth } from "../../utils/format.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import {
  isAmbientTask,
  isLocalScriptTaskState,
  isPanelAgentTask,
  isCompletedBackgroundAgent,
} from "../../tasks/taskKinds.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { isCoordinatorPanelActive, subscribeCoordinatorPanel } from "../../utils/transcriptDiagnostics.js";
import { isBackgroundTask } from "../../tasks/types.js";
import {
  isObserverAgentTask,
  restoreAgentTaskFromTranscript,
  LocalAgentTask,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { FLAG_IDLE_WINDOW, isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import { TaskOutputResultDisplay, waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../../state/AppState.js";
import { useTaskFramework } from "../../context/voice.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  isLocalAgent,
  exitTeammateView,
  enterTeammateView,
  stopOrDismissAgent,
} from "../../state/teammateViewHelpers.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useScrollColumnContext } from "../design-system/ScrollColumn.js";
import { ContextSlotA } from "../../context/contextSlots.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { isMainSessionTask } from "../../tasks/LocalMainSessionTask.js";
import { isDreamTask } from "../memory/MemoryFileSelector.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isCpuAccountingEnabled } from "../../utils/shell/processCpuTime.js";
import { LocalShellTask } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { stopTaskByUser, markStoppedByUser, stopTask as stopTask_2 } from "../../tasks/stopTask.js";
import { hasCompletedWithFindings } from "./RemoteSessionProgress.js";
import { stopAllTasks } from "./stopTask.js";
import { InProcessTeammateTask } from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { DreamTask } from "../../tasks/DreamTask/DreamTask.js";
import { LocalMemoryImportTask } from "../../tasks/LocalMemoryImportTask/LocalMemoryImportTask.js";
import { AutoModeScanTask } from "../../tasks/AutoModeScanTask/AutoModeScanTask.js";
import { stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { PostTurnMemoryTask } from "../../tasks/PostTurnMemoryTask/PostTurnMemoryTask.js";
import { stopUltraplan } from "../../commands/ultraplan.js";
import { countWhere, intersperse } from "../../utils/collections.js";
import { StopUltrareviewConfirm, RemoteSessionDetailDialog } from "./RemoteSessionDetailDialog.js";
import { ShellDetailDialog } from "./ShellDetailDialog.js";
import { AsyncAgentDetailDialog } from "./AsyncAgentDetailDialog.js";
import { InProcessTeammateDetailDialog } from "./InProcessTeammateDetailDialog.js";
import { DreamDetailDialog } from "./DreamDetailDialog.js";
import { TaskDetailDialog } from "./TaskDetailDialog.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { SectionHeading, TaskItemLabel } from "./CloudTasksDialog.js";
import { merged } from "../CustomSelect/select.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { BackgroundTask } from "./BackgroundTask.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { HintText } from "../design-system/HintText.js";
import { isTerminalStatus } from "./taskStatusUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:699101-699105 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:699101", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:706884-707417 placement
/**
 * 停止 ultrareview 远程任务并通知
 */
async function stopUltrareviewTask(taskId, stopSource, setAppState, setUltraplanState, notifier, storageV5) {
  await RemoteAgentTask.kill(taskId, setAppState, setUltraplanState, undefined, storageV5);
  logEvent("tengu_review_remote_stopped", {
    source: fromEnum(stopSource),
  });
  notifier.enqueuePendingNotification({
    value:
      "Ultrareview stopped. Run /ultrareview to start a new review, which uses one of your free ultrareviews or bills as usage credits.",
    mode: "task-notification",
    agentId: mainAgentId(),
  });
  notifier.enqueuePendingNotification({
    value:
      "The user stopped the ultrareview session above. Do not respond to the stop notification \u2014 wait for their next message.",
    mode: "task-notification",
    agentId: mainAgentId(),
    isMeta: true,
  });
}
//@ chunk-czq1j3j2.js:724962-724966 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:724962", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:746965-746975 sole-consumer
var MAX_TREE_DEPTH = 6;
//@ chunk-czq1j3j2.js:746975-747259 sole-consumer
function useSubagentHistory(timeWindow, cacheKey) {
  let [historyState, setHistoryState] = useState(() => ({
    status: isSubagentHistoryEnabled() ? "loading" : "off",
  }));
  let isHistoryDisabled = historyState.status === "off";
  useEffect(() => {
    if (isHistoryDisabled) return;
    let isMounted = true;
    processBatched(getSessionSubagentsDir(), timeWindow)
      .then((nodes) => ({
        status: "loaded",
        nodes,
      }))
      .catch((error) => {
        logError(error);
        return {
          status: "failed",
        };
      })
      .then((nextState) => {
        if (isMounted) setHistoryState(nextState);
      })
      .catch(logError);
    return () => {
      isMounted = false;
    };
  }, [timeWindow, isHistoryDisabled, cacheKey]);
  return historyState;
}
//@ chunk-czq1j3j2.js:747259-747479 sole-consumer
function flattenSubagentTree(nodes, isHiddenAgent) {
  let rows = [];
  let frameStack = expandHiddenSubagents(
    nodes.filter((rootNode) => rootNode.entry.group === ""),
    0,
    undefined,
    isHiddenAgent,
  );
  for (let frame = frameStack.pop(); frame !== undefined; frame = frameStack.pop()) {
    rows.push(frame.row);
    for (let childFrame of expandHiddenSubagents(
      frame.children,
      frame.row.depth + 1,
      frame.row.entry,
      isHiddenAgent,
    ))
      frameStack.push(childFrame);
  }
  return rows;
}
//@ chunk-czq1j3j2.js:747479-747702 sole-consumer
function describeSubagentRow(row, { now, isScreenReader, isRefused }) {
  let { entry, parent } = row;
  return {
    label: (isScreenReader ? "" : treePrefix(row)) + entryLabel(entry),
    meta: [
      isRefused ? "cannot be opened" : "",
      entry.stoppedByUser ? "stopped" : "",
      entryMetaLabel(entry),
      ...describeAgentTimes(entry, now),
      isScreenReader && parent ? `under ${entryLabel(parent)}` : "",
    ],
  };
}
//@ chunk-czq1j3j2.js:747702-748015 sole-consumer
/**
 * 展开被过滤代理的子节点到同一层，生成带深度、是否末位与父项的行。
 */
function expandHiddenSubagents(nodes, depth, parent, isHiddenAgent) {
  let visibleNodes = [];
  let nodeStack = nodes.toReversed();
  for (let node = nodeStack.pop(); node !== undefined; node = nodeStack.pop())
    if (isHiddenAgent(node.entry.agentId))
      for (let child of node.children.toReversed()) nodeStack.push(child);
    else visibleNodes.push(node);
  return visibleNodes
    .map((node, nodeIndex) => ({
      row: {
        entry: node.entry,
        depth,
        isLastSibling: nodeIndex === visibleNodes.length - 1,
        parent,
      },
      children: node.children,
    }))
    .reverse();
}
//@ chunk-czq1j3j2.js:748015-748142 sole-consumer
function treePrefix({ depth, isLastSibling }) {
  if (depth === 0) return "";
  return (
    repeatString(`${TREE_GLYPHS.pipe} `, Math.min(depth, MAX_TREE_DEPTH) - 1) +
    `${isLastSibling ? TREE_GLYPHS.last : TREE_GLYPHS.branch} `
  );
}
//@ chunk-czq1j3j2.js:748142-748194 sole-consumer
function entryLabel(entry) {
  return sanitizeLabel(entry.description) || entry.agentId;
}
//@ chunk-czq1j3j2.js:748194-748261 sole-consumer
function entryMetaLabel(entry) {
  return sanitizeLabel(entry.name && `@${entry.name}`) || sanitizeLabel(entry.agentType);
}
//@ chunk-czq1j3j2.js:748261-748453 sole-consumer
function describeAgentTimes({ startedAt, lastActivityAt }, now) {
  let startedAgo =
    startedAt === undefined
      ? ""
      : formatRelativeTimeAgo(new Date(startedAt), {
          now,
        });
  let lastActiveAgo =
    lastActivityAt === undefined
      ? ""
      : formatRelativeTimeAgo(new Date(lastActivityAt), {
          now,
        });
  return [
    startedAgo && `started ${startedAgo}`,
    lastActiveAgo !== startedAgo && lastActiveAgo ? `last active ${lastActiveAgo}` : "",
  ];
}
//@ chunk-czq1j3j2.js:748453-748486 sole-consumer
function sanitizeLabel(entry) {
  return cleanTaskDescription(entry) ?? "";
}
//@ chunk-czq1j3j2.js:748486-748519 sole-consumer
function selectTasks_2(appState) {
  return appState.tasks;
}
//@ chunk-czq1j3j2.js:748519-748563 sole-consumer
function isListableTask(task) {
  return isTaskShownInDialog(task, false) && !isAmbientTask(task);
}
//@ chunk-czq1j3j2.js:748563-748593 sole-consumer
function emptyIdSet() {
  return new Set();
}
//@ chunk-czq1j3j2.js:748593-748640 sole-consumer
function taskKey(task) {
  return `${task.id},${task.status}`;
}
//@ chunk-czq1j3j2.js:748640-748670 sole-consumer
function taskId(task) {
  return task.id;
}
//@ chunk-czq1j3j2.js:748670-748894 affinity
function compareTasksRunningFirst(taskA, taskB) {
  let status = taskA.status;
  let status_2 = taskB.status;
  if (status === "running" && status_2 !== "running") {
    return -1;
  }
  if (status !== "running" && status_2 === "running") {
    return 1;
  }
  let startTime = "task" in taskA ? taskA.task.startTime : 0;
  return ("task" in taskB ? taskB.task.startTime : 0) - startTime;
}
//@ chunk-czq1j3j2.js:748894-749007 file-local
function taskIdAliases(i_0) {
  return i_0.type === "in_process_teammate"
    ? [i_0.id, i_0.task.identity.resumableAgentId ?? i_0.id]
    : [i_0.id];
}
//@ chunk-czq1j3j2.js:749007-749054 layout
function isLocalBashTask(task) {
  return task.type === "local_bash";
}
//@ chunk-czq1j3j2.js:749054-749103 layout
function isRemoteAgentTask(task) {
  return task.type === "remote_agent";
}
//@ chunk-czq1j3j2.js:749103-749151 fingerprint (2.1.88 match: getSelectableBackgroundTasks, 1)
function getSelectableBackgroundTasks(i_0) {
  return i_0.type === "local_agent";
}
//@ chunk-czq1j3j2.js:749151-749182 affinity
function isNotSelectableTask(task) {
  return !getSelectableBackgroundTasks_2(task);
}
//@ chunk-czq1j3j2.js:749182-749233 affinity
function isLocalWorkflowTask_2(task) {
  return task.type === "local_workflow";
}
//@ chunk-czq1j3j2.js:749233-749305 affinity
function isMonitorTask(task) {
  return task.type === "monitor_mcp" || task.type === "monitor_ws";
}
//@ chunk-czq1j3j2.js:749305-749350 affinity
function isMcpTask(task) {
  return task.type === "mcp_task";
}
//@ chunk-czq1j3j2.js:749392-749443 placement
function isAutoModeScanTask(task) {
  return task.type === "auto_mode_scan";
}
//@ chunk-czq1j3j2.js:749443-749499 placement
function isLocalMemoryImportTask(task) {
  return task.type === "local_memory_import";
}
//@ chunk-czq1j3j2.js:749499-749552 placement
function isPostTurnMemoryTask(task) {
  return task.type === "post_turn_memory";
}
//@ chunk-czq1j3j2.js:749552-749589 layout
function isLocalScriptTask(task) {
  return isLocalScriptTaskState(task.type);
}
//@ chunk-czq1j3j2.js:749589-749623 placement
function toIdPair(task) {
  return [task.id, task];
}
//@ chunk-czq1j3j2.js:749623-749723 placement
/**
 * 子代理历史无法读取时记调试日志（文件不可访问）或记错误，返回 false。
 */
function logSubagentHistoryLaunchError(error) {
  if (isFsInaccessible(error)) logForDebugging(`subagent history: launch unreadable: ${error.code}`);
  else logError(error);
  return false;
}
//@ chunk-czq1j3j2.js:749723-749753 placement
function logErrorAndReturn(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:749753-749783 placement
function logErrorAndReturn_2(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:749783-749813 placement
function logErrorAndReturn_3(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:749813-749829 placement
function noopLaunch() {}
//@ chunk-czq1j3j2.js:749829-749845 placement
function noopLaunchError() {}
//@ chunk-czq1j3j2.js:749845-749875 layout
function logTaskError(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:749875-749921 layout (2.1.88 match: requestTeammateShutdown, 1)
/**
 * 任务是否在运行（status==="running"）。
 */
function isTaskRunning(task) {
  return task.status === "running";
}
//@ chunk-czq1j3j2.js:749921-749951 placement
function logErrorWrapper(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:749951-749981 placement
function logErrorWrapper2(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:749981-750011 placement
function logErrorWrapper3(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:750011-750041 placement
function logErrorWrapper4(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:750041-750071 placement
function logErrorWrapper5(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:750071-750101 placement
function logErrorWrapper6(error) {
  return logError(error);
}
//@ chunk-czq1j3j2.js:750101-750147 placement (2.1.88 match: requestTeammateShutdown, 1)
function isTaskRunning_2(task) {
  return task.status === "running";
}
//@ chunk-czq1j3j2.js:750147-750216 layout (2.1.88 match: waitForTaskCompletion, 0.869)
/**
 * 任务状态为 running 或 pending。
 */
function isTaskRunningOrPending(task) {
  return task.status === "running" || task.status === "pending";
}
//@ chunk-czq1j3j2.js:750216-750262 layout (2.1.88 match: requestTeammateShutdown, 1)
function isTaskRunning_3(task) {
  return task.status === "running";
}
//@ chunk-czq1j3j2.js:750262-750346 layout (2.1.88 match: getDisplayName, 0.758)
function getDisplayName_2(teammateId) {
  return teammateId.status === "running" && !(teammateId.type === "leader" && teammateId.label === MAIN);
}
//@ chunk-czq1j3j2.js:750346-750413 layout
function renderSeparator(separatorIndex) {
  return jsxProd_default(
    Text,
    {
      children: " \xB7 ",
    },
    `separator-${separatorIndex}`,
  );
}
//@ chunk-czq1j3j2.js:750413-750456 placement (2.1.88 match: getDisplayName, 1)
function getDisplayName(teammateId) {
  return teammateId.type !== "leader";
}
//@ chunk-czq1j3j2.js:750456-750493 layout
function isLocalScriptTaskRow(task) {
  return isLocalScriptTaskState(task.type);
}
//@ chunk-czq1j3j2.js:750493-750536 layout (2.1.88 match: getDisplayName, 1)
function getDisplayName_3(teammateId) {
  return teammateId.type === "leader";
}
//@ chunk-czq1j3j2.js:750536-750590 file-local
function TeammateTaskGroups(t0) {
  return {
    kind: "row",
    item: t0,
    key: t0.id,
  };
}
//@ chunk-czq1j3j2.js:750590-750644 layout
function toListRow(task) {
  return {
    kind: "row",
    item: task,
    key: task.id,
  };
}
//@ chunk-czq1j3j2.js:750644-750686 layout
function hasRows(section) {
  return section.items.length > 0;
}
//@ chunk-czq1j3j2.js:750686-750734 layout
function toActionOption(action) {
  return {
    label: ACTION_LABELS[action],
    value: action,
  };
}
//@ chunk-czq1j3j2.js:750734-750909 layout
var MAX_SUBAGENT_HISTORY_ROWS = 16;
var LEADER_GROUP_KEY = "__leader__";
var SYSTEM_TASKS_LABEL = "System tasks";
var SELF_MANAGED_TASKS_KEY = "__self_managed_tasks__";
var EARLIER_IN_SESSION_LABEL = "Earlier in this session";
var SUBAGENT_HISTORY_KEY = "__subagent_history__";
var TERSE_SHORTCUT_FORMAT = {
  terse: true,
  format: {
    style: "compact",
  },
};
var EMPTY_SHORTCUT_FORMAT = {};
//@ chunk-czq1j3j2.js:750909-751141 layout
function hasDetailDialog(type) {
  if (type === "mcp_task") return McpTaskDetailDialog !== null;
  if (type === "local_memory_import") return localMemoryImportDetailGates !== null;
  return (
    !(codeModeAccepted() && isLocalScriptTaskState(type)) &&
    type !== "monitor_ws" &&
    type !== "post_turn_memory" &&
    type !== "self_managed_tasks" &&
    type !== "subagent_history" &&
    type !== "recorded_agent"
  );
}
//@ chunk-czq1j3j2.js:751141-751637 layout
var WorkflowDetailDialog; // deferred: loads other modules while loading; runs once its import cycle is complete
var killWorkflowTask;
var pauseWorkflowTask;
var skipWorkflowAgent;
var retryWorkflowAgent;
var monitorMcpKillModule;
var killMonitorMcp;
var mcpTaskDetailDialogModule;
var kill;
var McpTaskDetailDialog;
var detailScreenGates;
var monitorMcpDetailFeatureGates;
var mcpTaskDetailFeatureGates;
var shellDetailGates;
var workflowDetailGates;
var remoteAgentDetailGates;
var dreamDetailGates;
var autoModeScanDetailGates;
var memoryImportDetailGates;
var subagentHistoryDetailGates;
var localMemoryImportDetailGates;
var localMemoryDetailModule;
var backgroundListModules;
var useBackgroundListV3Fallback;
var useBackgroundListFallback;
deferInit("chunk-czq1j3j2.js:751141", () => {
  WorkflowDetailDialog = require("../workflows/WorkflowDetailDialog.js").WorkflowDetailDialog;
  ({
    killWorkflowTask,
    pauseWorkflowTask,
    skipWorkflowAgent,
    retryWorkflowAgent,
  } = require("../../tasks/LocalWorkflowTask/LocalWorkflowTask.js"));
  monitorMcpKillModule = null;
  killMonitorMcp = monitorMcpKillModule?.killMonitorMcp ?? null;
  mcpTaskDetailDialogModule = null;
  kill = require("../../tasks/McpTask/MCP_TASK.lazy.js").MCP_TASK.kill;
  McpTaskDetailDialog = require("./McpTaskDetailDialog.js").McpTaskDetailDialog;
  detailScreenGates = null;
  monitorMcpDetailFeatureGates = null;
  mcpTaskDetailFeatureGates = null;
  shellDetailGates = null;
  workflowDetailGates = null;
  remoteAgentDetailGates = null;
  dreamDetailGates = null;
  autoModeScanDetailGates = null;
  memoryImportDetailGates = null;
  subagentHistoryDetailGates = null;
  localMemoryImportDetailGates = null;
  localMemoryDetailModule = null;
  backgroundListModules = null;
  useBackgroundListV3Fallback = backgroundListModules?.useBackgroundListV3 ?? useBackgroundListV3Stub;
  useBackgroundListFallback = backgroundListModules?.useBackgroundList ?? useBackgroundListStub;
});
//@ chunk-czq1j3j2.js:751637-751934 layout
function hasBackgroundDetailScreen(task) {
  return (
    detailScreenGates?.isBackgroundDetailScreenEnabled() === true &&
    (task.type === "local_bash" ||
      task.type === "remote_agent" ||
      task.type === "local_workflow" ||
      task.type === "dream" ||
      task.type === "auto_mode_scan" ||
      (task.type === "monitor_mcp" && monitorMcpDetailFeatureGates !== null) ||
      (task.type === "local_memory_import" && localMemoryDetailModule !== null) ||
      (task.type === "mcp_task" && mcpTaskDetailFeatureGates !== null))
  );
}
//@ chunk-czq1j3j2.js:751934-752354 layout
/**
 * 判断任务是否列入后台任务对话框（协调面板、失败/被杀可见、已完成后台代理、仍在运行等规则）。
 */
function isTaskShownInDialog(task, backgroundListV3Fallback) {
  if (isCoordinatorPanelActive() && isBackgroundTask(task)) return true;
  let isFallbackFinished =
    backgroundListV3Fallback &&
    (task.status === "failed" || task.status === "killed") &&
    (task.type === "local_agent" ||
      task.type === "in_process_teammate" ||
      task.type === "local_workflow" ||
      task.type === "local_bash" ||
      task.type === "mcp_task");
  if (task.type === "local_agent" && (task.status === "completed" || isFallbackFinished))
    return (
      isPanelAgentTask(task) &&
      task.isBackgrounded &&
      !isObserverAgentTask(task) &&
      task.evictAfter !== 0 &&
      (isFallbackFinished ||
        [...(task.keepaliveReasons ?? [])].every((reason) => reason === FLAG_IDLE_WINDOW))
    );
  if (isFallbackFinished) return !TaskOutputResultDisplay(task);
  return waitForTaskCompletion(task);
}
//@ chunk-czq1j3j2.js:752354-783925 fingerprint (2.1.88 match: BackgroundTasksDialog, 0.51)
/**
 * 后台任务对话框：把各类任务（local_bash、local_agent、in_process_teammate、local_workflow、remote_agent、monitor_mcp、dream）转成列表项，list/detail 两级视图，支持停止所有 agent（chat:killAgents）、进入队友视图、查看输出。
 */
function BackgroundTasksDialog(props) {
  let $ = useMemoCache(460);
  let {
    onDone,
    storageV5,
    session,
    messageQueue,
    tools,
    commands,
    verbose,
    initialDetailTaskId,
    onBack,
    promptVisibleBelow,
  } = props;
  let promptVisibleBelow_2 = promptVisibleBelow === undefined ? false : promptVisibleBelow;
  let tasks = useAppState(selectTasks_2);
  let setAppState = useSetAppState();
  let setAppState_2 = useTaskFramework();
  let pendingNotifications = messageQueue;
  let killAgentsShortcut = useShortcutDisplay_2("chat:killAgents", "Chat", "ctrl+x ctrl+k");
  let tasks_2 = tasks;
  let coordinatorSubscription = subscribeCoordinatorPanel();
  let selectViewingAgent;
  if ($[0] !== coordinatorSubscription) {
    selectViewingAgent = (appState) => coordinatorSubscription && appState.viewingAgentTaskId !== undefined;
    $[0] = coordinatorSubscription;
    $[1] = selectViewingAgent;
  } else selectViewingAgent = $[1];
  let skippedListOnMount = useAppState(selectViewingAgent);
  let backgroundListV3Fallback = useBackgroundListV3Fallback();
  let createInitialViewState;
  if (
    $[2] !== initialDetailTaskId ||
    $[3] !== backgroundListV3Fallback ||
    $[4] !== skippedListOnMount ||
    $[5] !== tasks_2
  ) {
    createInitialViewState = () => {
      if (initialDetailTaskId) {
        return {
          mode: "detail",
          itemId: initialDetailTaskId,
        };
      }
      if (backgroundListV3Fallback) {
        return {
          mode: "list",
        };
      }
      let filtered = Object.values(tasks_2 ?? {}).filter(isListableTask);
      let onlyTask = filtered.length === 1 ? filtered[0] : undefined;
      if (
        onlyTask &&
        !skippedListOnMount &&
        hasDetailDialog(onlyTask.type) &&
        !(onlyTask.type === "local_agent" && isParkedCompletedAgent(onlyTask))
      ) {
        return {
          mode: "detail",
          itemId: onlyTask.id,
        };
      }
      return {
        mode: "list",
      };
    };
    $[2] = initialDetailTaskId;
    $[3] = backgroundListV3Fallback;
    $[4] = skippedListOnMount;
    $[5] = tasks_2;
    $[6] = createInitialViewState;
  } else createInitialViewState = $[6];
  let [viewState, setViewState] = useState(createInitialViewState);
  let openedFromListRef = useRef(viewState.mode === "detail");
  let initialFocus;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    initialFocus = {
      index: 0,
    };
    $[7] = initialFocus;
  } else initialFocus = $[7];
  let [focusedRow, setFocusedRow] = useState(initialFocus);
  let [showSelfManaged, setShowSelfManaged] = useState(false);
  let [showSubagentHistory, setShowSubagentHistory] = useState(false);
  let [refusedAgentIds, setRefusedAgentIds] = useState(emptyIdSet);
  let localAgentKeys;
  if ($[8] !== tasks_2) {
    localAgentKeys = Object.values(tasks_2 ?? {})
      .filter(isLocalAgent)
      .map(taskKey);
    $[8] = tasks_2;
    $[9] = localAgentKeys;
  } else localAgentKeys = $[9];
  let allItems = useSubagentHistory(storageV5, `${showSubagentHistory} ${localAgentKeys.join()}`);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let scrollColumnContext = useScrollColumnContext();
  let contextSlotValue = useContext(ContextSlotA);
  let { rows, columns } = useTerminalSize();
  let visibleRowCount =
    scrollColumnContext === null && contextSlotValue === null ? Math.max(7, Math.floor(rows / 2)) : undefined;
  useRegisterOverlay("background-tasks-dialog");
  let sectionedTasks;
  if (
    $[10] !== backgroundListV3Fallback ||
    $[11] !== refusedAgentIds ||
    $[12] !== showSubagentHistory ||
    $[13] !== skippedListOnMount ||
    $[14] !== showSelfManaged ||
    $[15] !== allItems.nodes ||
    $[16] !== allItems.status ||
    $[17] !== tasks_2
  ) {
    const values = Object.values(tasks_2 ?? {});
    let isShownInDialog;
    if ($[19] !== backgroundListV3Fallback) {
      isShownInDialog = (task) => isTaskShownInDialog(task, backgroundListV3Fallback);
      $[19] = backgroundListV3Fallback;
      $[20] = isShownInDialog;
    } else isShownInDialog = $[20];
    let backgroundTasks = values.filter(isShownInDialog);
    let ambientTaskIds = new Set(backgroundTasks.filter(isAmbientTask).map(taskId));
    let allItems_0 = backgroundTasks.map(toListItem);
    let sorted = allItems_0.sort(compareTasksRunningFirst);
    let filtered = sorted.filter((item) => !ambientTaskIds.has(item.id));
    let filtered_2 = sorted.filter((item) => ambientTaskIds.has(item.id));
    let firstAmbientItem = filtered_2[0];
    let selfManagedItems =
      showSelfManaged || firstAmbientItem === undefined
        ? filtered_2
        : [
            {
              id: SELF_MANAGED_TASKS_KEY,
              type: "self_managed_tasks",
              label: SYSTEM_TASKS_LABEL,
              status: "running",
              size: filtered_2.length,
              firstTaskId: firstAmbientItem.id,
            },
          ];
    let reservedTaskIds = new Set([
      LEADER_GROUP_KEY,
      SELF_MANAGED_TASKS_KEY,
      SUBAGENT_HISTORY_KEY,
      ...allItems_0.flatMap(taskIdAliases),
    ]);
    let historyRows =
      allItems.status === "loaded"
        ? flattenSubagentTree(allItems.nodes, (agentId) => {
            let task = tasks_2?.[agentId];
            return (
              reservedTaskIds.has(agentId) ||
              (task !== undefined &&
                (task.status === "running" || isBackgroundTask(task) || isMainSessionTask(task)))
            );
          })
        : [];
    let historySectionItems =
      allItems.status === "off"
        ? []
        : showSubagentHistory && historyRows.length > 0
          ? historyRows.map((historyRow) => {
              let liveTask = tasks_2?.[historyRow.entry.agentId];
              return {
                id: historyRow.entry.agentId,
                type: "recorded_agent",
                label: entryLabel(historyRow.entry),
                status: "completed",
                isRefused: refusedAgentIds.has(historyRow.entry.agentId),
                row: isLocalAgent(liveTask)
                  ? {
                      ...historyRow,
                      entry: {
                        ...historyRow.entry,
                        stoppedByUser: liveTask.stoppedByUser === true,
                        lastActivityAt: liveTask.endTime ?? historyRow.entry.lastActivityAt,
                      },
                    }
                  : historyRow,
              };
            })
          : [
              {
                id: SUBAGENT_HISTORY_KEY,
                type: "subagent_history",
                label: EARLIER_IN_SESSION_LABEL,
                status: "running",
                size:
                  allItems.status === "loaded"
                    ? historyRows.length
                    : allItems.status === "failed"
                      ? "unreadable"
                      : undefined,
                firstAgentId: historyRows[0]?.entry.agentId,
              },
            ];
    let bash = filtered.filter(isLocalBashTask);
    let filtered_3 = filtered.filter(isRemoteAgentTask);
    let filtered_4 = filtered.filter(getSelectableBackgroundTasks);
    let filtered_5 = filtered_4.filter(isNotSelectableTask);
    let filtered_6 = filtered_4.filter(getSelectableBackgroundTasks_2);
    let filtered_7 = filtered.filter(isLocalWorkflowTask_2);
    let filtered_8 = filtered.filter(isMonitorTask);
    let filtered_9 = filtered.filter(isMcpTask);
    let filtered_10 = filtered.filter(isDreamTask);
    let remote = filtered.filter(isAutoModeScanTask);
    let agent = filtered.filter(isLocalMemoryImportTask);
    let workflows = filtered.filter(isPostTurnMemoryTask);
    let extraRows = codeModeAccepted() ? filtered.filter(isLocalScriptTask) : [];
    let teammatesByTeam = new Map();
    for (const task of filtered) {
      if (task.type !== "in_process_teammate") {
        continue;
      }
      let teamTasks = teammatesByTeam.get(task.task.identity.teamName);
      if (teamTasks) teamTasks.push(task);
      else teammatesByTeam.set(task.task.identity.teamName, [task]);
    }
    let allTeammateTasks = [...teammatesByTeam.values()].flat();
    let leaderItems =
      allTeammateTasks.length > 0 || skippedListOnMount
        ? [
            {
              id: LEADER_GROUP_KEY,
              type: "leader",
              label: allTeammateTasks.length > 0 ? `@${TEAM_LEAD}` : MAIN,
              status: "running",
            },
          ]
        : [];
    sectionedTasks = {
      bashTasks: bash,
      remoteSessions: filtered_3,
      agentTasks: filtered_5,
      completedAgentTasks: filtered_6,
      workflowTasks: filtered_7,
      mcpMonitors: filtered_8,
      mcpTasks: filtered_9,
      dreamTasks: filtered_10,
      autoModeScanTasks: remote,
      memoryImportTasks: agent,
      memorySaveTasks: workflows,
      selfManaged: selfManagedItems,
      historyRow: historySectionItems,
      teammateTasks: [...leaderItems, ...allTeammateTasks],
      teams: [...teammatesByTeam.entries()],
      listRows: [
        ...(teammatesByTeam.size === 0 ? leaderItems : []),
        ...[...teammatesByTeam.values()].flatMap((item_2) => [...leaderItems, ...item_2]),
        ...bash,
        ...filtered_8,
        ...filtered_9,
        ...filtered_3,
        ...filtered_5,
        ...filtered_6,
        ...filtered_7,
        ...filtered_10,
        ...remote,
        ...agent,
        ...workflows,
        ...extraRows,
        ...selfManagedItems,
        ...historySectionItems,
      ],
      allSelectableItems: [
        ...leaderItems,
        ...allTeammateTasks,
        ...bash,
        ...filtered_8,
        ...filtered_9,
        ...filtered_3,
        ...filtered_5,
        ...filtered_6,
        ...filtered_7,
        ...filtered_10,
        ...remote,
        ...agent,
        ...workflows,
        ...extraRows,
        ...selfManagedItems,
        ...historySectionItems,
      ],
    };
    $[10] = backgroundListV3Fallback;
    $[11] = refusedAgentIds;
    $[12] = showSubagentHistory;
    $[13] = skippedListOnMount;
    $[14] = showSelfManaged;
    $[15] = allItems.nodes;
    $[16] = allItems.status;
    $[17] = tasks_2;
    $[18] = sectionedTasks;
  } else sectionedTasks = $[18];
  let {
    bashTasks,
    remoteSessions,
    agentTasks,
    completedAgentTasks,
    teammateTasks,
    teams,
    listRows,
    workflowTasks,
    mcpMonitors,
    mcpTasks,
    dreamTasks,
    autoModeScanTasks,
    memoryImportTasks,
    memorySaveTasks,
    selfManaged,
    historyRow,
    allSelectableItems,
  } = sectionedTasks;
  let expandedKeys;
  if ($[21] !== showSelfManaged) {
    expandedKeys = showSelfManaged ? [SELF_MANAGED_TASKS_KEY] : [];
    $[21] = showSelfManaged;
    $[22] = expandedKeys;
  } else expandedKeys = $[22];
  let historyKeys;
  if ($[23] !== showSubagentHistory) {
    historyKeys = showSubagentHistory ? [SUBAGENT_HISTORY_KEY] : [];
    $[23] = showSubagentHistory;
    $[24] = historyKeys;
  } else historyKeys = $[24];
  let defaultExpandedKeys;
  if ($[25] !== expandedKeys || $[26] !== historyKeys) {
    defaultExpandedKeys = [...expandedKeys, ...historyKeys];
    $[25] = expandedKeys;
    $[26] = historyKeys;
    $[27] = defaultExpandedKeys;
  } else defaultExpandedKeys = $[27];
  let backgroundListFallback = useBackgroundListFallback(
    allSelectableItems,
    defaultExpandedKeys,
    viewState.mode === "list",
  );
  let rowsToRender;
  fd: {
    if (!backgroundListFallback) {
      rowsToRender = listRows;
      break fd;
    }
    let fallbackRows;
    if ($[28] !== allSelectableItems || $[29] !== backgroundListFallback.rows) {
      let itemById = new Map(allSelectableItems.map(toIdPair));
      fallbackRows = backgroundListFallback.rows.flatMap((item_3) => itemById.get(item_3.id) ?? []);
      $[28] = allSelectableItems;
      $[29] = backgroundListFallback.rows;
      $[30] = fallbackRows;
    } else fallbackRows = $[30];
    rowsToRender = fallbackRows;
  }
  let rows_2 = rowsToRender;
  let stopArmedRef = useRef(false);
  let focusedIdRef = useRef(undefined);
  let previousRowsRef = useRef(null);
  let handleFocus;
  if ($[31] !== rows_2) {
    handleFocus = (item_4) => {
      let id = rows_2[item_4]?.id;
      let previousId = focusedIdRef.current;
      let rowsChanged = previousRowsRef.current !== rows_2;
      focusedIdRef.current = id;
      previousRowsRef.current = rows_2;
      if (!rowsChanged) stopArmedRef.current = false;
      else if (previousId !== undefined && previousId !== id)
        stopArmedRef.current = !rows_2.some((item_5) => item_5.id === previousId);
      setFocusedRow({
        id,
        index: item_4,
      });
    };
    $[31] = rows_2;
    $[32] = handleFocus;
  } else handleFocus = $[32];
  let onFocus = handleFocus;
  let syncStopArmed;
  let syncStopArmedDeps;
  if ($[33] !== rows_2) {
    syncStopArmed = () => {
      if (previousRowsRef.current === null) {
        return;
      }
      previousRowsRef.current = rows_2;
      let focusedId = focusedIdRef.current;
      if (focusedId !== undefined && !rows_2.some((prev) => prev.id === focusedId))
        stopArmedRef.current = true;
    };
    syncStopArmedDeps = [rows_2];
    $[33] = rows_2;
    $[34] = syncStopArmed;
    $[35] = syncStopArmedDeps;
  } else {
    syncStopArmed = $[34];
    syncStopArmedDeps = $[35];
  }
  useEffect(syncStopArmed, syncStopArmedDeps);
  let focusedItem;
  if ($[36] !== allSelectableItems || $[37] !== focusedRow || $[38] !== rows_2) {
    focusedItem =
      allSelectableItems.find((prev_0) => prev_0.id === focusedRow.id) ?? rows_2[focusedRow.index] ?? null;
    $[36] = allSelectableItems;
    $[37] = focusedRow;
    $[38] = rows_2;
    $[39] = focusedItem;
  } else focusedItem = $[39];
  let selectedItem = focusedItem;
  let handleSelect;
  if ($[40] !== onDone || $[41] !== setAppState || $[42] !== storageV5 || $[43] !== tasks_2) {
    handleSelect = function openSelectedItem(item) {
      if (item.type === "self_managed_tasks") {
        focusedIdRef.current = item.firstTaskId;
        setShowSelfManaged(true);
      } else if (item.type === "subagent_history") {
        if (item.size === "unreadable") {
          logFeatureBad("subagent_history", "read_failed");
          return;
        }
        if (item.size === 0) {
          return;
        }
        logFeatureOk("subagent_history");
        focusedIdRef.current = item.firstAgentId ?? focusedIdRef.current;
        setShowSubagentHistory(true);
      } else if (item.type === "recorded_agent") killShellTask(item.row.entry);
      else if (item.type === "leader") {
        exitTeammateView(setAppState);
        onDone(viewingLabel(item), {
          display: "system",
        });
      } else if (getSelectableBackgroundTasks_2(item)) {
        enterTeammateView(item.id, setAppState);
        onDone("Viewing agent", {
          display: "system",
        });
      } else if (hasDetailDialog(item.type))
        setViewState({
          mode: "detail",
          itemId: item.id,
        });
    };
    async function killShellTask(taskId) {
      let existingTask = tasks_2?.[taskId.agentId];
      if (
        !(existingTask === undefined
          ? await restoreAgentTaskFromTranscript(taskId, setAppState, storageV5).catch(
              logSubagentHistoryLaunchError,
            )
          : isPanelAgentTask(existingTask))
      ) {
        logFeatureBad("subagent_history_view", "not_viewable");
        setRefusedAgentIds((refusedIds) => new Set(refusedIds).add(taskId.agentId));
        return;
      }
      logFeatureOk("subagent_history_view");
      enterTeammateView(taskId.agentId, setAppState);
      onDone("Viewing agent", {
        display: "system",
      });
    }
    $[40] = onDone;
    $[41] = setAppState;
    $[42] = storageV5;
    $[43] = tasks_2;
    $[44] = handleSelect;
  } else handleSelect = $[44];
  let killShellTask;
  if ($[45] !== session || $[46] !== setAppState || $[47] !== storageV5 || $[48] !== setAppState_2) {
    killShellTask = function killShell(taskId_0) {
      if (!isCpuAccountingEnabled()) {
        return LocalShellTask.kill(taskId_0, setAppState_2, setAppState, "user", storageV5);
      }
      return stopTaskByUser(taskId_0, {
        taskRegistry: setAppState_2,
        setAppState,
        session,
        source: "user",
        storageV5,
      }).catch(logErrorAndReturn);
    };
    $[45] = session;
    $[46] = setAppState;
    $[47] = storageV5;
    $[48] = setAppState_2;
    $[49] = killShellTask;
  } else killShellTask = $[49];
  let killShellTask_ = killShellTask;
  let killMcpTask;
  if ($[50] !== session || $[51] !== setAppState || $[52] !== storageV5 || $[53] !== setAppState_2) {
    killMcpTask = function killMcpTask_(taskId, killFn) {
      if (!isCpuAccountingEnabled()) {
        return killFn(taskId, setAppState_2, setAppState, undefined, storageV5).catch(logErrorAndReturn_2);
      }
      return stopTaskByUser(taskId, {
        taskRegistry: setAppState_2,
        setAppState,
        session,
        source: "user",
        storageV5,
      }).catch(logErrorAndReturn_3);
    };
    $[50] = session;
    $[51] = setAppState;
    $[52] = storageV5;
    $[53] = setAppState_2;
    $[54] = killMcpTask;
  } else killMcpTask = $[54];
  let killAgentTask = killMcpTask;
  let killAgent;
  if ($[55] !== session || $[56] !== setAppState || $[57] !== storageV5 || $[58] !== setAppState_2) {
    killAgent = function killAgent_(taskId_1) {
      let task = setAppState_2.get(taskId_1);
      if (isLocalAgent(task) && (task.status === "running" || hasCompletedWithFindings(task)))
        markStoppedByUser(taskId_1, setAppState_2, storageV5);
      if (task && isObserverAgentTask(task)) {
        return stopTask_2(taskId_1, {
          taskRegistry: setAppState_2,
          setAppState,
          session,
          source: "user",
          storageV5,
        }).then(noopLaunch, noopLaunchError);
      }
      let killResult = LocalAgentTask.kill(taskId_1, setAppState_2, setAppState, "user", storageV5);
      if (isPanelAgentTask(task))
        stopAllTasks(task, setAppState_2, {
          session,
          source: "user",
          storageV5,
        });
      return killResult;
    };
    $[55] = session;
    $[56] = setAppState;
    $[57] = storageV5;
    $[58] = setAppState_2;
    $[59] = killAgent;
  } else killAgent = $[59];
  let killTeammateTask = killAgent;
  let killTeammate;
  if ($[60] !== setAppState || $[61] !== storageV5 || $[62] !== setAppState_2) {
    killTeammate = function killTeammate_(taskId_2) {
      return InProcessTeammateTask.kill(taskId_2, setAppState_2, setAppState, undefined, storageV5);
    };
    $[60] = setAppState;
    $[61] = storageV5;
    $[62] = setAppState_2;
    $[63] = killTeammate;
  } else killTeammate = $[63];
  let killDreamTask = killTeammate;
  let killDream;
  if ($[64] !== setAppState || $[65] !== storageV5 || $[66] !== setAppState_2) {
    killDream = function killDream_(taskId_3) {
      return DreamTask.kill(taskId_3, setAppState_2, setAppState, undefined, storageV5);
    };
    $[64] = setAppState;
    $[65] = storageV5;
    $[66] = setAppState_2;
    $[67] = killDream;
  } else killDream = $[67];
  let killMemoryImportTask = killDream;
  let killMemoryImport;
  if ($[68] !== setAppState || $[69] !== storageV5 || $[70] !== setAppState_2) {
    killMemoryImport = function killMemoryImport_(agentId) {
      return LocalMemoryImportTask.kill(agentId, setAppState_2, setAppState, undefined, storageV5);
    };
    $[68] = setAppState;
    $[69] = storageV5;
    $[70] = setAppState_2;
    $[71] = killMemoryImport;
  } else killMemoryImport = $[71];
  let killAutoModeScanTask = killMemoryImport;
  let killAutoModeScan;
  if ($[72] !== setAppState || $[73] !== storageV5 || $[74] !== setAppState_2) {
    killAutoModeScan = function killAutoModeScan_(agentId_0) {
      return AutoModeScanTask.kill(agentId_0, setAppState_2, setAppState, undefined, storageV5);
    };
    $[72] = setAppState;
    $[73] = storageV5;
    $[74] = setAppState_2;
    $[75] = killAutoModeScan;
  } else killAutoModeScan = $[75];
  let killRemoteAgentTask = killAutoModeScan;
  let killRemoteAgent;
  if ($[76] !== setAppState || $[77] !== storageV5 || $[78] !== setAppState_2) {
    killRemoteAgent = function killRemoteAgent_(taskId) {
      return RemoteAgentTask.kill(taskId, setAppState_2, setAppState, undefined, storageV5);
    };
    $[76] = setAppState;
    $[77] = storageV5;
    $[78] = setAppState_2;
    $[79] = killRemoteAgent;
  } else killRemoteAgent = $[79];
  let killRemoteAgentById = killRemoteAgent;
  let stopTask;
  if (
    $[80] !== killTeammateTask ||
    $[81] !== killRemoteAgentTask ||
    $[82] !== killMemoryImportTask ||
    $[83] !== killAutoModeScanTask ||
    $[84] !== killRemoteAgentById ||
    $[85] !== killShellTask_ ||
    $[86] !== killDreamTask ||
    $[87] !== pendingNotifications ||
    $[88] !== session ||
    $[89] !== setAppState ||
    $[90] !== killAgentTask ||
    $[91] !== storageV5 ||
    $[92] !== setAppState_2
  ) {
    stopTask = function stopTaskById(item) {
      if (item.type === "local_bash" && item.status === "running") killShellTask_(item.id);
      else if (item.type === "local_agent" && (item.status === "running" || isWaitingOnChildren(item.task)))
        killTeammateTask(item.id);
      else if (item.type === "local_agent" && isCompletedBackgroundAgent(item.task))
        stopOrDismissAgent(item.id, setAppState);
      else if (item.type === "in_process_teammate" && item.status === "running") killDreamTask(item.id);
      else if (item.type === "local_workflow" && item.status === "running")
        killWorkflowTask(item.id, setAppState_2, "user");
      else if (item.type === "monitor_mcp" && item.status === "running" && killMonitorMcp)
        killMonitorMcp(item.id, setAppState_2);
      else if (item.type === "monitor_ws" && item.status === "running")
        stopMonitorWsTasks(item.id, setAppState_2, {
          userStop: true,
          taskStop: true,
        });
      else if (item.type === "mcp_task" && item.status === "running" && kill) killAgentTask(item.id, kill);
      else if (item.type === "dream" && item.status === "running") killMemoryImportTask(item.id);
      else if (item.type === "auto_mode_scan" && item.status === "running") killRemoteAgentTask(item.id);
      else if (item.type === "local_memory_import" && item.status === "running")
        killAutoModeScanTask(item.id);
      else if (item.type === "post_turn_memory" && item.status === "running")
        PostTurnMemoryTask.kill(item.id, setAppState_2, setAppState, undefined, storageV5);
      else if (codeModeAccepted() && isLocalScriptTaskState(item.type) && item.status === "running")
        stopTaskByUser(item.id, {
          taskRegistry: setAppState_2,
          setAppState,
          session,
          source: "user",
          storageV5,
        }).catch(logTaskError);
      else if (item.type === "remote_agent" && item.status === "running") {
        if (item.task.isUltraplan)
          stopUltraplan(
            item.id,
            item.task.sessionId,
            setAppState_2,
            setAppState,
            pendingNotifications,
            storageV5,
          );
        else if (item.task.isRemoteReview)
          setViewState({
            mode: "confirmStopReview",
            itemId: item.id,
          });
        else killRemoteAgentById(item.id);
      }
    };
    $[80] = killTeammateTask;
    $[81] = killRemoteAgentTask;
    $[82] = killMemoryImportTask;
    $[83] = killAutoModeScanTask;
    $[84] = killRemoteAgentById;
    $[85] = killShellTask_;
    $[86] = killDreamTask;
    $[87] = pendingNotifications;
    $[88] = session;
    $[89] = setAppState;
    $[90] = killAgentTask;
    $[91] = storageV5;
    $[92] = setAppState_2;
    $[93] = stopTask;
  } else stopTask = $[93];
  let stopItem = stopTask;
  let handleForeground;
  if ($[94] !== onDone || $[95] !== setAppState) {
    handleForeground = function tryForeground(item) {
      if (item.type === "in_process_teammate" && item.status === "running") {
        enterTeammateView(item.id, setAppState);
        onDone("Viewing teammate", {
          display: "system",
        });
        return true;
      }
      if (item.type === "local_agent" && isPanelAgentTask(item.task)) {
        enterTeammateView(item.id, setAppState);
        onDone("Viewing agent", {
          display: "system",
        });
        return true;
      }
      if (item.type === "leader") {
        exitTeammateView(setAppState);
        onDone(viewingLabel(item), {
          display: "system",
        });
        return true;
      }
      return false;
    };
    $[94] = onDone;
    $[95] = setAppState;
    $[96] = handleForeground;
  } else handleForeground = $[96];
  let foregroundItem = handleForeground;
  let handleRowKeyDown;
  if ($[97] !== foregroundItem || $[98] !== rows_2 || $[99] !== stopItem) {
    handleRowKeyDown = (event, rowIndex) => {
      let item = rows_2[rowIndex];
      if (!item) {
        return;
      }
      if (event.key === "x" && !event.ctrl && !event.meta) {
        event.preventDefault();
        if (stopArmedRef.current) {
          stopArmedRef.current = false;
          return;
        }
        stopItem(item);
        return;
      }
      if (event.key === "f" && !event.ctrl && !event.meta && foregroundItem(item)) event.preventDefault();
    };
    $[97] = foregroundItem;
    $[98] = rows_2;
    $[99] = stopItem;
    $[100] = handleRowKeyDown;
  } else handleRowKeyDown = $[100];
  let onRowKeyDown = handleRowKeyDown;
  let activateRow;
  if ($[101] !== isScreenReaderEnabled || $[102] !== rows_2 || $[103] !== handleSelect) {
    activateRow = (rowIndex) => {
      let item = rows_2[rowIndex];
      if (!item) {
        return;
      }
      if (!isScreenReaderEnabled || item.type === "self_managed_tasks" || item.type === "subagent_history") {
        handleSelect(item);
        return;
      }
      if (availableTaskActions(item).length > 0)
        setViewState({
          mode: "actions",
          itemId: item.id,
        });
    };
    $[101] = isScreenReaderEnabled;
    $[102] = rows_2;
    $[103] = handleSelect;
    $[104] = activateRow;
  } else activateRow = $[104];
  let onSelect = activateRow;
  let handleAction;
  if ($[105] !== foregroundItem || $[106] !== handleSelect || $[107] !== stopItem) {
    handleAction = function runAction(action, item) {
      switch (
        (setViewState({
          mode: "list",
        }),
        action)
      ) {
        case "view": {
          handleSelect(item);
          return;
        }
        case "foreground": {
          foregroundItem(item);
          return;
        }
        case "stop": {
          stopItem(item);
          return;
        }
      }
    };
    $[105] = foregroundItem;
    $[106] = handleSelect;
    $[107] = stopItem;
    $[108] = handleAction;
  } else handleAction = $[108];
  let runItemAction = handleAction;
  let dismissForSkip = useEffectEvent(onDone);
  let [detailSnapshot, setDetailSnapshot] = useState();
  let currentDetailTask = viewState.mode === "detail" ? tasks_2?.[viewState.itemId] : undefined;
  if (
    (currentDetailTask?.type === "local_bash" ||
      currentDetailTask?.type === "monitor_mcp" ||
      currentDetailTask?.type === "mcp_task" ||
      currentDetailTask?.type === "remote_agent" ||
      currentDetailTask?.type === "local_workflow" ||
      currentDetailTask?.type === "dream" ||
      currentDetailTask?.type === "auto_mode_scan" ||
      currentDetailTask?.type === "local_memory_import") &&
    currentDetailTask !== detailSnapshot &&
    currentDetailTask.status !== "running" &&
    currentDetailTask.status !== "pending" &&
    currentDetailTask.status !== "paused" &&
    hasBackgroundDetailScreen(currentDetailTask)
  )
    setDetailSnapshot(currentDetailTask);
  let snapshotTask =
    viewState.mode === "detail" && detailSnapshot?.id === viewState.itemId ? detailSnapshot : undefined;
  let closeIfGone;
  if (
    $[109] !== allSelectableItems ||
    $[110] !== snapshotTask ||
    $[111] !== backgroundListV3Fallback ||
    $[112] !== dismissForSkip ||
    $[113] !== tasks_2 ||
    $[114] !== viewState.itemId ||
    $[115] !== viewState.mode
  ) {
    closeIfGone = () => {
      if (viewState.mode === "actions") {
        if (!allSelectableItems.some((index) => index.id === viewState.itemId))
          setViewState({
            mode: "list",
          });
        return;
      }
      if (viewState.mode !== "list") {
        let detailTask = (tasks_2 ?? {})[viewState.itemId] ?? snapshotTask;
        if (
          !detailTask ||
          (detailTask.type !== "local_workflow" &&
            detailTask.type !== "mcp_task" &&
            !(
              (detailTask.type === "local_agent" || detailTask.type === "in_process_teammate") &&
              detailScreenGates?.isBackgroundDetailScreenEnabled()
            ) &&
            !hasBackgroundDetailScreen(detailTask) &&
            !isTaskShownInDialog(detailTask, backgroundListV3Fallback))
        ) {
          if (
            openedFromListRef.current &&
            !(!detailTask && detailScreenGates?.isBackgroundDetailScreenEnabled())
          )
            dismissForSkip("Background dialog dismissed", {
              display: "skip",
            });
          else
            setViewState({
              mode: "list",
            });
        }
      }
    };
    $[109] = allSelectableItems;
    $[110] = snapshotTask;
    $[111] = backgroundListV3Fallback;
    $[112] = dismissForSkip;
    $[113] = tasks_2;
    $[114] = viewState.itemId;
    $[115] = viewState.mode;
    $[116] = closeIfGone;
  } else closeIfGone = $[116];
  let closeIfGoneDeps;
  if (
    $[117] !== allSelectableItems ||
    $[118] !== snapshotTask ||
    $[119] !== backgroundListV3Fallback ||
    $[120] !== tasks_2 ||
    $[121] !== viewState
  ) {
    closeIfGoneDeps = [viewState, tasks_2, allSelectableItems, snapshotTask, backgroundListV3Fallback];
    $[117] = allSelectableItems;
    $[118] = snapshotTask;
    $[119] = backgroundListV3Fallback;
    $[120] = tasks_2;
    $[121] = viewState;
    $[122] = closeIfGoneDeps;
  } else closeIfGoneDeps = $[122];
  useEffect(closeIfGone, closeIfGoneDeps);
  let handleBack;
  if ($[123] !== allSelectableItems.length || $[124] !== onBack || $[125] !== onDone) {
    handleBack = () => {
      if (onBack) onBack();
      else if (openedFromListRef.current && allSelectableItems.length <= 1)
        onDone("Background dialog dismissed", {
          display: "skip",
        });
      else {
        openedFromListRef.current = false;
        setViewState({
          mode: "list",
        });
      }
    };
    $[123] = allSelectableItems.length;
    $[124] = onBack;
    $[125] = onDone;
    $[126] = handleBack;
  } else handleBack = $[126];
  let onBack_2 = handleBack;
  let hasMultipleRunningAgents = countWhere(agentTasks, isTaskRunning) > 1;
  if (viewState.mode !== "list" && viewState.mode !== "actions" && tasks_2) {
    let detailItem = tasks_2[viewState.itemId] ?? snapshotTask;
    if (!detailItem) {
      return null;
    }
    if (viewState.mode === "confirmStopReview") {
      let onStop;
      if (
        $[127] !== pendingNotifications ||
        $[128] !== setAppState ||
        $[129] !== storageV5 ||
        $[130] !== setAppState_2 ||
        $[131] !== viewState.itemId
      ) {
        onStop = () => {
          stopUltrareviewTask(
            viewState.itemId,
            "task_list",
            setAppState_2,
            setAppState,
            pendingNotifications,
            storageV5,
          );
          setViewState({
            mode: "list",
          });
        };
        $[127] = pendingNotifications;
        $[128] = setAppState;
        $[129] = storageV5;
        $[130] = setAppState_2;
        $[131] = viewState.itemId;
        $[132] = onStop;
      } else onStop = $[132];
      let onBack;
      if ($[133] === MEMO_CACHE_SENTINEL) {
        onBack = () =>
          setViewState({
            mode: "list",
          });
        $[133] = onBack;
      } else onBack = $[133];
      let confirmElement;
      if ($[134] !== onStop) {
        confirmElement = jsxProd_default(StopUltrareviewConfirm, {
          onStop,
          onBack,
        });
        $[134] = onStop;
        $[135] = confirmElement;
      } else confirmElement = $[135];
      return confirmElement;
    }
    switch (detailItem.type) {
      case "local_bash": {
        if (autoModeScanDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `shell-${detailItem.id}`;
          let onClose;
          if ($[136] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[136] = onDone;
            $[137] = onClose;
          } else onClose = $[137];
          let onStop;
          if ($[138] !== killShellTask_ || $[139] !== detailItem.id) {
            onStop = () => void killShellTask_(detailItem.id).catch(logErrorWrapper);
            $[138] = killShellTask_;
            $[139] = detailItem.id;
            $[140] = onStop;
          } else onStop = $[140];
          let detailElement;
          if (
            $[141] !== onBack_2 ||
            $[142] !== elementKey ||
            $[143] !== onClose ||
            $[144] !== onStop ||
            $[145] !== detailItem
          ) {
            detailElement = jsxProd_default(
              autoModeScanDetailGates,
              {
                shell: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              elementKey,
            );
            $[141] = onBack_2;
            $[142] = elementKey;
            $[143] = onClose;
            $[144] = onStop;
            $[145] = detailItem;
            $[146] = detailElement;
          } else detailElement = $[146];
          return detailElement;
        }
        const elementKey = `shell-${detailItem.id}`;
        let onKillShell;
        if ($[147] !== killShellTask_ || $[148] !== detailItem.id) {
          onKillShell = () => void killShellTask_(detailItem.id);
          $[147] = killShellTask_;
          $[148] = detailItem.id;
          $[149] = onKillShell;
        } else onKillShell = $[149];
        let element;
        if (
          $[150] !== onBack_2 ||
          $[151] !== onDone ||
          $[152] !== elementKey ||
          $[153] !== onKillShell ||
          $[154] !== detailItem
        ) {
          element = jsxProd_default(
            ShellDetailDialog,
            {
              shell: detailItem,
              onDone,
              onKillShell,
              onBack: onBack_2,
            },
            elementKey,
          );
          $[150] = onBack_2;
          $[151] = onDone;
          $[152] = elementKey;
          $[153] = onKillShell;
          $[154] = detailItem;
          $[155] = element;
        } else element = $[155];
        return element;
      }
      case "local_agent": {
        let onOpenTranscript;
        if ($[156] !== onDone || $[157] !== setAppState || $[158] !== detailItem) {
          onOpenTranscript = isPanelAgentTask(detailItem)
            ? () => {
                enterTeammateView(detailItem.id, setAppState);
                onDone("Viewing agent", {
                  display: "system",
                });
              }
            : undefined;
          $[156] = onDone;
          $[157] = setAppState;
          $[158] = detailItem;
          $[159] = onOpenTranscript;
        } else onOpenTranscript = $[159];
        let onOpenTranscript_ = onOpenTranscript;
        if (memoryImportDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `agent-${detailItem.id}`;
          let onClose;
          if ($[160] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[160] = onDone;
            $[161] = onClose;
          } else onClose = $[161];
          let onStop;
          if ($[162] !== killTeammateTask || $[163] !== detailItem.id) {
            onStop = () => void killTeammateTask(detailItem.id).catch(logErrorWrapper2);
            $[162] = killTeammateTask;
            $[163] = detailItem.id;
            $[164] = onStop;
          } else onStop = $[164];
          let detailElement;
          if (
            $[165] !== onBack_2 ||
            $[166] !== elementKey ||
            $[167] !== onClose ||
            $[168] !== onStop ||
            $[169] !== detailItem ||
            $[170] !== onOpenTranscript_
          ) {
            detailElement = jsxProd_default(
              memoryImportDetailGates,
              {
                agent: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
                onOpenTranscript: onOpenTranscript_,
              },
              elementKey,
            );
            $[165] = onBack_2;
            $[166] = elementKey;
            $[167] = onClose;
            $[168] = onStop;
            $[169] = detailItem;
            $[170] = onOpenTranscript_;
            $[171] = detailElement;
          } else detailElement = $[171];
          return detailElement;
        }
        const elementKey = `agent-${detailItem.id}`;
        let onKillAgent;
        if ($[172] !== killTeammateTask || $[173] !== detailItem.id) {
          onKillAgent = () => void killTeammateTask(detailItem.id);
          $[172] = killTeammateTask;
          $[173] = detailItem.id;
          $[174] = onKillAgent;
        } else onKillAgent = $[174];
        const killAllAgentsShortcut = hasMultipleRunningAgents ? killAgentsShortcut : undefined;
        let element;
        if (
          $[175] !== onBack_2 ||
          $[176] !== onDone ||
          $[177] !== elementKey ||
          $[178] !== onKillAgent ||
          $[179] !== killAllAgentsShortcut ||
          $[180] !== detailItem ||
          $[181] !== onOpenTranscript_
        ) {
          element = jsxProd_default(
            AsyncAgentDetailDialog,
            {
              agent: detailItem,
              onDone,
              onKillAgent,
              onForeground: onOpenTranscript_,
              onBack: onBack_2,
              killAllAgentsShortcut,
            },
            elementKey,
          );
          $[175] = onBack_2;
          $[176] = onDone;
          $[177] = elementKey;
          $[178] = onKillAgent;
          $[179] = killAllAgentsShortcut;
          $[180] = detailItem;
          $[181] = onOpenTranscript_;
          $[182] = element;
        } else element = $[182];
        return element;
      }
      case "remote_agent": {
        let onStop;
        if (
          $[183] !== killRemoteAgentById ||
          $[184] !== pendingNotifications ||
          $[185] !== setAppState ||
          $[186] !== storageV5 ||
          $[187] !== setAppState_2 ||
          $[188] !== detailItem.id ||
          $[189] !== detailItem.isRemoteReview ||
          $[190] !== detailItem.isUltraplan ||
          $[191] !== detailItem.sessionId ||
          $[192] !== detailItem.status
        ) {
          onStop =
            detailItem.status !== "running"
              ? undefined
              : detailItem.isUltraplan
                ? () =>
                    void stopUltraplan(
                      detailItem.id,
                      detailItem.sessionId,
                      setAppState_2,
                      setAppState,
                      pendingNotifications,
                      storageV5,
                    )
                : detailItem.isRemoteReview
                  ? () =>
                      void stopUltrareviewTask(
                        detailItem.id,
                        "task_detail",
                        setAppState_2,
                        setAppState,
                        pendingNotifications,
                        storageV5,
                      )
                  : () => void killRemoteAgentById(detailItem.id);
          $[183] = killRemoteAgentById;
          $[184] = pendingNotifications;
          $[185] = setAppState;
          $[186] = storageV5;
          $[187] = setAppState_2;
          $[188] = detailItem.id;
          $[189] = detailItem.isRemoteReview;
          $[190] = detailItem.isUltraplan;
          $[191] = detailItem.sessionId;
          $[192] = detailItem.status;
          $[193] = onStop;
        } else onStop = $[193];
        let onStop_ = onStop;
        if (shellDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `session-${detailItem.id}`;
          let onClose;
          if ($[194] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[194] = onDone;
            $[195] = onClose;
          } else onClose = $[195];
          let detailElement;
          if (
            $[196] !== onBack_2 ||
            $[197] !== onStop_ ||
            $[198] !== elementKey ||
            $[199] !== onClose ||
            $[200] !== detailItem
          ) {
            detailElement = jsxProd_default(
              shellDetailGates,
              {
                session: detailItem,
                onClose,
                onBack: onBack_2,
                onStop: onStop_,
              },
              elementKey,
            );
            $[196] = onBack_2;
            $[197] = onStop_;
            $[198] = elementKey;
            $[199] = onClose;
            $[200] = detailItem;
            $[201] = detailElement;
          } else detailElement = $[201];
          return detailElement;
        }
        const elementKey = `session-${detailItem.id}`;
        let element;
        if (
          $[202] !== commands ||
          $[203] !== onBack_2 ||
          $[204] !== onDone ||
          $[205] !== onStop_ ||
          $[206] !== elementKey ||
          $[207] !== detailItem ||
          $[208] !== tools ||
          $[209] !== verbose
        ) {
          element = jsxProd_default(
            RemoteSessionDetailDialog,
            {
              session: detailItem,
              onDone,
              tools,
              commands,
              verbose,
              onBack: onBack_2,
              onKill: onStop_,
            },
            elementKey,
          );
          $[202] = commands;
          $[203] = onBack_2;
          $[204] = onDone;
          $[205] = onStop_;
          $[206] = elementKey;
          $[207] = detailItem;
          $[208] = tools;
          $[209] = verbose;
          $[210] = element;
        } else element = $[210];
        return element;
      }
      case "in_process_teammate": {
        let onOpenTranscript;
        if (
          $[211] !== onDone ||
          $[212] !== setAppState ||
          $[213] !== detailItem.id ||
          $[214] !== detailItem.status
        ) {
          onOpenTranscript =
            detailItem.status === "running"
              ? () => {
                  enterTeammateView(detailItem.id, setAppState);
                  onDone("Viewing teammate", {
                    display: "system",
                  });
                }
              : undefined;
          $[211] = onDone;
          $[212] = setAppState;
          $[213] = detailItem.id;
          $[214] = detailItem.status;
          $[215] = onOpenTranscript;
        } else onOpenTranscript = $[215];
        let onOpenTranscript_ = onOpenTranscript;
        if (subagentHistoryDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `teammate-${detailItem.id}`;
          let onClose;
          if ($[216] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[216] = onDone;
            $[217] = onClose;
          } else onClose = $[217];
          let onStop;
          if ($[218] !== killDreamTask || $[219] !== detailItem.id) {
            onStop = () => void killDreamTask(detailItem.id).catch(logErrorWrapper3);
            $[218] = killDreamTask;
            $[219] = detailItem.id;
            $[220] = onStop;
          } else onStop = $[220];
          let detailElement;
          if (
            $[221] !== onBack_2 ||
            $[222] !== elementKey ||
            $[223] !== onClose ||
            $[224] !== onStop ||
            $[225] !== detailItem ||
            $[226] !== onOpenTranscript_
          ) {
            detailElement = jsxProd_default(
              subagentHistoryDetailGates,
              {
                teammate: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
                onOpenTranscript: onOpenTranscript_,
              },
              elementKey,
            );
            $[221] = onBack_2;
            $[222] = elementKey;
            $[223] = onClose;
            $[224] = onStop;
            $[225] = detailItem;
            $[226] = onOpenTranscript_;
            $[227] = detailElement;
          } else detailElement = $[227];
          return detailElement;
        }
        const elementKey = `teammate-${detailItem.id}`;
        let onKill;
        if ($[228] !== killDreamTask || $[229] !== detailItem.id || $[230] !== detailItem.status) {
          onKill = detailItem.status === "running" ? () => void killDreamTask(detailItem.id) : undefined;
          $[228] = killDreamTask;
          $[229] = detailItem.id;
          $[230] = detailItem.status;
          $[231] = onKill;
        } else onKill = $[231];
        let element;
        if (
          $[232] !== onBack_2 ||
          $[233] !== onDone ||
          $[234] !== elementKey ||
          $[235] !== onKill ||
          $[236] !== detailItem ||
          $[237] !== onOpenTranscript_
        ) {
          element = jsxProd_default(
            InProcessTeammateDetailDialog,
            {
              teammate: detailItem,
              onDone,
              onKill,
              onBack: onBack_2,
              onForeground: onOpenTranscript_,
            },
            elementKey,
          );
          $[232] = onBack_2;
          $[233] = onDone;
          $[234] = elementKey;
          $[235] = onKill;
          $[236] = detailItem;
          $[237] = onOpenTranscript_;
          $[238] = element;
        } else element = $[238];
        return element;
      }
      case "local_workflow": {
        let workflowActions;
        if ($[239] !== setAppState_2 || $[240] !== detailItem.id || $[241] !== detailItem.status) {
          workflowActions =
            detailItem.status === "running"
              ? {
                  onKill: () => killWorkflowTask(detailItem.id, setAppState_2, "user"),
                  onPause: () => pauseWorkflowTask(detailItem.id, setAppState_2),
                  onSkipAgent: (agentId) => skipWorkflowAgent(detailItem.id, agentId, setAppState_2),
                  onRetryAgent: (exitState) => retryWorkflowAgent(detailItem.id, exitState, setAppState_2),
                }
              : undefined;
          $[239] = setAppState_2;
          $[240] = detailItem.id;
          $[241] = detailItem.status;
          $[242] = workflowActions;
        } else workflowActions = $[242];
        let workflowActions_ = workflowActions;
        if (dreamDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `workflow-${detailItem.id}`;
          let onClose;
          if ($[243] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[243] = onDone;
            $[244] = onClose;
          } else onClose = $[244];
          const onStop = workflowActions_?.onKill;
          const onPause = workflowActions_?.onPause;
          const onSkipAgent = workflowActions_?.onSkipAgent;
          const onRetryAgent = workflowActions_?.onRetryAgent;
          let detailElement;
          if (
            $[245] !== onBack_2 ||
            $[246] !== onDone ||
            $[247] !== promptVisibleBelow_2 ||
            $[248] !== elementKey ||
            $[249] !== onClose ||
            $[250] !== onStop ||
            $[251] !== onPause ||
            $[252] !== onSkipAgent ||
            $[253] !== onRetryAgent ||
            $[254] !== detailItem
          ) {
            detailElement = jsxProd_default(
              dreamDetailGates,
              {
                workflow: detailItem,
                onClose,
                onBack: onBack_2,
                onSaved: onDone,
                onStop,
                onPause,
                onSkipAgent,
                onRetryAgent,
                promptVisibleBelow: promptVisibleBelow_2,
              },
              elementKey,
            );
            $[245] = onBack_2;
            $[246] = onDone;
            $[247] = promptVisibleBelow_2;
            $[248] = elementKey;
            $[249] = onClose;
            $[250] = onStop;
            $[251] = onPause;
            $[252] = onSkipAgent;
            $[253] = onRetryAgent;
            $[254] = detailItem;
            $[255] = detailElement;
          } else detailElement = $[255];
          return detailElement;
        }
        const elementKey = `workflow-${detailItem.id}`;
        const onKill = workflowActions_?.onKill;
        const onPause = workflowActions_?.onPause;
        const onSkipAgent = workflowActions_?.onSkipAgent;
        const onRetryAgent = workflowActions_?.onRetryAgent;
        let element;
        if (
          $[256] !== onBack_2 ||
          $[257] !== onDone ||
          $[258] !== promptVisibleBelow_2 ||
          $[259] !== elementKey ||
          $[260] !== onKill ||
          $[261] !== onPause ||
          $[262] !== onSkipAgent ||
          $[263] !== onRetryAgent ||
          $[264] !== detailItem
        ) {
          element = jsxProd_default(
            WorkflowDetailDialog,
            {
              workflow: detailItem,
              onDone,
              promptVisibleBelow: promptVisibleBelow_2,
              onKill,
              onPause,
              onSkipAgent,
              onRetryAgent,
              onBack: onBack_2,
            },
            elementKey,
          );
          $[256] = onBack_2;
          $[257] = onDone;
          $[258] = promptVisibleBelow_2;
          $[259] = elementKey;
          $[260] = onKill;
          $[261] = onPause;
          $[262] = onSkipAgent;
          $[263] = onRetryAgent;
          $[264] = detailItem;
          $[265] = element;
        } else element = $[265];
        return element;
      }
      case "mcp_task": {
        if (!McpTaskDetailDialog) {
          return null;
        }
        if (mcpTaskDetailFeatureGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `mcp-task-${detailItem.id}`;
          let onClose;
          if ($[266] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[266] = onDone;
            $[267] = onClose;
          } else onClose = $[267];
          let onStop;
          if ($[268] !== killAgentTask || $[269] !== detailItem.id) {
            onStop = () => {
              if (kill) killAgentTask(detailItem.id, kill);
            };
            $[268] = killAgentTask;
            $[269] = detailItem.id;
            $[270] = onStop;
          } else onStop = $[270];
          let detailElement;
          if (
            $[271] !== onBack_2 ||
            $[272] !== elementKey ||
            $[273] !== onClose ||
            $[274] !== onStop ||
            $[275] !== detailItem
          ) {
            detailElement = jsxProd_default(
              mcpTaskDetailFeatureGates,
              {
                task: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              elementKey,
            );
            $[271] = onBack_2;
            $[272] = elementKey;
            $[273] = onClose;
            $[274] = onStop;
            $[275] = detailItem;
            $[276] = detailElement;
          } else detailElement = $[276];
          return detailElement;
        }
        const elementKey = `mcp-task-${detailItem.id}`;
        let onDone_2;
        if ($[277] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[277] = onDone;
          $[278] = onDone_2;
        } else onDone_2 = $[278];
        let onKill;
        if ($[279] !== killAgentTask || $[280] !== detailItem.id || $[281] !== detailItem.status) {
          onKill =
            detailItem.status === "running" && kill
              ? () => void killAgentTask(detailItem.id, kill)
              : undefined;
          $[279] = killAgentTask;
          $[280] = detailItem.id;
          $[281] = detailItem.status;
          $[282] = onKill;
        } else onKill = $[282];
        let element;
        if (
          $[283] !== onBack_2 ||
          $[284] !== elementKey ||
          $[285] !== onDone_2 ||
          $[286] !== onKill ||
          $[287] !== detailItem
        ) {
          element = jsxProd_default(
            McpTaskDetailDialog,
            {
              task: detailItem,
              onDone: onDone_2,
              onKill,
              onBack: onBack_2,
            },
            elementKey,
          );
          $[283] = onBack_2;
          $[284] = elementKey;
          $[285] = onDone_2;
          $[286] = onKill;
          $[287] = detailItem;
          $[288] = element;
        } else element = $[288];
        return element;
      }
      case "monitor_mcp": {
        if (!mcpTaskDetailDialogModule) {
          return null;
        }
        if (monitorMcpDetailFeatureGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `monitor-mcp-${detailItem.id}`;
          let onClose;
          if ($[289] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[289] = onDone;
            $[290] = onClose;
          } else onClose = $[290];
          let onStop;
          if ($[291] !== setAppState_2 || $[292] !== detailItem.id) {
            onStop = () => killMonitorMcp?.(detailItem.id, setAppState_2);
            $[291] = setAppState_2;
            $[292] = detailItem.id;
            $[293] = onStop;
          } else onStop = $[293];
          let detailElement;
          if (
            $[294] !== onBack_2 ||
            $[295] !== elementKey ||
            $[296] !== onClose ||
            $[297] !== onStop ||
            $[298] !== detailItem
          ) {
            detailElement = jsxProd_default(
              monitorMcpDetailFeatureGates,
              {
                monitor: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              elementKey,
            );
            $[294] = onBack_2;
            $[295] = elementKey;
            $[296] = onClose;
            $[297] = onStop;
            $[298] = detailItem;
            $[299] = detailElement;
          } else detailElement = $[299];
          return detailElement;
        }
        const elementKey = `monitor-mcp-${detailItem.id}`;
        let onKill;
        if ($[300] !== setAppState_2 || $[301] !== detailItem.id || $[302] !== detailItem.status) {
          onKill =
            detailItem.status === "running" && killMonitorMcp
              ? () => killMonitorMcp(detailItem.id, setAppState_2)
              : undefined;
          $[300] = setAppState_2;
          $[301] = detailItem.id;
          $[302] = detailItem.status;
          $[303] = onKill;
        } else onKill = $[303];
        let element;
        if ($[304] !== onBack_2 || $[305] !== elementKey || $[306] !== onKill || $[307] !== detailItem) {
          element = jsxProd_default(
            mcpTaskDetailDialogModule,
            {
              task: detailItem,
              onKill,
              onBack: onBack_2,
            },
            elementKey,
          );
          $[304] = onBack_2;
          $[305] = elementKey;
          $[306] = onKill;
          $[307] = detailItem;
          $[308] = element;
        } else element = $[308];
        return element;
      }
      case "dream": {
        if (workflowDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `dream-${detailItem.id}`;
          let onClose;
          if ($[309] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[309] = onDone;
            $[310] = onClose;
          } else onClose = $[310];
          let onStop;
          if ($[311] !== killMemoryImportTask || $[312] !== detailItem.id) {
            onStop = () => void killMemoryImportTask(detailItem.id).catch(logErrorWrapper4);
            $[311] = killMemoryImportTask;
            $[312] = detailItem.id;
            $[313] = onStop;
          } else onStop = $[313];
          let detailElement;
          if (
            $[314] !== onBack_2 ||
            $[315] !== elementKey ||
            $[316] !== onClose ||
            $[317] !== onStop ||
            $[318] !== detailItem
          ) {
            detailElement = jsxProd_default(
              workflowDetailGates,
              {
                task: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              elementKey,
            );
            $[314] = onBack_2;
            $[315] = elementKey;
            $[316] = onClose;
            $[317] = onStop;
            $[318] = detailItem;
            $[319] = detailElement;
          } else detailElement = $[319];
          return detailElement;
        }
        const elementKey = `dream-${detailItem.id}`;
        let onDone_2;
        if ($[320] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[320] = onDone;
          $[321] = onDone_2;
        } else onDone_2 = $[321];
        let onKill;
        if ($[322] !== killMemoryImportTask || $[323] !== detailItem.id || $[324] !== detailItem.status) {
          onKill =
            detailItem.status === "running" ? () => void killMemoryImportTask(detailItem.id) : undefined;
          $[322] = killMemoryImportTask;
          $[323] = detailItem.id;
          $[324] = detailItem.status;
          $[325] = onKill;
        } else onKill = $[325];
        let element;
        if (
          $[326] !== onBack_2 ||
          $[327] !== elementKey ||
          $[328] !== onDone_2 ||
          $[329] !== onKill ||
          $[330] !== detailItem
        ) {
          element = jsxProd_default(
            DreamDetailDialog,
            {
              task: detailItem,
              onDone: onDone_2,
              onBack: onBack_2,
              onKill,
            },
            elementKey,
          );
          $[326] = onBack_2;
          $[327] = elementKey;
          $[328] = onDone_2;
          $[329] = onKill;
          $[330] = detailItem;
          $[331] = element;
        } else element = $[331];
        return element;
      }
      case "auto_mode_scan": {
        if (remoteAgentDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `auto-mode-scan-${detailItem.id}`;
          let onClose;
          if ($[332] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[332] = onDone;
            $[333] = onClose;
          } else onClose = $[333];
          let onStop;
          if ($[334] !== killRemoteAgentTask || $[335] !== detailItem.id) {
            onStop = () => void killRemoteAgentTask(detailItem.id).catch(logErrorWrapper5);
            $[334] = killRemoteAgentTask;
            $[335] = detailItem.id;
            $[336] = onStop;
          } else onStop = $[336];
          let detailElement;
          if (
            $[337] !== onBack_2 ||
            $[338] !== elementKey ||
            $[339] !== onClose ||
            $[340] !== onStop ||
            $[341] !== detailItem
          ) {
            detailElement = jsxProd_default(
              remoteAgentDetailGates,
              {
                task: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              elementKey,
            );
            $[337] = onBack_2;
            $[338] = elementKey;
            $[339] = onClose;
            $[340] = onStop;
            $[341] = detailItem;
            $[342] = detailElement;
          } else detailElement = $[342];
          return detailElement;
        }
        const elementKey = `auto-mode-scan-${detailItem.id}`;
        let onDone_2;
        if ($[343] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[343] = onDone;
          $[344] = onDone_2;
        } else onDone_2 = $[344];
        let onKill;
        if ($[345] !== killRemoteAgentTask || $[346] !== detailItem.id || $[347] !== detailItem.status) {
          onKill =
            detailItem.status === "running" ? () => void killRemoteAgentTask(detailItem.id) : undefined;
          $[345] = killRemoteAgentTask;
          $[346] = detailItem.id;
          $[347] = detailItem.status;
          $[348] = onKill;
        } else onKill = $[348];
        let element;
        if (
          $[349] !== onBack_2 ||
          $[350] !== elementKey ||
          $[351] !== onDone_2 ||
          $[352] !== onKill ||
          $[353] !== detailItem
        ) {
          element = jsxProd_default(
            TaskDetailDialog,
            {
              task: detailItem,
              onDone: onDone_2,
              onBack: onBack_2,
              onKill,
            },
            elementKey,
          );
          $[349] = onBack_2;
          $[350] = elementKey;
          $[351] = onDone_2;
          $[352] = onKill;
          $[353] = detailItem;
          $[354] = element;
        } else element = $[354];
        return element;
      }
      case "local_memory_import": {
        if (localMemoryDetailModule !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `local-memory-import-${detailItem.id}`;
          let onClose;
          if ($[355] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[355] = onDone;
            $[356] = onClose;
          } else onClose = $[356];
          let onStop;
          if ($[357] !== killAutoModeScanTask || $[358] !== detailItem.id) {
            onStop = () => void killAutoModeScanTask(detailItem.id).catch(logErrorWrapper6);
            $[357] = killAutoModeScanTask;
            $[358] = detailItem.id;
            $[359] = onStop;
          } else onStop = $[359];
          let detailElement;
          if (
            $[360] !== onBack_2 ||
            $[361] !== elementKey ||
            $[362] !== onClose ||
            $[363] !== onStop ||
            $[364] !== detailItem
          ) {
            detailElement = jsxProd_default(
              localMemoryDetailModule,
              {
                task: detailItem,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              elementKey,
            );
            $[360] = onBack_2;
            $[361] = elementKey;
            $[362] = onClose;
            $[363] = onStop;
            $[364] = detailItem;
            $[365] = detailElement;
          } else detailElement = $[365];
          return detailElement;
        }
        if (!localMemoryImportDetailGates) {
          return null;
        }
        const elementKey = `local-memory-import-${detailItem.id}`;
        let onDone_2;
        if ($[366] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[366] = onDone;
          $[367] = onDone_2;
        } else onDone_2 = $[367];
        let onKill;
        if ($[368] !== killAutoModeScanTask || $[369] !== detailItem.id || $[370] !== detailItem.status) {
          onKill =
            detailItem.status === "running" ? () => void killAutoModeScanTask(detailItem.id) : undefined;
          $[368] = killAutoModeScanTask;
          $[369] = detailItem.id;
          $[370] = detailItem.status;
          $[371] = onKill;
        } else onKill = $[371];
        let element;
        if (
          $[372] !== onBack_2 ||
          $[373] !== elementKey ||
          $[374] !== onDone_2 ||
          $[375] !== onKill ||
          $[376] !== detailItem
        ) {
          element = jsxProd_default(
            localMemoryImportDetailGates,
            {
              task: detailItem,
              onDone: onDone_2,
              onBack: onBack_2,
              onKill,
            },
            elementKey,
          );
          $[372] = onBack_2;
          $[373] = elementKey;
          $[374] = onDone_2;
          $[375] = onKill;
          $[376] = detailItem;
          $[377] = element;
        } else element = $[377];
        return element;
      }
    }
  }
  let runningShellCount = countWhere(bashTasks, isTaskRunning_2);
  let runningAgentCount =
    countWhere(remoteSessions, isTaskRunningOrPending) + countWhere(agentTasks, isTaskRunning_3);
  let teammateCount = countWhere(teammateTasks, getDisplayName_2);
  let summaryChildren;
  if ($[378] !== runningAgentCount || $[379] !== runningShellCount || $[380] !== teammateCount) {
    summaryChildren = intersperse(
      [
        ...(teammateCount > 0
          ? [
              jsxProd_default_2(
                Text,
                {
                  children: [teammateCount, " ", teammateCount !== 1 ? "agents" : "agent"],
                },
                "teammates",
              ),
            ]
          : []),
        ...(runningShellCount > 0
          ? [
              jsxProd_default_2(
                Text,
                {
                  children: [
                    runningShellCount,
                    " ",
                    runningShellCount !== 1 ? "active shells" : "active shell",
                  ],
                },
                "shells",
              ),
            ]
          : []),
        ...(runningAgentCount > 0
          ? [
              jsxProd_default_2(
                Text,
                {
                  children: [
                    runningAgentCount,
                    " ",
                    runningAgentCount !== 1 ? "active agents" : "active agent",
                  ],
                },
                "agents",
              ),
            ]
          : []),
      ],
      renderSeparator,
    );
    $[378] = runningAgentCount;
    $[379] = runningShellCount;
    $[380] = teammateCount;
    $[381] = summaryChildren;
  } else summaryChildren = $[381];
  let children = summaryChildren;
  let hintFormat = backgroundListV3Fallback ? TERSE_SHORTCUT_FORMAT : EMPTY_SHORTCUT_FORMAT;
  let navigationHints;
  if ($[382] !== selectedItem || $[383] !== hintFormat || $[384] !== isScreenReaderEnabled) {
    navigationHints = isScreenReaderEnabled
      ? []
      : [
          jsxProd_default(
            KeyboardShortcutHint,
            {
              chord: ["up", "down"],
              action: "select",
              ...hintFormat,
            },
            "upDown",
          ),
          ...(!selectedItem || canOpenTaskDetail(selectedItem)
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "enter",
                    action: "view",
                    ...hintFormat,
                  },
                  "enter",
                ),
              ]
            : []),
          ...(selectedItem?.type === "self_managed_tasks" ||
          (selectedItem?.type === "subagent_history" &&
            selectedItem.size !== 0 &&
            selectedItem.size !== "unreadable")
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "enter",
                    action: "show",
                    ...hintFormat,
                  },
                  "show",
                ),
              ]
            : []),
          ...(selectedItem && canForegroundTask(selectedItem)
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "f",
                    action: "foreground",
                    ...hintFormat,
                  },
                  "foreground",
                ),
              ]
            : []),
          ...(selectedItem && canStopTask(selectedItem)
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "x",
                    action: "stop",
                    ...hintFormat,
                  },
                  "kill",
                ),
              ]
            : []),
        ];
    $[382] = selectedItem;
    $[383] = hintFormat;
    $[384] = isScreenReaderEnabled;
    $[385] = navigationHints;
  } else navigationHints = $[385];
  let killAllHints;
  if (
    $[386] !== selectedItem ||
    $[387] !== hasMultipleRunningAgents ||
    $[388] !== backgroundListV3Fallback ||
    $[389] !== killAgentsShortcut
  ) {
    killAllHints =
      selectedItem?.type === "local_agent" &&
      canStopTask(selectedItem) &&
      hasMultipleRunningAgents &&
      killAgentsShortcut
        ? [
            jsxProd_default(
              KeyboardShortcutHint,
              {
                chord: killAgentsShortcut,
                action: "stop all agents",
                format: {
                  keyCase: "lower",
                },
                terse: backgroundListV3Fallback,
              },
              "kill-all",
            ),
          ]
        : [];
    $[386] = selectedItem;
    $[387] = hasMultipleRunningAgents;
    $[388] = backgroundListV3Fallback;
    $[389] = killAgentsShortcut;
    $[390] = killAllHints;
  } else killAllHints = $[390];
  const action = viewState.mode === "actions" ? "go back" : "close";
  let escapeHint;
  if ($[391] !== hintFormat || $[392] !== action) {
    escapeHint = jsxProd_default(
      KeyboardShortcutHint,
      {
        chord: "escape",
        action,
        ...hintFormat,
      },
      "esc",
    );
    $[391] = hintFormat;
    $[392] = action;
    $[393] = escapeHint;
  } else escapeHint = $[393];
  let inputGuideChildren;
  if ($[394] !== navigationHints || $[395] !== killAllHints || $[396] !== escapeHint) {
    inputGuideChildren = [...navigationHints, ...killAllHints, escapeHint];
    $[394] = navigationHints;
    $[395] = killAllHints;
    $[396] = escapeHint;
    $[397] = inputGuideChildren;
  } else inputGuideChildren = $[397];
  let children_2 = inputGuideChildren;
  let heading;
  if (
    $[398] !== agentTasks.length ||
    $[399] !== bashTasks ||
    $[400] !== completedAgentTasks.length ||
    $[401] !== remoteSessions.length ||
    $[402] !== teammateTasks ||
    $[403] !== teams.length
  ) {
    heading =
      teams.length > 0 &&
      (bashTasks.length > 0 ||
        remoteSessions.length > 0 ||
        agentTasks.length > 0 ||
        completedAgentTasks.length > 0) &&
      jsxProd_default(SectionHeading, {
        label: "Agents",
        size: countWhere(teammateTasks, getDisplayName),
      });
    $[398] = agentTasks.length;
    $[399] = bashTasks;
    $[400] = completedAgentTasks.length;
    $[401] = remoteSessions.length;
    $[402] = teammateTasks;
    $[403] = teams.length;
    $[404] = heading;
  } else heading = $[404];
  let listRows_2;
  if (
    $[405] !== agentTasks ||
    $[406] !== allSelectableItems ||
    $[407] !== autoModeScanTasks ||
    $[408] !== bashTasks ||
    $[409] !== completedAgentTasks ||
    $[410] !== dreamTasks ||
    $[411] !== historyRow ||
    $[412] !== isScreenReaderEnabled ||
    $[413] !== mcpMonitors ||
    $[414] !== mcpTasks ||
    $[415] !== memoryImportTasks ||
    $[416] !== memorySaveTasks ||
    $[417] !== remoteSessions ||
    $[418] !== selfManaged ||
    $[419] !== showSelfManaged ||
    $[420] !== heading ||
    $[421] !== teammateTasks ||
    $[422] !== teams ||
    $[423] !== workflowTasks
  ) {
    let sections = [
      {
        key: "agents",
        items: teammateTasks,
        heading,
      },
      {
        key: "shells",
        items: bashTasks,
        heading:
          (teammateTasks.length > 0 ||
            remoteSessions.length > 0 ||
            agentTasks.length > 0 ||
            completedAgentTasks.length > 0) &&
          jsxProd_default(SectionHeading, {
            label: "Shells",
            size: bashTasks.length,
          }),
      },
      {
        key: "monitors",
        items: mcpMonitors,
        heading: jsxProd_default(SectionHeading, {
          label: "Monitors",
          size: mcpMonitors.length,
        }),
      },
      {
        key: "mcp-tasks",
        items: mcpTasks,
        heading: jsxProd_default(SectionHeading, {
          label: "MCP tasks",
          size: mcpTasks.length,
        }),
      },
      {
        key: "cloud-agents",
        items: remoteSessions,
        heading: jsxProd_default(SectionHeading, {
          label: "Cloud agents",
          size: remoteSessions.length,
        }),
      },
      {
        key: "local-agents",
        items: agentTasks,
        heading: jsxProd_default(SectionHeading, {
          label: "Local agents",
          size: agentTasks.length,
        }),
      },
      {
        key: "completed",
        items: completedAgentTasks,
        heading: jsxProd_default(SectionHeading, {
          label: "Completed",
          size: completedAgentTasks.length,
        }),
      },
      {
        key: "workflows",
        items: workflowTasks,
        heading: jsxProd_default(SectionHeading, {
          label: "Dynamic workflows",
          size: workflowTasks.length,
        }),
      },
      {
        key: "dream",
        items: dreamTasks,
      },
      {
        key: "auto-mode-scan",
        items: autoModeScanTasks,
      },
      {
        key: "local-memory-import",
        items: memoryImportTasks,
      },
      {
        key: "post-turn-memory",
        items: memorySaveTasks,
      },
      ...(codeModeAccepted()
        ? [
            {
              key: "scripts",
              items: allSelectableItems.filter(isLocalScriptTaskRow),
            },
          ]
        : []),
      {
        key: "self-managed",
        items: selfManaged,
        heading:
          showSelfManaged &&
          jsxProd_default(SectionHeading, {
            label: SYSTEM_TASKS_LABEL,
            size: selfManaged.length,
          }),
      },
      {
        key: "subagent-history",
        items: historyRow,
        heading:
          historyRow[0]?.type === "recorded_agent" &&
          jsxProd_default(SectionHeading, {
            label: EARLIER_IN_SESSION_LABEL,
            size: historyRow.length,
          }),
      },
    ];
    let found = teammateTasks.find(getDisplayName_3);
    let sectionItems = (section) =>
      section.key === "agents" && teams.length > 0
        ? teams.flatMap((item_6) => {
            let [teamName, teamTasks] = item_6;
            return [
              {
                kind: "heading",
                heading: `Team: ${collapseWhitespace(teamName)} (${teamTasks.length + (found ? 1 : 0)})`,
                key: `${teamName}-team`,
              },
              ...(found
                ? [
                    {
                      kind: "row",
                      item: found,
                      key: `${found.id}-${teamName}`,
                    },
                  ]
                : []),
              ...teamTasks.map(TeammateTaskGroups),
            ];
          })
        : section.items.map(toListRow);
    let now = new Date(Date.now());
    let filtered = sections.filter(hasRows);
    listRows_2 = filtered.flatMap((section, sectionIndex) => [
      ...(sectionIndex > 0 ? [jsxProd_default(merged.Heading, {}, `${section.key}-gap`)] : []),
      ...(section.heading
        ? [
            jsxProd_default(
              merged.Heading,
              {
                children: section.heading,
              },
              `${section.key}-heading`,
            ),
          ]
        : []),
      ...sectionItems(section).map((item_7) => {
        if (item_7.kind === "heading") {
          return jsxProd_default(
            merged.Heading,
            {
              children: jsxProd_default(Text, {
                dimColor: true,
                children: item_7.heading,
              }),
            },
            item_7.key,
          );
        }
        let { item } = item_7;
        if (item.type === "self_managed_tasks") {
          return jsxProd_default(
            OrderedListWithItem.Item,
            {
              label: item.label,
              meta: [`${item.size} hidden`],
            },
            item_7.key,
          );
        }
        if (item.type === "subagent_history") {
          return jsxProd_default(
            OrderedListWithItem.Item,
            {
              label:
                item.size === undefined || isScreenReaderEnabled
                  ? item.label
                  : `${item.label} (${item.size === "unreadable" ? "could not be read" : item.size})`,
            },
            item_7.key,
          );
        }
        if (item.type === "recorded_agent") {
          return jsxProd_default(
            OrderedListWithItem.Item,
            {
              ...describeSubagentRow(item.row, {
                now,
                isScreenReader: isScreenReaderEnabled,
                isRefused: item.isRefused,
              }),
            },
            item_7.key,
          );
        }
        let rowProps = item.type === "leader" ? null : BackgroundTask(item.task);
        return rowProps
          ? jsxProd_default(
              OrderedListWithItem.Item,
              {
                ...rowProps,
              },
              item_7.key,
            )
          : jsxProd_default(
              merged.Item,
              {
                children: jsxProd_default(TaskItemLabel, {
                  item,
                }),
              },
              item_7.key,
            );
      }),
    ]);
    $[405] = agentTasks;
    $[406] = allSelectableItems;
    $[407] = autoModeScanTasks;
    $[408] = bashTasks;
    $[409] = completedAgentTasks;
    $[410] = dreamTasks;
    $[411] = historyRow;
    $[412] = isScreenReaderEnabled;
    $[413] = mcpMonitors;
    $[414] = mcpTasks;
    $[415] = memoryImportTasks;
    $[416] = memorySaveTasks;
    $[417] = remoteSessions;
    $[418] = selfManaged;
    $[419] = showSelfManaged;
    $[420] = heading;
    $[421] = teammateTasks;
    $[422] = teams;
    $[423] = workflowTasks;
    $[424] = listRows_2;
  } else listRows_2 = $[424];
  let renderedRows = listRows_2;
  let listChildren;
  if ($[425] !== backgroundListFallback || $[426] !== renderedRows) {
    listChildren =
      backgroundListFallback && backgroundListModules
        ? backgroundListFallback.rows.map((item_8) =>
            jsxProd_default(
              merged.Item,
              {
                children: jsxProd_default(backgroundListModules.BackgroundListLine, {
                  row: item_8,
                  widths: backgroundListFallback.widths,
                }),
              },
              item_8.id,
            ),
          )
        : renderedRows;
    $[425] = backgroundListFallback;
    $[426] = renderedRows;
    $[427] = listChildren;
  } else listChildren = $[427];
  let renderedListRows = listChildren;
  let BACKGROUND_LIST_LINES =
    backgroundListModules && backgroundListFallback ? backgroundListModules.BACKGROUND_LIST_LINES : undefined;
  let visibleCount =
    visibleRowCount === undefined
      ? undefined
      : Math.min(renderedListRows.length, BACKGROUND_LIST_LINES ?? visibleRowCount);
  let dialogElement;
  if (
    $[428] !== children_2 ||
    $[429] !== allSelectableItems ||
    $[430] !== focusedRow ||
    $[431] !== onRowKeyDown ||
    $[432] !== historyRow.length ||
    $[433] !== renderedListRows ||
    $[434] !== rows_2 ||
    $[435] !== backgroundListFallback ||
    $[436] !== BACKGROUND_LIST_LINES ||
    $[437] !== onDone ||
    $[438] !== onFocus ||
    $[439] !== runItemAction ||
    $[440] !== onSelect ||
    $[441] !== children ||
    $[442] !== columns ||
    $[443] !== viewState.itemId ||
    $[444] !== viewState.mode ||
    $[445] !== visibleCount
  ) {
    let actionItem =
      viewState.mode === "actions"
        ? allSelectableItems.find((item_9) => item_9.id === viewState.itemId)
        : undefined;
    let focusedIndex;
    if ($[447] !== focusedRow || $[448] !== rows_2) {
      let matchesFocus;
      if ($[450] !== focusedRow) {
        matchesFocus = (item_10) => item_10.id === focusedRow.id;
        $[450] = focusedRow;
        $[451] = matchesFocus;
      } else matchesFocus = $[451];
      focusedIndex = rows_2.findIndex(matchesFocus);
      $[447] = focusedRow;
      $[448] = rows_2;
      $[449] = focusedIndex;
    } else focusedIndex = $[449];
    let focusedIndexOf = focusedIndex;
    let onCancel;
    if ($[452] !== onDone || $[453] !== viewState.mode) {
      onCancel = () => {
        if (viewState.mode === "actions") {
          setViewState({
            mode: "list",
          });
          return;
        }
        onDone("Background dialog dismissed", {
          display: "skip",
        });
      };
      $[452] = onDone;
      $[453] = viewState.mode;
      $[454] = onCancel;
    } else onCancel = $[454];
    let onCancel_2 = onCancel;
    let subtitle;
    if ($[455] !== backgroundListFallback || $[456] !== children) {
      subtitle = backgroundListFallback
        ? backgroundListFallback.count
        : jsxProd_default(Fragment, {
            children,
          });
      $[455] = backgroundListFallback;
      $[456] = children;
      $[457] = subtitle;
    } else subtitle = $[457];
    let inputGuide;
    if ($[458] !== children_2) {
      inputGuide = jsxProd_default(Byline, {
        children: children_2,
      });
      $[458] = children_2;
      $[459] = inputGuide;
    } else inputGuide = $[459];
    dialogElement = jsxProd_default(Dialog, {
      title: "Background",
      subtitle,
      onCancel: onCancel_2,
      color: backgroundListFallback ? "permission" : "background",
      inputGuide,
      children: actionItem
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                wrap: "truncate-end",
                children: [
                  "Actions for",
                  " ",
                  truncateToWidth(Item(actionItem), Math.max(1, columns - MAX_SUBAGENT_HISTORY_ROWS)),
                ],
              }),
              jsxProd_default(ModelSelector, {
                options: availableTaskActions(actionItem).map(toActionOption),
                onChange: (item_11) => runItemAction(item_11, actionItem),
              }),
            ],
          })
        : jsxProd_default_2(Fragment, {
            children: [
              allSelectableItems.length === historyRow.length &&
                jsxProd_default(HintText, {
                  children: "No tasks currently running",
                }),
              allSelectableItems.length > 0 &&
                jsxProd_default(OrderedListWithItem, {
                  defaultFocusIndex:
                    focusedIndexOf !== -1 ? focusedIndexOf : Math.min(focusedRow.index, rows_2.length - 1),
                  visibleCount,
                  maxVisibleCount: BACKGROUND_LIST_LINES,
                  onFocus,
                  onSelect,
                  onRowKeyDown,
                  children: renderedListRows,
                }),
            ],
          }),
    });
    $[428] = children_2;
    $[429] = allSelectableItems;
    $[430] = focusedRow;
    $[431] = onRowKeyDown;
    $[432] = historyRow.length;
    $[433] = renderedListRows;
    $[434] = rows_2;
    $[435] = backgroundListFallback;
    $[436] = BACKGROUND_LIST_LINES;
    $[437] = onDone;
    $[438] = onFocus;
    $[439] = runItemAction;
    $[440] = onSelect;
    $[441] = children;
    $[442] = columns;
    $[443] = viewState.itemId;
    $[444] = viewState.mode;
    $[445] = visibleCount;
    $[446] = dialogElement;
  } else dialogElement = $[446];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:783925-783983 layout
var ACTION_LABELS = {
  view: "View",
  foreground: "Foreground",
  stop: "Stop",
};
//@ chunk-czq1j3j2.js:783983-784077 layout
function availableTaskActions(item) {
  return [
    ...(canOpenTaskDetail(item) ? ["view"] : []),
    ...(canForegroundTask(item) ? ["foreground"] : []),
    ...(canStopTask(item) ? ["stop"] : []),
  ];
}
//@ chunk-czq1j3j2.js:784077-784184 layout
function canOpenTaskDetail(item) {
  return (
    hasDetailDialog(item.type) ||
    (item.type === "recorded_agent" && item.row.entry.agentType !== undefined && !item.isRefused)
  );
}
//@ chunk-czq1j3j2.js:784184-784346 layout
function canForegroundTask(item) {
  return (
    (item.type === "in_process_teammate" && item.status === "running") ||
    (item.type === "local_agent" &&
      isPanelAgentTask(item.task) &&
      item.status !== "failed" &&
      item.status !== "killed" &&
      !getSelectableBackgroundTasks_2(item))
  );
}
//@ chunk-czq1j3j2.js:784346-784762 layout
/**
 * 任务是否可停止：处于运行中的各类后台任务（或活动中的本地代理）。
 */
function canStopTask(item) {
  if (item.type === "local_agent" && isWaitingOnChildren(item.task)) return true;
  return (
    item.status === "running" &&
    (item.type === "local_bash" ||
      item.type === "local_agent" ||
      item.type === "in_process_teammate" ||
      item.type === "local_workflow" ||
      item.type === "monitor_mcp" ||
      item.type === "monitor_ws" ||
      item.type === "mcp_task" ||
      item.type === "dream" ||
      item.type === "auto_mode_scan" ||
      item.type === "local_memory_import" ||
      item.type === "post_turn_memory" ||
      item.type === "remote_agent" ||
      (codeModeAccepted() && isLocalScriptTaskState(item.type)))
  );
}
//@ chunk-czq1j3j2.js:784762-784776 layout
var MAIN = "main";
//@ chunk-czq1j3j2.js:784776-784843 layout
function viewingLabel(item) {
  return item.label === MAIN ? "Viewing main" : "Viewing leader";
}
//@ chunk-czq1j3j2.js:784843-785024 callgraph-fingerprint (2.1.88 match: Item, 0.252)
function Item(t0) {
  if (
    t0.type === "leader" ||
    t0.type === "self_managed_tasks" ||
    t0.type === "subagent_history" ||
    t0.type === "recorded_agent"
  )
    return collapseWhitespace(t0.label);
  return collapseWhitespace(BackgroundTask(t0.task)?.label ?? t0.label);
}
//@ chunk-czq1j3j2.js:785024-785133 layout
function isParkedCompletedAgent(status) {
  return (
    status.type === "local_agent" &&
    status.status === "completed" &&
    status.quietlyParked !== true &&
    !(isCoordinatorPanelActive() && isTerminalStatus(status))
  );
}
//@ chunk-czq1j3j2.js:785133-785191 layout (2.1.88 match: getSelectableBackgroundTasks, 0.787)
function getSelectableBackgroundTasks_2(item) {
  return item.type === "local_agent" && isParkedCompletedAgent(item.task);
}
//@ chunk-czq1j3j2.js:785191-786535 fingerprint (2.1.88 match: toListItem, 0.784)
function toListItem(task) {
  switch (task.type) {
    case "local_bash":
      return {
        id: task.id,
        type: "local_bash",
        label: task.kind === "monitor" ? task.description : task.command,
        status: task.status,
        task,
      };
    case "remote_agent":
      return {
        id: task.id,
        type: "remote_agent",
        label: task.title,
        status: task.status,
        task,
      };
    case "local_agent":
      return {
        id: task.id,
        type: "local_agent",
        label: task.description,
        status: task.status,
        task,
      };
    case "in_process_teammate":
      return {
        id: task.id,
        type: "in_process_teammate",
        label: `@${task.identity.agentName}`,
        status: task.status,
        task,
      };
    case "local_workflow":
      return {
        id: task.id,
        type: "local_workflow",
        label: task.summary ?? task.description,
        status: task.status,
        task,
      };
    case "monitor_mcp":
      return {
        id: task.id,
        type: "monitor_mcp",
        label: task.description,
        status: task.status,
        task,
      };
    case "monitor_ws":
      return {
        id: task.id,
        type: "monitor_ws",
        label: task.description,
        status: task.status,
        task,
      };
    case "mcp_task":
      return {
        id: task.id,
        type: "mcp_task",
        label: task.description,
        status: task.status,
        task,
      };
    case "dream":
      return {
        id: task.id,
        type: "dream",
        label: task.description,
        status: task.status,
        task,
      };
    case "auto_mode_scan":
      return {
        id: task.id,
        type: "auto_mode_scan",
        label: task.description,
        status: task.status,
        task,
      };
    case "local_memory_import":
      return {
        id: task.id,
        type: "local_memory_import",
        label: task.description,
        status: task.status,
        task,
      };
    case "post_turn_memory":
      return {
        id: task.id,
        type: "post_turn_memory",
        label: task.description,
        status: task.status,
        task,
      };
    default:
      return {
        id: task.id,
        type: task.type,
        label: task.description,
        status: task.status,
        task,
      };
  }
}
//@ chunk-czq1j3j2.js:786535-786559 affinity
function useBackgroundListV3Stub() {
  return false;
}
//@ chunk-czq1j3j2.js:786559-786586 affinity
function useBackgroundListStub() {
  return null;
}
export { BackgroundTasksDialog };
