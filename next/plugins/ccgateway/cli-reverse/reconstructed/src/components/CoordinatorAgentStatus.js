/**
 * components/CoordinatorAgentStatus.tsx
 *
 * 协调者/队友任务面板：列出后台 agent/队友/工作流任务行（排队数、token、状态），处理面板选择与 chat:killAgents 等按键。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CoordinatorAgentStatus.tsx
 * pieces: chunk-5xgkngpb.js (2), chunk-czq1j3j2.js (83)
 * attribution: placement 63, callgraph-witnessed 1, fingerprint 4, affinity 1, layout 16
 */
import {
  isMainSessionTask as isMainSessionTask_2,
  isPanelAgentTask,
  isCompletedBackgroundAgent,
} from "../tasks/taskKinds.js";
import {
  isTaskFailedOrStopped,
  exitTeammateView,
  enterTeammateView,
  isLocalAgent,
} from "../state/teammateViewHelpers.js";
import { findAgentTask } from "../plugins/functionHooks/sessionApi.js";
import { waitForStoreState, useTaskFramework } from "../context/voice.js";
import { VIEW_WAIT_MS } from "../plugins/functionHooks/uiApi.js";
import { listUncarriedLaunchSettings } from "../services/daemon/relaunchArgs.js";
import { getForkRestrictedLaunchConfig } from "../bootstrap/state.js";
import { hasRunningBackgroundTask } from "../tasks/backgroundTaskLabels.js";
import {
  init_react_production,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
  selectWorkflowFooterTask,
  runningWorkflowTasks,
  runningRemoteWorkflows,
  workflowSizeSummary,
  LARGE_WORKFLOW_STOP_HINT_PLAIN,
  useShortcutDisplayText,
} from "./Spinner/workflowStatus.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { clamp } from "../ink/screen.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { PAUSE_GLYPH, BLACK_CIRCLE, DOWN_ARROW, UP_ARROW } from "../constants/figures.js";
import { ProgressBar } from "./design-system/ProgressBar.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../remote/remoteMode.js";
import { withOutcomeTelemetry } from "../remote/controlRequestErrors.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../utils/resultError.js";
import { errorMessage } from "../utils/errors.js";
import { isTerminalTaskStatus } from "../Task.js";
import { SnapshotCache } from "../remote/remoteSessionEvents.js";
import { KeyboardShortcutHint, formatShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { isIdleCompletedSubagent } from "../tasks/LocalMainSessionTask.js";
import { collapseWhitespace, repeatString } from "../utils/stringUtils.js";
import { hasRunningBackgroundWorkForAgent } from "../tasks/backgroundTaskKinds.js";
import { isTeammateAwaitingInput } from "../utils/inProcessTeammateHelpers.js";
import { isCoordinatorPanelActive, subscribeCoordinatorPanel } from "../utils/transcriptDiagnostics.js";
import { countWhere } from "../utils/collections.js";
import { hasCompletedWithFindings } from "./tasks/RemoteSessionProgress.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import { useHasRemoteWork } from "./tasks/remoteTaskStatus.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../hooks/useMainLoopModel.js";
import { isUltracodeActive } from "../utils/effort.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { selectIdleTeammatesExpanded_3 } from "./PromptInput/PromptComposer.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { cloudWorkflowToTask } from "../commands/workflows/workflows.js";
import { pausedUsageParts } from "../utils/usageLimitText.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { hasOtherActiveAgents, MCP_TASK_KEEPALIVE_MS } from "../utils/task/framework.js";
import { useInterval } from "../ink/components/Input.js";
import { computeScrollWindow } from "./CustomSelect/select.js";
import { TREE_GLYPHS } from "../../vendor/chart.js/dist/chart.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { Byline } from "./design-system/Byline.js";
import { shallowEqualTaskMaps } from "../state/onChangeAppState.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { findShadowedActions } from "../keybindings/match.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { import_mapValues } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4112393-4112563 placement
function teammateRowState(agentTask) {
  if (agentTask.type !== "in_process_teammate") return isMainSessionTask_2(agentTask) ? undefined : "hidden";
  let failedOrStopped = isTaskFailedOrStopped(agentTask);
  let notResumable = agentTask.identity.resumableAgentId === undefined;
  return failedOrStopped ? "ended" : notResumable ? "elsewhere" : undefined;
}
//@ chunk-5xgkngpb.js:4112799-4113175 callgraph-witnessed (2.1.88 match: CoordinatorTaskPanel, 0.123)
async function showAgentTaskView(store, options) {
  if (options.agentId === undefined) {
    exitTeammateView((prevState) => store.setState(prevState));
    return "shown";
  }
  let agentTask = findAgentTask(store.getState().tasks, options.agentId);
  if (agentTask === undefined) return "unknown";
  let viewingAgentTaskId = teammateRowState(agentTask);
  if (viewingAgentTaskId !== undefined) return viewingAgentTaskId;
  enterTeammateView(agentTask.id, (s_0) => store.setState(s_0));
  await waitForStoreState(
    store,
    (s_1) => {
      let state = s_1.tasks[agentTask.id];
      return !(isLocalAgent(state) && state.retain && !state.diskLoaded);
    },
    {
      timeoutMs: VIEW_WAIT_MS,
    },
  );
  return store.getState().viewingAgentTaskId === agentTask.id ? "shown" : "moved";
}
//@ chunk-czq1j3j2.js:175302-175381 fingerprint (2.1.88 match: _temp, 0.668)
function hasUncarriedLaunchSettings(s) {
  return (
    listUncarriedLaunchSettings(s.toolPermissionContext, getForkRestrictedLaunchConfig()).length > 0 ||
    hasRunningBackgroundTask(s.tasks)
  );
}
//@ chunk-czq1j3j2.js:460211-460215 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:460211", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:460318-460355 affinity (2.1.88 match: SEP_WIDTH, 1)
var SPINNER_PADDING = 2;
var SPINNER_INDENT = "  ";
var SPINNER_SEPARATOR = " \xB7 ";
var SPINNER_MAX_LINES = 8;
//@ chunk-czq1j3j2.js:460355-461213 placement
/**
 * 协调者代理状态行（悬停高亮、防误点）。
 */
function AgentStatusRow(props) {
  let $ = useMemoCache(15);
  let { row, isWarned, prefixWidth, labelWidth, rowWidth, isSelected, onClick } = props;
  let [isHovered, setIsHovered] = useState(false);
  let isStrayClick = useStrayClickGuard();
  let isHighlighted = isSelected || isHovered;
  let handleClick;
  if ($[0] !== onClick || $[1] !== isStrayClick) {
    handleClick = (event) => {
      if (isStrayClick(event)) {
        return;
      }
      onClick();
    };
    $[0] = onClick;
    $[1] = isStrayClick;
    $[2] = handleClick;
  } else handleClick = $[2];
  let onMouseEnter;
  let onMouseLeave;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
    $[3] = onMouseEnter;
    $[4] = onMouseLeave;
  } else {
    onMouseEnter = $[3];
    onMouseLeave = $[4];
  }
  let children;
  if (
    $[5] !== isHighlighted ||
    $[6] !== isWarned ||
    $[7] !== labelWidth ||
    $[8] !== prefixWidth ||
    $[9] !== row ||
    $[10] !== rowWidth
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
    $[5] = isHighlighted;
    $[6] = isWarned;
    $[7] = labelWidth;
    $[8] = prefixWidth;
    $[9] = row;
    $[10] = rowWidth;
    $[11] = children;
  } else children = $[11];
  let rowElement;
  if ($[12] !== handleClick || $[13] !== children) {
    rowElement = jsxProd_default(Box, {
      onClick: handleClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[12] = handleClick;
    $[13] = children;
    $[14] = rowElement;
  } else rowElement = $[14];
  return rowElement;
}
//@ chunk-czq1j3j2.js:461213-461408 placement
function AgentStatusRowWithClock(props) {
  let $ = useMemoCache(5);
  let clockValue = ElapsedClock(props.row.clock);
  let elapsed;
  if ($[0] !== clockValue) {
    elapsed = formatBarElapsed(clockValue);
    $[0] = clockValue;
    $[1] = elapsed;
  } else elapsed = $[1];
  let rowElement;
  if ($[2] !== props || $[3] !== elapsed) {
    rowElement = jsxProd_default(AgentStatusRowView, {
      ...props,
      elapsed,
    });
    $[2] = props;
    $[3] = elapsed;
    $[4] = rowElement;
  } else rowElement = $[4];
  return rowElement;
}
//@ chunk-czq1j3j2.js:461408-464262 placement
/**
 * 代理状态行视图：进度条、百分比、耗时与标签（屏幕阅读器有简化形式）。
 */
function AgentStatusRowView(props) {
  let $ = useMemoCache(62);
  let { row, elapsed, isWarned, prefixWidth, labelWidth, rowWidth, highlighted } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isDimmed = !highlighted;
  let percentComplete;
  if ($[0] !== row) {
    percentComplete = progressBarCells(row, 100);
    $[0] = row;
    $[1] = percentComplete;
  } else percentComplete = $[1];
  let percentText = `${percentComplete}%`;
  let TextComponent;
  let BoxComponent;
  let labelElement;
  let wrap;
  let barElement;
  let separatorIndent;
  let segmentElements;
  let flexGrow;
  let width;
  let paddingLeft;
  let prefixElement;
  if (
    $[2] !== isDimmed ||
    $[3] !== elapsed ||
    $[4] !== highlighted ||
    $[5] !== isScreenReaderEnabled ||
    $[6] !== isWarned ||
    $[7] !== labelWidth ||
    $[8] !== percentText ||
    $[9] !== prefixWidth ||
    $[10] !== row ||
    $[11] !== rowWidth
  ) {
    let layoutCandidates =
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
            isScreenReaderEnabled ? [bunStringWidth(percentText)] : [20, 12, 8],
          );
    let availableWidth = rowWidth - prefixWidth - labelWidth - SPINNER_PADDING;
    let layout =
      layoutCandidates.find((candidate) => layoutWidth(candidate) <= availableWidth) ??
      layoutCandidates.at(-1);
    const labelWidthBudget = labelWidth + availableWidth - layoutWidth(layout);
    const min = Math.min(SPINNER_MAX_LINES, labelWidth);
    let labelWidthFinalCached;
    if ($[23] !== labelWidth || $[24] !== labelWidthBudget || $[25] !== min) {
      labelWidthFinalCached = clamp(labelWidthBudget, min, labelWidth);
      $[23] = labelWidth;
      $[24] = labelWidthBudget;
      $[25] = min;
      $[26] = labelWidthFinalCached;
    } else labelWidthFinalCached = $[26];
    let width_2 = labelWidthFinalCached;
    const children = highlighted ? `${figures_default.pointer} ` : "  ";
    let pointerElement;
    if ($[27] !== isDimmed || $[28] !== children) {
      pointerElement = jsxProd_default(Text, {
        dimColor: isDimmed,
        children,
      });
      $[27] = isDimmed;
      $[28] = children;
      $[29] = pointerElement;
    } else pointerElement = $[29];
    const dimColor = !row.bulletColor && isDimmed;
    const bulletGlyph = row.pausedStatuses !== undefined ? PAUSE_GLYPH : figures_default.circle;
    let bulletElement;
    if ($[30] !== row.bulletColor || $[31] !== dimColor || $[32] !== bulletGlyph) {
      bulletElement = jsxProd_default_2(Text, {
        color: row.bulletColor,
        dimColor,
        children: [bulletGlyph, " "],
      });
      $[30] = row.bulletColor;
      $[31] = dimColor;
      $[32] = bulletGlyph;
      $[33] = bulletElement;
    } else bulletElement = $[33];
    if ($[34] !== prefixWidth || $[35] !== pointerElement || $[36] !== bulletElement) {
      prefixElement = jsxProd_default_2(Box, {
        width: prefixWidth,
        flexShrink: 0,
        children: [pointerElement, bulletElement],
      });
      $[34] = prefixWidth;
      $[35] = pointerElement;
      $[36] = bulletElement;
      $[37] = prefixElement;
    } else prefixElement = $[37];
    let children_2;
    if ($[38] !== isDimmed || $[39] !== row.name) {
      children_2 = jsxProd_default(Text, {
        dimColor: isDimmed,
        wrap: "truncate",
        children: row.name,
      });
      $[38] = isDimmed;
      $[39] = row.name;
      $[40] = children_2;
    } else children_2 = $[40];
    if ($[41] !== width_2 || $[42] !== children_2) {
      labelElement = jsxProd_default(Box, {
        width: width_2,
        flexShrink: 0,
        children: children_2,
      });
      $[41] = width_2;
      $[42] = children_2;
      $[43] = labelElement;
    } else labelElement = $[43];
    BoxComponent = Box;
    flexGrow = 1;
    width = 0;
    paddingLeft = SPINNER_PADDING;
    TextComponent = Text;
    wrap = "truncate-end";
    barElement =
      layout.barWidth > 0 &&
      jsxProd_default(Decorative, {
        fallback: jsxProd_default(Text, {
          dimColor: isDimmed,
          children: percentText,
        }),
        children: jsxProd_default(ProgressBar, {
          ratio: progressBarCells(row, layout.barWidth) / layout.barWidth,
          width: layout.barWidth,
          variant: "pill",
        }),
      });
    separatorIndent = layout.barWidth > 0 && layout.segments.length > 0 && SPINNER_INDENT;
    let renderSegment;
    if ($[44] !== isDimmed) {
      renderSegment = (segment, index) =>
        jsxProd_default_2(
          Text,
          {
            color: segment.isWarning ? "warning" : undefined,
            dimColor: segment.isWarning ? false : isDimmed,
            children: [
              index > 0 &&
                jsxProd_default(Text, {
                  dimColor: isDimmed,
                  children: SPINNER_SEPARATOR,
                }),
              segment.text,
            ],
          },
          index,
        );
      $[44] = isDimmed;
      $[45] = renderSegment;
    } else renderSegment = $[45];
    segmentElements = layout.segments.map(renderSegment);
    $[2] = isDimmed;
    $[3] = elapsed;
    $[4] = highlighted;
    $[5] = isScreenReaderEnabled;
    $[6] = isWarned;
    $[7] = labelWidth;
    $[8] = percentText;
    $[9] = prefixWidth;
    $[10] = row;
    $[11] = rowWidth;
    $[12] = TextComponent;
    $[13] = BoxComponent;
    $[14] = labelElement;
    $[15] = wrap;
    $[16] = barElement;
    $[17] = separatorIndent;
    $[18] = segmentElements;
    $[19] = flexGrow;
    $[20] = width;
    $[21] = paddingLeft;
    $[22] = prefixElement;
  } else {
    TextComponent = $[12];
    BoxComponent = $[13];
    labelElement = $[14];
    wrap = $[15];
    barElement = $[16];
    separatorIndent = $[17];
    segmentElements = $[18];
    flexGrow = $[19];
    width = $[20];
    paddingLeft = $[21];
    prefixElement = $[22];
  }
  let children;
  if (
    $[46] !== TextComponent ||
    $[47] !== wrap ||
    $[48] !== barElement ||
    $[49] !== separatorIndent ||
    $[50] !== segmentElements
  ) {
    children = jsxProd_default_2(TextComponent, {
      wrap,
      children: [barElement, separatorIndent, segmentElements],
    });
    $[46] = TextComponent;
    $[47] = wrap;
    $[48] = barElement;
    $[49] = separatorIndent;
    $[50] = segmentElements;
    $[51] = children;
  } else children = $[51];
  let barColumnElement;
  if (
    $[52] !== BoxComponent ||
    $[53] !== children ||
    $[54] !== flexGrow ||
    $[55] !== width ||
    $[56] !== paddingLeft
  ) {
    barColumnElement = jsxProd_default(BoxComponent, {
      flexGrow,
      width,
      paddingLeft,
      children,
    });
    $[52] = BoxComponent;
    $[53] = children;
    $[54] = flexGrow;
    $[55] = width;
    $[56] = paddingLeft;
    $[57] = barColumnElement;
  } else barColumnElement = $[57];
  let rowElement;
  if ($[58] !== labelElement || $[59] !== barColumnElement || $[60] !== prefixElement) {
    rowElement = jsxProd_default_2(Fragment, {
      children: [prefixElement, labelElement, barColumnElement],
    });
    $[58] = labelElement;
    $[59] = barColumnElement;
    $[60] = prefixElement;
    $[61] = rowElement;
  } else rowElement = $[61];
  return rowElement;
}
//@ chunk-czq1j3j2.js:464262-464345 placement
function progressBarCells(row, barWidth) {
  return row.totalAgents > 0 ? Math.floor((row.doneAgents * barWidth) / row.totalAgents) : 0;
}
//@ chunk-czq1j3j2.js:464345-464460 placement
function layoutWidth(layout) {
  let joined = layout.segments.map((segment) => segment.text).join(SPINNER_SEPARATOR);
  return (
    layout.barWidth +
    bunStringWidth(layout.barWidth > 0 && joined !== "" ? SPINNER_INDENT : "") +
    bunStringWidth(joined)
  );
}
//@ chunk-czq1j3j2.js:464460-464866 placement
/**
 * 按宽度从宽到窄的进度布局候选（代理数、耗时、token、警告）。
 */
function progressLayoutCandidates(row, elapsed, isWarned, narrowest) {
  let progressText = row.totalAgents > 0 ? `${row.doneAgents}/${row.totalAgents}` : undefined;
  let tokensText =
    row.totalTokens > 0 ? `${figures_default.arrowDown} ${formatNumber(row.totalTokens)}` : undefined;
  let tokensLabel = tokensText && `${tokensText} tokens`;
  let stopHint = isWarned ? LARGE_WORKFLOW_STOP_HINT : undefined;
  let warnLabel = isWarned ? LARGE_WORKFLOW_LABEL : undefined;
  let warnIcon = isWarned ? LARGE_WORKFLOW_ICON : undefined;
  let firstWidth = narrowest[0];
  let lastWidth = narrowest.at(-1) ?? firstWidth;
  return [
    progressLayout(firstWidth, [progressText, elapsed, tokensLabel], stopHint),
    progressLayout(firstWidth, [progressText, elapsed, tokensLabel], warnLabel),
    progressLayout(firstWidth, [elapsed, tokensLabel], warnLabel),
    progressLayout(firstWidth, [elapsed, tokensLabel], warnIcon),
    progressLayout(firstWidth, [elapsed, tokensText], warnIcon),
    ...narrowest.map((width) => progressLayout(width, [tokensText], warnIcon)),
    progressLayout(lastWidth, [], warnIcon),
    progressLayout(lastWidth, [], undefined),
  ];
}
//@ chunk-czq1j3j2.js:464866-465030 placement
function progressLayout(barWidth, texts, warningText) {
  let segments = [];
  for (let text of texts)
    if (text !== undefined)
      segments.push({
        text,
        isWarning: false,
      });
  if (warningText !== undefined)
    segments.push({
      text: warningText,
      isWarning: true,
    });
  return {
    barWidth,
    segments,
  };
}
//@ chunk-czq1j3j2.js:465030-465061 layout
function canStopRemoteWorkflow(remoteWorkerReportedGone) {
  return isRemoteControlChannelAvailable() && !remoteWorkerReportedGone;
}
//@ chunk-czq1j3j2.js:465061-465389 layout
async function stopRemoteWorkflow(taskId, notify) {
  let remoteCaps = getRemoteCaps();
  if (!remoteCaps) return false;
  return withOutcomeTelemetry("cloud_workflow_stop", () =>
    remoteCaps.sendControlRequest({
      subtype: "stop_task",
      task_id: taskId,
    }),
  ).then(
    () => true,
    (error) => {
      let message = sanitizeDisplayText(errorMessage(error), {
        maxCodeUnits: MAX_TITLE_LENGTH,
      });
      notify({
        key: "cloud-workflow-stop",
        kind: "feedback",
        text: `Couldn't stop the workflow: ${message}`,
        color: "error",
        priority: "immediate",
      });
      return false;
    },
  );
}
//@ chunk-czq1j3j2.js:465389-465422 placement
function selectTasks(state) {
  return state.tasks;
}
//@ chunk-czq1j3j2.js:465422-465459 placement
function selectUltracode(state) {
  return state.ultracode;
}
//@ chunk-czq1j3j2.js:465459-465502 placement
function selectTaskDecorations(state) {
  return state.taskDecorations;
}
//@ chunk-czq1j3j2.js:465502-465548 placement (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-czq1j3j2.js:465548-465593 placement
function selectAgentNameRegistry(state) {
  return state.agentNameRegistry;
}
//@ chunk-czq1j3j2.js:465593-465638 placement
function selectSlackTagConnected(state) {
  return state.slackTagConnected;
}
//@ chunk-czq1j3j2.js:465638-465686 placement
function selectCoordinatorTaskIndex(state) {
  return state.coordinatorTaskIndex;
}
//@ chunk-czq1j3j2.js:465686-465739 placement (2.1.88 match: getTaskOutputDir, 0.768)
function getTaskOutputDir(state) {
  return state.footerSelection === "tasks";
}
//@ chunk-czq1j3j2.js:465739-465796 placement
function selectWorkflowsFooter(state) {
  return state.footerSelection === "workflows";
}
//@ chunk-czq1j3j2.js:465796-465843 placement
function selectWorkflowFooterIndex(state) {
  return state.workflowFooterIndex;
}
//@ chunk-czq1j3j2.js:465843-465890 placement
function selectIdleTeammatesExpanded(state) {
  return state.workflowFooterRunId;
}
//@ chunk-czq1j3j2.js:465943-466016 placement
function isLiveTaskRow(task) {
  return isPanelOrTeammateTask(task) && (!isTerminalTaskStatus(task.status) || task.evictAfter !== undefined);
}
//@ chunk-czq1j3j2.js:466016-466046 layout
function createSnapshotCache() {
  return new SnapshotCache();
}
//@ chunk-czq1j3j2.js:466046-466076 placement
function newSet_2() {
  return new Set();
}
//@ chunk-czq1j3j2.js:466076-466109 placement
function nowMs() {
  return Date.now();
}
//@ chunk-czq1j3j2.js:466109-466153 placement
function plusCountSuffix(count) {
  return count > 0 ? ` (+${count})` : "";
}
//@ chunk-czq1j3j2.js:466153-466202 placement
function rowNameWidth(props) {
  let { row } = props;
  return bunStringWidth(row.name);
}
//@ chunk-czq1j3j2.js:466202-466218 placement
function noopTaskClickHandler() {}
//@ chunk-czq1j3j2.js:466218-466251 placement
function selectTasks_2_2(state) {
  return state.tasks;
}
//@ chunk-czq1j3j2.js:466251-466440 placement
function selectTaskDecorations_2(state) {
  let selectedTask = state.footerSelection === "workflows" ? selectWorkflowFooterTask(state) : undefined;
  if (!selectedTask) {
    return;
  }
  if ("presence" in selectedTask && !canStopRemoteWorkflow(state.remoteWorkerReportedGone)) {
    return "none";
  }
  return isTerminalTaskStatus(selectedTask.status) ? "clear" : "stop";
}
//@ chunk-czq1j3j2.js:466440-466483 placement
function selectViewingAgentTaskId_2(state) {
  return state.taskDecorations;
}
//@ chunk-czq1j3j2.js:466483-466529 layout (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId_3(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-czq1j3j2.js:466529-466574 layout
function selectViewSelectionMode(state) {
  return state.viewSelectionMode;
}
//@ chunk-czq1j3j2.js:466574-466617 placement
function selectCoordinatorTaskIndex_3(state) {
  return state.footerSelection;
}
//@ chunk-czq1j3j2.js:466617-466665 placement
function selectWorkflowFooterIndex_2(state) {
  return state.coordinatorTaskIndex;
}
//@ chunk-czq1j3j2.js:466665-466718 placement
function selectIdleTeammatesExpanded_2(state) {
  return state.idleTeammatesExpanded ?? false;
}
//@ chunk-czq1j3j2.js:466718-466776 placement
function isEvictableIdleTeammate(task) {
  return isPanelOrTeammateTask(task) && task.evictAfter !== 0 && isTaskStillActive(task);
}
//@ chunk-czq1j3j2.js:466776-466816 placement
function isNotStopAllAction(action) {
  return action.action !== STOP_ALL_AGENTS_LABEL;
}
//@ chunk-czq1j3j2.js:466816-466863 placement
function renderShortcutHint(props) {
  return jsxProd_default(
    KeyboardShortcutHint,
    {
      ...props,
    },
    props.action,
  );
}
//@ chunk-czq1j3j2.js:466863-466941 placement
var WORKFLOW_SIZE_WARNING = "workflow-size-warning";
var pendingShellLines = [];
var MAX_VISIBLE_WORKFLOW_ROWS = 5;
var MAX_INLINE_IDLE_TEAMMATES = 3;
var IDLE_TEAMMATE_SUMMARY = "idle-teammate-summary";
//@ chunk-czq1j3j2.js:466941-466987 placement
function isAgentRowVisible(agentRow) {
  return agentRow.type === "idle_summary";
}
//@ chunk-czq1j3j2.js:466987-467078 placement
function isViewingThisAgent(task, state) {
  return state.viewSelectionMode === "viewing-agent" && task.id === state.viewingAgentTaskId;
}
//@ chunk-czq1j3j2.js:467078-467113 placement
function isPanelOrTeammateTask(task) {
  return isPanelAgentTask(task) || isInProcessTeammateTask(task);
}
//@ chunk-czq1j3j2.js:467285-467405 placement
/**
 * 是否存在可清理（evictAfter≠0、不是其他任务的祖先）的空闲已完成子代理任务，且它不是已完成的后台 agent。页脚据此决定是否显示清理提示。
 */
function hasEvictableIdleSubagent(tasks, viewingAgentTaskId) {
  let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
  return Object.values(tasks).some(
    (task) =>
      isPanelOrTeammateTask(task) &&
      task.evictAfter !== 0 &&
      !ancestorTaskIds.has(task.id) &&
      isIdleCompletedSubagent(task) &&
      !isCompletedBackgroundAgent(task),
  );
}
//@ chunk-czq1j3j2.js:467405-467495 placement
function agentRowLabel(task) {
  return collapseWhitespace(task.type === "in_process_teammate" ? task.identity.agentName : task.agentType);
}
//@ chunk-czq1j3j2.js:467495-467578 layout (2.1.88 match: extractTeammateTranscriptsFromTasks, 1)
function extractTeammateTranscriptsFromTasks(tasks) {
  return tasks.type === "in_process_teammate" ? tasks.identity.agentId : tasks.agentId;
}
//@ chunk-czq1j3j2.js:467578-467603 placement
function noopSlackTagHandler(event, slackTagConnected) {
  return;
}
//@ chunk-czq1j3j2.js:467603-467707 placement
function isEvictingIdleTeammate(task) {
  return (
    task?.type === "in_process_teammate" &&
    task.isIdle &&
    task.evictAfter !== undefined &&
    task.evictAfter > 0
  );
}
//@ chunk-czq1j3j2.js:467707-467867 placement
function isTeammateDueForEviction(task, dueAt, workspaceTasks) {
  return (
    isEvictingIdleTeammate(task) &&
    task.evictAfter !== undefined &&
    task.evictAfter <= dueAt &&
    !isAwaitingInputTeammate(task) &&
    (task.identity.resumableAgentId === undefined ||
      !hasRunningBackgroundWorkForAgent(task.identity.resumableAgentId, workspaceTasks))
  );
}
//@ chunk-czq1j3j2.js:467867-467897 placement
function isAwaitingInputTeammate(task) {
  return isTeammateAwaitingInput(task);
}
//@ chunk-czq1j3j2.js:467897-468491 fingerprint (2.1.88 match: getVisibleAgentTasks, 1)
function getVisibleAgentTasks(tasks, viewingAgentTaskId) {
  let viewedTask = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
  let agentId = isPanelAgentTask(viewedTask) ? viewedTask.agentId : undefined;
  let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
  let viewedAgentId = isPanelAgentTask(viewedTask)
    ? nearestVisibleAncestorId(tasks, viewedTask, ancestorTaskIds)
    : undefined;
  let filtered = Object.values(tasks).filter(
    (task) =>
      isPanelOrTeammateTask(task) &&
      (task.evictAfter !== 0 || ancestorTaskIds.has(task.id)) &&
      (!isIdleCompletedSubagent(task) || ancestorTaskIds.has(task.id)) &&
      (nearestVisibleAncestorId(tasks, task, ancestorTaskIds) === agentId ||
        nearestVisibleAncestorId(tasks, task, ancestorTaskIds) === viewedAgentId ||
        ancestorTaskIds.has(task.id)),
  );
  let visibleIds = new Set(filtered.map((task) => task.id));
  let childrenByParent = new Map();
  for (let task of filtered) {
    let ancestorId = nearestVisibleAncestorId(tasks, task, ancestorTaskIds);
    let parentKey = ancestorId !== undefined && visibleIds.has(ancestorId) ? ancestorId : undefined;
    let siblings = childrenByParent.get(parentKey);
    if (siblings) siblings.push(task);
    else childrenByParent.set(parentKey, [task]);
  }
  for (let siblings of childrenByParent.values())
    siblings.sort((leftTask, rightTask) => leftTask.startTime - rightTask.startTime);
  let ordered = [];
  function walk(id) {
    for (let child of childrenByParent.get(id) ?? []) {
      ordered.push(child);
      walk(child.id);
    }
  }
  walk(undefined);
  return ordered;
}
//@ chunk-czq1j3j2.js:468491-468707 layout (2.1.88 match: _temp6, 0.781)
function nearestVisibleAncestorId(tasks, task, ancestorTaskIds) {
  if (task.type === "in_process_teammate") return;
  let seen = new Set();
  let parentAgentId = task.parentAgentId;
  while (parentAgentId && !seen.has(parentAgentId)) {
    seen.add(parentAgentId);
    let parent = tasks[parentAgentId];
    if (!isMainSessionTask_2(parent)) return;
    if (!isIdleCompletedSubagent(parent) || ancestorTaskIds.has(parentAgentId)) return parentAgentId;
    parentAgentId = parent.parentAgentId;
  }
  return;
}
//@ chunk-czq1j3j2.js:468707-468944 layout
function collectAncestorTaskIds(tasks, viewingAgentTaskId) {
  let viewedTask = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
  let ids = new Set();
  for (
    let current = isPanelOrTeammateTask(viewedTask) ? viewedTask : undefined;
    current && !ids.has(current.id);
  ) {
    ids.add(current.id);
    let parentAgentId = current.type === "local_agent" ? current.parentAgentId : undefined;
    let parentTask = parentAgentId !== undefined ? tasks[parentAgentId] : undefined;
    current = isPanelOrTeammateTask(parentTask) && parentTask.evictAfter !== 0 ? parentTask : undefined;
  }
  return ids;
}
//@ chunk-czq1j3j2.js:468944-469084 layout
function ancestorDepth(tasks, visibleBackgroundTask, ancestorTaskIds) {
  let depth = 0;
  let seen = new Set();
  let ancestorId = nearestVisibleAncestorId(tasks, visibleBackgroundTask, ancestorTaskIds);
  while (ancestorId && !seen.has(ancestorId)) {
    seen.add(ancestorId);
    depth++;
    let ancestorTask = tasks[ancestorId];
    ancestorId = isPanelAgentTask(ancestorTask)
      ? nearestVisibleAncestorId(tasks, ancestorTask, ancestorTaskIds)
      : undefined;
  }
  return depth;
}
//@ chunk-czq1j3j2.js:469084-469308 layout
function countVisibleDescendants(tasks, teammateTranscriptsFromTasks, ancestorTaskIds) {
  let total = 0;
  for (let task of Object.values(tasks)) {
    if (!isMainSessionTask_2(task) || isIdleCompletedSubagent(task)) continue;
    let ancestorId = nearestVisibleAncestorId(tasks, task, ancestorTaskIds);
    let seen = new Set();
    while (ancestorId && !seen.has(ancestorId)) {
      if (ancestorId === teammateTranscriptsFromTasks) {
        total++;
        break;
      }
      seen.add(ancestorId);
      let ancestorTask = tasks[ancestorId];
      ancestorId = isPanelAgentTask(ancestorTask)
        ? nearestVisibleAncestorId(tasks, ancestorTask, ancestorTaskIds)
        : undefined;
    }
  }
  return total;
}
//@ chunk-czq1j3j2.js:469308-469668 layout
function getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId, expandAll = false) {
  if (isCoordinatorPanelActive()) return [];
  let filtered = getVisibleAgentTasks(tasks, viewingAgentTaskId).filter(
    (task) => taskDecorations[task.id]?.content !== "",
  );
  if (expandAll) return filtered;
  let mapped = filtered
    .filter((task) => isOtherIdleTeammate(task, viewingAgentTaskId))
    .map((task) => task.id);
  if (mapped.length <= MAX_INLINE_IDLE_TEAMMATES) return filtered;
  let sliced = mapped.slice(MAX_INLINE_IDLE_TEAMMATES);
  let foldedIds = new Set(sliced);
  let rows = [];
  let summaryInserted = false;
  for (let task of filtered)
    if (!foldedIds.has(task.id)) rows.push(task);
    else if (!summaryInserted) {
      summaryInserted = true;
      rows.push({
        type: "idle_summary",
        id: IDLE_TEAMMATE_SUMMARY,
        taskIds: sliced,
      });
    }
  return rows;
}
//@ chunk-czq1j3j2.js:469668-469768 placement (2.1.88 match: _temp6, 0.768)
function isOtherIdleTeammate(task, viewingAgentTaskId) {
  return (
    task.type === "in_process_teammate" &&
    task.isIdle &&
    !isTerminalTaskStatus(task.status) &&
    task.id !== viewingAgentTaskId &&
    !isAwaitingInputTeammate(task)
  );
}
//@ chunk-czq1j3j2.js:469768-469815 placement
function hasFoldedIdleTeammates(visibleBackgroundTasks, tasks) {
  return (
    countWhere(visibleBackgroundTasks, (task) => isOtherIdleTeammate(task, tasks)) > MAX_INLINE_IDLE_TEAMMATES
  );
}
//@ chunk-czq1j3j2.js:469815-470050 placement
/**
 * 任务列表变化后重新定位面板选中行：按原选中任务 id 在新列表中的位置返回新下标（1 起），找不到时在分组里找包含它的组，仍找不到返回 0。
 */
function remapTaskPanelIndex(appState, rows, nextRows, groupRows) {
  if (appState < 1) return appState;
  let previousTaskId = rows[Math.min(appState, rows.length) - 1];
  let rowIndex = previousTaskId !== undefined ? nextRows.indexOf(previousTaskId) : -1;
  if (rowIndex !== -1) return rowIndex + 1;
  if (previousTaskId !== undefined && groupRows) {
    let index = groupRows.findIndex((row) => isAgentRowVisible(row) && row.taskIds.includes(previousTaskId));
    if (index !== -1) return index + 1;
  }
  return 0;
}
//@ chunk-czq1j3j2.js:470050-470292 placement
function selectTaskRowUpdater(taskIndex, updater) {
  return (state) => {
    let next = updater(state);
    if (next.footerSelection !== "tasks" && next.footerSelection !== "workflows") return next;
    if (next.footerSelection === "tasks" && next.coordinatorTaskIndex === taskIndex) return next;
    return {
      ...next,
      footerSelection: "tasks",
      coordinatorTaskIndex: taskIndex,
    };
  };
}
//@ chunk-czq1j3j2.js:470292-470372 placement
function expandIdleTeammates(state) {
  return state.idleTeammatesExpanded
    ? state
    : {
        ...state,
        idleTeammatesExpanded: true,
      };
}
//@ chunk-czq1j3j2.js:470372-470428 placement
function agentRowPrefixWidth() {
  return 2 + Math.max(bunStringWidth(figures_default.circle), bunStringWidth(BLACK_CIRCLE)) + 1;
}
//@ chunk-czq1j3j2.js:470428-470437 placement
var AGENT_ROW_WIDTH_RESERVE = 2;
//@ chunk-czq1j3j2.js:470437-470550 placement (2.1.88 match: getStatusColor, 1)
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
//@ chunk-czq1j3j2.js:470550-470646 layout (2.1.88 match: _temp6, 1)
function isTaskStillActive(t_1) {
  if (t_1.type === "in_process_teammate") return !isTerminalTaskStatus(t_1.status);
  return !isTerminalTaskStatus(t_1.status) || hasCompletedWithFindings(t_1);
}
//@ chunk-czq1j3j2.js:470646-471915 fingerprint (2.1.88 match: AgentLine, 0.402)
function AgentLine(task, now, turnStartTime, idleAsDone, isScreenReaderEnabled) {
  let queuedCount =
    task.type === "in_process_teammate" ? task.pendingUserMessages.length : task.pendingMessages.length;
  let queuedText = queuedCount > 0 ? `${queuedCount} queued` : "";
  let tokenCount = task.progress?.tokenCount;
  let arrow = task.progress?.lastActivity ? figures_default.arrowDown : figures_default.arrowUp;
  let tokenText =
    tokenCount !== undefined && tokenCount > 0 ? `${arrow} ${formatNumber(tokenCount)} tokens` : "";
  if (task.type === "in_process_teammate") {
    if (task.status === "running" && task.awaitingPlanApproval)
      return {
        elapsed: "awaiting approval",
        tokenText: "",
        queuedText,
        queuedCount,
      };
    if (task.isIdle)
      return {
        elapsed: "idle",
        tokenText: "",
        queuedText,
        queuedCount,
      };
    if (isTerminalTaskStatus(task.status)) {
      let startedAt = turnStartTime ?? task.startTime;
      let endTime = task.endTime ?? now;
      return {
        elapsed: formatDuration(Math.max(0, endTime - startedAt)),
        tokenText,
        queuedText,
        queuedCount,
      };
    }
    if (isScreenReaderEnabled)
      return {
        elapsed: "running",
        tokenText: "",
        queuedText,
        queuedCount,
      };
    let startedAt = turnStartTime ?? task.startTime;
    return {
      elapsed: formatDuration(Math.max(0, now - startedAt)),
      tokenText,
      queuedText,
      queuedCount,
    };
  }
  let isActive = !isTerminalTaskStatus(task.status);
  if (isActive && task.isIdle)
    return {
      elapsed: "waiting",
      tokenText: "",
      queuedText,
      queuedCount,
    };
  if (task.status === "completed" && idleAsDone && !hasCompletedWithFindings(task))
    return {
      elapsed: "idle",
      tokenText: "",
      queuedText,
      queuedCount,
    };
  if (isActive && isScreenReaderEnabled)
    return {
      elapsed: "running",
      tokenText: "",
      queuedText,
      queuedCount,
    };
  let totalPausedMs = task.totalPausedMs ?? 0;
  let max = Math.max(
    0,
    isActive
      ? now - task.startTime - totalPausedMs
      : (task.endTime ?? task.startTime) - task.startTime - totalPausedMs,
  );
  return {
    elapsed: formatDuration(max),
    tokenText,
    queuedText,
    queuedCount,
  };
}
//@ chunk-czq1j3j2.js:471915-479100 layout
/**
 * 页脚上方的后台任务面板组件：列出后台 agent / 队友 / 工作流任务行（排队数、token、状态色、限额暂停），处理选中、窗口滚动与"more below"。
 * showWorkflows 为 true 时同时列出运行中的工作流。
 */
function BackgroundTasksPanel(props) {
  let $ = useMemoCache(62);
  let resolvedProps;
  if ($[0] !== props) {
    resolvedProps = props === undefined ? {} : props;
    $[0] = props;
    $[1] = resolvedProps;
  } else resolvedProps = $[1];
  let { showWorkflows } = resolvedProps;
  let includeWorkflows = showWorkflows === undefined ? false : showWorkflows;
  let tasks = useAppState(selectTasks);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let workflowsFooter = useHasRemoteWork();
  let selector;
  if ($[2] !== workflowsFooter || $[3] !== includeWorkflows) {
    selector = (appState) =>
      includeWorkflows && workflowsFooter ? appState.remoteWorkflowRuns : pendingShellLines;
    $[2] = workflowsFooter;
    $[3] = includeWorkflows;
    $[4] = selector;
  } else selector = $[4];
  let appState = useAppState(selector);
  let mainLoopModel = useMainLoopModel_3();
  let appState_2 = useAppState(selectUltracode);
  let ultracodeActive;
  if ($[5] !== mainLoopModel || $[6] !== appState_2) {
    ultracodeActive = isUltracodeActive(appState_2, mainLoopModel);
    $[5] = mainLoopModel;
    $[6] = appState_2;
    $[7] = ultracodeActive;
  } else ultracodeActive = $[7];
  let ultracodeActive_2 = ultracodeActive;
  let { columns } = useTerminalSize();
  let isFooterHidden = subscribeCoordinatorPanel();
  let appStoreDirect = useAppStoreDirect();
  let taskDecorations = useAppState(selectTaskDecorations);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId);
  let agentNameRegistry = useAppState(selectAgentNameRegistry);
  let slackTagConnected = useAppState(selectSlackTagConnected);
  let coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex);
  let appState_3 = useAppState(getTaskOutputDir);
  let appState_4 = useAppState(selectWorkflowsFooter);
  let appState_5 = useAppState(selectWorkflowFooterIndex);
  let appState_6 = useAppState(selectIdleTeammatesExpanded);
  let appState_7 = useAppState(selectIdleTeammatesExpanded_3);
  let selectedIndex = appState_3 ? coordinatorTaskIndex : undefined;
  let setAppState = useSetAppState();
  let taskSummary = useTaskFramework();
  useTheme_2();
  let visibleBackgroundTasks = getVisibleBackgroundTasks(
    tasks,
    taskDecorations,
    viewingAgentTaskId,
    appState_7,
  );
  let any = Object.values(tasks).some(isLiveTaskRow);
  let [progressCache] = useState(createSnapshotCache);
  let workflowTasks;
  if ($[8] !== progressCache || $[9] !== appState || $[10] !== includeWorkflows || $[11] !== tasks) {
    workflowTasks = includeWorkflows
      ? [
          ...runningWorkflowTasks(tasks),
          ...runningRemoteWorkflows(appState).map((run) =>
            cloudWorkflowToTask(run, progressCache.of(run.wireProgress), undefined),
          ),
        ]
      : [];
    $[8] = progressCache;
    $[9] = appState;
    $[10] = includeWorkflows;
    $[11] = tasks;
    $[12] = workflowTasks;
  } else workflowTasks = $[12];
  let runnableWorkflows = workflowTasks;
  let hasWorkflowRows = runnableWorkflows.length > 0;
  let workflowRows;
  if ($[13] !== runnableWorkflows || $[14] !== tasks || $[15] !== ultracodeActive_2) {
    workflowRows = runnableWorkflows.map((workflowTask) => {
      let agentCounts = countWorkflowAgents(workflowTask.workflowProgress, workflowTask.agentCount);
      let rateLimitWait = workflowTask.status === "running" ? workflowTask.rateLimitWait : undefined;
      let bulletColor = isTerminalTaskStatus(workflowTask.status)
        ? getStatusColor(workflowTask.status)
        : rateLimitWait !== undefined
          ? "warning"
          : agentCounts.failedCount > 0
            ? "error"
            : undefined;
      return {
        workflow: workflowTask,
        row: {
          name: collapseWhitespace(
            workflowTask.workflowName ??
              workflowTask.summary ??
              workflowTask.description ??
              "Dynamic workflow",
          ),
          bulletColor,
          doneAgents: agentCounts.done,
          totalAgents: agentCounts.total,
          totalTokens: workflowTask.totalTokens,
          clock: workflowTask,
          pausedStatuses: rateLimitWait && pausedUsageParts(rateLimitWait.resetsAt),
        },
        warning:
          tasks[workflowTask.id] === undefined
            ? undefined
            : workflowSizeSummary({
                scheduledAgents: agentCounts.total,
                startedAgents: agentCounts.started,
                totalTokens: workflowTask.totalTokens,
                ultracodeActive: ultracodeActive_2,
              }),
      };
    });
    $[13] = runnableWorkflows;
    $[14] = tasks;
    $[15] = ultracodeActive_2;
    $[16] = workflowRows;
  } else workflowRows = $[16];
  let workflowRowItems = workflowRows;
  let [warnedWorkflowIds] = useState(newSet_2);
  let warnEffect;
  let warnEffectDeps;
  if ($[17] !== tasks || $[18] !== warnedWorkflowIds || $[19] !== workflowRowItems) {
    warnEffect = () => {
      for (const workflowId of warnedWorkflowIds) {
        if (tasks[workflowId]?.type !== "local_workflow") warnedWorkflowIds.delete(workflowId);
      }
      for (const { workflow, warning } of workflowRowItems) {
        if (warning && !isTerminalTaskStatus(workflow.status) && !warnedWorkflowIds.has(workflow.id)) {
          warnedWorkflowIds.add(workflow.id);
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
    warnEffectDeps = [workflowRowItems, tasks, warnedWorkflowIds];
    $[17] = tasks;
    $[18] = warnedWorkflowIds;
    $[19] = workflowRowItems;
    $[20] = warnEffect;
    $[21] = warnEffectDeps;
  } else {
    warnEffect = $[20];
    warnEffectDeps = $[21];
  }
  useEffect(warnEffect, warnEffectDeps);
  let hasWorkflowWarning =
    isFooterHidden &&
    runningWorkflowTasks(tasks).some((workflowTask) => {
      if (isTerminalTaskStatus(workflowTask.status)) {
        return false;
      }
      if (warnedWorkflowIds.has(workflowTask.id)) {
        return true;
      }
      let agentCounts = countWorkflowAgents(workflowTask.workflowProgress, workflowTask.agentCount);
      return (
        workflowSizeSummary({
          scheduledAgents: agentCounts.total,
          startedAgents: agentCounts.started,
          totalTokens: workflowTask.totalTokens,
          ultracodeActive: ultracodeActive_2,
        }) !== undefined
      );
    });
  usePluginInstallationStatus(
    WORKFLOW_SIZE_WARNING,
    "medium",
    hasWorkflowWarning ? LARGE_WORKFLOW_STOP_HINT_PLAIN : null,
    identity,
  );
  let [now, setNow] = useState(nowMs);
  let evictSweepCached;
  if (
    $[22] !== isFooterHidden ||
    $[23] !== setAppState ||
    $[24] !== taskSummary ||
    $[25] !== tasks ||
    $[26] !== viewingAgentTaskId
  ) {
    evictSweepCached = () => {
      let now = Date.now();
      let hasActiveAgent = false;
      let expiredIds = [];
      let hasOtherActive = hasOtherActiveAgents(tasks);
      let idleExtendIds = [];
      let ancestorExtendIds = [];
      let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
      for (const task of Object.values(tasks)) {
        if (task.type === "local_workflow") {
          if (task.status !== "running" && (task.evictAfter ?? Infinity) <= now)
            taskSummary.evictTerminal(task.id);
          continue;
        }
        if (!isPanelOrTeammateTask(task)) {
          continue;
        }
        let isHeldBySibling = task.type === "in_process_teammate" && task.evictAfterHeldBySibling === true;
        if (isTerminalTaskStatus(task.status)) {
          if (
            task.type === "local_agent" &&
            ancestorTaskIds.has(task.id) &&
            task.evictAfter !== undefined &&
            task.evictAfter > 0 &&
            task.evictAfter <= now + MCP_TASK_KEEPALIVE_MS - 5000
          )
            ancestorExtendIds.push(task.id);
          else if (task.evictAfter !== undefined && task.evictAfter <= now)
            taskSummary.evictTerminal(task.id);
        } else if (
          (hasOtherActive || isHeldBySibling) &&
          task.isIdle &&
          task.evictAfter !== undefined &&
          task.evictAfter > 0
        ) {
          if (hasOtherActive !== isHeldBySibling || task.evictAfter - now < MCP_TASK_KEEPALIVE_MS / 2)
            idleExtendIds.push(task.id);
        } else if (task.evictAfter !== undefined && task.evictAfter > 0 && task.evictAfter <= now)
          expiredIds.push(task.id);
        else if (!isTerminalTaskStatus(task.status) && !task.isIdle) hasActiveAgent = true;
      }
      if (expiredIds.length > 0 || idleExtendIds.length > 0 || ancestorExtendIds.length > 0)
        setAppState((state) => {
          let nextTasks;
          for (const taskId of expiredIds) {
            let task = state.tasks[taskId];
            if (isTeammateDueForEviction(task, now, taskSummary)) {
              if (nextTasks === undefined)
                nextTasks = {
                  ...state.tasks,
                };
              nextTasks[taskId] = {
                ...task,
                evictAfter: 0,
              };
            }
          }
          for (const taskId of idleExtendIds) {
            let task = state.tasks[taskId];
            if (isEvictingIdleTeammate(task)) {
              if (nextTasks === undefined)
                nextTasks = {
                  ...state.tasks,
                };
              nextTasks[taskId] = {
                ...task,
                evictAfter: now + MCP_TASK_KEEPALIVE_MS,
                evictAfterHeldBySibling: hasOtherActive ? true : undefined,
              };
            }
          }
          for (const taskId of ancestorExtendIds) {
            let task = state.tasks[taskId];
            if (
              isPanelOrTeammateTask(task) &&
              isTerminalTaskStatus(task.status) &&
              task.evictAfter !== undefined &&
              task.evictAfter > 0
            ) {
              if (nextTasks === undefined)
                nextTasks = {
                  ...state.tasks,
                };
              nextTasks[taskId] = {
                ...task,
                evictAfter: now + MCP_TASK_KEEPALIVE_MS,
              };
            }
          }
          return nextTasks
            ? {
                ...state,
                tasks: nextTasks,
              }
            : state;
        });
      if (hasActiveAgent && !isFooterHidden) setNow(now);
    };
    $[22] = isFooterHidden;
    $[23] = setAppState;
    $[24] = taskSummary;
    $[25] = tasks;
    $[26] = viewingAgentTaskId;
    $[27] = evictSweepCached;
  } else evictSweepCached = $[27];
  useInterval(evictSweepCached, any || hasWorkflowRows ? 1000 : null);
  let nameByTaskId;
  if ($[28] !== agentNameRegistry) {
    nameByTaskId = new Map();
    for (const [rawName, taskId] of agentNameRegistry) nameByTaskId.set(taskId, collapseWhitespace(rawName));
    $[28] = agentNameRegistry;
    $[29] = nameByTaskId;
  } else nameByTaskId = $[29];
  let rowHeightByRun = nameByTaskId;
  let isViewingAgentCached;
  if ($[30] !== tasks || $[31] !== viewingAgentTaskId) {
    isViewingAgentCached =
      viewingAgentTaskId !== undefined && isPanelOrTeammateTask(tasks[viewingAgentTaskId]);
    $[30] = tasks;
    $[31] = viewingAgentTaskId;
    $[32] = isViewingAgentCached;
  } else isViewingAgentCached = $[32];
  let isViewingAgent = isViewingAgentCached;
  if (isFooterHidden || (visibleBackgroundTasks.length === 0 && !hasWorkflowRows && !isViewingAgent)) {
    return null;
  }
  let rawSelectedIndex = selectedIndex ?? 0;
  let focusIndex = clamp(
    rawSelectedIndex >= 1
      ? rawSelectedIndex - 1
      : visibleBackgroundTasks.findIndex(
          (visibleBackgroundTask) => visibleBackgroundTask.id === viewingAgentTaskId,
        ),
    0,
    Math.max(0, visibleBackgroundTasks.length - 1),
  );
  let { windowStart, windowEnd, moreAbove, moreBelow } = computeScrollWindow(
    focusIndex,
    visibleBackgroundTasks.length,
    MAX_VISIBLE_WORKFLOW_ROWS,
  );
  let ancestorTaskIds = collectAncestorTaskIds(tasks, viewingAgentTaskId);
  let mapped = visibleBackgroundTasks.map((visibleBackgroundTask) =>
    isAgentRowVisible(visibleBackgroundTask) || ancestorTaskIds.has(visibleBackgroundTask.id)
      ? 0
      : countVisibleDescendants(
          tasks,
          extractTeammateTranscriptsFromTasks(visibleBackgroundTask),
          ancestorTaskIds,
        ),
  );
  let mapped_2 = visibleBackgroundTasks.map((visibleBackgroundTask) =>
    isAgentRowVisible(visibleBackgroundTask)
      ? 0
      : ancestorDepth(tasks, visibleBackgroundTask, ancestorTaskIds),
  );
  let descendantSuffixer = plusCountSuffix;
  const mapped_3 = visibleBackgroundTasks.map((visibleBackgroundTask, rowIndex) =>
    !isAgentRowVisible(visibleBackgroundTask) &&
    taskDecorations[visibleBackgroundTask.id]?.content === undefined
      ? 2 * mapped_2[rowIndex] +
        bunStringWidth(rowHeightByRun.get(visibleBackgroundTask.id) ?? agentRowLabel(visibleBackgroundTask)) +
        bunStringWidth(descendantSuffixer(mapped[rowIndex]))
      : 0,
  );
  let labelRows;
  if ($[33] !== workflowRowItems) {
    labelRows = workflowRowItems.map(rowNameWidth);
    $[33] = workflowRowItems;
    $[34] = labelRows;
  } else labelRows = $[34];
  let min = Math.min(28, Math.max(4, ...mapped_3, ...labelRows));
  let agentLineCached;
  if (
    $[35] !== isScreenReaderEnabled ||
    $[36] !== rowHeightByRun ||
    $[37] !== now ||
    $[38] !== appStoreDirect
  ) {
    agentLineCached = (task) =>
      isAgentRowVisible(task)
        ? undefined
        : AgentLine(
            task,
            now,
            appStoreDirect.getState().transcripts[task.id]?.turnStartTime,
            rowHeightByRun.has(task.id),
            isScreenReaderEnabled,
          );
    $[35] = isScreenReaderEnabled;
    $[36] = rowHeightByRun;
    $[37] = now;
    $[38] = appStoreDirect;
    $[39] = agentLineCached;
  } else agentLineCached = $[39];
  let mapped_4 = visibleBackgroundTasks.map(agentLineCached);
  let statusWidthFor = (links) =>
    Math.max(
      0,
      ...mapped_4.map((line, rowIndex) =>
        line !== undefined && taskDecorations[visibleBackgroundTasks[rowIndex].id]?.content === undefined
          ? bunStringWidth(
              [line.elapsed, line.tokenText, line.queuedText, links[rowIndex]?.label]
                .filter(Boolean)
                .join(" \xB7 "),
            )
          : 0,
      ),
    );
  let linkCached;
  if ($[40] !== slackTagConnected) {
    linkCached = (task) =>
      isAgentRowVisible(task) ? undefined : noopSlackTagHandler(task, slackTagConnected);
    $[40] = slackTagConnected;
    $[41] = linkCached;
  } else linkCached = $[41];
  let links = visibleBackgroundTasks.map(linkCached);
  let statusWidth = statusWidthFor(links);
  if (
    links.some(Boolean) &&
    agentRowPrefixWidth() + min + 3 + statusWidth > columns - AGENT_ROW_WIDTH_RESERVE
  ) {
    links = links.map(noopTaskClickHandler);
    statusWidth = statusWidthFor(links);
  }
  const BoxComponent = Box;
  const flexDirection = "column";
  const marginTop = 1;
  const paddingRight = AGENT_ROW_WIDTH_RESERVE;
  const mainLineElement =
    (visibleBackgroundTasks.length > 0 || isViewingAgent) &&
    jsxProd_default(MainLine, {
      isSelected: selectedIndex === 0,
      isViewed: viewingAgentTaskId === undefined,
      labelWidth: min,
      moreAbove,
      onClick: () => exitTeammateView((state) => setAppState(selectTaskRowUpdater(0, state))),
    });
  const mapped_5 = visibleBackgroundTasks
    .slice(windowStart, windowEnd)
    .map((visibleBackgroundTask, offset) => {
      let rowIndex = windowStart + offset;
      if (isAgentRowVisible(visibleBackgroundTask)) {
        return jsxProd_default(
          IdleAgentsSummaryRow,
          {
            count: visibleBackgroundTask.taskIds.length,
            isSelected: selectedIndex === rowIndex + 1,
            onClick: () => setAppState(selectTaskRowUpdater(rowIndex + 1, expandIdleTeammates)),
          },
          visibleBackgroundTask.id,
        );
      }
      let task = visibleBackgroundTask;
      let depth = mapped_2[rowIndex];
      let ancestorId = nearestVisibleAncestorId(tasks, task, ancestorTaskIds);
      let ancestorVisible =
        ancestorId !== undefined &&
        visibleBackgroundTasks.findIndex(
          (visibleBackgroundTask) => visibleBackgroundTask.id === ancestorId,
        ) >= windowStart;
      let treeConnector;
      if (depth > 0 && ancestorVisible) {
        let any = visibleBackgroundTasks
          .slice(rowIndex + 1)
          .some(
            (visibleBackgroundTask) =>
              !isAgentRowVisible(visibleBackgroundTask) &&
              nearestVisibleAncestorId(tasks, visibleBackgroundTask, ancestorTaskIds) === ancestorId,
          );
        treeConnector = repeatString("  ", depth - 1) + (any ? TREE_GLYPHS.branch : TREE_GLYPHS.last) + " ";
      }
      let link = links[rowIndex];
      return jsxProd_default(
        CoordinatorTaskRow,
        {
          task,
          name: rowHeightByRun.get(task.id),
          link,
          decoration: taskDecorations[task.id],
          isSelected: selectedIndex === rowIndex + 1,
          isViewed: viewingAgentTaskId === task.id,
          treeConnector,
          descendantSuffix: descendantSuffixer(mapped[rowIndex]),
          labelWidth: min,
          statusWidth,
          statusParts: mapped_4[rowIndex],
          onClick: (event) => {
            if (link !== undefined && event.hyperlinkUrl === link.url) {
              return event.allowDefault();
            }
            enterTeammateView(task.id, (state) => setAppState(selectTaskRowUpdater(rowIndex + 1, state)));
          },
        },
        task.id,
      );
    });
  let moreBelowElement;
  if ($[42] !== moreBelow || $[43] !== visibleBackgroundTasks.length) {
    moreBelowElement =
      visibleBackgroundTasks.length > MAX_VISIBLE_WORKFLOW_ROWS &&
      jsxProd_default(Box, {
        justifyContent: "flex-start",
        children: jsxProd_default(Text, {
          dimColor: true,
          children: moreBelow > 0 ? `  ${DOWN_ARROW} ${moreBelow} more` : " ",
        }),
      });
    $[42] = moreBelow;
    $[43] = visibleBackgroundTasks.length;
    $[44] = moreBelowElement;
  } else moreBelowElement = $[44];
  let workflowRowElements;
  if (
    $[45] !== columns ||
    $[46] !== min ||
    $[47] !== setAppState ||
    $[48] !== tasks ||
    $[49] !== warnedWorkflowIds ||
    $[50] !== appState_5 ||
    $[51] !== appState_6 ||
    $[52] !== workflowRowItems ||
    $[53] !== appState_4
  ) {
    workflowRowElements = workflowRowItems.map((workflowRow, index) => {
      let { workflow, row, warning } = workflowRow;
      return jsxProd_default(
        AgentStatusRow,
        {
          row,
          isWarned:
            !isTerminalTaskStatus(workflow.status) &&
            (warning !== undefined || warnedWorkflowIds.has(workflow.id)),
          prefixWidth: agentRowPrefixWidth(),
          labelWidth: min,
          rowWidth: columns - AGENT_ROW_WIDTH_RESERVE,
          isSelected:
            appState_4 && (appState_6 === undefined ? appState_5 === index : appState_6 === workflow.id),
          onClick: () =>
            setAppState((state) =>
              state.workflowDetail?.taskId === workflow.id
                ? state
                : {
                    ...state,
                    workflowDetail: {
                      taskId: workflow.id,
                      isCloudRun: tasks[workflow.id] === undefined,
                    },
                  },
            ),
        },
        workflow.id,
      );
    });
    $[45] = columns;
    $[46] = min;
    $[47] = setAppState;
    $[48] = tasks;
    $[49] = warnedWorkflowIds;
    $[50] = appState_5;
    $[51] = appState_6;
    $[52] = workflowRowItems;
    $[53] = appState_4;
    $[54] = workflowRowElements;
  } else workflowRowElements = $[54];
  let panelElement;
  if (
    $[55] !== BoxComponent ||
    $[56] !== paddingRight ||
    $[57] !== mainLineElement ||
    $[58] !== mapped_5 ||
    $[59] !== moreBelowElement ||
    $[60] !== workflowRowElements
  ) {
    panelElement = jsxProd_default_2(BoxComponent, {
      flexDirection,
      marginTop,
      paddingRight,
      children: [mainLineElement, mapped_5, moreBelowElement, workflowRowElements],
    });
    $[55] = BoxComponent;
    $[56] = paddingRight;
    $[57] = mainLineElement;
    $[58] = mapped_5;
    $[59] = moreBelowElement;
    $[60] = workflowRowElements;
    $[61] = panelElement;
  } else panelElement = $[61];
  return panelElement;
}
//@ chunk-czq1j3j2.js:479100-481493 layout
/**
 * 任务面板获得焦点时页脚显示的快捷键提示行：按当前选中项（主会话 / agent / 分组 / 工作流）显示 select、view、stop all 等按键。
 */
function TaskPanelFooterHints() {
  let $ = useMemoCache(38);
  let tasks = useAppState(selectTasks_2_2);
  let workflow = useAppState(selectTaskDecorations_2);
  let taskDecorations = useAppState(selectViewingAgentTaskId_2);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId_3);
  let viewSelectionMode = useAppState(selectViewSelectionMode);
  let appState = useAppState(selectCoordinatorTaskIndex_3);
  let coordinatorTaskIndex = useAppState(selectWorkflowFooterIndex_2);
  let appState_2 = useAppState(selectIdleTeammatesExpanded_2);
  let stopAll = useShortcutDisplay_2("chat:killAgents", "Chat", TASK_PANEL_KEYS.stopAll);
  let shortcutDisplay = useShortcutDisplay("footer:openSelected", "Footer", TASK_PANEL_KEYS.open);
  let shortcutDisplay_2 = useShortcutDisplay("footer:close", "Footer", TASK_PANEL_KEYS.close);
  let collapse = useShortcutDisplay("footer:clearSelection", "Footer", TASK_PANEL_KEYS.collapse);
  const shortcutDisplayText = useShortcutDisplayText("footer:up", "Footer", TASK_PANEL_KEYS.select[0]);
  const shortcutDisplayText_2 = useShortcutDisplayText("footer:down", "Footer", TASK_PANEL_KEYS.select[1]);
  let selectKeys;
  if ($[0] !== shortcutDisplayText || $[1] !== shortcutDisplayText_2) {
    selectKeys = [shortcutDisplayText, shortcutDisplayText_2];
    $[0] = shortcutDisplayText;
    $[1] = shortcutDisplayText_2;
    $[2] = selectKeys;
  } else selectKeys = $[2];
  let selectChord = selectKeys;
  let selectHint;
  if ($[3] !== selectChord) {
    selectHint =
      selectChord.some(Boolean) &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: selectChord,
        action: "select",
      });
    $[3] = selectChord;
    $[4] = selectHint;
  } else selectHint = $[4];
  let selectHintNode = selectHint;
  let { columns } = useTerminalSize();
  let footerHints;
  if (appState === "tasks" && coordinatorTaskIndex >= 0) {
    if (
      $[5] !== shortcutDisplay_2 ||
      $[6] !== collapse ||
      $[7] !== columns ||
      $[8] !== coordinatorTaskIndex ||
      $[9] !== appState_2 ||
      $[10] !== stopAll ||
      $[11] !== shortcutDisplay ||
      $[12] !== selectChord ||
      $[13] !== selectHintNode ||
      $[14] !== taskDecorations ||
      $[15] !== tasks ||
      $[16] !== viewSelectionMode ||
      $[17] !== viewingAgentTaskId
    ) {
      let visibleBackgroundTasks = getVisibleBackgroundTasks(
        tasks,
        taskDecorations,
        viewingAgentTaskId,
        appState_2,
      );
      let selectedTask =
        coordinatorTaskIndex >= 1 ? visibleBackgroundTasks[coordinatorTaskIndex - 1] : undefined;
      let onViewedRow =
        selectedTask !== undefined &&
        isViewingThisAgent(selectedTask, {
          viewSelectionMode,
          viewingAgentTaskId,
        });
      let isViewingSelected = coordinatorTaskIndex === 0 && viewSelectionMode !== "viewing-agent";
      if (selectedTask === undefined) {
        let viewHint;
        if ($[19] !== isViewingSelected || $[20] !== shortcutDisplay) {
          viewHint =
            shortcutDisplay &&
            !isViewingSelected &&
            jsxProd_default(KeyboardShortcutHint, {
              chord: shortcutDisplay,
              action: "view",
            });
          $[19] = isViewingSelected;
          $[20] = shortcutDisplay;
          $[21] = viewHint;
        } else viewHint = $[21];
        let idleByline;
        if ($[22] !== selectHintNode || $[23] !== viewHint) {
          idleByline = jsxProd_default_2(Byline, {
            children: [selectHintNode, viewHint],
          });
          $[22] = selectHintNode;
          $[23] = viewHint;
          $[24] = idleByline;
        } else idleByline = $[24];
        footerHints = idleByline;
      } else if (isAgentRowVisible(selectedTask)) {
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
        let expandByline;
        if ($[27] !== children) {
          expandByline = jsxProd_default(Byline, {
            children,
          });
          $[27] = children;
          $[28] = expandByline;
        } else expandByline = $[28];
        footerHints = expandByline;
      } else {
        const closeAction = isTaskStillActive(selectedTask) ? "stop" : "clear";
        const showCollapse = appState_2 && hasFoldedIdleTeammates(visibleBackgroundTasks, viewingAgentTaskId);
        let evictableCount;
        if ($[29] !== tasks) {
          evictableCount = countWhere(Object.values(tasks), isEvictableIdleTeammate);
          $[29] = tasks;
          $[30] = evictableCount;
        } else evictableCount = $[30];
        let keyOptions = {
          onViewedRow,
          closeAction,
          showCollapse,
          showStopAll: evictableCount > 1,
        };
        let actions = CoordinatorPanelKeys({
          ...keyOptions,
          keys: {
            open: shortcutDisplay,
            close: shortcutDisplay_2,
            collapse,
            select: selectChord,
            stopAll,
          },
        });
        let widthDelta =
          shortcutHintsWidth(actions) -
          shortcutHintsWidth(
            CoordinatorPanelKeys({
              ...keyOptions,
              keys: TASK_PANEL_KEYS,
            }),
          );
        let visibleActions =
          columns >= 90 + Math.max(0, widthDelta) ? actions : actions.filter(isNotStopAllAction);
        footerHints = jsxProd_default(Byline, {
          children: visibleActions.map(renderShortcutHint),
        });
      }
      $[5] = shortcutDisplay_2;
      $[6] = collapse;
      $[7] = columns;
      $[8] = coordinatorTaskIndex;
      $[9] = appState_2;
      $[10] = stopAll;
      $[11] = shortcutDisplay;
      $[12] = selectChord;
      $[13] = selectHintNode;
      $[14] = taskDecorations;
      $[15] = tasks;
      $[16] = viewSelectionMode;
      $[17] = viewingAgentTaskId;
      $[18] = footerHints;
    } else footerHints = $[18];
  } else if (appState === "workflows") {
    let workflowByline;
    if (
      $[31] !== shortcutDisplay_2 ||
      $[32] !== shortcutDisplay ||
      $[33] !== selectHintNode ||
      $[34] !== workflow
    ) {
      workflowByline = workflow
        ? jsxProd_default_2(Byline, {
            children: [
              shortcutDisplay &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: shortcutDisplay,
                  action: "view",
                }),
              shortcutDisplay_2 &&
                workflow !== "none" &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: shortcutDisplay_2,
                  action: workflow,
                }),
            ],
          })
        : jsxProd_default_2(Byline, {
            children: [
              selectHintNode,
              shortcutDisplay &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: shortcutDisplay,
                  action: "view",
                }),
            ],
          });
      $[31] = shortcutDisplay_2;
      $[32] = shortcutDisplay;
      $[33] = selectHintNode;
      $[34] = workflow;
      $[35] = workflowByline;
    } else workflowByline = $[35];
    footerHints = workflowByline;
  }
  let footerNode;
  if ($[36] !== footerHints) {
    footerNode =
      footerHints !== undefined
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate",
            children: footerHints,
          })
        : null;
    $[36] = footerHints;
    $[37] = footerNode;
  } else footerNode = $[37];
  return footerNode;
}
//@ chunk-czq1j3j2.js:481493-481545 layout
function useVisibleAgentTaskCount() {
  let [countSelector] = useState(makeVisibleTaskCountSelector);
  let appState = useAppState(countSelector);
  return subscribeCoordinatorPanel() ? 0 : appState;
}
//@ chunk-czq1j3j2.js:481545-482180 layout
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
    let viewingVisible =
      state.viewingAgentTaskId !== undefined && isPanelOrTeammateTask(state.tasks[state.viewingAgentTaskId]);
    let count = visibleCount > 0 || viewingVisible ? visibleCount + 1 : 0;
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
//@ chunk-czq1j3j2.js:482180-483089 fingerprint (2.1.88 match: MainLine, 0.512)
function MainLine(props) {
  let $ = useMemoCache(16);
  let { isSelected, isViewed, labelWidth, moreAbove, onClick } = props;
  let [hover, setHover] = useState(false);
  let onClick_2 = useStrayClickGuarded(onClick);
  let prefix = isSelected || hover ? figures_default.pointer + " " : "  ";
  let bullet = isViewed ? BLACK_CIRCLE : figures_default.circle;
  let moreAboveLabel = moreAbove > 0 ? `${UP_ARROW} ${moreAbove} more` : "";
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
  let mainLabelElement;
  if ($[7] !== width || $[8] !== children) {
    mainLabelElement = jsxProd_default(Box, {
      width,
      flexShrink: 0,
      children,
    });
    $[7] = width;
    $[8] = children;
    $[9] = mainLabelElement;
  } else mainLabelElement = $[9];
  let moreAboveElement;
  if ($[10] !== moreAboveLabel) {
    moreAboveElement =
      moreAboveLabel &&
      jsxProd_default(Text, {
        dimColor: true,
        children: moreAboveLabel,
      });
    $[10] = moreAboveLabel;
    $[11] = moreAboveElement;
  } else moreAboveElement = $[11];
  let rowElement;
  if ($[12] !== onClick_2 || $[13] !== mainLabelElement || $[14] !== moreAboveElement) {
    rowElement = jsxProd_default_2(Box, {
      justifyContent: "space-between",
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [mainLabelElement, moreAboveElement],
    });
    $[12] = onClick_2;
    $[13] = mainLabelElement;
    $[14] = moreAboveElement;
    $[15] = rowElement;
  } else rowElement = $[15];
  return rowElement;
}
//@ chunk-czq1j3j2.js:483089-487214 placement
/**
 * 协调者模式代理状态面板中的单行任务。
 */
function CoordinatorTaskRow(props) {
  let $ = useMemoCache(88);
  let {
    task,
    name: nameProp,
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
  let [isHovered, setIsHovered] = useState(false);
  let onClick_2 = useStrayClickGuarded(onClick);
  let { elapsed, tokenText, queuedText, queuedCount } = statusParts;
  let summaryCached;
  if ($[0] !== task.description || $[1] !== task.progress?.summary) {
    summaryCached = collapseWhitespace(task.progress?.summary ?? "") || collapseWhitespace(task.description);
    $[0] = task.description;
    $[1] = task.progress?.summary;
    $[2] = summaryCached;
  } else summaryCached = $[2];
  let children = summaryCached;
  let isHighlighted = isSelected || isHovered;
  let children_2 = isHighlighted ? figures_default.pointer + " " : "  ";
  let bulletGlyph = isViewed ? BLACK_CIRCLE : figures_default.circle;
  let statusColorCached;
  if ($[3] !== task) {
    statusColorCached = isTaskStillActive(task) ? undefined : getStatusColor(task.status);
    $[3] = task;
    $[4] = statusColorCached;
  } else statusColorCached = $[4];
  let statusColor = statusColorCached;
  let isDimmed = !isHighlighted && !isViewed;
  let pointerElement;
  if ($[5] !== isDimmed || $[6] !== isViewed || $[7] !== children_2) {
    pointerElement = jsxProd_default(Text, {
      dimColor: isDimmed,
      bold: isViewed,
      children: children_2,
    });
    $[5] = isDimmed;
    $[6] = isViewed;
    $[7] = children_2;
    $[8] = pointerElement;
  } else pointerElement = $[8];
  let connectorElement;
  if ($[9] !== isDimmed || $[10] !== treeConnector) {
    connectorElement =
      treeConnector !== undefined &&
      jsxProd_default(Text, {
        dimColor: isDimmed,
        children: treeConnector,
      });
    $[9] = isDimmed;
    $[10] = treeConnector;
    $[11] = connectorElement;
  } else connectorElement = $[11];
  const dimColor = !statusColor && isDimmed;
  let bulletElement;
  if ($[12] !== bulletGlyph || $[13] !== statusColor || $[14] !== isViewed || $[15] !== dimColor) {
    bulletElement = jsxProd_default_2(Text, {
      color: statusColor,
      dimColor,
      bold: isViewed,
      children: [bulletGlyph, " "],
    });
    $[12] = bulletGlyph;
    $[13] = statusColor;
    $[14] = isViewed;
    $[15] = dimColor;
    $[16] = bulletElement;
  } else bulletElement = $[16];
  let prefixRow;
  if ($[17] !== pointerElement || $[18] !== connectorElement || $[19] !== bulletElement) {
    prefixRow = jsxProd_default_2(Fragment, {
      children: [pointerElement, connectorElement, bulletElement],
    });
    $[17] = pointerElement;
    $[18] = connectorElement;
    $[19] = bulletElement;
    $[20] = prefixRow;
  } else prefixRow = $[20];
  let children_3 = prefixRow;
  let connectorWidthCached;
  if ($[21] !== treeConnector) {
    connectorWidthCached = treeConnector ? bunStringWidth(treeConnector) : 0;
    $[21] = treeConnector;
    $[22] = connectorWidthCached;
  } else connectorWidthCached = $[22];
  let connectorWidth = connectorWidthCached;
  let width = agentRowPrefixWidth() + connectorWidth;
  let width_2 = Math.max(0, labelWidth - connectorWidth);
  if (decoration?.content !== undefined) {
    let onMouseLeave;
    let onMouseEnter;
    if ($[23] === MEMO_CACHE_SENTINEL) {
      onMouseEnter = () => setIsHovered(true);
      onMouseLeave = () => setIsHovered(false);
      $[23] = onMouseLeave;
      $[24] = onMouseEnter;
    } else {
      onMouseLeave = $[23];
      onMouseEnter = $[24];
    }
    let prefixBox;
    if ($[25] !== children_3 || $[26] !== width) {
      prefixBox = jsxProd_default(Box, {
        width,
        flexShrink: 0,
        children: children_3,
      });
      $[25] = children_3;
      $[26] = width;
      $[27] = prefixBox;
    } else prefixBox = $[27];
    let children;
    if ($[28] !== decoration.content) {
      children = jsxProd_default(Ansi, {
        children: decoration.content,
      });
      $[28] = decoration.content;
      $[29] = children;
    } else children = $[29];
    let decorationBox;
    if ($[30] !== isDimmed || $[31] !== isViewed || $[32] !== children) {
      decorationBox = jsxProd_default(Box, {
        flexGrow: 1,
        width: 0,
        children: jsxProd_default(Text, {
          dimColor: isDimmed,
          bold: isViewed,
          wrap: "truncate",
          children,
        }),
      });
      $[30] = isDimmed;
      $[31] = isViewed;
      $[32] = children;
      $[33] = decorationBox;
    } else decorationBox = $[33];
    let decorationRow;
    if ($[34] !== onClick_2 || $[35] !== prefixBox || $[36] !== decorationBox) {
      decorationRow = jsxProd_default_2(Box, {
        onClick: onClick_2,
        onMouseEnter,
        onMouseLeave,
        children: [prefixBox, decorationBox],
      });
      $[34] = onClick_2;
      $[35] = prefixBox;
      $[36] = decorationBox;
      $[37] = decorationRow;
    } else decorationRow = $[37];
    return decorationRow;
  }
  let onMouseLeave;
  let onMouseEnter;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
    $[38] = onMouseLeave;
    $[39] = onMouseEnter;
  } else {
    onMouseLeave = $[38];
    onMouseEnter = $[39];
  }
  let plainPrefixBox;
  if ($[40] !== children_3 || $[41] !== width) {
    plainPrefixBox = jsxProd_default(Box, {
      width,
      flexShrink: 0,
      children: children_3,
    });
    $[40] = children_3;
    $[41] = width;
    $[42] = plainPrefixBox;
  } else plainPrefixBox = $[42];
  const dimColor_2 = !nameProp && isDimmed;
  let labelCached;
  if ($[43] !== nameProp || $[44] !== task) {
    labelCached = nameProp ?? agentRowLabel(task);
    $[43] = nameProp;
    $[44] = task;
    $[45] = labelCached;
  } else labelCached = $[45];
  let suffixElement;
  if ($[46] !== descendantSuffix) {
    suffixElement =
      descendantSuffix &&
      jsxProd_default(Text, {
        dimColor: true,
        children: descendantSuffix,
      });
    $[46] = descendantSuffix;
    $[47] = suffixElement;
  } else suffixElement = $[47];
  let children_4;
  if ($[48] !== isViewed || $[49] !== dimColor_2 || $[50] !== labelCached || $[51] !== suffixElement) {
    children_4 = jsxProd_default_2(Text, {
      bold: isViewed,
      dimColor: dimColor_2,
      wrap: "truncate",
      children: [labelCached, suffixElement],
    });
    $[48] = isViewed;
    $[49] = dimColor_2;
    $[50] = labelCached;
    $[51] = suffixElement;
    $[52] = children_4;
  } else children_4 = $[52];
  let labelBox;
  if ($[53] !== width_2 || $[54] !== children_4) {
    labelBox = jsxProd_default(Box, {
      width: width_2,
      flexShrink: 0,
      children: children_4,
    });
    $[53] = width_2;
    $[54] = children_4;
    $[55] = labelBox;
  } else labelBox = $[55];
  let descriptionBox;
  if ($[56] !== isDimmed || $[57] !== children || $[58] !== isViewed) {
    descriptionBox = jsxProd_default(Box, {
      flexGrow: 1,
      width: 0,
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        dimColor: isDimmed,
        bold: isViewed,
        wrap: "truncate",
        children,
      }),
    });
    $[56] = isDimmed;
    $[57] = children;
    $[58] = isViewed;
    $[59] = descriptionBox;
  } else descriptionBox = $[59];
  let statusPartsList;
  if ($[60] !== elapsed || $[61] !== tokenText) {
    statusPartsList = [elapsed, tokenText].filter(Boolean);
    $[60] = elapsed;
    $[61] = tokenText;
    $[62] = statusPartsList;
  } else statusPartsList = $[62];
  const joined = statusPartsList.join(" \xB7 ");
  let queuedElement;
  if ($[63] !== elapsed || $[64] !== queuedCount || $[65] !== queuedText || $[66] !== tokenText) {
    queuedElement =
      queuedCount > 0 &&
      jsxProd_default_2(Text, {
        color: "warning",
        children: [elapsed || tokenText ? " \xB7 " : "", queuedText],
      });
    $[63] = elapsed;
    $[64] = queuedCount;
    $[65] = queuedText;
    $[66] = tokenText;
    $[67] = queuedElement;
  } else queuedElement = $[67];
  let linkElement;
  if ($[68] !== elapsed || $[69] !== link || $[70] !== queuedCount || $[71] !== tokenText) {
    linkElement =
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
    $[72] = linkElement;
  } else linkElement = $[72];
  let children_5;
  if (
    $[73] !== isDimmed ||
    $[74] !== isViewed ||
    $[75] !== joined ||
    $[76] !== queuedElement ||
    $[77] !== linkElement
  ) {
    children_5 = jsxProd_default_2(Text, {
      dimColor: isDimmed,
      bold: isViewed,
      children: [joined, queuedElement, linkElement],
    });
    $[73] = isDimmed;
    $[74] = isViewed;
    $[75] = joined;
    $[76] = queuedElement;
    $[77] = linkElement;
    $[78] = children_5;
  } else children_5 = $[78];
  let statusBox;
  if ($[79] !== statusWidth || $[80] !== children_5) {
    statusBox = jsxProd_default(Box, {
      minWidth: statusWidth,
      flexShrink: 0,
      marginLeft: 1,
      justifyContent: "flex-end",
      children: children_5,
    });
    $[79] = statusWidth;
    $[80] = children_5;
    $[81] = statusBox;
  } else statusBox = $[81];
  let rowElement;
  if (
    $[82] !== onClick_2 ||
    $[83] !== plainPrefixBox ||
    $[84] !== labelBox ||
    $[85] !== descriptionBox ||
    $[86] !== statusBox
  ) {
    rowElement = jsxProd_default_2(Box, {
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [plainPrefixBox, labelBox, descriptionBox, statusBox],
    });
    $[82] = onClick_2;
    $[83] = plainPrefixBox;
    $[84] = labelBox;
    $[85] = descriptionBox;
    $[86] = statusBox;
    $[87] = rowElement;
  } else rowElement = $[87];
  return rowElement;
}
//@ chunk-czq1j3j2.js:487214-488177 placement
function IdleAgentsSummaryRow(props) {
  let $ = useMemoCache(18);
  let { count, isSelected, onClick } = props;
  let [isHovered, setIsHovered] = useState(false);
  let onClick_2 = useStrayClickGuarded(onClick);
  let isHighlighted = isSelected || isHovered;
  let children = isHighlighted ? figures_default.pointer + " " : "  ";
  let dimColor = !isHighlighted;
  let onMouseEnter;
  let onMouseLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
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
  let pointerElement;
  if ($[3] !== dimColor || $[4] !== children) {
    pointerElement = jsxProd_default(Text, {
      dimColor,
      children,
    });
    $[3] = dimColor;
    $[4] = children;
    $[5] = pointerElement;
  } else pointerElement = $[5];
  let dotElement;
  if ($[6] !== dimColor) {
    dotElement = jsxProd_default_2(Text, {
      dimColor,
      children: [figures_default.circle, " "],
    });
    $[6] = dimColor;
    $[7] = dotElement;
  } else dotElement = $[7];
  let prefixElement;
  if ($[8] !== pointerElement || $[9] !== dotElement) {
    prefixElement = jsxProd_default_2(Box, {
      width,
      flexShrink: 0,
      children: [pointerElement, dotElement],
    });
    $[8] = pointerElement;
    $[9] = dotElement;
    $[10] = prefixElement;
  } else prefixElement = $[10];
  const children_2 = count === 1 ? "1 idle agent" : `${count} idle agents`;
  let labelElement;
  if ($[11] !== dimColor || $[12] !== children_2) {
    labelElement = jsxProd_default(Text, {
      dimColor,
      wrap: "truncate",
      children: children_2,
    });
    $[11] = dimColor;
    $[12] = children_2;
    $[13] = labelElement;
  } else labelElement = $[13];
  let rowElement;
  if ($[14] !== onClick_2 || $[15] !== prefixElement || $[16] !== labelElement) {
    rowElement = jsxProd_default_2(Box, {
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [prefixElement, labelElement],
    });
    $[14] = onClick_2;
    $[15] = prefixElement;
    $[16] = labelElement;
    $[17] = rowElement;
  } else rowElement = $[17];
  return rowElement;
}
//@ chunk-czq1j3j2.js:488177-488335 placement
function useStrayClickGuarded(onClick) {
  let $ = useMemoCache(3);
  let strayClickGuard = useStrayClickGuard();
  if (onClick === undefined) {
    return;
  }
  let guardedClickCached;
  if ($[0] !== onClick || $[1] !== strayClickGuard) {
    guardedClickCached = (event) => {
      if (strayClickGuard(event)) {
        return;
      }
      onClick(event);
    };
    $[0] = onClick;
    $[1] = strayClickGuard;
    $[2] = guardedClickCached;
  } else guardedClickCached = $[2];
  return guardedClickCached;
}
//@ chunk-czq1j3j2.js:488335-488474 placement
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
//@ chunk-czq1j3j2.js:488474-488796 placement
function CoordinatorPanelKeys({ keys, onViewedRow, closeAction, showCollapse, showStopAll }) {
  let hints = onViewedRow
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
    hints.push({
      chord: keys.collapse,
      action: "collapse",
    });
  if (showStopAll)
    hints.push({
      chord: keys.stopAll,
      action: STOP_ALL_AGENTS_LABEL,
      format: LOWER_KEY_CASE,
    });
  return hints.filter((hint) => formatShortcutHint(hint) !== "");
}
//@ chunk-czq1j3j2.js:488796-488847 placement
function shortcutHintsWidth(hints) {
  return bunStringWidth(hints.map(formatShortcutHint).join(" \xB7 "));
}
//@ chunk-czq1j3j2.js:488847-488872 placement
function identity(value) {
  return value;
}
//@ chunk-czq1j3j2.js:488876-488994 placement
/**
 * 返回一个按键处理器：只在动作被 Chat 上下文绑定遮蔽的 Footer 动作时调用回调。
 */
function useShadowedFooterActionHandler(handleAction) {
  let bindings = useKeybindingContext()?.bindings;
  let shadowedActions = useMemo(
    () => (bindings ? findShadowedActions("Footer", "Chat", bindings) : new Set()),
    [bindings],
  );
  return useCallback((key) => shadowedActions.has(key) && handleAction(), [shadowedActions, handleAction]);
}
//@ chunk-czq1j3j2.js:488994-489103 placement
/**
 * 注册 Chat 上下文的消息操作快捷键，但按键归 Footer 所有时让给 Footer 处理。
 */
function useFooterAwareMessageActions(handlers, { isActive, footerOwnsKeyOf }) {
  MessageActionsKeybindings(
    import_mapValues(handlers, (action, keyInput) => () => (footerOwnsKeyOf(keyInput) ? false : action())),
    {
      context: "Chat",
      isActive,
    },
  );
}
//@ chunk-czq1j3j2.js:963336-963381 placement
function selectFooterSelection(state) {
  return state.footerSelection;
}
export {
  collectAncestorTaskIds,
  useVisibleAgentTaskCount,
  TaskPanelFooterHints,
  hasEvictableIdleSubagent,
  getVisibleBackgroundTasks,
  isPanelOrTeammateTask,
  canStopRemoteWorkflow,
  stopRemoteWorkflow,
  isAgentRowVisible,
  remapTaskPanelIndex,
  selectFooterSelection,
  useShadowedFooterActionHandler,
  useFooterAwareMessageActions,
  expandIdleTeammates,
  hasFoldedIdleTeammates,
  isViewingThisAgent,
  hasUncarriedLaunchSettings,
  showAgentTaskView,
  agentRowPrefixWidth,
  AGENT_ROW_WIDTH_RESERVE,
  BackgroundTasksPanel,
};
