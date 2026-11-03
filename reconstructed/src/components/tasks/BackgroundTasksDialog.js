/**
 * components/tasks/BackgroundTasksDialog.tsx
 *
 * 后台任务对话框（↓ 打开）：列出 bash、子代理、队友、工作流、远程会话、monitor，查看详情、停止（ctrl+x ctrl+k）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/BackgroundTasksDialog.tsx
 * pieces: chunk-18hwfzwa.js (55)
 * attribution: placement 3, sole-consumer 19, affinity 7, file-local 2, layout 20, fingerprint 3, callgraph-fingerprint 1
 */
import { RemoteAgentTask } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { j, y, P, R, Se, Oo } from "../../../vendor/react/cjs/react.production.js";
import { isSubagentHistoryEnabled } from "../messages/UserPromptMessage.js";
import { processBatched } from "../../services/mcp/client.js";
import { getSessionSubagentsDir } from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";
import { repeatString, Dr } from "../../utils/stringUtils.js";
import { _S } from "../../../vendor/chart.js/dist/chart.js";
import { formatRelativeTimeAgo, truncateToWidth } from "../../utils/format.js";
import { vc } from "../../utils/taskDescription.js";
import { SNe, isPanelAgentTask, isCompletedBackgroundAgent } from "../../tasks/taskKinds.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { isCoordinatorPanelActive, Xre } from "../../utils/transcriptDiagnostics.js";
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
import { $V } from "../design-system/ScrollColumn.js";
import { ContextSlotA } from "../../context/contextSlots.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { isMainSessionTask } from "../../tasks/LocalMainSessionTask.js";
import { Y6t } from "../memory/MemoryFileSelector.js";
import {
  J6t,
  X6t,
  Z6t,
  e4t,
  logSubagentHistoryLaunchError,
  o4t,
  n4t,
  r4t,
  s4t,
  i4t,
} from "./_new/logSubagentHistoryLaunchError.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { z_e } from "../../utils/shell/processCpuTime.js";
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
import {
  logErrorWrapper,
  logErrorWrapper2,
  logErrorWrapper3,
  logErrorWrapper4,
  logErrorWrapper5,
  logErrorWrapper6,
  isTaskRunning_2,
} from "./_new/isTaskRunning_2.js";
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

/**
 * 停止 ultrareview 远程任务并通知
 */
//@ chunk-18hwfzwa.js:686154-686687 placement
async function stopUltrareviewTask(h, x, D, L, ee, ke) {
  (await RemoteAgentTask.kill(h, D, L, void 0, ke),
    logEvent("tengu_review_remote_stopped", { source: fromEnum(x) }),
    ee.enqueuePendingNotification({
      value:
        "Ultrareview stopped. Run /ultrareview to start a new review, which uses one of your free ultrareviews or bills as usage credits.",
      mode: "task-notification",
      agentId: mainAgentId(),
    }),
    ee.enqueuePendingNotification({
      value:
        "The user stopped the ultrareview session above. Do not respond to the stop notification \u2014 wait for their next message.",
      mode: "task-notification",
      agentId: mainAgentId(),
      isMeta: !0,
    }));
}
//@ chunk-18hwfzwa.js:686687-686691 placement
j();
//@ chunk-18hwfzwa.js:726327-726331 sole-consumer
j();
//@ chunk-18hwfzwa.js:726331-726341 sole-consumer
var NXt = 6;
//@ chunk-18hwfzwa.js:726341-726625 sole-consumer
function useSubagentHistory(h, x) {
  let [D, L] = y(() => ({ status: isSubagentHistoryEnabled() ? "loading" : "off" })),
    ee = D.status === "off";
  return (
    P(() => {
      if (ee) return;
      let ke = !0;
      return (
        processBatched(getSessionSubagentsDir(), h)
          .then((Re) => ({ status: "loaded", nodes: Re }))
          .catch((Re) => (logError(Re), { status: "failed" }))
          .then((Re) => {
            if (ke) L(Re);
          })
          .catch(logError),
        () => {
          ke = !1;
        }
      );
    }, [h, ee, x]),
    D
  );
}
//@ chunk-18hwfzwa.js:726625-726845 sole-consumer
function flattenSubagentTree(h, x) {
  let D = [],
    L = expandHiddenSubagents(
      h.filter((ee) => ee.entry.group === ""),
      0,
      void 0,
      x,
    );
  for (let ee = L.pop(); ee !== void 0; ee = L.pop()) {
    D.push(ee.row);
    for (let ke of expandHiddenSubagents(ee.children, ee.row.depth + 1, ee.row.entry, x)) L.push(ke);
  }
  return D;
}
//@ chunk-18hwfzwa.js:726845-727068 sole-consumer
function describeSubagentRow(h, { now: now, isScreenReader: isScreenReader, isRefused: isRefused }) {
  let { entry: entry, parent: parent } = h;
  return {
    label: (isScreenReader ? "" : treePrefix(h)) + YW(entry),
    meta: [
      isRefused ? "cannot be opened" : "",
      entry.stoppedByUser ? "stopped" : "",
      FXt(entry),
      ...describeAgentTimes(entry, now),
      isScreenReader && parent ? `under ${YW(parent)}` : "",
    ],
  };
}
/**
 * 展开被过滤代理的子节点到同一层，生成带深度、是否末位与父项的行。
 */
//@ chunk-18hwfzwa.js:727068-727381 sole-consumer
function expandHiddenSubagents(h, x, D, L) {
  let ee = [],
    toReversed = h.toReversed();
  for (let Re = toReversed.pop(); Re !== void 0; Re = toReversed.pop())
    if (L(Re.entry.agentId)) for (let Be of Re.children.toReversed()) toReversed.push(Be);
    else ee.push(Re);
  return ee
    .map((Re, Be) => ({
      row: { entry: Re.entry, depth: x, isLastSibling: Be === ee.length - 1, parent: D },
      children: Re.children,
    }))
    .reverse();
}
//@ chunk-18hwfzwa.js:727381-727508 sole-consumer
function treePrefix({ depth: depth, isLastSibling: isLastSibling }) {
  if (depth === 0) return "";
  return repeatString(`${_S.pipe} `, Math.min(depth, NXt) - 1) + `${isLastSibling ? _S.last : _S.branch} `;
}
//@ chunk-18hwfzwa.js:727508-727560 sole-consumer
function YW(h) {
  return Npe(h.description) || h.agentId;
}
//@ chunk-18hwfzwa.js:727560-727627 sole-consumer
function FXt(h) {
  return Npe(h.name && `@${h.name}`) || Npe(h.agentType);
}
//@ chunk-18hwfzwa.js:727627-727819 sole-consumer
function describeAgentTimes({ startedAt: startedAt, lastActivityAt: lastActivityAt }, D) {
  let L = startedAt === void 0 ? "" : formatRelativeTimeAgo(new Date(startedAt), { now: D }),
    ee = lastActivityAt === void 0 ? "" : formatRelativeTimeAgo(new Date(lastActivityAt), { now: D });
  return [L && `started ${L}`, ee !== L && ee ? `last active ${ee}` : ""];
}
//@ chunk-18hwfzwa.js:727819-727852 sole-consumer
function Npe(h) {
  return vc(h) ?? "";
}
//@ chunk-18hwfzwa.js:727852-727885 sole-consumer
function selectTasks(g_) {
  return g_.tasks;
}
//@ chunk-18hwfzwa.js:727885-727929 sole-consumer
function F6t(fc) {
  return isTaskShownInDialog(fc, !1) && !SNe(fc);
}
//@ chunk-18hwfzwa.js:727929-727959 sole-consumer
function B6t() {
  return new Set();
}
//@ chunk-18hwfzwa.js:727959-728006 sole-consumer
function H6t(Hx) {
  return `${Hx.id},${Hx.status}`;
}
//@ chunk-18hwfzwa.js:728006-728036 sole-consumer
function U6t(gy) {
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
  let S_ = "task" in tw ? tw.task.startTime : 0;
  return ("task" in Ux ? Ux.task.startTime : 0) - S_;
}
//@ chunk-18hwfzwa.js:728260-728373 file-local
function taskIdAliases(i_0) {
  return i_0.type === "in_process_teammate"
    ? [i_0.id, i_0.task.identity.resumableAgentId ?? i_0.id]
    : [i_0.id];
}
//@ chunk-18hwfzwa.js:728373-728420 layout
function q6t(qx) {
  return qx.type === "local_bash";
}
//@ chunk-18hwfzwa.js:728420-728469 layout
function $6t($x) {
  return $x.type === "remote_agent";
}
//@ chunk-18hwfzwa.js:728469-728517 fingerprint = getSelectableBackgroundTasks (1)
function getSelectableBackgroundTasks(C0) {
  return C0.type === "local_agent";
}
//@ chunk-18hwfzwa.js:728517-728548 affinity
function K6t(Yp) {
  return !getSelectableBackgroundTasks_2(Yp);
}
//@ chunk-18hwfzwa.js:728548-728599 affinity
function G6t(Vx) {
  return Vx.type === "local_workflow";
}
//@ chunk-18hwfzwa.js:728599-728671 affinity
function Q6t(RE) {
  return RE.type === "monitor_mcp" || RE.type === "monitor_ws";
}
//@ chunk-18hwfzwa.js:728671-728716 affinity
function z6t(qg) {
  return qg.type === "mcp_task";
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
function w4t(Jp) {
  return e(Text, { children: " \xB7 " }, `separator-${Jp}`);
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
  return { kind: "row", item: t0, key: t0.id };
}
//@ chunk-18hwfzwa.js:729852-729906 layout
function _4t(FS) {
  return { kind: "row", item: FS, key: FS.id };
}
//@ chunk-18hwfzwa.js:729906-729948 layout
function T4t(lw) {
  return lw.items.length > 0;
}
//@ chunk-18hwfzwa.js:729948-729996 layout
function R4t(WS) {
  return { label: a2e[WS], value: WS };
}
//@ chunk-18hwfzwa.js:729996-730171 layout
var MAX_SUBAGENT_HISTORY_ROWS = 16,
  LEADER_GROUP_KEY = "__leader__",
  SYSTEM_TASKS_LABEL = "System tasks",
  SELF_MANAGED_TASKS_KEY = "__self_managed_tasks__",
  EARLIER_IN_SESSION_LABEL = "Earlier in this session",
  SUBAGENT_HISTORY_KEY = "__subagent_history__",
  Zze = { terse: !0, format: { style: "compact" } },
  eYe = {};
//@ chunk-18hwfzwa.js:730171-730387 layout
function hasDetailDialog(h) {
  if (h === "mcp_task") return McpTaskDetailDialog !== null;
  if (h === "local_memory_import") return cj !== null;
  return (
    h !== "monitor_ws" &&
    h !== "post_turn_memory" &&
    h !== "self_managed_tasks" &&
    h !== "subagent_history" &&
    h !== "recorded_agent"
  );
}
//@ chunk-18hwfzwa.js:730387-730883 layout
var WorkflowDetailDialog = require("./chunk-vhwr4tjc.js").WorkflowDetailDialog,
  {
    killWorkflowTask: killWorkflowTask,
    pauseWorkflowTask: pauseWorkflowTask,
    skipWorkflowAgent: skipWorkflowAgent,
    retryWorkflowAgent: retryWorkflowAgent,
  } = require("./chunk-jnjk6c09.js"),
  HXt = null,
  Lw = HXt?.killMonitorMcp ?? null,
  N5 = null,
  kill = require("./chunk-1wp0vvkk.js").MCP_TASK.kill,
  McpTaskDetailDialog = require("./chunk-qd18c590.js").McpTaskDetailDialog,
  wu = null,
  lj = null,
  dj = null,
  F5 = null,
  B5 = null,
  H5 = null,
  U5 = null,
  W5 = null,
  j5 = null,
  q5 = null,
  cj = null,
  uj = null,
  Uw = null,
  iYe = Uw?.useBackgroundListV3 ?? I6t,
  aYe = Uw?.useBackgroundList ?? E6t;
//@ chunk-18hwfzwa.js:730883-731180 layout
function hasBackgroundDetailScreen(h) {
  return (
    wu?.isBackgroundDetailScreenEnabled() === !0 &&
    (h.type === "local_bash" ||
      h.type === "remote_agent" ||
      h.type === "local_workflow" ||
      h.type === "dream" ||
      h.type === "auto_mode_scan" ||
      (h.type === "monitor_mcp" && lj !== null) ||
      (h.type === "local_memory_import" && uj !== null) ||
      (h.type === "mcp_task" && dj !== null))
  );
}
/**
 * 判断任务是否列入后台任务对话框（协调面板、失败/被杀可见、已完成后台代理、仍在运行等规则）。
 */
//@ chunk-18hwfzwa.js:731180-731600 layout
function isTaskShownInDialog(h, x) {
  if (isCoordinatorPanelActive() && isBackgroundTask(h)) return !0;
  let D =
    x &&
    (h.status === "failed" || h.status === "killed") &&
    (h.type === "local_agent" ||
      h.type === "in_process_teammate" ||
      h.type === "local_workflow" ||
      h.type === "local_bash" ||
      h.type === "mcp_task");
  if (h.type === "local_agent" && (h.status === "completed" || D))
    return (
      isPanelAgentTask(h) &&
      h.isBackgrounded &&
      !isObserverAgentTask(h) &&
      h.evictAfter !== 0 &&
      (D || [...(h.keepaliveReasons ?? [])].every((L) => L === FLAG_IDLE_WINDOW))
    );
  if (D) return !TaskOutputResultDisplay(h);
  return waitForTaskCompletion(h);
}
/**
 * 后台任务对话框：把各类任务（local_bash、local_agent、in_process_teammate、local_workflow、remote_agent、monitor_mcp、dream）转成列表项，list/detail 两级视图，支持停止所有 agent（chat:killAgents）、进入队友视图、查看输出。
 */
//@ chunk-18hwfzwa.js:731600-762915 fingerprint = BackgroundTasksDialog (0.512)
function BackgroundTasksDialog(h) {
  let $ = w(458),
    {
      onDone: onDone,
      storageV5: storageV5,
      session: session,
      messageQueue: messageQueue,
      tools: tools,
      commands: commands,
      verbose: verbose,
      initialDetailTaskId: initialDetailTaskId,
      onBack: onBack,
      promptVisibleBelow: promptVisibleBelow,
    } = h,
    Xe = promptVisibleBelow === void 0 ? !1 : promptVisibleBelow,
    tasks = useAppState(selectTasks),
    kt = useSetAppState(),
    setAppState = useSetVoiceState(),
    It = messageQueue,
    killAgentsShortcut = useShortcutDisplay_2("chat:killAgents", "Chat", "ctrl+x ctrl+k"),
    Et = tasks,
    Dt = Xre(),
    oo;
  if ($[0] !== Dt) ((oo = (Xt) => Dt && Xt.viewingAgentTaskId !== void 0), ($[0] = Dt), ($[1] = oo));
  else oo = $[1];
  let skippedListOnMount = useAppState(oo),
    so = iYe(),
    po;
  if ($[2] !== initialDetailTaskId || $[3] !== so || $[4] !== skippedListOnMount || $[5] !== Et)
    ((po = () => {
      if (initialDetailTaskId) {
        return { mode: "detail", itemId: initialDetailTaskId };
      }
      if (so) {
        return { mode: "list" };
      }
      let filtered = Object.values(Et ?? {}).filter(F6t);
      let co = filtered.length === 1 ? filtered[0] : void 0;
      if (
        co &&
        !skippedListOnMount &&
        hasDetailDialog(co.type) &&
        !(co.type === "local_agent" && isParkedCompletedAgent(co))
      ) {
        return { mode: "detail", itemId: co.id };
      }
      return { mode: "list" };
    }),
      ($[2] = initialDetailTaskId),
      ($[3] = so),
      ($[4] = skippedListOnMount),
      ($[5] = Et),
      ($[6] = po));
  else po = $[6];
  let [bo, Ao] = y(po),
    Bo = R(bo.mode === "detail"),
    Ro;
  if ($[7] === MEMO_CACHE_SENTINEL) ((Ro = { index: 0 }), ($[7] = Ro));
  else Ro = $[7];
  let [Ho, Io] = y(Ro),
    [Wo, mn] = y(!1),
    [Cn, No] = y(!1),
    [vo, Yo] = y(B6t),
    kn;
  if ($[8] !== Et)
    ((kn = Object.values(Et ?? {})
      .filter(isLocalAgent)
      .map(H6t)),
      ($[8] = Et),
      ($[9] = kn));
  else kn = $[9];
  let allItems = useSubagentHistory(storageV5, `${Cn} ${kn.join()}`),
    bn = useIsScreenReaderEnabled(),
    Go = $V(),
    hn = Se(ContextSlotA),
    { rows: rows, columns: columns } = useTerminalSize(),
    Sn = Go === null && hn === null ? Math.max(7, Math.floor(rows / 2)) : void 0;
  useRegisterOverlay("background-tasks-dialog");
  let $n;
  if (
    $[10] !== so ||
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
    if ($[19] !== so) ((_o = (cn) => isTaskShownInDialog(cn, so)), ($[19] = so), ($[20] = _o));
    else _o = $[20];
    let backgroundTasks = values.filter(_o);
    let wn = new Set(backgroundTasks.filter(SNe).map(U6t));
    let allItems_0 = backgroundTasks.map(toListItem);
    let sorted = allItems_0.sort(compareTasksRunningFirst);
    let filtered = sorted.filter((Wn) => !wn.has(Wn.id));
    let filtered_2 = sorted.filter((Zn) => wn.has(Zn.id));
    let dr = filtered_2[0];
    let or =
      Wo || dr === void 0
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
            let ur = Et?.[Qn];
            return (
              pr.has(Qn) ||
              (ur !== void 0 && (ur.status === "running" || isBackgroundTask(ur) || isMainSessionTask(ur)))
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
                label: YW(Pr.entry),
                status: "completed",
                isRefused: vo.has(Pr.entry.agentId),
                row: isLocalAgent(ts)
                  ? {
                      ...Pr,
                      entry: {
                        ...Pr.entry,
                        stoppedByUser: ts.stoppedByUser === !0,
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
                      : void 0,
                firstAgentId: Ir[0]?.entry.agentId,
              },
            ];
    let bash = filtered.filter(q6t);
    let filtered_3 = filtered.filter($6t);
    let filtered_4 = filtered.filter(getSelectableBackgroundTasks);
    let filtered_5 = filtered_4.filter(K6t);
    let filtered_6 = filtered_4.filter(getSelectableBackgroundTasks_2);
    let filtered_7 = filtered.filter(G6t);
    let filtered_8 = filtered.filter(Q6t);
    let filtered_9 = filtered.filter(z6t);
    let filtered_10 = filtered.filter(Y6t);
    let remote = filtered.filter(J6t);
    let agent = filtered.filter(X6t);
    let workflows = filtered.filter(Z6t);
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
    let flat = [...is.values()].flat();
    let Oi =
      flat.length > 0 || skippedListOnMount
        ? [
            {
              id: LEADER_GROUP_KEY,
              type: "leader",
              label: flat.length > 0 ? `@${TEAM_LEAD}` : MAIN,
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
      teammateTasks: [...Oi, ...flat],
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
        ...flat,
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
    (($[10] = so),
      ($[11] = vo),
      ($[12] = Cn),
      ($[13] = skippedListOnMount),
      ($[14] = Wo),
      ($[15] = allItems.nodes),
      ($[16] = allItems.status),
      ($[17] = Et),
      ($[18] = $n));
  } else $n = $[18];
  let {
      bashTasks: bashTasks,
      remoteSessions: remoteSessions,
      agentTasks: agentTasks,
      completedAgentTasks: completedAgentTasks,
      teammateTasks: teammateTasks,
      teams: teams,
      listRows: listRows,
      workflowTasks: workflowTasks,
      mcpMonitors: mcpMonitors,
      mcpTasks: mcpTasks,
      dreamTasks: dreamTasks,
      autoModeScanTasks: autoModeScanTasks,
      memoryImportTasks: memoryImportTasks,
      memorySaveTasks: memorySaveTasks,
      selfManaged: selfManaged,
      historyRow: historyRow,
      allSelectableItems: allSelectableItems,
    } = $n,
    on;
  if ($[21] !== Wo) ((on = Wo ? [SELF_MANAGED_TASKS_KEY] : []), ($[21] = Wo), ($[22] = on));
  else on = $[22];
  let _o;
  if ($[23] !== Cn) ((_o = Cn ? [SUBAGENT_HISTORY_KEY] : []), ($[23] = Cn), ($[24] = _o));
  else _o = $[24];
  let La;
  if ($[25] !== on || $[26] !== _o) ((La = [...on, ..._o]), ($[25] = on), ($[26] = _o), ($[27] = La));
  else La = $[27];
  let Xa = aYe(allSelectableItems, La, bo.mode === "list"),
    dl;
  Vl: {
    if (!Xa) {
      dl = listRows;
      break Vl;
    }
    let Hd;
    if ($[28] !== allSelectableItems || $[29] !== Xa.rows) {
      let Ss = new Map(allSelectableItems.map(e4t));
      Hd = Xa.rows.flatMap((item_3) => Ss.get(item_3.id) ?? []);
      (($[28] = allSelectableItems), ($[29] = Xa.rows), ($[30] = Hd));
    } else Hd = $[30];
    dl = Hd;
  }
  let Ws = dl,
    za = R(!1),
    cl = R(void 0),
    Ol = R(null),
    Hd;
  if ($[31] !== Ws)
    ((Hd = (item_4) => {
      let pi = Ws[item_4]?.id;
      let qa = cl.current;
      let pd = Ol.current !== Ws;
      if (((cl.current = pi), (Ol.current = Ws), !pd)) za.current = !1;
      else if (qa !== void 0 && qa !== pi) za.current = !Ws.some((item_5) => item_5.id === qa);
      Io({ id: pi, index: item_4 });
    }),
      ($[31] = Ws),
      ($[32] = Hd));
  else Hd = $[32];
  let Yi = Hd,
    El,
    Ll;
  if ($[33] !== Ws)
    ((El = () => {
      if (Ol.current === null) {
        return;
      }
      Ol.current = Ws;
      let _c = cl.current;
      if (_c !== void 0 && !Ws.some((prev) => prev.id === _c)) za.current = !0;
    }),
      (Ll = [Ws]),
      ($[33] = Ws),
      ($[34] = El),
      ($[35] = Ll));
  else ((El = $[34]), (Ll = $[35]));
  P(El, Ll);
  let Vd;
  if ($[36] !== allSelectableItems || $[37] !== Ho || $[38] !== Ws)
    ((Vd = allSelectableItems.find((prev_0) => prev_0.id === Ho.id) ?? Ws[Ho.index] ?? null),
      ($[36] = allSelectableItems),
      ($[37] = Ho),
      ($[38] = Ws),
      ($[39] = Vd));
  else Vd = $[39];
  let Ka = Vd,
    pl;
  if ($[40] !== onDone || $[41] !== kt || $[42] !== storageV5 || $[43] !== Et) {
    pl = function pl(Gl) {
      if (Gl.type === "self_managed_tasks") ((cl.current = Gl.firstTaskId), mn(!0));
      else if (Gl.type === "subagent_history") {
        if (Gl.size === "unreadable") {
          logFeatureBad("subagent_history", "read_failed");
          return;
        }
        if (Gl.size === 0) {
          return;
        }
        (logFeatureOk("subagent_history"), (cl.current = Gl.firstAgentId ?? cl.current), No(!0));
      } else if (Gl.type === "recorded_agent") killShellTask(Gl.row.entry);
      else if (Gl.type === "leader") (exitTeammateView(kt), onDone(hJ(Gl), { display: "system" }));
      else if (getSelectableBackgroundTasks_2(Gl))
        (enterTeammateView(Gl.id, kt), onDone("Viewing agent", { display: "system" }));
      else if (hasDetailDialog(Gl.type)) Ao({ mode: "detail", itemId: Gl.id });
    };
    async function killShellTask(taskId) {
      let bd = Et?.[taskId.agentId];
      if (
        !(bd === void 0
          ? await restoreAgentTaskFromTranscript(taskId, kt, storageV5).catch(logSubagentHistoryLaunchError)
          : isPanelAgentTask(bd))
      ) {
        (logFeatureBad("subagent_history_view", "not_viewable"), Yo((Od) => new Set(Od).add(taskId.agentId)));
        return;
      }
      (logFeatureOk("subagent_history_view"),
        enterTeammateView(taskId.agentId, kt),
        onDone("Viewing agent", { display: "system" }));
    }
    (($[40] = onDone), ($[41] = kt), ($[42] = storageV5), ($[43] = Et), ($[44] = pl));
  } else pl = $[44];
  let pc;
  if ($[45] !== session || $[46] !== kt || $[47] !== storageV5 || $[48] !== setAppState)
    ((pc = function ec(taskId_0) {
      if (!z_e()) {
        return LocalShellTask.kill(taskId_0, setAppState, kt, "user", storageV5);
      }
      return stopTaskByUser(taskId_0, {
        taskRegistry: setAppState,
        setAppState: kt,
        session: session,
        source: "user",
        storageV5: storageV5,
      }).catch(o4t);
    }),
      ($[45] = session),
      ($[46] = kt),
      ($[47] = storageV5),
      ($[48] = setAppState),
      ($[49] = pc));
  else pc = $[49];
  let ec = pc,
    qu;
  if ($[50] !== session || $[51] !== kt || $[52] !== storageV5 || $[53] !== setAppState)
    ((qu = function Iu(Ku, iu) {
      if (!z_e()) {
        return iu(Ku, setAppState, kt, void 0, storageV5).catch(n4t);
      }
      return stopTaskByUser(Ku, {
        taskRegistry: setAppState,
        setAppState: kt,
        session: session,
        source: "user",
        storageV5: storageV5,
      }).catch(r4t);
    }),
      ($[50] = session),
      ($[51] = kt),
      ($[52] = storageV5),
      ($[53] = setAppState),
      ($[54] = qu));
  else qu = $[54];
  let Iu = qu,
    Am;
  if ($[55] !== session || $[56] !== kt || $[57] !== storageV5 || $[58] !== setAppState)
    ((Am = function Gs(taskId_1) {
      let nl = setAppState.get(taskId_1);
      if (isLocalAgent(nl) && (nl.status === "running" || hasCompletedWithFindings(nl)))
        markStoppedByUser(taskId_1, setAppState, storageV5);
      if (nl && isObserverAgentTask(nl)) {
        return stopTask_2(taskId_1, {
          taskRegistry: setAppState,
          setAppState: kt,
          session: session,
          source: "user",
          storageV5: storageV5,
        }).then(s4t, i4t);
      }
      let kill = LocalAgentTask.kill(taskId_1, setAppState, kt, "user", storageV5);
      if (isPanelAgentTask(nl))
        stopAllTasks(nl, setAppState, { session: session, source: "user", storageV5: storageV5 });
      return kill;
    }),
      ($[55] = session),
      ($[56] = kt),
      ($[57] = storageV5),
      ($[58] = setAppState),
      ($[59] = Am));
  else Am = $[59];
  let Gs = Am,
    ma;
  if ($[60] !== kt || $[61] !== storageV5 || $[62] !== setAppState)
    ((ma = function xl(taskId_2) {
      return InProcessTeammateTask.kill(taskId_2, setAppState, kt, void 0, storageV5);
    }),
      ($[60] = kt),
      ($[61] = storageV5),
      ($[62] = setAppState),
      ($[63] = ma));
  else ma = $[63];
  let xl = ma,
    Si;
  if ($[64] !== kt || $[65] !== storageV5 || $[66] !== setAppState)
    ((Si = function js(taskId_3) {
      return DreamTask.kill(taskId_3, setAppState, kt, void 0, storageV5);
    }),
      ($[64] = kt),
      ($[65] = storageV5),
      ($[66] = setAppState),
      ($[67] = Si));
  else Si = $[67];
  let js = Si,
    Ya;
  if ($[68] !== kt || $[69] !== storageV5 || $[70] !== setAppState)
    ((Ya = function ol(agentId) {
      return LocalMemoryImportTask.kill(agentId, setAppState, kt, void 0, storageV5);
    }),
      ($[68] = kt),
      ($[69] = storageV5),
      ($[70] = setAppState),
      ($[71] = Ya));
  else Ya = $[71];
  let ol = Ya,
    ed;
  if ($[72] !== kt || $[73] !== storageV5 || $[74] !== setAppState)
    ((ed = function ga(agentId_0) {
      return AutoModeScanTask.kill(agentId_0, setAppState, kt, void 0, storageV5);
    }),
      ($[72] = kt),
      ($[73] = storageV5),
      ($[74] = setAppState),
      ($[75] = ed));
  else ed = $[75];
  let ga = ed,
    du;
  if ($[76] !== kt || $[77] !== storageV5 || $[78] !== setAppState)
    ((du = function wp(rg) {
      return RemoteAgentTask.kill(rg, setAppState, kt, void 0, storageV5);
    }),
      ($[76] = kt),
      ($[77] = storageV5),
      ($[78] = setAppState),
      ($[79] = du));
  else du = $[79];
  let wp = du,
    Wd;
  if (
    $[80] !== Gs ||
    $[81] !== ga ||
    $[82] !== js ||
    $[83] !== ol ||
    $[84] !== wp ||
    $[85] !== ec ||
    $[86] !== xl ||
    $[87] !== It ||
    $[88] !== kt ||
    $[89] !== Iu ||
    $[90] !== storageV5 ||
    $[91] !== setAppState
  )
    ((Wd = function Yd(Rl) {
      if (Rl.type === "local_bash" && Rl.status === "running") ec(Rl.id);
      else if (Rl.type === "local_agent" && (Rl.status === "running" || isWaitingOnChildren(Rl.task)))
        Gs(Rl.id);
      else if (Rl.type === "local_agent" && isCompletedBackgroundAgent(Rl.task))
        stopOrDismissAgent(Rl.id, kt);
      else if (Rl.type === "in_process_teammate" && Rl.status === "running") xl(Rl.id);
      else if (Rl.type === "local_workflow" && Rl.status === "running")
        killWorkflowTask(Rl.id, setAppState, "user");
      else if (Rl.type === "monitor_mcp" && Rl.status === "running" && Lw) Lw(Rl.id, setAppState);
      else if (Rl.type === "monitor_ws" && Rl.status === "running")
        stopMonitorWsTasks(Rl.id, setAppState, { userStop: !0, taskStop: !0 });
      else if (Rl.type === "mcp_task" && Rl.status === "running" && kill) Iu(Rl.id, kill);
      else if (Rl.type === "dream" && Rl.status === "running") js(Rl.id);
      else if (Rl.type === "auto_mode_scan" && Rl.status === "running") ga(Rl.id);
      else if (Rl.type === "local_memory_import" && Rl.status === "running") ol(Rl.id);
      else if (Rl.type === "post_turn_memory" && Rl.status === "running")
        PostTurnMemoryTask.kill(Rl.id, setAppState, kt, void 0, storageV5);
      else if (Rl.type === "remote_agent" && Rl.status === "running") {
        if (Rl.task.isUltraplan) stopUltraplan(Rl.id, Rl.task.sessionId, setAppState, kt, It, storageV5);
        else if (Rl.task.isRemoteReview) Ao({ mode: "confirmStopReview", itemId: Rl.id });
        else wp(Rl.id);
      }
    }),
      ($[80] = Gs),
      ($[81] = ga),
      ($[82] = js),
      ($[83] = ol),
      ($[84] = wp),
      ($[85] = ec),
      ($[86] = xl),
      ($[87] = It),
      ($[88] = kt),
      ($[89] = Iu),
      ($[90] = storageV5),
      ($[91] = setAppState),
      ($[92] = Wd));
  else Wd = $[92];
  let Yd = Wd,
    Pi;
  if ($[93] !== onDone || $[94] !== kt)
    ((Pi = function sa(fa) {
      if (fa.type === "in_process_teammate" && fa.status === "running") {
        return (enterTeammateView(fa.id, kt), onDone("Viewing teammate", { display: "system" }), !0);
      }
      if (fa.type === "local_agent" && isPanelAgentTask(fa.task)) {
        return (enterTeammateView(fa.id, kt), onDone("Viewing agent", { display: "system" }), !0);
      }
      if (fa.type === "leader") {
        return (exitTeammateView(kt), onDone(hJ(fa), { display: "system" }), !0);
      }
      return !1;
    }),
      ($[93] = onDone),
      ($[94] = kt),
      ($[95] = Pi));
  else Pi = $[95];
  let sa = Pi,
    td;
  if ($[96] !== sa || $[97] !== Ws || $[98] !== Yd)
    ((td = (Pl, Ad) => {
      let od = Ws[Ad];
      if (!od) {
        return;
      }
      if (Pl.key === "x" && !Pl.ctrl && !Pl.meta) {
        if ((Pl.preventDefault(), za.current)) {
          za.current = !1;
          return;
        }
        Yd(od);
        return;
      }
      if (Pl.key === "f" && !Pl.ctrl && !Pl.meta && sa(od)) Pl.preventDefault();
    }),
      ($[96] = sa),
      ($[97] = Ws),
      ($[98] = Yd),
      ($[99] = td));
  else td = $[99];
  let md = td,
    vp;
  if ($[100] !== bn || $[101] !== Ws || $[102] !== pl)
    ((vp = (sg) => {
      let zi = Ws[sg];
      if (!zi) {
        return;
      }
      if (!bn || zi.type === "self_managed_tasks" || zi.type === "subagent_history") {
        pl(zi);
        return;
      }
      if (gJ(zi).length > 0) Ao({ mode: "actions", itemId: zi.id });
    }),
      ($[100] = bn),
      ($[101] = Ws),
      ($[102] = pl),
      ($[103] = vp));
  else vp = $[103];
  let rd = vp,
    Qd;
  if ($[104] !== sa || $[105] !== pl || $[106] !== Yd)
    ((Qd = function xc(zd, Hc) {
      switch ((Ao({ mode: "list" }), zd)) {
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
    }),
      ($[104] = sa),
      ($[105] = pl),
      ($[106] = Yd),
      ($[107] = Qd));
  else Qd = $[107];
  let xc = Qd,
    Yc = Oo(onDone),
    [tc, Cp] = y(),
    Eu = bo.mode === "detail" ? Et?.[bo.itemId] : void 0;
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
  let Rp = bo.mode === "detail" && tc?.id === bo.itemId ? tc : void 0,
    Fh;
  if (
    $[108] !== allSelectableItems ||
    $[109] !== Rp ||
    $[110] !== so ||
    $[111] !== Yc ||
    $[112] !== Et ||
    $[113] !== bo.itemId ||
    $[114] !== bo.mode
  )
    ((Fh = () => {
      if (bo.mode === "actions") {
        if (!allSelectableItems.some((index) => index.id === bo.itemId)) Ao({ mode: "list" });
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
              wu?.isBackgroundDetailScreenEnabled()
            ) &&
            !hasBackgroundDetailScreen(Nd) &&
            !isTaskShownInDialog(Nd, so))
        ) {
          if (Bo.current && !(!Nd && wu?.isBackgroundDetailScreenEnabled()))
            Yc("Background dialog dismissed", { display: "skip" });
          else Ao({ mode: "list" });
        }
      }
    }),
      ($[108] = allSelectableItems),
      ($[109] = Rp),
      ($[110] = so),
      ($[111] = Yc),
      ($[112] = Et),
      ($[113] = bo.itemId),
      ($[114] = bo.mode),
      ($[115] = Fh));
  else Fh = $[115];
  let Af;
  if ($[116] !== allSelectableItems || $[117] !== Rp || $[118] !== so || $[119] !== Et || $[120] !== bo)
    ((Af = [bo, Et, allSelectableItems, Rp, so]),
      ($[116] = allSelectableItems),
      ($[117] = Rp),
      ($[118] = so),
      ($[119] = Et),
      ($[120] = bo),
      ($[121] = Af));
  else Af = $[121];
  P(Fh, Af);
  let Du;
  if ($[122] !== allSelectableItems.length || $[123] !== onBack || $[124] !== onDone)
    ((Du = () => {
      if (onBack) onBack();
      else if (Bo.current && allSelectableItems.length <= 1)
        onDone("Background dialog dismissed", { display: "skip" });
      else ((Bo.current = !1), Ao({ mode: "list" }));
    }),
      ($[122] = allSelectableItems.length),
      ($[123] = onBack),
      ($[124] = onDone),
      ($[125] = Du));
  else Du = $[125];
  let Va = Du,
    Fg = count(agentTasks, isTaskRunning) > 1;
  if (bo.mode !== "list" && bo.mode !== "actions" && Et) {
    let ns = Et[bo.itemId] ?? Rp;
    if (!ns) {
      return null;
    }
    if (bo.mode === "confirmStopReview") {
      let ba;
      if (
        $[126] !== It ||
        $[127] !== kt ||
        $[128] !== storageV5 ||
        $[129] !== setAppState ||
        $[130] !== bo.itemId
      )
        ((ba = () => {
          (stopUltrareviewTask(bo.itemId, "task_list", setAppState, kt, It, storageV5), Ao({ mode: "list" }));
        }),
          ($[126] = It),
          ($[127] = kt),
          ($[128] = storageV5),
          ($[129] = setAppState),
          ($[130] = bo.itemId),
          ($[131] = ba));
      else ba = $[131];
      let Mi;
      if ($[132] === MEMO_CACHE_SENTINEL) ((Mi = () => Ao({ mode: "list" })), ($[132] = Mi));
      else Mi = $[132];
      let Ti;
      if ($[133] !== ba)
        ((Ti = e(StopUltrareviewConfirm, { onStop: ba, onBack: Mi })), ($[133] = ba), ($[134] = Ti));
      else Ti = $[134];
      return Ti;
    }
    switch (ns.type) {
      case "local_bash": {
        if (W5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const ba = `shell-${ns.id}`;
          let Mi;
          if ($[135] !== onDone)
            ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[135] = onDone),
              ($[136] = Mi));
          else Mi = $[136];
          let Ti;
          if ($[137] !== ec || $[138] !== ns.id)
            ((Ti = () => void ec(ns.id).catch(logErrorWrapper)),
              ($[137] = ec),
              ($[138] = ns.id),
              ($[139] = Ti));
          else Ti = $[139];
          let Qa;
          if ($[140] !== Va || $[141] !== ba || $[142] !== Mi || $[143] !== Ti || $[144] !== ns)
            ((Qa = e(W5, { shell: ns, onClose: Mi, onBack: Va, onStop: Ti }, ba)),
              ($[140] = Va),
              ($[141] = ba),
              ($[142] = Mi),
              ($[143] = Ti),
              ($[144] = ns),
              ($[145] = Qa));
          else Qa = $[145];
          return Qa;
        }
        const ba = `shell-${ns.id}`;
        let Mi;
        if ($[146] !== ec || $[147] !== ns.id)
          ((Mi = () => void ec(ns.id)), ($[146] = ec), ($[147] = ns.id), ($[148] = Mi));
        else Mi = $[148];
        let Ti;
        if ($[149] !== Va || $[150] !== onDone || $[151] !== ba || $[152] !== Mi || $[153] !== ns)
          ((Ti = e(ShellDetailDialog, { shell: ns, onDone: onDone, onKillShell: Mi, onBack: Va }, ba)),
            ($[149] = Va),
            ($[150] = onDone),
            ($[151] = ba),
            ($[152] = Mi),
            ($[153] = ns),
            ($[154] = Ti));
        else Ti = $[154];
        return Ti;
      }
      case "local_agent": {
        let ba;
        if ($[155] !== onDone || $[156] !== kt || $[157] !== ns)
          ((ba = isPanelAgentTask(ns)
            ? () => {
                (enterTeammateView(ns.id, kt), onDone("Viewing agent", { display: "system" }));
              }
            : void 0),
            ($[155] = onDone),
            ($[156] = kt),
            ($[157] = ns),
            ($[158] = ba));
        else ba = $[158];
        let Gp = ba;
        if (j5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const Mi = `agent-${ns.id}`;
          let Ti;
          if ($[159] !== onDone)
            ((Ti = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[159] = onDone),
              ($[160] = Ti));
          else Ti = $[160];
          let Qa;
          if ($[161] !== Gs || $[162] !== ns.id)
            ((Qa = () => void Gs(ns.id).catch(logErrorWrapper2)),
              ($[161] = Gs),
              ($[162] = ns.id),
              ($[163] = Qa));
          else Qa = $[163];
          let yl;
          if (
            $[164] !== Va ||
            $[165] !== Mi ||
            $[166] !== Ti ||
            $[167] !== Qa ||
            $[168] !== ns ||
            $[169] !== Gp
          )
            ((yl = e(j5, { agent: ns, onClose: Ti, onBack: Va, onStop: Qa, onOpenTranscript: Gp }, Mi)),
              ($[164] = Va),
              ($[165] = Mi),
              ($[166] = Ti),
              ($[167] = Qa),
              ($[168] = ns),
              ($[169] = Gp),
              ($[170] = yl));
          else yl = $[170];
          return yl;
        }
        const Mi = `agent-${ns.id}`;
        let Ti;
        if ($[171] !== Gs || $[172] !== ns.id)
          ((Ti = () => void Gs(ns.id)), ($[171] = Gs), ($[172] = ns.id), ($[173] = Ti));
        else Ti = $[173];
        const Qa = Fg ? killAgentsShortcut : void 0;
        let yl;
        if (
          $[174] !== Va ||
          $[175] !== onDone ||
          $[176] !== Mi ||
          $[177] !== Ti ||
          $[178] !== Qa ||
          $[179] !== ns ||
          $[180] !== Gp
        )
          ((yl = e(
            AsyncAgentDetailDialog,
            {
              agent: ns,
              onDone: onDone,
              onKillAgent: Ti,
              onForeground: Gp,
              onBack: Va,
              killAllAgentsShortcut: Qa,
            },
            Mi,
          )),
            ($[174] = Va),
            ($[175] = onDone),
            ($[176] = Mi),
            ($[177] = Ti),
            ($[178] = Qa),
            ($[179] = ns),
            ($[180] = Gp),
            ($[181] = yl));
        else yl = $[181];
        return yl;
      }
      case "remote_agent": {
        let ba;
        if (
          $[182] !== wp ||
          $[183] !== It ||
          $[184] !== kt ||
          $[185] !== storageV5 ||
          $[186] !== setAppState ||
          $[187] !== ns.id ||
          $[188] !== ns.isRemoteReview ||
          $[189] !== ns.isUltraplan ||
          $[190] !== ns.sessionId ||
          $[191] !== ns.status
        )
          ((ba =
            ns.status !== "running"
              ? void 0
              : ns.isUltraplan
                ? () => void stopUltraplan(ns.id, ns.sessionId, setAppState, kt, It, storageV5)
                : ns.isRemoteReview
                  ? () => void stopUltrareviewTask(ns.id, "task_detail", setAppState, kt, It, storageV5)
                  : () => void wp(ns.id)),
            ($[182] = wp),
            ($[183] = It),
            ($[184] = kt),
            ($[185] = storageV5),
            ($[186] = setAppState),
            ($[187] = ns.id),
            ($[188] = ns.isRemoteReview),
            ($[189] = ns.isUltraplan),
            ($[190] = ns.sessionId),
            ($[191] = ns.status),
            ($[192] = ba));
        else ba = $[192];
        let Dc = ba;
        if (F5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const Mi = `session-${ns.id}`;
          let Ti;
          if ($[193] !== onDone)
            ((Ti = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[193] = onDone),
              ($[194] = Ti));
          else Ti = $[194];
          let Qa;
          if ($[195] !== Va || $[196] !== Dc || $[197] !== Mi || $[198] !== Ti || $[199] !== ns)
            ((Qa = e(F5, { session: ns, onClose: Ti, onBack: Va, onStop: Dc }, Mi)),
              ($[195] = Va),
              ($[196] = Dc),
              ($[197] = Mi),
              ($[198] = Ti),
              ($[199] = ns),
              ($[200] = Qa));
          else Qa = $[200];
          return Qa;
        }
        const Mi = `session-${ns.id}`;
        let Ti;
        if (
          $[201] !== commands ||
          $[202] !== Va ||
          $[203] !== onDone ||
          $[204] !== Dc ||
          $[205] !== Mi ||
          $[206] !== ns ||
          $[207] !== tools ||
          $[208] !== verbose
        )
          ((Ti = e(
            RemoteSessionDetailDialog,
            {
              session: ns,
              onDone: onDone,
              tools: tools,
              commands: commands,
              verbose: verbose,
              onBack: Va,
              onKill: Dc,
            },
            Mi,
          )),
            ($[201] = commands),
            ($[202] = Va),
            ($[203] = onDone),
            ($[204] = Dc),
            ($[205] = Mi),
            ($[206] = ns),
            ($[207] = tools),
            ($[208] = verbose),
            ($[209] = Ti));
        else Ti = $[209];
        return Ti;
      }
      case "in_process_teammate": {
        let ba;
        if ($[210] !== onDone || $[211] !== kt || $[212] !== ns.id || $[213] !== ns.status)
          ((ba =
            ns.status === "running"
              ? () => {
                  (enterTeammateView(ns.id, kt), onDone("Viewing teammate", { display: "system" }));
                }
              : void 0),
            ($[210] = onDone),
            ($[211] = kt),
            ($[212] = ns.id),
            ($[213] = ns.status),
            ($[214] = ba));
        else ba = $[214];
        let Bh = ba;
        if (q5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const Mi = `teammate-${ns.id}`;
          let Ti;
          if ($[215] !== onDone)
            ((Ti = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[215] = onDone),
              ($[216] = Ti));
          else Ti = $[216];
          let Qa;
          if ($[217] !== xl || $[218] !== ns.id)
            ((Qa = () => void xl(ns.id).catch(logErrorWrapper3)),
              ($[217] = xl),
              ($[218] = ns.id),
              ($[219] = Qa));
          else Qa = $[219];
          let yl;
          if (
            $[220] !== Va ||
            $[221] !== Mi ||
            $[222] !== Ti ||
            $[223] !== Qa ||
            $[224] !== ns ||
            $[225] !== Bh
          )
            ((yl = e(q5, { teammate: ns, onClose: Ti, onBack: Va, onStop: Qa, onOpenTranscript: Bh }, Mi)),
              ($[220] = Va),
              ($[221] = Mi),
              ($[222] = Ti),
              ($[223] = Qa),
              ($[224] = ns),
              ($[225] = Bh),
              ($[226] = yl));
          else yl = $[226];
          return yl;
        }
        const Mi = `teammate-${ns.id}`;
        let Ti;
        if ($[227] !== xl || $[228] !== ns.id || $[229] !== ns.status)
          ((Ti = ns.status === "running" ? () => void xl(ns.id) : void 0),
            ($[227] = xl),
            ($[228] = ns.id),
            ($[229] = ns.status),
            ($[230] = Ti));
        else Ti = $[230];
        let Qa;
        if (
          $[231] !== Va ||
          $[232] !== onDone ||
          $[233] !== Mi ||
          $[234] !== Ti ||
          $[235] !== ns ||
          $[236] !== Bh
        )
          ((Qa = e(
            InProcessTeammateDetailDialog,
            { teammate: ns, onDone: onDone, onKill: Ti, onBack: Va, onForeground: Bh },
            Mi,
          )),
            ($[231] = Va),
            ($[232] = onDone),
            ($[233] = Mi),
            ($[234] = Ti),
            ($[235] = ns),
            ($[236] = Bh),
            ($[237] = Qa));
        else Qa = $[237];
        return Qa;
      }
      case "local_workflow": {
        let ba;
        if ($[238] !== setAppState || $[239] !== ns.id || $[240] !== ns.status)
          ((ba =
            ns.status === "running"
              ? {
                  onKill: () => killWorkflowTask(ns.id, setAppState, "user"),
                  onPause: () => pauseWorkflowTask(ns.id, setAppState),
                  onSkipAgent: (Hh) => skipWorkflowAgent(ns.id, Hh, setAppState),
                  onRetryAgent: (exitState) => retryWorkflowAgent(ns.id, exitState, setAppState),
                }
              : void 0),
            ($[238] = setAppState),
            ($[239] = ns.id),
            ($[240] = ns.status),
            ($[241] = ba));
        else ba = $[241];
        let vu = ba;
        if (U5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const Mi = `workflow-${ns.id}`;
          let Ti;
          if ($[242] !== onDone)
            ((Ti = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[242] = onDone),
              ($[243] = Ti));
          else Ti = $[243];
          const Qa = vu?.onKill;
          const yl = vu?.onPause;
          const dm = vu?.onSkipAgent;
          const Uc = vu?.onRetryAgent;
          let uy;
          if (
            $[244] !== Va ||
            $[245] !== onDone ||
            $[246] !== Xe ||
            $[247] !== Mi ||
            $[248] !== Ti ||
            $[249] !== Qa ||
            $[250] !== yl ||
            $[251] !== dm ||
            $[252] !== Uc ||
            $[253] !== ns
          )
            ((uy = e(
              U5,
              {
                workflow: ns,
                onClose: Ti,
                onBack: Va,
                onSaved: onDone,
                onStop: Qa,
                onPause: yl,
                onSkipAgent: dm,
                onRetryAgent: Uc,
                promptVisibleBelow: Xe,
              },
              Mi,
            )),
              ($[244] = Va),
              ($[245] = onDone),
              ($[246] = Xe),
              ($[247] = Mi),
              ($[248] = Ti),
              ($[249] = Qa),
              ($[250] = yl),
              ($[251] = dm),
              ($[252] = Uc),
              ($[253] = ns),
              ($[254] = uy));
          else uy = $[254];
          return uy;
        }
        const Mi = `workflow-${ns.id}`;
        const Ti = vu?.onKill;
        const Qa = vu?.onPause;
        const yl = vu?.onSkipAgent;
        const dm = vu?.onRetryAgent;
        let Uc;
        if (
          $[255] !== Va ||
          $[256] !== onDone ||
          $[257] !== Xe ||
          $[258] !== Mi ||
          $[259] !== Ti ||
          $[260] !== Qa ||
          $[261] !== yl ||
          $[262] !== dm ||
          $[263] !== ns
        )
          ((Uc = e(
            WorkflowDetailDialog,
            {
              workflow: ns,
              onDone: onDone,
              promptVisibleBelow: Xe,
              onKill: Ti,
              onPause: Qa,
              onSkipAgent: yl,
              onRetryAgent: dm,
              onBack: Va,
            },
            Mi,
          )),
            ($[255] = Va),
            ($[256] = onDone),
            ($[257] = Xe),
            ($[258] = Mi),
            ($[259] = Ti),
            ($[260] = Qa),
            ($[261] = yl),
            ($[262] = dm),
            ($[263] = ns),
            ($[264] = Uc));
        else Uc = $[264];
        return Uc;
      }
      case "mcp_task": {
        if (!McpTaskDetailDialog) {
          return null;
        }
        if (dj !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const ba = `mcp-task-${ns.id}`;
          let Mi;
          if ($[265] !== onDone)
            ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[265] = onDone),
              ($[266] = Mi));
          else Mi = $[266];
          let Ti;
          if ($[267] !== Iu || $[268] !== ns.id)
            ((Ti = () => {
              if (kill) Iu(ns.id, kill);
            }),
              ($[267] = Iu),
              ($[268] = ns.id),
              ($[269] = Ti));
          else Ti = $[269];
          let Qa;
          if ($[270] !== Va || $[271] !== ba || $[272] !== Mi || $[273] !== Ti || $[274] !== ns)
            ((Qa = e(dj, { task: ns, onClose: Mi, onBack: Va, onStop: Ti }, ba)),
              ($[270] = Va),
              ($[271] = ba),
              ($[272] = Mi),
              ($[273] = Ti),
              ($[274] = ns),
              ($[275] = Qa));
          else Qa = $[275];
          return Qa;
        }
        const ba = `mcp-task-${ns.id}`;
        let Mi;
        if ($[276] !== onDone)
          ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
            ($[276] = onDone),
            ($[277] = Mi));
        else Mi = $[277];
        let Ti;
        if ($[278] !== Iu || $[279] !== ns.id || $[280] !== ns.status)
          ((Ti = ns.status === "running" && kill ? () => void Iu(ns.id, kill) : void 0),
            ($[278] = Iu),
            ($[279] = ns.id),
            ($[280] = ns.status),
            ($[281] = Ti));
        else Ti = $[281];
        let Qa;
        if ($[282] !== Va || $[283] !== ba || $[284] !== Mi || $[285] !== Ti || $[286] !== ns)
          ((Qa = e(McpTaskDetailDialog, { task: ns, onDone: Mi, onKill: Ti, onBack: Va }, ba)),
            ($[282] = Va),
            ($[283] = ba),
            ($[284] = Mi),
            ($[285] = Ti),
            ($[286] = ns),
            ($[287] = Qa));
        else Qa = $[287];
        return Qa;
      }
      case "monitor_mcp": {
        if (!N5) {
          return null;
        }
        if (lj !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const ba = `monitor-mcp-${ns.id}`;
          let Mi;
          if ($[288] !== onDone)
            ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[288] = onDone),
              ($[289] = Mi));
          else Mi = $[289];
          let Ti;
          if ($[290] !== setAppState || $[291] !== ns.id)
            ((Ti = () => Lw?.(ns.id, setAppState)), ($[290] = setAppState), ($[291] = ns.id), ($[292] = Ti));
          else Ti = $[292];
          let Qa;
          if ($[293] !== Va || $[294] !== ba || $[295] !== Mi || $[296] !== Ti || $[297] !== ns)
            ((Qa = e(lj, { monitor: ns, onClose: Mi, onBack: Va, onStop: Ti }, ba)),
              ($[293] = Va),
              ($[294] = ba),
              ($[295] = Mi),
              ($[296] = Ti),
              ($[297] = ns),
              ($[298] = Qa));
          else Qa = $[298];
          return Qa;
        }
        const ba = `monitor-mcp-${ns.id}`;
        let Mi;
        if ($[299] !== setAppState || $[300] !== ns.id || $[301] !== ns.status)
          ((Mi = ns.status === "running" && Lw ? () => Lw(ns.id, setAppState) : void 0),
            ($[299] = setAppState),
            ($[300] = ns.id),
            ($[301] = ns.status),
            ($[302] = Mi));
        else Mi = $[302];
        let Ti;
        if ($[303] !== Va || $[304] !== ba || $[305] !== Mi || $[306] !== ns)
          ((Ti = e(N5, { task: ns, onKill: Mi, onBack: Va }, ba)),
            ($[303] = Va),
            ($[304] = ba),
            ($[305] = Mi),
            ($[306] = ns),
            ($[307] = Ti));
        else Ti = $[307];
        return Ti;
      }
      case "dream": {
        if (B5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const ba = `dream-${ns.id}`;
          let Mi;
          if ($[308] !== onDone)
            ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[308] = onDone),
              ($[309] = Mi));
          else Mi = $[309];
          let Ti;
          if ($[310] !== js || $[311] !== ns.id)
            ((Ti = () => void js(ns.id).catch(logErrorWrapper4)),
              ($[310] = js),
              ($[311] = ns.id),
              ($[312] = Ti));
          else Ti = $[312];
          let Qa;
          if ($[313] !== Va || $[314] !== ba || $[315] !== Mi || $[316] !== Ti || $[317] !== ns)
            ((Qa = e(B5, { task: ns, onClose: Mi, onBack: Va, onStop: Ti }, ba)),
              ($[313] = Va),
              ($[314] = ba),
              ($[315] = Mi),
              ($[316] = Ti),
              ($[317] = ns),
              ($[318] = Qa));
          else Qa = $[318];
          return Qa;
        }
        const ba = `dream-${ns.id}`;
        let Mi;
        if ($[319] !== onDone)
          ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
            ($[319] = onDone),
            ($[320] = Mi));
        else Mi = $[320];
        let Ti;
        if ($[321] !== js || $[322] !== ns.id || $[323] !== ns.status)
          ((Ti = ns.status === "running" ? () => void js(ns.id) : void 0),
            ($[321] = js),
            ($[322] = ns.id),
            ($[323] = ns.status),
            ($[324] = Ti));
        else Ti = $[324];
        let Qa;
        if ($[325] !== Va || $[326] !== ba || $[327] !== Mi || $[328] !== Ti || $[329] !== ns)
          ((Qa = e(DreamDetailDialog, { task: ns, onDone: Mi, onBack: Va, onKill: Ti }, ba)),
            ($[325] = Va),
            ($[326] = ba),
            ($[327] = Mi),
            ($[328] = Ti),
            ($[329] = ns),
            ($[330] = Qa));
        else Qa = $[330];
        return Qa;
      }
      case "auto_mode_scan": {
        if (H5 !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const ba = `auto-mode-scan-${ns.id}`;
          let Mi;
          if ($[331] !== onDone)
            ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[331] = onDone),
              ($[332] = Mi));
          else Mi = $[332];
          let Ti;
          if ($[333] !== ga || $[334] !== ns.id)
            ((Ti = () => void ga(ns.id).catch(logErrorWrapper5)),
              ($[333] = ga),
              ($[334] = ns.id),
              ($[335] = Ti));
          else Ti = $[335];
          let Qa;
          if ($[336] !== Va || $[337] !== ba || $[338] !== Mi || $[339] !== Ti || $[340] !== ns)
            ((Qa = e(H5, { task: ns, onClose: Mi, onBack: Va, onStop: Ti }, ba)),
              ($[336] = Va),
              ($[337] = ba),
              ($[338] = Mi),
              ($[339] = Ti),
              ($[340] = ns),
              ($[341] = Qa));
          else Qa = $[341];
          return Qa;
        }
        const ba = `auto-mode-scan-${ns.id}`;
        let Mi;
        if ($[342] !== onDone)
          ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
            ($[342] = onDone),
            ($[343] = Mi));
        else Mi = $[343];
        let Ti;
        if ($[344] !== ga || $[345] !== ns.id || $[346] !== ns.status)
          ((Ti = ns.status === "running" ? () => void ga(ns.id) : void 0),
            ($[344] = ga),
            ($[345] = ns.id),
            ($[346] = ns.status),
            ($[347] = Ti));
        else Ti = $[347];
        let Qa;
        if ($[348] !== Va || $[349] !== ba || $[350] !== Mi || $[351] !== Ti || $[352] !== ns)
          ((Qa = e(TaskDetailDialog, { task: ns, onDone: Mi, onBack: Va, onKill: Ti }, ba)),
            ($[348] = Va),
            ($[349] = ba),
            ($[350] = Mi),
            ($[351] = Ti),
            ($[352] = ns),
            ($[353] = Qa));
        else Qa = $[353];
        return Qa;
      }
      case "local_memory_import": {
        if (uj !== null && wu?.isBackgroundDetailScreenEnabled()) {
          const ba = `local-memory-import-${ns.id}`;
          let Mi;
          if ($[354] !== onDone)
            ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
              ($[354] = onDone),
              ($[355] = Mi));
          else Mi = $[355];
          let Ti;
          if ($[356] !== ol || $[357] !== ns.id)
            ((Ti = () => void ol(ns.id).catch(logErrorWrapper6)),
              ($[356] = ol),
              ($[357] = ns.id),
              ($[358] = Ti));
          else Ti = $[358];
          let Qa;
          if ($[359] !== Va || $[360] !== ba || $[361] !== Mi || $[362] !== Ti || $[363] !== ns)
            ((Qa = e(uj, { task: ns, onClose: Mi, onBack: Va, onStop: Ti }, ba)),
              ($[359] = Va),
              ($[360] = ba),
              ($[361] = Mi),
              ($[362] = Ti),
              ($[363] = ns),
              ($[364] = Qa));
          else Qa = $[364];
          return Qa;
        }
        if (!cj) {
          return null;
        }
        const ba = `local-memory-import-${ns.id}`;
        let Mi;
        if ($[365] !== onDone)
          ((Mi = () => onDone("Background dialog dismissed", { display: "skip" })),
            ($[365] = onDone),
            ($[366] = Mi));
        else Mi = $[366];
        let Ti;
        if ($[367] !== ol || $[368] !== ns.id || $[369] !== ns.status)
          ((Ti = ns.status === "running" ? () => void ol(ns.id) : void 0),
            ($[367] = ol),
            ($[368] = ns.id),
            ($[369] = ns.status),
            ($[370] = Ti));
        else Ti = $[370];
        let Qa;
        if ($[371] !== Va || $[372] !== ba || $[373] !== Mi || $[374] !== Ti || $[375] !== ns)
          ((Qa = e(cj, { task: ns, onDone: Mi, onBack: Va, onKill: Ti }, ba)),
            ($[371] = Va),
            ($[372] = ba),
            ($[373] = Mi),
            ($[374] = Ti),
            ($[375] = ns),
            ($[376] = Qa));
        else Qa = $[376];
        return Qa;
      }
    }
  }
  let Wh = count(bashTasks, isTaskRunning_2),
    my = count(remoteSessions, isTaskRunningOrPending) + count(agentTasks, isTaskRunning_3),
    jh = count(teammateTasks, getDisplayName_2),
    ba;
  if ($[377] !== my || $[378] !== Wh || $[379] !== jh)
    ((ba = intersperse(
      [
        ...(jh > 0 ? [r(Text, { children: [jh, " ", jh !== 1 ? "agents" : "agent"] }, "teammates")] : []),
        ...(Wh > 0
          ? [r(Text, { children: [Wh, " ", Wh !== 1 ? "active shells" : "active shell"] }, "shells")]
          : []),
        ...(my > 0
          ? [r(Text, { children: [my, " ", my !== 1 ? "active agents" : "active agent"] }, "agents")]
          : []),
      ],
      w4t,
    )),
      ($[377] = my),
      ($[378] = Wh),
      ($[379] = jh),
      ($[380] = ba));
  else ba = $[380];
  let Jb = ba,
    Im = so ? Zze : eYe,
    Mi;
  if ($[381] !== Ka || $[382] !== Im || $[383] !== bn)
    ((Mi = bn
      ? []
      : [
          e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select", ...Im }, "upDown"),
          ...(!Ka || canOpenTaskDetail(Ka)
            ? [e(KeyboardShortcutHint, { chord: "enter", action: "view", ...Im }, "enter")]
            : []),
          ...(Ka?.type === "self_managed_tasks" ||
          (Ka?.type === "subagent_history" && Ka.size !== 0 && Ka.size !== "unreadable")
            ? [e(KeyboardShortcutHint, { chord: "enter", action: "show", ...Im }, "show")]
            : []),
          ...(Ka && canForegroundTask(Ka)
            ? [e(KeyboardShortcutHint, { chord: "f", action: "foreground", ...Im }, "foreground")]
            : []),
          ...(Ka && canStopTask(Ka)
            ? [e(KeyboardShortcutHint, { chord: "x", action: "stop", ...Im }, "kill")]
            : []),
        ]),
      ($[381] = Ka),
      ($[382] = Im),
      ($[383] = bn),
      ($[384] = Mi));
  else Mi = $[384];
  let Ti;
  if ($[385] !== Ka || $[386] !== Fg || $[387] !== so || $[388] !== killAgentsShortcut)
    ((Ti =
      Ka?.type === "local_agent" && canStopTask(Ka) && Fg && killAgentsShortcut
        ? [
            e(
              KeyboardShortcutHint,
              {
                chord: killAgentsShortcut,
                action: "stop all agents",
                format: { keyCase: "lower" },
                terse: so,
              },
              "kill-all",
            ),
          ]
        : []),
      ($[385] = Ka),
      ($[386] = Fg),
      ($[387] = so),
      ($[388] = killAgentsShortcut),
      ($[389] = Ti));
  else Ti = $[389];
  const Qa = bo.mode === "actions" ? "go back" : "close";
  let yl;
  if ($[390] !== Im || $[391] !== Qa)
    ((yl = e(KeyboardShortcutHint, { chord: "escape", action: Qa, ...Im }, "esc")),
      ($[390] = Im),
      ($[391] = Qa),
      ($[392] = yl));
  else yl = $[392];
  let dm;
  if ($[393] !== Mi || $[394] !== Ti || $[395] !== yl)
    ((dm = [...Mi, ...Ti, yl]), ($[393] = Mi), ($[394] = Ti), ($[395] = yl), ($[396] = dm));
  else dm = $[396];
  let Hg = dm,
    Uc;
  if (
    $[397] !== agentTasks.length ||
    $[398] !== bashTasks ||
    $[399] !== completedAgentTasks.length ||
    $[400] !== remoteSessions.length ||
    $[401] !== teammateTasks ||
    $[402] !== teams.length
  )
    ((Uc =
      teams.length > 0 &&
      (bashTasks.length > 0 ||
        remoteSessions.length > 0 ||
        agentTasks.length > 0 ||
        completedAgentTasks.length > 0) &&
      e(SectionHeading, { label: "Agents", size: count(teammateTasks, getDisplayName) })),
      ($[397] = agentTasks.length),
      ($[398] = bashTasks),
      ($[399] = completedAgentTasks.length),
      ($[400] = remoteSessions.length),
      ($[401] = teammateTasks),
      ($[402] = teams.length),
      ($[403] = Uc));
  else Uc = $[403];
  let uy;
  if (
    $[404] !== agentTasks ||
    $[405] !== autoModeScanTasks ||
    $[406] !== bashTasks ||
    $[407] !== completedAgentTasks ||
    $[408] !== dreamTasks ||
    $[409] !== historyRow ||
    $[410] !== bn ||
    $[411] !== mcpMonitors ||
    $[412] !== mcpTasks ||
    $[413] !== memoryImportTasks ||
    $[414] !== memorySaveTasks ||
    $[415] !== remoteSessions ||
    $[416] !== selfManaged ||
    $[417] !== Wo ||
    $[418] !== Uc ||
    $[419] !== teammateTasks ||
    $[420] !== teams ||
    $[421] !== workflowTasks
  ) {
    let Zb = [
      { key: "agents", items: teammateTasks, heading: Uc },
      {
        key: "shells",
        items: bashTasks,
        heading:
          (teammateTasks.length > 0 ||
            remoteSessions.length > 0 ||
            agentTasks.length > 0 ||
            completedAgentTasks.length > 0) &&
          e(SectionHeading, { label: "Shells", size: bashTasks.length }),
      },
      {
        key: "monitors",
        items: mcpMonitors,
        heading: e(SectionHeading, { label: "Monitors", size: mcpMonitors.length }),
      },
      {
        key: "mcp-tasks",
        items: mcpTasks,
        heading: e(SectionHeading, { label: "MCP tasks", size: mcpTasks.length }),
      },
      {
        key: "cloud-agents",
        items: remoteSessions,
        heading: e(SectionHeading, { label: "Cloud agents", size: remoteSessions.length }),
      },
      {
        key: "local-agents",
        items: agentTasks,
        heading: e(SectionHeading, { label: "Local agents", size: agentTasks.length }),
      },
      {
        key: "completed",
        items: completedAgentTasks,
        heading: e(SectionHeading, { label: "Completed", size: completedAgentTasks.length }),
      },
      {
        key: "workflows",
        items: workflowTasks,
        heading: e(SectionHeading, { label: "Dynamic workflows", size: workflowTasks.length }),
      },
      { key: "dream", items: dreamTasks },
      { key: "auto-mode-scan", items: autoModeScanTasks },
      { key: "local-memory-import", items: memoryImportTasks },
      { key: "post-turn-memory", items: memorySaveTasks },
      ...[],
      {
        key: "self-managed",
        items: selfManaged,
        heading: Wo && e(SectionHeading, { label: SYSTEM_TASKS_LABEL, size: selfManaged.length }),
      },
      {
        key: "subagent-history",
        items: historyRow,
        heading:
          historyRow[0]?.type === "recorded_agent" &&
          e(SectionHeading, { label: EARLIER_IN_SESSION_LABEL, size: historyRow.length }),
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
                heading: `Team: ${Dr(Zd)} (${ig.length + (found ? 1 : 0)})`,
                key: `${Zd}-team`,
              },
              ...(found ? [{ kind: "row", item: found, key: `${found.id}-${Zd}` }] : []),
              ...ig.map(TeammateTaskGroups),
            ];
          })
        : p_.items.map(_4t);
    let date = new Date(Date.now());
    let filtered = Zb.filter(T4t);
    uy = filtered.flatMap((Qp, Br) => [
      ...(Br > 0 ? [e(merged.Heading, {}, `${Qp.key}-gap`)] : []),
      ...(Qp.heading ? [e(merged.Heading, { children: Qp.heading }, `${Qp.key}-heading`)] : []),
      ...fy(Qp).map((item_7) => {
        if (item_7.kind === "heading") {
          return e(
            merged.Heading,
            { children: e(Text, { dimColor: !0, children: item_7.heading }) },
            item_7.key,
          );
        }
        let { item: item } = item_7;
        if (item.type === "self_managed_tasks") {
          return e(
            OrderedListWithItem.Item,
            { label: item.label, meta: [`${item.size} hidden`] },
            item_7.key,
          );
        }
        if (item.type === "subagent_history") {
          return e(
            OrderedListWithItem.Item,
            {
              label:
                item.size === void 0 || bn
                  ? item.label
                  : `${item.label} (${item.size === "unreadable" ? "could not be read" : item.size})`,
            },
            item_7.key,
          );
        }
        if (item.type === "recorded_agent") {
          return e(
            OrderedListWithItem.Item,
            {
              ...describeSubagentRow(item.row, { now: date, isScreenReader: bn, isRefused: item.isRefused }),
            },
            item_7.key,
          );
        }
        let vl = item.type === "leader" ? null : BackgroundTask(item.task);
        return vl
          ? e(OrderedListWithItem.Item, { ...vl }, item_7.key)
          : e(merged.Item, { children: e(TaskItemLabel, { item: item }) }, item_7.key);
      }),
    ]);
    (($[404] = agentTasks),
      ($[405] = autoModeScanTasks),
      ($[406] = bashTasks),
      ($[407] = completedAgentTasks),
      ($[408] = dreamTasks),
      ($[409] = historyRow),
      ($[410] = bn),
      ($[411] = mcpMonitors),
      ($[412] = mcpTasks),
      ($[413] = memoryImportTasks),
      ($[414] = memorySaveTasks),
      ($[415] = remoteSessions),
      ($[416] = selfManaged),
      ($[417] = Wo),
      ($[418] = Uc),
      ($[419] = teammateTasks),
      ($[420] = teams),
      ($[421] = workflowTasks),
      ($[422] = uy));
  } else uy = $[422];
  let hl = uy,
    Mf;
  if ($[423] !== Xa || $[424] !== hl)
    ((Mf =
      Xa && Uw
        ? Xa.rows.map((item_8) =>
            e(
              merged.Item,
              { children: e(Uw.BackgroundListLine, { row: item_8, widths: Xa.widths }) },
              item_8.id,
            ),
          )
        : hl),
      ($[423] = Xa),
      ($[424] = hl),
      ($[425] = Mf));
  else Mf = $[425];
  let Ra = Mf,
    Dl = Uw && Xa ? Uw.BACKGROUND_LIST_LINES : void 0,
    Gu = Sn === void 0 ? void 0 : Math.min(Ra.length, Dl ?? Sn),
    zp;
  if (
    $[426] !== Hg ||
    $[427] !== allSelectableItems ||
    $[428] !== Ho ||
    $[429] !== md ||
    $[430] !== historyRow.length ||
    $[431] !== Ra ||
    $[432] !== Ws ||
    $[433] !== Xa ||
    $[434] !== Dl ||
    $[435] !== onDone ||
    $[436] !== Yi ||
    $[437] !== xc ||
    $[438] !== rd ||
    $[439] !== Jb ||
    $[440] !== columns ||
    $[441] !== bo.itemId ||
    $[442] !== bo.mode ||
    $[443] !== Gu
  ) {
    let Pc = bo.mode === "actions" ? allSelectableItems.find((item_9) => item_9.id === bo.itemId) : void 0;
    let Aa;
    if ($[445] !== Ho || $[446] !== Ws) {
      let rl;
      if ($[448] !== Ho) ((rl = (item_10) => item_10.id === Ho.id), ($[448] = Ho), ($[449] = rl));
      else rl = $[449];
      Aa = Ws.findIndex(rl);
      (($[445] = Ho), ($[446] = Ws), ($[447] = Aa));
    } else Aa = $[447];
    let _a = Aa;
    let rl;
    if ($[450] !== onDone || $[451] !== bo.mode)
      ((rl = () => {
        if (bo.mode === "actions") {
          Ao({ mode: "list" });
          return;
        }
        onDone("Background dialog dismissed", { display: "skip" });
      }),
        ($[450] = onDone),
        ($[451] = bo.mode),
        ($[452] = rl));
    else rl = $[452];
    let Jl = rl;
    let Cu;
    if ($[453] !== Xa || $[454] !== Jb)
      ((Cu = Xa ? Xa.count : e(Fragment, { children: Jb })), ($[453] = Xa), ($[454] = Jb), ($[455] = Cu));
    else Cu = $[455];
    let ew;
    if ($[456] !== Hg) ((ew = e(Byline, { children: Hg })), ($[456] = Hg), ($[457] = ew));
    else ew = $[457];
    zp = e(Dialog, {
      title: "Background",
      subtitle: Cu,
      onCancel: Jl,
      color: Xa ? "permission" : "background",
      inputGuide: ew,
      children: Pc
        ? r(Fragment, {
            children: [
              r(Text, {
                bold: !0,
                wrap: "truncate-end",
                children: [
                  "Actions for",
                  " ",
                  truncateToWidth(Item(Pc), Math.max(1, columns - MAX_SUBAGENT_HISTORY_ROWS)),
                ],
              }),
              e(ModelSelector, { options: gJ(Pc).map(R4t), onChange: (item_11) => xc(item_11, Pc) }),
            ],
          })
        : r(Fragment, {
            children: [
              allSelectableItems.length === historyRow.length &&
                e(HintText, { children: "No tasks currently running" }),
              allSelectableItems.length > 0 &&
                e(OrderedListWithItem, {
                  defaultFocusIndex: _a !== -1 ? _a : Math.min(Ho.index, Ws.length - 1),
                  visibleCount: Gu,
                  maxVisibleCount: Dl,
                  onFocus: Yi,
                  onSelect: rd,
                  onRowKeyDown: md,
                  children: Ra,
                }),
            ],
          }),
    });
    (($[426] = Hg),
      ($[427] = allSelectableItems),
      ($[428] = Ho),
      ($[429] = md),
      ($[430] = historyRow.length),
      ($[431] = Ra),
      ($[432] = Ws),
      ($[433] = Xa),
      ($[434] = Dl),
      ($[435] = onDone),
      ($[436] = Yi),
      ($[437] = xc),
      ($[438] = rd),
      ($[439] = Jb),
      ($[440] = columns),
      ($[441] = bo.itemId),
      ($[442] = bo.mode),
      ($[443] = Gu),
      ($[444] = zp));
  } else zp = $[444];
  return zp;
}
//@ chunk-18hwfzwa.js:762915-762973 layout
var a2e = { view: "View", foreground: "Foreground", stop: "Stop" };
//@ chunk-18hwfzwa.js:762973-763067 layout
function gJ(h) {
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
    (h.type === "recorded_agent" && h.row.entry.agentType !== void 0 && !h.isRefused)
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
/**
 * 任务是否可停止：处于运行中的各类后台任务（或活动中的本地代理）。
 */
//@ chunk-18hwfzwa.js:763336-763737 layout
function canStopTask(h) {
  if (h.type === "local_agent" && isWaitingOnChildren(h.task)) return !0;
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
      !1)
  );
}
//@ chunk-18hwfzwa.js:763737-763751 layout
var MAIN = "main";
//@ chunk-18hwfzwa.js:763751-763818 layout
function hJ(h) {
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
    return Dr(t0.label);
  return Dr(BackgroundTask(t0.task)?.label ?? t0.label);
}
//@ chunk-18hwfzwa.js:763999-764108 layout
function isParkedCompletedAgent(h) {
  return (
    h.type === "local_agent" &&
    h.status === "completed" &&
    h.quietlyParked !== !0 &&
    !(isCoordinatorPanelActive() && isTerminalStatus(h))
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
        task: task,
      };
    case "remote_agent":
      return { id: task.id, type: "remote_agent", label: task.title, status: task.status, task: task };
    case "local_agent":
      return { id: task.id, type: "local_agent", label: task.description, status: task.status, task: task };
    case "in_process_teammate":
      return {
        id: task.id,
        type: "in_process_teammate",
        label: `@${task.identity.agentName}`,
        status: task.status,
        task: task,
      };
    case "local_workflow":
      return {
        id: task.id,
        type: "local_workflow",
        label: task.summary ?? task.description,
        status: task.status,
        task: task,
      };
    case "monitor_mcp":
      return { id: task.id, type: "monitor_mcp", label: task.description, status: task.status, task: task };
    case "monitor_ws":
      return { id: task.id, type: "monitor_ws", label: task.description, status: task.status, task: task };
    case "mcp_task":
      return { id: task.id, type: "mcp_task", label: task.description, status: task.status, task: task };
    case "dream":
      return { id: task.id, type: "dream", label: task.description, status: task.status, task: task };
    case "auto_mode_scan":
      return {
        id: task.id,
        type: "auto_mode_scan",
        label: task.description,
        status: task.status,
        task: task,
      };
    case "local_memory_import":
      return {
        id: task.id,
        type: "local_memory_import",
        label: task.description,
        status: task.status,
        task: task,
      };
    case "post_turn_memory":
      return {
        id: task.id,
        type: "post_turn_memory",
        label: task.description,
        status: task.status,
        task: task,
      };
    default:
      return { id: task.id, type: task.type, label: task.description, status: task.status, task: task };
  }
}
//@ chunk-18hwfzwa.js:765510-765534 affinity
function I6t() {
  return !1;
}
//@ chunk-18hwfzwa.js:765534-765561 affinity
function E6t() {
  return null;
}

export { BackgroundTasksDialog };
