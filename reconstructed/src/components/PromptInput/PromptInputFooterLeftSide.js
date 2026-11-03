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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { Q, init_react_production, yt, P, R, y, Kc, Rh } from "../../../vendor/react/cjs/react.production.js";
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
import {
  BOXED_DIAMOND_GLYPH,
  WARNING_GLYPH,
  DOWN_RIGHT_ARROW,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { truncateToWidth, formatDuration } from "../../utils/format.js";
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

//@ chunk-18hwfzwa.js:678423-678969 placement
/**
 * 渲染带颜色的权限模式标签：模式符号 + 模式名 + " on"（bare 时不加）+ children。
 */
function PermissionModeLabel(props) {
  let $ = w(14);
  let { mode, bare, children } = props;
  let color;
  if ($[0] !== mode) {
    color = themeColorOf(mode);
    $[0] = mode;
    $[1] = color;
  } else color = $[1];
  let Re;
  if ($[2] !== mode) {
    Re = permissionModeSymbol(mode);
    $[2] = mode;
    $[3] = Re;
  } else Re = $[3];
  let Be;
  if ($[4] !== Re) {
    Be = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [Re, " "],
    });
    $[4] = Re;
    $[5] = Be;
  } else Be = $[5];
  let He;
  if ($[6] !== mode) {
    He = permissionModeIndicator(mode);
    $[6] = mode;
    $[7] = He;
  } else He = $[7];
  const We = bare ? "" : " on";
  let ze;
  if ($[8] !== children || $[9] !== color || $[10] !== Be || $[11] !== He || $[12] !== We) {
    ze = jsxProd_default_2(Text, {
      color,
      children: [Be, He, We, children],
    });
    $[8] = children;
    $[9] = color;
    $[10] = Be;
    $[11] = He;
    $[12] = We;
    $[13] = ze;
  } else ze = $[13];
  return ze;
}
//@ chunk-18hwfzwa.js:819599-819647 placement
function cycleModeActionName() {
  let keybindingContext = useKeybindingContext();
  return "chat:cycleMode";
}
//@ chunk-18hwfzwa.js:819647-819693 placement
function permissionModeLabelLower(h) {
  return permissionModeTitle(toExternalPermissionMode(h)).toLowerCase();
}
//@ chunk-18hwfzwa.js:819693-819726 placement
function permissionModeLabelWidth(h) {
  return bunStringWidth(permissionModeLabelLower(h));
}
//@ chunk-18hwfzwa.js:819726-820072 placement
function PermissionModeLabel_2(props) {
  let $ = w(8);
  let { mode } = props;
  let L;
  if ($[0] !== mode) {
    L = toExternalPermissionMode(mode);
    $[0] = mode;
    $[1] = L;
  } else L = $[1];
  let ee = L === "bypassPermissions";
  const color = ee ? "error" : undefined;
  const dimColor = !ee;
  let children;
  if ($[2] !== mode) {
    children = permissionModeLabelLower(mode);
    $[2] = mode;
    $[3] = children;
  } else children = $[3];
  let He;
  if ($[4] !== color || $[5] !== dimColor || $[6] !== children) {
    He = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[4] = color;
    $[5] = dimColor;
    $[6] = children;
    $[7] = He;
  } else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:820072-820101 placement
var backgroundTaskDotApi = null;
var ARTIFACT_FRAME_NAME_MAX = 24;
var ARTIFACT_FRAME_SEPARATOR = "  ";
//@ chunk-18hwfzwa.js:820101-822055 placement
function FooterLeftSide({ toolPermissionContext, rowWidth, showHint, isLoading, tasksSelected }) {
  let { columns } = useTerminalSize();
  let Re = rowWidth === undefined ? columns : rowWidth < 0 ? 0 : rowWidth;
  let Be = useAppState((Yo) => Yo.tasks);
  let He = useAppState((Yo) => Yo.remoteBackgroundTasks);
  let We = useAppState((Yo) => Yo.viewingAgentTaskId);
  let ze = useAppState((Yo) => Yo.viewSelectionMode);
  let Xe = useAppState(
    (Yo) =>
      (Yo.footerSelection === "tasks" && Yo.coordinatorTaskIndex >= 0) || Yo.footerSelection === "workflows",
  );
  let rt = useAppState((Yo) => Yo.frameUrls);
  let frameOpenFailedUnseen = useFrameOpenFailure();
  let At = useAppState((Yo) => Yo.footerSelection === "frame");
  let lower = useShortcutDisplay_2("chat:cancel", "Chat", "esc").toLowerCase();
  let shortcutDisplay = useShortcutDisplay_2(cycleModeActionName(), "Chat", "shift+tab");
  let host = useSession().host;
  let Dt = Q(() => countVisibleTasks(Be, He), [Be, He]);
  let Lt = useVisibleAgentTaskCount() > 0 || Dt > 0;
  let needsYou = Q(
    () =>
      backgroundTaskDotApi !== null &&
      Object.values(Be).some(
        (Yo) => shouldHideTasksFooter(Yo) && backgroundTaskDotApi.backgroundTaskDot(Yo) === "needsYou",
      ),
    [Be],
  );
  let colorless = sequential.level === 0;
  let io = null;
  if (Xe)
    return jsxProd_default(Box, {
      height: 1,
      overflow: "hidden",
      children: jsxProd_default(TaskPanelFooterHints, {}),
    });
  let remoteCaps = getRemoteCaps();
  let po = remoteCaps
    ? hasRemoteCap("setPermissionMode") && !remoteCaps.viewerOnly
    : !isRemoteSessionAvailable();
  let mode = toolPermissionContext.mode;
  let cycled = tabCycleState.of(host).cycled;
  let bo = po ? buildModePill(mode) : null;
  let Ao = visibleArtifactFrames(rt);
  let Bo = Ao.length > 0 && isPublishToolEnabled() ? Ao[0] : undefined;
  let Ro = Bo
    ? normalizeIdeSelectionLabel(Bo.sourceFile !== undefined ? parse(Bo.sourceFile).name : Bo.title)
    : null;
  let Ho = ze === "viewing-agent" && We !== undefined ? Be[We] : undefined;
  let Io = Ho !== undefined && Ho.status !== "running";
  let Wo = null;
  if (showHint) {
    if (Io) {
      if (Ho.type === "in_process_teammate" && lower !== "")
        Wo = footerHintSegment({
          chord: lower,
          action: "return to team lead",
          format: {
            keyCase: "lower",
          },
        });
    } else if (isLoading) {
      if (lower !== "")
        Wo = footerHintSegment({
          chord: lower,
          action: "interrupt",
          format: {
            keyCase: "lower",
          },
        });
    } else if (bo && !cycled && shortcutDisplay !== "")
      Wo = footerHintSegment({
        chord: shortcutDisplay,
        action: "cycle",
        format: {
          keyCase: "lower",
        },
      });
  }
  let mn = {
    backgroundCount: Dt,
    needsYou,
    frameCount: Ao.length,
    activeFrameName: Ro,
    frameOpenFailedUnseen,
    tasksSelected,
    frameSelected: At,
    colorless,
  };
  let Cn = Lt || Ro !== null || false;
  let No = chooseFooterLayout({
    pill: bo,
    kept: [[]],
    sparse: BackgroundTasksPill(false, mn),
    dense: BackgroundTasksPill(true, mn),
    hint: null?.selected === true ? null.keys : Wo,
    keptSelected: null?.selected === true,
    width: Cn ? Re - DOWN_ARROW_PREFIX_WIDTH : Re,
  });
  let vo = tasksSelected || At ? No.filter((Yo) => Yo.key !== "hint") : No;
  return jsxProd_default(FooterStatusRow, {
    left: vo.map((Yo) => Yo.node),
    width: Re,
    leading: Cn,
    leadingPressed: vo.some(
      (Yo) =>
        (Yo.key === "background" && tasksSelected) ||
        (Yo.key === "artifacts" && At) ||
        (Yo.key === "browser" && null?.selected === true),
    ),
  });
}
//@ chunk-18hwfzwa.js:822055-822523 placement
/**
 * 在给定宽度下挑页脚左侧要显示的段：先尝试带提示的紧凑排列，再依次尝试稀疏/紧凑/去掉 artifacts/只留胶囊，取第一个放得下的。
 */
function chooseFooterLayout({ pill, kept, sparse, dense, hint, keptSelected, width }) {
  let Be = kept[0] ?? [];
  let He = keptSelected ? (kept.at(-1) ?? []) : [];
  if (hint !== null) {
    let found = kept
      .map((Xe) => [...dense, pill, ...Xe, hint].filter(isPresent))
      .find((Xe) => rowTotalWidth(Xe) <= width);
    if (found !== undefined) return found;
  }
  let mapped = [
    [...sparse, pill, ...Be],
    ...kept.map((ze) => [...dense, pill, ...ze]),
    ...(pill === null
      ? []
      : [
          [...dense, pill, ...He],
          [...dense.filter((ze) => ze.key !== "artifacts"), pill, ...He],
          [pill, ...He],
        ]),
  ].map((ze) => ze.filter(isPresent));
  return mapped.find((ze) => rowTotalWidth(ze) <= width) ?? (pill === null ? mapped[0] : mapped.at(-1)) ?? [];
}
//@ chunk-18hwfzwa.js:822523-822555 placement
function isPresent(h) {
  return h !== null;
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
  h,
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
  let We = [];
  if (backgroundCount > 0) {
    let ze = `${backgroundCount} bg`;
    We.push({
      key: "background",
      width: bunStringWidth(ze) + (needsYou ? statusIconSlotWidth() : 0),
      node: jsxProd_default_2(
        Text,
        {
          children: [
            jsxProd_default(Text, {
              ...footerStatusStyle(tasksSelected, colorless, "background"),
              dimColor: !tasksSelected,
              children: ze,
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
    let ze = h
      ? `${BOXED_DIAMOND_GLYPH}${ARTIFACT_FRAME_SEPARATOR}${frameCount}`
      : `${BOXED_DIAMOND_GLYPH}${ARTIFACT_FRAME_SEPARATOR}${frameCount}: ${truncateToWidth(activeFrameName, ARTIFACT_FRAME_NAME_MAX)}`;
    let Xe = footerStatusStyle(frameSelected, colorless, frameOpenFailedUnseen ? "error" : "claude");
    We.push({
      key: "artifacts",
      width: bunStringWidth(ze),
      node: jsxProd_default(
        Text,
        {
          ...Xe,
          color: Xe.color ?? (frameOpenFailedUnseen ? "claude" : undefined),
          dimColor: !frameSelected && !frameOpenFailedUnseen,
          children: ze,
        },
        "artifacts",
      ),
    });
  }
  return We;
}
//@ chunk-18hwfzwa.js:823262-823375 placement
function footerHintSegment(h) {
  return {
    key: "hint",
    width: bunStringWidth(formatShortcutHint(h)),
    node: jsxProd_default(
      Text,
      {
        dimColor: true,
        italic: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          ...h,
        }),
      },
      "hint",
    ),
  };
}
//@ chunk-18hwfzwa.js:823375-823700 placement
function FeedbackDraftCount(props) {
  let $ = w(7);
  let { count } = props;
  if (count <= 0) {
    return null;
  }
  let L;
  if ($[0] !== count) {
    L = jsxProd_default(Text, {
      dimColor: false,
      children: count,
    });
    $[0] = count;
    $[1] = L;
  } else L = $[1];
  let ee;
  if ($[2] !== count) {
    ee = plural(count, "feedback draft");
    $[2] = count;
    $[3] = ee;
  } else ee = $[3];
  let ke;
  if ($[4] !== L || $[5] !== ee) {
    ke = jsxProd_default_2(Text, {
      dimColor: true,
      children: [L, " ", ee],
    });
    $[4] = L;
    $[5] = ee;
    $[6] = ke;
  } else ke = $[6];
  return ke;
}
//@ chunk-18hwfzwa.js:823700-823704 placement
init_react_production();
//@ chunk-18hwfzwa.js:823704-823791 placement
function feedbackNoticeSignal() {
  return yt(uiSignals.feedbackNotice.subscribe, () => uiSignals.feedbackNotice.getState());
}
//@ chunk-18hwfzwa.js:823791-823942 placement
function useSessionDraftCount() {
  let h = feedbackNoticeSignal();
  let { storageV5 } = useTheme_2();
  P(() => {
    if (!isFeedbackDraftsEnabled() || !tryStartDraftSeed()) return;
    countSessionQueuedDrafts(getSessionId(), storageV5)
      .then(seedSessionDraftCount)
      .catch(() => {});
  }, [storageV5]);
  return isFeedbackDraftsEnabled() ? h.sessionDraftCount : 0;
}
//@ chunk-18hwfzwa.js:823942-823993 layout
function selectPrUrlTemplate(zr) {
  return zr.settings?.prUrlTemplate;
}
//@ chunk-18hwfzwa.js:823993-824084 layout
function incrementVoiceFooterHintSeenCount(He) {
  return {
    ...He,
    voiceFooterHintSeenCount: (He.voiceFooterHintSeenCount ?? 0) + 1,
  };
}
//@ chunk-18hwfzwa.js:824084-824129 layout
var coordinatorModeModule = require("./chunk-yxywkh50.js");
var VOICE_HINT_MAX_IMPRESSIONS = 3;
//@ chunk-18hwfzwa.js:824129-829071 fingerprint = PromptInputFooterLeftSide (0.393)
/**
 * 页脚左侧：显示权限模式（shift+tab 循环 default/acceptEdits/plan/auto/bypass）、"Press Ctrl-C again to exit"、后台任务计数（可点开）、PR 状态、语音提示、catchupReplay/detach 提示。
 */
function PromptInputFooterLeftSide(props) {
  let $ = w(65);
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
  let bo = row1Hint === undefined ? null : row1Hint;
  let Ao = suppressHintExceptStatusline === undefined ? suppressHint : suppressHintExceptStatusline;
  let isExternalLoading_2 = isExternalLoading === undefined ? false : isExternalLoading;
  let betweenCalls_2 = betweenCalls === undefined ? true : betweenCalls;
  useSubagentStatusLineTick();
  let terminalFocusState = useTerminalFocusState();
  let Wo;
  if ($[0] !== terminalFocusState) {
    Wo = isPrStatusEnabled(terminalFocusState) && !isRemoteSessionAvailable();
    $[0] = terminalFocusState;
    $[1] = Wo;
  } else Wo = $[1];
  let mn = Wo;
  let prStatus = usePrStatus(isLoading, mn);
  let bgSessionPr = useBgSessionPr();
  let vo;
  if ($[2] !== bgSessionPr || $[3] !== prStatus.pr || $[4] !== mn) {
    vo =
      mn && prStatus.pr
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
    $[4] = mn;
    $[5] = vo;
  } else vo = $[5];
  let Yo = vo;
  let needsAuth = !Yo && mn && prStatus.needsAuth;
  let appState = useAppState(selectPrUrlTemplate);
  let bn;
  if ($[6] !== Yo || $[7] !== appState) {
    bn = Yo ? expandPrUrlIfTemplate(Yo.url, appState) : undefined;
    $[6] = Yo;
    $[7] = appState;
    $[8] = bn;
  } else bn = $[8];
  usePrActionEffect(bn, Yo?.url, Yo?.kind);
  let setAppState = useSetAppState();
  let number = Yo?.number;
  let url = Yo?.url;
  let reviewState = Yo?.reviewState;
  let kind = Yo?.kind;
  let $n;
  if ($[9] !== prStatus.lastUpdated) {
    $n = prStatus.lastUpdated > 0 || currentPrStatusFetcher().pollerDisabled;
    $[9] = prStatus.lastUpdated;
    $[10] = $n;
  } else $n = $[10];
  let on = $n;
  let _o;
  let cn;
  if (
    $[11] !== kind ||
    $[12] !== number ||
    $[13] !== reviewState ||
    $[14] !== url ||
    $[15] !== on ||
    $[16] !== appState ||
    $[17] !== setAppState
  ) {
    cn = () => {
      setAppState((Dn) => {
        let wn =
          !on &&
          Dn.prStatus !== null &&
          (number === undefined ||
            (number === Dn.prStatus.number &&
              Dn.prStatus.kind === kind &&
              reviewState === undefined &&
              Dn.prStatus.reviewState !== undefined));
        let mr =
          Dn.prStatus?.number === number &&
          Dn.prStatus?.url === url &&
          Dn.prStatus?.reviewState === reviewState &&
          Dn.prStatus?.kind === kind;
        let Kn =
          wn || mr
            ? Dn.prStatus
            : number !== undefined && url !== undefined
              ? {
                  number,
                  url,
                  reviewState,
                  kind,
                }
              : null;
        let Wn = setKeyedFooterLink(
          Dn.footerLinks,
          CURRENT_PR,
          INITIAL_STATE_2(
            Kn,
            Kn ? (Kn.kind !== undefined ? Kn.url : expandPrUrlIfTemplate(Kn.url, appState)) : undefined,
          ),
        );
        if (Kn === Dn.prStatus && Wn === Dn.footerLinks) {
          return Dn;
        }
        return {
          ...Dn,
          prStatus: Kn,
          footerLinks: Wn,
        };
      });
    };
    _o = [number, url, reviewState, kind, on, appState, setAppState];
    $[11] = kind;
    $[12] = number;
    $[13] = reviewState;
    $[14] = url;
    $[15] = on;
    $[16] = appState;
    $[17] = setAppState;
    $[18] = _o;
    $[19] = cn;
  } else {
    _o = $[18];
    cn = $[19];
  }
  P(cn, _o);
  let Fr;
  let Zn;
  if ($[20] !== needsAuth || $[21] !== setAppState) {
    Fr = () => {
      setAppState((Un) =>
        Un.prNeedsAuth === needsAuth
          ? Un
          : {
              ...Un,
              prNeedsAuth: needsAuth,
            },
      );
    };
    Zn = [needsAuth, setAppState];
    $[20] = needsAuth;
    $[21] = setAppState;
    $[22] = Fr;
    $[23] = Zn;
  } else {
    Fr = $[22];
    Zn = $[23];
  }
  P(Fr, Zn);
  let dr = showSwarmFooterGate();
  let or = R(null);
  let pr;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    pr = () => (or.current === null ? 0 : measureElement(or.current).width);
    $[24] = pr;
  } else pr = $[24];
  let measured = useMeasured(pr);
  if (!dr && exitMessage.show) {
    const key = exitMessage.key;
    const Ir = isBgSession() || hasRemoteCap("catchupReplay") ? "detach (session keeps running)" : "exit";
    let Pr;
    if ($[25] !== exitMessage.key) {
      Pr = jsxProd_default_2(
        Text,
        {
          dimColor: true,
          children: ["Press ", key, " again to", " ", Ir],
        },
        "exit-message",
      );
      $[25] = exitMessage.key;
      $[26] = Pr;
    } else Pr = $[26];
    return Pr;
  }
  if (!dr && isPasting) {
    let ur;
    if ($[27] === MEMO_CACHE_SENTINEL) {
      ur = jsxProd_default(
        Text,
        {
          dimColor: true,
          children: "Pasting\u2026",
        },
        "pasting-message",
      );
      $[27] = ur;
    } else ur = $[27];
    return ur;
  }
  if (!dr && showExpandPasteHint && !isSearching) {
    let ur;
    if ($[28] === MEMO_CACHE_SENTINEL) {
      ur = jsxProd_default(
        Text,
        {
          dimColor: true,
          children: "paste again to expand",
        },
        "expand-paste-hint",
      );
      $[28] = ur;
    } else ur = $[28];
    return ur;
  }
  let ts = vimMode !== undefined && !hideVimModeIndicator && vimMode !== "NORMAL" && !isSearching;
  let Gn = (ts ? bunStringWidth(`-- ${vimMode} --`) + 1 : 0) + (isSearching ? measured + 1 : 0);
  let Ur = rowWidth === undefined ? undefined : rowWidth - Gn;
  let Zr = wrappedRowWidth === undefined ? undefined : wrappedRowWidth - Gn;
  let ur;
  if (
    $[29] !== historyFailedMatch ||
    $[30] !== historyQuery ||
    $[31] !== dr ||
    $[32] !== isSearching ||
    $[33] !== setHistoryQuery
  ) {
    ur =
      isSearching &&
      jsxProd_default(Box, {
        ref: or,
        flexShrink: dr ? 0 : 1,
        children: jsxProd_default(HistorySearchInputRef, {
          value: historyQuery,
          onChange: setHistoryQuery,
          historyFailedMatch,
        }),
      });
    $[29] = historyFailedMatch;
    $[30] = historyQuery;
    $[31] = dr;
    $[32] = isSearching;
    $[33] = setHistoryQuery;
    $[34] = ur;
  } else ur = $[34];
  let Ir;
  if ($[35] !== ts || $[36] !== vimMode) {
    Ir = ts
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
    $[35] = ts;
    $[36] = vimMode;
    $[37] = Ir;
  } else Ir = $[37];
  let Pr;
  if (
    $[38] !== betweenCalls_2 ||
    $[39] !== Ur ||
    $[40] !== Zr ||
    $[41] !== isExternalLoading_2 ||
    $[42] !== dr ||
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
    $[53] !== bo ||
    $[54] !== ts ||
    $[55] !== suppressHint ||
    $[56] !== Ao ||
    $[57] !== tasksSelected ||
    $[58] !== toolPermissionContext ||
    $[59] !== vimMode
  ) {
    Pr = dr
      ? bo !== null
        ? jsxProd_default(
            Box,
            {
              height: 1,
              width: Ur === undefined ? undefined : Math.max(0, Ur),
              overflow: "hidden",
              children: jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                wrap: "truncate-end",
                children: bo.text,
              }),
            },
            bo.id,
          )
        : jsxProd_default(FooterLeftSide, {
            toolPermissionContext,
            showHint: !Ao && !ts,
            isLoading,
            rowWidth: Ur,
            tasksSelected,
          })
      : jsxProd_default(ModeIndicator, {
          mode,
          toolPermissionContext,
          showHint: !suppressHint && !ts,
          denseShowHint: !Ao && !ts,
          denseVimOnlySuppression: !Ao && ts,
          vimIndicatorShown: ts,
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
          rowWidth: isSearching ? undefined : Ur,
          wrappedRowWidth: isSearching ? undefined : Zr,
          isSearching,
        });
    $[38] = betweenCalls_2;
    $[39] = Ur;
    $[40] = Zr;
    $[41] = isExternalLoading_2;
    $[42] = dr;
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
    $[53] = bo;
    $[54] = ts;
    $[55] = suppressHint;
    $[56] = Ao;
    $[57] = tasksSelected;
    $[58] = toolPermissionContext;
    $[59] = vimMode;
    $[60] = Pr;
  } else Pr = $[60];
  let wr;
  if ($[61] !== ur || $[62] !== Ir || $[63] !== Pr) {
    wr = jsxProd_default_2(Box, {
      justifyContent: "flex-start",
      gap: 1,
      children: [ur, Ir, Pr],
    });
    $[61] = ur;
    $[62] = Ir;
    $[63] = Pr;
    $[64] = wr;
  } else wr = $[64];
  return wr;
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
//@ chunk-18hwfzwa.js:829169-839108 fingerprint = ModeIndicator (0.519)
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
  let po = useAppState((yi) => yi.footerSelection === "frame");
  let ao = isRemoteSessionAvailable();
  let co = useAppState((yi) => (ao ? visibleArtifactFrames(yi.frameUrls).length : 0));
  let action = ao && co === 1 ? "open in browser" : "view artifacts";
  useForceRender();
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_thistle", false);
  let shortcutDisplay = useShortcutDisplay_2(cycleModeActionName(), "Chat", "shift+tab");
  let tasks = useAppState((yi) => yi.tasks);
  let tasks_2 = useAppState((yi) => yi.remoteBackgroundTasks);
  let taskDecorations = useAppState((s_0) => s_0.taskDecorations);
  let store = subscribeCoordinatorPanel();
  let viewSelectionMode = useAppState(
    (s_1) =>
      (s_1.footerSelection === "tasks" && s_1.coordinatorTaskIndex >= 0) ||
      s_1.footerSelection === "workflows",
  );
  let viewingAgentTaskId = useAppState((s_2) => s_2.footerSelection !== null);
  let viewSelectionMode_2 = useAppState((s_3) => s_3.viewSelectionMode);
  let viewingAgentTaskId_2 = useAppState((yi) => yi.viewingAgentTaskId);
  let expandedView = useAppState((yi) => yi.expandedView);
  let footerLinks = useFooterLinks({
    excludeKeyed: featureValue_CACHED_MAY_BE_STALE,
  });
  let ref = R(null);
  let ref_2 = R(null);
  let ref_3 = R(null);
  let ref_4 = R(null);
  let Mn = null;
  let Xo = 0;
  let Sn = 0;
  let $n = 0;
  let on = null;
  let attentionBudget = useAppState((yi) => yi.attentionBudget);
  let proactivityLevel = useAppState((s_4) => s_4.proactivityLevel);
  let voiceAvailable = useVoiceAvailable();
  let wn = useAppState_2((s_5) => s_5.voiceState);
  let mr = useAppState_2((s_6) => s_6.voiceWarmingUp);
  let hasSelection = useHasSelection();
  let selGetState = useSelection().getState;
  let Fr = coordinatorModeModule.isCoordinatorMode();
  let runningTaskCount = Q(() => countVisibleTasks(tasks, tasks_2), [tasks, tasks_2, store]);
  let tasksV2 = useHasTaskSelection();
  let escShortcut = useShortcutDisplay_2("chat:cancel", "Chat", "esc").toLowerCase();
  let todosShortcut = useShortcutDisplay_2("app:toggleTodos", "Global", "ctrl+t");
  let shortcutDisplay_2 = useShortcutDisplay_2("voice:pushToTalk", "Chat", "space");
  let shortcutDisplay_3 = useShortcutDisplay("footer:openSelected", "Footer", "enter");
  let [ur] = y(() => {
    let yi = announcementState();
    if (yi.voiceFooterHintUnderCap === undefined)
      yi.voiceFooterHintUnderCap =
        (getGlobalConfig().voiceFooterHintSeenCount ?? 0) < VOICE_HINT_MAX_IMPRESSIONS;
    return yi.voiceFooterHintUnderCap;
  });
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let statusLineSuppressed = useStatusLineSuppressed();
  let ts = AgentsPill({
    available: leftArrowDetachAvailable && isInputEmpty && !viewingAgentTaskId && !vimBlocksGesture,
    restingHintExpired: useAppState((prev) => prev.agentsHintExpired === true),
  });
  let sessionDraftCount = useSessionDraftCount();
  let Ur = yt(subscribeGlobalConfigInstalled, getFooterIndicatorConfig);
  let CLAUDE_CODE_FOOTER_INDICATOR = env.CLAUDE_CODE_FOOTER_INDICATOR;
  let mainLoopModel = useMainLoopModel_3();
  let zr = Q(
    () => resolveFooterIndicator(CLAUDE_CODE_FOOTER_INDICATOR, mainLoopModel, Ur),
    [CLAUDE_CODE_FOOTER_INDICATOR, mainLoopModel, Ur],
  );
  let _r = Q(() => isModelMissingFromClientData(mainLoopModel), [mainLoopModel]);
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
  let ms = !remoteCaps && !isRemoteSessionAvailable();
  let Xs = ms ? attentionBudgetSummary(attentionBudget) : null;
  let Ls = ms ? getZero(attentionBudget) : 0;
  let hasActiveMode = !isDefaultMode(mode_2);
  let ws = viewingAgentTaskId_2 ? tasks[viewingAgentTaskId_2] : undefined;
  let Ci = viewSelectionMode_2 === "viewing-agent" && ws?.type === "in_process_teammate";
  let oi = false;
  let Oi = 0;
  let Hi = oi && levelStepped && !levelPillCollapsed && !viewingAgentTaskId && !isLoading && !mr;
  let Zi = Ci && ws != null && ws.status !== "running";
  let da = runningTaskCount > 0;
  let qn = (Fr || hasActiveMode ? 1 : 0) + (da ? 1 : 0);
  let ps =
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
  let xs = null;
  let kr = xs
    ? jsxProd_default_2(
        Text,
        {
          color: "success",
          children: [
            jsxProd_default_2(Text, {
              "aria-hidden": true,
              children: [figures_default.lozenge, " "],
            }),
            xs,
          ],
        },
        "retention",
      )
    : null;
  let ls = _r
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
    : zr
      ? jsxProd_default_2(
          Text,
          {
            color: "ide",
            children: [
              jsxProd_default_2(Text, {
                "aria-hidden": true,
                children: [figures_default.lozenge, " "],
              }),
              zr,
            ],
          },
          "footer-indicator",
        )
      : null;
  let qs =
    (_r ? bunStringWidth(`${WARNING_GLYPH} wrong model?`) + 3 : zr ? bunStringWidth(zr) + 5 : 0) + Ls + Oi;
  let gs =
    qn < 2 &&
    !((ps || footerLinks.length > 0) && columns < 60 + (kr ? 8 : 0) + qs) &&
    !(kr && columns < 56 + qs) &&
    !(ls && columns < 48 + qs) &&
    !(Xs && columns < 48 + Ls + Oi);
  let es = remoteCaps
    ? hasRemoteCap("setPermissionMode") && !remoteCaps.viewerOnly
    : !isRemoteSessionAvailable();
  let ds = !isScreenReaderEnabled && hasEvictableIdleSubagent(tasks, viewingAgentTaskId_2);
  if (viewSelectionMode)
    return jsxProd_default(Box, {
      height: 1,
      overflow: "hidden",
      children: jsxProd_default(TaskPanelFooterHints, {}),
    });
  if (featureValue_CACHED_MAY_BE_STALE) {
    let yi = runningTaskCount;
    let Ws = yi >= 2;
    let za = runningTaskCount >= 1;
    let cl = !!mode_2 && es;
    let Ol =
      getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId_2).length > 0 ||
      (!store && viewingAgentTaskId_2 !== undefined && isPanelOrTeammateTask(tasks[viewingAgentTaskId_2]));
    let as = leftArrowDetachAvailable && !Ci && isInputEmpty && !viewingAgentTaskId && !vimBlocksGesture;
    let pi = voiceAvailable && wn === "idle" && ur && showHint && shortcutDisplay_2 !== "";
    let qa = "none";
    if (voiceAvailable && mr) qa = "warmup";
    else if (Zi) qa = "interrupt";
    else if (!denseShowHint)
      qa = denseVimOnlySuppression && as && ts !== null && !isScreenReaderEnabled ? "agents" : "none";
    else if (isLoading) qa = as && ts !== null && !isScreenReaderEnabled ? "interrupt_agents" : "interrupt";
    else if (po) qa = "artifacts";
    else if (on?.selected) qa = "none";
    else if ((za || Ol) && !viewSelectionMode) qa = "manage";
    else if (tasksV2) qa = "ctrl_t";
    else if (as && !isScreenReaderEnabled) qa = ts !== null ? "agents" : "none";
    else if (ds) qa = "none";
    else if (pi) qa = "voice";
    else if (cl && (hasActiveMode || oi) && shortcutDisplay !== "") qa = "cycle";
    else qa = showHint && !isScreenReaderEnabled ? "shortcuts" : "none";
    let pd =
      qa === "cycle" && !oi
        ? formatShortcutHint({
            chord: shortcutDisplay,
            action: "cycle",
            parens: true,
            format: {
              keyCase: "lower",
            },
          })
        : qa === "manage" && za && (!tasksSelected || shortcutDisplay_3)
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
    let $l = pd === "" ? 0 : 1 + bunStringWidth(pd);
    let Yi = on !== null && Mn !== null && Mn >= Sn;
    let El = Mn === null ? null : Mn + (Yi ? 0 : (wrappedRowWidth ?? rowWidth ?? 0) - (rowWidth ?? 0));
    let Ll = on !== null && El !== null && $l > 0 && El - $l < Sn;
    if (Ll) qa = "none";
    let _c = isSearching ? Sn : El === null ? undefined : Math.max(Sn, El - (Ll ? 0 : $l) - $n);
    let children = null;
    let action_2 = expandedView === "tasks" ? "hide tasks" : "show tasks";
    let cd =
      qa === "cycle" && pd !== "" && mode_2
        ? jsxProd_default(Box, {
            ref: ref_2,
            children: jsxProd_default_2(Text, {
              color: themeColorOf(mode_2),
              dimColor: true,
              children: [" ", pd],
            }),
          })
        : null;
    let Ka =
      qa === "manage" && pd !== ""
        ? jsxProd_default(Box, {
            ref: ref_2,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [" ", pd],
            }),
          })
        : null;
    let pl = null;
    if (qa === "warmup") pl = jsxProd_default(KeepHoldingHint, {}, "voice-warmup");
    else if (qa === "manage" && !za && (!tasksSelected || shortcutDisplay_3))
      pl = jsxProd_default(Text, {
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
    else if (qa === "artifacts" && shortcutDisplay_3)
      pl = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: shortcutDisplay_3,
          action,
        }),
      });
    else if (qa === "interrupt" || qa === "interrupt_agents")
      pl = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: escShortcut,
                action: Zi ? "return to team lead" : "interrupt",
                format: {
                  keyCase: "lower",
                },
              }),
              qa === "interrupt_agents" && " \xB7 ",
            ],
          }),
          qa === "interrupt_agents" && ts,
        ],
      });
    else if (qa === "ctrl_t")
      pl = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: todosShortcut,
          action: action_2,
          format: {
            keyCase: "lower",
          },
        }),
      });
    else if (qa === "agents") pl = ts;
    else if (qa === "voice")
      pl = jsxProd_default(VoiceHoldToSpeakHint, {
        keyDisplay: shortcutDisplay_2,
      });
    else if (qa === "shortcuts")
      pl = jsxProd_default(Text, {
        dimColor: true,
        children: "? for shortcuts",
      });
    let Gl =
      cl && mode_2
        ? jsxProd_default_2(
            Box,
            {
              flexShrink: 0,
              children: [
                jsxProd_default(PermissionModeLabel, {
                  mode: mode_2,
                }),
                cd,
              ],
            },
            "mode",
          )
        : null;
    if (Hi && Gl)
      return jsxProd_default(Box, {
        height: 1,
        overflow: "hidden",
        children: Gl,
      });
    let gd = za
      ? Ws
        ? jsxProd_default(BackgroundTaskCountPill, {
            count: yi,
            selected: tasksSelected,
            onClick: onOpenTasksDialog,
          })
        : jsxProd_default(BackgroundTaskStatus, {
            tasksSelected,
            onOpenDialog: onOpenTasksDialog,
          })
      : null;
    if (
      !Gl &&
      !Xs &&
      !kr &&
      !ls &&
      !gd &&
      !frameFooterState &&
      !on &&
      footerLinks.length === 0 &&
      !pl &&
      sessionDraftCount === 0 &&
      !ds
    )
      return isFullscreen
        ? jsxProd_default(Text, {
            children: " ",
          })
        : null;
    let hd = gd || frameFooterState || on || footerLinks.length > 0;
    let bd = jsxProd_default(Text, {
      dimColor: true,
      children: " \xB7 ",
    });
    let Od = !!(hd || Gl || Xs || kr || ls);
    let pc = Od || ds;
    let Kd = pc || !!pl;
    let ec = jsxProd_default_2(Fragment, {
      children: [
        ds &&
          jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [Od && bd, jsxProd_default(TasksForSubagentsHint, {})],
          }),
        pl &&
          jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [pc && bd, pl],
          }),
        sessionDraftCount > 0 &&
          jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [
              Kd && bd,
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
      maxWidth: Yi ? Math.max(0, rowWidth ?? 0) : undefined,
      children: [
        jsxProd_default_2(Box, {
          ref,
          flexShrink: 0,
          children: [
            Gl,
            Gl &&
              (Xs || kr || ls || hd) &&
              jsxProd_default(Box, {
                flexShrink: 0,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: " \xB7 ",
                }),
              }),
            Xs &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  Xs,
                  (kr || ls || hd) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            kr &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  kr,
                  (ls || hd) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            ls &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  ls,
                  hd &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
            gd &&
              jsxProd_default_2(Box, {
                flexShrink: 0,
                children: [
                  gd,
                  Ka,
                  (frameFooterState || on || footerLinks.length > 0) &&
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
                  (on || footerLinks.length > 0) &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: " \xB7 ",
                    }),
                ],
              }),
          ],
        }),
        on &&
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
            children: footerLinks.map((footerLink, Ku) =>
              jsxProd_default_2(
                Box,
                {
                  flexShrink: 0,
                  children: [
                    jsxProd_default(FooterLink, {
                      link: footerLink,
                    }),
                    Ku < footerLinks.length - 1 &&
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
        on
          ? jsxProd_default(Box, {
              ref: ref_4,
              flexShrink: 0,
              children: ec,
            })
          : ec,
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
  let _s = [...(on ? [on.pill] : [])];
  if (ds) _s.push(jsxProd_default(TasksForSubagentsHint, {}, "tasks-subagents"));
  let fs = showHint ? getSpinnerHintParts(isLoading, escShortcut, todosShortcut, tasksV2, expandedView) : [];
  if (Zi)
    _s.push(
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
  else if (showHint) _s.push(...fs);
  let ii =
    (isBgSession() || getIsRemoteMode()) &&
    leftArrowDetachAvailable &&
    isInputEmpty &&
    !viewingAgentTaskId &&
    !vimBlocksGesture &&
    !isScreenReaderEnabled
      ? ts
      : null;
  let La =
    !statusLineSuppressed &&
    !Ci &&
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
    ts !== null
      ? jsxProd_default(
          Kc,
          {
            children: ts,
          },
          "fg-agents",
        )
      : null;
  let Xa =
    getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId_2).length > 0 ||
    (!store && viewingAgentTaskId_2 !== undefined && isPanelOrTeammateTask(tasks[viewingAgentTaskId_2]));
  let dl = da
    ? jsxProd_default(BackgroundTaskStatus, {
        tasksSelected,
        onOpenDialog: onOpenTasksDialog,
      })
    : null;
  if (
    _s.length === 0 &&
    !dl &&
    !(mode_2 && es && hasActiveMode) &&
    !ps &&
    mapped.length === 0 &&
    !ii &&
    showHint
  ) {
    if (!isScreenReaderEnabled)
      _s.push(
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
  if (La) _s.push(La);
  if (sessionDraftCount > 0)
    _s.push(
      jsxProd_default(
        FeedbackDraftCount,
        {
          count: sessionDraftCount,
        },
        "feedback-drafts",
      ),
    );
  let copyOnSelect = getGlobalConfig().copyOnSelect ?? true;
  let Hd = hasSelection && (!copyOnSelect || isXtermJs());
  if (voiceAvailable && mr) _s.push(jsxProd_default(KeepHoldingHint, {}, "voice-warmup"));
  else if (isFullscreen && Hd) {
    let yi = getPlatform() === "macos";
    let Ws = yi && (selGetState()?.lastPressHadAlt ?? false);
    _s.push(
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
                (Ws
                  ? jsxProd_default(Text, {
                      children: "set macOptionClickForcesSelection in VS Code settings",
                    })
                  : jsxProd_default_2(Text, {
                      children: [yi ? "option+click" : "shift+click", " to native select"],
                    })),
            ],
          }),
        },
        "selection-copy",
      ),
    );
  } else if (
    _s.length > 0 &&
    showHint &&
    voiceAvailable &&
    wn === "idle" &&
    fs.length === 0 &&
    ur &&
    shortcutDisplay_2 !== ""
  )
    _s.push(
      jsxProd_default(
        VoiceHoldToSpeakHint,
        {
          keyDisplay: shortcutDisplay_2,
        },
        "voice-hint",
      ),
    );
  if ((dl || Xa) && showHint && !viewSelectionMode && !po && (!tasksSelected || shortcutDisplay_3))
    _s.push(
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
  if (po && showHint && shortcutDisplay_3)
    _s.push(
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
  let Ss =
    mode_2 && es
      ? jsxProd_default(
          Box,
          {
            flexShrink: 0,
            children: jsxProd_default(PermissionModeLabel, {
              mode: mode_2,
              children:
                hasActiveMode &&
                gs &&
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
  if (Hi && Ss)
    return jsxProd_default(Box, {
      height: 1,
      overflow: "hidden",
      children: Ss,
    });
  if (
    _s.length === 0 &&
    !dl &&
    !Ss &&
    !Xs &&
    !kr &&
    !ls &&
    !ps &&
    mapped.length === 0 &&
    !ii &&
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
      Ss,
      Ss &&
        (Xs || kr || ls || ii || ps || mapped.length > 0 || dl || frameFooterState || _s.length > 0) &&
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          }),
        }),
      Xs &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            Xs,
            (kr || ls || ii || ps || mapped.length > 0 || dl || frameFooterState || _s.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      kr &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            kr,
            (ls || ii || ps || mapped.length > 0 || dl || frameFooterState || _s.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      ls &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            ls,
            (ii || ps || mapped.length > 0 || dl || frameFooterState || _s.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      ii &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            ii,
            (ps || mapped.length > 0 || dl || frameFooterState || _s.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      ps &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            ps,
            (mapped.length > 0 || dl || frameFooterState || _s.length > 0) &&
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
            (dl || frameFooterState || _s.length > 0) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      dl &&
        jsxProd_default_2(Box, {
          flexShrink: 0,
          children: [
            dl,
            (frameFooterState || _s.length > 0) &&
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
            _s.length > 0 &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
          ],
        }),
      _s.length > 0 &&
        jsxProd_default(Text, {
          wrap: "truncate",
          children: jsxProd_default(Byline, {
            children: _s,
          }),
        }),
    ],
  });
}
//@ chunk-18hwfzwa.js:839108-839458 layout
function VoiceHoldToSpeakHint(props) {
  let $ = w(5);
  let { keyDisplay } = props;
  let { storageV5 } = useTheme_2();
  let ee;
  let ke;
  if ($[0] !== storageV5) {
    ee = () => {
      let Re = announcementState();
      if (Re.voiceFooterHintCounted) {
        return;
      }
      Re.voiceFooterHintCounted = true;
      saveGlobalConfig(incrementVoiceFooterHintSeenCount, storageV5);
    };
    ke = [storageV5];
    $[0] = storageV5;
    $[1] = ee;
    $[2] = ke;
  } else {
    ee = $[1];
    ke = $[2];
  }
  P(ee, ke);
  let Be;
  if ($[3] !== keyDisplay) {
    Be = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["hold ", keyDisplay, " to speak"],
    });
    $[3] = keyDisplay;
    $[4] = Be;
  } else Be = $[4];
  return Be;
}
//@ chunk-18hwfzwa.js:839458-840126 layout
var BackgroundTaskCountPill = Rh(function (props) {
  let $ = w(11);
  let { count, selected, onClick } = props;
  let [ke, Re] = y(false);
  const inverse = selected || ke;
  let We;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    We = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [DOWN_RIGHT_ARROW, " "],
    });
    $[0] = We;
  } else We = $[0];
  let ze;
  if ($[1] !== count || $[2] !== inverse) {
    ze = jsxProd_default_2(Text, {
      color: "background",
      inverse,
      children: [We, count, " background"],
    });
    $[1] = count;
    $[2] = inverse;
    $[3] = ze;
  } else ze = $[3];
  let Xe = ze;
  if (!onClick) {
    return Xe;
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
    onMouseEnter = () => Re(true);
    onMouseLeave = () => Re(false);
    $[6] = onMouseEnter;
    $[7] = onMouseLeave;
  } else {
    onMouseEnter = $[6];
    onMouseLeave = $[7];
  }
  let It;
  if ($[8] !== Xe || $[9] !== onClick_2) {
    It = jsxProd_default(Box, {
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: Xe,
    });
    $[8] = Xe;
    $[9] = onClick_2;
    $[10] = It;
  } else It = $[10];
  return It;
});
//@ chunk-18hwfzwa.js:840126-840417 fingerprint = getSpinnerHintParts (0.72)
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
//@ chunk-18hwfzwa.js:840417-840503 fingerprint = isPrStatusEnabled (1)
function isPrStatusEnabled(terminalFocusState) {
  if (isBgSession() && terminalFocusState === "unknown") return false;
  return getGlobalConfig().prStatusFooterEnabled ?? true;
}
//@ chunk-18hwfzwa.js:840503-840627 placement
function TasksForSubagentsHint() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      dimColor: true,
      children: "/tasks to see subagents",
    });
    $[0] = x;
  } else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:840627-840631 placement
init_react_production();
//@ chunk-5cp2fssw.js:14565-14629 fingerprint = ProactiveCountdown (0.737)
function ProactiveCountdown(e) {
  return formatDuration(Math.max(0, e), {
    mostSignificantOnly: true,
  });
}
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
