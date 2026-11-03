/**
 * components/CoordinatorAgentStatus.tsx
 *
 * 协调者/队友任务面板：列出后台 agent/队友/工作流任务行（排队数、token、状态），处理面板选择与 chat:killAgents 等按键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CoordinatorAgentStatus.tsx
 * pieces: chunk-18hwfzwa.js (48), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 4, placement 35, layout 9, callgraph-witnessed 1
 */
import { listUncarriedLaunchSettings } from "../services/daemon/relaunchArgs.js";
import { getForkRestrictedLaunchConfig } from "../bootstrap/state.js";
import { MGe } from "../tasks/backgroundTaskLabels.js";
import { hO } from "./tasks/BackgroundTaskStatus.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint, formatShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import {
  isPanelAgentTask,
  isCompletedBackgroundAgent,
  isMainSessionTask as isMainSessionTask_2,
} from "../tasks/taskKinds.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { isIdleCompletedSubagent } from "../tasks/LocalMainSessionTask.js";
import { Dr, repeatString } from "../utils/stringUtils.js";
import { hasRunningBackgroundWorkForAgent } from "../tasks/backgroundTaskKinds.js";
import { isTeammateAwaitingInput } from "../utils/inProcessTeammateHelpers.js";
import { isCoordinatorPanelActive, Xre } from "../utils/transcriptDiagnostics.js";
import { isTerminalTaskStatus } from "../Task.js";
import { count } from "../utils/collections.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { BLACK_CIRCLE, DOWN_ARROW, UP_ARROW } from "../utils/permissions/autoModeRulesPrompt.js";
import { formatNumber, formatDuration } from "../utils/format.js";
import { hasCompletedWithFindings } from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState, Cr, useSetAppState } from "../state/AppState.js";
import {
  djt,
  cjt,
  mjt,
  selectViewingAgentTaskId,
  fjt,
  gjt,
  hjt,
  getTaskOutputDir,
  Sjt,
  bjt,
  wjt,
  kjt,
  Cjt,
  _jt,
  Tjt,
  Ajt,
  Mjt,
  AgentStatusRow,
  Ijt,
  Ejt,
  selectViewingAgentTaskId_2,
} from "./_new/AgentStatusRowView.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../hooks/useMainLoopModel.js";
import { isUltracodeActive } from "../utils/effort.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useSetVoiceState, waitForStoreState } from "../context/voice.js";
import { Me } from "./design-system/ThemeProvider.js";
import {
  runningWorkflowTasks,
  workflowSizeSummary,
  LARGE_WORKFLOW_STOP_HINT_PLAIN,
  useShortcutDisplayText,
} from "./Spinner/workflowStatus.js";
import { countWorkflowAgents } from "./workflow/WorkflowProgress.js";
import { S2o } from "../utils/usageLimitText.js";
import { y, P, j, Q, ce } from "../../vendor/react/cjs/react.production.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { hasOtherActiveAgents, AP } from "../utils/task/framework.js";
import { useInterval } from "../ink/components/Input.js";
import { clamp } from "../ink/screen.js";
import { computeScrollWindow } from "./CustomSelect/select.js";
import { extractTeammateTranscriptsFromTasks_2 } from "../utils/sessionStorage.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { exitTeammateView, enterTeammateView, isLocalAgent } from "../state/teammateViewHelpers.js";
import { _S } from "../../vendor/chart.js/dist/chart.js";
import { stepTeammateSelection } from "../hooks/useBackgroundTaskNavigation.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { Byline } from "./design-system/Byline.js";
import { shallowEqualTaskMaps } from "../state/onChangeAppState.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { useStrayClickGuard } from "./CustomSelect/strayClickGuard.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { findShadowedActions } from "../keybindings/match.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { findAgentTask } from "../plugins/functionHooks/sessionApi.js";
import { teammateRowState } from "./_new/teammateRowState.js";
import { eHn } from "../plugins/functionHooks/uiApi.js";

//@ chunk-18hwfzwa.js:171209-171289 fingerprint = _temp (0.667)
function hHe(s) {
  return (
    listUncarriedLaunchSettings(s.toolPermissionContext, getForkRestrictedLaunchConfig()).length > 0 ||
    MGe(s.tasks)
  );
}
//@ chunk-18hwfzwa.js:440861-440904 placement
function selectFooterSelection(vo) {
  return vo.footerSelection;
}
//@ chunk-18hwfzwa.js:440904-440952 placement
function selectCoordinatorTaskIndex_2(Yo) {
  return Yo.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:440952-440999 placement
function selectWorkflowFooterIndex(kn) {
  return kn.workflowFooterIndex;
}
//@ chunk-18hwfzwa.js:440999-441052 placement
function Bjt(Fn) {
  return Fn.idleTeammatesExpanded ?? !1;
}
//@ chunk-18hwfzwa.js:441052-441110 placement
function Hjt(bn) {
  return Em(bn) && bn.evictAfter !== 0 && hO(bn);
}
//@ chunk-18hwfzwa.js:441110-441150 placement
function Ujt(Go) {
  return Go.action !== STOP_ALL_AGENTS_LABEL;
}
//@ chunk-18hwfzwa.js:441150-441197 placement
function $jt(hn) {
  return e(KeyboardShortcutHint, { ...hn }, hn.action);
}
//@ chunk-18hwfzwa.js:441197-441268 placement
var WORKFLOW_SIZE_WARNING = "workflow-size-warning",
  Az = 5,
  $le = 3,
  IDLE_TEAMMATE_SUMMARY = "idle-teammate-summary";
//@ chunk-18hwfzwa.js:441268-441314 placement
function ou(h) {
  return h.type === "idle_summary";
}
//@ chunk-18hwfzwa.js:441314-441405 placement
function hU(h, x) {
  return x.viewSelectionMode === "viewing-agent" && h.id === x.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:441405-441440 placement
function Em(h) {
  return isPanelAgentTask(h) || isInProcessTeammateTask(h);
}
/**
 * 是否存在可清理（evictAfter≠0、不是其他任务的祖先）的空闲已完成子代理任务，且它不是已完成的后台 agent。页脚据此决定是否显示清理提示。
 */
//@ chunk-18hwfzwa.js:441612-441732 placement
function hasEvictableIdleSubagent(h, x) {
  let D = collectAncestorTaskIds(h, x);
  return Object.values(h).some(
    (L) =>
      Em(L) &&
      L.evictAfter !== 0 &&
      !D.has(L.id) &&
      isIdleCompletedSubagent(L) &&
      !isCompletedBackgroundAgent(L),
  );
}
//@ chunk-18hwfzwa.js:441732-441822 placement
function Yz(h) {
  return Dr(h.type === "in_process_teammate" ? h.identity.agentName : h.agentType);
}
//@ chunk-18hwfzwa.js:441905-441930 placement
function wqe(h, x) {
  return;
}
//@ chunk-18hwfzwa.js:441930-442034 placement
function isEvictingIdleTeammate(h) {
  return h?.type === "in_process_teammate" && h.isIdle && h.evictAfter !== void 0 && h.evictAfter > 0;
}
//@ chunk-18hwfzwa.js:442034-442194 placement
function isTeammateDueForEviction(h, x, D) {
  return (
    isEvictingIdleTeammate(h) &&
    h.evictAfter !== void 0 &&
    h.evictAfter <= x &&
    !q$e(h) &&
    (h.identity.resumableAgentId === void 0 ||
      !hasRunningBackgroundWorkForAgent(h.identity.resumableAgentId, D))
  );
}
//@ chunk-18hwfzwa.js:442194-442224 placement
function q$e(h) {
  return isTeammateAwaitingInput(h);
}
//@ chunk-18hwfzwa.js:442224-442818 fingerprint = getVisibleAgentTasks (1)
function getVisibleAgentTasks(h, x) {
  let D = x ? h[x] : void 0,
    L = isPanelAgentTask(D) ? D.agentId : void 0,
    ee = collectAncestorTaskIds(h, x),
    ke = isPanelAgentTask(D) ? nearestVisibleAncestorId(h, D, ee) : void 0,
    filtered = Object.values(h).filter(
      (Xe) =>
        Em(Xe) &&
        (Xe.evictAfter !== 0 || ee.has(Xe.id)) &&
        (!isIdleCompletedSubagent(Xe) || ee.has(Xe.id)) &&
        (nearestVisibleAncestorId(h, Xe, ee) === L ||
          nearestVisibleAncestorId(h, Xe, ee) === ke ||
          ee.has(Xe.id)),
    ),
    Be = new Set(filtered.map((Xe) => Xe.id)),
    He = new Map();
  for (let Xe of filtered) {
    let rt = nearestVisibleAncestorId(h, Xe, ee),
      kt = rt !== void 0 && Be.has(rt) ? rt : void 0,
      At = He.get(kt);
    if (At) At.push(Xe);
    else He.set(kt, [Xe]);
  }
  for (let Xe of He.values()) Xe.sort((rt, kt) => rt.startTime - kt.startTime);
  let We = [];
  function ze(Xe) {
    for (let rt of He.get(Xe) ?? []) (We.push(rt), ze(rt.id));
  }
  return (ze(void 0), We);
}
//@ chunk-18hwfzwa.js:442818-443034 layout = _temp6 (0.781)
function nearestVisibleAncestorId(h, x, D) {
  if (x.type === "in_process_teammate") return;
  let L = new Set(),
    parentAgentId = x.parentAgentId;
  while (parentAgentId && !L.has(parentAgentId)) {
    L.add(parentAgentId);
    let ke = h[parentAgentId];
    if (!isMainSessionTask_2(ke)) return;
    if (!isIdleCompletedSubagent(ke) || D.has(parentAgentId)) return parentAgentId;
    parentAgentId = ke.parentAgentId;
  }
  return;
}
//@ chunk-18hwfzwa.js:443034-443271 layout
function collectAncestorTaskIds(h, x) {
  let D = x ? h[x] : void 0,
    L = new Set();
  for (let ee = Em(D) ? D : void 0; ee && !L.has(ee.id);) {
    L.add(ee.id);
    let ke = ee.type === "local_agent" ? ee.parentAgentId : void 0,
      Re = ke !== void 0 ? h[ke] : void 0;
    ee = Em(Re) && Re.evictAfter !== 0 ? Re : void 0;
  }
  return L;
}
//@ chunk-18hwfzwa.js:443271-443411 layout
function ancestorDepth(h, x, D) {
  let L = 0,
    ee = new Set(),
    ke = nearestVisibleAncestorId(h, x, D);
  while (ke && !ee.has(ke)) {
    (ee.add(ke), L++);
    let Re = h[ke];
    ke = isPanelAgentTask(Re) ? nearestVisibleAncestorId(h, Re, D) : void 0;
  }
  return L;
}
//@ chunk-18hwfzwa.js:443411-443635 layout
function countVisibleDescendants(h, x, D) {
  let L = 0;
  for (let ee of Object.values(h)) {
    if (!isMainSessionTask_2(ee) || isIdleCompletedSubagent(ee)) continue;
    let ke = nearestVisibleAncestorId(h, ee, D),
      Re = new Set();
    while (ke && !Re.has(ke)) {
      if (ke === x) {
        L++;
        break;
      }
      Re.add(ke);
      let Be = h[ke];
      ke = isPanelAgentTask(Be) ? nearestVisibleAncestorId(h, Be, D) : void 0;
    }
  }
  return L;
}
//@ chunk-18hwfzwa.js:443635-443995 layout
function getVisibleBackgroundTasks(h, x, D, L = !1) {
  if (isCoordinatorPanelActive()) return [];
  let filtered = getVisibleAgentTasks(h, D).filter((ze) => x[ze.id]?.content !== "");
  if (L) return filtered;
  let mapped = filtered.filter((ze) => isOtherIdleTeammate(ze, D)).map((ze) => ze.id);
  if (mapped.length <= $le) return filtered;
  let sliced = mapped.slice($le),
    Be = new Set(sliced),
    He = [],
    We = !1;
  for (let ze of filtered)
    if (!Be.has(ze.id)) He.push(ze);
    else if (!We) ((We = !0), He.push({ type: "idle_summary", id: IDLE_TEAMMATE_SUMMARY, taskIds: sliced }));
  return He;
}
//@ chunk-18hwfzwa.js:443995-444095 placement = _temp6 (0.765)
function isOtherIdleTeammate(h, x) {
  return (
    h.type === "in_process_teammate" && h.isIdle && !isTerminalTaskStatus(h.status) && h.id !== x && !q$e(h)
  );
}
//@ chunk-18hwfzwa.js:444095-444142 placement
function yU(h, x) {
  return count(h, (D) => isOtherIdleTeammate(D, x)) > $le;
}
/**
 * 任务列表变化后重新定位面板选中行：按原选中任务 id 在新列表中的位置返回新下标（1 起），找不到时在分组里找包含它的组，仍找不到返回 0。
 */
//@ chunk-18hwfzwa.js:444142-444377 placement
function remapTaskPanelIndex(h, x, D, L) {
  if (h < 1) return h;
  let ee = x[Math.min(h, x.length) - 1],
    ke = ee !== void 0 ? D.indexOf(ee) : -1;
  if (ke !== -1) return ke + 1;
  if (ee !== void 0 && L) {
    let index = L.findIndex((Be) => ou(Be) && Be.taskIds.includes(ee));
    if (index !== -1) return index + 1;
  }
  return 0;
}
//@ chunk-18hwfzwa.js:444377-444619 placement
function selectTaskRowUpdater(h, x) {
  return (D) => {
    let L = x(D);
    if (L.footerSelection !== "tasks" && L.footerSelection !== "workflows") return L;
    if (L.footerSelection === "tasks" && L.coordinatorTaskIndex === h) return L;
    return { ...L, footerSelection: "tasks", coordinatorTaskIndex: h };
  };
}
//@ chunk-18hwfzwa.js:444619-444699 placement
function SU(h) {
  return h.idleTeammatesExpanded ? h : { ...h, idleTeammatesExpanded: !0 };
}
//@ chunk-18hwfzwa.js:444699-444755 placement
function Ny() {
  return 2 + Math.max(bunStringWidth(re.circle), bunStringWidth(BLACK_CIRCLE)) + 1;
}
//@ chunk-18hwfzwa.js:444755-444764 placement
var mT = 2;
//@ chunk-18hwfzwa.js:444764-444877 placement = getStatusColor (1)
function getStatusColor(status) {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
    case "killed":
      return "error";
    default:
      return;
  }
}
//@ chunk-18hwfzwa.js:444973-446087 fingerprint = AgentLine (0.401)
function AgentLine(h, x, D, L) {
  let ee = h.type === "in_process_teammate" ? h.pendingUserMessages.length : h.pendingMessages.length,
    ke = ee > 0 ? `${ee} queued` : "",
    tokenCount = h.progress?.tokenCount,
    Be = h.progress?.lastActivity ? re.arrowDown : re.arrowUp,
    He = tokenCount !== void 0 && tokenCount > 0 ? `${Be} ${formatNumber(tokenCount)} tokens` : "";
  if (h.type === "in_process_teammate") {
    if (h.status === "running" && h.awaitingPlanApproval)
      return { elapsed: "awaiting approval", tokenText: "", queuedText: ke, queuedCount: ee };
    if (h.isIdle) return { elapsed: "idle", tokenText: "", queuedText: ke, queuedCount: ee };
    if (isTerminalTaskStatus(h.status)) {
      let kt = D ?? h.startTime,
        At = h.endTime ?? x;
      return {
        elapsed: formatDuration(Math.max(0, At - kt)),
        tokenText: He,
        queuedText: ke,
        queuedCount: ee,
      };
    }
    let rt = D ?? h.startTime;
    return { elapsed: formatDuration(Math.max(0, x - rt)), tokenText: He, queuedText: ke, queuedCount: ee };
  }
  let We = !isTerminalTaskStatus(h.status);
  if (We && h.isIdle) return { elapsed: "waiting", tokenText: "", queuedText: ke, queuedCount: ee };
  if (h.status === "completed" && L && !hasCompletedWithFindings(h))
    return { elapsed: "idle", tokenText: "", queuedText: ke, queuedCount: ee };
  let ze = h.totalPausedMs ?? 0,
    t3 = Math.max(0, We ? x - h.startTime - ze : (h.endTime ?? h.startTime) - h.startTime - ze);
  return { elapsed: formatDuration(t3), tokenText: He, queuedText: ke, queuedCount: ee };
}
/**
 * 页脚上方的后台任务面板组件：列出后台 agent / 队友 / 工作流任务行（排队数、token、状态色、限额暂停），处理选中、窗口滚动与"more below"。
 * showWorkflows 为 true 时同时列出运行中的工作流。
 */
//@ chunk-18hwfzwa.js:446087-452984 layout
function BackgroundTasksPanel(props) {
  let $ = w(60),
    D;
  if ($[0] !== props) ((D = props === void 0 ? {} : props), ($[0] = props), ($[1] = D));
  else D = $[1];
  let { showWorkflows: showWorkflows } = D,
    showWorkflowsFlag = showWorkflows === void 0 ? !1 : showWorkflows,
    tasks = useAppState(djt),
    Re = useMainLoopModel_3(),
    ultracode = useAppState(cjt),
    He;
  if ($[2] !== Re || $[3] !== ultracode)
    ((He = isUltracodeActive(ultracode, Re)), ($[2] = Re), ($[3] = ultracode), ($[4] = He));
  else He = $[4];
  let We = He,
    { columns: columns } = useTerminalSize(),
    Xe = Xre(),
    rt = Cr(),
    taskDecorations = useAppState(mjt),
    viewingAgentTaskId = useAppState(selectViewingAgentTaskId),
    agentNameRegistry = useAppState(fjt),
    slackTagConnected = useAppState(gjt),
    coordinatorTaskIndex = useAppState(hjt),
    Dt = useAppState(getTaskOutputDir),
    Lt = useAppState(Sjt),
    workflowFooterIndex = useAppState(bjt),
    Xt = useAppState(wjt),
    io = Dt ? coordinatorTaskIndex : void 0,
    so = useSetAppState(),
    po = useSetVoiceState();
  Me();
  let ao = getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId, Xt),
    any = Object.values(tasks).some(kjt),
    bo;
  if ($[5] !== showWorkflowsFlag || $[6] !== tasks)
    ((bo = showWorkflowsFlag ? runningWorkflowTasks(tasks) : []),
      ($[5] = showWorkflowsFlag),
      ($[6] = tasks),
      ($[7] = bo));
  else bo = $[7];
  let workflowTasks = bo,
    Bo = workflowTasks.length > 0,
    workflowRows;
  if ($[8] !== workflowTasks || $[9] !== We) {
    let Ho;
    if ($[11] !== We)
      ((Ho = (Io) => {
        let Wo = countWorkflowAgents(Io.workflowProgress, Io.agentCount);
        let mn = Io.status === "running" ? Io.rateLimitWait : void 0;
        let Cn = isTerminalTaskStatus(Io.status)
          ? getStatusColor(Io.status)
          : mn !== void 0
            ? "warning"
            : Wo.failedCount > 0
              ? "error"
              : void 0;
        return {
          workflow: Io,
          row: {
            name: Dr(Io.workflowName ?? Io.summary ?? Io.description ?? "Dynamic workflow"),
            bulletColor: Cn,
            doneAgents: Wo.done,
            totalAgents: Wo.total,
            totalTokens: Io.totalTokens,
            clock: Io,
            pausedStatuses: mn && S2o(mn.resetsAt),
          },
          warning: workflowSizeSummary({
            scheduledAgents: Wo.total,
            startedAgents: Wo.started,
            totalTokens: Io.totalTokens,
            ultracodeActive: We,
          }),
        };
      }),
        ($[11] = We),
        ($[12] = Ho));
    else Ho = $[12];
    workflowRows = workflowTasks.map(Ho);
    (($[8] = workflowTasks), ($[9] = We), ($[10] = workflowRows));
  } else workflowRows = $[10];
  let No = workflowRows,
    [vo] = y(Cjt),
    Ho,
    Yo;
  if ($[13] !== tasks || $[14] !== vo || $[15] !== No)
    ((Ho = () => {
      for (const kn of vo) {
        if (tasks[kn]?.type !== "local_workflow") vo.delete(kn);
      }
      for (const { workflow: workflow, warning: warning } of No) {
        if (warning && !isTerminalTaskStatus(workflow.status) && !vo.has(workflow.id))
          (vo.add(workflow.id),
            logFeatureOk("workflow_size_warning"),
            logEvent("tengu_workflow_size_warning_shown", {
              axis: fromEnum(warning.axis),
              scheduled_agents: warning.scheduledAgents,
              total_tokens: warning.totalTokens,
              projected_tokens: warning.projectedTokens,
              agent_cap: warning.agentCap,
              token_cap: warning.tokenCap,
              cap_from_guideline: warning.capFromGuideline,
            }));
      }
    }),
      (Yo = [No, tasks, vo]),
      ($[13] = tasks),
      ($[14] = vo),
      ($[15] = No),
      ($[16] = Ho),
      ($[17] = Yo));
  else ((Ho = $[16]), (Yo = $[17]));
  P(Ho, Yo);
  let Mn =
    Xe &&
    runningWorkflowTasks(tasks).some((Go) => {
      if (isTerminalTaskStatus(Go.status)) {
        return !1;
      }
      if (vo.has(Go.id)) {
        return !0;
      }
      let hn = countWorkflowAgents(Go.workflowProgress, Go.agentCount);
      return (
        workflowSizeSummary({
          scheduledAgents: hn.total,
          startedAgents: hn.started,
          totalTokens: Go.totalTokens,
          ultracodeActive: We,
        }) !== void 0
      );
    });
  usePluginInstallationStatus(
    WORKFLOW_SIZE_WARNING,
    "medium",
    Mn ? LARGE_WORKFLOW_STOP_HINT_PLAIN : null,
    W$e,
  );
  let [Xo, Sn] = y(_jt),
    $n;
  if ($[18] !== Xe || $[19] !== so || $[20] !== po || $[21] !== tasks || $[22] !== viewingAgentTaskId)
    (($n = () => {
      let now = Date.now();
      let _o = !1;
      let cn = [];
      let Dn = hasOtherActiveAgents(tasks);
      let wn = [];
      let mr = [];
      let Kn = collectAncestorTaskIds(tasks, viewingAgentTaskId);
      for (const Wn of Object.values(tasks)) {
        if (Wn.type === "local_workflow") {
          if (Wn.status !== "running" && (Wn.evictAfter ?? Infinity) <= now) po.evictTerminal(Wn.id);
          continue;
        }
        if (!Em(Wn)) {
          continue;
        }
        let Fr = Wn.type === "in_process_teammate" && Wn.evictAfterHeldBySibling === !0;
        if (isTerminalTaskStatus(Wn.status)) {
          if (
            Wn.type === "local_agent" &&
            Kn.has(Wn.id) &&
            Wn.evictAfter !== void 0 &&
            Wn.evictAfter > 0 &&
            Wn.evictAfter <= now + AP - 5000
          )
            mr.push(Wn.id);
          else if (Wn.evictAfter !== void 0 && Wn.evictAfter <= now) po.evictTerminal(Wn.id);
        } else if ((Dn || Fr) && Wn.isIdle && Wn.evictAfter !== void 0 && Wn.evictAfter > 0) {
          if (Dn !== Fr || Wn.evictAfter - now < AP / 2) wn.push(Wn.id);
        } else if (Wn.evictAfter !== void 0 && Wn.evictAfter > 0 && Wn.evictAfter <= now) cn.push(Wn.id);
        else if (!isTerminalTaskStatus(Wn.status) && !Wn.isIdle) _o = !0;
      }
      if (cn.length > 0 || wn.length > 0 || mr.length > 0)
        so((Zn) => {
          let Un;
          for (const dr of cn) {
            let or = Zn.tasks[dr];
            if (isTeammateDueForEviction(or, now, po)) {
              if (Un === void 0) Un = { ...Zn.tasks };
              Un[dr] = { ...or, evictAfter: 0 };
            }
          }
          for (const pr of wn) {
            let Qn = Zn.tasks[pr];
            if (isEvictingIdleTeammate(Qn)) {
              if (Un === void 0) Un = { ...Zn.tasks };
              Un[pr] = { ...Qn, evictAfter: now + AP, evictAfterHeldBySibling: Dn ? !0 : void 0 };
            }
          }
          for (const ur of mr) {
            let Ir = Zn.tasks[ur];
            if (Em(Ir) && isTerminalTaskStatus(Ir.status) && Ir.evictAfter !== void 0 && Ir.evictAfter > 0) {
              if (Un === void 0) Un = { ...Zn.tasks };
              Un[ur] = { ...Ir, evictAfter: now + AP };
            }
          }
          return Un ? { ...Zn, tasks: Un } : Zn;
        });
      if (_o && !Xe) Sn(now);
    }),
      ($[18] = Xe),
      ($[19] = so),
      ($[20] = po),
      ($[21] = tasks),
      ($[22] = viewingAgentTaskId),
      ($[23] = $n));
  else $n = $[23];
  useInterval($n, any || Bo ? 1000 : null);
  let Pr;
  if ($[24] !== agentNameRegistry) {
    Pr = new Map();
    for (const [ts, Gn] of agentNameRegistry) Pr.set(Gn, Dr(ts));
    (($[24] = agentNameRegistry), ($[25] = Pr));
  } else Pr = $[25];
  let Ur = Pr,
    Zr;
  if ($[26] !== tasks || $[27] !== viewingAgentTaskId)
    ((Zr = viewingAgentTaskId !== void 0 && Em(tasks[viewingAgentTaskId])),
      ($[26] = tasks),
      ($[27] = viewingAgentTaskId),
      ($[28] = Zr));
  else Zr = $[28];
  let wr = Zr;
  if (Xe || (ao.length === 0 && !Bo && !wr)) {
    return null;
  }
  let zr = io ?? 0,
    fr = clamp(
      zr >= 1 ? zr - 1 : ao.findIndex((_r) => _r.id === viewingAgentTaskId),
      0,
      Math.max(0, ao.length - 1),
    ),
    {
      windowStart: windowStart,
      windowEnd: windowEnd,
      moreAbove: moreAbove,
      moreBelow: moreBelow,
    } = computeScrollWindow(fr, ao.length, Az),
    ms = collectAncestorTaskIds(tasks, viewingAgentTaskId),
    mapped = ao.map((Xs) =>
      ou(Xs) || ms.has(Xs.id)
        ? 0
        : countVisibleDescendants(tasks, extractTeammateTranscriptsFromTasks_2(Xs), ms),
    ),
    mapped_2 = ao.map((is) => (ou(is) ? 0 : ancestorDepth(tasks, is, ms))),
    Ci = Tjt,
    min = Math.min(
      28,
      Math.max(
        4,
        ...ao.map((oi, Oi) =>
          !ou(oi) && taskDecorations[oi.id]?.content === void 0
            ? 2 * mapped_2[Oi] + bunStringWidth(Ur.get(oi.id) ?? Yz(oi)) + bunStringWidth(Ci(mapped[Oi]))
            : 0,
        ),
        ...No.map(Ajt),
      ),
    ),
    Zi;
  if ($[29] !== Ur || $[30] !== Xo || $[31] !== rt)
    ((Zi = (da) =>
      ou(da) ? void 0 : AgentLine(da, Xo, rt.getState().transcripts[da.id]?.turnStartTime, Ur.has(da.id))),
      ($[29] = Ur),
      ($[30] = Xo),
      ($[31] = rt),
      ($[32] = Zi));
  else Zi = $[32];
  let mapped_3 = ao.map(Zi),
    ls = (ps) =>
      Math.max(
        0,
        ...mapped_3.map((xs, kr) =>
          xs !== void 0 && taskDecorations[ao[kr].id]?.content === void 0
            ? bunStringWidth(
                [xs.elapsed, xs.tokenText, xs.queuedText, ps[kr]?.label].filter(Boolean).join(" \xB7 "),
              )
            : 0,
        ),
      ),
    Ms;
  if ($[33] !== slackTagConnected)
    ((Ms = (qs) => (ou(qs) ? void 0 : wqe(qs, slackTagConnected))),
      ($[33] = slackTagConnected),
      ($[34] = Ms));
  else Ms = $[34];
  let mapped_4 = ao.map(Ms),
    es = ls(mapped_4);
  if (mapped_4.some(Boolean) && Ny() + min + 3 + es > columns - mT)
    ((mapped_4 = mapped_4.map(Mjt)), (es = ls(mapped_4)));
  const ds = Box,
    Hs = "column",
    _s = 1,
    fs = mT,
    ua =
      (ao.length > 0 || wr) &&
      e(MainLine, {
        isSelected: io === 0,
        isViewed: viewingAgentTaskId === void 0,
        labelWidth: min,
        moreAbove: moreAbove,
        onClick: () => exitTeammateView((ii) => so(selectTaskRowUpdater(0, ii))),
      }),
    mapped_5 = ao.slice(windowStart, windowEnd).map((La, Xa) => {
      let dl = windowStart + Xa;
      if (ou(La)) {
        return e(
          IdleAgentsSummaryRow,
          {
            count: La.taskIds.length,
            isSelected: io === dl + 1,
            onClick: () => so(selectTaskRowUpdater(dl + 1, SU)),
          },
          La.id,
        );
      }
      let Vl = La;
      let Hd = mapped_2[dl];
      let Ss = nearestVisibleAncestorId(tasks, Vl, ms);
      let Ws = Ss !== void 0 && ao.findIndex((yi) => yi.id === Ss) >= windowStart;
      let za;
      if (Hd > 0 && Ws) {
        let any = ao.slice(dl + 1).some((cl) => !ou(cl) && nearestVisibleAncestorId(tasks, cl, ms) === Ss);
        za = repeatString("  ", Hd - 1) + (any ? _S.branch : _S.last) + " ";
      }
      let as = mapped_4[dl];
      return e(
        CoordinatorTaskRow,
        {
          task: Vl,
          name: Ur.get(Vl.id),
          link: as,
          decoration: taskDecorations[Vl.id],
          isSelected: io === dl + 1,
          isViewed: viewingAgentTaskId === Vl.id,
          treeConnector: za,
          descendantSuffix: Ci(mapped[dl]),
          labelWidth: min,
          statusWidth: es,
          statusParts: mapped_3[dl],
          onClick: (pi) => {
            if (as !== void 0 && pi.hyperlinkUrl === as.url) {
              return pi.allowDefault();
            }
            enterTeammateView(Vl.id, (qa) => so(selectTaskRowUpdater(dl + 1, qa)));
          },
        },
        Vl.id,
      );
    });
  let $l;
  if ($[35] !== moreBelow || $[36] !== ao.length)
    (($l =
      ao.length > Az &&
      e(Box, {
        justifyContent: "flex-start",
        children: e(Text, {
          dimColor: !0,
          children: moreBelow > 0 ? `  ${DOWN_ARROW} ${moreBelow} more` : " ",
        }),
      })),
      ($[35] = moreBelow),
      ($[36] = ao.length),
      ($[37] = $l));
  else $l = $[37];
  let Yi;
  if (
    $[38] !== columns ||
    $[39] !== min ||
    $[40] !== so ||
    $[41] !== vo ||
    $[42] !== workflowFooterIndex ||
    $[43] !== No ||
    $[44] !== Lt
  ) {
    let El;
    if (
      $[46] !== columns ||
      $[47] !== min ||
      $[48] !== so ||
      $[49] !== vo ||
      $[50] !== workflowFooterIndex ||
      $[51] !== Lt
    )
      ((El = (Ll, _c) => {
        let { workflow: workflow, row: row, warning: warning } = Ll;
        return e(
          AgentStatusRow,
          {
            row: row,
            isWarned: !isTerminalTaskStatus(workflow.status) && (warning !== void 0 || vo.has(workflow.id)),
            prefixWidth: Ny(),
            labelWidth: min,
            rowWidth: columns - mT,
            isSelected: Lt && workflowFooterIndex === _c,
            onClick: () =>
              so((Ka) =>
                Ka.workflowDetail?.taskId === workflow.id
                  ? Ka
                  : { ...Ka, workflowDetail: { taskId: workflow.id } },
              ),
          },
          workflow.id,
        );
      }),
        ($[46] = columns),
        ($[47] = min),
        ($[48] = so),
        ($[49] = vo),
        ($[50] = workflowFooterIndex),
        ($[51] = Lt),
        ($[52] = El));
    else El = $[52];
    Yi = No.map(El);
    (($[38] = columns),
      ($[39] = min),
      ($[40] = so),
      ($[41] = vo),
      ($[42] = workflowFooterIndex),
      ($[43] = No),
      ($[44] = Lt),
      ($[45] = Yi));
  } else Yi = $[45];
  let El;
  if ($[53] !== ds || $[54] !== fs || $[55] !== ua || $[56] !== mapped_5 || $[57] !== $l || $[58] !== Yi)
    ((El = r(ds, { flexDirection: Hs, marginTop: _s, paddingRight: fs, children: [ua, mapped_5, $l, Yi] })),
      ($[53] = ds),
      ($[54] = fs),
      ($[55] = ua),
      ($[56] = mapped_5),
      ($[57] = $l),
      ($[58] = Yi),
      ($[59] = El));
  else El = $[59];
  return El;
}
/**
 * 任务面板获得焦点时页脚显示的快捷键提示行：按当前选中项（主会话 / agent / 分组 / 工作流）显示 select、view、stop all 等按键。
 */
//@ chunk-18hwfzwa.js:452984-455430 layout
function TaskPanelFooterHints() {
  let $ = w(39),
    tasks = useAppState(Ijt),
    taskDecorations = useAppState(Ejt),
    viewingAgentTaskId = useAppState(selectViewingAgentTaskId_2),
    viewSelectionMode = useAppState(stepTeammateSelection),
    footerSelection = useAppState(selectFooterSelection),
    coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex_2),
    workflowFooterIndex = useAppState(selectWorkflowFooterIndex),
    Be = useAppState(Bjt),
    He = useShortcutDisplay_2("chat:killAgents", "Chat", TASK_PANEL_KEYS.stopAll),
    We = useShortcutDisplay("footer:openSelected", "Footer", TASK_PANEL_KEYS.open),
    ze = useShortcutDisplay("footer:close", "Footer", TASK_PANEL_KEYS.close),
    Xe = useShortcutDisplay("footer:clearSelection", "Footer", TASK_PANEL_KEYS.collapse);
  const rt = useShortcutDisplayText("footer:up", "Footer", TASK_PANEL_KEYS.select[0]),
    kt = useShortcutDisplayText("footer:down", "Footer", TASK_PANEL_KEYS.select[1]);
  let It;
  if ($[0] !== rt || $[1] !== kt) ((It = [rt, kt]), ($[0] = rt), ($[1] = kt), ($[2] = It));
  else It = $[2];
  let Ot = It,
    Et;
  if ($[3] !== Ot)
    ((Et = Ot.some(Boolean) && e(KeyboardShortcutHint, { chord: Ot, action: "select" })),
      ($[3] = Ot),
      ($[4] = Et));
  else Et = $[4];
  let Dt = Et,
    { columns: columns } = useTerminalSize(),
    oo;
  if (footerSelection === "tasks" && coordinatorTaskIndex >= 0) {
    if (
      $[5] !== ze ||
      $[6] !== Xe ||
      $[7] !== columns ||
      $[8] !== coordinatorTaskIndex ||
      $[9] !== Be ||
      $[10] !== He ||
      $[11] !== We ||
      $[12] !== Ot ||
      $[13] !== Dt ||
      $[14] !== taskDecorations ||
      $[15] !== tasks ||
      $[16] !== viewSelectionMode ||
      $[17] !== viewingAgentTaskId
    ) {
      let Xt = getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId, Be);
      let io = coordinatorTaskIndex >= 1 ? Xt[coordinatorTaskIndex - 1] : void 0;
      let so =
        io !== void 0 &&
        hU(io, { viewSelectionMode: viewSelectionMode, viewingAgentTaskId: viewingAgentTaskId });
      let po = coordinatorTaskIndex === 0 && viewSelectionMode !== "viewing-agent";
      if (io === void 0) {
        let ao;
        if ($[19] !== po || $[20] !== We)
          ((ao = We && !po && e(KeyboardShortcutHint, { chord: We, action: "view" })),
            ($[19] = po),
            ($[20] = We),
            ($[21] = ao));
        else ao = $[21];
        let co;
        if ($[22] !== Dt || $[23] !== ao)
          ((co = r(Byline, { children: [Dt, ao] })), ($[22] = Dt), ($[23] = ao), ($[24] = co));
        else co = $[24];
        oo = co;
      } else if (ou(io)) {
        let ao;
        if ($[25] !== We)
          ((ao = We && e(KeyboardShortcutHint, { chord: We, action: "expand" })), ($[25] = We), ($[26] = ao));
        else ao = $[26];
        let co;
        if ($[27] !== ao) ((co = e(Byline, { children: ao })), ($[27] = ao), ($[28] = co));
        else co = $[28];
        oo = co;
      } else {
        const ao = hO(io) ? "stop" : "clear";
        const co = Be && yU(Xt, viewingAgentTaskId);
        let bo;
        if ($[29] !== tasks) ((bo = count(Object.values(tasks), Hjt)), ($[29] = tasks), ($[30] = bo));
        else bo = $[30];
        let Ao = { onViewedRow: so, closeAction: ao, showCollapse: co, showStopAll: bo > 1 };
        let Bo = CoordinatorPanelKeys({
          ...Ao,
          keys: { open: We, close: ze, collapse: Xe, select: Ot, stopAll: He },
        });
        let Ro = zz(Bo) - zz(CoordinatorPanelKeys({ ...Ao, keys: TASK_PANEL_KEYS }));
        let Ho = columns >= 90 + Math.max(0, Ro) ? Bo : Bo.filter(Ujt);
        oo = e(Byline, { children: Ho.map($jt) });
      }
      (($[5] = ze),
        ($[6] = Xe),
        ($[7] = columns),
        ($[8] = coordinatorTaskIndex),
        ($[9] = Be),
        ($[10] = He),
        ($[11] = We),
        ($[12] = Ot),
        ($[13] = Dt),
        ($[14] = taskDecorations),
        ($[15] = tasks),
        ($[16] = viewSelectionMode),
        ($[17] = viewingAgentTaskId),
        ($[18] = oo));
    } else oo = $[18];
  } else if (footerSelection === "workflows") {
    let ao;
    if ($[31] !== ze || $[32] !== We || $[33] !== Dt || $[34] !== tasks || $[35] !== workflowFooterIndex) {
      let Io = runningWorkflowTasks(tasks)[workflowFooterIndex];
      ao = Io
        ? r(Byline, {
            children: [
              We && e(KeyboardShortcutHint, { chord: We, action: "view" }),
              ze &&
                e(KeyboardShortcutHint, {
                  chord: ze,
                  action: isTerminalTaskStatus(Io.status) ? "clear" : "stop",
                }),
            ],
          })
        : r(Byline, { children: [Dt, We && e(KeyboardShortcutHint, { chord: We, action: "view" })] });
      (($[31] = ze),
        ($[32] = We),
        ($[33] = Dt),
        ($[34] = tasks),
        ($[35] = workflowFooterIndex),
        ($[36] = ao));
    } else ao = $[36];
    oo = ao;
  }
  let ao;
  if ($[37] !== oo)
    ((ao = oo !== void 0 ? e(Text, { dimColor: !0, wrap: "truncate", children: oo }) : null),
      ($[37] = oo),
      ($[38] = ao));
  else ao = $[38];
  return ao;
}
//@ chunk-18hwfzwa.js:455430-455482 layout
function useVisibleAgentTaskCount() {
  let [h] = y(makeVisibleTaskCountSelector),
    x = useAppState(h);
  return Xre() ? 0 : x;
}
/**
 * 生成带缓存的 AppState 选择器：返回可见后台任务行数（有任务或正在查看 agent 时 +1 主会话行），tasks 浅相等时复用上次结果。
 */
//@ chunk-18hwfzwa.js:455482-456117 layout
function makeVisibleTaskCountSelector() {
  let previous;
  return (state) => {
    let panelHidden = isCoordinatorPanelActive();
    if (
      previous !== void 0 &&
      previous.taskDecorations === state.taskDecorations &&
      previous.viewingAgentTaskId === state.viewingAgentTaskId &&
      previous.idleTeammatesExpanded === state.idleTeammatesExpanded &&
      previous.panelHidden === panelHidden &&
      (previous.tasks === state.tasks || shallowEqualTaskMaps(previous.tasks, state.tasks))
    )
      return ((previous.tasks = state.tasks), previous.count);
    let visibleCount = getVisibleBackgroundTasks(
        state.tasks,
        state.taskDecorations,
        state.viewingAgentTaskId,
        state.idleTeammatesExpanded ?? !1,
      ).length,
      ee = state.viewingAgentTaskId !== void 0 && Em(state.tasks[state.viewingAgentTaskId]),
      count = visibleCount > 0 || ee ? visibleCount + 1 : 0;
    return (
      (previous = {
        tasks: state.tasks,
        taskDecorations: state.taskDecorations,
        viewingAgentTaskId: state.viewingAgentTaskId,
        idleTeammatesExpanded: state.idleTeammatesExpanded,
        panelHidden: panelHidden,
        count: count,
      }),
      count
    );
  };
}
//@ chunk-18hwfzwa.js:456117-457026 fingerprint = MainLine (0.512)
function MainLine(t0) {
  let $ = w(16),
    {
      isSelected: isSelected,
      isViewed: isViewed,
      labelWidth: labelWidth,
      moreAbove: moreAbove,
      onClick: onClick,
    } = t0,
    [Re, Be] = y(!1),
    He = useStrayClickGuarded(onClick),
    We = isSelected || Re ? re.pointer + " " : "  ",
    ze = isViewed ? BLACK_CIRCLE : re.circle,
    Xe = moreAbove > 0 ? `${UP_ARROW} ${moreAbove} more` : "",
    kt,
    At;
  if ($[0] === MEMO_CACHE_SENTINEL) ((kt = () => Be(!0)), (At = () => Be(!1)), ($[0] = kt), ($[1] = At));
  else ((kt = $[0]), (At = $[1]));
  const It = labelWidth + Ny(),
    t3 = !isSelected && !isViewed && !Re;
  let Et;
  if ($[2] !== ze || $[3] !== isViewed || $[4] !== We || $[5] !== t3)
    ((Et = r(Text, { dimColor: t3, bold: isViewed, children: [We, ze, " main"] })),
      ($[2] = ze),
      ($[3] = isViewed),
      ($[4] = We),
      ($[5] = t3),
      ($[6] = Et));
  else Et = $[6];
  let Dt;
  if ($[7] !== It || $[8] !== Et)
    ((Dt = e(Box, { width: It, flexShrink: 0, children: Et })), ($[7] = It), ($[8] = Et), ($[9] = Dt));
  else Dt = $[9];
  let Lt;
  if ($[10] !== Xe) ((Lt = Xe && e(Text, { dimColor: !0, children: Xe })), ($[10] = Xe), ($[11] = Lt));
  else Lt = $[11];
  let oo;
  if ($[12] !== He || $[13] !== Dt || $[14] !== Lt)
    ((oo = r(Box, {
      justifyContent: "space-between",
      onClick: He,
      onMouseEnter: kt,
      onMouseLeave: At,
      children: [Dt, Lt],
    })),
      ($[12] = He),
      ($[13] = Dt),
      ($[14] = Lt),
      ($[15] = oo));
  else oo = $[15];
  return oo;
}
/**
 * 协调者模式代理状态面板中的单行任务。
 */
//@ chunk-18hwfzwa.js:457026-461149 placement
function CoordinatorTaskRow(h) {
  let $ = w(88),
    {
      task: task,
      name: D,
      link: link,
      decoration: decoration,
      labelWidth: labelWidth,
      statusWidth: statusWidth,
      statusParts: statusParts,
      isSelected: isSelected,
      isViewed: isViewed,
      treeConnector: treeConnector,
      descendantSuffix: descendantSuffix,
      onClick: onClick,
    } = h,
    [kt, At] = y(!1),
    It = useStrayClickGuarded(onClick),
    {
      elapsed: elapsed,
      tokenText: tokenText,
      queuedText: queuedText,
      queuedCount: queuedCount,
    } = statusParts,
    Xt;
  if ($[0] !== task.description || $[1] !== task.progress?.summary)
    ((Xt = Dr(task.progress?.summary ?? "") || Dr(task.description)),
      ($[0] = task.description),
      ($[1] = task.progress?.summary),
      ($[2] = Xt));
  else Xt = $[2];
  let io = Xt,
    so = isSelected || kt,
    po = so ? re.pointer + " " : "  ",
    ao = isViewed ? BLACK_CIRCLE : re.circle,
    co;
  if ($[3] !== task) ((co = hO(task) ? void 0 : getStatusColor(task.status)), ($[3] = task), ($[4] = co));
  else co = $[4];
  let bo = co,
    Ao = !so && !isViewed,
    Bo;
  if ($[5] !== Ao || $[6] !== isViewed || $[7] !== po)
    ((Bo = e(Text, { dimColor: Ao, bold: isViewed, children: po })),
      ($[5] = Ao),
      ($[6] = isViewed),
      ($[7] = po),
      ($[8] = Bo));
  else Bo = $[8];
  let Ro;
  if ($[9] !== Ao || $[10] !== treeConnector)
    ((Ro = treeConnector !== void 0 && e(Text, { dimColor: Ao, children: treeConnector })),
      ($[9] = Ao),
      ($[10] = treeConnector),
      ($[11] = Ro));
  else Ro = $[11];
  const Ho = !bo && Ao;
  let Io;
  if ($[12] !== ao || $[13] !== bo || $[14] !== isViewed || $[15] !== Ho)
    ((Io = r(Text, { color: bo, dimColor: Ho, bold: isViewed, children: [ao, " "] })),
      ($[12] = ao),
      ($[13] = bo),
      ($[14] = isViewed),
      ($[15] = Ho),
      ($[16] = Io));
  else Io = $[16];
  let Wo;
  if ($[17] !== Bo || $[18] !== Ro || $[19] !== Io)
    ((Wo = r(Fragment, { children: [Bo, Ro, Io] })), ($[17] = Bo), ($[18] = Ro), ($[19] = Io), ($[20] = Wo));
  else Wo = $[20];
  let mn = Wo,
    Cn;
  if ($[21] !== treeConnector)
    ((Cn = treeConnector ? bunStringWidth(treeConnector) : 0), ($[21] = treeConnector), ($[22] = Cn));
  else Cn = $[22];
  let No = Cn,
    vo = Ny() + No,
    max = Math.max(0, labelWidth - No);
  if (decoration?.content !== void 0) {
    let kn, Fn;
    if ($[23] === MEMO_CACHE_SENTINEL) ((Fn = () => At(!0)), (kn = () => At(!1)), ($[23] = kn), ($[24] = Fn));
    else ((kn = $[23]), (Fn = $[24]));
    let bn;
    if ($[25] !== mn || $[26] !== vo)
      ((bn = e(Box, { width: vo, flexShrink: 0, children: mn })), ($[25] = mn), ($[26] = vo), ($[27] = bn));
    else bn = $[27];
    let Go;
    if ($[28] !== decoration.content)
      ((Go = e(Ansi, { children: decoration.content })), ($[28] = decoration.content), ($[29] = Go));
    else Go = $[29];
    let hn;
    if ($[30] !== Ao || $[31] !== isViewed || $[32] !== Go)
      ((hn = e(Box, {
        flexGrow: 1,
        width: 0,
        children: e(Text, { dimColor: Ao, bold: isViewed, wrap: "truncate", children: Go }),
      })),
        ($[30] = Ao),
        ($[31] = isViewed),
        ($[32] = Go),
        ($[33] = hn));
    else hn = $[33];
    let Mn;
    if ($[34] !== It || $[35] !== bn || $[36] !== hn)
      ((Mn = r(Box, { onClick: It, onMouseEnter: Fn, onMouseLeave: kn, children: [bn, hn] })),
        ($[34] = It),
        ($[35] = bn),
        ($[36] = hn),
        ($[37] = Mn));
    else Mn = $[37];
    return Mn;
  }
  let kn, Fn;
  if ($[38] === MEMO_CACHE_SENTINEL) ((Fn = () => At(!0)), (kn = () => At(!1)), ($[38] = kn), ($[39] = Fn));
  else ((kn = $[38]), (Fn = $[39]));
  let bn;
  if ($[40] !== mn || $[41] !== vo)
    ((bn = e(Box, { width: vo, flexShrink: 0, children: mn })), ($[40] = mn), ($[41] = vo), ($[42] = bn));
  else bn = $[42];
  const Go = !D && Ao;
  let hn;
  if ($[43] !== D || $[44] !== task) ((hn = D ?? Yz(task)), ($[43] = D), ($[44] = task), ($[45] = hn));
  else hn = $[45];
  let Mn;
  if ($[46] !== descendantSuffix)
    ((Mn = descendantSuffix && e(Text, { dimColor: !0, children: descendantSuffix })),
      ($[46] = descendantSuffix),
      ($[47] = Mn));
  else Mn = $[47];
  let Xo;
  if ($[48] !== isViewed || $[49] !== Go || $[50] !== hn || $[51] !== Mn)
    ((Xo = r(Text, { bold: isViewed, dimColor: Go, wrap: "truncate", children: [hn, Mn] })),
      ($[48] = isViewed),
      ($[49] = Go),
      ($[50] = hn),
      ($[51] = Mn),
      ($[52] = Xo));
  else Xo = $[52];
  let Sn;
  if ($[53] !== max || $[54] !== Xo)
    ((Sn = e(Box, { width: max, flexShrink: 0, children: Xo })), ($[53] = max), ($[54] = Xo), ($[55] = Sn));
  else Sn = $[55];
  let $n;
  if ($[56] !== Ao || $[57] !== io || $[58] !== isViewed)
    (($n = e(Box, {
      flexGrow: 1,
      width: 0,
      paddingLeft: 2,
      children: e(Text, { dimColor: Ao, bold: isViewed, wrap: "truncate", children: io }),
    })),
      ($[56] = Ao),
      ($[57] = io),
      ($[58] = isViewed),
      ($[59] = $n));
  else $n = $[59];
  let on;
  if ($[60] !== elapsed || $[61] !== tokenText)
    ((on = [elapsed, tokenText].filter(Boolean)), ($[60] = elapsed), ($[61] = tokenText), ($[62] = on));
  else on = $[62];
  const joined = on.join(" \xB7 ");
  let cn;
  if ($[63] !== elapsed || $[64] !== queuedCount || $[65] !== queuedText || $[66] !== tokenText)
    ((cn =
      queuedCount > 0 &&
      r(Text, { color: "warning", children: [elapsed || tokenText ? " \xB7 " : "", queuedText] })),
      ($[63] = elapsed),
      ($[64] = queuedCount),
      ($[65] = queuedText),
      ($[66] = tokenText),
      ($[67] = cn));
  else cn = $[67];
  let Dn;
  if ($[68] !== elapsed || $[69] !== link || $[70] !== queuedCount || $[71] !== tokenText)
    ((Dn =
      link &&
      r(Fragment, {
        children: [
          elapsed || tokenText || queuedCount > 0 ? " \xB7 " : "",
          e(Link, { url: link.url, children: link.label }),
        ],
      })),
      ($[68] = elapsed),
      ($[69] = link),
      ($[70] = queuedCount),
      ($[71] = tokenText),
      ($[72] = Dn));
  else Dn = $[72];
  let wn;
  if ($[73] !== Ao || $[74] !== isViewed || $[75] !== joined || $[76] !== cn || $[77] !== Dn)
    ((wn = r(Text, { dimColor: Ao, bold: isViewed, children: [joined, cn, Dn] })),
      ($[73] = Ao),
      ($[74] = isViewed),
      ($[75] = joined),
      ($[76] = cn),
      ($[77] = Dn),
      ($[78] = wn));
  else wn = $[78];
  let mr;
  if ($[79] !== statusWidth || $[80] !== wn)
    ((mr = e(Box, {
      minWidth: statusWidth,
      flexShrink: 0,
      marginLeft: 1,
      justifyContent: "flex-end",
      children: wn,
    })),
      ($[79] = statusWidth),
      ($[80] = wn),
      ($[81] = mr));
  else mr = $[81];
  let Kn;
  if ($[82] !== It || $[83] !== bn || $[84] !== Sn || $[85] !== $n || $[86] !== mr)
    ((Kn = r(Box, { onClick: It, onMouseEnter: Fn, onMouseLeave: kn, children: [bn, Sn, $n, mr] })),
      ($[82] = It),
      ($[83] = bn),
      ($[84] = Sn),
      ($[85] = $n),
      ($[86] = mr),
      ($[87] = Kn));
  else Kn = $[87];
  return Kn;
}
//@ chunk-18hwfzwa.js:461149-462112 placement
function IdleAgentsSummaryRow(h) {
  let $ = w(18),
    { count: count, isSelected: isSelected, onClick: onClick } = h,
    [ee, ke] = y(!1),
    Re = useStrayClickGuarded(onClick),
    Be = isSelected || ee,
    He = Be ? re.pointer + " " : "  ",
    We = !Be,
    Xe,
    rt;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Xe = () => ke(!0)), (rt = () => ke(!1)), ($[0] = Xe), ($[1] = rt));
  else ((Xe = $[0]), (rt = $[1]));
  let kt;
  if ($[2] === MEMO_CACHE_SENTINEL) ((kt = Ny()), ($[2] = kt));
  else kt = $[2];
  let At;
  if ($[3] !== We || $[4] !== He)
    ((At = e(Text, { dimColor: We, children: He })), ($[3] = We), ($[4] = He), ($[5] = At));
  else At = $[5];
  let It;
  if ($[6] !== We) ((It = r(Text, { dimColor: We, children: [re.circle, " "] })), ($[6] = We), ($[7] = It));
  else It = $[7];
  let Ot;
  if ($[8] !== At || $[9] !== It)
    ((Ot = r(Box, { width: kt, flexShrink: 0, children: [At, It] })), ($[8] = At), ($[9] = It), ($[10] = Ot));
  else Ot = $[10];
  const Et = count === 1 ? "1 idle agent" : `${count} idle agents`;
  let Dt;
  if ($[11] !== We || $[12] !== Et)
    ((Dt = e(Text, { dimColor: We, wrap: "truncate", children: Et })),
      ($[11] = We),
      ($[12] = Et),
      ($[13] = Dt));
  else Dt = $[13];
  let Lt;
  if ($[14] !== Re || $[15] !== Ot || $[16] !== Dt)
    ((Lt = r(Box, { onClick: Re, onMouseEnter: Xe, onMouseLeave: rt, children: [Ot, Dt] })),
      ($[14] = Re),
      ($[15] = Ot),
      ($[16] = Dt),
      ($[17] = Lt));
  else Lt = $[17];
  return Lt;
}
//@ chunk-18hwfzwa.js:462112-462270 placement
function useStrayClickGuarded(h) {
  let $ = w(3),
    x = useStrayClickGuard();
  if (h === void 0) {
    return;
  }
  let L;
  if ($[0] !== h || $[1] !== x)
    ((L = (ee) => {
      if (x(ee)) {
        return;
      }
      h(ee);
    }),
      ($[0] = h),
      ($[1] = x),
      ($[2] = L));
  else L = $[2];
  return L;
}
//@ chunk-18hwfzwa.js:462270-462409 placement
var TASK_PANEL_KEYS = {
    open: "enter",
    close: "x",
    collapse: "escape",
    select: ["up", "down"],
    stopAll: "ctrl+x ctrl+k",
  },
  STOP_ALL_AGENTS_LABEL = "stop all agents",
  LOWER_KEY_CASE = { keyCase: "lower" };
//@ chunk-18hwfzwa.js:462409-462731 placement
function CoordinatorPanelKeys({
  keys: keys,
  onViewedRow: onViewedRow,
  closeAction: closeAction,
  showCollapse: showCollapse,
  showStopAll: showStopAll,
}) {
  let ke = onViewedRow
    ? [{ chord: keys.select, action: "select" }]
    : [
        { chord: keys.open, action: "view" },
        { chord: keys.close, action: closeAction },
      ];
  if (showCollapse) ke.push({ chord: keys.collapse, action: "collapse" });
  if (showStopAll) ke.push({ chord: keys.stopAll, action: STOP_ALL_AGENTS_LABEL, format: LOWER_KEY_CASE });
  return ke.filter((Re) => formatShortcutHint(Re) !== "");
}
//@ chunk-18hwfzwa.js:462731-462782 placement
function zz(h) {
  return bunStringWidth(h.map(formatShortcutHint).join(" \xB7 "));
}
//@ chunk-18hwfzwa.js:462782-462807 placement
function W$e(h) {
  return h;
}
//@ chunk-18hwfzwa.js:462807-462811 placement
j();
/**
 * 返回一个按键处理器：只在动作被 Chat 上下文绑定遮蔽的 Footer 动作时调用回调。
 */
//@ chunk-18hwfzwa.js:462811-462929 placement
function useShadowedFooterActionHandler(h) {
  let x = useKeybindingContext()?.bindings,
    D = Q(() => (x ? findShadowedActions("Footer", "Chat", x) : new Set()), [x]);
  return ce((L) => D.has(L) && h(), [D, h]);
}
/**
 * 注册 Chat 上下文的消息操作快捷键，但按键归 Footer 所有时让给 Footer 处理。
 */
//@ chunk-18hwfzwa.js:462929-463038 placement
function useFooterAwareMessageActions(h, { isActive: isActive, footerOwnsKeyOf: footerOwnsKeyOf }) {
  MessageActionsKeybindings(
    xr(h, (L, ee) => () => (footerOwnsKeyOf(ee) ? !1 : L())),
    { context: "Chat", isActive: isActive },
  );
}
//@ chunk-e6aww6q8.js:4007333-4007709 callgraph-witnessed = CoordinatorTaskPanel (0.123)
async function showAgentTaskView(e, n) {
  if (n.agentId === void 0) return (exitTeammateView((h) => e.setState(h)), "shown");
  let r = findAgentTask(e.getState().tasks, n.agentId);
  if (r === void 0) return "unknown";
  let viewingAgentTaskId = teammateRowState(r);
  if (viewingAgentTaskId !== void 0) return viewingAgentTaskId;
  return (
    enterTeammateView(r.id, (s_0) => e.setState(s_0)),
    await waitForStoreState(
      e,
      (s_1) => {
        let y = s_1.tasks[r.id];
        return !(isLocalAgent(y) && y.retain && !y.diskLoaded);
      },
      { timeoutMs: eHn },
    ),
    e.getState().viewingAgentTaskId === r.id ? "shown" : "moved"
  );
}

export {
  hHe,
  useFooterAwareMessageActions,
  showAgentTaskView,
  Em,
  useShadowedFooterActionHandler,
  useVisibleAgentTaskCount,
  TaskPanelFooterHints,
  hasEvictableIdleSubagent,
  getVisibleBackgroundTasks,
  ou,
  remapTaskPanelIndex,
  SU,
  yU,
  hU,
  Ny,
  mT,
  collectAncestorTaskIds,
  BackgroundTasksPanel,
};
