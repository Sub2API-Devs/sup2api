/**
 * components/PromptInput/PromptInputFooterLeftSide.tsx
 *
 * 页脚左侧：权限模式指示与 shift+tab 循环、双击退出提示、后台任务数、语音"按住说话"提示、PR 状态、其他 Claude 会话列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputFooterLeftSide.tsx
 * pieces: chunk-18hwfzwa.js (30), chunk-5cp2fssw.js (1)
 * attribution: placement 18, layout 8, fingerprint 5
 */
import { parse } from "path";
import { formatDuration, truncateToWidth } from "../../utils/format.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import {
  permissionModeSymbol,
  permissionModeIndicator,
  permissionModeTitle,
  toExternalPermissionMode,
  isDefaultMode,
} from "../../utils/permissions/PermissionMode.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useAppState, useSetAppState, useAppState_2 } from "../../state/AppState.js";
import {
  useFrameOpenFailure,
  visibleArtifactFrames,
  useFrameFooterState,
  ArtifactFramesPill,
} from "../artifacts/artifactFrames.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { useSession } from "../../context/session.js";
import {
  useMemo,
  init_react_production,
  useSyncExternalStore,
  useEffect,
  useRef,
  useState,
  fragmentTypeExport,
  memo,
} from "../../../vendor/react/cjs/react.production.js";
import { countVisibleTasks } from "../../utils/claudeInChrome/toolRendering.js";
import {
  useVisibleAgentTaskCount,
  TaskPanelFooterHints,
  hasEvictableIdleSubagent,
  getVisibleBackgroundTasks,
  isPanelOrTeammateTask,
} from "../CoordinatorAgentStatus.js";
import { shouldHideTasksFooter } from "../tasks/taskStatusUtils.js";
import { sequential } from "../../utils/sequential.js";
import { getRemoteCaps, hasRemoteCap, isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { tabCycleState } from "../../hooks/useWorkspaceDiff.js";
import { isPublishToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import {
  normalizeIdeSelectionLabel,
  DOWN_ARROW_PREFIX_WIDTH,
  FooterStatusRow,
  rowTotalWidth,
  footerStatusStyle,
} from "./PromptInputFooterStatus.js";
import { statusIconSlotWidth, StatusIcon } from "../design-system/StatusIcon.js";
import { BOXED_DIAMOND_GLYPH, WARNING_GLYPH, DOWN_RIGHT_ARROW } from "../../constants/figures.js";
import { formatShortcutHint, KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { plural } from "../../utils/stringUtils.js";
import { uiSignals } from "../../state/uiSignals.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { isFeedbackDraftsEnabled } from "../../services/feedbackDrafts.js";
import {
  tryStartDraftSeed,
  countSessionQueuedDrafts,
  seedSessionDraftCount,
} from "../../services/feedback/feedbackDrafts.js";
import { getSessionId, getIsRemoteMode } from "../../bootstrap/state.js";
import { useSubagentStatusLineTick } from "../../utils/subagentStatusLine.js";
import { useTerminalFocusState } from "../../ink/hooks/use-terminal-focus.js";
import {
  usePrStatus,
  useBgSessionPr,
  INITIAL_STATE as INITIAL_STATE_2,
  HistorySearchInputRef,
  useFooterLinks,
  FooterLink,
} from "../../hooks/usePrStatus.js";
import { isGitLabMergeRequestUrl } from "../../utils/detectRepository.js";
import { expandPrUrlIfTemplate, currentPrStatusFetcher, prStatusHint } from "../../utils/ghPrStatus.js";
import { usePrActionEffect, CURRENT_PR } from "../PrBadge.js";
import { setKeyedFooterLink } from "./footerLinks.js";
import { showSwarmFooterGate } from "./footerGates.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured, useSelection } from "../../ink/components/Input.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import {
  getCachedClientData,
  getGlobalConfig,
  subscribeGlobalConfigInstalled,
  saveGlobalConfig,
} from "../../utils/config.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { subscribeCoordinatorPanel } from "../../utils/transcriptDiagnostics.js";
import { useVoiceAvailable } from "../../hooks/useVoiceIntegration.js";
import { useHasSelection } from "../../ink/hooks/use-selection.js";
import { useHasTaskSelection } from "../../hooks/useTasksV2.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useStatusLineSuppressed } from "../StatusLine.js";
import { AgentsPill } from "./AgentsPill.js";
import { env } from "../../utils/env.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { resolveFooterIndicator } from "../../utils/messages/systemInit.js";
import { isModelMissingFromClientData } from "../../services/clientDataUrl.js";
import { useHasComplianceTaint } from "../LogoV2/LogoV2.js";
import { useStatusNoticeLines_2 } from "../StatusNotices.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeepHoldingHint } from "./VoiceIndicator.js";
import { BackgroundTaskStatus } from "../tasks/BackgroundTaskStatus.js";
import {
  needsDetachBeforeBackground,
  backgroundEligibilityForSession,
} from "../../utils/backgroundHandoff.js";
import { isXtermJs } from "../../ink/terminal.js";
import { getPlatform } from "../../utils/platform.js";
import { Byline } from "../design-system/Byline.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5cp2fssw.js:14565-14629 fingerprint (2.1.88 match: ProactiveCountdown, 0.737)
function ProactiveCountdown(ms) {
  return formatDuration(Math.max(0, ms), {
    mostSignificantOnly: true,
  });
}
//@ chunk-18hwfzwa.js:678423-678969 placement
/**
 * 渲染带颜色的权限模式标签：模式符号 + 模式名 + " on"（bare 时不加）+ children。
 */
function PermissionModeLabel(props) {
  let $ = useMemoCache(14);
  let { mode, bare, children } = props;
  let color;
  if ($[0] !== mode) {
    color = themeColorOf(mode);
    $[0] = mode;
    $[1] = color;
  } else color = $[1];
  let modeColor;
  if ($[2] !== mode) {
    modeColor = permissionModeSymbol(mode);
    $[2] = mode;
    $[3] = modeColor;
  } else modeColor = $[3];
  let labelElement;
  if ($[4] !== modeColor) {
    labelElement = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [modeColor, " "],
    });
    $[4] = modeColor;
    $[5] = labelElement;
  } else labelElement = $[5];
  let indicator;
  if ($[6] !== mode) {
    indicator = permissionModeIndicator(mode);
    $[6] = mode;
    $[7] = indicator;
  } else indicator = $[7];
  const onSuffix = bare ? "" : " on";
  let labelText;
  if (
    $[8] !== children ||
    $[9] !== color ||
    $[10] !== labelElement ||
    $[11] !== indicator ||
    $[12] !== onSuffix
  ) {
    labelText = jsxProd_default_2(Text, {
      color,
      children: [labelElement, indicator, onSuffix, children],
    });
    $[8] = children;
    $[9] = color;
    $[10] = labelElement;
    $[11] = indicator;
    $[12] = onSuffix;
    $[13] = labelText;
  } else labelText = $[13];
  return labelText;
}
//@ chunk-18hwfzwa.js:819599-819647 placement
function cycleModeActionName() {
  let keybindingContext = useKeybindingContext();
  return "chat:cycleMode";
}
//@ chunk-18hwfzwa.js:819647-819693 placement
function permissionModeLabelLower(mode) {
  return permissionModeTitle(toExternalPermissionMode(mode)).toLowerCase();
}
//@ chunk-18hwfzwa.js:819693-819726 placement
function permissionModeLabelWidth(mode) {
  return bunStringWidth(permissionModeLabelLower(mode));
}
//@ chunk-18hwfzwa.js:819726-820072 placement
function PermissionModeLabel_2(props) {
  let $ = useMemoCache(8);
  let { mode } = props;
  let externalMode;
  if ($[0] !== mode) {
    externalMode = toExternalPermissionMode(mode);
    $[0] = mode;
    $[1] = externalMode;
  } else externalMode = $[1];
  let isBypass = externalMode === "bypassPermissions";
  const color = isBypass ? "error" : undefined;
  const dimColor = !isBypass;
  let children;
  if ($[2] !== mode) {
    children = permissionModeLabelLower(mode);
    $[2] = mode;
    $[3] = children;
  } else children = $[3];
  let textElement;
  if ($[4] !== color || $[5] !== dimColor || $[6] !== children) {
    textElement = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[4] = color;
    $[5] = dimColor;
    $[6] = children;
    $[7] = textElement;
  } else textElement = $[7];
  return textElement;
}
//@ chunk-18hwfzwa.js:820072-820101 placement
var backgroundTaskDotApi = null;
var ARTIFACT_FRAME_NAME_MAX = 24;
var ARTIFACT_FRAME_SEPARATOR = "  ";
//@ chunk-18hwfzwa.js:820101-822055 placement
function FooterLeftSide({ toolPermissionContext, rowWidth, showHint, isLoading, tasksSelected }) {
  let { columns } = useTerminalSize();
  let effectiveWidth = rowWidth === undefined ? columns : rowWidth < 0 ? 0 : rowWidth;
  let tasks = useAppState((columns) => columns.tasks);
  let remoteTasks = useAppState((effectiveWidth) => effectiveWidth.remoteBackgroundTasks);
  let viewedTaskId = useAppState((viewedTaskId) => viewedTaskId.viewingAgentTaskId);
  let selectionMode = useAppState((selectionMode) => selectionMode.viewSelectionMode);
  let isTaskPanelSelected = useAppState(
    (appState) =>
      (appState.footerSelection === "tasks" && appState.coordinatorTaskIndex >= 0) ||
      appState.footerSelection === "workflows",
  );
  let frameUrls = useAppState((frameUrls) => frameUrls.frameUrls);
  let frameOpenFailedUnseen = useFrameOpenFailure();
  let isFrameSelected = useAppState((isFrameSelected) => isFrameSelected.footerSelection === "frame");
  let lower = useShortcutDisplay_2("chat:cancel", "Chat", "esc").toLowerCase();
  let shortcutDisplay = useShortcutDisplay_2(cycleModeActionName(), "Chat", "shift+tab");
  let host = useSession().host;
  let visibleTaskCount = useMemo(() => countVisibleTasks(tasks, remoteTasks), [tasks, remoteTasks]);
  let hasTasksOrAgents = useVisibleAgentTaskCount() > 0 || visibleTaskCount > 0;
  let needsYou = useMemo(
    () =>
      backgroundTaskDotApi !== null &&
      Object.values(tasks).some(
        (task) => shouldHideTasksFooter(task) && backgroundTaskDotApi.backgroundTaskDot(task) === "needsYou",
      ),
    [tasks],
  );
  let colorless = sequential.level === 0;
  let unusedNull = null;
  if (isTaskPanelSelected)
    return jsxProd_default(Box, {
      height: 1,
      overflow: "hidden",
      children: jsxProd_default(TaskPanelFooterHints, {}),
    });
  let remoteCaps = getRemoteCaps();
  let canChangeMode = remoteCaps
    ? hasRemoteCap("setPermissionMode") && !remoteCaps.viewerOnly
    : !isRemoteSessionAvailable();
  let mode = toolPermissionContext.mode;
  let cycled = tabCycleState.of(host).cycled;
  let modePill = canChangeMode ? buildModePill(mode) : null;
  let frames = visibleArtifactFrames(frameUrls);
  let activeFrame = frames.length > 0 && isPublishToolEnabled() ? frames[0] : undefined;
  let activeFrameName = activeFrame
    ? normalizeIdeSelectionLabel(
        activeFrame.sourceFile !== undefined ? parse(activeFrame.sourceFile).name : activeFrame.title,
      )
    : null;
  let viewedTask =
    selectionMode === "viewing-agent" && viewedTaskId !== undefined ? tasks[viewedTaskId] : undefined;
  let isIdleTeammate = viewedTask !== undefined && viewedTask.status !== "running";
  let hintSegment = null;
  if (showHint) {
    if (isIdleTeammate) {
      if (viewedTask.type === "in_process_teammate" && lower !== "")
        hintSegment = footerHintSegment({
          chord: lower,
          action: "return to team lead",
          format: {
            keyCase: "lower",
          },
        });
    } else if (isLoading) {
      if (lower !== "")
        hintSegment = footerHintSegment({
          chord: lower,
          action: "interrupt",
          format: {
            keyCase: "lower",
          },
        });
    } else if (modePill && !cycled && shortcutDisplay !== "")
      hintSegment = footerHintSegment({
        chord: shortcutDisplay,
        action: "cycle",
        format: {
          keyCase: "lower",
        },
      });
  }
  let pillState = {
    backgroundCount: visibleTaskCount,
    needsYou,
    frameCount: frames.length,
    activeFrameName,
    frameOpenFailedUnseen,
    tasksSelected,
    frameSelected: isFrameSelected,
    colorless,
  };
  let hasLeading = hasTasksOrAgents || activeFrameName !== null || false;
  let layout = chooseFooterLayout({
    pill: modePill,
    kept: [[]],
    sparse: BackgroundTasksPill(false, pillState),
    dense: BackgroundTasksPill(true, pillState),
    hint: null?.selected === true ? null.keys : hintSegment,
    keptSelected: null?.selected === true,
    width: hasLeading ? effectiveWidth - DOWN_ARROW_PREFIX_WIDTH : effectiveWidth,
  });
  let shownItems = tasksSelected || isFrameSelected ? layout.filter((item) => item.key !== "hint") : layout;
  return jsxProd_default(FooterStatusRow, {
    left: shownItems.map((item) => item.node),
    width: effectiveWidth,
    leading: hasLeading,
    leadingPressed: shownItems.some(
      (item) =>
        (item.key === "background" && tasksSelected) ||
        (item.key === "artifacts" && isFrameSelected) ||
        (item.key === "browser" && null?.selected === true),
    ),
  });
}
//@ chunk-18hwfzwa.js:822055-822523 placement
/**
 * 在给定宽度下挑页脚左侧要显示的段：先尝试带提示的紧凑排列，再依次尝试稀疏/紧凑/去掉 artifacts/只留胶囊，取第一个放得下的。
 */
function chooseFooterLayout({ pill, kept, sparse, dense, hint, keptSelected, width }) {
  let keptLines = kept[0] ?? [];
  let selectedLine = keptSelected ? (kept.at(-1) ?? []) : [];
  if (hint !== null) {
    let found = kept
      .map((line) => [...dense, pill, ...line, hint].filter(isPresent))
      .find((line) => rowTotalWidth(line) <= width);
    if (found !== undefined) return found;
  }
  let mapped = [
    [...sparse, pill, ...keptLines],
    ...kept.map((line) => [...dense, pill, ...line]),
    ...(pill === null
      ? []
      : [
          [...dense, pill, ...selectedLine],
          [...dense.filter((item) => item.key !== "artifacts"), pill, ...selectedLine],
          [pill, ...selectedLine],
        ]),
  ].map((line) => line.filter(isPresent));
  return (
    mapped.find((line) => rowTotalWidth(line) <= width) ?? (pill === null ? mapped[0] : mapped.at(-1)) ?? []
  );
}
//@ chunk-18hwfzwa.js:822523-822555 placement
function isPresent(value) {
  return value !== null;
}
//@ chunk-18hwfzwa.js:822555-822630 placement
function buildModePill(mode) {
  return {
    key: "mode",
    width: permissionModeLabelWidth(mode),
    node: jsxProd_default(
      PermissionModeLabel_2,
      {
        mode,
      },
      "mode",
    ),
  };
}
//@ chunk-18hwfzwa.js:822630-823262 placement
function BackgroundTasksPill(
  props,
  {
    backgroundCount,
    needsYou,
    frameCount,
    activeFrameName,
    frameOpenFailedUnseen,
    tasksSelected,
    frameSelected,
    colorless,
  },
) {
  let segments = [];
  if (backgroundCount > 0) {
    let countLabel = `${backgroundCount} bg`;
    segments.push({
      key: "background",
      width: bunStringWidth(countLabel) + (needsYou ? statusIconSlotWidth() : 0),
      node: jsxProd_default_2(
        Text,
        {
          children: [
            jsxProd_default(Text, {
              ...footerStatusStyle(tasksSelected, colorless, "background"),
              dimColor: !tasksSelected,
              children: countLabel,
            }),
            needsYou &&
              jsxProd_default(StatusIcon, {
                status: "needsYou",
                slot: "trailing",
              }),
          ],
        },
        "background",
      ),
    });
  }
  if (activeFrameName !== null) {
    let frameLabel = props
      ? `${BOXED_DIAMOND_GLYPH}${ARTIFACT_FRAME_SEPARATOR}${frameCount}`
      : `${BOXED_DIAMOND_GLYPH}${ARTIFACT_FRAME_SEPARATOR}${frameCount}: ${truncateToWidth(activeFrameName, ARTIFACT_FRAME_NAME_MAX)}`;
    let frameStyle = footerStatusStyle(frameSelected, colorless, frameOpenFailedUnseen ? "error" : "claude");
    segments.push({
      key: "artifacts",
      width: bunStringWidth(frameLabel),
      node: jsxProd_default(
        Text,
        {
          ...frameStyle,
          color: frameStyle.color ?? (frameOpenFailedUnseen ? "claude" : undefined),
          dimColor: !frameSelected && !frameOpenFailedUnseen,
          children: frameLabel,
        },
        "artifacts",
      ),
    });
  }
  return segments;
}
//@ chunk-18hwfzwa.js:823262-823375 placement
function footerHintSegment(hint) {
  return {
    key: "hint",
    width: bunStringWidth(formatShortcutHint(hint)),
    node: jsxProd_default(
      Text,
      {
        dimColor: true,
        italic: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          ...hint,
        }),
      },
      "hint",
    ),
  };
}
//@ chunk-18hwfzwa.js:823375-823700 placement
function FeedbackDraftCount(props) {
  let $ = useMemoCache(7);
  let { count } = props;
  if (count <= 0) {
    return null;
  }
  let countText;
  if ($[0] !== count) {
    countText = jsxProd_default(Text, {
      dimColor: false,
      children: count,
    });
    $[0] = count;
    $[1] = countText;
  } else countText = $[1];
  let innerText;
  if ($[2] !== count) {
    innerText = plural(count, "feedback draft");
    $[2] = count;
    $[3] = innerText;
  } else innerText = $[3];
  let textElement;
  if ($[4] !== countText || $[5] !== innerText) {
    textElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [countText, " ", innerText],
    });
    $[4] = countText;
    $[5] = innerText;
    $[6] = textElement;
  } else textElement = $[6];
  return textElement;
}
//@ chunk-18hwfzwa.js:823700-823704 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:823700", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:823704-823791 placement
function feedbackNoticeSignal() {
  return useSyncExternalStore(uiSignals.feedbackNotice.subscribe, () => uiSignals.feedbackNotice.getState());
}
//@ chunk-18hwfzwa.js:823791-823942 placement
function useSessionDraftCount() {
  let feedbackSignal = feedbackNoticeSignal();
  let { storageV5 } = useTheme_2();
  useEffect(() => {
    if (!isFeedbackDraftsEnabled() || !tryStartDraftSeed()) return;
    countSessionQueuedDrafts(getSessionId(), storageV5)
      .then(seedSessionDraftCount)
      .catch(() => {});
  }, [storageV5]);
  return isFeedbackDraftsEnabled() ? feedbackSignal.sessionDraftCount : 0;
}
//@ chunk-18hwfzwa.js:823942-823993 layout
function selectPrUrlTemplate(state) {
  return state.settings?.prUrlTemplate;
}
//@ chunk-18hwfzwa.js:823993-824084 layout
function incrementVoiceFooterHintSeenCount(state) {
  return {
    ...state,
    voiceFooterHintSeenCount: (state.voiceFooterHintSeenCount ?? 0) + 1,
  };
}
//@ chunk-18hwfzwa.js:824084-824129 layout
var coordinatorModeModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var VOICE_HINT_MAX_IMPRESSIONS;
deferInit("chunk-18hwfzwa.js:824084", () => {
  coordinatorModeModule = require("../../coordinator/coordinatorMode.js");
  VOICE_HINT_MAX_IMPRESSIONS = 3;
});
//@ chunk-18hwfzwa.js:824129-829071 fingerprint (2.1.88 match: PromptInputFooterLeftSide, 0.393)
/**
 * 页脚左侧：显示权限模式（shift+tab 循环 default/acceptEdits/plan/auto/bypass）、"Press Ctrl-C again to exit"、后台任务计数（可点开）、PR 状态、语音提示、catchupReplay/detach 提示。
 */
function PromptInputFooterLeftSide(props) {
  let $ = useMemoCache(65);
  let {
    exitMessage,
    row1Hint,
    leftArrowDetachAvailable,
    proactivityLevelStepped,
    proactivityPillCollapsed,
    vimMode,
    hideVimModeIndicator,
    mode,
    toolPermissionContext,
    suppressHint,
    suppressHintExceptStatusline,
    isInputEmpty,
    isLoading,
    isExternalLoading,
    betweenCalls,
    tasksSelected,
    isPasting,
    showExpandPasteHint,
    isSearching,
    historyQuery,
    setHistoryQuery,
    historyFailedMatch,
    onOpenTasksDialog,
    onOpenArtifacts,
    rowWidth,
    wrappedRowWidth,
  } = props;
  let row1HintValue = row1Hint === undefined ? null : row1Hint;
  let suppressHintFat =
    suppressHintExceptStatusline === undefined ? suppressHint : suppressHintExceptStatusline;
  let isExternalLoading_2 = isExternalLoading === undefined ? false : isExternalLoading;
  let betweenCalls_2 = betweenCalls === undefined ? true : betweenCalls;
  useSubagentStatusLineTick();
  let terminalFocusState = useTerminalFocusState();
  let prEnabled;
  if ($[0] !== terminalFocusState) {
    prEnabled = isPrStatusEnabled(terminalFocusState) && !isRemoteSessionAvailable();
    $[0] = terminalFocusState;
    $[1] = prEnabled;
  } else prEnabled = $[1];
  let prEnabled_2 = prEnabled;
  let prStatus = usePrStatus(isLoading, prEnabled_2);
  let bgSessionPr = useBgSessionPr();
  let currentPr;
  if ($[2] !== bgSessionPr || $[3] !== prStatus.pr || $[4] !== prEnabled_2) {
    currentPr =
      prEnabled_2 && prStatus.pr
        ? prStatus.pr
        : bgSessionPr
          ? {
              number: bgSessionPr.number,
              url: bgSessionPr.url,
              reviewState: undefined,
              kind: isGitLabMergeRequestUrl(bgSessionPr.url) ? "mr" : undefined,
            }
          : null;
    $[2] = bgSessionPr;
    $[3] = prStatus.pr;
    $[4] = prEnabled_2;
    $[5] = currentPr;
  } else currentPr = $[5];
  let prInfo = currentPr;
  let needsAuth = !prInfo && prEnabled_2 && prStatus.needsAuth;
  let appState = useAppState(selectPrUrlTemplate);
  let expandedPrUrl;
  if ($[6] !== prInfo || $[7] !== appState) {
    expandedPrUrl = prInfo ? expandPrUrlIfTemplate(prInfo.url, appState) : undefined;
    $[6] = prInfo;
    $[7] = appState;
    $[8] = expandedPrUrl;
  } else expandedPrUrl = $[8];
  usePrActionEffect(expandedPrUrl, prInfo?.url, prInfo?.kind);
  let setAppState = useSetAppState();
  let number = prInfo?.number;
  let url = prInfo?.url;
  let reviewState = prInfo?.reviewState;
  let kind = prInfo?.kind;
  let isPrStale;
  if ($[9] !== prStatus.lastUpdated) {
    isPrStale = prStatus.lastUpdated > 0 || currentPrStatusFetcher().pollerDisabled;
    $[9] = prStatus.lastUpdated;
    $[10] = isPrStale;
  } else isPrStale = $[10];
  let prStale = isPrStale;
  let prSyncDeps;
  let syncPrEffect;
  if (
    $[11] !== kind ||
    $[12] !== number ||
    $[13] !== reviewState ||
    $[14] !== url ||
    $[15] !== prStale ||
    $[16] !== appState ||
    $[17] !== setAppState
  ) {
    syncPrEffect = () => {
      setAppState((prev) => {
        let keepExistingNumber =
          !prStale &&
          prev.prStatus !== null &&
          (number === undefined ||
            (number === prev.prStatus.number &&
              prev.prStatus.kind === kind &&
              reviewState === undefined &&
              prev.prStatus.reviewState !== undefined));
        let samePr =
          prev.prStatus?.number === number &&
          prev.prStatus?.url === url &&
          prev.prStatus?.reviewState === reviewState &&
          prev.prStatus?.kind === kind;
        let nextPr =
          keepExistingNumber || samePr
            ? prev.prStatus
            : number !== undefined && url !== undefined
              ? {
                  number,
                  url,
                  reviewState,
                  kind,
                }
              : null;
        let nextLinks = setKeyedFooterLink(
          prev.footerLinks,
          CURRENT_PR,
          INITIAL_STATE_2(
            nextPr,
            nextPr
              ? nextPr.kind !== undefined
                ? nextPr.url
                : expandPrUrlIfTemplate(nextPr.url, appState)
              : undefined,
          ),
        );
        if (nextPr === prev.prStatus && nextLinks === prev.footerLinks) {
          return prev;
        }
        return {
          ...prev,
          prStatus: nextPr,
          footerLinks: nextLinks,
        };
      });
    };
    prSyncDeps = [number, url, reviewState, kind, prStale, appState, setAppState];
    $[11] = kind;
    $[12] = number;
    $[13] = reviewState;
    $[14] = url;
    $[15] = prStale;
    $[16] = appState;
    $[17] = setAppState;
    $[18] = prSyncDeps;
    $[19] = syncPrEffect;
  } else {
    prSyncDeps = $[18];
    syncPrEffect = $[19];
  }
  useEffect(syncPrEffect, prSyncDeps);
  let syncNeedsAuthEffect;
  let syncNeedsAuthDeps;
  if ($[20] !== needsAuth || $[21] !== setAppState) {
    syncNeedsAuthEffect = () => {
      setAppState((prev) =>
        prev.prNeedsAuth === needsAuth
          ? prev
          : {
              ...prev,
              prNeedsAuth: needsAuth,
            },
      );
    };
    syncNeedsAuthDeps = [needsAuth, setAppState];
    $[20] = needsAuth;
    $[21] = setAppState;
    $[22] = syncNeedsAuthEffect;
    $[23] = syncNeedsAuthDeps;
  } else {
    syncNeedsAuthEffect = $[22];
    syncNeedsAuthDeps = $[23];
  }
  useEffect(syncNeedsAuthEffect, syncNeedsAuthDeps);
  let isSwarmFooterVisible = showSwarmFooterGate();
  let searchBoxRef = useRef(null);
  let measureSearch;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    measureSearch = () => (searchBoxRef.current === null ? 0 : measureElement(searchBoxRef.current).width);
    $[24] = measureSearch;
  } else measureSearch = $[24];
  let measured = useMeasured(measureSearch);
  if (!isSwarmFooterVisible && exitMessage.show) {
    const key = exitMessage.key;
    const exitAction =
      isBgSession() || hasRemoteCap("catchupReplay") ? "detach (session keeps running)" : "exit";
    let exitMessageElement;
    if ($[25] !== exitMessage.key) {
      exitMessageElement = jsxProd_default_2(
        Text,
        {
          dimColor: true,
          children: ["Press ", key, " again to", " ", exitAction],
        },
        "exit-message",
      );
      $[25] = exitMessage.key;
      $[26] = exitMessageElement;
    } else exitMessageElement = $[26];
    return exitMessageElement;
  }
  if (!isSwarmFooterVisible && isPasting) {
    let pastingMessage;
    if ($[27] === MEMO_CACHE_SENTINEL) {
      pastingMessage = jsxProd_default(
        Text,
        {
          dimColor: true,
          children: "Pasting\u2026",
        },
        "pasting-message",
      );
      $[27] = pastingMessage;
    } else pastingMessage = $[27];
    return pastingMessage;
  }
  if (!isSwarmFooterVisible && showExpandPasteHint && !isSearching) {
    let expandPasteHint;
    if ($[28] === MEMO_CACHE_SENTINEL) {
      expandPasteHint = jsxProd_default(
        Text,
        {
          dimColor: true,
          children: "paste again to expand",
        },
        "expand-paste-hint",
      );
      $[28] = expandPasteHint;
    } else expandPasteHint = $[28];
    return expandPasteHint;
  }
  let showVimIndicator =
    vimMode !== undefined && !hideVimModeIndicator && vimMode !== "NORMAL" && !isSearching;
  let reservedWidth =
    (showVimIndicator ? bunStringWidth(`-- ${vimMode} --`) + 1 : 0) + (isSearching ? measured + 1 : 0);
  let contentWidth = rowWidth === undefined ? undefined : rowWidth - reservedWidth;
  let wrappedContentWidth = wrappedRowWidth === undefined ? undefined : wrappedRowWidth - reservedWidth;
  let searchBox;
  if (
    $[29] !== historyFailedMatch ||
    $[30] !== historyQuery ||
    $[31] !== isSwarmFooterVisible ||
    $[32] !== isSearching ||
    $[33] !== setHistoryQuery
  ) {
    searchBox =
      isSearching &&
      jsxProd_default(Box, {
        ref: searchBoxRef,
        flexShrink: isSwarmFooterVisible ? 0 : 1,
        children: jsxProd_default(HistorySearchInputRef, {
          value: historyQuery,
          onChange: setHistoryQuery,
          historyFailedMatch,
        }),
      });
    $[29] = historyFailedMatch;
    $[30] = historyQuery;
    $[31] = isSwarmFooterVisible;
    $[32] = isSearching;
    $[33] = setHistoryQuery;
    $[34] = searchBox;
  } else searchBox = $[34];
  let vimIndicator;
  if ($[35] !== showVimIndicator || $[36] !== vimMode) {
    vimIndicator = showVimIndicator
      ? jsxProd_default(
          Box,
          {
            flexShrink: 0,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: ["-- ", vimMode, " --"],
            }),
          },
          "vim-indicator",
        )
      : null;
    $[35] = showVimIndicator;
    $[36] = vimMode;
    $[37] = vimIndicator;
  } else vimIndicator = $[37];
  let indicatorRow;
  if (
    $[38] !== betweenCalls_2 ||
    $[39] !== contentWidth ||
    $[40] !== wrappedContentWidth ||
    $[41] !== isExternalLoading_2 ||
    $[42] !== isSwarmFooterVisible ||
    $[43] !== isInputEmpty ||
    $[44] !== isLoading ||
    $[45] !== isSearching ||
    $[46] !== leftArrowDetachAvailable ||
    $[47] !== mode ||
    $[48] !== onOpenArtifacts ||
    $[49] !== onOpenTasksDialog ||
    $[50] !== needsAuth ||
    $[51] !== proactivityLevelStepped ||
    $[52] !== proactivityPillCollapsed ||
    $[53] !== row1HintValue ||
    $[54] !== showVimIndicator ||
    $[55] !== suppressHint ||
    $[56] !== suppressHintFat ||
    $[57] !== tasksSelected ||
    $[58] !== toolPermissionContext ||
    $[59] !== vimMode
  ) {
    indicatorRow = isSwarmFooterVisible
      ? row1HintValue !== null
        ? jsxProd_default(
            Box,
            {
              height: 1,
              width: contentWidth === undefined ? undefined : Math.max(0, contentWidth),
              overflow: "hidden",
              children: jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                wrap: "truncate-end",
                children: row1HintValue.text,
              }),
            },
            row1HintValue.id,
          )
        : jsxProd_default(FooterLeftSide, {
            toolPermissionContext,
            showHint: !suppressHintFat && !showVimIndicator,
            isLoading,
            rowWidth: contentWidth,
            tasksSelected,
          })
      : jsxProd_default(ModeIndicator, {
          mode,
          toolPermissionContext,
          showHint: !suppressHint && !showVimIndicator,
          denseShowHint: !suppressHintFat && !showVimIndicator,
          denseVimOnlySuppression: !suppressHintFat && showVimIndicator,
          vimIndicatorShown: showVimIndicator,
          vimBlocksGesture: vimMode === "VISUAL" || vimMode === "VISUAL LINE",
          isInputEmpty,
          isLoading,
          isExternalLoading: isExternalLoading_2,
          betweenCalls: betweenCalls_2,
          leftArrowDetachAvailable,
          tasksSelected,
          onOpenTasksDialog,
          onOpenArtifacts,
          prNeedsAuth: needsAuth,
          levelPillCollapsed: proactivityPillCollapsed,
          levelStepped: proactivityLevelStepped,
          rowWidth: isSearching ? undefined : contentWidth,
          wrappedRowWidth: isSearching ? undefined : wrappedContentWidth,
          isSearching,
        });
    $[38] = betweenCalls_2;
    $[39] = contentWidth;
    $[40] = wrappedContentWidth;
    $[41] = isExternalLoading_2;
    $[42] = isSwarmFooterVisible;
    $[43] = isInputEmpty;
    $[44] = isLoading;
    $[45] = isSearching;
    $[46] = leftArrowDetachAvailable;
    $[47] = mode;
    $[48] = onOpenArtifacts;
    $[49] = onOpenTasksDialog;
    $[50] = needsAuth;
    $[51] = proactivityLevelStepped;
    $[52] = proactivityPillCollapsed;
    $[53] = row1HintValue;
    $[54] = showVimIndicator;
    $[55] = suppressHint;
    $[56] = suppressHintFat;
    $[57] = tasksSelected;
    $[58] = toolPermissionContext;
    $[59] = vimMode;
    $[60] = indicatorRow;
  } else indicatorRow = $[60];
  let row;
  if ($[61] !== searchBox || $[62] !== vimIndicator || $[63] !== indicatorRow) {
    row = jsxProd_default_2(Box, {
      justifyContent: "flex-start",
      gap: 1,
      children: [searchBox, vimIndicator, indicatorRow],
    });
    $[61] = searchBox;
    $[62] = vimIndicator;
    $[63] = indicatorRow;
    $[64] = row;
  } else row = $[64];
  return row;
}
//@ chunk-18hwfzwa.js:829071-829099 layout
function attentionBudgetSummary(attentionBudget) {
  return null;
}
//@ chunk-18hwfzwa.js:829099-829124 layout
function getZero(attentionBudget) {
  return 0;
}
//@ chunk-18hwfzwa.js:829124-829169 layout
function getFooterIndicatorConfig() {
  return getCachedClientData()?.footer_indicator;
}
//@ chunk-18hwfzwa.js:829169-839108 fingerprint (2.1.88 match: ModeIndicator, 0.519)
/**
 * 权限模式指示与切换提示（shift+tab），含 frame/artifact 链接（tengu_copper_thistle）。
 */
function ModeIndicator({
  mode,
  toolPermissionContext,
  showHint,
  denseShowHint,
  denseVimOnlySuppression,
  vimBlocksGesture,
  vimIndicatorShown,
  isInputEmpty,
  isLoading,
  isExternalLoading,
  betweenCalls,
  leftArrowDetachAvailable,
  tasksSelected,
  onOpenTasksDialog,
  onOpenArtifacts,
  prNeedsAuth,
  levelPillCollapsed,
  levelStepped,
  rowWidth,
  wrappedRowWidth,
  isSearching = false,
}) {
  let isFullscreen = useIsFullscreen();
  let { columns } = useTerminalSize();
  let frameFooterState = useFrameFooterState();
  let isFrameSelected = useAppState((state) => state.footerSelection === "frame");
  let isRemoteSession = isRemoteSessionAvailable();
  let artifactFrameCount = useAppState((state) =>
    isRemoteSession ? visibleArtifactFrames(state.frameUrls).length : 0,
  );
  let action = isRemoteSession && artifactFrameCount === 1 ? "open in browser" : "view artifacts";
  useForceRender();
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_thistle", false);
  let shortcutDisplay = useShortcutDisplay_2(cycleModeActionName(), "Chat", "shift+tab");
  let tasks = useAppState((state) => state.tasks);
  let tasks_2 = useAppState((state) => state.remoteBackgroundTasks);
  let taskDecorations = useAppState((s_0) => s_0.taskDecorations);
  let store = subscribeCoordinatorPanel();
  let viewSelectionMode = useAppState(
    (s_1) =>
      (s_1.footerSelection === "tasks" && s_1.coordinatorTaskIndex >= 0) ||
      s_1.footerSelection === "workflows",
  );
  let viewingAgentTaskId = useAppState((s_2) => s_2.footerSelection !== null);
  let viewSelectionMode_2 = useAppState((s_3) => s_3.viewSelectionMode);
  let viewingAgentTaskId_2 = useAppState((state) => state.viewingAgentTaskId);
  let expandedView = useAppState((state) => state.expandedView);
  let footerLinks = useFooterLinks({
    excludeKeyed: featureValue_CACHED_MAY_BE_STALE,
  });
  let ref = useRef(null);
  let ref_2 = useRef(null);
  let ref_3 = useRef(null);
  let ref_4 = useRef(null);
  let pillStart = null;
  let pillWidth = 0;
  let reserveStart = 0;
  let reserveEnd = 0;
  let extraPill = null;
  let attentionBudget = useAppState((state) => state.attentionBudget);
  let proactivityLevel = useAppState((s_4) => s_4.proactivityLevel);
  let voiceAvailable = useVoiceAvailable();
  let voiceState = useAppState_2((s_5) => s_5.voiceState);
  let isVoiceWarmingUp = useAppState_2((s_6) => s_6.voiceWarmingUp);
  let hasSelection = useHasSelection();
  let selGetState = useSelection().getState;
  let isCoordinatorMode = coordinatorModeModule.isCoordinatorMode();
  let runningTaskCount = useMemo(() => countVisibleTasks(tasks, tasks_2), [tasks, tasks_2, store]);
  let tasksV2 = useHasTaskSelection();
  let escShortcut = useShortcutDisplay_2("chat:cancel", "Chat", "esc").toLowerCase();
  let todosShortcut = useShortcutDisplay_2("app:toggleTodos", "Global", "ctrl+t");
  let shortcutDisplay_2 = useShortcutDisplay_2("voice:pushToTalk", "Chat", "space");
  let shortcutDisplay_3 = useShortcutDisplay("footer:openSelected", "Footer", "enter");
  let [voiceHintUnderCap] = useState(() => {
    let announcement = announcementState();
    if (announcement.voiceFooterHintUnderCap === undefined)
      announcement.voiceFooterHintUnderCap =
        (getGlobalConfig().voiceFooterHintSeenCount ?? 0) < VOICE_HINT_MAX_IMPRESSIONS;
    return announcement.voiceFooterHintUnderCap;
  });
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let statusLineSuppressed = useStatusLineSuppressed();
  let agentsPill = AgentsPill({
    available: leftArrowDetachAvailable && isInputEmpty && !viewingAgentTaskId && !vimBlocksGesture,
    restingHintExpired: useAppState((prev) => prev.agentsHintExpired === true),
  });
  let sessionDraftCount = useSessionDraftCount();
  let footerIndicatorConfig = useSyncExternalStore(subscribeGlobalConfigInstalled, getFooterIndicatorConfig);
  let CLAUDE_CODE_FOOTER_INDICATOR = env.CLAUDE_CODE_FOOTER_INDICATOR;
  let mainLoopModel = useMainLoopModel_3();
  let footerIndicator = useMemo(
    () => resolveFooterIndicator(CLAUDE_CODE_FOOTER_INDICATOR, mainLoopModel, footerIndicatorConfig),
    [CLAUDE_CODE_FOOTER_INDICATOR, mainLoopModel, footerIndicatorConfig],
  );
  let isModelMissing = useMemo(() => isModelMissingFromClientData(mainLoopModel), [mainLoopModel]);
  let hasComplianceTaint = useHasComplianceTaint("zdr");
  let hasComplianceTaint_2 = useHasComplianceTaint("ldr");
  let isKillAgentsConfirmShowing = useStatusNoticeLines_2(mode === "bash");
  if (mode === "bash")
    return jsxProd_default(Text, {
      color: "bashBorder",
      children: "! for shell mode",
    });
  let mode_2 = toolPermissionContext?.mode;
  let remoteCaps = getRemoteCaps();
  let canShowAttention = !remoteCaps && !isRemoteSessionAvailable();
  let attentionSummary = canShowAttention ? attentionBudgetSummary(attentionBudget) : null;
  let zeroBudget = canShowAttention ? getZero(attentionBudget) : 0;
  let hasActiveMode = !isDefaultMode(mode_2);
  let viewedTask = viewingAgentTaskId_2 ? tasks[viewingAgentTaskId_2] : undefined;
  let isInProcessTeammate =
    viewSelectionMode_2 === "viewing-agent" && viewedTask?.type === "in_process_teammate";
  let neverFlag = false;
  let extraWidth = 0;
  let showOnlyMode =
    neverFlag &&
    levelStepped &&
    !levelPillCollapsed &&
    !viewingAgentTaskId &&
    !isLoading &&
    !isVoiceWarmingUp;
  let isTeammateIdle = isInProcessTeammate && viewedTask != null && viewedTask.status !== "running";
  let hasRunningTasks = runningTaskCount > 0;
  let leftSegmentCount = (isCoordinatorMode || hasActiveMode ? 1 : 0) + (hasRunningTasks ? 1 : 0);
  let prHint =
    !featureValue_CACHED_MAY_BE_STALE &&
    prNeedsAuth &&
    !footerLinks.some((footerLink) => footerLink.key === CURRENT_PR)
      ? jsxProd_default(
          Text,
          {
            dimColor: true,
            children: prStatusHint(prNeedsAuth),
          },
          "pr-status",
        )
      : null;
  let retentionText = null;
  let retentionPill = retentionText
    ? jsxProd_default_2(
        Text,
        {
          color: "success",
          children: [
            jsxProd_default_2(Text, {
              "aria-hidden": true,
              children: [figures_default.lozenge, " "],
            }),
            retentionText,
          ],
        },
        "retention",
      )
    : null;
  let modelWarning = isModelMissing
    ? jsxProd_default_2(
        Text,
        {
          color: "warning",
          children: [
            jsxProd_default_2(Text, {
              "aria-hidden": true,
              children: [WARNING_GLYPH, " "],
            }),
            "wrong model?",
          ],
        },
        "footer-indicator",
      )
    : footerIndicator
      ? jsxProd_default_2(
          Text,
          {
            color: "ide",
            children: [
              jsxProd_default_2(Text, {
                "aria-hidden": true,
                children: [figures_default.lozenge, " "],
              }),
              footerIndicator,
            ],
          },
          "footer-indicator",
        )
      : null;
  let indicatorWidth =
    (isModelMissing
      ? bunStringWidth(`${WARNING_GLYPH} wrong model?`) + 3
      : footerIndicator
        ? bunStringWidth(footerIndicator) + 5
        : 0) +
    zeroBudget +
    extraWidth;
  let canCycleHint =
    leftSegmentCount < 2 &&
    !((prHint || footerLinks.length > 0) && columns < 60 + (retentionPill ? 8 : 0) + indicatorWidth) &&
    !(retentionPill && columns < 56 + indicatorWidth) &&
    !(modelWarning && columns < 48 + indicatorWidth) &&
    !(attentionSummary && columns < 48 + zeroBudget + extraWidth);
  let canChangeMode = remoteCaps
    ? hasRemoteCap("setPermissionMode") && !remoteCaps.viewerOnly
    : !isRemoteSessionAvailable();
  let shouldShowSubagentHint =
    !isScreenReaderEnabled && hasEvictableIdleSubagent(tasks, viewingAgentTaskId_2);
  if (viewSelectionMode)
    return jsxProd_default(Box, {
      height: 1,
      overflow: "hidden",
      children: jsxProd_default(TaskPanelFooterHints, {}),
    });
  if (featureValue_CACHED_MAY_BE_STALE) {
    let runningCount = runningTaskCount;
    let hasManyTasks = runningCount >= 2;
    let hasTasks = runningTaskCount >= 1;
    let showModeLabel = !!mode_2 && canChangeMode;
    let hasVisibleTasks =
      getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId_2).length > 0 ||
      (!store && viewingAgentTaskId_2 !== undefined && isPanelOrTeammateTask(tasks[viewingAgentTaskId_2]));
    let canDetach =
      leftArrowDetachAvailable &&
      !isInProcessTeammate &&
      isInputEmpty &&
      !viewingAgentTaskId &&
      !vimBlocksGesture;
    let showVoiceHint =
      voiceAvailable && voiceState === "idle" && voiceHintUnderCap && showHint && shortcutDisplay_2 !== "";
    let hintKind = "none";
    if (voiceAvailable && isVoiceWarmingUp) hintKind = "warmup";
    else if (isTeammateIdle) hintKind = "interrupt";
    else if (!denseShowHint)
      hintKind =
        denseVimOnlySuppression && canDetach && agentsPill !== null && !isScreenReaderEnabled
          ? "agents"
          : "none";
    else if (isLoading)
      hintKind =
        canDetach && agentsPill !== null && !isScreenReaderEnabled ? "interrupt_agents" : "interrupt";
    else if (isFrameSelected) hintKind = "artifacts";
    else if (extraPill?.selected) hintKind = "none";
    else if ((hasTasks || hasVisibleTasks) && !viewSelectionMode) hintKind = "manage";
    else if (tasksV2) hintKind = "ctrl_t";
    else if (canDetach && !isScreenReaderEnabled) hintKind = agentsPill !== null ? "agents" : "none";
    else if (shouldShowSubagentHint) hintKind = "none";
    else if (showVoiceHint) hintKind = "voice";
    else if (showModeLabel && (hasActiveMode || neverFlag) && shortcutDisplay !== "") hintKind = "cycle";
    else hintKind = showHint && !isScreenReaderEnabled ? "shortcuts" : "none";
    let shortcutHint =
      hintKind === "cycle" && !neverFlag
        ? formatShortcutHint({
            chord: shortcutDisplay,
            action: "cycle",
            parens: true,
            format: {
              keyCase: "lower",
            },
          })
        : hintKind === "manage" && hasTasks && (!tasksSelected || shortcutDisplay_3)
          ? tasksSelected
            ? formatShortcutHint({
                chord: shortcutDisplay_3,
                action: "view tasks",
                parens: true,
              })
            : formatShortcutHint({
                chord: "down",
                action: "manage",
                parens: true,
              })
          : "";
    let shortcutWidth = shortcutHint === "" ? 0 : 1 + bunStringWidth(shortcutHint);
    let isPillPlaced = extraPill !== null && pillStart !== null && pillStart >= reserveStart;
    let pillRight =
      pillStart === null
        ? null
        : pillStart + (isPillPlaced ? 0 : (wrappedRowWidth ?? rowWidth ?? 0) - (rowWidth ?? 0));
    let isShortcutClipped =
      extraPill !== null &&
      pillRight !== null &&
      shortcutWidth > 0 &&
      pillRight - shortcutWidth < reserveStart;
    if (isShortcutClipped) hintKind = "none";
    let hintStart = isSearching
      ? reserveStart
      : pillRight === null
        ? undefined
        : Math.max(reserveStart, pillRight - (isShortcutClipped ? 0 : shortcutWidth) - reserveEnd);
    let children = null;
    let action_2 = expandedView === "tasks" ? "hide tasks" : "show tasks";
    let cycleHintBox =
      hintKind === "cycle" && shortcutHint !== "" && mode_2
        ? jsxProd_default(Box, {
            ref: ref_2,
            children: jsxProd_default_2(Text, {
              color: themeColorOf(mode_2),
              dimColor: true,
              children: [" ", shortcutHint],
            }),
          })
        : null;
    let manageHintBox =
      hintKind === "manage" && shortcutHint !== ""
        ? jsxProd_default(Box, {
            ref: ref_2,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [" ", shortcutHint],
            }),
          })
        : null;
    let hintElement = null;
    if (hintKind === "warmup") hintElement = jsxProd_default(KeepHoldingHint, {}, "voice-warmup");
    else if (hintKind === "manage" && !hasTasks && (!tasksSelected || shortcutDisplay_3))
      hintElement = jsxProd_default(Text, {
        dimColor: true,
        children: tasksSelected
          ? jsxProd_default(KeyboardShortcutHint, {
              chord: shortcutDisplay_3,
              action: "view tasks",
            })
          : jsxProd_default(KeyboardShortcutHint, {
              chord: "down",
              action: "manage",
            }),
      });
    else if (hintKind === "artifacts" && shortcutDisplay_3)
      hintElement = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: shortcutDisplay_3,
          action,
        }),
      });
    else if (hintKind === "interrupt" || hintKind === "interrupt_agents")
      hintElement = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: escShortcut,
                action: isTeammateIdle ? "return to team lead" : "interrupt",
                format: {
                  keyCase: "lower",
                },
              }),
              hintKind === "interrupt_agents" && " \xB7 ",
            ],
          }),
          hintKind === "interrupt_agents" && agentsPill,
        ],
      });
    else if (hintKind === "ctrl_t")
      hintElement = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: todosShortcut,
          action: action_2,
          format: {
            keyCase: "lower",
          },
        }),
      });
    else if (hintKind === "agents") hintElement = agentsPill;
    else if (hintKind === "voice")
      hintElement = jsxProd_default(VoiceHoldToSpeakHint, {
        keyDisplay: shortcutDisplay_2,
      });
    else if (hintKind === "shortcuts")
      hintElement = jsxProd_default(Text, {
        dimColor: true,
        children: "? for shortcuts",
      });
    let modeBox =
      showModeLabel && mode_2
        ? jsxProd_default_2(
            Box,
            {
              flexShrink: 0,
              children: [
                jsxProd_default(PermissionModeLabel, {
                  mode: mode_2,
                }),
                cycleHintBox,
              ],
            },
            "mode",
          )
        : null;
    if (showOnlyMode && modeBox)
      return jsxProd_default(Box, {
        height: 1,
        overflow: "hidden",
        children: modeBox,
      });
    let taskPill = hasTasks
      ? hasManyTasks
        ? jsxProd_default(BackgroundTaskCountPill, {
            count: runningCount,
            selected: tasksSelected,
            onClick: onOpenTasksDialog,
          })
        : jsxProd_default(BackgroundTaskStatus, {
            tasksSelected,
            onOpenDialog: onOpenTasksDialog,
          })
      : null;
    if (
      !modeBox &&
      !attentionSummary &&
      !retentionPill &&
      !modelWarning &&
      !taskPill &&
      !frameFooterState &&
      !extraPill &&
      footerLinks.length === 0 &&
      !hintElement &&
      sessionDraftCount === 0 &&
      !shouldShowSubagentHint
    )
      return isFullscreen
        ? jsxProd_default(Text, {
            children: " ",
          })
        : null;
    let hasTailItems = taskPill || frameFooterState || extraPill || footerLinks.length > 0;
    let separator = jsxProd_default(Text, {
      dimColor: true,
      children: " \xB7 ",
    });
    let hasHead = !!(hasTailItems || modeBox || attentionSummary || retentionPill || modelWarning);
    let hasHeadOrSubagent = hasHead || shouldShowSubagentHint;
    let hasAnyBeforeTail = hasHeadOrSubagent || !!hintElement;
    let tailBox = jsxProd_default_2(Fragment, {
      children: [
        shouldShowSubagentHint &&
          jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [hasHead && separator, jsxProd_default(TasksForSubagentsHint, {})],
          }),
        hintElement &&
          jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [hasHeadOrSubagent && separator, hintElement],
          }),
        sessionDraftCount > 0 &&
          jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [
              hasAnyBeforeTail && separator,
              jsxProd_default(FeedbackDraftCount, {
                count: sessionDraftCount,
              }),
            ],
          }),
      ],
    });
    return jsxProd_default_2(Box, {
      height: 1,
      overflow: "hidden",
      maxWidth: isPillPlaced ? Math.max(0, rowWidth ?? 0) : undefined,
      children: [
        jsxProd_default_2(Box, {
          ref,
          flexShrink: 0,
          children: [
            modeBox,
            modeBox &&
              (attentionSummary || retentionPill || modelWarning || hasTailItems) &&
              jsxProd_default(Box, {
                flexShrink: 0,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: " \xB7 ",
                }),
              }),
            attentionSummary &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  attentionSummary,
                  (retentionPill || modelWarning || hasTailItems) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            retentionPill &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  retentionPill,
                  (modelWarning || hasTailItems) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            modelWarning &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  modelWarning,
                  hasTailItems &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            taskPill &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  taskPill,
                  manageHintBox,
                  (frameFooterState || extraPill || footerLinks.length > 0) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            frameFooterState &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  jsxProd_default(ArtifactFramesPill, {
                    onOpen: onOpenArtifacts,
                  }),
                  (extraPill || footerLinks.length > 0) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
          ],
        }),
        extraPill &&
          jsxProd_default_2(Box, {
            flexShrink: 0,
            children: [
              jsxProd_default(Text, {
                children,
              }),
              footerLinks.length > 0 &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: " \xB7 ",
                }),
            ],
          }),
        footerLinks.length > 0 &&
          jsxProd_default(Box, {
            ref: ref_3,
            flexShrink: 0,
            children: footerLinks.map((footerLink, index) =>
              jsxProd_default_2(
                Box,
                {
                  flexShrink: 0,
                  children: [
                    jsxProd_default(FooterLink, {
                      link: footerLink,
                    }),
                    index < footerLinks.length - 1 &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: " \xB7 ",
                      }),
                  ],
                },
                footerLink.url,
              ),
            ),
          }),
        extraPill
          ? jsxProd_default(Box, {
              ref: ref_4,
              flexShrink: 0,
              children: tailBox,
            })
          : tailBox,
      ],
    });
  }
  let mapped = footerLinks.map((t_2) =>
    jsxProd_default(
      FooterLink,
      {
        link: t_2,
      },
      t_2.key ?? t_2.url,
    ),
  );
  let lastItems = [...(extraPill ? [extraPill.pill] : [])];
  if (shouldShowSubagentHint) lastItems.push(jsxProd_default(TasksForSubagentsHint, {}, "tasks-subagents"));
  let spinnerHintParts = showHint
    ? getSpinnerHintParts(isLoading, escShortcut, todosShortcut, tasksV2, expandedView)
    : [];
  if (isTeammateIdle)
    lastItems.push(
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord: escShortcut,
            action: "return to team lead",
            format: {
              keyCase: "lower",
            },
          }),
        },
        "esc-return",
      ),
    );
  else if (showHint) lastItems.push(...spinnerHintParts);
  let bgAgentsPill =
    (isBgSession() || getIsRemoteMode()) &&
    leftArrowDetachAvailable &&
    isInputEmpty &&
    !viewingAgentTaskId &&
    !vimBlocksGesture &&
    !isScreenReaderEnabled
      ? agentsPill
      : null;
  let detachHint =
    !statusLineSuppressed &&
    !isInProcessTeammate &&
    isInputEmpty &&
    !viewingAgentTaskId &&
    !vimBlocksGesture &&
    needsDetachBeforeBackground(
      backgroundEligibilityForSession({
        isBg: isBgSession(),
        isLoading,
        isExternalLoading,
        betweenCalls,
        inFlight: {
          count: 0,
          kinds: [],
        },
      }),
    ) &&
    getGlobalConfig().leftArrowOpensAgents !== false &&
    !isScreenReaderEnabled &&
    agentsPill !== null
      ? jsxProd_default(
          fragmentTypeExport,
          {
            children: agentsPill,
          },
          "fg-agents",
        )
      : null;
  let hasVisibleRemoteTasks =
    getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId_2).length > 0 ||
    (!store && viewingAgentTaskId_2 !== undefined && isPanelOrTeammateTask(tasks[viewingAgentTaskId_2]));
  let taskStatusPill = hasRunningTasks
    ? jsxProd_default(BackgroundTaskStatus, {
        tasksSelected,
        onOpenDialog: onOpenTasksDialog,
      })
    : null;
  if (
    lastItems.length === 0 &&
    !taskStatusPill &&
    !(mode_2 && canChangeMode && hasActiveMode) &&
    !prHint &&
    mapped.length === 0 &&
    !bgAgentsPill &&
    showHint
  ) {
    if (!isScreenReaderEnabled)
      lastItems.push(
        jsxProd_default(
          Text,
          {
            dimColor: true,
            children: "? for shortcuts",
          },
          "shortcuts-hint",
        ),
      );
  }
  if (detachHint) lastItems.push(detachHint);
  if (sessionDraftCount > 0)
    lastItems.push(
      jsxProd_default(
        FeedbackDraftCount,
        {
          count: sessionDraftCount,
        },
        "feedback-drafts",
      ),
    );
  let copyOnSelect = getGlobalConfig().copyOnSelect ?? true;
  let showSelectionHint = hasSelection && (!copyOnSelect || isXtermJs());
  if (voiceAvailable && isVoiceWarmingUp)
    lastItems.push(jsxProd_default(KeepHoldingHint, {}, "voice-warmup"));
  else if (isFullscreen && showSelectionHint) {
    let isMac = getPlatform() === "macos";
    let lastPressHadAlt = isMac && (selGetState()?.lastPressHadAlt ?? false);
    lastItems.push(
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: jsxProd_default_2(Byline, {
            children: [
              !copyOnSelect &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "ctrl+c",
                  action: "copy",
                }),
              isXtermJs() &&
                (lastPressHadAlt
                  ? jsxProd_default(Text, {
                      children: "set macOptionClickForcesSelection in VS Code settings",
                    })
                  : jsxProd_default_2(Text, {
                      children: [isMac ? "option+click" : "shift+click", " to native select"],
                    })),
            ],
          }),
        },
        "selection-copy",
      ),
    );
  } else if (
    lastItems.length > 0 &&
    showHint &&
    voiceAvailable &&
    voiceState === "idle" &&
    spinnerHintParts.length === 0 &&
    voiceHintUnderCap &&
    shortcutDisplay_2 !== ""
  )
    lastItems.push(
      jsxProd_default(
        VoiceHoldToSpeakHint,
        {
          keyDisplay: shortcutDisplay_2,
        },
        "voice-hint",
      ),
    );
  if (
    (taskStatusPill || hasVisibleRemoteTasks) &&
    showHint &&
    !viewSelectionMode &&
    !isFrameSelected &&
    (!tasksSelected || shortcutDisplay_3)
  )
    lastItems.push(
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: tasksSelected
            ? jsxProd_default(KeyboardShortcutHint, {
                chord: shortcutDisplay_3,
                action: "view tasks",
              })
            : jsxProd_default(KeyboardShortcutHint, {
                chord: "down",
                action: "manage",
              }),
        },
        "manage-tasks",
      ),
    );
  if (isFrameSelected && showHint && shortcutDisplay_3)
    lastItems.push(
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord: shortcutDisplay_3,
            action,
          }),
        },
        "view-artifacts",
      ),
    );
  let permissionModePill =
    mode_2 && canChangeMode
      ? jsxProd_default(
          Box,
          {
            flexShrink: 0,
            children: jsxProd_default(PermissionModeLabel, {
              mode: mode_2,
              children:
                hasActiveMode &&
                canCycleHint &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    " ",
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: shortcutDisplay,
                      action: "cycle",
                      parens: true,
                      format: {
                        keyCase: "lower",
                      },
                    }),
                  ],
                }),
            }),
          },
          "mode",
        )
      : null;
  if (showOnlyMode && permissionModePill)
    return jsxProd_default(Box, {
      height: 1,
      overflow: "hidden",
      children: permissionModePill,
    });
  if (
    lastItems.length === 0 &&
    !taskStatusPill &&
    !permissionModePill &&
    !attentionSummary &&
    !retentionPill &&
    !modelWarning &&
    !prHint &&
    mapped.length === 0 &&
    !bgAgentsPill &&
    !frameFooterState
  )
    return isFullscreen
      ? jsxProd_default(Text, {
          children: " ",
        })
      : null;
  return jsxProd_default_2(Box, {
    height: 1,
    overflow: "hidden",
    children: [
      permissionModePill,
      permissionModePill &&
        (attentionSummary ||
          retentionPill ||
          modelWarning ||
          bgAgentsPill ||
          prHint ||
          mapped.length > 0 ||
          taskStatusPill ||
          frameFooterState ||
          lastItems.length > 0) &&
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          }),
        }),
      attentionSummary &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            attentionSummary,
            (retentionPill ||
              modelWarning ||
              bgAgentsPill ||
              prHint ||
              mapped.length > 0 ||
              taskStatusPill ||
              frameFooterState ||
              lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      retentionPill &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            retentionPill,
            (modelWarning ||
              bgAgentsPill ||
              prHint ||
              mapped.length > 0 ||
              taskStatusPill ||
              frameFooterState ||
              lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      modelWarning &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            modelWarning,
            (bgAgentsPill ||
              prHint ||
              mapped.length > 0 ||
              taskStatusPill ||
              frameFooterState ||
              lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      bgAgentsPill &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            bgAgentsPill,
            (prHint || mapped.length > 0 || taskStatusPill || frameFooterState || lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      prHint &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            prHint,
            (mapped.length > 0 || taskStatusPill || frameFooterState || lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      mapped.length > 0 &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            jsxProd_default(Byline, {
              children: mapped,
            }),
            (taskStatusPill || frameFooterState || lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      taskStatusPill &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            taskStatusPill,
            (frameFooterState || lastItems.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      frameFooterState &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            jsxProd_default(ArtifactFramesPill, {
              onOpen: onOpenArtifacts,
            }),
            lastItems.length > 0 &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      lastItems.length > 0 &&
        jsxProd_default(Text, {
          wrap: "truncate",
          children: jsxProd_default(Byline, {
            children: lastItems,
          }),
        }),
    ],
  });
}
//@ chunk-18hwfzwa.js:839108-839458 layout
function VoiceHoldToSpeakHint(props) {
  let $ = useMemoCache(5);
  let { keyDisplay } = props;
  let { storageV5 } = useTheme_2();
  let markSeenEffect;
  let markSeenDeps;
  if ($[0] !== storageV5) {
    markSeenEffect = () => {
      let announcement = announcementState();
      if (announcement.voiceFooterHintCounted) {
        return;
      }
      announcement.voiceFooterHintCounted = true;
      saveGlobalConfig(incrementVoiceFooterHintSeenCount, storageV5);
    };
    markSeenDeps = [storageV5];
    $[0] = storageV5;
    $[1] = markSeenEffect;
    $[2] = markSeenDeps;
  } else {
    markSeenEffect = $[1];
    markSeenDeps = $[2];
  }
  useEffect(markSeenEffect, markSeenDeps);
  let hintElement;
  if ($[3] !== keyDisplay) {
    hintElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["hold ", keyDisplay, " to speak"],
    });
    $[3] = keyDisplay;
    $[4] = hintElement;
  } else hintElement = $[4];
  return hintElement;
}
//@ chunk-18hwfzwa.js:839458-840126 layout
var BackgroundTaskCountPill; // deferred: uses Text (../../ink/components/Text.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:839458", () => {
  BackgroundTaskCountPill = memo(function (props) {
    let $ = useMemoCache(11);
    let { count, selected, onClick } = props;
    let [isHovered, setIsHovered] = useState(false);
    const inverse = selected || isHovered;
    let arrowPrefix;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      arrowPrefix = jsxProd_default_2(Text, {
        "aria-hidden": true,
        children: [DOWN_RIGHT_ARROW, " "],
      });
      $[0] = arrowPrefix;
    } else arrowPrefix = $[0];
    let countElement;
    if ($[1] !== count || $[2] !== inverse) {
      countElement = jsxProd_default_2(Text, {
        color: "background",
        inverse,
        children: [arrowPrefix, count, " background"],
      });
      $[1] = count;
      $[2] = inverse;
      $[3] = countElement;
    } else countElement = $[3];
    let content = countElement;
    if (!onClick) {
      return content;
    }
    let onClick_2;
    if ($[4] !== onClick) {
      onClick_2 = () => onClick();
      $[4] = onClick;
      $[5] = onClick_2;
    } else onClick_2 = $[5];
    let onMouseEnter;
    let onMouseLeave;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      onMouseEnter = () => setIsHovered(true);
      onMouseLeave = () => setIsHovered(false);
      $[6] = onMouseEnter;
      $[7] = onMouseLeave;
    } else {
      onMouseEnter = $[6];
      onMouseLeave = $[7];
    }
    let pillElement;
    if ($[8] !== content || $[9] !== onClick_2) {
      pillElement = jsxProd_default(Box, {
        onClick: onClick_2,
        onMouseEnter,
        onMouseLeave,
        children: content,
      });
      $[8] = content;
      $[9] = onClick_2;
      $[10] = pillElement;
    } else pillElement = $[10];
    return pillElement;
  });
});
//@ chunk-18hwfzwa.js:840126-840417 fingerprint (2.1.88 match: getSpinnerHintParts, 0.72)
function getSpinnerHintParts(isLoading, chord, chord_2, tasksV2, expandedView) {
  let toggleAction = expandedView === "tasks" ? "hide tasks" : "show tasks";
  let showToggleHint = tasksV2;
  return [
    ...(isLoading
      ? [
          jsxProd_default(
            Text,
            {
              dimColor: true,
              children: jsxProd_default(KeyboardShortcutHint, {
                chord,
                action: "interrupt",
                format: {
                  keyCase: "lower",
                },
              }),
            },
            "esc",
          ),
        ]
      : []),
    ...(showToggleHint
      ? [
          jsxProd_default(
            Text,
            {
              dimColor: true,
              children: jsxProd_default(KeyboardShortcutHint, {
                chord: chord_2,
                action: toggleAction,
                format: {
                  keyCase: "lower",
                },
              }),
            },
            "toggle-tasks",
          ),
        ]
      : []),
  ];
}
//@ chunk-18hwfzwa.js:840417-840503 fingerprint (2.1.88 match: isPrStatusEnabled, 1)
function isPrStatusEnabled(terminalFocusState) {
  if (isBgSession() && terminalFocusState === "unknown") return false;
  return getGlobalConfig().prStatusFooterEnabled ?? true;
}
//@ chunk-18hwfzwa.js:840503-840627 placement
function TasksForSubagentsHint() {
  let $ = useMemoCache(1);
  let hintElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      children: "/tasks to see subagents",
    });
    $[0] = hintElement;
  } else hintElement = $[0];
  return hintElement;
}
//@ chunk-18hwfzwa.js:840627-840631 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:840627", () => {
  init_react_production();
});
export {
  permissionModeLabelLower,
  PermissionModeLabel,
  PermissionModeLabel_2,
  PromptInputFooterLeftSide,
  cycleModeActionName,
  feedbackNoticeSignal,
  useSessionDraftCount,
  ProactiveCountdown,
};
