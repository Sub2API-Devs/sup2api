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
import { init_react_production, y, P, R, Se, Oo } from "../../../vendor/react/cjs/react.production.js";
import { isSubagentHistoryEnabled } from "../messages/UserPromptMessage.js";
import { processBatched } from "../../services/mcp/client.js";
import { getSessionSubagentsDir } from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";
import { repeatString, collapseWhitespace } from "../../utils/stringUtils.js";
import { _S } from "../../../vendor/chart.js/dist/chart.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:686154-686687 placement
/**
 * 停止 ultrareview 远程任务并通知
 */
async function stopUltrareviewTask(h, x, setAppState, L, ee, storageV5) {
  await RemoteAgentTask.kill(h, setAppState, L, undefined, storageV5);
  logEvent("tengu_review_remote_stopped", {
    source: fromEnum(x),
  });
  ee.enqueuePendingNotification({
    value:
      "Ultrareview stopped. Run /ultrareview to start a new review, which uses one of your free ultrareviews or bills as usage credits.",
    mode: "task-notification",
    agentId: mainAgentId(),
  });
  ee.enqueuePendingNotification({
    value:
      "The user stopped the ultrareview session above. Do not respond to the stop notification \u2014 wait for their next message.",
    mode: "task-notification",
    agentId: mainAgentId(),
    isMeta: true,
  });
}
//@ chunk-18hwfzwa.js:686687-686691 placement
init_react_production();
//@ chunk-18hwfzwa.js:726327-726331 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:726331-726341 sole-consumer
var MAX_TREE_DEPTH = 6;
//@ chunk-18hwfzwa.js:726341-726625 sole-consumer
function useSubagentHistory(storageV5, x) {
  let [D, L] = y(() => ({
    status: isSubagentHistoryEnabled() ? "loading" : "off",
  }));
  let ee = D.status === "off";
  P(() => {
    if (ee) return;
    let ke = true;
    processBatched(getSessionSubagentsDir(), storageV5)
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
      .then((Re) => {
        if (ke) L(Re);
      })
      .catch(logError);
    return () => {
      ke = false;
    };
  }, [storageV5, ee, x]);
  return D;
}
//@ chunk-18hwfzwa.js:726625-726845 sole-consumer
function flattenSubagentTree(nodes, x) {
  let D = [];
  let L = expandHiddenSubagents(
    nodes.filter((ee) => ee.entry.group === ""),
    0,
    undefined,
    x,
  );
  for (let ee = L.pop(); ee !== undefined; ee = L.pop()) {
    D.push(ee.row);
    for (let ke of expandHiddenSubagents(ee.children, ee.row.depth + 1, ee.row.entry, x)) L.push(ke);
  }
  return D;
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
function expandHiddenSubagents(h, depth, parent, L) {
  let ee = [];
  let ke = h.toReversed();
  for (let Re = ke.pop(); Re !== undefined; Re = ke.pop())
    if (L(Re.entry.agentId)) for (let child of Re.children.toReversed()) ke.push(child);
    else ee.push(Re);
  return ee
    .map((Re, Be) => ({
      row: {
        entry: Re.entry,
        depth,
        isLastSibling: Be === ee.length - 1,
        parent,
      },
      children: Re.children,
    }))
    .reverse();
}
//@ chunk-18hwfzwa.js:727381-727508 sole-consumer
function treePrefix({ depth, isLastSibling }) {
  if (depth === 0) return "";
  return (
    repeatString(`${_S.pipe} `, Math.min(depth, MAX_TREE_DEPTH) - 1) +
    `${isLastSibling ? _S.last : _S.branch} `
  );
}
//@ chunk-18hwfzwa.js:727508-727560 sole-consumer
function entryLabel(h) {
  return sanitizeLabel(h.description) || h.agentId;
}
//@ chunk-18hwfzwa.js:727560-727627 sole-consumer
function entryMetaLabel(entry) {
  return sanitizeLabel(entry.name && `@${entry.name}`) || sanitizeLabel(entry.agentType);
}
//@ chunk-18hwfzwa.js:727627-727819 sole-consumer
function describeAgentTimes({ startedAt, lastActivityAt }, now) {
  let L =
    startedAt === undefined
      ? ""
      : formatRelativeTimeAgo(new Date(startedAt), {
          now,
        });
  let ee =
    lastActivityAt === undefined
      ? ""
      : formatRelativeTimeAgo(new Date(lastActivityAt), {
          now,
        });
  return [L && `started ${L}`, ee !== L && ee ? `last active ${ee}` : ""];
}
//@ chunk-18hwfzwa.js:727819-727852 sole-consumer
function sanitizeLabel(h) {
  return cleanTaskDescription(h) ?? "";
}
//@ chunk-18hwfzwa.js:727852-727885 sole-consumer
function selectTasks_2(g_) {
  return g_.tasks;
}
//@ chunk-18hwfzwa.js:727885-727929 sole-consumer
function isListableTask(fc) {
  return isTaskShownInDialog(fc, false) && !isAmbientTask(fc);
}
//@ chunk-18hwfzwa.js:727929-727959 sole-consumer
function emptyIdSet() {
  return new Set();
}
//@ chunk-18hwfzwa.js:727959-728006 sole-consumer
function taskKey(Hx) {
  return `${Hx.id},${Hx.status}`;
}
//@ chunk-18hwfzwa.js:728006-728036 sole-consumer
function taskId(gy) {
  return gy.id;
}
//@ chunk-18hwfzwa.js:728036-728260 affinity
function compareTasksRunningFirst(tw, Ux) {
  let status = tw.status;
  let status_2 = Ux.status;
  if (status === "running" && status_2 !== "running") {
    return -1;
  }
  if (status !== "running" && status_2 === "running") {
    return 1;
  }
  let startTime = "task" in tw ? tw.task.startTime : 0;
  return ("task" in Ux ? Ux.task.startTime : 0) - startTime;
}
//@ chunk-18hwfzwa.js:728260-728373 file-local
function taskIdAliases(i_0) {
  return i_0.type === "in_process_teammate"
    ? [i_0.id, i_0.task.identity.resumableAgentId ?? i_0.id]
    : [i_0.id];
}
//@ chunk-18hwfzwa.js:728373-728420 layout
function isLocalBashTask(qx) {
  return qx.type === "local_bash";
}
//@ chunk-18hwfzwa.js:728420-728469 layout
function isRemoteAgentTask($x) {
  return $x.type === "remote_agent";
}
//@ chunk-18hwfzwa.js:728469-728517 fingerprint = getSelectableBackgroundTasks (1)
function getSelectableBackgroundTasks(i_0) {
  return i_0.type === "local_agent";
}
//@ chunk-18hwfzwa.js:728517-728548 affinity
function isNotSelectableTask(Yp) {
  return !getSelectableBackgroundTasks_2(Yp);
}
//@ chunk-18hwfzwa.js:728548-728599 affinity
function isLocalWorkflowTask(Vx) {
  return Vx.type === "local_workflow";
}
//@ chunk-18hwfzwa.js:728599-728671 affinity
function isMonitorTask(RE) {
  return RE.type === "monitor_mcp" || RE.type === "monitor_ws";
}
//@ chunk-18hwfzwa.js:728671-728716 affinity
function isMcpTask(qg) {
  return qg.type === "mcp_task";
}
//@ chunk-18hwfzwa.js:728758-728809 placement
function isAutoModeScanTask(OS) {
  return OS.type === "auto_mode_scan";
}
//@ chunk-18hwfzwa.js:728809-728865 placement
function isLocalMemoryImportTask(xE) {
  return xE.type === "local_memory_import";
}
//@ chunk-18hwfzwa.js:728865-728918 placement
function isPostTurnMemoryTask(nw) {
  return nw.type === "post_turn_memory";
}
//@ chunk-18hwfzwa.js:728918-728952 placement
function toIdPair(qk) {
  return [qk.id, qk];
}
//@ chunk-18hwfzwa.js:728952-729052 placement
/**
 * 子代理历史无法读取时记调试日志（文件不可访问）或记错误，返回 false。
 */
function logSubagentHistoryLaunchError(PE) {
  if (isFsInaccessible(PE)) logForDebugging(`subagent history: launch unreadable: ${PE.code}`);
  else logError(PE);
  return false;
}
//@ chunk-18hwfzwa.js:729052-729082 placement
function logErrorAndReturn(b_) {
  return logError(b_);
}
//@ chunk-18hwfzwa.js:729082-729112 placement
function logErrorAndReturn_2($k) {
  return logError($k);
}
//@ chunk-18hwfzwa.js:729112-729142 placement
function logErrorAndReturn_3(Gx) {
  return logError(Gx);
}
//@ chunk-18hwfzwa.js:729142-729158 placement
function noopLaunch() {}
//@ chunk-18hwfzwa.js:729158-729174 placement
function noopLaunchError() {}
//@ chunk-18hwfzwa.js:729220-729250 placement
function logErrorWrapper(AE) {
  return logError(AE);
}
//@ chunk-18hwfzwa.js:729250-729280 placement
function logErrorWrapper2(If) {
  return logError(If);
}
//@ chunk-18hwfzwa.js:729280-729310 placement
function logErrorWrapper3(fu) {
  return logError(fu);
}
//@ chunk-18hwfzwa.js:729310-729340 placement
function logErrorWrapper4(w_) {
  return logError(w_);
}
//@ chunk-18hwfzwa.js:729340-729370 placement
function logErrorWrapper5(Vg) {
  return logError(Vg);
}
//@ chunk-18hwfzwa.js:729370-729400 placement
function logErrorWrapper6(k_) {
  return logError(k_);
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
function renderSeparator(Jp) {
  return jsxProd_default(
    Text,
    {
      children: " \xB7 ",
    },
    `separator-${Jp}`,
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
function toListRow(FS) {
  return {
    kind: "row",
    item: FS,
    key: FS.id,
  };
}
//@ chunk-18hwfzwa.js:729906-729948 layout
function hasRows(lw) {
  return lw.items.length > 0;
}
//@ chunk-18hwfzwa.js:729948-729996 layout
function toActionOption(WS) {
  return {
    label: ACTION_LABELS[WS],
    value: WS,
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
var WorkflowDetailDialog = require("./chunk-vhwr4tjc.js").WorkflowDetailDialog;
var {
  killWorkflowTask,
  pauseWorkflowTask,
  skipWorkflowAgent,
  retryWorkflowAgent,
} = require("./chunk-jnjk6c09.js");
var monitorMcpKillModule = null;
var killMonitorMcp = monitorMcpKillModule?.killMonitorMcp ?? null;
var mcpTaskDetailDialogModule = null;
var kill = require("./chunk-1wp0vvkk.js").MCP_TASK.kill;
var McpTaskDetailDialog = require("./chunk-qd18c590.js").McpTaskDetailDialog;
var detailScreenGates = null;
var monitorMcpDetailFeatureGates = null;
var mcpTaskDetailFeatureGates = null;
var shellDetailGates = null;
var workflowDetailGates = null;
var remoteAgentDetailGates = null;
var dreamDetailGates = null;
var autoModeScanDetailGates = null;
var memoryImportDetailGates = null;
var subagentHistoryDetailGates = null;
var localMemoryImportDetailGates = null;
var localMemoryDetailModule = null;
var backgroundListModules = null;
var useBackgroundListV3Fallback = backgroundListModules?.useBackgroundListV3 ?? useBackgroundListV3Stub;
var useBackgroundListFallback = backgroundListModules?.useBackgroundList ?? useBackgroundListStub;
//@ chunk-18hwfzwa.js:730883-731180 layout
function hasBackgroundDetailScreen(h) {
  return (
    detailScreenGates?.isBackgroundDetailScreenEnabled() === true &&
    (h.type === "local_bash" ||
      h.type === "remote_agent" ||
      h.type === "local_workflow" ||
      h.type === "dream" ||
      h.type === "auto_mode_scan" ||
      (h.type === "monitor_mcp" && monitorMcpDetailFeatureGates !== null) ||
      (h.type === "local_memory_import" && localMemoryDetailModule !== null) ||
      (h.type === "mcp_task" && mcpTaskDetailFeatureGates !== null))
  );
}
//@ chunk-18hwfzwa.js:731180-731600 layout
/**
 * 判断任务是否列入后台任务对话框（协调面板、失败/被杀可见、已完成后台代理、仍在运行等规则）。
 */
function isTaskShownInDialog(task, backgroundListV3Fallback) {
  if (isCoordinatorPanelActive() && isBackgroundTask(task)) return true;
  let D =
    backgroundListV3Fallback &&
    (task.status === "failed" || task.status === "killed") &&
    (task.type === "local_agent" ||
      task.type === "in_process_teammate" ||
      task.type === "local_workflow" ||
      task.type === "local_bash" ||
      task.type === "mcp_task");
  if (task.type === "local_agent" && (task.status === "completed" || D))
    return (
      isPanelAgentTask(task) &&
      task.isBackgrounded &&
      !isObserverAgentTask(task) &&
      task.evictAfter !== 0 &&
      (D || [...(task.keepaliveReasons ?? [])].every((L) => L === FLAG_IDLE_WINDOW))
    );
  if (D) return !TaskOutputResultDisplay(task);
  return waitForTaskCompletion(task);
}
//@ chunk-18hwfzwa.js:731600-762915 fingerprint = BackgroundTasksDialog (0.512)
/**
 * 后台任务对话框：把各类任务（local_bash、local_agent、in_process_teammate、local_workflow、remote_agent、monitor_mcp、dream）转成列表项，list/detail 两级视图，支持停止所有 agent（chat:killAgents）、进入队友视图、查看输出。
 */
function BackgroundTasksDialog(props) {
  let $ = w(458);
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
  let It = messageQueue;
  let killAgentsShortcut = useShortcutDisplay_2("chat:killAgents", "Chat", "ctrl+x ctrl+k");
  let Et = tasks;
  let Dt = subscribeCoordinatorPanel();
  let oo;
  if ($[0] !== Dt) {
    oo = (Xt) => Dt && Xt.viewingAgentTaskId !== undefined;
    $[0] = Dt;
    $[1] = oo;
  } else oo = $[1];
  let skippedListOnMount = useAppState(oo);
  let backgroundListV3Fallback = useBackgroundListV3Fallback();
  let po;
  if (
    $[2] !== initialDetailTaskId ||
    $[3] !== backgroundListV3Fallback ||
    $[4] !== skippedListOnMount ||
    $[5] !== Et
  ) {
    po = () => {
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
      let filtered = Object.values(Et ?? {}).filter(isListableTask);
      let co = filtered.length === 1 ? filtered[0] : undefined;
      if (
        co &&
        !skippedListOnMount &&
        hasDetailDialog(co.type) &&
        !(co.type === "local_agent" && isParkedCompletedAgent(co))
      ) {
        return {
          mode: "detail",
          itemId: co.id,
        };
      }
      return {
        mode: "list",
      };
    };
    $[2] = initialDetailTaskId;
    $[3] = backgroundListV3Fallback;
    $[4] = skippedListOnMount;
    $[5] = Et;
    $[6] = po;
  } else po = $[6];
  let [bo, Ao] = y(po);
  let Bo = R(bo.mode === "detail");
  let Ro;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Ro = {
      index: 0,
    };
    $[7] = Ro;
  } else Ro = $[7];
  let [Ho, Io] = y(Ro);
  let [Wo, mn] = y(false);
  let [Cn, No] = y(false);
  let [vo, Yo] = y(emptyIdSet);
  let kn;
  if ($[8] !== Et) {
    kn = Object.values(Et ?? {})
      .filter(isLocalAgent)
      .map(taskKey);
    $[8] = Et;
    $[9] = kn;
  } else kn = $[9];
  let allItems = useSubagentHistory(storageV5, `${Cn} ${kn.join()}`);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let scrollColumnContext = useScrollColumnContext();
  let hn = Se(ContextSlotA);
  let { rows, columns } = useTerminalSize();
  let Sn = scrollColumnContext === null && hn === null ? Math.max(7, Math.floor(rows / 2)) : undefined;
  useRegisterOverlay("background-tasks-dialog");
  let $n;
  if (
    $[10] !== backgroundListV3Fallback ||
    $[11] !== vo ||
    $[12] !== Cn ||
    $[13] !== skippedListOnMount ||
    $[14] !== Wo ||
    $[15] !== allItems.nodes ||
    $[16] !== allItems.status ||
    $[17] !== Et
  ) {
    const values = Object.values(Et ?? {});
    let _o;
    if ($[19] !== backgroundListV3Fallback) {
      _o = (cn) => isTaskShownInDialog(cn, backgroundListV3Fallback);
      $[19] = backgroundListV3Fallback;
      $[20] = _o;
    } else _o = $[20];
    let backgroundTasks = values.filter(_o);
    let wn = new Set(backgroundTasks.filter(isAmbientTask).map(taskId));
    let allItems_0 = backgroundTasks.map(toListItem);
    let sorted = allItems_0.sort(compareTasksRunningFirst);
    let filtered = sorted.filter((Wn) => !wn.has(Wn.id));
    let filtered_2 = sorted.filter((Zn) => wn.has(Zn.id));
    let dr = filtered_2[0];
    let or =
      Wo || dr === undefined
        ? filtered_2
        : [
            {
              id: SELF_MANAGED_TASKS_KEY,
              type: "self_managed_tasks",
              label: SYSTEM_TASKS_LABEL,
              status: "running",
              size: filtered_2.length,
              firstTaskId: dr.id,
            },
          ];
    let pr = new Set([
      LEADER_GROUP_KEY,
      SELF_MANAGED_TASKS_KEY,
      SUBAGENT_HISTORY_KEY,
      ...allItems_0.flatMap(taskIdAliases),
    ]);
    let Ir =
      allItems.status === "loaded"
        ? flattenSubagentTree(allItems.nodes, (Qn) => {
            let task = Et?.[Qn];
            return (
              pr.has(Qn) ||
              (task !== undefined &&
                (task.status === "running" || isBackgroundTask(task) || isMainSessionTask(task)))
            );
          })
        : [];
    let Gn =
      allItems.status === "off"
        ? []
        : Cn && Ir.length > 0
          ? Ir.map((Pr) => {
              let ts = Et?.[Pr.entry.agentId];
              return {
                id: Pr.entry.agentId,
                type: "recorded_agent",
                label: entryLabel(Pr.entry),
                status: "completed",
                isRefused: vo.has(Pr.entry.agentId),
                row: isLocalAgent(ts)
                  ? {
                      ...Pr,
                      entry: {
                        ...Pr.entry,
                        stoppedByUser: ts.stoppedByUser === true,
                        lastActivityAt: ts.endTime ?? Pr.entry.lastActivityAt,
                      },
                    }
                  : Pr,
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
                    ? Ir.length
                    : allItems.status === "failed"
                      ? "unreadable"
                      : undefined,
                firstAgentId: Ir[0]?.entry.agentId,
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
    let Ls = [];
    let is = new Map();
    for (const ws of filtered) {
      if (ws.type !== "in_process_teammate") {
        continue;
      }
      let Ci = is.get(ws.task.identity.teamName);
      if (Ci) Ci.push(ws);
      else is.set(ws.task.identity.teamName, [ws]);
    }
    let oi = [...is.values()].flat();
    let Oi =
      oi.length > 0 || skippedListOnMount
        ? [
            {
              id: LEADER_GROUP_KEY,
              type: "leader",
              label: oi.length > 0 ? `@${TEAM_LEAD}` : MAIN,
              status: "running",
            },
          ]
        : [];
    $n = {
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
      selfManaged: or,
      historyRow: Gn,
      teammateTasks: [...Oi, ...oi],
      teams: [...is.entries()],
      listRows: [
        ...(is.size === 0 ? Oi : []),
        ...[...is.values()].flatMap((item_2) => [...Oi, ...item_2]),
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
        ...Ls,
        ...or,
        ...Gn,
      ],
      allSelectableItems: [
        ...Oi,
        ...oi,
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
        ...Ls,
        ...or,
        ...Gn,
      ],
    };
    $[10] = backgroundListV3Fallback;
    $[11] = vo;
    $[12] = Cn;
    $[13] = skippedListOnMount;
    $[14] = Wo;
    $[15] = allItems.nodes;
    $[16] = allItems.status;
    $[17] = Et;
    $[18] = $n;
  } else $n = $[18];
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
  } = $n;
  let on;
  if ($[21] !== Wo) {
    on = Wo ? [SELF_MANAGED_TASKS_KEY] : [];
    $[21] = Wo;
    $[22] = on;
  } else on = $[22];
  let _o;
  if ($[23] !== Cn) {
    _o = Cn ? [SUBAGENT_HISTORY_KEY] : [];
    $[23] = Cn;
    $[24] = _o;
  } else _o = $[24];
  let La;
  if ($[25] !== on || $[26] !== _o) {
    La = [...on, ..._o];
    $[25] = on;
    $[26] = _o;
    $[27] = La;
  } else La = $[27];
  let backgroundListFallback = useBackgroundListFallback(allSelectableItems, La, bo.mode === "list");
  let dl;
  Vl: {
    if (!backgroundListFallback) {
      dl = listRows;
      break Vl;
    }
    let Hd;
    if ($[28] !== allSelectableItems || $[29] !== backgroundListFallback.rows) {
      let Ss = new Map(allSelectableItems.map(toIdPair));
      Hd = backgroundListFallback.rows.flatMap((item_3) => Ss.get(item_3.id) ?? []);
      $[28] = allSelectableItems;
      $[29] = backgroundListFallback.rows;
      $[30] = Hd;
    } else Hd = $[30];
    dl = Hd;
  }
  let Ws = dl;
  let za = R(false);
  let cl = R(undefined);
  let Ol = R(null);
  let Hd;
  if ($[31] !== Ws) {
    Hd = (item_4) => {
      let id = Ws[item_4]?.id;
      let qa = cl.current;
      let pd = Ol.current !== Ws;
      cl.current = id;
      Ol.current = Ws;
      if (!pd) za.current = false;
      else if (qa !== undefined && qa !== id) za.current = !Ws.some((item_5) => item_5.id === qa);
      Io({
        id,
        index: item_4,
      });
    };
    $[31] = Ws;
    $[32] = Hd;
  } else Hd = $[32];
  let onFocus = Hd;
  let El;
  let Ll;
  if ($[33] !== Ws) {
    El = () => {
      if (Ol.current === null) {
        return;
      }
      Ol.current = Ws;
      let _c = cl.current;
      if (_c !== undefined && !Ws.some((prev) => prev.id === _c)) za.current = true;
    };
    Ll = [Ws];
    $[33] = Ws;
    $[34] = El;
    $[35] = Ll;
  } else {
    El = $[34];
    Ll = $[35];
  }
  P(El, Ll);
  let Vd;
  if ($[36] !== allSelectableItems || $[37] !== Ho || $[38] !== Ws) {
    Vd = allSelectableItems.find((prev_0) => prev_0.id === Ho.id) ?? Ws[Ho.index] ?? null;
    $[36] = allSelectableItems;
    $[37] = Ho;
    $[38] = Ws;
    $[39] = Vd;
  } else Vd = $[39];
  let Ka = Vd;
  let pl;
  if ($[40] !== onDone || $[41] !== setAppState || $[42] !== storageV5 || $[43] !== Et) {
    pl = function pl(Gl) {
      if (Gl.type === "self_managed_tasks") {
        cl.current = Gl.firstTaskId;
        mn(true);
      } else if (Gl.type === "subagent_history") {
        if (Gl.size === "unreadable") {
          logFeatureBad("subagent_history", "read_failed");
          return;
        }
        if (Gl.size === 0) {
          return;
        }
        logFeatureOk("subagent_history");
        cl.current = Gl.firstAgentId ?? cl.current;
        No(true);
      } else if (Gl.type === "recorded_agent") killShellTask(Gl.row.entry);
      else if (Gl.type === "leader") {
        exitTeammateView(setAppState);
        onDone(viewingLabel(Gl), {
          display: "system",
        });
      } else if (getSelectableBackgroundTasks_2(Gl)) {
        enterTeammateView(Gl.id, setAppState);
        onDone("Viewing agent", {
          display: "system",
        });
      } else if (hasDetailDialog(Gl.type))
        Ao({
          mode: "detail",
          itemId: Gl.id,
        });
    };
    async function killShellTask(taskId) {
      let bd = Et?.[taskId.agentId];
      if (
        !(bd === undefined
          ? await restoreAgentTaskFromTranscript(taskId, setAppState, storageV5).catch(
              logSubagentHistoryLaunchError,
            )
          : isPanelAgentTask(bd))
      ) {
        logFeatureBad("subagent_history_view", "not_viewable");
        Yo((Od) => new Set(Od).add(taskId.agentId));
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
    $[43] = Et;
    $[44] = pl;
  } else pl = $[44];
  let pc;
  if ($[45] !== session || $[46] !== setAppState || $[47] !== storageV5 || $[48] !== setAppState_2) {
    pc = function ec(taskId_0) {
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
    $[49] = pc;
  } else pc = $[49];
  let ec = pc;
  let qu;
  if ($[50] !== session || $[51] !== setAppState || $[52] !== storageV5 || $[53] !== setAppState_2) {
    qu = function Iu(Ku, iu) {
      if (!isCpuAccountingEnabled()) {
        return iu(Ku, setAppState_2, setAppState, undefined, storageV5).catch(logErrorAndReturn_2);
      }
      return stopTaskByUser(Ku, {
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
    $[54] = qu;
  } else qu = $[54];
  let Iu = qu;
  let Am;
  if ($[55] !== session || $[56] !== setAppState || $[57] !== storageV5 || $[58] !== setAppState_2) {
    Am = function Gs(taskId_1) {
      let nl = setAppState_2.get(taskId_1);
      if (isLocalAgent(nl) && (nl.status === "running" || hasCompletedWithFindings(nl)))
        markStoppedByUser(taskId_1, setAppState_2, storageV5);
      if (nl && isObserverAgentTask(nl)) {
        return stopTask_2(taskId_1, {
          taskRegistry: setAppState_2,
          setAppState,
          session,
          source: "user",
          storageV5,
        }).then(noopLaunch, noopLaunchError);
      }
      let ss = LocalAgentTask.kill(taskId_1, setAppState_2, setAppState, "user", storageV5);
      if (isPanelAgentTask(nl))
        stopAllTasks(nl, setAppState_2, {
          session,
          source: "user",
          storageV5,
        });
      return ss;
    };
    $[55] = session;
    $[56] = setAppState;
    $[57] = storageV5;
    $[58] = setAppState_2;
    $[59] = Am;
  } else Am = $[59];
  let Gs = Am;
  let ma;
  if ($[60] !== setAppState || $[61] !== storageV5 || $[62] !== setAppState_2) {
    ma = function xl(taskId_2) {
      return InProcessTeammateTask.kill(taskId_2, setAppState_2, setAppState, undefined, storageV5);
    };
    $[60] = setAppState;
    $[61] = storageV5;
    $[62] = setAppState_2;
    $[63] = ma;
  } else ma = $[63];
  let xl = ma;
  let Si;
  if ($[64] !== setAppState || $[65] !== storageV5 || $[66] !== setAppState_2) {
    Si = function js(taskId_3) {
      return DreamTask.kill(taskId_3, setAppState_2, setAppState, undefined, storageV5);
    };
    $[64] = setAppState;
    $[65] = storageV5;
    $[66] = setAppState_2;
    $[67] = Si;
  } else Si = $[67];
  let js = Si;
  let Ya;
  if ($[68] !== setAppState || $[69] !== storageV5 || $[70] !== setAppState_2) {
    Ya = function ol(agentId) {
      return LocalMemoryImportTask.kill(agentId, setAppState_2, setAppState, undefined, storageV5);
    };
    $[68] = setAppState;
    $[69] = storageV5;
    $[70] = setAppState_2;
    $[71] = Ya;
  } else Ya = $[71];
  let ol = Ya;
  let ed;
  if ($[72] !== setAppState || $[73] !== storageV5 || $[74] !== setAppState_2) {
    ed = function ga(agentId_0) {
      return AutoModeScanTask.kill(agentId_0, setAppState_2, setAppState, undefined, storageV5);
    };
    $[72] = setAppState;
    $[73] = storageV5;
    $[74] = setAppState_2;
    $[75] = ed;
  } else ed = $[75];
  let ga = ed;
  let du;
  if ($[76] !== setAppState || $[77] !== storageV5 || $[78] !== setAppState_2) {
    du = function wp(rg) {
      return RemoteAgentTask.kill(rg, setAppState_2, setAppState, undefined, storageV5);
    };
    $[76] = setAppState;
    $[77] = storageV5;
    $[78] = setAppState_2;
    $[79] = du;
  } else du = $[79];
  let wp = du;
  let Wd;
  if (
    $[80] !== Gs ||
    $[81] !== ga ||
    $[82] !== js ||
    $[83] !== ol ||
    $[84] !== wp ||
    $[85] !== ec ||
    $[86] !== xl ||
    $[87] !== It ||
    $[88] !== setAppState ||
    $[89] !== Iu ||
    $[90] !== storageV5 ||
    $[91] !== setAppState_2
  ) {
    Wd = function Yd(Rl) {
      if (Rl.type === "local_bash" && Rl.status === "running") ec(Rl.id);
      else if (Rl.type === "local_agent" && (Rl.status === "running" || isWaitingOnChildren(Rl.task)))
        Gs(Rl.id);
      else if (Rl.type === "local_agent" && isCompletedBackgroundAgent(Rl.task))
        stopOrDismissAgent(Rl.id, setAppState);
      else if (Rl.type === "in_process_teammate" && Rl.status === "running") xl(Rl.id);
      else if (Rl.type === "local_workflow" && Rl.status === "running")
        killWorkflowTask(Rl.id, setAppState_2, "user");
      else if (Rl.type === "monitor_mcp" && Rl.status === "running" && killMonitorMcp)
        killMonitorMcp(Rl.id, setAppState_2);
      else if (Rl.type === "monitor_ws" && Rl.status === "running")
        stopMonitorWsTasks(Rl.id, setAppState_2, {
          userStop: true,
          taskStop: true,
        });
      else if (Rl.type === "mcp_task" && Rl.status === "running" && kill) Iu(Rl.id, kill);
      else if (Rl.type === "dream" && Rl.status === "running") js(Rl.id);
      else if (Rl.type === "auto_mode_scan" && Rl.status === "running") ga(Rl.id);
      else if (Rl.type === "local_memory_import" && Rl.status === "running") ol(Rl.id);
      else if (Rl.type === "post_turn_memory" && Rl.status === "running")
        PostTurnMemoryTask.kill(Rl.id, setAppState_2, setAppState, undefined, storageV5);
      else if (Rl.type === "remote_agent" && Rl.status === "running") {
        if (Rl.task.isUltraplan)
          stopUltraplan(Rl.id, Rl.task.sessionId, setAppState_2, setAppState, It, storageV5);
        else if (Rl.task.isRemoteReview)
          Ao({
            mode: "confirmStopReview",
            itemId: Rl.id,
          });
        else wp(Rl.id);
      }
    };
    $[80] = Gs;
    $[81] = ga;
    $[82] = js;
    $[83] = ol;
    $[84] = wp;
    $[85] = ec;
    $[86] = xl;
    $[87] = It;
    $[88] = setAppState;
    $[89] = Iu;
    $[90] = storageV5;
    $[91] = setAppState_2;
    $[92] = Wd;
  } else Wd = $[92];
  let Yd = Wd;
  let Pi;
  if ($[93] !== onDone || $[94] !== setAppState) {
    Pi = function sa(fa) {
      if (fa.type === "in_process_teammate" && fa.status === "running") {
        enterTeammateView(fa.id, setAppState);
        onDone("Viewing teammate", {
          display: "system",
        });
        return true;
      }
      if (fa.type === "local_agent" && isPanelAgentTask(fa.task)) {
        enterTeammateView(fa.id, setAppState);
        onDone("Viewing agent", {
          display: "system",
        });
        return true;
      }
      if (fa.type === "leader") {
        exitTeammateView(setAppState);
        onDone(viewingLabel(fa), {
          display: "system",
        });
        return true;
      }
      return false;
    };
    $[93] = onDone;
    $[94] = setAppState;
    $[95] = Pi;
  } else Pi = $[95];
  let sa = Pi;
  let td;
  if ($[96] !== sa || $[97] !== Ws || $[98] !== Yd) {
    td = (event, Ad) => {
      let od = Ws[Ad];
      if (!od) {
        return;
      }
      if (event.key === "x" && !event.ctrl && !event.meta) {
        event.preventDefault();
        if (za.current) {
          za.current = false;
          return;
        }
        Yd(od);
        return;
      }
      if (event.key === "f" && !event.ctrl && !event.meta && sa(od)) event.preventDefault();
    };
    $[96] = sa;
    $[97] = Ws;
    $[98] = Yd;
    $[99] = td;
  } else td = $[99];
  let onRowKeyDown = td;
  let vp;
  if ($[100] !== isScreenReaderEnabled || $[101] !== Ws || $[102] !== pl) {
    vp = (sg) => {
      let zi = Ws[sg];
      if (!zi) {
        return;
      }
      if (!isScreenReaderEnabled || zi.type === "self_managed_tasks" || zi.type === "subagent_history") {
        pl(zi);
        return;
      }
      if (availableTaskActions(zi).length > 0)
        Ao({
          mode: "actions",
          itemId: zi.id,
        });
    };
    $[100] = isScreenReaderEnabled;
    $[101] = Ws;
    $[102] = pl;
    $[103] = vp;
  } else vp = $[103];
  let onSelect = vp;
  let Qd;
  if ($[104] !== sa || $[105] !== pl || $[106] !== Yd) {
    Qd = function xc(zd, Hc) {
      switch (
        (Ao({
          mode: "list",
        }),
        zd)
      ) {
        case "view": {
          pl(Hc);
          return;
        }
        case "foreground": {
          sa(Hc);
          return;
        }
        case "stop": {
          Yd(Hc);
          return;
        }
      }
    };
    $[104] = sa;
    $[105] = pl;
    $[106] = Yd;
    $[107] = Qd;
  } else Qd = $[107];
  let xc = Qd;
  let Yc = Oo(onDone);
  let [tc, Cp] = y();
  let Eu = bo.mode === "detail" ? Et?.[bo.itemId] : undefined;
  if (
    (Eu?.type === "local_bash" ||
      Eu?.type === "monitor_mcp" ||
      Eu?.type === "mcp_task" ||
      Eu?.type === "remote_agent" ||
      Eu?.type === "local_workflow" ||
      Eu?.type === "dream" ||
      Eu?.type === "auto_mode_scan" ||
      Eu?.type === "local_memory_import") &&
    Eu !== tc &&
    Eu.status !== "running" &&
    Eu.status !== "pending" &&
    Eu.status !== "paused" &&
    hasBackgroundDetailScreen(Eu)
  )
    Cp(Eu);
  let Rp = bo.mode === "detail" && tc?.id === bo.itemId ? tc : undefined;
  let Fh;
  if (
    $[108] !== allSelectableItems ||
    $[109] !== Rp ||
    $[110] !== backgroundListV3Fallback ||
    $[111] !== Yc ||
    $[112] !== Et ||
    $[113] !== bo.itemId ||
    $[114] !== bo.mode
  ) {
    Fh = () => {
      if (bo.mode === "actions") {
        if (!allSelectableItems.some((index) => index.id === bo.itemId))
          Ao({
            mode: "list",
          });
        return;
      }
      if (bo.mode !== "list") {
        let Nd = (Et ?? {})[bo.itemId] ?? Rp;
        if (
          !Nd ||
          (Nd.type !== "local_workflow" &&
            Nd.type !== "mcp_task" &&
            !(
              (Nd.type === "local_agent" || Nd.type === "in_process_teammate") &&
              detailScreenGates?.isBackgroundDetailScreenEnabled()
            ) &&
            !hasBackgroundDetailScreen(Nd) &&
            !isTaskShownInDialog(Nd, backgroundListV3Fallback))
        ) {
          if (Bo.current && !(!Nd && detailScreenGates?.isBackgroundDetailScreenEnabled()))
            Yc("Background dialog dismissed", {
              display: "skip",
            });
          else
            Ao({
              mode: "list",
            });
        }
      }
    };
    $[108] = allSelectableItems;
    $[109] = Rp;
    $[110] = backgroundListV3Fallback;
    $[111] = Yc;
    $[112] = Et;
    $[113] = bo.itemId;
    $[114] = bo.mode;
    $[115] = Fh;
  } else Fh = $[115];
  let Af;
  if (
    $[116] !== allSelectableItems ||
    $[117] !== Rp ||
    $[118] !== backgroundListV3Fallback ||
    $[119] !== Et ||
    $[120] !== bo
  ) {
    Af = [bo, Et, allSelectableItems, Rp, backgroundListV3Fallback];
    $[116] = allSelectableItems;
    $[117] = Rp;
    $[118] = backgroundListV3Fallback;
    $[119] = Et;
    $[120] = bo;
    $[121] = Af;
  } else Af = $[121];
  P(Fh, Af);
  let Du;
  if ($[122] !== allSelectableItems.length || $[123] !== onBack || $[124] !== onDone) {
    Du = () => {
      if (onBack) onBack();
      else if (Bo.current && allSelectableItems.length <= 1)
        onDone("Background dialog dismissed", {
          display: "skip",
        });
      else {
        Bo.current = false;
        Ao({
          mode: "list",
        });
      }
    };
    $[122] = allSelectableItems.length;
    $[123] = onBack;
    $[124] = onDone;
    $[125] = Du;
  } else Du = $[125];
  let onBack_2 = Du;
  let Fg = count(agentTasks, isTaskRunning) > 1;
  if (bo.mode !== "list" && bo.mode !== "actions" && Et) {
    let ns = Et[bo.itemId] ?? Rp;
    if (!ns) {
      return null;
    }
    if (bo.mode === "confirmStopReview") {
      let onStop;
      if (
        $[126] !== It ||
        $[127] !== setAppState ||
        $[128] !== storageV5 ||
        $[129] !== setAppState_2 ||
        $[130] !== bo.itemId
      ) {
        onStop = () => {
          stopUltrareviewTask(bo.itemId, "task_list", setAppState_2, setAppState, It, storageV5);
          Ao({
            mode: "list",
          });
        };
        $[126] = It;
        $[127] = setAppState;
        $[128] = storageV5;
        $[129] = setAppState_2;
        $[130] = bo.itemId;
        $[131] = onStop;
      } else onStop = $[131];
      let onBack;
      if ($[132] === MEMO_CACHE_SENTINEL) {
        onBack = () =>
          Ao({
            mode: "list",
          });
        $[132] = onBack;
      } else onBack = $[132];
      let Ti;
      if ($[133] !== onStop) {
        Ti = jsxProd_default(StopUltrareviewConfirm, {
          onStop,
          onBack,
        });
        $[133] = onStop;
        $[134] = Ti;
      } else Ti = $[134];
      return Ti;
    }
    switch (ns.type) {
      case "local_bash": {
        if (autoModeScanDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const ba = `shell-${ns.id}`;
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
          if ($[137] !== ec || $[138] !== ns.id) {
            onStop = () => void ec(ns.id).catch(logErrorWrapper);
            $[137] = ec;
            $[138] = ns.id;
            $[139] = onStop;
          } else onStop = $[139];
          let Qa;
          if (
            $[140] !== onBack_2 ||
            $[141] !== ba ||
            $[142] !== onClose ||
            $[143] !== onStop ||
            $[144] !== ns
          ) {
            Qa = jsxProd_default(
              autoModeScanDetailGates,
              {
                shell: ns,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              ba,
            );
            $[140] = onBack_2;
            $[141] = ba;
            $[142] = onClose;
            $[143] = onStop;
            $[144] = ns;
            $[145] = Qa;
          } else Qa = $[145];
          return Qa;
        }
        const ba = `shell-${ns.id}`;
        let onKillShell;
        if ($[146] !== ec || $[147] !== ns.id) {
          onKillShell = () => void ec(ns.id);
          $[146] = ec;
          $[147] = ns.id;
          $[148] = onKillShell;
        } else onKillShell = $[148];
        let Ti;
        if (
          $[149] !== onBack_2 ||
          $[150] !== onDone ||
          $[151] !== ba ||
          $[152] !== onKillShell ||
          $[153] !== ns
        ) {
          Ti = jsxProd_default(
            ShellDetailDialog,
            {
              shell: ns,
              onDone,
              onKillShell,
              onBack: onBack_2,
            },
            ba,
          );
          $[149] = onBack_2;
          $[150] = onDone;
          $[151] = ba;
          $[152] = onKillShell;
          $[153] = ns;
          $[154] = Ti;
        } else Ti = $[154];
        return Ti;
      }
      case "local_agent": {
        let ba;
        if ($[155] !== onDone || $[156] !== setAppState || $[157] !== ns) {
          ba = isPanelAgentTask(ns)
            ? () => {
                enterTeammateView(ns.id, setAppState);
                onDone("Viewing agent", {
                  display: "system",
                });
              }
            : undefined;
          $[155] = onDone;
          $[156] = setAppState;
          $[157] = ns;
          $[158] = ba;
        } else ba = $[158];
        let Gp = ba;
        if (memoryImportDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const Mi = `agent-${ns.id}`;
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
          if ($[161] !== Gs || $[162] !== ns.id) {
            onStop = () => void Gs(ns.id).catch(logErrorWrapper2);
            $[161] = Gs;
            $[162] = ns.id;
            $[163] = onStop;
          } else onStop = $[163];
          let yl;
          if (
            $[164] !== onBack_2 ||
            $[165] !== Mi ||
            $[166] !== onClose ||
            $[167] !== onStop ||
            $[168] !== ns ||
            $[169] !== Gp
          ) {
            yl = jsxProd_default(
              memoryImportDetailGates,
              {
                agent: ns,
                onClose,
                onBack: onBack_2,
                onStop,
                onOpenTranscript: Gp,
              },
              Mi,
            );
            $[164] = onBack_2;
            $[165] = Mi;
            $[166] = onClose;
            $[167] = onStop;
            $[168] = ns;
            $[169] = Gp;
            $[170] = yl;
          } else yl = $[170];
          return yl;
        }
        const Mi = `agent-${ns.id}`;
        let onKillAgent;
        if ($[171] !== Gs || $[172] !== ns.id) {
          onKillAgent = () => void Gs(ns.id);
          $[171] = Gs;
          $[172] = ns.id;
          $[173] = onKillAgent;
        } else onKillAgent = $[173];
        const killAllAgentsShortcut = Fg ? killAgentsShortcut : undefined;
        let yl;
        if (
          $[174] !== onBack_2 ||
          $[175] !== onDone ||
          $[176] !== Mi ||
          $[177] !== onKillAgent ||
          $[178] !== killAllAgentsShortcut ||
          $[179] !== ns ||
          $[180] !== Gp
        ) {
          yl = jsxProd_default(
            AsyncAgentDetailDialog,
            {
              agent: ns,
              onDone,
              onKillAgent,
              onForeground: Gp,
              onBack: onBack_2,
              killAllAgentsShortcut,
            },
            Mi,
          );
          $[174] = onBack_2;
          $[175] = onDone;
          $[176] = Mi;
          $[177] = onKillAgent;
          $[178] = killAllAgentsShortcut;
          $[179] = ns;
          $[180] = Gp;
          $[181] = yl;
        } else yl = $[181];
        return yl;
      }
      case "remote_agent": {
        let ba;
        if (
          $[182] !== wp ||
          $[183] !== It ||
          $[184] !== setAppState ||
          $[185] !== storageV5 ||
          $[186] !== setAppState_2 ||
          $[187] !== ns.id ||
          $[188] !== ns.isRemoteReview ||
          $[189] !== ns.isUltraplan ||
          $[190] !== ns.sessionId ||
          $[191] !== ns.status
        ) {
          ba =
            ns.status !== "running"
              ? undefined
              : ns.isUltraplan
                ? () => void stopUltraplan(ns.id, ns.sessionId, setAppState_2, setAppState, It, storageV5)
                : ns.isRemoteReview
                  ? () =>
                      void stopUltrareviewTask(
                        ns.id,
                        "task_detail",
                        setAppState_2,
                        setAppState,
                        It,
                        storageV5,
                      )
                  : () => void wp(ns.id);
          $[182] = wp;
          $[183] = It;
          $[184] = setAppState;
          $[185] = storageV5;
          $[186] = setAppState_2;
          $[187] = ns.id;
          $[188] = ns.isRemoteReview;
          $[189] = ns.isUltraplan;
          $[190] = ns.sessionId;
          $[191] = ns.status;
          $[192] = ba;
        } else ba = $[192];
        let Dc = ba;
        if (shellDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const Mi = `session-${ns.id}`;
          let onClose;
          if ($[193] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[193] = onDone;
            $[194] = onClose;
          } else onClose = $[194];
          let Qa;
          if ($[195] !== onBack_2 || $[196] !== Dc || $[197] !== Mi || $[198] !== onClose || $[199] !== ns) {
            Qa = jsxProd_default(
              shellDetailGates,
              {
                session: ns,
                onClose,
                onBack: onBack_2,
                onStop: Dc,
              },
              Mi,
            );
            $[195] = onBack_2;
            $[196] = Dc;
            $[197] = Mi;
            $[198] = onClose;
            $[199] = ns;
            $[200] = Qa;
          } else Qa = $[200];
          return Qa;
        }
        const Mi = `session-${ns.id}`;
        let Ti;
        if (
          $[201] !== commands ||
          $[202] !== onBack_2 ||
          $[203] !== onDone ||
          $[204] !== Dc ||
          $[205] !== Mi ||
          $[206] !== ns ||
          $[207] !== tools ||
          $[208] !== verbose
        ) {
          Ti = jsxProd_default(
            RemoteSessionDetailDialog,
            {
              session: ns,
              onDone,
              tools,
              commands,
              verbose,
              onBack: onBack_2,
              onKill: Dc,
            },
            Mi,
          );
          $[201] = commands;
          $[202] = onBack_2;
          $[203] = onDone;
          $[204] = Dc;
          $[205] = Mi;
          $[206] = ns;
          $[207] = tools;
          $[208] = verbose;
          $[209] = Ti;
        } else Ti = $[209];
        return Ti;
      }
      case "in_process_teammate": {
        let ba;
        if ($[210] !== onDone || $[211] !== setAppState || $[212] !== ns.id || $[213] !== ns.status) {
          ba =
            ns.status === "running"
              ? () => {
                  enterTeammateView(ns.id, setAppState);
                  onDone("Viewing teammate", {
                    display: "system",
                  });
                }
              : undefined;
          $[210] = onDone;
          $[211] = setAppState;
          $[212] = ns.id;
          $[213] = ns.status;
          $[214] = ba;
        } else ba = $[214];
        let Bh = ba;
        if (subagentHistoryDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const Mi = `teammate-${ns.id}`;
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
          if ($[217] !== xl || $[218] !== ns.id) {
            onStop = () => void xl(ns.id).catch(logErrorWrapper3);
            $[217] = xl;
            $[218] = ns.id;
            $[219] = onStop;
          } else onStop = $[219];
          let yl;
          if (
            $[220] !== onBack_2 ||
            $[221] !== Mi ||
            $[222] !== onClose ||
            $[223] !== onStop ||
            $[224] !== ns ||
            $[225] !== Bh
          ) {
            yl = jsxProd_default(
              subagentHistoryDetailGates,
              {
                teammate: ns,
                onClose,
                onBack: onBack_2,
                onStop,
                onOpenTranscript: Bh,
              },
              Mi,
            );
            $[220] = onBack_2;
            $[221] = Mi;
            $[222] = onClose;
            $[223] = onStop;
            $[224] = ns;
            $[225] = Bh;
            $[226] = yl;
          } else yl = $[226];
          return yl;
        }
        const Mi = `teammate-${ns.id}`;
        let onKill;
        if ($[227] !== xl || $[228] !== ns.id || $[229] !== ns.status) {
          onKill = ns.status === "running" ? () => void xl(ns.id) : undefined;
          $[227] = xl;
          $[228] = ns.id;
          $[229] = ns.status;
          $[230] = onKill;
        } else onKill = $[230];
        let Qa;
        if (
          $[231] !== onBack_2 ||
          $[232] !== onDone ||
          $[233] !== Mi ||
          $[234] !== onKill ||
          $[235] !== ns ||
          $[236] !== Bh
        ) {
          Qa = jsxProd_default(
            InProcessTeammateDetailDialog,
            {
              teammate: ns,
              onDone,
              onKill,
              onBack: onBack_2,
              onForeground: Bh,
            },
            Mi,
          );
          $[231] = onBack_2;
          $[232] = onDone;
          $[233] = Mi;
          $[234] = onKill;
          $[235] = ns;
          $[236] = Bh;
          $[237] = Qa;
        } else Qa = $[237];
        return Qa;
      }
      case "local_workflow": {
        let ba;
        if ($[238] !== setAppState_2 || $[239] !== ns.id || $[240] !== ns.status) {
          ba =
            ns.status === "running"
              ? {
                  onKill: () => killWorkflowTask(ns.id, setAppState_2, "user"),
                  onPause: () => pauseWorkflowTask(ns.id, setAppState_2),
                  onSkipAgent: (Hh) => skipWorkflowAgent(ns.id, Hh, setAppState_2),
                  onRetryAgent: (exitState) => retryWorkflowAgent(ns.id, exitState, setAppState_2),
                }
              : undefined;
          $[238] = setAppState_2;
          $[239] = ns.id;
          $[240] = ns.status;
          $[241] = ba;
        } else ba = $[241];
        let vu = ba;
        if (dreamDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const Mi = `workflow-${ns.id}`;
          let onClose;
          if ($[242] !== onDone) {
            onClose = () =>
              onDone("Background dialog dismissed", {
                display: "skip",
              });
            $[242] = onDone;
            $[243] = onClose;
          } else onClose = $[243];
          const onStop = vu?.onKill;
          const onPause = vu?.onPause;
          const onSkipAgent = vu?.onSkipAgent;
          const onRetryAgent = vu?.onRetryAgent;
          let uy;
          if (
            $[244] !== onBack_2 ||
            $[245] !== onDone ||
            $[246] !== promptVisibleBelow_2 ||
            $[247] !== Mi ||
            $[248] !== onClose ||
            $[249] !== onStop ||
            $[250] !== onPause ||
            $[251] !== onSkipAgent ||
            $[252] !== onRetryAgent ||
            $[253] !== ns
          ) {
            uy = jsxProd_default(
              dreamDetailGates,
              {
                workflow: ns,
                onClose,
                onBack: onBack_2,
                onSaved: onDone,
                onStop,
                onPause,
                onSkipAgent,
                onRetryAgent,
                promptVisibleBelow: promptVisibleBelow_2,
              },
              Mi,
            );
            $[244] = onBack_2;
            $[245] = onDone;
            $[246] = promptVisibleBelow_2;
            $[247] = Mi;
            $[248] = onClose;
            $[249] = onStop;
            $[250] = onPause;
            $[251] = onSkipAgent;
            $[252] = onRetryAgent;
            $[253] = ns;
            $[254] = uy;
          } else uy = $[254];
          return uy;
        }
        const Mi = `workflow-${ns.id}`;
        const onKill = vu?.onKill;
        const onPause = vu?.onPause;
        const onSkipAgent = vu?.onSkipAgent;
        const onRetryAgent = vu?.onRetryAgent;
        let Uc;
        if (
          $[255] !== onBack_2 ||
          $[256] !== onDone ||
          $[257] !== promptVisibleBelow_2 ||
          $[258] !== Mi ||
          $[259] !== onKill ||
          $[260] !== onPause ||
          $[261] !== onSkipAgent ||
          $[262] !== onRetryAgent ||
          $[263] !== ns
        ) {
          Uc = jsxProd_default(
            WorkflowDetailDialog,
            {
              workflow: ns,
              onDone,
              promptVisibleBelow: promptVisibleBelow_2,
              onKill,
              onPause,
              onSkipAgent,
              onRetryAgent,
              onBack: onBack_2,
            },
            Mi,
          );
          $[255] = onBack_2;
          $[256] = onDone;
          $[257] = promptVisibleBelow_2;
          $[258] = Mi;
          $[259] = onKill;
          $[260] = onPause;
          $[261] = onSkipAgent;
          $[262] = onRetryAgent;
          $[263] = ns;
          $[264] = Uc;
        } else Uc = $[264];
        return Uc;
      }
      case "mcp_task": {
        if (!McpTaskDetailDialog) {
          return null;
        }
        if (mcpTaskDetailFeatureGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const ba = `mcp-task-${ns.id}`;
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
          if ($[267] !== Iu || $[268] !== ns.id) {
            onStop = () => {
              if (kill) Iu(ns.id, kill);
            };
            $[267] = Iu;
            $[268] = ns.id;
            $[269] = onStop;
          } else onStop = $[269];
          let Qa;
          if (
            $[270] !== onBack_2 ||
            $[271] !== ba ||
            $[272] !== onClose ||
            $[273] !== onStop ||
            $[274] !== ns
          ) {
            Qa = jsxProd_default(
              mcpTaskDetailFeatureGates,
              {
                task: ns,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              ba,
            );
            $[270] = onBack_2;
            $[271] = ba;
            $[272] = onClose;
            $[273] = onStop;
            $[274] = ns;
            $[275] = Qa;
          } else Qa = $[275];
          return Qa;
        }
        const ba = `mcp-task-${ns.id}`;
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
        if ($[278] !== Iu || $[279] !== ns.id || $[280] !== ns.status) {
          onKill = ns.status === "running" && kill ? () => void Iu(ns.id, kill) : undefined;
          $[278] = Iu;
          $[279] = ns.id;
          $[280] = ns.status;
          $[281] = onKill;
        } else onKill = $[281];
        let Qa;
        if (
          $[282] !== onBack_2 ||
          $[283] !== ba ||
          $[284] !== onDone_2 ||
          $[285] !== onKill ||
          $[286] !== ns
        ) {
          Qa = jsxProd_default(
            McpTaskDetailDialog,
            {
              task: ns,
              onDone: onDone_2,
              onKill,
              onBack: onBack_2,
            },
            ba,
          );
          $[282] = onBack_2;
          $[283] = ba;
          $[284] = onDone_2;
          $[285] = onKill;
          $[286] = ns;
          $[287] = Qa;
        } else Qa = $[287];
        return Qa;
      }
      case "monitor_mcp": {
        if (!mcpTaskDetailDialogModule) {
          return null;
        }
        if (monitorMcpDetailFeatureGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const ba = `monitor-mcp-${ns.id}`;
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
          if ($[290] !== setAppState_2 || $[291] !== ns.id) {
            onStop = () => killMonitorMcp?.(ns.id, setAppState_2);
            $[290] = setAppState_2;
            $[291] = ns.id;
            $[292] = onStop;
          } else onStop = $[292];
          let Qa;
          if (
            $[293] !== onBack_2 ||
            $[294] !== ba ||
            $[295] !== onClose ||
            $[296] !== onStop ||
            $[297] !== ns
          ) {
            Qa = jsxProd_default(
              monitorMcpDetailFeatureGates,
              {
                monitor: ns,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              ba,
            );
            $[293] = onBack_2;
            $[294] = ba;
            $[295] = onClose;
            $[296] = onStop;
            $[297] = ns;
            $[298] = Qa;
          } else Qa = $[298];
          return Qa;
        }
        const ba = `monitor-mcp-${ns.id}`;
        let onKill;
        if ($[299] !== setAppState_2 || $[300] !== ns.id || $[301] !== ns.status) {
          onKill =
            ns.status === "running" && killMonitorMcp
              ? () => killMonitorMcp(ns.id, setAppState_2)
              : undefined;
          $[299] = setAppState_2;
          $[300] = ns.id;
          $[301] = ns.status;
          $[302] = onKill;
        } else onKill = $[302];
        let Ti;
        if ($[303] !== onBack_2 || $[304] !== ba || $[305] !== onKill || $[306] !== ns) {
          Ti = jsxProd_default(
            mcpTaskDetailDialogModule,
            {
              task: ns,
              onKill,
              onBack: onBack_2,
            },
            ba,
          );
          $[303] = onBack_2;
          $[304] = ba;
          $[305] = onKill;
          $[306] = ns;
          $[307] = Ti;
        } else Ti = $[307];
        return Ti;
      }
      case "dream": {
        if (workflowDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const ba = `dream-${ns.id}`;
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
          if ($[310] !== js || $[311] !== ns.id) {
            onStop = () => void js(ns.id).catch(logErrorWrapper4);
            $[310] = js;
            $[311] = ns.id;
            $[312] = onStop;
          } else onStop = $[312];
          let Qa;
          if (
            $[313] !== onBack_2 ||
            $[314] !== ba ||
            $[315] !== onClose ||
            $[316] !== onStop ||
            $[317] !== ns
          ) {
            Qa = jsxProd_default(
              workflowDetailGates,
              {
                task: ns,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              ba,
            );
            $[313] = onBack_2;
            $[314] = ba;
            $[315] = onClose;
            $[316] = onStop;
            $[317] = ns;
            $[318] = Qa;
          } else Qa = $[318];
          return Qa;
        }
        const ba = `dream-${ns.id}`;
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
        if ($[321] !== js || $[322] !== ns.id || $[323] !== ns.status) {
          onKill = ns.status === "running" ? () => void js(ns.id) : undefined;
          $[321] = js;
          $[322] = ns.id;
          $[323] = ns.status;
          $[324] = onKill;
        } else onKill = $[324];
        let Qa;
        if (
          $[325] !== onBack_2 ||
          $[326] !== ba ||
          $[327] !== onDone_2 ||
          $[328] !== onKill ||
          $[329] !== ns
        ) {
          Qa = jsxProd_default(
            DreamDetailDialog,
            {
              task: ns,
              onDone: onDone_2,
              onBack: onBack_2,
              onKill,
            },
            ba,
          );
          $[325] = onBack_2;
          $[326] = ba;
          $[327] = onDone_2;
          $[328] = onKill;
          $[329] = ns;
          $[330] = Qa;
        } else Qa = $[330];
        return Qa;
      }
      case "auto_mode_scan": {
        if (remoteAgentDetailGates !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const ba = `auto-mode-scan-${ns.id}`;
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
          if ($[333] !== ga || $[334] !== ns.id) {
            onStop = () => void ga(ns.id).catch(logErrorWrapper5);
            $[333] = ga;
            $[334] = ns.id;
            $[335] = onStop;
          } else onStop = $[335];
          let Qa;
          if (
            $[336] !== onBack_2 ||
            $[337] !== ba ||
            $[338] !== onClose ||
            $[339] !== onStop ||
            $[340] !== ns
          ) {
            Qa = jsxProd_default(
              remoteAgentDetailGates,
              {
                task: ns,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              ba,
            );
            $[336] = onBack_2;
            $[337] = ba;
            $[338] = onClose;
            $[339] = onStop;
            $[340] = ns;
            $[341] = Qa;
          } else Qa = $[341];
          return Qa;
        }
        const ba = `auto-mode-scan-${ns.id}`;
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
        if ($[344] !== ga || $[345] !== ns.id || $[346] !== ns.status) {
          onKill = ns.status === "running" ? () => void ga(ns.id) : undefined;
          $[344] = ga;
          $[345] = ns.id;
          $[346] = ns.status;
          $[347] = onKill;
        } else onKill = $[347];
        let Qa;
        if (
          $[348] !== onBack_2 ||
          $[349] !== ba ||
          $[350] !== onDone_2 ||
          $[351] !== onKill ||
          $[352] !== ns
        ) {
          Qa = jsxProd_default(
            TaskDetailDialog,
            {
              task: ns,
              onDone: onDone_2,
              onBack: onBack_2,
              onKill,
            },
            ba,
          );
          $[348] = onBack_2;
          $[349] = ba;
          $[350] = onDone_2;
          $[351] = onKill;
          $[352] = ns;
          $[353] = Qa;
        } else Qa = $[353];
        return Qa;
      }
      case "local_memory_import": {
        if (localMemoryDetailModule !== null && detailScreenGates?.isBackgroundDetailScreenEnabled()) {
          const ba = `local-memory-import-${ns.id}`;
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
          if ($[356] !== ol || $[357] !== ns.id) {
            onStop = () => void ol(ns.id).catch(logErrorWrapper6);
            $[356] = ol;
            $[357] = ns.id;
            $[358] = onStop;
          } else onStop = $[358];
          let Qa;
          if (
            $[359] !== onBack_2 ||
            $[360] !== ba ||
            $[361] !== onClose ||
            $[362] !== onStop ||
            $[363] !== ns
          ) {
            Qa = jsxProd_default(
              localMemoryDetailModule,
              {
                task: ns,
                onClose,
                onBack: onBack_2,
                onStop,
              },
              ba,
            );
            $[359] = onBack_2;
            $[360] = ba;
            $[361] = onClose;
            $[362] = onStop;
            $[363] = ns;
            $[364] = Qa;
          } else Qa = $[364];
          return Qa;
        }
        if (!localMemoryImportDetailGates) {
          return null;
        }
        const ba = `local-memory-import-${ns.id}`;
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
        if ($[367] !== ol || $[368] !== ns.id || $[369] !== ns.status) {
          onKill = ns.status === "running" ? () => void ol(ns.id) : undefined;
          $[367] = ol;
          $[368] = ns.id;
          $[369] = ns.status;
          $[370] = onKill;
        } else onKill = $[370];
        let Qa;
        if (
          $[371] !== onBack_2 ||
          $[372] !== ba ||
          $[373] !== onDone_2 ||
          $[374] !== onKill ||
          $[375] !== ns
        ) {
          Qa = jsxProd_default(
            localMemoryImportDetailGates,
            {
              task: ns,
              onDone: onDone_2,
              onBack: onBack_2,
              onKill,
            },
            ba,
          );
          $[371] = onBack_2;
          $[372] = ba;
          $[373] = onDone_2;
          $[374] = onKill;
          $[375] = ns;
          $[376] = Qa;
        } else Qa = $[376];
        return Qa;
      }
    }
  }
  let Wh = count(bashTasks, isTaskRunning_2);
  let my = count(remoteSessions, isTaskRunningOrPending) + count(agentTasks, isTaskRunning_3);
  let jh = count(teammateTasks, getDisplayName_2);
  let ba;
  if ($[377] !== my || $[378] !== Wh || $[379] !== jh) {
    ba = intersperse(
      [
        ...(jh > 0
          ? [
              jsxProd_default_2(
                Text,
                {
                  children: [jh, " ", jh !== 1 ? "agents" : "agent"],
                },
                "teammates",
              ),
            ]
          : []),
        ...(Wh > 0
          ? [
              jsxProd_default_2(
                Text,
                {
                  children: [Wh, " ", Wh !== 1 ? "active shells" : "active shell"],
                },
                "shells",
              ),
            ]
          : []),
        ...(my > 0
          ? [
              jsxProd_default_2(
                Text,
                {
                  children: [my, " ", my !== 1 ? "active agents" : "active agent"],
                },
                "agents",
              ),
            ]
          : []),
      ],
      renderSeparator,
    );
    $[377] = my;
    $[378] = Wh;
    $[379] = jh;
    $[380] = ba;
  } else ba = $[380];
  let children = ba;
  let Im = backgroundListV3Fallback ? TERSE_SHORTCUT_FORMAT : EMPTY_SHORTCUT_FORMAT;
  let Mi;
  if ($[381] !== Ka || $[382] !== Im || $[383] !== isScreenReaderEnabled) {
    Mi = isScreenReaderEnabled
      ? []
      : [
          jsxProd_default(
            KeyboardShortcutHint,
            {
              chord: ["up", "down"],
              action: "select",
              ...Im,
            },
            "upDown",
          ),
          ...(!Ka || canOpenTaskDetail(Ka)
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "enter",
                    action: "view",
                    ...Im,
                  },
                  "enter",
                ),
              ]
            : []),
          ...(Ka?.type === "self_managed_tasks" ||
          (Ka?.type === "subagent_history" && Ka.size !== 0 && Ka.size !== "unreadable")
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "enter",
                    action: "show",
                    ...Im,
                  },
                  "show",
                ),
              ]
            : []),
          ...(Ka && canForegroundTask(Ka)
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "f",
                    action: "foreground",
                    ...Im,
                  },
                  "foreground",
                ),
              ]
            : []),
          ...(Ka && canStopTask(Ka)
            ? [
                jsxProd_default(
                  KeyboardShortcutHint,
                  {
                    chord: "x",
                    action: "stop",
                    ...Im,
                  },
                  "kill",
                ),
              ]
            : []),
        ];
    $[381] = Ka;
    $[382] = Im;
    $[383] = isScreenReaderEnabled;
    $[384] = Mi;
  } else Mi = $[384];
  let Ti;
  if (
    $[385] !== Ka ||
    $[386] !== Fg ||
    $[387] !== backgroundListV3Fallback ||
    $[388] !== killAgentsShortcut
  ) {
    Ti =
      Ka?.type === "local_agent" && canStopTask(Ka) && Fg && killAgentsShortcut
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
    $[385] = Ka;
    $[386] = Fg;
    $[387] = backgroundListV3Fallback;
    $[388] = killAgentsShortcut;
    $[389] = Ti;
  } else Ti = $[389];
  const action = bo.mode === "actions" ? "go back" : "close";
  let yl;
  if ($[390] !== Im || $[391] !== action) {
    yl = jsxProd_default(
      KeyboardShortcutHint,
      {
        chord: "escape",
        action,
        ...Im,
      },
      "esc",
    );
    $[390] = Im;
    $[391] = action;
    $[392] = yl;
  } else yl = $[392];
  let dm;
  if ($[393] !== Mi || $[394] !== Ti || $[395] !== yl) {
    dm = [...Mi, ...Ti, yl];
    $[393] = Mi;
    $[394] = Ti;
    $[395] = yl;
    $[396] = dm;
  } else dm = $[396];
  let children_2 = dm;
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
  let uy;
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
    $[417] !== Wo ||
    $[418] !== heading ||
    $[419] !== teammateTasks ||
    $[420] !== teams ||
    $[421] !== workflowTasks
  ) {
    let Zb = [
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
          Wo &&
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
    let fy = (p_) =>
      p_.key === "agents" && teams.length > 0
        ? teams.flatMap((item_6) => {
            let [Zd, ig] = item_6;
            return [
              {
                kind: "heading",
                heading: `Team: ${collapseWhitespace(Zd)} (${ig.length + (found ? 1 : 0)})`,
                key: `${Zd}-team`,
              },
              ...(found
                ? [
                    {
                      kind: "row",
                      item: found,
                      key: `${found.id}-${Zd}`,
                    },
                  ]
                : []),
              ...ig.map(TeammateTaskGroups),
            ];
          })
        : p_.items.map(toListRow);
    let now = new Date(Date.now());
    let filtered = Zb.filter(hasRows);
    uy = filtered.flatMap((Qp, Br) => [
      ...(Br > 0 ? [jsxProd_default(merged.Heading, {}, `${Qp.key}-gap`)] : []),
      ...(Qp.heading
        ? [
            jsxProd_default(
              merged.Heading,
              {
                children: Qp.heading,
              },
              `${Qp.key}-heading`,
            ),
          ]
        : []),
      ...fy(Qp).map((item_7) => {
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
        let vl = item.type === "leader" ? null : BackgroundTask(item.task);
        return vl
          ? jsxProd_default(
              OrderedListWithItem.Item,
              {
                ...vl,
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
    $[417] = Wo;
    $[418] = heading;
    $[419] = teammateTasks;
    $[420] = teams;
    $[421] = workflowTasks;
    $[422] = uy;
  } else uy = $[422];
  let hl = uy;
  let Mf;
  if ($[423] !== backgroundListFallback || $[424] !== hl) {
    Mf =
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
        : hl;
    $[423] = backgroundListFallback;
    $[424] = hl;
    $[425] = Mf;
  } else Mf = $[425];
  let Ra = Mf;
  let BACKGROUND_LIST_LINES =
    backgroundListModules && backgroundListFallback ? backgroundListModules.BACKGROUND_LIST_LINES : undefined;
  let visibleCount = Sn === undefined ? undefined : Math.min(Ra.length, BACKGROUND_LIST_LINES ?? Sn);
  let zp;
  if (
    $[426] !== children_2 ||
    $[427] !== allSelectableItems ||
    $[428] !== Ho ||
    $[429] !== onRowKeyDown ||
    $[430] !== historyRow.length ||
    $[431] !== Ra ||
    $[432] !== Ws ||
    $[433] !== backgroundListFallback ||
    $[434] !== BACKGROUND_LIST_LINES ||
    $[435] !== onDone ||
    $[436] !== onFocus ||
    $[437] !== xc ||
    $[438] !== onSelect ||
    $[439] !== children ||
    $[440] !== columns ||
    $[441] !== bo.itemId ||
    $[442] !== bo.mode ||
    $[443] !== visibleCount
  ) {
    let Pc = bo.mode === "actions" ? allSelectableItems.find((item_9) => item_9.id === bo.itemId) : undefined;
    let Aa;
    if ($[445] !== Ho || $[446] !== Ws) {
      let rl;
      if ($[448] !== Ho) {
        rl = (item_10) => item_10.id === Ho.id;
        $[448] = Ho;
        $[449] = rl;
      } else rl = $[449];
      Aa = Ws.findIndex(rl);
      $[445] = Ho;
      $[446] = Ws;
      $[447] = Aa;
    } else Aa = $[447];
    let _a = Aa;
    let rl;
    if ($[450] !== onDone || $[451] !== bo.mode) {
      rl = () => {
        if (bo.mode === "actions") {
          Ao({
            mode: "list",
          });
          return;
        }
        onDone("Background dialog dismissed", {
          display: "skip",
        });
      };
      $[450] = onDone;
      $[451] = bo.mode;
      $[452] = rl;
    } else rl = $[452];
    let onCancel = rl;
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
    zp = jsxProd_default(Dialog, {
      title: "Background",
      subtitle,
      onCancel,
      color: backgroundListFallback ? "permission" : "background",
      inputGuide,
      children: Pc
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                wrap: "truncate-end",
                children: [
                  "Actions for",
                  " ",
                  truncateToWidth(Item(Pc), Math.max(1, columns - MAX_SUBAGENT_HISTORY_ROWS)),
                ],
              }),
              jsxProd_default(ModelSelector, {
                options: availableTaskActions(Pc).map(toActionOption),
                onChange: (item_11) => xc(item_11, Pc),
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
                  defaultFocusIndex: _a !== -1 ? _a : Math.min(Ho.index, Ws.length - 1),
                  visibleCount,
                  maxVisibleCount: BACKGROUND_LIST_LINES,
                  onFocus,
                  onSelect,
                  onRowKeyDown,
                  children: Ra,
                }),
            ],
          }),
    });
    $[426] = children_2;
    $[427] = allSelectableItems;
    $[428] = Ho;
    $[429] = onRowKeyDown;
    $[430] = historyRow.length;
    $[431] = Ra;
    $[432] = Ws;
    $[433] = backgroundListFallback;
    $[434] = BACKGROUND_LIST_LINES;
    $[435] = onDone;
    $[436] = onFocus;
    $[437] = xc;
    $[438] = onSelect;
    $[439] = children;
    $[440] = columns;
    $[441] = bo.itemId;
    $[442] = bo.mode;
    $[443] = visibleCount;
    $[444] = zp;
  } else zp = $[444];
  return zp;
}
//@ chunk-18hwfzwa.js:762915-762973 layout
var ACTION_LABELS = {
  view: "View",
  foreground: "Foreground",
  stop: "Stop",
};
//@ chunk-18hwfzwa.js:762973-763067 layout
function availableTaskActions(h) {
  return [
    ...(canOpenTaskDetail(h) ? ["view"] : []),
    ...(canForegroundTask(h) ? ["foreground"] : []),
    ...(canStopTask(h) ? ["stop"] : []),
  ];
}
//@ chunk-18hwfzwa.js:763067-763174 layout
function canOpenTaskDetail(h) {
  return (
    hasDetailDialog(h.type) ||
    (h.type === "recorded_agent" && h.row.entry.agentType !== undefined && !h.isRefused)
  );
}
//@ chunk-18hwfzwa.js:763174-763336 layout
function canForegroundTask(h) {
  return (
    (h.type === "in_process_teammate" && h.status === "running") ||
    (h.type === "local_agent" &&
      isPanelAgentTask(h.task) &&
      h.status !== "failed" &&
      h.status !== "killed" &&
      !getSelectableBackgroundTasks_2(h))
  );
}
//@ chunk-18hwfzwa.js:763336-763737 layout
/**
 * 任务是否可停止：处于运行中的各类后台任务（或活动中的本地代理）。
 */
function canStopTask(h) {
  if (h.type === "local_agent" && isWaitingOnChildren(h.task)) return true;
  return (
    h.status === "running" &&
    (h.type === "local_bash" ||
      h.type === "local_agent" ||
      h.type === "in_process_teammate" ||
      h.type === "local_workflow" ||
      h.type === "monitor_mcp" ||
      h.type === "monitor_ws" ||
      h.type === "mcp_task" ||
      h.type === "dream" ||
      h.type === "auto_mode_scan" ||
      h.type === "local_memory_import" ||
      h.type === "post_turn_memory" ||
      h.type === "remote_agent" ||
      false)
  );
}
//@ chunk-18hwfzwa.js:763737-763751 layout
var MAIN = "main";
//@ chunk-18hwfzwa.js:763751-763818 layout
function viewingLabel(h) {
  return h.label === MAIN ? "Viewing main" : "Viewing leader";
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
function getSelectableBackgroundTasks_2(h) {
  return h.type === "local_agent" && isParkedCompletedAgent(h.task);
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
