/**
 * components/tasks/BackgroundTasksDialog.tsx
 *
 * 后台任务对话框（↓ 打开）：列出 bash、子代理、队友、工作流、远程会话、monitor，查看详情、停止（ctrl+x ctrl+k）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/BackgroundTasksDialog.tsx
 * pieces: chunk-18hwfzwa.js (72)
 * attribution: placement 20, sole-consumer 19, affinity 7, file-local 2, layout 20, fingerprint 3, callgraph-fingerprint 1
 */
import { RemoteAgentTask } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { mainAgentId } from "../../bootstrap/state.js";
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
  useContext,
  useEffectEvent,
} from "../../../vendor/react/cjs/react.production.js";
import { isSubagentHistoryEnabled } from "../messages/UserPromptMessage.js";
import { processBatched } from "../../services/mcp/client.js";
import { getSessionSubagentsDir } from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";
import { repeatString, collapseWhitespace } from "../../utils/stringUtils.js";
import { TREE_GLYPHS } from "../../../vendor/chart.js/dist/chart.js";
import { formatRelativeTimeAgo, truncateToWidth } from "../../utils/format.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { isAmbientTask, isPanelAgentTask, isCompletedBackgroundAgent } from "../../tasks/taskKinds.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { isCoordinatorPanelActive, subscribeCoordinatorPanel } from "../../utils/transcriptDiagnostics.js";
import { isBackgroundTask } from "../../tasks/types.js";
import {
  isObserverAgentTask,
  restoreAgentTaskFromTranscript,
  hasCompletedWithFindings,
  LocalAgentTask,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { FLAG_IDLE_WINDOW, isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import {
  TaskOutputResultDisplay,
  waitForTaskCompletion,
  isTaskRunningOrPending,
} from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../../state/AppState.js";
import { useSetVoiceState } from "../../context/voice.js";
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
import { stopAllTasks } from "./stopTask.js";
import {
  InProcessTeammateTask,
  isTaskRunning,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { DreamTask } from "../../tasks/DreamTask/DreamTask.js";
import { LocalMemoryImportTask } from "../../tasks/LocalMemoryImportTask/LocalMemoryImportTask.js";
import { AutoModeScanTask } from "../../tasks/AutoModeScanTask/AutoModeScanTask.js";
import { stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { PostTurnMemoryTask } from "../../tasks/PostTurnMemoryTask/PostTurnMemoryTask.js";
import { stopUltraplan } from "../../commands/ultraplan.js";
import { count, intersperse } from "../../utils/collections.js";
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

//@ chunk-18hwfzwa.js:686154-686687 placement
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
//@ chunk-18hwfzwa.js:686687-686691 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:686687", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:726327-726331 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:726327", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:726331-726341 sole-consumer
var MAX_TREE_DEPTH = 6;
//@ chunk-18hwfzwa.js:726341-726625 sole-consumer
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
//@ chunk-18hwfzwa.js:726625-726845 sole-consumer
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
//@ chunk-18hwfzwa.js:726845-727068 sole-consumer
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
//@ chunk-18hwfzwa.js:727068-727381 sole-consumer
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
//@ chunk-18hwfzwa.js:727381-727508 sole-consumer
function treePrefix({ depth, isLastSibling }) {
  if (depth === 0) return "";
  return (
    repeatString(`${TREE_GLYPHS.pipe} `, Math.min(depth, MAX_TREE_DEPTH) - 1) +
    `${isLastSibling ? TREE_GLYPHS.last : TREE_GLYPHS.branch} `
  );
}
//@ chunk-18hwfzwa.js:727508-727560 sole-consumer
function entryLabel(entry) {
  return sanitizeLabel(entry.description) || entry.agentId;
}
//@ chunk-18hwfzwa.js:727560-727627 sole-consumer
function entryMetaLabel(entry) {
  return sanitizeLabel(entry.name && `@${entry.name}`) || sanitizeLabel(entry.agentType);
}
//@ chunk-18hwfzwa.js:727627-727819 sole-consumer
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
//@ chunk-18hwfzwa.js:727819-727852 sole-consumer
function sanitizeLabel(entry) {
  return cleanTaskDescription(entry) ?? "";
}
//@ chunk-18hwfzwa.js:727852-727885 sole-consumer
function selectTasks_2(appState) {
  return appState.tasks;
}
//@ chunk-18hwfzwa.js:727885-727929 sole-consumer
function isListableTask(task) {
  return isTaskShownInDialog(task, false) && !isAmbientTask(task);
}
//@ chunk-18hwfzwa.js:727929-727959 sole-consumer
function emptyIdSet() {
  return new Set();
}
//@ chunk-18hwfzwa.js:727959-728006 sole-consumer
function taskKey(task) {
  return `${task.id},${task.status}`;
}
//@ chunk-18hwfzwa.js:728006-728036 sole-consumer
function taskId(task) {
  return task.id;
}
//@ chunk-18hwfzwa.js:728036-728260 affinity
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
//@ chunk-18hwfzwa.js:728260-728373 file-local
function taskIdAliases(i_0) {
  return i_0.type === "in_process_teammate"
    ? [i_0.id, i_0.task.identity.resumableAgentId ?? i_0.id]
    : [i_0.id];
}
//@ chunk-18hwfzwa.js:728373-728420 layout
function isLocalBashTask(task) {
  return task.type === "local_bash";
}
//@ chunk-18hwfzwa.js:728420-728469 layout
function isRemoteAgentTask(task) {
  return task.type === "remote_agent";
}
//@ chunk-18hwfzwa.js:728469-728517 fingerprint = getSelectableBackgroundTasks (1)
function getSelectableBackgroundTasks(i_0) {
  return i_0.type === "local_agent";
}
//@ chunk-18hwfzwa.js:728517-728548 affinity
function isNotSelectableTask(task) {
  return !getSelectableBackgroundTasks_2(task);
}
//@ chunk-18hwfzwa.js:728548-728599 affinity
function isLocalWorkflowTask(task) {
  return task.type === "local_workflow";
}
//@ chunk-18hwfzwa.js:728599-728671 affinity
function isMonitorTask(task) {
  return task.type === "monitor_mcp" || task.type === "monitor_ws";
}
//@ chunk-18hwfzwa.js:728671-728716 affinity
function isMcpTask(task) {
  return task.type === "mcp_task";
}
//@ chunk-18hwfzwa.js:728758-728809 placement
function isAutoModeScanTask(task) {
  return task.type === "auto_mode_scan";
}
//@ chunk-18hwfzwa.js:728809-728865 placement
function isLocalMemoryImportTask(task) {
  return task.type === "local_memory_import";
}
//@ chunk-18hwfzwa.js:728865-728918 placement
function isPostTurnMemoryTask(task) {
  return task.type === "post_turn_memory";
}
//@ chunk-18hwfzwa.js:728918-728952 placement
function toIdPair(task) {
  return [task.id, task];
}
//@ chunk-18hwfzwa.js:728952-729052 placement
/**
 * 子代理历史无法读取时记调试日志（文件不可访问）或记错误，返回 false。
 */
function logSubagentHistoryLaunchError(error) {
  if (isFsInaccessible(error)) logForDebugging(`subagent history: launch unreadable: ${error.code}`);
  else logError(error);
  return false;
}
//@ chunk-18hwfzwa.js:729052-729082 placement
function logErrorAndReturn(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729082-729112 placement
function logErrorAndReturn_2(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729112-729142 placement
function logErrorAndReturn_3(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729142-729158 placement
function noopLaunch() {}
//@ chunk-18hwfzwa.js:729158-729174 placement
function noopLaunchError() {}
//@ chunk-18hwfzwa.js:729220-729250 placement
function logErrorWrapper(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729250-729280 placement
function logErrorWrapper2(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729280-729310 placement
function logErrorWrapper3(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729310-729340 placement
function logErrorWrapper4(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729340-729370 placement
function logErrorWrapper5(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729370-729400 placement
function logErrorWrapper6(error) {
  return logError(error);
}
//@ chunk-18hwfzwa.js:729400-729446 placement = requestTeammateShutdown (1)
function isTaskRunning_2(task) {
  return task.status === "running";
}
//@ chunk-18hwfzwa.js:729515-729561 sole-consumer = requestTeammateShutdown (1)
function isTaskRunning_3(task) {
  return task.status === "running";
}
//@ chunk-18hwfzwa.js:729561-729645 sole-consumer = getDisplayName (0.757)
function getDisplayName_2(teammateId) {
  return teammateId.status === "running" && !(teammateId.type === "leader" && teammateId.label === MAIN);
}
//@ chunk-18hwfzwa.js:729645-729712 sole-consumer
function renderSeparator(separatorIndex) {
  return jsxProd_default(
    Text,
    {
      children: " \xB7 ",
    },
    `separator-${separatorIndex}`,
  );
}
//@ chunk-18hwfzwa.js:729712-729755 placement = getDisplayName (1)
function getDisplayName(teammateId) {
  return teammateId.type !== "leader";
}
//@ chunk-18hwfzwa.js:729755-729798 layout = getDisplayName (1)
function getDisplayName_3(teammateId) {
  return teammateId.type === "leader";
}
//@ chunk-18hwfzwa.js:729798-729852 file-local
function TeammateTaskGroups(t0) {
  return {
    kind: "row",
    item: t0,
    key: t0.id,
  };
}
//@ chunk-18hwfzwa.js:729852-729906 layout
function toListRow(task) {
  return {
    kind: "row",
    item: task,
    key: task.id,
  };
}
//@ chunk-18hwfzwa.js:729906-729948 layout
function hasRows(section) {
  return section.items.length > 0;
}
//@ chunk-18hwfzwa.js:729948-729996 layout
function toActionOption(action) {
  return {
    label: ACTION_LABELS[action],
    value: action,
  };
}
//@ chunk-18hwfzwa.js:729996-730171 layout
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
//@ chunk-18hwfzwa.js:730171-730387 layout
function hasDetailDialog(type) {
  if (type === "mcp_task") return McpTaskDetailDialog !== null;
  if (type === "local_memory_import") return localMemoryImportDetailGates !== null;
  return (
    type !== "monitor_ws" &&
    type !== "post_turn_memory" &&
    type !== "self_managed_tasks" &&
    type !== "subagent_history" &&
    type !== "recorded_agent"
  );
}
//@ chunk-18hwfzwa.js:730387-730883 layout
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
deferInit("chunk-18hwfzwa.js:730387", () => {
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
//@ chunk-18hwfzwa.js:730883-731180 layout
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
//@ chunk-18hwfzwa.js:731180-731600 layout
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
//@ chunk-18hwfzwa.js:731600-762915 fingerprint = BackgroundTasksDialog (0.512)
/**
 * 后台任务对话框：把各类任务（local_bash、local_agent、in_process_teammate、local_workflow、remote_agent、monitor_mcp、dream）转成列表项，list/detail 两级视图，支持停止所有 agent（chat:killAgents）、进入队友视图、查看输出。
 */
function BackgroundTasksDialog(props) {
  let $ = useMemoCache(458);
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
  let setAppState_2 = useSetVoiceState();
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
    let filtered_7 = filtered.filter(isLocalWorkflowTask);
    let filtered_8 = filtered.filter(isMonitorTask);
    let filtered_9 = filtered.filter(isMcpTask);
    let filtered_10 = filtered.filter(isDreamTask);
    let remote = filtered.filter(isAutoModeScanTask);
    let agent = filtered.filter(isLocalMemoryImportTask);
    let workflows = filtered.filter(isPostTurnMemoryTask);
    let extraRows = [];
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
  Vl: {
    if (!backgroundListFallback) {
      rowsToRender = listRows;
      break Vl;
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
    $[88] !== setAppState ||
    $[89] !== killAgentTask ||
    $[90] !== storageV5 ||
    $[91] !== setAppState_2
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
    $[88] = setAppState;
    $[89] = killAgentTask;
    $[90] = storageV5;
    $[91] = setAppState_2;
    $[92] = stopTask;
  } else stopTask = $[92];
  let stopItem = stopTask;
  let handleForeground;
  if ($[93] !== onDone || $[94] !== setAppState) {
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
    $[93] = onDone;
    $[94] = setAppState;
    $[95] = handleForeground;
  } else handleForeground = $[95];
  let foregroundItem = handleForeground;
  let handleRowKeyDown;
  if ($[96] !== foregroundItem || $[97] !== rows_2 || $[98] !== stopItem) {
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
    $[96] = foregroundItem;
    $[97] = rows_2;
    $[98] = stopItem;
    $[99] = handleRowKeyDown;
  } else handleRowKeyDown = $[99];
  let onRowKeyDown = handleRowKeyDown;
  let activateRow;
  if ($[100] !== isScreenReaderEnabled || $[101] !== rows_2 || $[102] !== handleSelect) {
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
    $[100] = isScreenReaderEnabled;
    $[101] = rows_2;
    $[102] = handleSelect;
    $[103] = activateRow;
  } else activateRow = $[103];
  let onSelect = activateRow;
  let handleAction;
  if ($[104] !== foregroundItem || $[105] !== handleSelect || $[106] !== stopItem) {
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
    $[104] = foregroundItem;
    $[105] = handleSelect;
    $[106] = stopItem;
    $[107] = handleAction;
  } else handleAction = $[107];
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
    $[108] !== allSelectableItems ||
    $[109] !== snapshotTask ||
    $[110] !== backgroundListV3Fallback ||
    $[111] !== dismissForSkip ||
    $[112] !== tasks_2 ||
    $[113] !== viewState.itemId ||
    $[114] !== viewState.mode
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
    $[108] = allSelectableItems;
    $[109] = snapshotTask;
    $[110] = backgroundListV3Fallback;
    $[111] = dismissForSkip;
    $[112] = tasks_2;
    $[113] = viewState.itemId;
    $[114] = viewState.mode;
    $[115] = closeIfGone;
  } else closeIfGone = $[115];
  let closeIfGoneDeps;
  if (
    $[116] !== allSelectableItems ||
    $[117] !== snapshotTask ||
    $[118] !== backgroundListV3Fallback ||
    $[119] !== tasks_2 ||
    $[120] !== viewState
  ) {
    closeIfGoneDeps = [viewState, tasks_2, allSelectableItems, snapshotTask, backgroundListV3Fallback];
    $[116] = allSelectableItems;
    $[117] = snapshotTask;
    $[118] = backgroundListV3Fallback;
    $[119] = tasks_2;
    $[120] = viewState;
    $[121] = closeIfGoneDeps;
  } else closeIfGoneDeps = $[121];
  useEffect(closeIfGone, closeIfGoneDeps);
  let handleBack;
  if ($[122] !== allSelectableItems.length || $[123] !== onBack || $[124] !== onDone) {
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
    $[122] = allSelectableItems.length;
    $[123] = onBack;
    $[124] = onDone;
    $[125] = handleBack;
  } else handleBack = $[125];
  let onBack_2 = handleBack;
  let hasMultipleRunningAgents = count(agentTasks, isTaskRunning) > 1;
  if (viewState.mode !== "list" && viewState.mode !== "actions" && tasks_2) {
    let detailItem = tasks_2[viewState.itemId] ?? snapshotTask;
    if (!detailItem) {
      return null;
    }
    if (viewState.mode === "confirmStopReview") {
      let onStop;
      if (
        $[126] !== pendingNotifications ||
        $[127] !== setAppState ||
        $[128] !== storageV5 ||
        $[129] !== setAppState_2 ||
        $[130] !== viewState.itemId
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
        $[126] = pendingNotifications;
        $[127] = setAppState;
        $[128] = storageV5;
        $[129] = setAppState_2;
        $[130] = viewState.itemId;
        $[131] = onStop;
      } else onStop = $[131];
      let onBack;
      if ($[132] === MEMO_CACHE_SENTINEL) {
        onBack = () =>
          setViewState({
            mode: "list",
          });
        $[132] = onBack;
      } else onBack = $[132];
      let confirmElement;
      if ($[133] !== onStop) {
        confirmElement = jsxProd_default(StopUltrareviewConfirm, {
          onStop,
          onBack,
        });
        $[133] = onStop;
        $[134] = confirmElement;
      } else confirmElement = $[134];
      return confirmElement;
    }
    switch (detailItem.type) {
      case "local_bash": {
        if (autoModeScanDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `shell-${detailItem.id}`;
          let onClose;
          if ($[135] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[135] = onDone;
            $[136] = onClose;
          } else onClose = $[136];
          let onStop;
          if ($[137] !== killShellTask_ || $[138] !== detailItem.id) {
            onStop = () => void killShellTask_(detailItem.id).catch(logErrorWrapper);
            $[137] = killShellTask_;
            $[138] = detailItem.id;
            $[139] = onStop;
          } else onStop = $[139];
          let detailElement;
          if (
            $[140] !== onBack_2 ||
            $[141] !== elementKey ||
            $[142] !== onClose ||
            $[143] !== onStop ||
            $[144] !== detailItem
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
            $[140] = onBack_2;
            $[141] = elementKey;
            $[142] = onClose;
            $[143] = onStop;
            $[144] = detailItem;
            $[145] = detailElement;
          } else detailElement = $[145];
          return detailElement;
        }
        const elementKey = `shell-${detailItem.id}`;
        let onKillShell;
        if ($[146] !== killShellTask_ || $[147] !== detailItem.id) {
          onKillShell = () => void killShellTask_(detailItem.id);
          $[146] = killShellTask_;
          $[147] = detailItem.id;
          $[148] = onKillShell;
        } else onKillShell = $[148];
        let element;
        if (
          $[149] !== onBack_2 ||
          $[150] !== onDone ||
          $[151] !== elementKey ||
          $[152] !== onKillShell ||
          $[153] !== detailItem
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
          $[149] = onBack_2;
          $[150] = onDone;
          $[151] = elementKey;
          $[152] = onKillShell;
          $[153] = detailItem;
          $[154] = element;
        } else element = $[154];
        return element;
      }
      case "local_agent": {
        let onOpenTranscript;
        if ($[155] !== onDone || $[156] !== setAppState || $[157] !== detailItem) {
          onOpenTranscript = isPanelAgentTask(detailItem)
            ? () => {
                enterTeammateView(detailItem.id, setAppState);
                onDone("Viewing agent", {
                  display: "system",
                });
              }
            : undefined;
          $[155] = onDone;
          $[156] = setAppState;
          $[157] = detailItem;
          $[158] = onOpenTranscript;
        } else onOpenTranscript = $[158];
        let onOpenTranscript_ = onOpenTranscript;
        if (memoryImportDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `agent-${detailItem.id}`;
          let onClose;
          if ($[159] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[159] = onDone;
            $[160] = onClose;
          } else onClose = $[160];
          let onStop;
          if ($[161] !== killTeammateTask || $[162] !== detailItem.id) {
            onStop = () => void killTeammateTask(detailItem.id).catch(logErrorWrapper2);
            $[161] = killTeammateTask;
            $[162] = detailItem.id;
            $[163] = onStop;
          } else onStop = $[163];
          let detailElement;
          if (
            $[164] !== onBack_2 ||
            $[165] !== elementKey ||
            $[166] !== onClose ||
            $[167] !== onStop ||
            $[168] !== detailItem ||
            $[169] !== onOpenTranscript_
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
            $[164] = onBack_2;
            $[165] = elementKey;
            $[166] = onClose;
            $[167] = onStop;
            $[168] = detailItem;
            $[169] = onOpenTranscript_;
            $[170] = detailElement;
          } else detailElement = $[170];
          return detailElement;
        }
        const elementKey = `agent-${detailItem.id}`;
        let onKillAgent;
        if ($[171] !== killTeammateTask || $[172] !== detailItem.id) {
          onKillAgent = () => void killTeammateTask(detailItem.id);
          $[171] = killTeammateTask;
          $[172] = detailItem.id;
          $[173] = onKillAgent;
        } else onKillAgent = $[173];
        const killAllAgentsShortcut = hasMultipleRunningAgents ? killAgentsShortcut : undefined;
        let element;
        if (
          $[174] !== onBack_2 ||
          $[175] !== onDone ||
          $[176] !== elementKey ||
          $[177] !== onKillAgent ||
          $[178] !== killAllAgentsShortcut ||
          $[179] !== detailItem ||
          $[180] !== onOpenTranscript_
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
          $[174] = onBack_2;
          $[175] = onDone;
          $[176] = elementKey;
          $[177] = onKillAgent;
          $[178] = killAllAgentsShortcut;
          $[179] = detailItem;
          $[180] = onOpenTranscript_;
          $[181] = element;
        } else element = $[181];
        return element;
      }
      case "remote_agent": {
        let onStop;
        if (
          $[182] !== killRemoteAgentById ||
          $[183] !== pendingNotifications ||
          $[184] !== setAppState ||
          $[185] !== storageV5 ||
          $[186] !== setAppState_2 ||
          $[187] !== detailItem.id ||
          $[188] !== detailItem.isRemoteReview ||
          $[189] !== detailItem.isUltraplan ||
          $[190] !== detailItem.sessionId ||
          $[191] !== detailItem.status
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
          $[182] = killRemoteAgentById;
          $[183] = pendingNotifications;
          $[184] = setAppState;
          $[185] = storageV5;
          $[186] = setAppState_2;
          $[187] = detailItem.id;
          $[188] = detailItem.isRemoteReview;
          $[189] = detailItem.isUltraplan;
          $[190] = detailItem.sessionId;
          $[191] = detailItem.status;
          $[192] = onStop;
        } else onStop = $[192];
        let onStop_ = onStop;
        if (shellDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `session-${detailItem.id}`;
          let onClose;
          if ($[193] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[193] = onDone;
            $[194] = onClose;
          } else onClose = $[194];
          let detailElement;
          if (
            $[195] !== onBack_2 ||
            $[196] !== onStop_ ||
            $[197] !== elementKey ||
            $[198] !== onClose ||
            $[199] !== detailItem
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
            $[195] = onBack_2;
            $[196] = onStop_;
            $[197] = elementKey;
            $[198] = onClose;
            $[199] = detailItem;
            $[200] = detailElement;
          } else detailElement = $[200];
          return detailElement;
        }
        const elementKey = `session-${detailItem.id}`;
        let element;
        if (
          $[201] !== commands ||
          $[202] !== onBack_2 ||
          $[203] !== onDone ||
          $[204] !== onStop_ ||
          $[205] !== elementKey ||
          $[206] !== detailItem ||
          $[207] !== tools ||
          $[208] !== verbose
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
          $[201] = commands;
          $[202] = onBack_2;
          $[203] = onDone;
          $[204] = onStop_;
          $[205] = elementKey;
          $[206] = detailItem;
          $[207] = tools;
          $[208] = verbose;
          $[209] = element;
        } else element = $[209];
        return element;
      }
      case "in_process_teammate": {
        let onOpenTranscript;
        if (
          $[210] !== onDone ||
          $[211] !== setAppState ||
          $[212] !== detailItem.id ||
          $[213] !== detailItem.status
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
          $[210] = onDone;
          $[211] = setAppState;
          $[212] = detailItem.id;
          $[213] = detailItem.status;
          $[214] = onOpenTranscript;
        } else onOpenTranscript = $[214];
        let onOpenTranscript_ = onOpenTranscript;
        if (subagentHistoryDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `teammate-${detailItem.id}`;
          let onClose;
          if ($[215] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[215] = onDone;
            $[216] = onClose;
          } else onClose = $[216];
          let onStop;
          if ($[217] !== killDreamTask || $[218] !== detailItem.id) {
            onStop = () => void killDreamTask(detailItem.id).catch(logErrorWrapper3);
            $[217] = killDreamTask;
            $[218] = detailItem.id;
            $[219] = onStop;
          } else onStop = $[219];
          let detailElement;
          if (
            $[220] !== onBack_2 ||
            $[221] !== elementKey ||
            $[222] !== onClose ||
            $[223] !== onStop ||
            $[224] !== detailItem ||
            $[225] !== onOpenTranscript_
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
            $[220] = onBack_2;
            $[221] = elementKey;
            $[222] = onClose;
            $[223] = onStop;
            $[224] = detailItem;
            $[225] = onOpenTranscript_;
            $[226] = detailElement;
          } else detailElement = $[226];
          return detailElement;
        }
        const elementKey = `teammate-${detailItem.id}`;
        let onKill;
        if ($[227] !== killDreamTask || $[228] !== detailItem.id || $[229] !== detailItem.status) {
          onKill = detailItem.status === "running" ? () => void killDreamTask(detailItem.id) : undefined;
          $[227] = killDreamTask;
          $[228] = detailItem.id;
          $[229] = detailItem.status;
          $[230] = onKill;
        } else onKill = $[230];
        let element;
        if (
          $[231] !== onBack_2 ||
          $[232] !== onDone ||
          $[233] !== elementKey ||
          $[234] !== onKill ||
          $[235] !== detailItem ||
          $[236] !== onOpenTranscript_
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
          $[231] = onBack_2;
          $[232] = onDone;
          $[233] = elementKey;
          $[234] = onKill;
          $[235] = detailItem;
          $[236] = onOpenTranscript_;
          $[237] = element;
        } else element = $[237];
        return element;
      }
      case "local_workflow": {
        let workflowActions;
        if ($[238] !== setAppState_2 || $[239] !== detailItem.id || $[240] !== detailItem.status) {
          workflowActions =
            detailItem.status === "running"
              ? {
                  onKill: () => killWorkflowTask(detailItem.id, setAppState_2, "user"),
                  onPause: () => pauseWorkflowTask(detailItem.id, setAppState_2),
                  onSkipAgent: (agentId) => skipWorkflowAgent(detailItem.id, agentId, setAppState_2),
                  onRetryAgent: (exitState) => retryWorkflowAgent(detailItem.id, exitState, setAppState_2),
                }
              : undefined;
          $[238] = setAppState_2;
          $[239] = detailItem.id;
          $[240] = detailItem.status;
          $[241] = workflowActions;
        } else workflowActions = $[241];
        let workflowActions_ = workflowActions;
        if (dreamDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `workflow-${detailItem.id}`;
          let onClose;
          if ($[242] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[242] = onDone;
            $[243] = onClose;
          } else onClose = $[243];
          const onStop = workflowActions_?.onKill;
          const onPause = workflowActions_?.onPause;
          const onSkipAgent = workflowActions_?.onSkipAgent;
          const onRetryAgent = workflowActions_?.onRetryAgent;
          let detailElement;
          if (
            $[244] !== onBack_2 ||
            $[245] !== onDone ||
            $[246] !== promptVisibleBelow_2 ||
            $[247] !== elementKey ||
            $[248] !== onClose ||
            $[249] !== onStop ||
            $[250] !== onPause ||
            $[251] !== onSkipAgent ||
            $[252] !== onRetryAgent ||
            $[253] !== detailItem
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
            $[244] = onBack_2;
            $[245] = onDone;
            $[246] = promptVisibleBelow_2;
            $[247] = elementKey;
            $[248] = onClose;
            $[249] = onStop;
            $[250] = onPause;
            $[251] = onSkipAgent;
            $[252] = onRetryAgent;
            $[253] = detailItem;
            $[254] = detailElement;
          } else detailElement = $[254];
          return detailElement;
        }
        const elementKey = `workflow-${detailItem.id}`;
        const onKill = workflowActions_?.onKill;
        const onPause = workflowActions_?.onPause;
        const onSkipAgent = workflowActions_?.onSkipAgent;
        const onRetryAgent = workflowActions_?.onRetryAgent;
        let element;
        if (
          $[255] !== onBack_2 ||
          $[256] !== onDone ||
          $[257] !== promptVisibleBelow_2 ||
          $[258] !== elementKey ||
          $[259] !== onKill ||
          $[260] !== onPause ||
          $[261] !== onSkipAgent ||
          $[262] !== onRetryAgent ||
          $[263] !== detailItem
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
          $[255] = onBack_2;
          $[256] = onDone;
          $[257] = promptVisibleBelow_2;
          $[258] = elementKey;
          $[259] = onKill;
          $[260] = onPause;
          $[261] = onSkipAgent;
          $[262] = onRetryAgent;
          $[263] = detailItem;
          $[264] = element;
        } else element = $[264];
        return element;
      }
      case "mcp_task": {
        if (!McpTaskDetailDialog) {
          return null;
        }
        if (mcpTaskDetailFeatureGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `mcp-task-${detailItem.id}`;
          let onClose;
          if ($[265] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[265] = onDone;
            $[266] = onClose;
          } else onClose = $[266];
          let onStop;
          if ($[267] !== killAgentTask || $[268] !== detailItem.id) {
            onStop = () => {
              if (kill) killAgentTask(detailItem.id, kill);
            };
            $[267] = killAgentTask;
            $[268] = detailItem.id;
            $[269] = onStop;
          } else onStop = $[269];
          let detailElement;
          if (
            $[270] !== onBack_2 ||
            $[271] !== elementKey ||
            $[272] !== onClose ||
            $[273] !== onStop ||
            $[274] !== detailItem
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
            $[270] = onBack_2;
            $[271] = elementKey;
            $[272] = onClose;
            $[273] = onStop;
            $[274] = detailItem;
            $[275] = detailElement;
          } else detailElement = $[275];
          return detailElement;
        }
        const elementKey = `mcp-task-${detailItem.id}`;
        let onDone_2;
        if ($[276] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[276] = onDone;
          $[277] = onDone_2;
        } else onDone_2 = $[277];
        let onKill;
        if ($[278] !== killAgentTask || $[279] !== detailItem.id || $[280] !== detailItem.status) {
          onKill =
            detailItem.status === "running" && kill
              ? () => void killAgentTask(detailItem.id, kill)
              : undefined;
          $[278] = killAgentTask;
          $[279] = detailItem.id;
          $[280] = detailItem.status;
          $[281] = onKill;
        } else onKill = $[281];
        let element;
        if (
          $[282] !== onBack_2 ||
          $[283] !== elementKey ||
          $[284] !== onDone_2 ||
          $[285] !== onKill ||
          $[286] !== detailItem
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
          $[282] = onBack_2;
          $[283] = elementKey;
          $[284] = onDone_2;
          $[285] = onKill;
          $[286] = detailItem;
          $[287] = element;
        } else element = $[287];
        return element;
      }
      case "monitor_mcp": {
        if (!mcpTaskDetailDialogModule) {
          return null;
        }
        if (monitorMcpDetailFeatureGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `monitor-mcp-${detailItem.id}`;
          let onClose;
          if ($[288] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[288] = onDone;
            $[289] = onClose;
          } else onClose = $[289];
          let onStop;
          if ($[290] !== setAppState_2 || $[291] !== detailItem.id) {
            onStop = () => killMonitorMcp?.(detailItem.id, setAppState_2);
            $[290] = setAppState_2;
            $[291] = detailItem.id;
            $[292] = onStop;
          } else onStop = $[292];
          let detailElement;
          if (
            $[293] !== onBack_2 ||
            $[294] !== elementKey ||
            $[295] !== onClose ||
            $[296] !== onStop ||
            $[297] !== detailItem
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
            $[293] = onBack_2;
            $[294] = elementKey;
            $[295] = onClose;
            $[296] = onStop;
            $[297] = detailItem;
            $[298] = detailElement;
          } else detailElement = $[298];
          return detailElement;
        }
        const elementKey = `monitor-mcp-${detailItem.id}`;
        let onKill;
        if ($[299] !== setAppState_2 || $[300] !== detailItem.id || $[301] !== detailItem.status) {
          onKill =
            detailItem.status === "running" && killMonitorMcp
              ? () => killMonitorMcp(detailItem.id, setAppState_2)
              : undefined;
          $[299] = setAppState_2;
          $[300] = detailItem.id;
          $[301] = detailItem.status;
          $[302] = onKill;
        } else onKill = $[302];
        let element;
        if ($[303] !== onBack_2 || $[304] !== elementKey || $[305] !== onKill || $[306] !== detailItem) {
          element = jsxProd_default(
            mcpTaskDetailDialogModule,
            {
              task: detailItem,
              onKill,
              onBack: onBack_2,
            },
            elementKey,
          );
          $[303] = onBack_2;
          $[304] = elementKey;
          $[305] = onKill;
          $[306] = detailItem;
          $[307] = element;
        } else element = $[307];
        return element;
      }
      case "dream": {
        if (workflowDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `dream-${detailItem.id}`;
          let onClose;
          if ($[308] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[308] = onDone;
            $[309] = onClose;
          } else onClose = $[309];
          let onStop;
          if ($[310] !== killMemoryImportTask || $[311] !== detailItem.id) {
            onStop = () => void killMemoryImportTask(detailItem.id).catch(logErrorWrapper4);
            $[310] = killMemoryImportTask;
            $[311] = detailItem.id;
            $[312] = onStop;
          } else onStop = $[312];
          let detailElement;
          if (
            $[313] !== onBack_2 ||
            $[314] !== elementKey ||
            $[315] !== onClose ||
            $[316] !== onStop ||
            $[317] !== detailItem
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
            $[313] = onBack_2;
            $[314] = elementKey;
            $[315] = onClose;
            $[316] = onStop;
            $[317] = detailItem;
            $[318] = detailElement;
          } else detailElement = $[318];
          return detailElement;
        }
        const elementKey = `dream-${detailItem.id}`;
        let onDone_2;
        if ($[319] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[319] = onDone;
          $[320] = onDone_2;
        } else onDone_2 = $[320];
        let onKill;
        if ($[321] !== killMemoryImportTask || $[322] !== detailItem.id || $[323] !== detailItem.status) {
          onKill =
            detailItem.status === "running" ? () => void killMemoryImportTask(detailItem.id) : undefined;
          $[321] = killMemoryImportTask;
          $[322] = detailItem.id;
          $[323] = detailItem.status;
          $[324] = onKill;
        } else onKill = $[324];
        let element;
        if (
          $[325] !== onBack_2 ||
          $[326] !== elementKey ||
          $[327] !== onDone_2 ||
          $[328] !== onKill ||
          $[329] !== detailItem
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
          $[325] = onBack_2;
          $[326] = elementKey;
          $[327] = onDone_2;
          $[328] = onKill;
          $[329] = detailItem;
          $[330] = element;
        } else element = $[330];
        return element;
      }
      case "auto_mode_scan": {
        if (remoteAgentDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `auto-mode-scan-${detailItem.id}`;
          let onClose;
          if ($[331] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[331] = onDone;
            $[332] = onClose;
          } else onClose = $[332];
          let onStop;
          if ($[333] !== killRemoteAgentTask || $[334] !== detailItem.id) {
            onStop = () => void killRemoteAgentTask(detailItem.id).catch(logErrorWrapper5);
            $[333] = killRemoteAgentTask;
            $[334] = detailItem.id;
            $[335] = onStop;
          } else onStop = $[335];
          let detailElement;
          if (
            $[336] !== onBack_2 ||
            $[337] !== elementKey ||
            $[338] !== onClose ||
            $[339] !== onStop ||
            $[340] !== detailItem
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
            $[336] = onBack_2;
            $[337] = elementKey;
            $[338] = onClose;
            $[339] = onStop;
            $[340] = detailItem;
            $[341] = detailElement;
          } else detailElement = $[341];
          return detailElement;
        }
        const elementKey = `auto-mode-scan-${detailItem.id}`;
        let onDone_2;
        if ($[342] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[342] = onDone;
          $[343] = onDone_2;
        } else onDone_2 = $[343];
        let onKill;
        if ($[344] !== killRemoteAgentTask || $[345] !== detailItem.id || $[346] !== detailItem.status) {
          onKill =
            detailItem.status === "running" ? () => void killRemoteAgentTask(detailItem.id) : undefined;
          $[344] = killRemoteAgentTask;
          $[345] = detailItem.id;
          $[346] = detailItem.status;
          $[347] = onKill;
        } else onKill = $[347];
        let element;
        if (
          $[348] !== onBack_2 ||
          $[349] !== elementKey ||
          $[350] !== onDone_2 ||
          $[351] !== onKill ||
          $[352] !== detailItem
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
          $[348] = onBack_2;
          $[349] = elementKey;
          $[350] = onDone_2;
          $[351] = onKill;
          $[352] = detailItem;
          $[353] = element;
        } else element = $[353];
        return element;
      }
      case "local_memory_import": {
        if (localMemoryDetailModule !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const elementKey = `local-memory-import-${detailItem.id}`;
          let onClose;
          if ($[354] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[354] = onDone;
            $[355] = onClose;
          } else onClose = $[355];
          let onStop;
          if ($[356] !== killAutoModeScanTask || $[357] !== detailItem.id) {
            onStop = () => void killAutoModeScanTask(detailItem.id).catch(logErrorWrapper6);
            $[356] = killAutoModeScanTask;
            $[357] = detailItem.id;
            $[358] = onStop;
          } else onStop = $[358];
          let detailElement;
          if (
            $[359] !== onBack_2 ||
            $[360] !== elementKey ||
            $[361] !== onClose ||
            $[362] !== onStop ||
            $[363] !== detailItem
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
            $[359] = onBack_2;
            $[360] = elementKey;
            $[361] = onClose;
            $[362] = onStop;
            $[363] = detailItem;
            $[364] = detailElement;
          } else detailElement = $[364];
          return detailElement;
        }
        if (!localMemoryImportDetailGates) {
          return null;
        }
        const elementKey = `local-memory-import-${detailItem.id}`;
        let onDone_2;
        if ($[365] !== onDone) {
          onDone_2 = () =>
            onDone("Background dialog dismissed", {
              display: "skip",
            });
          $[365] = onDone;
          $[366] = onDone_2;
        } else onDone_2 = $[366];
        let onKill;
        if ($[367] !== killAutoModeScanTask || $[368] !== detailItem.id || $[369] !== detailItem.status) {
          onKill =
            detailItem.status === "running" ? () => void killAutoModeScanTask(detailItem.id) : undefined;
          $[367] = killAutoModeScanTask;
          $[368] = detailItem.id;
          $[369] = detailItem.status;
          $[370] = onKill;
        } else onKill = $[370];
        let element;
        if (
          $[371] !== onBack_2 ||
          $[372] !== elementKey ||
          $[373] !== onDone_2 ||
          $[374] !== onKill ||
          $[375] !== detailItem
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
          $[371] = onBack_2;
          $[372] = elementKey;
          $[373] = onDone_2;
          $[374] = onKill;
          $[375] = detailItem;
          $[376] = element;
        } else element = $[376];
        return element;
      }
    }
  }
  let runningShellCount = count(bashTasks, isTaskRunning_2);
  let runningAgentCount = count(remoteSessions, isTaskRunningOrPending) + count(agentTasks, isTaskRunning_3);
  let teammateCount = count(teammateTasks, getDisplayName_2);
  let summaryChildren;
  if ($[377] !== runningAgentCount || $[378] !== runningShellCount || $[379] !== teammateCount) {
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
    $[377] = runningAgentCount;
    $[378] = runningShellCount;
    $[379] = teammateCount;
    $[380] = summaryChildren;
  } else summaryChildren = $[380];
  let children = summaryChildren;
  let hintFormat = backgroundListV3Fallback ? TERSE_SHORTCUT_FORMAT : EMPTY_SHORTCUT_FORMAT;
  let navigationHints;
  if ($[381] !== selectedItem || $[382] !== hintFormat || $[383] !== isScreenReaderEnabled) {
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
    $[381] = selectedItem;
    $[382] = hintFormat;
    $[383] = isScreenReaderEnabled;
    $[384] = navigationHints;
  } else navigationHints = $[384];
  let killAllHints;
  if (
    $[385] !== selectedItem ||
    $[386] !== hasMultipleRunningAgents ||
    $[387] !== backgroundListV3Fallback ||
    $[388] !== killAgentsShortcut
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
    $[385] = selectedItem;
    $[386] = hasMultipleRunningAgents;
    $[387] = backgroundListV3Fallback;
    $[388] = killAgentsShortcut;
    $[389] = killAllHints;
  } else killAllHints = $[389];
  const action = viewState.mode === "actions" ? "go back" : "close";
  let escapeHint;
  if ($[390] !== hintFormat || $[391] !== action) {
    escapeHint = jsxProd_default(
      KeyboardShortcutHint,
      {
        chord: "escape",
        action,
        ...hintFormat,
      },
      "esc",
    );
    $[390] = hintFormat;
    $[391] = action;
    $[392] = escapeHint;
  } else escapeHint = $[392];
  let inputGuideChildren;
  if ($[393] !== navigationHints || $[394] !== killAllHints || $[395] !== escapeHint) {
    inputGuideChildren = [...navigationHints, ...killAllHints, escapeHint];
    $[393] = navigationHints;
    $[394] = killAllHints;
    $[395] = escapeHint;
    $[396] = inputGuideChildren;
  } else inputGuideChildren = $[396];
  let children_2 = inputGuideChildren;
  let heading;
  if (
    $[397] !== agentTasks.length ||
    $[398] !== bashTasks ||
    $[399] !== completedAgentTasks.length ||
    $[400] !== remoteSessions.length ||
    $[401] !== teammateTasks ||
    $[402] !== teams.length
  ) {
    heading =
      teams.length > 0 &&
      (bashTasks.length > 0 ||
        remoteSessions.length > 0 ||
        agentTasks.length > 0 ||
        completedAgentTasks.length > 0) &&
      jsxProd_default(SectionHeading, {
        label: "Agents",
        size: count(teammateTasks, getDisplayName),
      });
    $[397] = agentTasks.length;
    $[398] = bashTasks;
    $[399] = completedAgentTasks.length;
    $[400] = remoteSessions.length;
    $[401] = teammateTasks;
    $[402] = teams.length;
    $[403] = heading;
  } else heading = $[403];
  let listRows_2;
  if (
    $[404] !== agentTasks ||
    $[405] !== autoModeScanTasks ||
    $[406] !== bashTasks ||
    $[407] !== completedAgentTasks ||
    $[408] !== dreamTasks ||
    $[409] !== historyRow ||
    $[410] !== isScreenReaderEnabled ||
    $[411] !== mcpMonitors ||
    $[412] !== mcpTasks ||
    $[413] !== memoryImportTasks ||
    $[414] !== memorySaveTasks ||
    $[415] !== remoteSessions ||
    $[416] !== selfManaged ||
    $[417] !== showSelfManaged ||
    $[418] !== heading ||
    $[419] !== teammateTasks ||
    $[420] !== teams ||
    $[421] !== workflowTasks
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
      ...[],
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
    $[404] = agentTasks;
    $[405] = autoModeScanTasks;
    $[406] = bashTasks;
    $[407] = completedAgentTasks;
    $[408] = dreamTasks;
    $[409] = historyRow;
    $[410] = isScreenReaderEnabled;
    $[411] = mcpMonitors;
    $[412] = mcpTasks;
    $[413] = memoryImportTasks;
    $[414] = memorySaveTasks;
    $[415] = remoteSessions;
    $[416] = selfManaged;
    $[417] = showSelfManaged;
    $[418] = heading;
    $[419] = teammateTasks;
    $[420] = teams;
    $[421] = workflowTasks;
    $[422] = listRows_2;
  } else listRows_2 = $[422];
  let renderedRows = listRows_2;
  let listChildren;
  if ($[423] !== backgroundListFallback || $[424] !== renderedRows) {
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
    $[423] = backgroundListFallback;
    $[424] = renderedRows;
    $[425] = listChildren;
  } else listChildren = $[425];
  let renderedListRows = listChildren;
  let BACKGROUND_LIST_LINES =
    backgroundListModules && backgroundListFallback ? backgroundListModules.BACKGROUND_LIST_LINES : undefined;
  let visibleCount =
    visibleRowCount === undefined
      ? undefined
      : Math.min(renderedListRows.length, BACKGROUND_LIST_LINES ?? visibleRowCount);
  let dialogElement;
  if (
    $[426] !== children_2 ||
    $[427] !== allSelectableItems ||
    $[428] !== focusedRow ||
    $[429] !== onRowKeyDown ||
    $[430] !== historyRow.length ||
    $[431] !== renderedListRows ||
    $[432] !== rows_2 ||
    $[433] !== backgroundListFallback ||
    $[434] !== BACKGROUND_LIST_LINES ||
    $[435] !== onDone ||
    $[436] !== onFocus ||
    $[437] !== runItemAction ||
    $[438] !== onSelect ||
    $[439] !== children ||
    $[440] !== columns ||
    $[441] !== viewState.itemId ||
    $[442] !== viewState.mode ||
    $[443] !== visibleCount
  ) {
    let actionItem =
      viewState.mode === "actions"
        ? allSelectableItems.find((item_9) => item_9.id === viewState.itemId)
        : undefined;
    let focusedIndex;
    if ($[445] !== focusedRow || $[446] !== rows_2) {
      let matchesFocus;
      if ($[448] !== focusedRow) {
        matchesFocus = (item_10) => item_10.id === focusedRow.id;
        $[448] = focusedRow;
        $[449] = matchesFocus;
      } else matchesFocus = $[449];
      focusedIndex = rows_2.findIndex(matchesFocus);
      $[445] = focusedRow;
      $[446] = rows_2;
      $[447] = focusedIndex;
    } else focusedIndex = $[447];
    let focusedIndexOf = focusedIndex;
    let onCancel;
    if ($[450] !== onDone || $[451] !== viewState.mode) {
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
      $[450] = onDone;
      $[451] = viewState.mode;
      $[452] = onCancel;
    } else onCancel = $[452];
    let onCancel_2 = onCancel;
    let subtitle;
    if ($[453] !== backgroundListFallback || $[454] !== children) {
      subtitle = backgroundListFallback
        ? backgroundListFallback.count
        : jsxProd_default(Fragment, {
            children,
          });
      $[453] = backgroundListFallback;
      $[454] = children;
      $[455] = subtitle;
    } else subtitle = $[455];
    let inputGuide;
    if ($[456] !== children_2) {
      inputGuide = jsxProd_default(Byline, {
        children: children_2,
      });
      $[456] = children_2;
      $[457] = inputGuide;
    } else inputGuide = $[457];
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
    $[426] = children_2;
    $[427] = allSelectableItems;
    $[428] = focusedRow;
    $[429] = onRowKeyDown;
    $[430] = historyRow.length;
    $[431] = renderedListRows;
    $[432] = rows_2;
    $[433] = backgroundListFallback;
    $[434] = BACKGROUND_LIST_LINES;
    $[435] = onDone;
    $[436] = onFocus;
    $[437] = runItemAction;
    $[438] = onSelect;
    $[439] = children;
    $[440] = columns;
    $[441] = viewState.itemId;
    $[442] = viewState.mode;
    $[443] = visibleCount;
    $[444] = dialogElement;
  } else dialogElement = $[444];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:762915-762973 layout
var ACTION_LABELS = {
  view: "View",
  foreground: "Foreground",
  stop: "Stop",
};
//@ chunk-18hwfzwa.js:762973-763067 layout
function availableTaskActions(item) {
  return [
    ...(canOpenTaskDetail(item) ? ["view"] : []),
    ...(canForegroundTask(item) ? ["foreground"] : []),
    ...(canStopTask(item) ? ["stop"] : []),
  ];
}
//@ chunk-18hwfzwa.js:763067-763174 layout
function canOpenTaskDetail(item) {
  return (
    hasDetailDialog(item.type) ||
    (item.type === "recorded_agent" && item.row.entry.agentType !== undefined && !item.isRefused)
  );
}
//@ chunk-18hwfzwa.js:763174-763336 layout
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
//@ chunk-18hwfzwa.js:763336-763737 layout
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
      false)
  );
}
//@ chunk-18hwfzwa.js:763737-763751 layout
var MAIN = "main";
//@ chunk-18hwfzwa.js:763751-763818 layout
function viewingLabel(item) {
  return item.label === MAIN ? "Viewing main" : "Viewing leader";
}
//@ chunk-18hwfzwa.js:763818-763999 callgraph-fingerprint = Item (0.252)
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
//@ chunk-18hwfzwa.js:763999-764108 layout
function isParkedCompletedAgent(status) {
  return (
    status.type === "local_agent" &&
    status.status === "completed" &&
    status.quietlyParked !== true &&
    !(isCoordinatorPanelActive() && isTerminalStatus(status))
  );
}
//@ chunk-18hwfzwa.js:764108-764166 layout = getSelectableBackgroundTasks (0.788)
function getSelectableBackgroundTasks_2(item) {
  return item.type === "local_agent" && isParkedCompletedAgent(item.task);
}
//@ chunk-18hwfzwa.js:764166-765510 fingerprint = toListItem (0.784)
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
//@ chunk-18hwfzwa.js:765510-765534 affinity
function useBackgroundListV3Stub() {
  return false;
}
//@ chunk-18hwfzwa.js:765534-765561 affinity
function useBackgroundListStub() {
  return null;
}
export { BackgroundTasksDialog };
