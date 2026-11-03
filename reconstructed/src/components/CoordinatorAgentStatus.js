/**
 * components/CoordinatorAgentStatus.tsx
 *
 * 协调者/队友任务面板：列出后台 agent/队友/工作流任务行（排队数、token、状态），处理面板选择与 chat:killAgents 等按键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CoordinatorAgentStatus.tsx
 * pieces: chunk-18hwfzwa.js (75), chunk-e6aww6q8.js (2)
 * attribution: fingerprint 4, placement 63, layout 9, callgraph-witnessed 1
 */
import { listUncarriedLaunchSettings } from "../services/daemon/relaunchArgs.js";
import { getForkRestrictedLaunchConfig } from "../bootstrap/state.js";
import { hasRunningBackgroundTask } from "../tasks/backgroundTaskLabels.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { y, P, init_react_production, Q, ce } from "../../vendor/react/cjs/react.production.js";
import { useStrayClickGuard } from "./CustomSelect/strayClickGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { ElapsedClock, countWorkflowAgents } from "./workflow/WorkflowProgress.js";
import { formatBarElapsed, formatNumber, formatDuration } from "../utils/format.js";
import { useIsScreenReaderEnabled, Decorative } from "../ink/components/ErrorBoundary.js";
import {
  emptyWorkflowBarSummary,
  LARGE_WORKFLOW_STOP_HINT,
  LARGE_WORKFLOW_LABEL,
  LARGE_WORKFLOW_ICON,
  runningWorkflowTasks,
  workflowSizeSummary,
  LARGE_WORKFLOW_STOP_HINT_PLAIN,
  useShortcutDisplayText,
} from "./Spinner/workflowStatus.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import {
  SPINNER_PADDING,
  SPINNER_MAX_LINES,
  SPINNER_INDENT,
  SPINNER_SEPARATOR,
} from "./Spinner/SpinnerAnimationRow.js";
import { clamp } from "../ink/screen.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { PAUSE_GLYPH, BLACK_CIRCLE, DOWN_ARROW, UP_ARROW } from "../utils/permissions/autoModeRulesPrompt.js";
import { ProgressBar } from "./design-system/ProgressBar.js";
import { isTerminalTaskStatus } from "../Task.js";
import { isTaskStillActive } from "./tasks/BackgroundTaskStatus.js";
import { KeyboardShortcutHint, formatShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import {
  isPanelAgentTask,
  isCompletedBackgroundAgent,
  isMainSessionTask as isMainSessionTask_2,
} from "../tasks/taskKinds.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { isIdleCompletedSubagent } from "../tasks/LocalMainSessionTask.js";
import { collapseWhitespace, repeatString } from "../utils/stringUtils.js";
import { hasRunningBackgroundWorkForAgent } from "../tasks/backgroundTaskKinds.js";
import { isTeammateAwaitingInput } from "../utils/inProcessTeammateHelpers.js";
import { isCoordinatorPanelActive, subscribeCoordinatorPanel } from "../utils/transcriptDiagnostics.js";
import { count } from "../utils/collections.js";
import { hasCompletedWithFindings } from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../hooks/useMainLoopModel.js";
import { isUltracodeActive } from "../utils/effort.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useSetVoiceState, waitForStoreState } from "../context/voice.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { pausedUsageParts } from "../utils/usageLimitText.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { hasOtherActiveAgents, MCP_TASK_KEEPALIVE_MS } from "../utils/task/framework.js";
import { useInterval } from "../ink/components/Input.js";
import { computeScrollWindow } from "./CustomSelect/select.js";
import { extractTeammateTranscriptsFromTasks_2 } from "../utils/sessionStorage.js";
import {
  exitTeammateView,
  enterTeammateView,
  isTaskFailedOrStopped,
  isLocalAgent,
} from "../state/teammateViewHelpers.js";
import { _S } from "../../vendor/chart.js/dist/chart.js";
import { stepTeammateSelection } from "../hooks/useBackgroundTaskNavigation.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { Byline } from "./design-system/Byline.js";
import { shallowEqualTaskMaps } from "../state/onChangeAppState.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { findShadowedActions } from "../keybindings/match.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { findAgentTask } from "../plugins/functionHooks/sessionApi.js";
import { VIEW_WAIT_MS } from "../plugins/functionHooks/uiApi.js";

//@ chunk-18hwfzwa.js:171209-171289 fingerprint = _temp (0.667)
function hasUncarriedLaunchSettings(s) {
  return (
    listUncarriedLaunchSettings(s.toolPermissionContext, getForkRestrictedLaunchConfig()).length > 0 ||
    hasRunningBackgroundTask(s.tasks)
  );
}
//@ chunk-18hwfzwa.js:435268-436126 placement
/**
 * 协调者代理状态行（悬停高亮、防误点）。
 */
function AgentStatusRow(props) {
  let rt = w(15);
  let { row, isWarned, prefixWidth, labelWidth, rowWidth, isSelected, onClick } = props;
  let [isHovered, setIsHovered] = y(false);
  let isStrayClick = useStrayClickGuard();
  let isHighlighted = isSelected || isHovered;
  let handleClick;
  if (rt[0] !== onClick || rt[1] !== isStrayClick) {
    handleClick = (At) => {
      if (isStrayClick(At)) {
        return;
      }
      onClick();
    };
    rt[0] = onClick;
    rt[1] = isStrayClick;
    rt[2] = handleClick;
  } else handleClick = rt[2];
  let onMouseEnter;
  let onMouseLeave;
  if (rt[3] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
    rt[3] = onMouseEnter;
    rt[4] = onMouseLeave;
  } else {
    onMouseEnter = rt[3];
    onMouseLeave = rt[4];
  }
  let children;
  if (
    rt[5] !== isHighlighted ||
    rt[6] !== isWarned ||
    rt[7] !== labelWidth ||
    rt[8] !== prefixWidth ||
    rt[9] !== row ||
    rt[10] !== rowWidth
  ) {
    children =
      row.pausedStatuses !== undefined
        ? jsxProd_default(AgentStatusRowView, {
            row,
            elapsed: undefined,
            isWarned,
            prefixWidth,
            labelWidth,
            rowWidth,
            highlighted: isHighlighted,
          })
        : jsxProd_default(AgentStatusRowWithClock, {
            row,
            isWarned,
            prefixWidth,
            labelWidth,
            rowWidth,
            highlighted: isHighlighted,
          });
    rt[5] = isHighlighted;
    rt[6] = isWarned;
    rt[7] = labelWidth;
    rt[8] = prefixWidth;
    rt[9] = row;
    rt[10] = rowWidth;
    rt[11] = children;
  } else children = rt[11];
  let Dt;
  if (rt[12] !== handleClick || rt[13] !== children) {
    Dt = jsxProd_default(Box, {
      onClick: handleClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    rt[12] = handleClick;
    rt[13] = children;
    rt[14] = Dt;
  } else Dt = rt[14];
  return Dt;
}
//@ chunk-18hwfzwa.js:436126-436321 placement
function AgentStatusRowWithClock(h) {
  let D = w(5);
  let x = ElapsedClock(h.row.clock);
  let elapsed;
  if (D[0] !== x) {
    elapsed = formatBarElapsed(x);
    D[0] = x;
    D[1] = elapsed;
  } else elapsed = D[1];
  let ee;
  if (D[2] !== h || D[3] !== elapsed) {
    ee = jsxProd_default(AgentStatusRowView, {
      ...h,
      elapsed,
    });
    D[2] = h;
    D[3] = elapsed;
    D[4] = ee;
  } else ee = D[4];
  return ee;
}
//@ chunk-18hwfzwa.js:436321-439174 placement
/**
 * 代理状态行视图：进度条、百分比、耗时与标签（屏幕阅读器有简化形式）。
 */
function AgentStatusRowView(props) {
  let ze = w(62);
  let { row, elapsed, isWarned, prefixWidth, labelWidth, rowWidth, highlighted } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let We = !highlighted;
  let Xe;
  if (ze[0] !== row) {
    Xe = progressBarCells(row, 100);
    ze[0] = row;
    ze[1] = Xe;
  } else Xe = ze[1];
  let rt = `${Xe}%`;
  let kt;
  let At;
  let It;
  let wrap;
  let Et;
  let Dt;
  let Lt;
  let flexGrow;
  let width;
  let paddingLeft;
  let so;
  if (
    ze[2] !== We ||
    ze[3] !== elapsed ||
    ze[4] !== highlighted ||
    ze[5] !== isScreenReaderEnabled ||
    ze[6] !== isWarned ||
    ze[7] !== labelWidth ||
    ze[8] !== rt ||
    ze[9] !== prefixWidth ||
    ze[10] !== row ||
    ze[11] !== rowWidth
  ) {
    let po =
      row.pausedStatuses !== undefined
        ? [
            ...row.pausedStatuses.map(emptyWorkflowBarSummary),
            {
              barWidth: 0,
              segments: [],
            },
          ]
        : progressLayoutCandidates(
            row,
            elapsed,
            isWarned,
            isScreenReaderEnabled ? [bunStringWidth(rt)] : [20, 12, 8],
          );
    let ao = rowWidth - prefixWidth - labelWidth - SPINNER_PADDING;
    let bo = po.find((co) => layoutWidth(co) <= ao) ?? po.at(-1);
    const Ao = labelWidth + ao - layoutWidth(bo);
    const min = Math.min(SPINNER_MAX_LINES, labelWidth);
    let Ro;
    if (ze[23] !== labelWidth || ze[24] !== Ao || ze[25] !== min) {
      Ro = clamp(Ao, min, labelWidth);
      ze[23] = labelWidth;
      ze[24] = Ao;
      ze[25] = min;
      ze[26] = Ro;
    } else Ro = ze[26];
    let width_2 = Ro;
    const children = highlighted ? `${figures_default.pointer} ` : "  ";
    let Wo;
    if (ze[27] !== We || ze[28] !== children) {
      Wo = jsxProd_default(Text, {
        dimColor: We,
        children,
      });
      ze[27] = We;
      ze[28] = children;
      ze[29] = Wo;
    } else Wo = ze[29];
    const dimColor = !row.bulletColor && We;
    const Cn = row.pausedStatuses !== undefined ? PAUSE_GLYPH : figures_default.circle;
    let No;
    if (ze[30] !== row.bulletColor || ze[31] !== dimColor || ze[32] !== Cn) {
      No = jsxProd_default_2(Text, {
        color: row.bulletColor,
        dimColor,
        children: [Cn, " "],
      });
      ze[30] = row.bulletColor;
      ze[31] = dimColor;
      ze[32] = Cn;
      ze[33] = No;
    } else No = ze[33];
    if (ze[34] !== prefixWidth || ze[35] !== Wo || ze[36] !== No) {
      so = jsxProd_default_2(Box, {
        width: prefixWidth,
        flexShrink: 0,
        children: [Wo, No],
      });
      ze[34] = prefixWidth;
      ze[35] = Wo;
      ze[36] = No;
      ze[37] = so;
    } else so = ze[37];
    let children_2;
    if (ze[38] !== We || ze[39] !== row.name) {
      children_2 = jsxProd_default(Text, {
        dimColor: We,
        wrap: "truncate",
        children: row.name,
      });
      ze[38] = We;
      ze[39] = row.name;
      ze[40] = children_2;
    } else children_2 = ze[40];
    if (ze[41] !== width_2 || ze[42] !== children_2) {
      It = jsxProd_default(Box, {
        width: width_2,
        flexShrink: 0,
        children: children_2,
      });
      ze[41] = width_2;
      ze[42] = children_2;
      ze[43] = It;
    } else It = ze[43];
    At = Box;
    flexGrow = 1;
    width = 0;
    paddingLeft = SPINNER_PADDING;
    kt = Text;
    wrap = "truncate-end";
    Et =
      bo.barWidth > 0 &&
      jsxProd_default(Decorative, {
        fallback: jsxProd_default(Text, {
          dimColor: We,
          children: rt,
        }),
        children: jsxProd_default(ProgressBar, {
          ratio: progressBarCells(row, bo.barWidth) / bo.barWidth,
          width: bo.barWidth,
          variant: "pill",
        }),
      });
    Dt = bo.barWidth > 0 && bo.segments.length > 0 && SPINNER_INDENT;
    let Yo;
    if (ze[44] !== We) {
      Yo = (kn, Fn) =>
        jsxProd_default_2(
          Text,
          {
            color: kn.isWarning ? "warning" : undefined,
            dimColor: kn.isWarning ? false : We,
            children: [
              Fn > 0 &&
                jsxProd_default(Text, {
                  dimColor: We,
                  children: SPINNER_SEPARATOR,
                }),
              kn.text,
            ],
          },
          Fn,
        );
      ze[44] = We;
      ze[45] = Yo;
    } else Yo = ze[45];
    Lt = bo.segments.map(Yo);
    ze[2] = We;
    ze[3] = elapsed;
    ze[4] = highlighted;
    ze[5] = isScreenReaderEnabled;
    ze[6] = isWarned;
    ze[7] = labelWidth;
    ze[8] = rt;
    ze[9] = prefixWidth;
    ze[10] = row;
    ze[11] = rowWidth;
    ze[12] = kt;
    ze[13] = At;
    ze[14] = It;
    ze[15] = wrap;
    ze[16] = Et;
    ze[17] = Dt;
    ze[18] = Lt;
    ze[19] = flexGrow;
    ze[20] = width;
    ze[21] = paddingLeft;
    ze[22] = so;
  } else {
    kt = ze[12];
    At = ze[13];
    It = ze[14];
    wrap = ze[15];
    Et = ze[16];
    Dt = ze[17];
    Lt = ze[18];
    flexGrow = ze[19];
    width = ze[20];
    paddingLeft = ze[21];
    so = ze[22];
  }
  let children;
  if (ze[46] !== kt || ze[47] !== wrap || ze[48] !== Et || ze[49] !== Dt || ze[50] !== Lt) {
    children = jsxProd_default_2(kt, {
      wrap,
      children: [Et, Dt, Lt],
    });
    ze[46] = kt;
    ze[47] = wrap;
    ze[48] = Et;
    ze[49] = Dt;
    ze[50] = Lt;
    ze[51] = children;
  } else children = ze[51];
  let Bo;
  if (
    ze[52] !== At ||
    ze[53] !== children ||
    ze[54] !== flexGrow ||
    ze[55] !== width ||
    ze[56] !== paddingLeft
  ) {
    Bo = jsxProd_default(At, {
      flexGrow,
      width,
      paddingLeft,
      children,
    });
    ze[52] = At;
    ze[53] = children;
    ze[54] = flexGrow;
    ze[55] = width;
    ze[56] = paddingLeft;
    ze[57] = Bo;
  } else Bo = ze[57];
  let Ro;
  if (ze[58] !== It || ze[59] !== Bo || ze[60] !== so) {
    Ro = jsxProd_default_2(Fragment, {
      children: [so, It, Bo],
    });
    ze[58] = It;
    ze[59] = Bo;
    ze[60] = so;
    ze[61] = Ro;
  } else Ro = ze[61];
  return Ro;
}
//@ chunk-18hwfzwa.js:439174-439257 placement
function progressBarCells(row, x) {
  return row.totalAgents > 0 ? Math.floor((row.doneAgents * x) / row.totalAgents) : 0;
}
//@ chunk-18hwfzwa.js:439257-439372 placement
function layoutWidth(h) {
  let joined = h.segments.map((segment) => segment.text).join(SPINNER_SEPARATOR);
  return (
    h.barWidth +
    bunStringWidth(h.barWidth > 0 && joined !== "" ? SPINNER_INDENT : "") +
    bunStringWidth(joined)
  );
}
//@ chunk-18hwfzwa.js:439372-439778 placement
/**
 * 按宽度从宽到窄的进度布局候选（代理数、耗时、token、警告）。
 */
function progressLayoutCandidates(row, elapsed, isWarned, L) {
  let ee = row.totalAgents > 0 ? `${row.doneAgents}/${row.totalAgents}` : undefined;
  let ke = row.totalTokens > 0 ? `${figures_default.arrowDown} ${formatNumber(row.totalTokens)}` : undefined;
  let Re = ke && `${ke} tokens`;
  let Be = isWarned ? LARGE_WORKFLOW_STOP_HINT : undefined;
  let He = isWarned ? LARGE_WORKFLOW_LABEL : undefined;
  let We = isWarned ? LARGE_WORKFLOW_ICON : undefined;
  let ze = L[0];
  let Xe = L.at(-1) ?? ze;
  return [
    progressLayout(ze, [ee, elapsed, Re], Be),
    progressLayout(ze, [ee, elapsed, Re], He),
    progressLayout(ze, [elapsed, Re], He),
    progressLayout(ze, [elapsed, Re], We),
    progressLayout(ze, [elapsed, ke], We),
    ...L.map((rt) => progressLayout(rt, [ke], We)),
    progressLayout(Xe, [], We),
    progressLayout(Xe, [], undefined),
  ];
}
//@ chunk-18hwfzwa.js:439778-439942 placement
function progressLayout(barWidth, x, D) {
  let L = [];
  for (let ee of x)
    if (ee !== undefined)
      L.push({
        text: ee,
        isWarning: false,
      });
  if (D !== undefined)
    L.push({
      text: D,
      isWarning: true,
    });
  return {
    barWidth,
    segments: L,
  };
}
//@ chunk-18hwfzwa.js:439942-439975 placement
function selectTasks(pl) {
  return pl.tasks;
}
//@ chunk-18hwfzwa.js:439975-440012 placement
function selectUltracode(Gl) {
  return Gl.ultracode;
}
//@ chunk-18hwfzwa.js:440012-440055 placement
function selectTaskDecorations(gd) {
  return gd.taskDecorations;
}
//@ chunk-18hwfzwa.js:440055-440101 placement = _temp2 (1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:440101-440146 placement
function selectAgentNameRegistry(bd) {
  return bd.agentNameRegistry;
}
//@ chunk-18hwfzwa.js:440146-440191 placement
function selectSlackTagConnected(Od) {
  return Od.slackTagConnected;
}
//@ chunk-18hwfzwa.js:440191-440239 placement
function selectCoordinatorTaskIndex(pc) {
  return pc.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:440239-440292 placement = getTaskOutputDir (0.766)
function getTaskOutputDir(Kd) {
  return Kd.footerSelection === "tasks";
}
//@ chunk-18hwfzwa.js:440292-440349 placement
function selectWorkflowsFooter(ec) {
  return ec.footerSelection === "workflows";
}
//@ chunk-18hwfzwa.js:440349-440396 placement
function selectWorkflowFooterIndex(qu) {
  return qu.workflowFooterIndex;
}
//@ chunk-18hwfzwa.js:440396-440449 placement
function selectIdleTeammatesExpanded(Ku) {
  return Ku.idleTeammatesExpanded ?? false;
}
//@ chunk-18hwfzwa.js:440449-440522 placement
function isLiveTaskRow(iu) {
  return isPanelOrTeammateTask(iu) && (!isTerminalTaskStatus(iu.status) || iu.evictAfter !== undefined);
}
//@ chunk-18hwfzwa.js:440522-440552 placement
function newSet_2() {
  return new Set();
}
//@ chunk-18hwfzwa.js:440552-440585 placement
function nowMs() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:440585-440629 placement
function plusCountSuffix(Iu) {
  return Iu > 0 ? ` (+${Iu})` : "";
}
//@ chunk-18hwfzwa.js:440629-440678 placement
function rowNameWidth(h) {
  let { row } = h;
  return bunStringWidth(row.name);
}
//@ chunk-18hwfzwa.js:440678-440694 placement
function noopTaskClickHandler() {}
//@ chunk-18hwfzwa.js:440694-440727 placement
function selectTasks_2_2(Wo) {
  return Wo.tasks;
}
//@ chunk-18hwfzwa.js:440727-440770 placement
function selectTaskDecorations_2(mn) {
  return mn.taskDecorations;
}
//@ chunk-18hwfzwa.js:440770-440816 placement = _temp2 (1)
function selectViewingAgentTaskId_2(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:440861-440904 placement
function selectFooterSelection(vo) {
  return vo.footerSelection;
}
//@ chunk-18hwfzwa.js:440904-440952 placement
function selectCoordinatorTaskIndex_3(Yo) {
  return Yo.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:440952-440999 placement
function selectWorkflowFooterIndex_2(kn) {
  return kn.workflowFooterIndex;
}
//@ chunk-18hwfzwa.js:440999-441052 placement
function selectIdleTeammatesExpanded_2(Fn) {
  return Fn.idleTeammatesExpanded ?? false;
}
//@ chunk-18hwfzwa.js:441052-441110 placement
function isEvictableIdleTeammate(bn) {
  return isPanelOrTeammateTask(bn) && bn.evictAfter !== 0 && isTaskStillActive(bn);
}
//@ chunk-18hwfzwa.js:441110-441150 placement
function isNotStopAllAction(Go) {
  return Go.action !== STOP_ALL_AGENTS_LABEL;
}
//@ chunk-18hwfzwa.js:441150-441197 placement
function renderShortcutHint(hn) {
  return jsxProd_default(
    KeyboardShortcutHint,
    {
      ...hn,
    },
    hn.action,
  );
}
//@ chunk-18hwfzwa.js:441197-441268 placement
var WORKFLOW_SIZE_WARNING = "workflow-size-warning";
var MAX_VISIBLE_WORKFLOW_ROWS = 5;
var MAX_INLINE_IDLE_TEAMMATES = 3;
var IDLE_TEAMMATE_SUMMARY = "idle-teammate-summary";
//@ chunk-18hwfzwa.js:441268-441314 placement
function isAgentRowVisible(visibleBackgroundTask) {
  return visibleBackgroundTask.type === "idle_summary";
}
//@ chunk-18hwfzwa.js:441314-441405 placement
function isViewingThisAgent(h, x) {
  return x.viewSelectionMode === "viewing-agent" && h.id === x.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:441405-441440 placement
function isPanelOrTeammateTask(h) {
  return isPanelAgentTask(h) || isInProcessTeammateTask(h);
}
//@ chunk-18hwfzwa.js:441612-441732 placement
/**
 * 是否存在可清理（evictAfter≠0、不是其他任务的祖先）的空闲已完成子代理任务，且它不是已完成的后台 agent。页脚据此决定是否显示清理提示。
 */
function hasEvictableIdleSubagent(tasks, viewingAgentTaskId) {
  let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
  return Object.values(tasks).some(
    (L) =>
      isPanelOrTeammateTask(L) &&
      L.evictAfter !== 0 &&
      !ancestorTaskIds.has(L.id) &&
      isIdleCompletedSubagent(L) &&
      !isCompletedBackgroundAgent(L),
  );
}
//@ chunk-18hwfzwa.js:441732-441822 placement
function agentRowLabel(h) {
  return collapseWhitespace(h.type === "in_process_teammate" ? h.identity.agentName : h.agentType);
}
//@ chunk-18hwfzwa.js:441905-441930 placement
function noopSlackTagHandler(h, slackTagConnected) {
  return;
}
//@ chunk-18hwfzwa.js:441930-442034 placement
function isEvictingIdleTeammate(h) {
  return h?.type === "in_process_teammate" && h.isIdle && h.evictAfter !== undefined && h.evictAfter > 0;
}
//@ chunk-18hwfzwa.js:442034-442194 placement
function isTeammateDueForEviction(h, x, setVoiceState) {
  return (
    isEvictingIdleTeammate(h) &&
    h.evictAfter !== undefined &&
    h.evictAfter <= x &&
    !isAwaitingInputTeammate(h) &&
    (h.identity.resumableAgentId === undefined ||
      !hasRunningBackgroundWorkForAgent(h.identity.resumableAgentId, setVoiceState))
  );
}
//@ chunk-18hwfzwa.js:442194-442224 placement
function isAwaitingInputTeammate(task) {
  return isTeammateAwaitingInput(task);
}
//@ chunk-18hwfzwa.js:442224-442818 fingerprint = getVisibleAgentTasks (1)
function getVisibleAgentTasks(h, x) {
  let D = x ? h[x] : undefined;
  let agentId = isPanelAgentTask(D) ? D.agentId : undefined;
  let ancestorTaskIds = collectAncestorTaskIds(h, x);
  let ke = isPanelAgentTask(D) ? nearestVisibleAncestorId(h, D, ancestorTaskIds) : undefined;
  let filtered = Object.values(h).filter(
    (Xe) =>
      isPanelOrTeammateTask(Xe) &&
      (Xe.evictAfter !== 0 || ancestorTaskIds.has(Xe.id)) &&
      (!isIdleCompletedSubagent(Xe) || ancestorTaskIds.has(Xe.id)) &&
      (nearestVisibleAncestorId(h, Xe, ancestorTaskIds) === agentId ||
        nearestVisibleAncestorId(h, Xe, ancestorTaskIds) === ke ||
        ancestorTaskIds.has(Xe.id)),
  );
  let Be = new Set(filtered.map((Xe) => Xe.id));
  let He = new Map();
  for (let Xe of filtered) {
    let rt = nearestVisibleAncestorId(h, Xe, ancestorTaskIds);
    let kt = rt !== undefined && Be.has(rt) ? rt : undefined;
    let At = He.get(kt);
    if (At) At.push(Xe);
    else He.set(kt, [Xe]);
  }
  for (let Xe of He.values()) Xe.sort((rt, kt) => rt.startTime - kt.startTime);
  let We = [];
  function ze(id) {
    for (let rt of He.get(id) ?? []) {
      We.push(rt);
      ze(rt.id);
    }
  }
  ze(undefined);
  return We;
}
//@ chunk-18hwfzwa.js:442818-443034 layout = _temp6 (0.781)
function nearestVisibleAncestorId(h, x, ancestorTaskIds) {
  if (x.type === "in_process_teammate") return;
  let L = new Set();
  let parentAgentId = x.parentAgentId;
  while (parentAgentId && !L.has(parentAgentId)) {
    L.add(parentAgentId);
    let ke = h[parentAgentId];
    if (!isMainSessionTask_2(ke)) return;
    if (!isIdleCompletedSubagent(ke) || ancestorTaskIds.has(parentAgentId)) return parentAgentId;
    parentAgentId = ke.parentAgentId;
  }
  return;
}
//@ chunk-18hwfzwa.js:443034-443271 layout
function collectAncestorTaskIds(h, x) {
  let D = x ? h[x] : undefined;
  let L = new Set();
  for (let ee = isPanelOrTeammateTask(D) ? D : undefined; ee && !L.has(ee.id);) {
    L.add(ee.id);
    let parentAgentId = ee.type === "local_agent" ? ee.parentAgentId : undefined;
    let Re = parentAgentId !== undefined ? h[parentAgentId] : undefined;
    ee = isPanelOrTeammateTask(Re) && Re.evictAfter !== 0 ? Re : undefined;
  }
  return L;
}
//@ chunk-18hwfzwa.js:443271-443411 layout
function ancestorDepth(tasks, visibleBackgroundTask, ancestorTaskIds) {
  let L = 0;
  let ee = new Set();
  let ke = nearestVisibleAncestorId(tasks, visibleBackgroundTask, ancestorTaskIds);
  while (ke && !ee.has(ke)) {
    ee.add(ke);
    L++;
    let Re = tasks[ke];
    ke = isPanelAgentTask(Re) ? nearestVisibleAncestorId(tasks, Re, ancestorTaskIds) : undefined;
  }
  return L;
}
//@ chunk-18hwfzwa.js:443411-443635 layout
function countVisibleDescendants(tasks, teammateTranscriptsFromTasks, ancestorTaskIds) {
  let L = 0;
  for (let ee of Object.values(tasks)) {
    if (!isMainSessionTask_2(ee) || isIdleCompletedSubagent(ee)) continue;
    let ke = nearestVisibleAncestorId(tasks, ee, ancestorTaskIds);
    let Re = new Set();
    while (ke && !Re.has(ke)) {
      if (ke === teammateTranscriptsFromTasks) {
        L++;
        break;
      }
      Re.add(ke);
      let Be = tasks[ke];
      ke = isPanelAgentTask(Be) ? nearestVisibleAncestorId(tasks, Be, ancestorTaskIds) : undefined;
    }
  }
  return L;
}
//@ chunk-18hwfzwa.js:443635-443995 layout
function getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId, L = false) {
  if (isCoordinatorPanelActive()) return [];
  let filtered = getVisibleAgentTasks(tasks, viewingAgentTaskId).filter(
    (ze) => taskDecorations[ze.id]?.content !== "",
  );
  if (L) return filtered;
  let mapped = filtered.filter((ze) => isOtherIdleTeammate(ze, viewingAgentTaskId)).map((ze) => ze.id);
  if (mapped.length <= MAX_INLINE_IDLE_TEAMMATES) return filtered;
  let sliced = mapped.slice(MAX_INLINE_IDLE_TEAMMATES);
  let Be = new Set(sliced);
  let He = [];
  let We = false;
  for (let ze of filtered)
    if (!Be.has(ze.id)) He.push(ze);
    else if (!We) {
      We = true;
      He.push({
        type: "idle_summary",
        id: IDLE_TEAMMATE_SUMMARY,
        taskIds: sliced,
      });
    }
  return He;
}
//@ chunk-18hwfzwa.js:443995-444095 placement = _temp6 (0.765)
function isOtherIdleTeammate(h, x) {
  return (
    h.type === "in_process_teammate" &&
    h.isIdle &&
    !isTerminalTaskStatus(h.status) &&
    h.id !== x &&
    !isAwaitingInputTeammate(h)
  );
}
//@ chunk-18hwfzwa.js:444095-444142 placement
function hasFoldedIdleTeammates(visibleBackgroundTasks, x) {
  return count(visibleBackgroundTasks, (D) => isOtherIdleTeammate(D, x)) > MAX_INLINE_IDLE_TEAMMATES;
}
//@ chunk-18hwfzwa.js:444142-444377 placement
/**
 * 任务列表变化后重新定位面板选中行：按原选中任务 id 在新列表中的位置返回新下标（1 起），找不到时在分组里找包含它的组，仍找不到返回 0。
 */
function remapTaskPanelIndex(appState, x, D, L) {
  if (appState < 1) return appState;
  let ee = x[Math.min(appState, x.length) - 1];
  let ke = ee !== undefined ? D.indexOf(ee) : -1;
  if (ke !== -1) return ke + 1;
  if (ee !== undefined && L) {
    let index = L.findIndex((Be) => isAgentRowVisible(Be) && Be.taskIds.includes(ee));
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
    return {
      ...L,
      footerSelection: "tasks",
      coordinatorTaskIndex: h,
    };
  };
}
//@ chunk-18hwfzwa.js:444619-444699 placement
function expandIdleTeammates(h) {
  return h.idleTeammatesExpanded
    ? h
    : {
        ...h,
        idleTeammatesExpanded: true,
      };
}
//@ chunk-18hwfzwa.js:444699-444755 placement
function agentRowPrefixWidth() {
  return 2 + Math.max(bunStringWidth(figures_default.circle), bunStringWidth(BLACK_CIRCLE)) + 1;
}
//@ chunk-18hwfzwa.js:444755-444764 placement
var AGENT_ROW_WIDTH_RESERVE = 2;
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
function AgentLine(h, x, turnStartTime, L) {
  let ee = h.type === "in_process_teammate" ? h.pendingUserMessages.length : h.pendingMessages.length;
  let queuedText = ee > 0 ? `${ee} queued` : "";
  let tokenCount = h.progress?.tokenCount;
  let Be = h.progress?.lastActivity ? figures_default.arrowDown : figures_default.arrowUp;
  let tokenText =
    tokenCount !== undefined && tokenCount > 0 ? `${Be} ${formatNumber(tokenCount)} tokens` : "";
  if (h.type === "in_process_teammate") {
    if (h.status === "running" && h.awaitingPlanApproval)
      return {
        elapsed: "awaiting approval",
        tokenText: "",
        queuedText,
        queuedCount: ee,
      };
    if (h.isIdle)
      return {
        elapsed: "idle",
        tokenText: "",
        queuedText,
        queuedCount: ee,
      };
    if (isTerminalTaskStatus(h.status)) {
      let kt = turnStartTime ?? h.startTime;
      let endTime = h.endTime ?? x;
      return {
        elapsed: formatDuration(Math.max(0, endTime - kt)),
        tokenText,
        queuedText,
        queuedCount: ee,
      };
    }
    let rt = turnStartTime ?? h.startTime;
    return {
      elapsed: formatDuration(Math.max(0, x - rt)),
      tokenText,
      queuedText,
      queuedCount: ee,
    };
  }
  let We = !isTerminalTaskStatus(h.status);
  if (We && h.isIdle)
    return {
      elapsed: "waiting",
      tokenText: "",
      queuedText,
      queuedCount: ee,
    };
  if (h.status === "completed" && L && !hasCompletedWithFindings(h))
    return {
      elapsed: "idle",
      tokenText: "",
      queuedText,
      queuedCount: ee,
    };
  let totalPausedMs = h.totalPausedMs ?? 0;
  let max = Math.max(
    0,
    We ? x - h.startTime - totalPausedMs : (h.endTime ?? h.startTime) - h.startTime - totalPausedMs,
  );
  return {
    elapsed: formatDuration(max),
    tokenText,
    queuedText,
    queuedCount: ee,
  };
}
//@ chunk-18hwfzwa.js:446087-452984 layout
/**
 * 页脚上方的后台任务面板组件：列出后台 agent / 队友 / 工作流任务行（排队数、token、状态色、限额暂停），处理选中、窗口滚动与"more below"。
 * showWorkflows 为 true 时同时列出运行中的工作流。
 */
function BackgroundTasksPanel(props) {
  let $ = w(60);
  let D;
  if ($[0] !== props) {
    D = props === undefined ? {} : props;
    $[0] = props;
    $[1] = D;
  } else D = $[1];
  let { showWorkflows } = D;
  let showWorkflowsFlag = showWorkflows === undefined ? false : showWorkflows;
  let tasks = useAppState(selectTasks);
  let mainLoopModel = useMainLoopModel_3();
  let ultracode = useAppState(selectUltracode);
  let He;
  if ($[2] !== mainLoopModel || $[3] !== ultracode) {
    He = isUltracodeActive(ultracode, mainLoopModel);
    $[2] = mainLoopModel;
    $[3] = ultracode;
    $[4] = He;
  } else He = $[4];
  let ultracodeActive = He;
  let { columns } = useTerminalSize();
  let Xe = subscribeCoordinatorPanel();
  let appStoreDirect = useAppStoreDirect();
  let taskDecorations = useAppState(selectTaskDecorations);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId);
  let agentNameRegistry = useAppState(selectAgentNameRegistry);
  let slackTagConnected = useAppState(selectSlackTagConnected);
  let coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex);
  let appState = useAppState(getTaskOutputDir);
  let appState_2 = useAppState(selectWorkflowsFooter);
  let workflowFooterIndex = useAppState(selectWorkflowFooterIndex);
  let appState_3 = useAppState(selectIdleTeammatesExpanded);
  let io = appState ? coordinatorTaskIndex : undefined;
  let setAppState = useSetAppState();
  let setVoiceState = useSetVoiceState();
  useTheme_2();
  let visibleBackgroundTasks = getVisibleBackgroundTasks(
    tasks,
    taskDecorations,
    viewingAgentTaskId,
    appState_3,
  );
  let any = Object.values(tasks).some(isLiveTaskRow);
  let bo;
  if ($[5] !== showWorkflowsFlag || $[6] !== tasks) {
    bo = showWorkflowsFlag ? runningWorkflowTasks(tasks) : [];
    $[5] = showWorkflowsFlag;
    $[6] = tasks;
    $[7] = bo;
  } else bo = $[7];
  let workflowTasks = bo;
  let Bo = workflowTasks.length > 0;
  let workflowRows;
  if ($[8] !== workflowTasks || $[9] !== ultracodeActive) {
    let Ho;
    if ($[11] !== ultracodeActive) {
      Ho = (Io) => {
        let Wo = countWorkflowAgents(Io.workflowProgress, Io.agentCount);
        let rateLimitWait = Io.status === "running" ? Io.rateLimitWait : undefined;
        let bulletColor = isTerminalTaskStatus(Io.status)
          ? getStatusColor(Io.status)
          : rateLimitWait !== undefined
            ? "warning"
            : Wo.failedCount > 0
              ? "error"
              : undefined;
        return {
          workflow: Io,
          row: {
            name: collapseWhitespace(Io.workflowName ?? Io.summary ?? Io.description ?? "Dynamic workflow"),
            bulletColor,
            doneAgents: Wo.done,
            totalAgents: Wo.total,
            totalTokens: Io.totalTokens,
            clock: Io,
            pausedStatuses: rateLimitWait && pausedUsageParts(rateLimitWait.resetsAt),
          },
          warning: workflowSizeSummary({
            scheduledAgents: Wo.total,
            startedAgents: Wo.started,
            totalTokens: Io.totalTokens,
            ultracodeActive,
          }),
        };
      };
      $[11] = ultracodeActive;
      $[12] = Ho;
    } else Ho = $[12];
    workflowRows = workflowTasks.map(Ho);
    $[8] = workflowTasks;
    $[9] = ultracodeActive;
    $[10] = workflowRows;
  } else workflowRows = $[10];
  let No = workflowRows;
  let [vo] = y(newSet_2);
  let Ho;
  let Yo;
  if ($[13] !== tasks || $[14] !== vo || $[15] !== No) {
    Ho = () => {
      for (const kn of vo) {
        if (tasks[kn]?.type !== "local_workflow") vo.delete(kn);
      }
      for (const { workflow, warning } of No) {
        if (warning && !isTerminalTaskStatus(workflow.status) && !vo.has(workflow.id)) {
          vo.add(workflow.id);
          logFeatureOk("workflow_size_warning");
          logEvent("tengu_workflow_size_warning_shown", {
            axis: fromEnum(warning.axis),
            scheduled_agents: warning.scheduledAgents,
            total_tokens: warning.totalTokens,
            projected_tokens: warning.projectedTokens,
            agent_cap: warning.agentCap,
            token_cap: warning.tokenCap,
            cap_from_guideline: warning.capFromGuideline,
          });
        }
      }
    };
    Yo = [No, tasks, vo];
    $[13] = tasks;
    $[14] = vo;
    $[15] = No;
    $[16] = Ho;
    $[17] = Yo;
  } else {
    Ho = $[16];
    Yo = $[17];
  }
  P(Ho, Yo);
  let Mn =
    Xe &&
    runningWorkflowTasks(tasks).some((Go) => {
      if (isTerminalTaskStatus(Go.status)) {
        return false;
      }
      if (vo.has(Go.id)) {
        return true;
      }
      let hn = countWorkflowAgents(Go.workflowProgress, Go.agentCount);
      return (
        workflowSizeSummary({
          scheduledAgents: hn.total,
          startedAgents: hn.started,
          totalTokens: Go.totalTokens,
          ultracodeActive,
        }) !== undefined
      );
    });
  usePluginInstallationStatus(
    WORKFLOW_SIZE_WARNING,
    "medium",
    Mn ? LARGE_WORKFLOW_STOP_HINT_PLAIN : null,
    identity,
  );
  let [Xo, Sn] = y(nowMs);
  let $n;
  if (
    $[18] !== Xe ||
    $[19] !== setAppState ||
    $[20] !== setVoiceState ||
    $[21] !== tasks ||
    $[22] !== viewingAgentTaskId
  ) {
    $n = () => {
      let now = Date.now();
      let _o = false;
      let cn = [];
      let Dn = hasOtherActiveAgents(tasks);
      let wn = [];
      let mr = [];
      let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
      for (const Wn of Object.values(tasks)) {
        if (Wn.type === "local_workflow") {
          if (Wn.status !== "running" && (Wn.evictAfter ?? Infinity) <= now)
            setVoiceState.evictTerminal(Wn.id);
          continue;
        }
        if (!isPanelOrTeammateTask(Wn)) {
          continue;
        }
        let Fr = Wn.type === "in_process_teammate" && Wn.evictAfterHeldBySibling === true;
        if (isTerminalTaskStatus(Wn.status)) {
          if (
            Wn.type === "local_agent" &&
            ancestorTaskIds.has(Wn.id) &&
            Wn.evictAfter !== undefined &&
            Wn.evictAfter > 0 &&
            Wn.evictAfter <= now + MCP_TASK_KEEPALIVE_MS - 5000
          )
            mr.push(Wn.id);
          else if (Wn.evictAfter !== undefined && Wn.evictAfter <= now) setVoiceState.evictTerminal(Wn.id);
        } else if ((Dn || Fr) && Wn.isIdle && Wn.evictAfter !== undefined && Wn.evictAfter > 0) {
          if (Dn !== Fr || Wn.evictAfter - now < MCP_TASK_KEEPALIVE_MS / 2) wn.push(Wn.id);
        } else if (Wn.evictAfter !== undefined && Wn.evictAfter > 0 && Wn.evictAfter <= now) cn.push(Wn.id);
        else if (!isTerminalTaskStatus(Wn.status) && !Wn.isIdle) _o = true;
      }
      if (cn.length > 0 || wn.length > 0 || mr.length > 0)
        setAppState((Zn) => {
          let Un;
          for (const dr of cn) {
            let or = Zn.tasks[dr];
            if (isTeammateDueForEviction(or, now, setVoiceState)) {
              if (Un === undefined)
                Un = {
                  ...Zn.tasks,
                };
              Un[dr] = {
                ...or,
                evictAfter: 0,
              };
            }
          }
          for (const pr of wn) {
            let Qn = Zn.tasks[pr];
            if (isEvictingIdleTeammate(Qn)) {
              if (Un === undefined)
                Un = {
                  ...Zn.tasks,
                };
              Un[pr] = {
                ...Qn,
                evictAfter: now + MCP_TASK_KEEPALIVE_MS,
                evictAfterHeldBySibling: Dn ? true : undefined,
              };
            }
          }
          for (const ur of mr) {
            let Ir = Zn.tasks[ur];
            if (
              isPanelOrTeammateTask(Ir) &&
              isTerminalTaskStatus(Ir.status) &&
              Ir.evictAfter !== undefined &&
              Ir.evictAfter > 0
            ) {
              if (Un === undefined)
                Un = {
                  ...Zn.tasks,
                };
              Un[ur] = {
                ...Ir,
                evictAfter: now + MCP_TASK_KEEPALIVE_MS,
              };
            }
          }
          return Un
            ? {
                ...Zn,
                tasks: Un,
              }
            : Zn;
        });
      if (_o && !Xe) Sn(now);
    };
    $[18] = Xe;
    $[19] = setAppState;
    $[20] = setVoiceState;
    $[21] = tasks;
    $[22] = viewingAgentTaskId;
    $[23] = $n;
  } else $n = $[23];
  useInterval($n, any || Bo ? 1000 : null);
  let Pr;
  if ($[24] !== agentNameRegistry) {
    Pr = new Map();
    for (const [ts, Gn] of agentNameRegistry) Pr.set(Gn, collapseWhitespace(ts));
    $[24] = agentNameRegistry;
    $[25] = Pr;
  } else Pr = $[25];
  let Ur = Pr;
  let Zr;
  if ($[26] !== tasks || $[27] !== viewingAgentTaskId) {
    Zr = viewingAgentTaskId !== undefined && isPanelOrTeammateTask(tasks[viewingAgentTaskId]);
    $[26] = tasks;
    $[27] = viewingAgentTaskId;
    $[28] = Zr;
  } else Zr = $[28];
  let wr = Zr;
  if (Xe || (visibleBackgroundTasks.length === 0 && !Bo && !wr)) {
    return null;
  }
  let zr = io ?? 0;
  let fr = clamp(
    zr >= 1
      ? zr - 1
      : visibleBackgroundTasks.findIndex(
          (visibleBackgroundTask) => visibleBackgroundTask.id === viewingAgentTaskId,
        ),
    0,
    Math.max(0, visibleBackgroundTasks.length - 1),
  );
  let { windowStart, windowEnd, moreAbove, moreBelow } = computeScrollWindow(
    fr,
    visibleBackgroundTasks.length,
    MAX_VISIBLE_WORKFLOW_ROWS,
  );
  let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
  let mapped = visibleBackgroundTasks.map((visibleBackgroundTask) =>
    isAgentRowVisible(visibleBackgroundTask) || ancestorTaskIds.has(visibleBackgroundTask.id)
      ? 0
      : countVisibleDescendants(
          tasks,
          extractTeammateTranscriptsFromTasks_2(visibleBackgroundTask),
          ancestorTaskIds,
        ),
  );
  let mapped_2 = visibleBackgroundTasks.map((visibleBackgroundTask) =>
    isAgentRowVisible(visibleBackgroundTask)
      ? 0
      : ancestorDepth(tasks, visibleBackgroundTask, ancestorTaskIds),
  );
  let Ci = plusCountSuffix;
  let min = Math.min(
    28,
    Math.max(
      4,
      ...visibleBackgroundTasks.map((visibleBackgroundTask, Oi) =>
        !isAgentRowVisible(visibleBackgroundTask) &&
        taskDecorations[visibleBackgroundTask.id]?.content === undefined
          ? 2 * mapped_2[Oi] +
            bunStringWidth(Ur.get(visibleBackgroundTask.id) ?? agentRowLabel(visibleBackgroundTask)) +
            bunStringWidth(Ci(mapped[Oi]))
          : 0,
      ),
      ...No.map(rowNameWidth),
    ),
  );
  let Zi;
  if ($[29] !== Ur || $[30] !== Xo || $[31] !== appStoreDirect) {
    Zi = (da) =>
      isAgentRowVisible(da)
        ? undefined
        : AgentLine(da, Xo, appStoreDirect.getState().transcripts[da.id]?.turnStartTime, Ur.has(da.id));
    $[29] = Ur;
    $[30] = Xo;
    $[31] = appStoreDirect;
    $[32] = Zi;
  } else Zi = $[32];
  let mapped_3 = visibleBackgroundTasks.map(Zi);
  let ls = (ps) =>
    Math.max(
      0,
      ...mapped_3.map((xs, kr) =>
        xs !== undefined && taskDecorations[visibleBackgroundTasks[kr].id]?.content === undefined
          ? bunStringWidth(
              [xs.elapsed, xs.tokenText, xs.queuedText, ps[kr]?.label].filter(Boolean).join(" \xB7 "),
            )
          : 0,
      ),
    );
  let Ms;
  if ($[33] !== slackTagConnected) {
    Ms = (qs) => (isAgentRowVisible(qs) ? undefined : noopSlackTagHandler(qs, slackTagConnected));
    $[33] = slackTagConnected;
    $[34] = Ms;
  } else Ms = $[34];
  let mapped_4 = visibleBackgroundTasks.map(Ms);
  let es = ls(mapped_4);
  if (mapped_4.some(Boolean) && agentRowPrefixWidth() + min + 3 + es > columns - AGENT_ROW_WIDTH_RESERVE) {
    mapped_4 = mapped_4.map(noopTaskClickHandler);
    es = ls(mapped_4);
  }
  const ds = Box;
  const flexDirection = "column";
  const marginTop = 1;
  const paddingRight = AGENT_ROW_WIDTH_RESERVE;
  const ua =
    (visibleBackgroundTasks.length > 0 || wr) &&
    jsxProd_default(MainLine, {
      isSelected: io === 0,
      isViewed: viewingAgentTaskId === undefined,
      labelWidth: min,
      moreAbove,
      onClick: () => exitTeammateView((ii) => setAppState(selectTaskRowUpdater(0, ii))),
    });
  const mapped_5 = visibleBackgroundTasks.slice(windowStart, windowEnd).map((visibleBackgroundTask, Xa) => {
    let dl = windowStart + Xa;
    if (isAgentRowVisible(visibleBackgroundTask)) {
      return jsxProd_default(
        IdleAgentsSummaryRow,
        {
          count: visibleBackgroundTask.taskIds.length,
          isSelected: io === dl + 1,
          onClick: () => setAppState(selectTaskRowUpdater(dl + 1, expandIdleTeammates)),
        },
        visibleBackgroundTask.id,
      );
    }
    let Vl = visibleBackgroundTask;
    let Hd = mapped_2[dl];
    let Ss = nearestVisibleAncestorId(tasks, Vl, ancestorTaskIds);
    let Ws =
      Ss !== undefined &&
      visibleBackgroundTasks.findIndex((visibleBackgroundTask) => visibleBackgroundTask.id === Ss) >=
        windowStart;
    let treeConnector;
    if (Hd > 0 && Ws) {
      let any = visibleBackgroundTasks
        .slice(dl + 1)
        .some(
          (visibleBackgroundTask) =>
            !isAgentRowVisible(visibleBackgroundTask) &&
            nearestVisibleAncestorId(tasks, visibleBackgroundTask, ancestorTaskIds) === Ss,
        );
      treeConnector = repeatString("  ", Hd - 1) + (any ? _S.branch : _S.last) + " ";
    }
    let as = mapped_4[dl];
    return jsxProd_default(
      CoordinatorTaskRow,
      {
        task: Vl,
        name: Ur.get(Vl.id),
        link: as,
        decoration: taskDecorations[Vl.id],
        isSelected: io === dl + 1,
        isViewed: viewingAgentTaskId === Vl.id,
        treeConnector,
        descendantSuffix: Ci(mapped[dl]),
        labelWidth: min,
        statusWidth: es,
        statusParts: mapped_3[dl],
        onClick: (pi) => {
          if (as !== undefined && pi.hyperlinkUrl === as.url) {
            return pi.allowDefault();
          }
          enterTeammateView(Vl.id, (qa) => setAppState(selectTaskRowUpdater(dl + 1, qa)));
        },
      },
      Vl.id,
    );
  });
  let $l;
  if ($[35] !== moreBelow || $[36] !== visibleBackgroundTasks.length) {
    $l =
      visibleBackgroundTasks.length > MAX_VISIBLE_WORKFLOW_ROWS &&
      jsxProd_default(Box, {
        justifyContent: "flex-start",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: moreBelow > 0 ? `  ${DOWN_ARROW} ${moreBelow} more` : " ",
        }),
      });
    $[35] = moreBelow;
    $[36] = visibleBackgroundTasks.length;
    $[37] = $l;
  } else $l = $[37];
  let Yi;
  if (
    $[38] !== columns ||
    $[39] !== min ||
    $[40] !== setAppState ||
    $[41] !== vo ||
    $[42] !== workflowFooterIndex ||
    $[43] !== No ||
    $[44] !== appState_2
  ) {
    let El;
    if (
      $[46] !== columns ||
      $[47] !== min ||
      $[48] !== setAppState ||
      $[49] !== vo ||
      $[50] !== workflowFooterIndex ||
      $[51] !== appState_2
    ) {
      El = (Ll, _c) => {
        let { workflow, row, warning } = Ll;
        return jsxProd_default(
          AgentStatusRow,
          {
            row,
            isWarned:
              !isTerminalTaskStatus(workflow.status) && (warning !== undefined || vo.has(workflow.id)),
            prefixWidth: agentRowPrefixWidth(),
            labelWidth: min,
            rowWidth: columns - AGENT_ROW_WIDTH_RESERVE,
            isSelected: appState_2 && workflowFooterIndex === _c,
            onClick: () =>
              setAppState((Ka) =>
                Ka.workflowDetail?.taskId === workflow.id
                  ? Ka
                  : {
                      ...Ka,
                      workflowDetail: {
                        taskId: workflow.id,
                      },
                    },
              ),
          },
          workflow.id,
        );
      };
      $[46] = columns;
      $[47] = min;
      $[48] = setAppState;
      $[49] = vo;
      $[50] = workflowFooterIndex;
      $[51] = appState_2;
      $[52] = El;
    } else El = $[52];
    Yi = No.map(El);
    $[38] = columns;
    $[39] = min;
    $[40] = setAppState;
    $[41] = vo;
    $[42] = workflowFooterIndex;
    $[43] = No;
    $[44] = appState_2;
    $[45] = Yi;
  } else Yi = $[45];
  let El;
  if (
    $[53] !== ds ||
    $[54] !== paddingRight ||
    $[55] !== ua ||
    $[56] !== mapped_5 ||
    $[57] !== $l ||
    $[58] !== Yi
  ) {
    El = jsxProd_default_2(ds, {
      flexDirection,
      marginTop,
      paddingRight,
      children: [ua, mapped_5, $l, Yi],
    });
    $[53] = ds;
    $[54] = paddingRight;
    $[55] = ua;
    $[56] = mapped_5;
    $[57] = $l;
    $[58] = Yi;
    $[59] = El;
  } else El = $[59];
  return El;
}
//@ chunk-18hwfzwa.js:452984-455430 layout
/**
 * 任务面板获得焦点时页脚显示的快捷键提示行：按当前选中项（主会话 / agent / 分组 / 工作流）显示 select、view、stop all 等按键。
 */
function TaskPanelFooterHints() {
  let $ = w(39);
  let tasks = useAppState(selectTasks_2_2);
  let taskDecorations = useAppState(selectTaskDecorations_2);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId_2);
  let viewSelectionMode = useAppState(stepTeammateSelection);
  let footerSelection = useAppState(selectFooterSelection);
  let coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex_3);
  let workflowFooterIndex = useAppState(selectWorkflowFooterIndex_2);
  let appState = useAppState(selectIdleTeammatesExpanded_2);
  let stopAll = useShortcutDisplay_2("chat:killAgents", "Chat", TASK_PANEL_KEYS.stopAll);
  let shortcutDisplay = useShortcutDisplay("footer:openSelected", "Footer", TASK_PANEL_KEYS.open);
  let shortcutDisplay_2 = useShortcutDisplay("footer:close", "Footer", TASK_PANEL_KEYS.close);
  let collapse = useShortcutDisplay("footer:clearSelection", "Footer", TASK_PANEL_KEYS.collapse);
  const shortcutDisplayText = useShortcutDisplayText("footer:up", "Footer", TASK_PANEL_KEYS.select[0]);
  const shortcutDisplayText_2 = useShortcutDisplayText("footer:down", "Footer", TASK_PANEL_KEYS.select[1]);
  let It;
  if ($[0] !== shortcutDisplayText || $[1] !== shortcutDisplayText_2) {
    It = [shortcutDisplayText, shortcutDisplayText_2];
    $[0] = shortcutDisplayText;
    $[1] = shortcutDisplayText_2;
    $[2] = It;
  } else It = $[2];
  let Ot = It;
  let Et;
  if ($[3] !== Ot) {
    Et =
      Ot.some(Boolean) &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: Ot,
        action: "select",
      });
    $[3] = Ot;
    $[4] = Et;
  } else Et = $[4];
  let Dt = Et;
  let { columns } = useTerminalSize();
  let oo;
  if (footerSelection === "tasks" && coordinatorTaskIndex >= 0) {
    if (
      $[5] !== shortcutDisplay_2 ||
      $[6] !== collapse ||
      $[7] !== columns ||
      $[8] !== coordinatorTaskIndex ||
      $[9] !== appState ||
      $[10] !== stopAll ||
      $[11] !== shortcutDisplay ||
      $[12] !== Ot ||
      $[13] !== Dt ||
      $[14] !== taskDecorations ||
      $[15] !== tasks ||
      $[16] !== viewSelectionMode ||
      $[17] !== viewingAgentTaskId
    ) {
      let visibleBackgroundTasks = getVisibleBackgroundTasks(
        tasks,
        taskDecorations,
        viewingAgentTaskId,
        appState,
      );
      let io = coordinatorTaskIndex >= 1 ? visibleBackgroundTasks[coordinatorTaskIndex - 1] : undefined;
      let onViewedRow =
        io !== undefined &&
        isViewingThisAgent(io, {
          viewSelectionMode,
          viewingAgentTaskId,
        });
      let po = coordinatorTaskIndex === 0 && viewSelectionMode !== "viewing-agent";
      if (io === undefined) {
        let ao;
        if ($[19] !== po || $[20] !== shortcutDisplay) {
          ao =
            shortcutDisplay &&
            !po &&
            jsxProd_default(KeyboardShortcutHint, {
              chord: shortcutDisplay,
              action: "view",
            });
          $[19] = po;
          $[20] = shortcutDisplay;
          $[21] = ao;
        } else ao = $[21];
        let co;
        if ($[22] !== Dt || $[23] !== ao) {
          co = jsxProd_default_2(Byline, {
            children: [Dt, ao],
          });
          $[22] = Dt;
          $[23] = ao;
          $[24] = co;
        } else co = $[24];
        oo = co;
      } else if (isAgentRowVisible(io)) {
        let children;
        if ($[25] !== shortcutDisplay) {
          children =
            shortcutDisplay &&
            jsxProd_default(KeyboardShortcutHint, {
              chord: shortcutDisplay,
              action: "expand",
            });
          $[25] = shortcutDisplay;
          $[26] = children;
        } else children = $[26];
        let co;
        if ($[27] !== children) {
          co = jsxProd_default(Byline, {
            children,
          });
          $[27] = children;
          $[28] = co;
        } else co = $[28];
        oo = co;
      } else {
        const closeAction = isTaskStillActive(io) ? "stop" : "clear";
        const showCollapse = appState && hasFoldedIdleTeammates(visibleBackgroundTasks, viewingAgentTaskId);
        let bo;
        if ($[29] !== tasks) {
          bo = count(Object.values(tasks), isEvictableIdleTeammate);
          $[29] = tasks;
          $[30] = bo;
        } else bo = $[30];
        let Ao = {
          onViewedRow,
          closeAction,
          showCollapse,
          showStopAll: bo > 1,
        };
        let Bo = CoordinatorPanelKeys({
          ...Ao,
          keys: {
            open: shortcutDisplay,
            close: shortcutDisplay_2,
            collapse,
            select: Ot,
            stopAll,
          },
        });
        let Ro =
          shortcutHintsWidth(Bo) -
          shortcutHintsWidth(
            CoordinatorPanelKeys({
              ...Ao,
              keys: TASK_PANEL_KEYS,
            }),
          );
        let Ho = columns >= 90 + Math.max(0, Ro) ? Bo : Bo.filter(isNotStopAllAction);
        oo = jsxProd_default(Byline, {
          children: Ho.map(renderShortcutHint),
        });
      }
      $[5] = shortcutDisplay_2;
      $[6] = collapse;
      $[7] = columns;
      $[8] = coordinatorTaskIndex;
      $[9] = appState;
      $[10] = stopAll;
      $[11] = shortcutDisplay;
      $[12] = Ot;
      $[13] = Dt;
      $[14] = taskDecorations;
      $[15] = tasks;
      $[16] = viewSelectionMode;
      $[17] = viewingAgentTaskId;
      $[18] = oo;
    } else oo = $[18];
  } else if (footerSelection === "workflows") {
    let ao;
    if (
      $[31] !== shortcutDisplay_2 ||
      $[32] !== shortcutDisplay ||
      $[33] !== Dt ||
      $[34] !== tasks ||
      $[35] !== workflowFooterIndex
    ) {
      let Io = runningWorkflowTasks(tasks)[workflowFooterIndex];
      ao = Io
        ? jsxProd_default_2(Byline, {
            children: [
              shortcutDisplay &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: shortcutDisplay,
                  action: "view",
                }),
              shortcutDisplay_2 &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: shortcutDisplay_2,
                  action: isTerminalTaskStatus(Io.status) ? "clear" : "stop",
                }),
            ],
          })
        : jsxProd_default_2(Byline, {
            children: [
              Dt,
              shortcutDisplay &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: shortcutDisplay,
                  action: "view",
                }),
            ],
          });
      $[31] = shortcutDisplay_2;
      $[32] = shortcutDisplay;
      $[33] = Dt;
      $[34] = tasks;
      $[35] = workflowFooterIndex;
      $[36] = ao;
    } else ao = $[36];
    oo = ao;
  }
  let ao;
  if ($[37] !== oo) {
    ao =
      oo !== undefined
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate",
            children: oo,
          })
        : null;
    $[37] = oo;
    $[38] = ao;
  } else ao = $[38];
  return ao;
}
//@ chunk-18hwfzwa.js:455430-455482 layout
function useVisibleAgentTaskCount() {
  let [h] = y(makeVisibleTaskCountSelector);
  let appState = useAppState(h);
  return subscribeCoordinatorPanel() ? 0 : appState;
}
//@ chunk-18hwfzwa.js:455482-456117 layout
/**
 * 生成带缓存的 AppState 选择器：返回可见后台任务行数（有任务或正在查看 agent 时 +1 主会话行），tasks 浅相等时复用上次结果。
 */
function makeVisibleTaskCountSelector() {
  let previous;
  return (state) => {
    let panelHidden = isCoordinatorPanelActive();
    if (
      previous !== undefined &&
      previous.taskDecorations === state.taskDecorations &&
      previous.viewingAgentTaskId === state.viewingAgentTaskId &&
      previous.idleTeammatesExpanded === state.idleTeammatesExpanded &&
      previous.panelHidden === panelHidden &&
      (previous.tasks === state.tasks || shallowEqualTaskMaps(previous.tasks, state.tasks))
    ) {
      previous.tasks = state.tasks;
      return previous.count;
    }
    let visibleCount = getVisibleBackgroundTasks(
      state.tasks,
      state.taskDecorations,
      state.viewingAgentTaskId,
      state.idleTeammatesExpanded ?? false,
    ).length;
    let ee =
      state.viewingAgentTaskId !== undefined && isPanelOrTeammateTask(state.tasks[state.viewingAgentTaskId]);
    let count = visibleCount > 0 || ee ? visibleCount + 1 : 0;
    previous = {
      tasks: state.tasks,
      taskDecorations: state.taskDecorations,
      viewingAgentTaskId: state.viewingAgentTaskId,
      idleTeammatesExpanded: state.idleTeammatesExpanded,
      panelHidden,
      count,
    };
    return count;
  };
}
//@ chunk-18hwfzwa.js:456117-457026 fingerprint = MainLine (0.512)
function MainLine(props) {
  let $ = w(16);
  let { isSelected, isViewed, labelWidth, moreAbove, onClick } = props;
  let [hover, setHover] = y(false);
  let onClick_2 = useStrayClickGuarded(onClick);
  let prefix = isSelected || hover ? figures_default.pointer + " " : "  ";
  let bullet = isViewed ? BLACK_CIRCLE : figures_default.circle;
  let Xe = moreAbove > 0 ? `${UP_ARROW} ${moreAbove} more` : "";
  let onMouseEnter;
  let onMouseLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHover(true);
    onMouseLeave = () => setHover(false);
    $[0] = onMouseEnter;
    $[1] = onMouseLeave;
  } else {
    onMouseEnter = $[0];
    onMouseLeave = $[1];
  }
  const width = labelWidth + agentRowPrefixWidth();
  const dimColor = !isSelected && !isViewed && !hover;
  let children;
  if ($[2] !== bullet || $[3] !== isViewed || $[4] !== prefix || $[5] !== dimColor) {
    children = jsxProd_default_2(Text, {
      dimColor,
      bold: isViewed,
      children: [prefix, bullet, " main"],
    });
    $[2] = bullet;
    $[3] = isViewed;
    $[4] = prefix;
    $[5] = dimColor;
    $[6] = children;
  } else children = $[6];
  let Dt;
  if ($[7] !== width || $[8] !== children) {
    Dt = jsxProd_default(Box, {
      width,
      flexShrink: 0,
      children,
    });
    $[7] = width;
    $[8] = children;
    $[9] = Dt;
  } else Dt = $[9];
  let Lt;
  if ($[10] !== Xe) {
    Lt =
      Xe &&
      jsxProd_default(Text, {
        dimColor: true,
        children: Xe,
      });
    $[10] = Xe;
    $[11] = Lt;
  } else Lt = $[11];
  let oo;
  if ($[12] !== onClick_2 || $[13] !== Dt || $[14] !== Lt) {
    oo = jsxProd_default_2(Box, {
      justifyContent: "space-between",
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [Dt, Lt],
    });
    $[12] = onClick_2;
    $[13] = Dt;
    $[14] = Lt;
    $[15] = oo;
  } else oo = $[15];
  return oo;
}
//@ chunk-18hwfzwa.js:457026-461149 placement
/**
 * 协调者模式代理状态面板中的单行任务。
 */
function CoordinatorTaskRow(props) {
  let $ = w(88);
  let {
    task,
    name: D,
    link,
    decoration,
    labelWidth,
    statusWidth,
    statusParts,
    isSelected,
    isViewed,
    treeConnector,
    descendantSuffix,
    onClick,
  } = props;
  let [kt, At] = y(false);
  let onClick_2 = useStrayClickGuarded(onClick);
  let { elapsed, tokenText, queuedText, queuedCount } = statusParts;
  let Xt;
  if ($[0] !== task.description || $[1] !== task.progress?.summary) {
    Xt = collapseWhitespace(task.progress?.summary ?? "") || collapseWhitespace(task.description);
    $[0] = task.description;
    $[1] = task.progress?.summary;
    $[2] = Xt;
  } else Xt = $[2];
  let children = Xt;
  let so = isSelected || kt;
  let children_2 = so ? figures_default.pointer + " " : "  ";
  let ao = isViewed ? BLACK_CIRCLE : figures_default.circle;
  let co;
  if ($[3] !== task) {
    co = isTaskStillActive(task) ? undefined : getStatusColor(task.status);
    $[3] = task;
    $[4] = co;
  } else co = $[4];
  let bo = co;
  let Ao = !so && !isViewed;
  let Bo;
  if ($[5] !== Ao || $[6] !== isViewed || $[7] !== children_2) {
    Bo = jsxProd_default(Text, {
      dimColor: Ao,
      bold: isViewed,
      children: children_2,
    });
    $[5] = Ao;
    $[6] = isViewed;
    $[7] = children_2;
    $[8] = Bo;
  } else Bo = $[8];
  let Ro;
  if ($[9] !== Ao || $[10] !== treeConnector) {
    Ro =
      treeConnector !== undefined &&
      jsxProd_default(Text, {
        dimColor: Ao,
        children: treeConnector,
      });
    $[9] = Ao;
    $[10] = treeConnector;
    $[11] = Ro;
  } else Ro = $[11];
  const dimColor = !bo && Ao;
  let Io;
  if ($[12] !== ao || $[13] !== bo || $[14] !== isViewed || $[15] !== dimColor) {
    Io = jsxProd_default_2(Text, {
      color: bo,
      dimColor,
      bold: isViewed,
      children: [ao, " "],
    });
    $[12] = ao;
    $[13] = bo;
    $[14] = isViewed;
    $[15] = dimColor;
    $[16] = Io;
  } else Io = $[16];
  let Wo;
  if ($[17] !== Bo || $[18] !== Ro || $[19] !== Io) {
    Wo = jsxProd_default_2(Fragment, {
      children: [Bo, Ro, Io],
    });
    $[17] = Bo;
    $[18] = Ro;
    $[19] = Io;
    $[20] = Wo;
  } else Wo = $[20];
  let children_3 = Wo;
  let Cn;
  if ($[21] !== treeConnector) {
    Cn = treeConnector ? bunStringWidth(treeConnector) : 0;
    $[21] = treeConnector;
    $[22] = Cn;
  } else Cn = $[22];
  let No = Cn;
  let width = agentRowPrefixWidth() + No;
  let width_2 = Math.max(0, labelWidth - No);
  if (decoration?.content !== undefined) {
    let onMouseLeave;
    let onMouseEnter;
    if ($[23] === MEMO_CACHE_SENTINEL) {
      onMouseEnter = () => At(true);
      onMouseLeave = () => At(false);
      $[23] = onMouseLeave;
      $[24] = onMouseEnter;
    } else {
      onMouseLeave = $[23];
      onMouseEnter = $[24];
    }
    let bn;
    if ($[25] !== children_3 || $[26] !== width) {
      bn = jsxProd_default(Box, {
        width,
        flexShrink: 0,
        children: children_3,
      });
      $[25] = children_3;
      $[26] = width;
      $[27] = bn;
    } else bn = $[27];
    let children;
    if ($[28] !== decoration.content) {
      children = jsxProd_default(Ansi, {
        children: decoration.content,
      });
      $[28] = decoration.content;
      $[29] = children;
    } else children = $[29];
    let hn;
    if ($[30] !== Ao || $[31] !== isViewed || $[32] !== children) {
      hn = jsxProd_default(Box, {
        flexGrow: 1,
        width: 0,
        children: jsxProd_default(Text, {
          dimColor: Ao,
          bold: isViewed,
          wrap: "truncate",
          children,
        }),
      });
      $[30] = Ao;
      $[31] = isViewed;
      $[32] = children;
      $[33] = hn;
    } else hn = $[33];
    let Mn;
    if ($[34] !== onClick_2 || $[35] !== bn || $[36] !== hn) {
      Mn = jsxProd_default_2(Box, {
        onClick: onClick_2,
        onMouseEnter,
        onMouseLeave,
        children: [bn, hn],
      });
      $[34] = onClick_2;
      $[35] = bn;
      $[36] = hn;
      $[37] = Mn;
    } else Mn = $[37];
    return Mn;
  }
  let onMouseLeave;
  let onMouseEnter;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => At(true);
    onMouseLeave = () => At(false);
    $[38] = onMouseLeave;
    $[39] = onMouseEnter;
  } else {
    onMouseLeave = $[38];
    onMouseEnter = $[39];
  }
  let bn;
  if ($[40] !== children_3 || $[41] !== width) {
    bn = jsxProd_default(Box, {
      width,
      flexShrink: 0,
      children: children_3,
    });
    $[40] = children_3;
    $[41] = width;
    $[42] = bn;
  } else bn = $[42];
  const dimColor_2 = !D && Ao;
  let hn;
  if ($[43] !== D || $[44] !== task) {
    hn = D ?? agentRowLabel(task);
    $[43] = D;
    $[44] = task;
    $[45] = hn;
  } else hn = $[45];
  let Mn;
  if ($[46] !== descendantSuffix) {
    Mn =
      descendantSuffix &&
      jsxProd_default(Text, {
        dimColor: true,
        children: descendantSuffix,
      });
    $[46] = descendantSuffix;
    $[47] = Mn;
  } else Mn = $[47];
  let children_4;
  if ($[48] !== isViewed || $[49] !== dimColor_2 || $[50] !== hn || $[51] !== Mn) {
    children_4 = jsxProd_default_2(Text, {
      bold: isViewed,
      dimColor: dimColor_2,
      wrap: "truncate",
      children: [hn, Mn],
    });
    $[48] = isViewed;
    $[49] = dimColor_2;
    $[50] = hn;
    $[51] = Mn;
    $[52] = children_4;
  } else children_4 = $[52];
  let Sn;
  if ($[53] !== width_2 || $[54] !== children_4) {
    Sn = jsxProd_default(Box, {
      width: width_2,
      flexShrink: 0,
      children: children_4,
    });
    $[53] = width_2;
    $[54] = children_4;
    $[55] = Sn;
  } else Sn = $[55];
  let $n;
  if ($[56] !== Ao || $[57] !== children || $[58] !== isViewed) {
    $n = jsxProd_default(Box, {
      flexGrow: 1,
      width: 0,
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        dimColor: Ao,
        bold: isViewed,
        wrap: "truncate",
        children,
      }),
    });
    $[56] = Ao;
    $[57] = children;
    $[58] = isViewed;
    $[59] = $n;
  } else $n = $[59];
  let on;
  if ($[60] !== elapsed || $[61] !== tokenText) {
    on = [elapsed, tokenText].filter(Boolean);
    $[60] = elapsed;
    $[61] = tokenText;
    $[62] = on;
  } else on = $[62];
  const joined = on.join(" \xB7 ");
  let cn;
  if ($[63] !== elapsed || $[64] !== queuedCount || $[65] !== queuedText || $[66] !== tokenText) {
    cn =
      queuedCount > 0 &&
      jsxProd_default_2(Text, {
        color: "warning",
        children: [elapsed || tokenText ? " \xB7 " : "", queuedText],
      });
    $[63] = elapsed;
    $[64] = queuedCount;
    $[65] = queuedText;
    $[66] = tokenText;
    $[67] = cn;
  } else cn = $[67];
  let Dn;
  if ($[68] !== elapsed || $[69] !== link || $[70] !== queuedCount || $[71] !== tokenText) {
    Dn =
      link &&
      jsxProd_default_2(Fragment, {
        children: [
          elapsed || tokenText || queuedCount > 0 ? " \xB7 " : "",
          jsxProd_default(Link, {
            url: link.url,
            children: link.label,
          }),
        ],
      });
    $[68] = elapsed;
    $[69] = link;
    $[70] = queuedCount;
    $[71] = tokenText;
    $[72] = Dn;
  } else Dn = $[72];
  let children_5;
  if ($[73] !== Ao || $[74] !== isViewed || $[75] !== joined || $[76] !== cn || $[77] !== Dn) {
    children_5 = jsxProd_default_2(Text, {
      dimColor: Ao,
      bold: isViewed,
      children: [joined, cn, Dn],
    });
    $[73] = Ao;
    $[74] = isViewed;
    $[75] = joined;
    $[76] = cn;
    $[77] = Dn;
    $[78] = children_5;
  } else children_5 = $[78];
  let mr;
  if ($[79] !== statusWidth || $[80] !== children_5) {
    mr = jsxProd_default(Box, {
      minWidth: statusWidth,
      flexShrink: 0,
      marginLeft: 1,
      justifyContent: "flex-end",
      children: children_5,
    });
    $[79] = statusWidth;
    $[80] = children_5;
    $[81] = mr;
  } else mr = $[81];
  let Kn;
  if ($[82] !== onClick_2 || $[83] !== bn || $[84] !== Sn || $[85] !== $n || $[86] !== mr) {
    Kn = jsxProd_default_2(Box, {
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [bn, Sn, $n, mr],
    });
    $[82] = onClick_2;
    $[83] = bn;
    $[84] = Sn;
    $[85] = $n;
    $[86] = mr;
    $[87] = Kn;
  } else Kn = $[87];
  return Kn;
}
//@ chunk-18hwfzwa.js:461149-462112 placement
function IdleAgentsSummaryRow(props) {
  let $ = w(18);
  let { count, isSelected, onClick } = props;
  let [ee, ke] = y(false);
  let onClick_2 = useStrayClickGuarded(onClick);
  let Be = isSelected || ee;
  let children = Be ? figures_default.pointer + " " : "  ";
  let dimColor = !Be;
  let onMouseEnter;
  let onMouseLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => ke(true);
    onMouseLeave = () => ke(false);
    $[0] = onMouseEnter;
    $[1] = onMouseLeave;
  } else {
    onMouseEnter = $[0];
    onMouseLeave = $[1];
  }
  let width;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    width = agentRowPrefixWidth();
    $[2] = width;
  } else width = $[2];
  let At;
  if ($[3] !== dimColor || $[4] !== children) {
    At = jsxProd_default(Text, {
      dimColor,
      children,
    });
    $[3] = dimColor;
    $[4] = children;
    $[5] = At;
  } else At = $[5];
  let It;
  if ($[6] !== dimColor) {
    It = jsxProd_default_2(Text, {
      dimColor,
      children: [figures_default.circle, " "],
    });
    $[6] = dimColor;
    $[7] = It;
  } else It = $[7];
  let Ot;
  if ($[8] !== At || $[9] !== It) {
    Ot = jsxProd_default_2(Box, {
      width,
      flexShrink: 0,
      children: [At, It],
    });
    $[8] = At;
    $[9] = It;
    $[10] = Ot;
  } else Ot = $[10];
  const children_2 = count === 1 ? "1 idle agent" : `${count} idle agents`;
  let Dt;
  if ($[11] !== dimColor || $[12] !== children_2) {
    Dt = jsxProd_default(Text, {
      dimColor,
      wrap: "truncate",
      children: children_2,
    });
    $[11] = dimColor;
    $[12] = children_2;
    $[13] = Dt;
  } else Dt = $[13];
  let Lt;
  if ($[14] !== onClick_2 || $[15] !== Ot || $[16] !== Dt) {
    Lt = jsxProd_default_2(Box, {
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [Ot, Dt],
    });
    $[14] = onClick_2;
    $[15] = Ot;
    $[16] = Dt;
    $[17] = Lt;
  } else Lt = $[17];
  return Lt;
}
//@ chunk-18hwfzwa.js:462112-462270 placement
function useStrayClickGuarded(onClick) {
  let $ = w(3);
  let strayClickGuard = useStrayClickGuard();
  if (onClick === undefined) {
    return;
  }
  let L;
  if ($[0] !== onClick || $[1] !== strayClickGuard) {
    L = (ee) => {
      if (strayClickGuard(ee)) {
        return;
      }
      onClick(ee);
    };
    $[0] = onClick;
    $[1] = strayClickGuard;
    $[2] = L;
  } else L = $[2];
  return L;
}
//@ chunk-18hwfzwa.js:462270-462409 placement
var TASK_PANEL_KEYS = {
  open: "enter",
  close: "x",
  collapse: "escape",
  select: ["up", "down"],
  stopAll: "ctrl+x ctrl+k",
};
var STOP_ALL_AGENTS_LABEL = "stop all agents";
var LOWER_KEY_CASE = {
  keyCase: "lower",
};
//@ chunk-18hwfzwa.js:462409-462731 placement
function CoordinatorPanelKeys({ keys, onViewedRow, closeAction, showCollapse, showStopAll }) {
  let ke = onViewedRow
    ? [
        {
          chord: keys.select,
          action: "select",
        },
      ]
    : [
        {
          chord: keys.open,
          action: "view",
        },
        {
          chord: keys.close,
          action: closeAction,
        },
      ];
  if (showCollapse)
    ke.push({
      chord: keys.collapse,
      action: "collapse",
    });
  if (showStopAll)
    ke.push({
      chord: keys.stopAll,
      action: STOP_ALL_AGENTS_LABEL,
      format: LOWER_KEY_CASE,
    });
  return ke.filter((Re) => formatShortcutHint(Re) !== "");
}
//@ chunk-18hwfzwa.js:462731-462782 placement
function shortcutHintsWidth(h) {
  return bunStringWidth(h.map(formatShortcutHint).join(" \xB7 "));
}
//@ chunk-18hwfzwa.js:462782-462807 placement
function identity(h) {
  return h;
}
//@ chunk-18hwfzwa.js:462807-462811 placement
init_react_production();
//@ chunk-18hwfzwa.js:462811-462929 placement
/**
 * 返回一个按键处理器：只在动作被 Chat 上下文绑定遮蔽的 Footer 动作时调用回调。
 */
function useShadowedFooterActionHandler(h) {
  let bindings = useKeybindingContext()?.bindings;
  let D = Q(() => (bindings ? findShadowedActions("Footer", "Chat", bindings) : new Set()), [bindings]);
  return ce((L) => D.has(L) && h(), [D, h]);
}
//@ chunk-18hwfzwa.js:462929-463038 placement
/**
 * 注册 Chat 上下文的消息操作快捷键，但按键归 Footer 所有时让给 Footer 处理。
 */
function useFooterAwareMessageActions(h, { isActive, footerOwnsKeyOf }) {
  MessageActionsKeybindings(
    xr(h, (L, ee) => () => (footerOwnsKeyOf(ee) ? false : L())),
    {
      context: "Chat",
      isActive,
    },
  );
}
//@ chunk-e6aww6q8.js:4006927-4007097 placement
function teammateRowState(agentTask) {
  if (agentTask.type !== "in_process_teammate") return isMainSessionTask_2(agentTask) ? undefined : "hidden";
  let n = isTaskFailedOrStopped(agentTask);
  let r = agentTask.identity.resumableAgentId === undefined;
  return n ? "ended" : r ? "elsewhere" : undefined;
}
//@ chunk-e6aww6q8.js:4007333-4007709 callgraph-witnessed = CoordinatorTaskPanel (0.123)
async function showAgentTaskView(store, n) {
  if (n.agentId === undefined) {
    exitTeammateView((h) => store.setState(h));
    return "shown";
  }
  let agentTask = findAgentTask(store.getState().tasks, n.agentId);
  if (agentTask === undefined) return "unknown";
  let viewingAgentTaskId = teammateRowState(agentTask);
  if (viewingAgentTaskId !== undefined) return viewingAgentTaskId;
  enterTeammateView(agentTask.id, (s_0) => store.setState(s_0));
  await waitForStoreState(
    store,
    (s_1) => {
      let y = s_1.tasks[agentTask.id];
      return !(isLocalAgent(y) && y.retain && !y.diskLoaded);
    },
    {
      timeoutMs: VIEW_WAIT_MS,
    },
  );
  return store.getState().viewingAgentTaskId === agentTask.id ? "shown" : "moved";
}
export {
  useVisibleAgentTaskCount,
  getVisibleBackgroundTasks,
  isAgentRowVisible,
  remapTaskPanelIndex,
  useShadowedFooterActionHandler,
  useFooterAwareMessageActions,
  expandIdleTeammates,
  hasFoldedIdleTeammates,
  isViewingThisAgent,
  hasUncarriedLaunchSettings,
  showAgentTaskView,
  isPanelOrTeammateTask,
  TaskPanelFooterHints,
  hasEvictableIdleSubagent,
  agentRowPrefixWidth,
  AGENT_ROW_WIDTH_RESERVE,
  collectAncestorTaskIds,
  BackgroundTasksPanel,
};
