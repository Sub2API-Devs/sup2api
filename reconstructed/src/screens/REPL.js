/**
 * screens/REPL.tsx
 *
 * 主交互屏幕：组装会话控制器、消息列表、输入区、对话框、通知与全屏布局；transcript 模式与搜索栏。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/screens/REPL.tsx
 * pieces: chunk-18hwfzwa.js (92)
 * attribution: placement 8, layout 6, fingerprint 4, sole-consumer 70, affinity 1, file-local 1, facade-exports 1, callgraph-witnessed 1
 */
import { resolve } from "path";
import { randomUUID } from "crypto";
import {
  init_react_production,
  y,
  P,
  Q,
  Se,
  zt,
  R,
  yt,
  Kc,
} from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import {
  useHasOpenDialog as useHasOpenDialog_2,
  useHasAutoDialog,
  useDialogStore,
  useDialogOfKind,
  useDialogSelector,
  useTopAutoDialogKind,
} from "../state/dialogQueue.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getShortEditorName } from "../utils/editor.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Byline } from "../components/design-system/Byline.js";
import { useSearchInput } from "../hooks/useSearchInput.js";
import { useClock, clockContext, defaultSetTimeout } from "../ink/components/ClockContext.js";
import { isNativeCursorEnabled, isDecstbmRendererEnabled } from "../ink/nativeCursor.js";
import { env } from "../utils/env.js";
import { useDeclaredCursor } from "../ink/hooks/use-declared-cursor.js";
import { createSignal } from "../utils/signal.js";
import { logForDebugging } from "../utils/debug.js";
import { pickActiveSurvey } from "../components/FeedbackSurvey/PluginSurvey.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { AssistantTokenCounter, SurveyHost } from "../components/FeedbackSurvey/SurveyHost.js";
import { usePostCompactSurvey } from "../components/FeedbackSurvey/usePostCompactSurvey.js";
import { useLongContextSurvey } from "../components/FeedbackSurvey/useLongContextSurvey.js";
import { usePluginFeedbackSurvey, useOrgSurvey } from "../components/FeedbackSurvey/useOrgSurvey.js";
import { useMemorySurvey } from "../components/FeedbackSurvey/useMemorySurvey.js";
import { useFeedbackSurvey } from "../components/FeedbackSurvey/useFeedbackSurvey.js";
import { SpinnerPaceContext, IMMEDIATE_PACER } from "../components/Spinner/paceContext.js";
import { AbovePromptBandNamespace } from "../components/pluginUi/AbovePromptBand.js";
import { FeedbackDraftNotice } from "../components/FeedbackSurvey/FeedbackDraftNotice.js";
import { NOOP_HELPERS } from "../hooks/useCommandKeybindings.js";
import { logError } from "../utils/log.js";
import { WebSetupPromptGate } from "../components/FeedbackSurvey/TranscriptSharePrompt.js";
import { PaneDockNamespace, computeMaxDockColumns } from "../components/pluginUi/PaneDock.js";
import { PromptComposerMemo } from "../components/PromptInput/PromptComposer.js";
import { SessionBackgroundHint } from "../components/SessionBackgroundHint.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { getTerminalMultiplexer } from "../ink/terminal.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useInterval, useSelection } from "../ink/components/Input.js";
import { useTerminalTitle, useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { string } from "../../vendor/zod/v4/classic/schemas.js";
import { orderedRowSource, appendRowsWithHooks } from "../utils/queryHelpers.js";
import { applyMessageListAppend, applyMessageListEdit } from "../cli/print/turnStreaming.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import {
  mainAgentId,
  getIsRemoteMode,
  updateLastInteractionTime,
  getLastInteractionTime,
} from "../bootstrap/state.js";
import { ReplayHandleSlot } from "../ink/outputReplay.js";
import {
  useSetAppState,
  useAppState,
  useAppStoreDirect,
  useSetAppStateFn,
  useActivePlugins,
  useSessionHooksRegistry,
} from "../state/AppState.js";
import { useForceRender, renderWithForceUpdate } from "../hooks/useForceRender.js";
import { useSession, useHost } from "../context/session.js";
import {
  switchToConversationTab,
  isDiffSidebarPreferred,
  prefetchWorkspaceDiff,
  getDiffBaseMode,
  markDiffAutoOpenPending,
  DIFF_MIN_REFRESH_MS,
  toggleDiffPanel,
  logDiffPanelShown,
  useLocalWorkspaceDiff,
  cycleDiffBaseMode,
  closeDiffSidebar,
  isDiffPanelAvailable,
  useDiffSidebarState,
  shouldShowDiffSidebar,
} from "../hooks/useWorkspaceDiff.js";
import { useTheme_2, useTheme } from "../components/design-system/ThemeProvider.js";
import { useNotifications } from "../context/notifications.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { todoToolsEnabled } from "../utils/sessionKind.js";
import { count } from "../utils/collections.js";
import { useThirdOverlayKeys } from "../context/overlayContext.js";
import { useFeedIsWide, FullscreenLayout } from "../components/FullscreenLayout.js";
import { useDragToScroll } from "../components/ScrollKeybindingHandler.js";
import { findRowOwner } from "../ink/hooks/use-terminal-viewport.js";
import { useDiffSelectionAttach, DiffDetailView } from "../components/diff/DiffDetailView.js";
import { getDiffRepoRoot, getDiffCwd } from "../utils/gitDiff.js";
import { findGitRoot } from "../utils/git.js";
import { matchingRuleForInput } from "../utils/permissions/filesystem.js";
import { isLockOrGeneratedFile, isTestFile } from "../utils/attributionFileClasses.js";
import { clamp } from "../ink/screen.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import { plural } from "../utils/stringUtils.js";
import { DiffStatCounts } from "../components/PrBadge.js";
import { ProgressBar } from "../components/design-system/ProgressBar.js";
import { UP_ARROW, DOWN_ARROW } from "../utils/permissions/autoModeRulesPrompt.js";
import { WorkerBadge } from "../components/permissions/WorkerBadge.js";
import { wrapText } from "../ink/wrap-text.js";
import { ScrollBoxDefault } from "../ink/components/ScrollBox.js";
import { HintText } from "../components/design-system/HintText.js";
import { Divider } from "../components/design-system/Divider.js";
import { truncateStartToWidth } from "../utils/format.js";
import { diffLineToPlainText } from "../components/diff/diffText.js";
import { HEAVY_MULTIPLICATION_X } from "../constants/figures.js";
import { BridgeChannelSlot, createColorAssigner } from "../services/artifacts/artifactReadConsent.js";
import {
  setDialogHostUnmounted,
  setBlockingToolProgress,
  useActive,
  useAutoDialogKindAlt,
} from "./repl/storeHooks.js";
import { clearBlockingDialog, markBlockingDialogShown } from "../services/requestUserDialog.js";
import { topBlockingDialog, isMotionAllowed, TurnSpinnerRow, spinnerPlacement } from "./replDialogState.js";
import { getGlobalConfig } from "../utils/config.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { shortHash } from "../utils/shortHash.js";
import { useCommandQueueOrDefault, QueueProvider } from "../context/QueuedMessageContext.js";
import { useRenderMode } from "../ink/renderModeContext.js";
import { rootSessionSlot } from "../context/replRootContext.js";
import { showFooterHintGate } from "../components/PromptInput/footerGates.js";
import { useFleetNudgeStore } from "../components/fleet/FleetNudgeStore.js";
import { remoteSessionAwaits } from "../utils/remoteSessionCommands.js";
import { useRegistryOverride, useBackgroundStatusSync, useSuspendResume } from "./repl/suspendAndSpinner.js";
import { useSpinnerStore } from "../components/Spinner/spinnerStatus.js";
import { createTaskFramework } from "../utils/task/framework.js";
import {
  createEmptyList,
  useInformationalMessageSink,
  ReplBridgeConnector,
} from "./repl/ReplBridgeConnector.js";
import { fieldAccessor } from "../state/sliceHelpers.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import {
  useMainLoopModel as useMainLoopModel_3,
  getMainLoopModelFromState,
} from "../hooks/useMainLoopModel.js";
import { useMergedClients } from "../components/PromptInput/Notifications.js";
import {
  runStartupNotificationSpecs,
  useStartupNotifications,
  STARTUP_NOTIFICATION_SPECS,
} from "../hooks/notifs/startupNotificationSpecs.js";
import { FeatureOfTheWeekClaim } from "../components/FeatureOfTheWeekClaim.js";
import { noopEffect_2 } from "../hooks/notifs/specs/sessionNotices.js";
import { refreshApiCreditLinkStatus } from "../components/LogoV2/ApiCreditLinkNotice.js";
import { ReplSessionScope, runWithQueryParams } from "./repl/ReplSessionScope.js";
import { invalidateUserContext } from "../context.js";
import { isWindowsTerminal } from "../ink/clearTerminal.js";
import { TurnController, useBackgroundQuestionAnswer } from "./repl/TurnController.js";
import { mergeTaskProgressIntoTranscript } from "../services/AgentSummary/agentSummary.js";
import { setTranscriptMessages, transcriptMessagesStore, ReplEffects } from "./repl/ReplEffects.js";
import { useTrustedDeviceEnrolledNotice } from "../hooks/notifs/useNpmDeprecationNotification.js";
import {
  ComposerChrome,
  isExiting,
  useExitCostReport,
  isTerminalInterested,
  getViewedTeammateTask_2,
  useAgentsHintExpiry,
  UnattendedNoticeProvider,
  resolveModalPlacement,
} from "./repl/ComposerChrome.js";
import { uiLogNamespace } from "../components/pluginUi/uiLog.js";
import { TURN_BOUNDARIES_MODULE_EXPORTS } from "../cli/print/resumeTurnBoundaries.js";
import { SandboxNetworkPrompts } from "./repl/SandboxNetworkPrompts.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { SandboxStartup } from "./repl/SandboxStartup.js";
import { DATE_RANGE_ORDER } from "../components/Stats.js";
import { useAwaySummaryController, useAwaySummaryOnce } from "../hooks/useAwaySummary.js";
import { ScrollPin } from "./repl/ScrollPin.js";
import { promptInputStoreFor, setPromptValue } from "../state/promptInputStore.js";
import { hasEarlyInputField, hasTypedEarlyInput, consumeEarlyInput } from "../utils/earlyInput.js";
import { PromptDraft } from "./repl/PromptDraft.js";
import { raisePromptChange } from "../components/pluginUi/promptChangeHook.js";
import { activityManager } from "../utils/activityManager.js";
import { onUserInput } from "../services/api/cacheKeepalive.js";
import { hasPromptSubmitHooks } from "./repl/messageBatching.js";
import { SessionController } from "./repl/SessionController.js";
import { useStartupNotice } from "../hooks/notifs/useStartupNotice.js";
import { useExternalDialogBridge, DialogHost } from "../components/dialogs/DialogHost.js";
import { StartupNudges } from "./repl/StartupNudges.js";
import { useSerialTaskRunner } from "./repl/useSerialTaskRunner.js";
import { useLspRecommendationWatcher } from "../hooks/useLspPluginRecommendation.js";
import { useClaudeCodeHintRecommendation } from "../hooks/useClaudeCodeHintRecommendation.js";
import { LOCAL_JSX_DIALOG, isLocalJsxHoldingQueue } from "../commands/rate-limit-options/index.js";
import {
  useHasOpenDialog,
  useHasBlockingDialog,
  useHasModalDialog,
  useHasModalUserDialog,
  hasAutoDialogWithoutMeta,
} from "../components/dialogs/registry.js";
import { TerminalTitleController } from "./repl/TerminalTitle.js";
import { LayoutOverflow } from "../ink/layout/node.js";
import { ULTRAPLAN_CHOICE_DIALOG_SPEC } from "../commands/ultraplan.js";
import { isElicitationDialogKind as isElicitationDialogKind_2 } from "../services/mcp/elicitationDialogs.js";
import { isElicitationDialogKind } from "../components/dialogs/dialogKinds.js";
import { openRewindSelector } from "../components/MessageSelector.js";
import { IdleReturnHint, isRateLimitRejected } from "./repl/idleReturn.js";
import { hasLoopTask } from "../utils/loop/loopWakeups.js";
import { isQuotaAutoResumeArmed, onQuotaResumeEvent } from "../services/quotaAutoResume/quotaAutoResume.js";
import { hasAwaitableAgentTasks } from "../tasks/taskStatus.js";
import { notifyAsync } from "../utils/terminalProbe.js";
import { isPollEventIngressActive } from "../utils/pollEvents.js";
import { PollEventIdleDelivery, QueuedSendNowController } from "./repl/promptQueue.js";
import { onLowPriorityEvent } from "../services/lowPriority/lowPriorityMode.js";
import { onResetFlowEvent } from "../services/rateLimit/rateLimitWall.js";
import { onUsageCreditEvent } from "../services/usageCreditOffers.js";
import { BackgroundGesture } from "./repl/BackgroundGesture.js";
import { resetTransientUiState } from "./repl/sessionRehydration.js";
import { useRemoteTransport } from "../remote/RemoteTransport.js";
import {
  ColdCacheWatcher,
  isColdCacheWatchEnabled,
  useIdleReturnTypeThrough,
} from "./repl/ColdCacheWatcher.js";
import { promptCacheExpiresAt } from "../services/compact/autoCompact.js";
import { useScreenReaderBell } from "../hooks/useScreenReaderBell.js";
import { useViewedAgentTranscript } from "./repl/useViewedAgentTranscript.js";
import { hasVisibleProgress, InlineProgressList } from "./repl/InlineProgressList.js";
import { useBackgroundAskEmitter, useSemanticPromptMarks } from "./repl/sessionPresence.js";
import { useBridgeImmediateCommands } from "../bridge/replBridgeInbound.js";
import { useIDEIntegration } from "../hooks/useIDEIntegration.js";
import { PromptSubmitController, isCompactCommand } from "./repl/PromptSubmitController.js";
import { COLD_RESUME_QUOTA, AUTOCOMPACT_OFFER } from "../components/nudges/nudgeIds.js";
import { PromptArea, PromptDock } from "./repl/PromptArea.js";
import { useCanUseToolReexport } from "../components/UsageLimitGraceNotice.js";
import { useSessionBackgrounding } from "../hooks/useSessionBackgrounding.js";
import { useLeftArrowGesture } from "../components/PromptInput/promptInputState.js";
import { registerBeforeInteractiveShutdown } from "../utils/gracefulShutdown.js";
import { relaunchForExit } from "../utils/processRelaunch.js";
import { useLogMessages } from "../hooks/useLogMessages.js";
import { resolveCommandDialog } from "../commands/dialogs.js";
import { useQueueProcessor } from "../hooks/useQueueProcessor.js";
import { useEffectSlots } from "../hooks/useTextInputShared.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { useInboxPollerHook } from "../hooks/useInboxPoller.js";
import { useMailboxBridge } from "../hooks/useMailboxBridge.js";
import { useUsageLimitNotices } from "../hooks/notifs/useUsageLimitNotices.js";
import { MCPConnectionManager } from "../services/mcp/MCPConnectionManager.js";
import { BRIDGE_PLACED_KEYS_CONTEXT } from "../bridge/inboundMessages.js";
import { toastRegionWidth, ToastStackViewNamespace } from "../components/pluginUi/ToastStackView.js";
import { useTerminalViewportNamespace } from "../hooks/useTerminalViewport.js";
import { TranscriptView } from "./repl/TranscriptView.js";
import { KeybindingRoot } from "../keybindings/KeybindingProviderSetup.js";
import { noticeQueueStore } from "../components/StatusNotices.js";
import { ReplScreenFrame } from "./repl/ReplScreenFrame.js";
import { UnattendedAutoBlockNotice } from "../components/permissions/UnattendedAutoBlockNotice.js";
import { GlobalKeybindingHandlers } from "../hooks/useGlobalKeybindings.js";
import { MessageScrollHandler, MessageArea } from "./repl/MessageArea.js";
import { SentryErrorBoundary } from "../components/SentryErrorBoundary.js";
import { PendingTaskUpdatesNote } from "../components/SessionHeader.js";
import { ExpandedTaskList } from "../components/TaskListV2.js";
import { WorkerPendingPermissions } from "./repl/WorkerPendingPermissions.js";
import { runExitInterstitial } from "./repl/exitFlow.js";

//@ chunk-18hwfzwa.js:136066-136070 placement
init_react_production();
//@ chunk-18hwfzwa.js:136342-136374 placement
function isNonEmptyString(co) {
  return co !== "";
}
//@ chunk-18hwfzwa.js:136374-136401 placement
function negateBoolean(ls) {
  return !ls;
}
//@ chunk-18hwfzwa.js:136401-136428 placement
function notB(Ms) {
  return !Ms;
}
//@ chunk-18hwfzwa.js:136428-136451 layout
var VERBOSE_LABEL = "verbose ";
var FOOTER_PADDING = 2;
//@ chunk-18hwfzwa.js:136451-138080 fingerprint = TranscriptModeFooter (0.696)
/**
 * transcript 模式（ctrl+o）底部页脚：显示 "Showing detailed transcript"、切换快捷键、滚动/打开编辑器提示或搜索计数；宽度不足时退化为 "? for shortcuts"。
 */
function TranscriptModeFooter(props) {
  let $ = w(17);
  let { showAllInTranscript, virtualScroll, searchBadge, suppressShowAll, status } = props;
  let Re = suppressShowAll === undefined ? false : suppressShowAll;
  let toggleShortcut = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let showAllShortcut = useShortcutDisplay_2("transcript:toggleShowAll", "Transcript", "ctrl+e");
  let hasOpenDialog = useHasOpenDialog_2();
  let { columns } = useTerminalSize();
  let rt;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    rt = getShortEditorName();
    $[0] = rt;
  } else rt = $[0];
  let kt = rt;
  let At = kt ? `open in ${kt}` : "open in editor";
  let It = `${figures_default.arrowUp}${figures_default.arrowDown} scroll \xB7 v to ${At} \xB7 ? for shortcuts`;
  let Et =
    FOOTER_PADDING +
      bunStringWidth(
        [
          hasOpenDialog ? "dialog waiting" : "",
          "Showing detailed transcript",
          `${toggleShortcut} to toggle`,
          It,
        ]
          .filter(isNonEmptyString)
          .join(" \xB7 "),
      ) +
      bunStringWidth(status ? `${status} ` : VERBOSE_LABEL) <
    columns
      ? It
      : "? for shortcuts";
  let Dt;
  if ($[1] !== hasOpenDialog) {
    Dt =
      hasOpenDialog &&
      jsxProd_default(Text, {
        color: "permission",
        children: "dialog waiting",
      });
    $[1] = hasOpenDialog;
    $[2] = Dt;
  } else Dt = $[2];
  let Lt;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    Lt = jsxProd_default(Fragment, {
      children: "Showing detailed transcript",
    });
    $[3] = Lt;
  } else Lt = $[3];
  let oo;
  if ($[4] !== toggleShortcut) {
    oo = jsxProd_default_2(Fragment, {
      children: [toggleShortcut, " to toggle"],
    });
    $[4] = toggleShortcut;
    $[5] = oo;
  } else oo = $[5];
  const Xt = searchBadge
    ? "n/N to navigate"
    : virtualScroll
      ? Et
      : Re
        ? `v to ${At}`
        : `${showAllShortcut} to ${showAllInTranscript ? "collapse" : "show all"}`;
  let io;
  if ($[6] !== Dt || $[7] !== oo || $[8] !== Xt) {
    io = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: jsxProd_default_2(Byline, {
        children: [Dt, Lt, oo, Xt],
      }),
    });
    $[6] = Dt;
    $[7] = oo;
    $[8] = Xt;
    $[9] = io;
  } else io = $[9];
  let so;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    so = jsxProd_default(Box, {
      flexGrow: 1,
    });
    $[10] = so;
  } else so = $[10];
  let po;
  if ($[11] !== searchBadge || $[12] !== status) {
    po = jsxProd_default(TranscriptFooterStatus, {
      status,
      searchBadge,
    });
    $[11] = searchBadge;
    $[12] = status;
    $[13] = po;
  } else po = $[13];
  let ao;
  if ($[14] !== io || $[15] !== po) {
    ao = jsxProd_default_2(Box, {
      noSelect: true,
      alignItems: "center",
      alignSelf: "center",
      borderTopDimColor: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      borderStyle: "single",
      marginTop: 1,
      paddingLeft: FOOTER_PADDING,
      width: "100%",
      children: [io, so, po],
    });
    $[14] = io;
    $[15] = po;
    $[16] = ao;
  } else ao = $[16];
  return ao;
}
//@ chunk-18hwfzwa.js:138080-138476 layout
function TranscriptFooterStatus(props) {
  let $ = w(6);
  let { status, searchBadge } = props;
  if (status) {
    let ee;
    if ($[0] !== status) {
      ee = jsxProd_default_2(Text, {
        children: [status, " "],
      });
      $[0] = status;
      $[1] = ee;
    } else ee = $[1];
    return ee;
  }
  if (searchBadge) {
    let ee;
    if ($[2] !== searchBadge.count || $[3] !== searchBadge.current) {
      ee = jsxProd_default_2(Text, {
        dimColor: true,
        children: [searchBadge.current, "/", searchBadge.count, "  "],
      });
      $[2] = searchBadge.count;
      $[3] = searchBadge.current;
      $[4] = ee;
    } else ee = $[4];
    return ee;
  }
  let ee;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    ee = jsxProd_default(Text, {
      dimColor: true,
      children: VERBOSE_LABEL,
    });
    $[5] = ee;
  } else ee = $[5];
  return ee;
}
//@ chunk-18hwfzwa.js:138476-138802 layout
function SearchIndexStatus({ indexStatus, count, current: D, query }) {
  if (indexStatus === "building")
    return jsxProd_default(Text, {
      dimColor: true,
      children: "indexing\u2026 ",
    });
  if (indexStatus)
    return jsxProd_default_2(Text, {
      dimColor: true,
      children: ["indexed in ", indexStatus.ms, "ms "],
    });
  if (count === 0 && query)
    return jsxProd_default(Text, {
      color: "error",
      children: "no matches ",
    });
  if (count > 0)
    return jsxProd_default_2(Text, {
      dimColor: true,
      children: [D, "/", count, "  "],
    });
  return null;
}
//@ chunk-18hwfzwa.js:138802-140845 layout
/**
 * transcript 模式按 ? 显示的快捷键帮助页脚（滚动、搜索、打印到 scrollback、用编辑器打开、退出）。
 */
function TranscriptHelpFooter() {
  let $ = w(23);
  let shortcutDisplay = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let shortcutDisplay_2 = useShortcutDisplay_2("transcript:exit", "Transcript", "q");
  let L;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    L = getShortEditorName();
    $[0] = L;
  } else L = $[0];
  let ee = L;
  let ke;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    ke = jsxProd_default_2(Text, {
      dimColor: true,
      children: [`${figures_default.arrowUp}${figures_default.arrowDown} j/k`.padEnd(9), "scroll"],
    });
    $[1] = ke;
  } else ke = $[1];
  let Re;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Re = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["ctrl+u/d".padEnd(9), "half page"],
    });
    $[2] = Re;
  } else Re = $[2];
  let Be;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    Be = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["space b".padEnd(9), "page"],
    });
    $[3] = Be;
  } else Be = $[3];
  let He;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    He = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["g/G".padEnd(9), "top/bottom"],
    });
    $[4] = He;
  } else He = $[4];
  let We;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    We = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        ke,
        Re,
        Be,
        He,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["{/}".padEnd(9), "prev/next prompt"],
        }),
      ],
    });
    $[5] = We;
  } else We = $[5];
  let ze;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    ze = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["/".padEnd(5), "search"],
    });
    $[6] = ze;
  } else ze = $[6];
  let Xe;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Xe = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["n/N".padEnd(5), "next/prev match"],
    });
    $[7] = Xe;
  } else Xe = $[7];
  let rt;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    rt = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["[".padEnd(5), "print to scrollback"],
    });
    $[8] = rt;
  } else rt = $[8];
  let kt;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    kt = "v".padEnd(5);
    $[9] = kt;
  } else kt = $[9];
  let At;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    At = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        ze,
        Xe,
        rt,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [kt, "open in ", ee ?? "editor"],
        }),
      ],
    });
    $[10] = At;
  } else At = $[10];
  let It;
  if ($[11] !== shortcutDisplay) {
    It = shortcutDisplay.padEnd(7);
    $[11] = shortcutDisplay;
    $[12] = It;
  } else It = $[12];
  let Ot;
  if ($[13] !== It) {
    Ot = jsxProd_default_2(Text, {
      dimColor: true,
      children: [It, "toggle transcript"],
    });
    $[13] = It;
    $[14] = Ot;
  } else Ot = $[14];
  let Et;
  if ($[15] !== shortcutDisplay_2) {
    Et = shortcutDisplay_2.padEnd(7);
    $[15] = shortcutDisplay_2;
    $[16] = Et;
  } else Et = $[16];
  let Dt;
  if ($[17] !== Et) {
    Dt = jsxProd_default_2(Text, {
      dimColor: true,
      children: [Et, "exit"],
    });
    $[17] = Et;
    $[18] = Dt;
  } else Dt = $[18];
  let Lt;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    Lt = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["?".padEnd(7), "close help"],
    });
    $[19] = Lt;
  } else Lt = $[19];
  let oo;
  if ($[20] !== Ot || $[21] !== Dt) {
    oo = jsxProd_default_2(Box, {
      noSelect: true,
      borderTopDimColor: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      borderStyle: "single",
      marginTop: 1,
      paddingLeft: 2,
      width: "100%",
      flexDirection: "row",
      gap: 4,
      children: [
        We,
        At,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [Ot, Dt, Lt],
        }),
      ],
    });
    $[20] = Ot;
    $[21] = Dt;
    $[22] = oo;
  } else oo = $[22];
  return oo;
}
//@ chunk-18hwfzwa.js:140845-142030 fingerprint = TranscriptSearchBar (0.76)
/**
 * transcript 搜索栏（/）：useSearchInput 读输入，首次打开时预热搜索索引（indexing… / indexed in Nms），查询变化后调用 jumpRef.setSearchQuery 并高亮。
 */
function TranscriptSearchBar({ jumpRef, count, current: D, onClose, onCancel, setHighlight, initialQuery }) {
  let { query, cursorOffset, handleKeyDown, handlePaste } = useSearchInput({
    isActive: true,
    initialQuery,
    onExit: () => onClose(query),
    onCancel,
  });
  let clock = useClock();
  let [indexStatus, setIndexStatus] = y("building");
  P(() => {
    let alive = true;
    let warm = jumpRef.current?.warmSearchIndex;
    if (!warm) {
      setIndexStatus(null);
      return;
    }
    setIndexStatus("building");
    warm().then((ms) => {
      if (!alive) return;
      if (ms < 20) setIndexStatus(null);
      else {
        setIndexStatus({
          ms,
        });
        clock.setTimeout(() => alive && setIndexStatus(null), 2000);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  let warmDone = indexStatus !== "building";
  P(() => {
    if (!warmDone) return;
    jumpRef.current?.setSearchQuery(query);
    setHighlight(query);
  }, [query, warmDone]);
  let off = cursorOffset;
  let cursorChar = off < query.length ? query[off] : " ";
  let Et = Q(isNativeCursorEnabled, []);
  let Dt = env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT && env.CLAUDE_CODE_SESSION_KIND !== "bg";
  let inverse = !(Et && !Dt);
  let ref = useDeclaredCursor({
    line: 0,
    column: 0,
    active: true,
    visible: !Dt,
  });
  return jsxProd_default_2(Box, {
    borderTopDimColor: true,
    borderBottom: false,
    borderLeft: false,
    borderRight: false,
    borderStyle: "single",
    marginTop: 1,
    paddingLeft: 2,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
    width: "100%",
    noSelect: true,
    children: [
      jsxProd_default(Text, {
        children: "/",
      }),
      jsxProd_default(Text, {
        children: query.slice(0, off),
      }),
      jsxProd_default(Box, {
        ref,
        flexShrink: 0,
        children: jsxProd_default(Text, {
          inverse,
          children: cursorChar,
        }),
      }),
      off < query.length &&
        jsxProd_default(Text, {
          children: query.slice(off + 1),
        }),
      jsxProd_default(Box, {
        flexGrow: 1,
      }),
      SearchIndexStatus({
        indexStatus,
        count,
        current: D,
        query,
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:1087735-1087772 sole-consumer
function selectTurnLoadingRepl(hn) {
  return hn.isLoading;
}
//@ chunk-18hwfzwa.js:1087772-1087809 sole-consumer
function selectTurnIsLoadingB(Bo) {
  return Bo.isLoading;
}
//@ chunk-18hwfzwa.js:1087809-1087852 sole-consumer
function selectInputOwnsEscapeReplB(Ro) {
  return Ro.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:1087852-1087898 sole-consumer
function selectInputRowReplaced(Ho) {
  return Ho.isInputRowReplaced;
}
//@ chunk-18hwfzwa.js:1087898-1088121 sole-consumer
var CLOSED_FRUSTRATION_SURVEY = {
  state: "closed",
  transcriptBundlePath: null,
  handleTranscriptSelect: () => {},
};
var useFrustrationSurveyStub = () => CLOSED_FRUSTRATION_SURVEY;
var NullBand = () => null;
var SURVEY_SLOT_KEYS = {
  postCompact: true,
  longContext: true,
  plugin: true,
  memory: true,
  feedback: true,
  orgSurvey: true,
  frustration: true,
};
var SURVEY_KINDS = Object.keys(SURVEY_SLOT_KEYS);
//@ chunk-18hwfzwa.js:1088121-1088308 sole-consumer
class SurveySlotStore {
  #e = createSignal();
  #t = null;
  subscribe = (h) => this.#e.subscribe(h);
  getSnapshot = () => this.#t;
  publish(h) {
    let x = this.#t;
    if (x !== null && SURVEY_KINDS.every((D) => shallowEqualObject(x[D], h[D]))) return;
    this.#t = h;
    this.#e.emit();
  }
}
//@ chunk-18hwfzwa.js:1088308-1088547 sole-consumer
function hasActiveSurvey(storeSelector) {
  return (
    storeSelector !== null &&
    pickActiveSurvey({
      postCompact: storeSelector.postCompact.state,
      longContext: storeSelector.longContext.state,
      plugin: storeSelector.plugin.state,
      memory: storeSelector.memory.state,
      feedback: storeSelector.feedback.state,
      orgSurvey: storeSelector.orgSurvey.state,
      frustration: storeSelector.frustration.state,
    }) !== null
  );
}
//@ chunk-18hwfzwa.js:1088547-1088662 sole-consumer
function shallowEqualObject(h, x) {
  let keys = Object.keys(h);
  return keys.length === Object.keys(x).length && keys.every((L) => Object.is(h[L], x[L]));
}
//@ chunk-18hwfzwa.js:1088662-1091274 sole-consumer
/**
 * 在 REPL 中依次运行各问卷 hook（压缩后、长上下文、插件、记忆、反馈、组织、挫败检测），后者在前者打开时让位，并把全部状态发布到 SurveySlotStore。
 */
function SurveyStatePublisher(props) {
  let We = w(48);
  let { turn, transcript, isRemoteSession, slot, localJsx } = props;
  let messages = useStoreSelector(transcript);
  let isLoading = useStoreSelector(turn, selectTurnLoadingRepl);
  let hasActivePrompt = useHasAutoDialog();
  let ze;
  if (We[0] !== transcript) {
    ze = () => new AssistantTokenCounter(transcript);
    We[0] = transcript;
    We[1] = ze;
  } else ze = We[1];
  let [Xe] = y(ze);
  let cumulativeSessionTokens = useStoreSelector(Xe);
  let kt;
  let At;
  if (We[2] !== Xe) {
    kt = () => () => Xe.dispose();
    At = [Xe];
    We[2] = Xe;
    We[3] = kt;
    We[4] = At;
  } else {
    kt = We[3];
    At = We[4];
  }
  P(kt, At);
  const enabled = !isRemoteSession;
  let Ot;
  if (We[5] !== enabled) {
    Ot = {
      enabled,
    };
    We[5] = enabled;
    We[6] = Ot;
  } else Ot = We[6];
  let postCompactSurvey = usePostCompactSurvey(messages, isLoading, hasActivePrompt, Ot);
  const enabled_2 = !isRemoteSession;
  const otherSurveyActive = postCompactSurvey.state !== "closed";
  let props_2;
  if (
    We[7] !== cumulativeSessionTokens ||
    We[8] !== hasActivePrompt ||
    We[9] !== enabled_2 ||
    We[10] !== otherSurveyActive ||
    We[11] !== transcript ||
    We[12] !== turn
  ) {
    props_2 = {
      cumulativeSessionTokens,
      turn,
      transcript,
      hasActivePrompt,
      enabled: enabled_2,
      otherSurveyActive,
    };
    We[7] = cumulativeSessionTokens;
    We[8] = hasActivePrompt;
    We[9] = enabled_2;
    We[10] = otherSurveyActive;
    We[11] = transcript;
    We[12] = turn;
    We[13] = props_2;
  } else props_2 = We[13];
  let longContextSurvey = useLongContextSurvey(props_2);
  const enabled_3 = !isRemoteSession;
  const otherSurveyActive_2 = postCompactSurvey.state !== "closed" || longContextSurvey.state !== "closed";
  let po;
  if (
    We[14] !== hasActivePrompt ||
    We[15] !== otherSurveyActive_2 ||
    We[16] !== enabled_3 ||
    We[17] !== turn
  ) {
    po = {
      turn,
      hasActivePrompt,
      enabled: enabled_3,
      otherSurveyActive: otherSurveyActive_2,
    };
    We[14] = hasActivePrompt;
    We[15] = otherSurveyActive_2;
    We[16] = enabled_3;
    We[17] = turn;
    We[18] = po;
  } else po = We[18];
  let pluginFeedbackSurvey = usePluginFeedbackSurvey(po);
  const enabled_4 = !isRemoteSession;
  const otherSurveyActive_3 =
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed";
  let Ao;
  if (We[19] !== enabled_4 || We[20] !== otherSurveyActive_3) {
    Ao = {
      enabled: enabled_4,
      otherSurveyActive: otherSurveyActive_3,
    };
    We[19] = enabled_4;
    We[20] = otherSurveyActive_3;
    We[21] = Ao;
  } else Ao = We[21];
  let memorySurvey = useMemorySurvey(messages, isLoading, hasActivePrompt, Ao);
  const otherSurveyActive_4 =
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed" ||
    memorySurvey.state !== "closed";
  let Ho;
  if (We[22] !== otherSurveyActive_4 || We[23] !== transcript || We[24] !== turn) {
    Ho = {
      turn,
      transcript,
      otherSurveyActive: otherSurveyActive_4,
    };
    We[22] = otherSurveyActive_4;
    We[23] = transcript;
    We[24] = turn;
    We[25] = Ho;
  } else Ho = We[25];
  let feedbackSurvey = useFeedbackSurvey(Ho);
  const enabled_5 = !isRemoteSession;
  const otherSurveyActive_5 =
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed" ||
    memorySurvey.state !== "closed" ||
    feedbackSurvey.state !== "closed";
  let props_3;
  if (
    We[26] !== hasActivePrompt ||
    We[27] !== localJsx ||
    We[28] !== messages ||
    We[29] !== enabled_5 ||
    We[30] !== otherSurveyActive_5 ||
    We[31] !== turn
  ) {
    props_3 = {
      turn,
      messages,
      localJsx,
      hasActivePrompt,
      enabled: enabled_5,
      otherSurveyActive: otherSurveyActive_5,
    };
    We[26] = hasActivePrompt;
    We[27] = localJsx;
    We[28] = messages;
    We[29] = enabled_5;
    We[30] = otherSurveyActive_5;
    We[31] = turn;
    We[32] = props_3;
  } else props_3 = We[32];
  let orgSurvey = useOrgSurvey(props_3);
  const otherSurveyActive_6 =
    feedbackSurvey.state !== "closed" ||
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed" ||
    memorySurvey.state !== "closed" ||
    orgSurvey.state !== "closed";
  let Yo;
  if (
    We[33] !== hasActivePrompt ||
    We[34] !== otherSurveyActive_6 ||
    We[35] !== transcript ||
    We[36] !== turn
  ) {
    Yo = {
      turn,
      transcript,
      hasActivePrompt,
      otherSurveyActive: otherSurveyActive_6,
    };
    We[33] = hasActivePrompt;
    We[34] = otherSurveyActive_6;
    We[35] = transcript;
    We[36] = turn;
    We[37] = Yo;
  } else Yo = We[37];
  let frustration = useFrustrationSurveyStub(Yo);
  let Fn = Se(SpinnerPaceContext);
  let bn;
  if (
    We[38] !== feedbackSurvey ||
    We[39] !== frustration ||
    We[40] !== longContextSurvey ||
    We[41] !== memorySurvey ||
    We[42] !== Fn ||
    We[43] !== orgSurvey ||
    We[44] !== pluginFeedbackSurvey ||
    We[45] !== postCompactSurvey ||
    We[46] !== slot
  ) {
    bn = () => {
      let Go = () =>
        slot.publish({
          postCompact: postCompactSurvey,
          longContext: longContextSurvey,
          plugin: pluginFeedbackSurvey,
          memory: memorySurvey,
          feedback: feedbackSurvey,
          orgSurvey,
          frustration,
        });
      if (Fn) Fn.deferred(Go);
      else Go();
    };
    We[38] = feedbackSurvey;
    We[39] = frustration;
    We[40] = longContextSurvey;
    We[41] = memorySurvey;
    We[42] = Fn;
    We[43] = orgSurvey;
    We[44] = pluginFeedbackSurvey;
    We[45] = postCompactSurvey;
    We[46] = slot;
    We[47] = bn;
  } else bn = We[47];
  zt(bn);
  return null;
}
//@ chunk-18hwfzwa.js:1091274-1093560 sole-consumer
/**
 * 输入框上方的提示带：有问卷时显示 SurveyHost，另有上方提示位、反馈草稿提示、web-setup 提示等，彼此通过 bandHeld 互斥。
 */
function AbovePromptBands(props) {
  let Ot = w(39);
  let { slot, turn, transcript, draft, submit } = props;
  let storeSelector = useStoreSelector(slot);
  let storeSelector_2 = useStoreSelector(turn, selectTurnIsLoadingB);
  let [He, We] = y(false);
  let [ze, Xe] = y(false);
  let [rt, kt] = y(false);
  let promptOwnsEscape = useStoreSelector(draft, selectInputOwnsEscapeReplB);
  let inputRowReplaced = useStoreSelector(draft, selectInputRowReplaced);
  let Et;
  if (Ot[0] !== storeSelector) {
    Et = storeSelector !== null && hasActiveSurvey(storeSelector);
    Ot[0] = storeSelector;
    Ot[1] = Et;
  } else Et = Ot[1];
  let Dt = Et;
  let Lt = Dt || He || ze;
  let oo;
  if (
    Ot[2] !== draft.replaceValue ||
    Ot[3] !== inputRowReplaced ||
    Ot[4] !== submit.submitSurveyFollowUp ||
    Ot[5] !== Dt ||
    Ot[6] !== storeSelector
  ) {
    oo =
      Dt &&
      jsxProd_default(SurveyHost, {
        postCompactSurvey: storeSelector.postCompact,
        longContextSurvey: storeSelector.longContext,
        pluginSurvey: storeSelector.plugin,
        memorySurvey: storeSelector.memory,
        feedbackSurvey: storeSelector.feedback,
        frustrationDetection: storeSelector.frustration,
        orgSurvey: storeSelector.orgSurvey,
        setInputValue: draft.replaceValue,
        inputRowReplaced,
        handleSurveyRequestFeedback: submit.submitSurveyFollowUp,
      });
    Ot[2] = draft.replaceValue;
    Ot[3] = inputRowReplaced;
    Ot[4] = submit.submitSurveyFollowUp;
    Ot[5] = Dt;
    Ot[6] = storeSelector;
    Ot[7] = oo;
  } else oo = Ot[7];
  let Xt;
  if (Ot[8] !== draft.replaceValue || Ot[9] !== storeSelector_2 || Ot[10] !== Dt) {
    Xt = jsxProd_default(AbovePromptBandNamespace.AbovePromptSite, {
      survey: Dt,
      working: storeSelector_2,
      setInputValue: draft.replaceValue,
      onHoldsBandChange: We,
    });
    Ot[8] = draft.replaceValue;
    Ot[9] = storeSelector_2;
    Ot[10] = Dt;
    Ot[11] = Xt;
  } else Xt = Ot[11];
  let onOpenFeedback;
  if (Ot[12] !== submit) {
    onOpenFeedback = () => submit.submitSurveyFollowUp("/feedback");
    Ot[12] = submit;
    Ot[13] = onOpenFeedback;
  } else onOpenFeedback = Ot[13];
  let so;
  if (
    Ot[14] !== draft.replaceValue ||
    Ot[15] !== storeSelector_2 ||
    Ot[16] !== Dt ||
    Ot[17] !== onOpenFeedback
  ) {
    so = jsxProd_default(FeedbackDraftNotice, {
      isLoading: storeSelector_2,
      surveyActive: Dt,
      setInputValue: draft.replaceValue,
      onOpenFeedback,
      onHoldsBandChange: Xe,
    });
    Ot[14] = draft.replaceValue;
    Ot[15] = storeSelector_2;
    Ot[16] = Dt;
    Ot[17] = onOpenFeedback;
    Ot[18] = so;
  } else so = Ot[18];
  const bandHeld = Lt || rt;
  let onRunWebSetup;
  if (Ot[19] !== submit) {
    onRunWebSetup = () => {
      submit
        .submit("/web-setup", NOOP_HELPERS, {
          inputModeOverride: "prompt",
          leavesIdeSelection: true,
        })
        .catch(logError);
    };
    Ot[19] = submit;
    Ot[20] = onRunWebSetup;
  } else onRunWebSetup = Ot[20];
  let co;
  if (
    Ot[21] !== draft.replaceValue ||
    Ot[22] !== storeSelector_2 ||
    Ot[23] !== bandHeld ||
    Ot[24] !== onRunWebSetup ||
    Ot[25] !== transcript
  ) {
    co = jsxProd_default(WebSetupPromptGate, {
      isLoading: storeSelector_2,
      bandHeld,
      transcript,
      setInputValue: draft.replaceValue,
      onRunWebSetup,
    });
    Ot[21] = draft.replaceValue;
    Ot[22] = storeSelector_2;
    Ot[23] = bandHeld;
    Ot[24] = onRunWebSetup;
    Ot[25] = transcript;
    Ot[26] = co;
  } else co = Ot[26];
  let bo;
  if (
    Ot[27] !== draft.replaceValue ||
    Ot[28] !== Lt ||
    Ot[29] !== promptOwnsEscape ||
    Ot[30] !== transcript ||
    Ot[31] !== turn
  ) {
    bo = jsxProd_default(NullBand, {
      turn,
      transcript,
      bandHeld: Lt,
      promptOwnsEscape,
      setInputValue: draft.replaceValue,
      onHoldsBandChange: kt,
    });
    Ot[27] = draft.replaceValue;
    Ot[28] = Lt;
    Ot[29] = promptOwnsEscape;
    Ot[30] = transcript;
    Ot[31] = turn;
    Ot[32] = bo;
  } else bo = Ot[32];
  let Ao;
  if (Ot[33] !== oo || Ot[34] !== Xt || Ot[35] !== so || Ot[36] !== co || Ot[37] !== bo) {
    Ao = jsxProd_default_2(Fragment, {
      children: [oo, Xt, so, co, bo],
    });
    Ot[33] = oo;
    Ot[34] = Xt;
    Ot[35] = so;
    Ot[36] = co;
    Ot[37] = bo;
    Ot[38] = Ao;
  } else Ao = Ot[38];
  return Ao;
}
//@ chunk-18hwfzwa.js:1093560-1093597 sole-consumer
function selectTurnIsLoadingC(rt) {
  return rt.isLoading;
}
//@ chunk-18hwfzwa.js:1093597-1093640 sole-consumer
function selectInputOwnsEscapeB(kt) {
  return kt.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:1093640-1093677 sole-consumer
function selectTurnIsLoadingD(At) {
  return At.isLoading;
}
//@ chunk-18hwfzwa.js:1093677-1094188 sole-consumer
/**
 * REPL 中内嵌面板与调查问卷区域的组件。
 */
function InlinePanesAndBands(props) {
  let $ = w(10);
  let { turn, transcript, draft, submitController, surveySlot, visible, panesDocked } = props;
  let isWorking = useStoreSelector(turn, selectTurnIsLoadingC);
  let promptOwnsEscape = useStoreSelector(draft, selectInputOwnsEscapeB);
  let element;
  if (
    $[0] !== draft ||
    $[1] !== isWorking ||
    $[2] !== panesDocked ||
    $[3] !== promptOwnsEscape ||
    $[4] !== submitController ||
    $[5] !== surveySlot ||
    $[6] !== transcript ||
    $[7] !== turn ||
    $[8] !== visible
  ) {
    element = visible
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(PaneDockNamespace.InlinePanes, {
              working: isWorking,
              promptOwnsEscape,
              docked: panesDocked,
            }),
            jsxProd_default(AbovePromptBands, {
              slot: surveySlot,
              turn,
              transcript,
              draft,
              submit: submitController,
            }),
          ],
        })
      : null;
    $[0] = draft;
    $[1] = isWorking;
    $[2] = panesDocked;
    $[3] = promptOwnsEscape;
    $[4] = submitController;
    $[5] = surveySlot;
    $[6] = transcript;
    $[7] = turn;
    $[8] = visible;
    $[9] = element;
  } else element = $[9];
  return element;
}
//@ chunk-18hwfzwa.js:1094188-1094819 placement
/**
 * REPL 提示区组件，附带后台会话提示。
 */
function PromptAreaWithBackgroundHint(props) {
  let $ = w(13);
  let { turn, transcript, scope, draft, chrome, gesture, submitController, visible, onBackgroundSession } =
    props;
  let isLoading = useStoreSelector(turn, selectTurnIsLoadingD);
  let content;
  if (
    $[0] !== chrome ||
    $[1] !== draft ||
    $[2] !== gesture ||
    $[3] !== isLoading ||
    $[4] !== onBackgroundSession ||
    $[5] !== scope ||
    $[6] !== submitController ||
    $[7] !== transcript ||
    $[8] !== turn ||
    $[9] !== visible
  ) {
    content =
      visible &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(PromptComposerMemo, {
            turn,
            transcript,
            scope,
            draft,
            chrome,
            gesture,
            submit: submitController,
          }),
          jsxProd_default(SessionBackgroundHint, {
            onBackgroundSession,
            isLoading,
          }),
        ],
      });
    $[0] = chrome;
    $[1] = draft;
    $[2] = gesture;
    $[3] = isLoading;
    $[4] = onBackgroundSession;
    $[5] = scope;
    $[6] = submitController;
    $[7] = transcript;
    $[8] = turn;
    $[9] = visible;
    $[10] = content;
  } else content = $[10];
  let element;
  if ($[11] !== content) {
    element = jsxProd_default_2(Fragment, {
      children: [content, false],
    });
    $[11] = content;
    $[12] = element;
  } else element = $[12];
  return element;
}
//@ chunk-18hwfzwa.js:1425895-1425936 sole-consumer
function selectTerminalTitle(kt) {
  return kt.terminalTitle;
}
//@ chunk-18hwfzwa.js:1425936-1425972 affinity
function selectTitleDisabled(At) {
  return At.disabled;
}
//@ chunk-18hwfzwa.js:1425972-1426012 file-local
function nextTitleFrame(f) {
  return (f + 1) % TITLE_SPINNER_FRAMES.length;
}
//@ chunk-18hwfzwa.js:1426012-1426059 layout
var TITLE_SPINNER_FRAMES = ["\u25D0", "\u25D1"];
var TITLE_IDLE_PREFIX = "\u2733";
var TITLE_FRAME_INTERVAL_MS = 960;
//@ chunk-18hwfzwa.js:1426059-1426386 fingerprint = AnimatedTerminalTitle (0.545)
/**
 * 终端标题组件：从 titles 存储取标题，工作中且终端聚焦时以 960ms 交替 ◐/◑ 前缀，否则 ✳；在 tmux 等复用器下受 tengu_static_title_under_mux 控制改为静态。
 */
function AnimatedTerminalTitle(props) {
  let $ = w(1);
  let { titles, isAnimating, noPrefix } = props;
  let terminalTitle = useStoreSelector(titles, selectTerminalTitle);
  let disabled = useStoreSelector(titles, selectTitleDisabled);
  let terminalFocused = useTerminalFocus();
  let Be =
    getTerminalMultiplexer() !== null &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_static_title_under_mux", true);
  let [frame, setFrame] = y(0);
  let Xe;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Xe = () => setFrame(nextTitleFrame);
    $[0] = Xe;
  } else Xe = $[0];
  useInterval(
    Xe,
    disabled || noPrefix || Be || !isAnimating || !terminalFocused ? null : TITLE_FRAME_INTERVAL_MS,
  );
  let prefix = isAnimating && !Be ? (TITLE_SPINNER_FRAMES[frame] ?? TITLE_IDLE_PREFIX) : TITLE_IDLE_PREFIX;
  useTerminalTitle(disabled ? null : noPrefix ? terminalTitle : `${prefix} ${terminalTitle}`);
  return null;
}
//@ chunk-18hwfzwa.js:1666058-1666963 placement
/**
 * REPL 消息列表的外部存储：getSnapshot/subscribe 供 useSyncExternalStore；replace/apply/keep 修改列表（可延迟发布），flush 发布延迟的修改并调用 project 回调。
 */
class MessageListStore {
  #e;
  #t;
  #o = false;
  #n;
  #s = createSignal();
  conversation = orderedRowSource({
    keep: (h) =>
      this.keep({
        type: "append",
        messages: [...h],
      }),
    rows: () => this.#e,
    isHookable: true,
  });
  constructor({ initial, project }) {
    this.#e = initial;
    this.#n = project;
  }
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#s.subscribe(h);
  replace = (h, x = false) => {
    let D = this.#e;
    this.#e = typeof h === "function" ? h(D) : h;
    if (x) {
      this.#t ??= D;
      this.#o ||= x !== "held";
      return;
    }
    this.#r(this.#t ?? D);
  };
  apply = (h, x = false) => {
    let D = applyMessageListAppend(h, (ee) => this.keep(ee, x));
    if (D === undefined) {
      this.conversation.behindAppends(() => this.keep(h, x))?.catch(logError);
      return;
    }
    let L = appendRowsWithHooks(this.conversation, D.rows, {
      keep: D.keep,
    });
    if (L instanceof Promise) L.catch(logError);
  };
  keep = (h, x = false) => {
    this.replace((D) => applyMessageListEdit(D, h), x);
  };
  settled = () => this.conversation.settled();
  cut = () => this.conversation.cut();
  getPublished = () => this.#t ?? this.#e;
  flush = () => {
    if (this.#t !== undefined && this.#o) this.#r(this.#t);
  };
  #r(h) {
    this.#t = undefined;
    this.#o = false;
    let x = this.#e;
    this.#n(x, h);
    if (x !== h) this.#s.emit();
  }
}
//@ chunk-18hwfzwa.js:1667001-1667005 placement
init_react_production();
//@ chunk-18hwfzwa.js:1667005-1667009 placement
init_react_production();
//@ chunk-18hwfzwa.js:1822891-1822921 sole-consumer
function selectSessionId(At) {
  return At.id;
}
//@ chunk-18hwfzwa.js:1822921-1822956 sole-consumer
function selectReplTab(Ho) {
  return Ho.replTab;
}
//@ chunk-18hwfzwa.js:1822956-1823013 sole-consumer = _temp (1)
function selectFileHistoryTrackedFilesSize(s) {
  return s.fileHistory.trackedFiles.size;
}
//@ chunk-18hwfzwa.js:1823013-1823084 sole-consumer
function switchReplTabToDiff(Wo) {
  return Wo.replTab === "convo"
    ? {
        ...Wo,
        replTab: "diff",
      }
    : Wo;
}
//@ chunk-18hwfzwa.js:1823084-1823114 sole-consumer
function selectSessionIdB(mn) {
  return mn.id;
}
//@ chunk-18hwfzwa.js:1823114-1823149 sole-consumer
function selectSessionCwd(qu) {
  return getSessionProject(qu).cwd;
}
//@ chunk-18hwfzwa.js:1823149-1823205 sole-consumer
function selectFileHistorySequence(Ku) {
  return Ku.fileHistory.trackSequence ?? 0;
}
//@ chunk-18hwfzwa.js:1823205-1823244 sole-consumer
function selectMainAgentTodos(iu) {
  return iu.todos[mainAgentId()];
}
//@ chunk-18hwfzwa.js:1823244-1823293 sole-consumer
function selectToolPermissionCtxRepl(Iu) {
  return Iu.toolPermissionContext;
}
//@ chunk-18hwfzwa.js:1823293-1823368 sole-consumer
function showDiffPanel(Am) {
  return Am.diffPanelVisible
    ? Am
    : {
        ...Am,
        diffPanelVisible: true,
      };
}
//@ chunk-18hwfzwa.js:1823368-1823443 sole-consumer
function hideDiffPanel(Kp) {
  return Kp.diffPanelVisible
    ? {
        ...Kp,
        diffPanelVisible: false,
      }
    : Kp;
}
//@ chunk-18hwfzwa.js:1823443-1823473 sole-consumer
function createReplayHandleSlot() {
  return new ReplayHandleSlot();
}
//@ chunk-18hwfzwa.js:1823473-1823521 sole-consumer = _temp (1)
function isCompletedStatus(nl) {
  return nl.status === "completed";
}
//@ chunk-18hwfzwa.js:1823521-1823548 sole-consumer
function toggleFalse(ss) {
  return !ss;
}
//@ chunk-18hwfzwa.js:1823548-1823589 sole-consumer
function selectPanelFileViewRepl(Gs) {
  return Gs.panelFileView;
}
//@ chunk-18hwfzwa.js:1823589-1823616 sole-consumer
function toggleFalseB(ma) {
  return !ma;
}
//@ chunk-18hwfzwa.js:1823616-1823643 sole-consumer
function toggleFalseC($a) {
  return !$a;
}
//@ chunk-18hwfzwa.js:1823643-1823704 sole-consumer
function renderDimText(children, Si) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children,
    },
    Si,
  );
}
//@ chunk-18hwfzwa.js:1823704-1823731 sole-consumer
function toggleFalseD(na) {
  return !na;
}
//@ chunk-18hwfzwa.js:1823731-1823758 sole-consumer
function toggleFalseE(js) {
  return !js;
}
//@ chunk-18hwfzwa.js:1823758-1823783 sole-consumer
/**
 * REPL 差异面板的显示限额：最多同时显示 8 个文件、超过 20 个文件折叠提示、加载提示延迟 300 ms 出现。
 */
var MAX_VISIBLE_FILE_DIFFS = 8;
var MAX_DIFF_FILES_BEFORE_HIDING = 20;
var LOADING_HINT_DELAY_MS = 300;
//@ chunk-18hwfzwa.js:1823783-1824383 sole-consumer
/**
 * 记录自动打开 diff 时的基线，关闭时切回对话标签。
 */
function useDiffAutoOpenBaseline(enabled, trackedCount) {
  let ke = w(8);
  let setAppState = useSetAppState();
  useForceRender();
  let session = useSession(selectSessionId);
  let host = useHost();
  let Re;
  if (ke[0] !== enabled || ke[1] !== session) {
    Re = {
      enabled,
      sessionId: session,
      baseline: null,
    };
    ke[0] = enabled;
    ke[1] = session;
    ke[2] = Re;
  } else Re = ke[2];
  let [Be, He] = y(Re);
  let baseline = Be.baseline;
  if (Be.enabled !== enabled) baseline = enabled ? trackedCount : null;
  else if (baseline !== null && trackedCount !== baseline) baseline = null;
  if (Be.sessionId !== session) baseline = null;
  if (Be.enabled !== enabled || Be.sessionId !== session || Be.baseline !== baseline)
    He({
      enabled,
      sessionId: session,
      baseline,
    });
  let enabledRef = R(enabled);
  let Xe;
  let rt;
  if (ke[3] !== enabled || ke[4] !== host || ke[5] !== setAppState) {
    Xe = () => {
      let kt = enabledRef.current;
      enabledRef.current = enabled;
      if (kt && !enabled) switchToConversationTab(host, setAppState);
    };
    rt = [enabled, host, setAppState];
    ke[3] = enabled;
    ke[4] = host;
    ke[5] = setAppState;
    ke[6] = Xe;
    ke[7] = rt;
  } else {
    Xe = ke[6];
    rt = ke[7];
  }
  P(Xe, rt);
  return baseline;
}
//@ chunk-18hwfzwa.js:1824383-1826508 sole-consumer
/**
 * 全屏 REPL 的 diff 侧栏：会话有文件改动且终端够宽时预取工作区 diff 并标记自动打开；注册 app:toggleReplTab 快捷键切换；在 diff 标签页渲染 DiffSidebarPanel。
 */
function DiffSidebar(props) {
  let Ot = w(40);
  let { width, isThinClient, onAskAboutSelection, autoOpenBaseline } = props;
  let ke = autoOpenBaseline === undefined ? null : autoOpenBaseline;
  let appState = useAppState(selectReplTab);
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let { columns } = useTerminalSize();
  let { addNotification } = useNotifications();
  let appState_2 = useAppState(selectFileHistoryTrackedFilesSize);
  let It = Se(clockContext)?.setTimeout ?? defaultSetTimeout;
  let Et;
  if (
    Ot[0] !== ke ||
    Ot[1] !== columns ||
    Ot[2] !== host ||
    Ot[3] !== isThinClient ||
    Ot[4] !== appState ||
    Ot[5] !== It ||
    Ot[6] !== setAppState ||
    Ot[7] !== appStoreDirect ||
    Ot[8] !== appState_2
  ) {
    Et = () => {
      if (appState !== "convo" || appState_2 === 0) {
        return;
      }
      if (ke !== null && appState_2 === ke) {
        return;
      }
      if (!isFullscreenEnvEnabled() || isThinClient) {
        return;
      }
      if (!isDiffSidebarPreferred(columns)) {
        return;
      }
      let abortController = new AbortController();
      let Lt = It(() => {
        prefetchWorkspaceDiff(
          host,
          getDiffBaseMode(),
          appStoreDirect.getState().fileHistory.trackSequence ?? 0,
          abortController.signal,
        )
          .then(() => {
            if (abortController.signal.aborted) {
              return;
            }
            markDiffAutoOpenPending(host);
            setAppState(switchReplTabToDiff);
          })
          .catch(logError);
      }, DIFF_MIN_REFRESH_MS);
      return () => {
        Lt();
        abortController.abort();
      };
    };
    Ot[0] = ke;
    Ot[1] = columns;
    Ot[2] = host;
    Ot[3] = isThinClient;
    Ot[4] = appState;
    Ot[5] = It;
    Ot[6] = setAppState;
    Ot[7] = appStoreDirect;
    Ot[8] = appState_2;
    Ot[9] = Et;
  } else Et = Ot[9];
  let oo;
  if (
    Ot[10] !== ke ||
    Ot[11] !== host ||
    Ot[12] !== isThinClient ||
    Ot[13] !== appState ||
    Ot[14] !== It ||
    Ot[15] !== setAppState ||
    Ot[16] !== appStoreDirect ||
    Ot[17] !== appState_2
  ) {
    oo = [appState, appState_2, ke, isThinClient, setAppState, host, It, appStoreDirect];
    Ot[10] = ke;
    Ot[11] = host;
    Ot[12] = isThinClient;
    Ot[13] = appState;
    Ot[14] = It;
    Ot[15] = setAppState;
    Ot[16] = appStoreDirect;
    Ot[17] = appState_2;
    Ot[18] = oo;
  } else oo = Ot[18];
  P(Et, oo);
  let Xt;
  if (
    Ot[19] !== addNotification ||
    Ot[20] !== columns ||
    Ot[21] !== host ||
    Ot[22] !== setAppState ||
    Ot[23] !== storageV5 ||
    Ot[24] !== appStoreDirect
  ) {
    Xt = () => {
      let io = toggleDiffPanel({
        host,
        getReplTab: () => appStoreDirect.getState().replTab,
        setAppState,
        columns,
        trackSequence: appStoreDirect.getState().fileHistory.trackSequence ?? 0,
        storageV5,
      });
      if (io.status === "refused")
        addNotification({
          key: `diff-sidebar-${io.reason}`,
          kind: "feedback",
          text: io.text,
          priority: "immediate",
          timeoutMs: 3000,
        });
    };
    Ot[19] = addNotification;
    Ot[20] = columns;
    Ot[21] = host;
    Ot[22] = setAppState;
    Ot[23] = storageV5;
    Ot[24] = appStoreDirect;
    Ot[25] = Xt;
  } else Xt = Ot[25];
  let isActive;
  if (Ot[26] !== isThinClient) {
    isActive = isFullscreenEnvEnabled() && !isThinClient;
    Ot[26] = isThinClient;
    Ot[27] = isActive;
  } else isActive = Ot[27];
  let po;
  if (Ot[28] !== isActive) {
    po = {
      context: "Global",
      isActive,
    };
    Ot[28] = isActive;
    Ot[29] = po;
  } else po = Ot[29];
  useKeybinding("app:toggleReplTab", Xt, po);
  let session = useSession(selectSessionIdB);
  let co = appState === "diff" && width > 0;
  let bo;
  let Ao;
  if (Ot[30] !== columns || Ot[31] !== host || Ot[32] !== co || Ot[33] !== session) {
    bo = () => {
      if (co) logDiffPanelShown(host, session, columns);
    };
    Ao = [co, columns, session, host];
    Ot[30] = columns;
    Ot[31] = host;
    Ot[32] = co;
    Ot[33] = session;
    Ot[34] = bo;
    Ot[35] = Ao;
  } else {
    bo = Ot[34];
    Ao = Ot[35];
  }
  P(bo, Ao);
  if (!co) {
    return null;
  }
  const minCol = columns - width;
  let Ro;
  if (Ot[36] !== onAskAboutSelection || Ot[37] !== minCol || Ot[38] !== width) {
    Ro = jsxProd_default(DiffSidebarPanel, {
      width,
      minCol,
      onAskAboutSelection,
    });
    Ot[36] = onAskAboutSelection;
    Ot[37] = minCol;
    Ot[38] = width;
    Ot[39] = Ro;
  } else Ro = Ot[39];
  return Ro;
}
//@ chunk-18hwfzwa.js:1826508-1835163 sole-consumer
/**
 * diff 侧栏面板：读取本地工作区 diff（可切换基线 session/uncommitted/branch），隐藏被 read deny 规则保护的文件，列出改动文件与行数、会话前已编辑文件、测试/生成文件折叠，支持拖动滚动与选中内容提问。
 */
function DiffSidebarPanel(props) {
  let Et = w(85);
  let { width, minCol, onAskAboutSelection } = props;
  let session = useSession(selectSessionCwd);
  let host = useHost();
  let { storageV5 } = useTheme_2();
  let appState = useAppState(selectFileHistorySequence);
  let [He, We] = y(getDiffBaseMode);
  let { stats, files, hunks, loading, source, baseMode, noCommits } = useLocalWorkspaceDiff(
    appState,
    true,
    He,
  );
  let Dt;
  if (Et[0] !== He || Et[1] !== storageV5) {
    Dt = () => We(cycleDiffBaseMode(He, storageV5));
    Et[0] = He;
    Et[1] = storageV5;
    Et[2] = Dt;
  } else Dt = Et[2];
  let Lt;
  if (Et[3] === MEMO_CACHE_SENTINEL) {
    Lt = {
      context: "DiffPanel",
    };
    Et[3] = Lt;
  } else Lt = Et[3];
  useKeybinding("app:cycleDiffBase", Dt, Lt);
  let appState_2 = useAppState(selectMainAgentTodos);
  let Xt;
  if (Et[4] !== appState_2) {
    Xt = todoToolsEnabled() ? appState_2 : undefined;
    Et[4] = appState_2;
    Et[5] = Xt;
  } else Xt = Et[5];
  let io = Xt;
  let appState_3 = useAppState(selectToolPermissionCtxRepl);
  let setAppState = useSetAppState();
  let { processQueue } = useNotifications();
  let co;
  let bo;
  if (Et[6] !== processQueue || Et[7] !== setAppState) {
    co = () => {
      setAppState(showDiffPanel);
      return () => {
        setAppState(hideDiffPanel);
        processQueue();
      };
    };
    bo = [setAppState, processQueue];
    Et[6] = processQueue;
    Et[7] = setAppState;
    Et[8] = co;
    Et[9] = bo;
  } else {
    co = Et[8];
    bo = Et[9];
  }
  P(co, bo);
  let [scrollRef] = y(createReplayHandleSlot);
  let { attach } = scrollRef;
  let Ro = R(null);
  let Ho = R(null);
  let Io;
  if (Et[10] === MEMO_CACHE_SENTINEL) {
    Io = new Map();
    Et[10] = Io;
  } else Io = Et[10];
  let Wo = R(Io);
  let mn = 0;
  let Cn = 0;
  let No = 0;
  if (Et[11] !== files) {
    for (const file of files) {
      if (file.preSession) {
        mn++;
        Cn = Cn + file.linesAdded;
        No = No + file.linesRemoved;
      }
    }
    Et[11] = files;
    Et[12] = mn;
    Et[13] = Cn;
    Et[14] = No;
  } else {
    mn = Et[12];
    Cn = Et[13];
    No = Et[14];
  }
  let Yo;
  if (Et[15] !== mn || Et[16] !== Cn || Et[17] !== No) {
    Yo = {
      filesCount: mn,
      linesAdded: Cn,
      linesRemoved: No,
    };
    Et[15] = mn;
    Et[16] = Cn;
    Et[17] = No;
    Et[18] = Yo;
  } else Yo = Et[18];
  let kn = Yo;
  let Fn;
  if (Et[19] !== io) {
    Fn = io ? count(io, isCompletedStatus) : 0;
    Et[19] = io;
    Et[20] = Fn;
  } else Fn = Et[20];
  let bn = Fn;
  let Go = io?.length ?? 0;
  let max = Math.max(width - 2, 20);
  let thirdOverlayKeys = useThirdOverlayKeys();
  let feedIsWide = useFeedIsWide();
  let Sn = thirdOverlayKeys || feedIsWide;
  let selection = useSelection();
  let on;
  if (Et[21] === MEMO_CACHE_SENTINEL) {
    on = {
      requireScope: true,
    };
    Et[21] = on;
  } else on = Et[21];
  useDragToScroll(scrollRef, selection, !Sn, undefined, on);
  let getMaxRow;
  if (Et[22] === MEMO_CACHE_SENTINEL) {
    getMaxRow = () => {
      let yogaNode = Ro.current?.yogaNode;
      if (!yogaNode) {
        return null;
      }
      let Dn = 0;
      for (let wn = Ro.current ?? undefined; wn; wn = wn.parentNode)
        Dn = Dn + (wn.yogaNode?.getComputedTop() ?? 0);
      return Dn + yogaNode.getComputedHeight() - 1;
    };
    Et[22] = getMaxRow;
  } else getMaxRow = Et[22];
  let filePathForRow;
  if (Et[23] === MEMO_CACHE_SENTINEL) {
    filePathForRow = (row) => findRowOwner(row, Ho.current, Wo.current);
    Et[23] = filePathForRow;
  } else filePathForRow = Et[23];
  useDiffSelectionAttach(minCol, getMaxRow, Sn ? undefined : onAskAboutSelection, filePathForRow);
  let [Wn, Fr] = y(false);
  let Zn;
  if (Et[24] === MEMO_CACHE_SENTINEL) {
    Zn = getDiffRepoRoot();
    Et[24] = Zn;
  } else Zn = Et[24];
  let Un = Zn;
  let dr;
  if (Et[25] !== session) {
    dr = findGitRoot(session) ?? session;
    Et[25] = session;
    Et[26] = dr;
  } else dr = Et[26];
  let or = dr;
  let pr;
  if (Et[27] !== files || Et[28] !== or || Et[29] !== Wn || Et[30] !== appState_3) {
    let Qn = or === Un ? [Un] : [Un, or];
    let ur = 0;
    let Ir = 0;
    let Pr = [];
    let ts = [];
    for (const file of files) {
      if (
        Qn.some((Ur) => matchingRuleForInput(resolve(Ur, file.path), appState_3, "read", "deny") !== null)
      ) {
        Ir++;
        continue;
      }
      if (file.preSession) {
        ts.push(file);
        continue;
      }
      if (isLockOrGeneratedFile(file.path) || isTestFile(file.path)) {
        ur++;
        if (!Wn) {
          continue;
        }
      }
      Pr.push(file);
    }
    pr = {
      files: Pr,
      preSessionFiles: ts,
      noiseCount: ur,
      deniedHidden: Ir,
    };
    Et[27] = files;
    Et[28] = or;
    Et[29] = Wn;
    Et[30] = appState_3;
    Et[31] = pr;
  } else pr = Et[31];
  let { files: files_2, preSessionFiles, noiseCount, deniedHidden } = pr;
  let fr = files.length > 0 && kn.filesCount === files.length && noiseCount === 0 && deniedHidden === 0;
  let $r = fr ? 0 : (stats?.linesAdded ?? 0) - kn.linesAdded;
  let Yr = fr ? 0 : (stats?.linesRemoved ?? 0) - kn.linesRemoved;
  let Er = fr ? 0 : (stats?.filesCount ?? files.length) - kn.filesCount;
  let [Vr, ms] = y(0);
  let max_2 = Math.max(0, files_2.length - MAX_VISIBLE_FILE_DIFFS);
  let min = Math.min(Vr, max_2);
  let sliced = files_2.slice(min, min + MAX_VISIBLE_FILE_DIFFS);
  let ws = min;
  let Ci = files_2.length - (min + sliced.length);
  let max_3 = Math.max(0, Er - (files.length - kn.filesCount));
  let Oi = Wn ? 0 : noiseCount;
  let Hi = null;
  let Zi = null;
  if (!loading) {
    if (stats === null) {
      Hi = "Diff unavailable";
      Zi = "Couldn't read the git diff \u2014 it will retry on the next change";
    } else if (Er === 0) {
      if (noCommits) {
        Hi = "No commits yet";
        Zi = "Nothing to diff against until the repo's first commit";
      } else if (baseMode === "uncommitted") Hi = "No uncommitted changes";
      else if (baseMode === "branch") {
        if (source.kind === "branch") Hi = `No changes vs ${source.baseBranch}`;
        else {
          Hi = "No changes vs HEAD";
          Zi = "No base branch to compare against \u2014 showing changes vs HEAD";
        }
      } else Hi = "No changes this session";
    }
  }
  let da;
  if (Et[32] === MEMO_CACHE_SENTINEL) {
    da = () => Fr(toggleFalse);
    Et[32] = da;
  } else da = Et[32];
  const isActive = noiseCount > 0;
  let ps;
  if (Et[33] !== isActive) {
    ps = {
      context: "Global",
      isActive,
    };
    Et[33] = isActive;
    Et[34] = ps;
  } else ps = Et[34];
  useKeybinding("app:toggleDiffNoiseFilter", da, ps);
  useAppState(selectPanelFileViewRepl);
  let xs;
  if (Et[35] !== max_2) {
    xs = function Ms(kr) {
      ms((ls) => clamp(Math.min(ls, max_2) + kr, 0, max_2));
    };
    Et[35] = max_2;
    Et[36] = xs;
  } else xs = Et[36];
  let Ms = xs;
  let qs;
  if (Et[37] !== Ms) {
    qs = {
      "app:diffFileListUp": () => Ms(-1),
      "app:diffFileListDown": () => Ms(1),
    };
    Et[37] = Ms;
    Et[38] = qs;
  } else qs = Et[38];
  const isActive_2 = max_2 > 0;
  let es;
  if (Et[39] !== isActive_2) {
    es = {
      context: "Global",
      isActive: isActive_2,
    };
    Et[39] = isActive_2;
    Et[40] = es;
  } else es = Et[40];
  MessageActionsKeybindings(qs, es);
  let shortcutDisplay = useShortcutDisplay_2("app:diffFileListDown", "Global", "alt+down");
  let [Hs, _s] = y(false);
  let fs;
  if (Et[41] === MEMO_CACHE_SENTINEL) {
    fs = () => _s(toggleFalseB);
    Et[41] = fs;
  } else fs = Et[41];
  const isActive_3 = preSessionFiles.length > 0;
  let ua;
  if (Et[42] !== isActive_3) {
    ua = {
      context: "Global",
      isActive: isActive_3,
    };
    Et[42] = isActive_3;
    Et[43] = ua;
  } else ua = Et[43];
  useKeybinding("app:toggleDiffPreSession", fs, ua);
  let La = loading
    ? null
    : Hi !== null
      ? {
          headline: Hi,
          hint: Zi,
        }
      : files.length === 0
        ? {
            headline: "Too many changed files to show diff",
            hint: "Per-file diff is skipped above 500 files",
          }
        : files_2.length === 0
          ? {
              headline:
                deniedHidden > 0 && Oi > 0
                  ? "Only hidden files changed"
                  : deniedHidden > 0
                    ? "Only read-denied files changed"
                    : "Only tests and generated files changed",
              hint:
                deniedHidden > 0 && Oi > 0
                  ? "Read-denied, test, and generated files are hidden in this panel"
                  : deniedHidden > 0
                    ? "Read-denied files are hidden in this panel"
                    : 'Tests and generated files are hidden \xB7 click "show" above to view them',
            }
          : null;
  let Xa = Hs && preSessionFiles.length > 0;
  let dl = loading || (La !== null && !Xa);
  let timeout = useTimeout(loading ? LOADING_HINT_DELAY_MS : null);
  let yi = function yi(path) {
    let Ss = Wo.current.get(path);
    if (Ss) scrollRef.handle?.scrollToElement(Ss);
  };
  const Ws = Box;
  const flexDirection = "column";
  const height = "100%";
  let onWheel;
  if (Et[44] !== scrollRef.handle) {
    onWheel = (event) => {
      scrollRef.handle?.scrollBy(event.deltaY * 3);
      event.preventDefault();
      event.stopPropagation();
    };
    Et[44] = scrollRef.handle;
    Et[45] = onWheel;
  } else onWheel = Et[45];
  const selectionScope = true;
  let qa;
  if (Et[46] !== Hi || Et[47] !== Er || Et[48] !== loading || Et[49] !== $r || Et[50] !== Yr) {
    qa =
      !loading &&
      Hi === null &&
      jsxProd_default_2(Text, {
        children: [
          jsxProd_default_2(Text, {
            bold: true,
            children: [Er, " ", plural(Er, "file")],
          }),
          " ",
          "changed",
          ($r > 0 || Yr > 0) && " ",
          jsxProd_default(DiffStatCounts, {
            added: $r,
            removed: Yr,
          }),
        ],
      });
    Et[46] = Hi;
    Et[47] = Er;
    Et[48] = loading;
    Et[49] = $r;
    Et[50] = Yr;
    Et[51] = qa;
  } else qa = Et[51];
  let pd;
  if (Et[52] === MEMO_CACHE_SENTINEL) {
    pd = jsxProd_default(Box, {
      flexGrow: 1,
    });
    Et[52] = pd;
  } else pd = Et[52];
  let $l;
  if (Et[53] !== host || Et[54] !== setAppState || Et[55] !== storageV5) {
    $l = jsxProd_default(CloseButton, {
      onClose: () => closeDiffSidebar(host, setAppState, storageV5),
    });
    Et[53] = host;
    Et[54] = setAppState;
    Et[55] = storageV5;
    Et[56] = $l;
  } else $l = Et[56];
  let Yi;
  if (Et[57] !== qa || Et[58] !== $l) {
    Yi = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [qa, pd, $l],
    });
    Et[57] = qa;
    Et[58] = $l;
    Et[59] = Yi;
  } else Yi = Et[59];
  let El;
  if (
    Et[60] !== He ||
    Et[61] !== baseMode ||
    Et[62] !== Er ||
    Et[63] !== noCommits ||
    Et[64] !== source ||
    Et[65] !== stats
  ) {
    El =
      stats !== null &&
      (noCommits
        ? Er > 0 &&
          jsxProd_default(Text, {
            dimColor: true,
            children: "no commits yet \u2014 showing staged and new files",
          })
        : (He !== "session" || baseMode !== "session") &&
          jsxProd_default(Text, {
            dimColor: true,
            children: diffBaseLabel(He, source, He !== baseMode),
          }));
    Et[60] = He;
    Et[61] = baseMode;
    Et[62] = Er;
    Et[63] = noCommits;
    Et[64] = source;
    Et[65] = stats;
    Et[66] = El;
  } else El = Et[66];
  let Ll;
  if (Et[67] !== max || Et[68] !== bn || Et[69] !== Go) {
    Ll =
      Go > 0 &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        flexDirection: "row",
        gap: 1,
        children: [
          jsxProd_default(ProgressBar, {
            ratio: bn / Go,
            width: Math.min(20, max - 12),
            fillColor: "success",
            emptyColor: "inactive",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [bn, "/", Go],
          }),
        ],
      });
    Et[67] = max;
    Et[68] = bn;
    Et[69] = Go;
    Et[70] = Ll;
  } else Ll = Et[70];
  const Vd =
    (sliced.length > 0 || noiseCount > 0) &&
    jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      onWheel:
        max_2 > 0
          ? (event) => {
              Ms(event.deltaY);
              event.preventDefault();
              event.stopPropagation();
            }
          : undefined,
      children: [
        ws > 0 &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [UP_ARROW, " ", ws, " more above"],
          }),
        sliced.map((mc) =>
          jsxProd_default(
            DiffFileRow,
            {
              path: mc.path,
              added: mc.linesAdded,
              removed: mc.linesRemoved,
              width: max,
              onClick: () => yi(mc.path),
            },
            mc.path,
          ),
        ),
        (Ci > 0 || deniedHidden > 0 || max_3 > 0) &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              Ci > 0 ? `${DOWN_ARROW} ` : "\u2026 ",
              [
                Ci > 0 ? `${Ci} more below${shortcutDisplay ? ` (${shortcutDisplay} to scroll)` : ""}` : null,
                deniedHidden > 0 ? `${deniedHidden} read-denied` : null,
                max_3 > 0 ? `${max_3} not shown` : null,
              ]
                .filter(Boolean)
                .join(" \xB7 "),
            ],
          }),
        noiseCount > 0 &&
          jsxProd_default(GeneratedFilesToggle, {
            count: noiseCount,
            shown: Wn,
            onToggle: () => Fr(toggleFalseC),
          }),
      ],
    });
  let cd;
  if (Et[71] !== Yi || Et[72] !== El || Et[73] !== Ll || Et[74] !== Vd) {
    cd = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      flexShrink: 0,
      children: [Yi, El, Ll, Vd],
    });
    Et[71] = Yi;
    Et[72] = El;
    Et[73] = Ll;
    Et[74] = Vd;
    Et[75] = cd;
  } else cd = Et[75];
  const Ka = Box;
  const flexGrow = 1;
  const flexDirection_2 = "column";
  const overflow = "hidden";
  const children = dl
    ? jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Box, {
            flexGrow: 1,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            paddingX: 1,
            children: loading
              ? timeout &&
                jsxProd_default(WorkerBadge, {
                  message: "Loading diff\u2026",
                  dimColor: true,
                })
              : La !== null &&
                [La.headline, La.hint ?? ""]
                  .flatMap((hd) =>
                    hd === ""
                      ? []
                      : wrapText(hd, max, "wrap").split(`
`),
                  )
                  .map(renderDimText),
          }),
          stats !== null &&
            preSessionFiles.length > 0 &&
            jsxProd_default(Box, {
              flexShrink: 0,
              paddingX: 1,
              paddingBottom: 1,
              children: jsxProd_default(PreSessionFilesSection, {
                files: preSessionFiles,
                hunks,
                shown: Hs,
                onToggle: () => _s(toggleFalseD),
                width: max,
              }),
            }),
        ],
      })
    : jsxProd_default(ScrollBoxDefault, {
        ref: attach,
        flexGrow: 1,
        flexDirection: "column",
        stickyScroll: false,
        paddingX: 1,
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          width: max,
          children: [
            La !== null
              ? jsxProd_default(HintText, {
                  hint: La.hint ?? undefined,
                  children: La.headline,
                })
              : jsxProd_default(Box, {
                  flexDirection: "column",
                  gap: 1,
                  children: files_2.map((file) =>
                    jsxProd_default_2(
                      Box,
                      {
                        flexDirection: "column",
                        ref: (Od) => {
                          if (Od) Wo.current.set(file.path, Od);
                          else Wo.current.delete(file.path);
                        },
                        children: [
                          jsxProd_default(Divider, {
                            width: max,
                          }),
                          jsxProd_default(DiffDetailView, {
                            filePath: file.path,
                            hunks: hunks.get(file.path) ?? [],
                            isBinary: file.isBinary,
                            isLargeFile: file.isLargeFile,
                            isTruncated: file.isTruncated,
                            isUntracked: file.isUntracked,
                            width: max,
                          }),
                        ],
                      },
                      file.path,
                    ),
                  ),
                }),
            stats !== null &&
              preSessionFiles.length > 0 &&
              jsxProd_default(PreSessionFilesSection, {
                files: preSessionFiles,
                hunks,
                shown: Hs,
                onToggle: () => _s(toggleFalseE),
                width: max,
              }),
          ],
        }),
      });
  let Kd;
  if (Et[76] !== Ka || Et[77] !== children) {
    Kd = jsxProd_default(Ka, {
      ref: Ho,
      flexGrow,
      flexDirection: flexDirection_2,
      overflow,
      children,
    });
    Et[76] = Ka;
    Et[77] = children;
    Et[78] = Kd;
  } else Kd = Et[78];
  let ec;
  if (Et[79] !== Ws || Et[80] !== onWheel || Et[81] !== cd || Et[82] !== Kd || Et[83] !== width) {
    ec = jsxProd_default_2(Ws, {
      ref: Ro,
      flexDirection,
      width,
      height,
      onWheel,
      selectionScope,
      children: [cd, Kd],
    });
    Et[79] = Ws;
    Et[80] = onWheel;
    Et[81] = cd;
    Et[82] = Kd;
    Et[83] = width;
    Et[84] = ec;
  } else ec = Et[84];
  return ec;
}
//@ chunk-18hwfzwa.js:1835163-1835430 sole-consumer
function diffBaseLabel(h, source, D) {
  let L;
  switch (h) {
    case "session":
      L = "this session";
      break;
    case "uncommitted":
      L = "uncommitted (vs HEAD)";
      break;
    case "branch":
      if (source.kind === "branch") L = `branch vs ${source.baseBranch}`;
      else L = D ? "branch diff" : "vs HEAD (no base branch)";
      break;
  }
  return D ? `${L}\u2026` : L;
}
//@ chunk-18hwfzwa.js:1835430-1837025 sole-consumer
/**
 * diff 侧栏里"本次会话前已编辑的文件"折叠区：点击切换显示文件列表及各自 diff（文件过多时隐藏 diff）。
 */
function PreSessionFilesSection(props) {
  let He = w(21);
  let { files, hunks, shown, onToggle, width } = props;
  let [Re, Be] = y(false);
  let onMouseEnter;
  let onMouseLeave;
  if (He[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => Be(true);
    onMouseLeave = () => Be(false);
    He[0] = onMouseEnter;
    He[1] = onMouseLeave;
  } else {
    onMouseEnter = He[0];
    onMouseLeave = He[1];
  }
  const dimColor = !Re;
  const rt = files.length;
  let kt;
  if (He[2] !== files.length) {
    kt = plural(files.length, "file");
    He[2] = files.length;
    He[3] = kt;
  } else kt = He[3];
  const At = shown ? "hide" : "show";
  let children;
  if (He[4] !== files.length || He[5] !== Re || He[6] !== dimColor || He[7] !== kt || He[8] !== At) {
    children = jsxProd_default_2(Text, {
      dimColor,
      underline: Re,
      children: ["+", rt, " ", kt, " edited before this session (", At, ")"],
    });
    He[4] = files.length;
    He[5] = Re;
    He[6] = dimColor;
    He[7] = kt;
    He[8] = At;
    He[9] = children;
  } else children = He[9];
  let Ot;
  if (He[10] !== onToggle || He[11] !== children) {
    Ot = jsxProd_default(Box, {
      flexDirection: "row",
      onClick: onToggle,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    He[10] = onToggle;
    He[11] = children;
    He[12] = Ot;
  } else Ot = He[12];
  let Et;
  if (He[13] !== files || He[14] !== hunks || He[15] !== shown || He[16] !== width) {
    Et =
      shown &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: files.map((file) =>
              jsxProd_default_2(
                Box,
                {
                  flexDirection: "row",
                  width,
                  children: [
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: truncateStartToWidth(diffLineToPlainText(file.path), Math.max(width - 12, 8)),
                    }),
                    jsxProd_default(Box, {
                      flexGrow: 1,
                    }),
                    jsxProd_default(DiffStatCounts, {
                      added: file.linesAdded,
                      removed: file.linesRemoved,
                    }),
                  ],
                },
                file.path,
              ),
            ),
          }),
          files.length > MAX_DIFF_FILES_BEFORE_HIDING
            ? jsxProd_default_2(Text, {
                dimColor: true,
                children: ["diffs hidden above ", MAX_DIFF_FILES_BEFORE_HIDING, " files"],
              })
            : files.map((file) =>
                jsxProd_default_2(
                  Box,
                  {
                    flexDirection: "column",
                    children: [
                      jsxProd_default(Divider, {
                        width,
                      }),
                      jsxProd_default(DiffDetailView, {
                        filePath: file.path,
                        hunks: hunks.get(file.path) ?? [],
                        isBinary: file.isBinary,
                        isLargeFile: file.isLargeFile,
                        isTruncated: file.isTruncated,
                        isUntracked: file.isUntracked,
                        width,
                      }),
                    ],
                  },
                  file.path,
                ),
              ),
        ],
      });
    He[13] = files;
    He[14] = hunks;
    He[15] = shown;
    He[16] = width;
    He[17] = Et;
  } else Et = He[17];
  let oo;
  if (He[18] !== Ot || He[19] !== Et) {
    oo = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [Ot, Et],
    });
    He[18] = Ot;
    He[19] = Et;
    He[20] = oo;
  } else oo = He[20];
  return oo;
}
//@ chunk-18hwfzwa.js:1837025-1837437 sole-consumer
/**
 * 关闭按钮组件（悬停加粗）。
 */
function CloseButton(props) {
  let ee = w(8);
  let { onClose } = props;
  let [D, L] = y(false);
  let onMouseEnter;
  let onMouseLeave;
  if (ee[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => L(true);
    onMouseLeave = () => L(false);
    ee[0] = onMouseEnter;
    ee[1] = onMouseLeave;
  } else {
    onMouseEnter = ee[0];
    onMouseLeave = ee[1];
  }
  const dimColor = !D;
  let children;
  if (ee[2] !== D || ee[3] !== dimColor) {
    children = jsxProd_default(Text, {
      bold: D,
      dimColor,
      children: HEAVY_MULTIPLICATION_X,
    });
    ee[2] = D;
    ee[3] = dimColor;
    ee[4] = children;
  } else children = ee[4];
  let We;
  if (ee[5] !== onClose || ee[6] !== children) {
    We = jsxProd_default(Box, {
      onClick: onClose,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    ee[5] = onClose;
    ee[6] = children;
    ee[7] = We;
  } else We = ee[7];
  return We;
}
//@ chunk-18hwfzwa.js:1837437-1838087 sole-consumer
/**
 * 显示/隐藏生成测试文件数量的切换组件。
 */
function GeneratedFilesToggle(props) {
  let $ = w(13);
  let { count, shown, onToggle } = props;
  let [hovered, setHovered] = y(false);
  let onEnter;
  let onLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onEnter = () => setHovered(true);
    onLeave = () => setHovered(false);
    $[0] = onEnter;
    $[1] = onLeave;
  } else {
    onEnter = $[0];
    onLeave = $[1];
  }
  const dim = !hovered;
  let noun;
  if ($[2] !== count) {
    noun = plural(count, "test");
    $[2] = count;
    $[3] = noun;
  } else noun = $[3];
  const verb = shown ? "hide" : "show";
  let label;
  if ($[4] !== count || $[5] !== hovered || $[6] !== dim || $[7] !== noun || $[8] !== verb) {
    label = jsxProd_default_2(Text, {
      dimColor: dim,
      underline: hovered,
      children: [count, " ", noun, "/generated (", verb, ")"],
    });
    $[4] = count;
    $[5] = hovered;
    $[6] = dim;
    $[7] = noun;
    $[8] = verb;
    $[9] = label;
  } else label = $[9];
  let element;
  if ($[10] !== onToggle || $[11] !== label) {
    element = jsxProd_default(Box, {
      flexDirection: "row",
      onClick: onToggle,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      children: label,
    });
    $[10] = onToggle;
    $[11] = label;
    $[12] = element;
  } else element = $[12];
  return element;
}
//@ chunk-18hwfzwa.js:1838087-1838906 sole-consumer
/**
 * diff 面板中单个文件的行组件：截断显示路径、悬停下划线，并显示增删行数。
 */
function DiffFileRow(props) {
  let $ = w(17);
  let { path, added, removed, width, onClick } = props;
  let [hovered, setHovered] = y(false);
  let truncatedPath;
  if ($[0] !== path || $[1] !== width) {
    truncatedPath = truncateStartToWidth(diffLineToPlainText(path), Math.max(width - 12, 8));
    $[0] = path;
    $[1] = width;
    $[2] = truncatedPath;
  } else truncatedPath = $[2];
  let pathText = truncatedPath;
  let onEnter;
  let onLeave;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    onEnter = () => setHovered(true);
    onLeave = () => setHovered(false);
    $[3] = onEnter;
    $[4] = onLeave;
  } else {
    onEnter = $[3];
    onLeave = $[4];
  }
  const dim = !hovered;
  let label;
  if ($[5] !== pathText || $[6] !== hovered || $[7] !== dim) {
    label = jsxProd_default(Text, {
      dimColor: dim,
      underline: hovered,
      children: pathText,
    });
    $[5] = pathText;
    $[6] = hovered;
    $[7] = dim;
    $[8] = label;
  } else label = $[8];
  let spacer;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    spacer = jsxProd_default(Box, {
      flexGrow: 1,
    });
    $[9] = spacer;
  } else spacer = $[9];
  let stats;
  if ($[10] !== added || $[11] !== removed) {
    stats = jsxProd_default(DiffStatCounts, {
      added,
      removed,
    });
    $[10] = added;
    $[11] = removed;
    $[12] = stats;
  } else stats = $[12];
  let element;
  if ($[13] !== onClick || $[14] !== label || $[15] !== stats) {
    element = jsxProd_default_2(Box, {
      flexDirection: "row",
      onClick,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      children: [label, spacer, stats],
    });
    $[13] = onClick;
    $[14] = label;
    $[15] = stats;
    $[16] = element;
  } else element = $[16];
  return element;
}
//@ chunk-18hwfzwa.js:1838906-1838910 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:1838910-1839026 sole-consumer
function useDiffSnapshot() {
  let h = useAppState((L) => L.fileHistory.trackSequence ?? 0);
  let x = useAppState((L) => L.replTab);
  let diffCwd = getDiffCwd();
  return Q(() => isDiffPanelAvailable(), [diffCwd, h, x]);
}
//@ chunk-18hwfzwa.js:1839026-1839053 sole-consumer
function createNullStore() {
  return null;
}
//@ chunk-18hwfzwa.js:1839053-1839090 sole-consumer
function selectReplTabB(cne) {
  return cne.replTab;
}
//@ chunk-18hwfzwa.js:1839090-1839131 sole-consumer = _temp (1)
function selectMcpClientsReplC(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:1839131-1839179 sole-consumer = _temp (1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-18hwfzwa.js:1839179-1839218 sole-consumer
function selectIsBriefOnlyReplC(J0) {
  return J0.isBriefOnly;
}
//@ chunk-18hwfzwa.js:1839218-1839263 sole-consumer
function selectBriefTranscript(PAt) {
  return PAt.briefTranscript;
}
//@ chunk-18hwfzwa.js:1839263-1839303 sole-consumer
function selectIdeSelectionReplB(X0) {
  return X0.ideSelection;
}
//@ chunk-18hwfzwa.js:1839303-1839333 sole-consumer
function createBridgeChannelSlot() {
  return new BridgeChannelSlot();
}
//@ chunk-18hwfzwa.js:1839333-1839370 sole-consumer
function selectTurnIsLoadingE(bw) {
  return bw.isLoading;
}
//@ chunk-18hwfzwa.js:1839370-1839396 sole-consumer
function alwaysFalseInRepl(uP) {
  return false;
}
//@ chunk-18hwfzwa.js:1839396-1839436 sole-consumer
function selectToolProgress(YK) {
  return YK.toolProgress;
}
//@ chunk-18hwfzwa.js:1839436-1839488 sole-consumer
function selectUserInputOnProcessingReplB(ZOe) {
  return !!ZOe.userInputOnProcessing;
}
//@ chunk-18hwfzwa.js:1839488-1839517 sole-consumer
function setTranscriptScreen() {
  return setDialogHostUnmounted(false);
}
//@ chunk-18hwfzwa.js:1839517-1839545 sole-consumer
function clearBlockingDialogNow() {
  return clearBlockingDialog();
}
//@ chunk-18hwfzwa.js:1839545-1839583 sole-consumer
function hasBlockingDialog(QE) {
  return topBlockingDialog(QE) !== null;
}
//@ chunk-18hwfzwa.js:1839583-1839638 sole-consumer
function selectIdleNotifThresholdMs() {
  return getGlobalConfig().messageIdleNotifThresholdMs;
}
//@ chunk-18hwfzwa.js:1839638-1839679 sole-consumer
function selectHasBashesDialog(JK) {
  return !!JK.bashesDialog;
}
//@ chunk-18hwfzwa.js:1839679-1839708 sole-consumer
function createSurveySlotStore() {
  return new SurveySlotStore();
}
//@ chunk-18hwfzwa.js:1839708-1839737 sole-consumer
function setPauseAnimation() {
  return setBlockingToolProgress(false);
}
//@ chunk-18hwfzwa.js:1839737-1839764 sole-consumer
function createNullContextStore() {
  return null;
}
//@ chunk-18hwfzwa.js:1839764-1839780 sole-consumer
function noop_6() {}
//@ chunk-18hwfzwa.js:1839780-1839796 sole-consumer
function noop_7() {}
//@ chunk-18hwfzwa.js:1839796-1839860 sole-consumer
function toggleScreen(Zk) {
  return Zk === "transcript" ? "prompt" : "transcript";
}
//@ chunk-18hwfzwa.js:1839860-1839991 sole-consumer
function logDiffSidebarRenderError(Z0, ev) {
  logFeatureBad(
    "repl_diff_read",
    "render_threw",
    ev.componentStack
      ? {
          error_component_stack_hash: shortHash(ev.componentStack),
        }
      : undefined,
  );
}
//@ chunk-18hwfzwa.js:1839991-1840048 fingerprint = useScheduledTasks (0.524)
var useScheduledTasks = require("./chunk-4m1yk02k.js").useScheduledTasks;
//@ chunk-18hwfzwa.js:1840048-1840065 layout
var NullComponent = () => null;
//@ chunk-18hwfzwa.js:1840065-1840431 facade-exports
/**
 * REPL 外壳：用 props.messageQueue（缺省取全局消息队列）建队列 Provider，并提供写入节流上下文后渲染 REPL。
 */
function REPL(h) {
  let $ = w(8);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let [D] = y(createNullStore);
  const queue = h.messageQueue ?? commandQueueOrDefault;
  let children;
  if ($[0] !== h) {
    children = jsxProd_default(REPL_2, {
      ...h,
    });
    $[0] = h;
    $[1] = children;
  } else children = $[1];
  let children_2;
  if ($[2] !== D || $[3] !== children) {
    children_2 = jsxProd_default(SpinnerPaceContext.Provider, {
      value: D,
      children,
    });
    $[2] = D;
    $[3] = children;
    $[4] = children_2;
  } else children_2 = $[4];
  let Be;
  if ($[5] !== queue || $[6] !== children_2) {
    Be = jsxProd_default(QueueProvider, {
      queue,
      children: children_2,
    });
    $[5] = queue;
    $[6] = children_2;
    $[7] = Be;
  } else Be = $[7];
  return Be;
}
//@ chunk-18hwfzwa.js:1840431-1878241 callgraph-witnessed = REPL (0.129)
/**
 * 主交互屏幕（316 重写为“控制器 + 外部 store”架构）。按 props 建立一组长生命周期控制器（useState 初始化器里 new）：ReplSessionScope、TurnController+转录 store、ComposerChrome、SessionController、PromptSubmitController、ScrollPin、PromptDraft、IdleNudge、BackgroundGesture 等，
 * 再用 useLayoutEffect 一次性 bindHost 把 mainLoopModel/canUseTool/通知等宿主能力注入各控制器。渲染：transcript 屏返回 gQ 转录视图；prompt 屏返回 FullscreenLayout{scrollable=Gee 消息列表, abovePrompt=通知/任务/权限区, bottom=y8 输入区, sidebar=diff 侧栏, dock=面板坞}，
 * 外层包 MCPConnectionManager、$A.Provider(tokenWarning)、LF、_F 屏幕框架。也挂 GlobalKeybindingHandlers、useQueueProcessor、useScheduledTasks、useMailboxBridge、useLogMessages 等副作用 hook。
 */
function REPL_2(props) {
  let $ = w(686);
  let {
    commands,
    debug,
    initialTools,
    initialMessages,
    initialMessagesOrigin,
    pendingHookMessages,
    initialFileHistorySnapshots,
    initialContentReplacements,
    mcpClients,
    dynamicMcpConfig,
    autoConnectIdeFlag,
    strictMcpConfig,
    systemPrompt,
    appendSystemPrompt,
    systemPromptSnapshot,
    onBeforeQuery,
    onTurnComplete,
    onCaptureSnapshot,
    disabled,
    mainThreadAgentDefinition,
    disableSlashCommands,
    remoteSessionConfig,
    onDetachToCaller,
    embedded,
    hideWelcomeChrome,
    hideLoginNotice,
    disableQuery,
    filterCommands,
    cancelRef,
    directConnectConfig,
    sshSession,
    thinkingConfig,
    thinkingConfigExplicit,
    thinkingDisplayFlag,
    fallbackModel,
    engine,
    onCommandsChange,
    onQueryParamsChange,
  } = props;
  let isStrictMcpConfig = strictMcpConfig === undefined ? false : strictMcpConfig;
  let isDisabled = disabled === undefined ? false : disabled;
  let slashCommandsDisabled = disableSlashCommands === undefined ? false : disableSlashCommands;
  let isEmbedded = embedded === undefined ? false : embedded;
  let shouldHideLoginNotice = hideLoginNotice === undefined ? false : hideLoginNotice;
  let isQueryDisabled = disableQuery === undefined ? false : disableQuery;
  let presentation = useRenderMode();
  let isInsidePanelHost = Se(rootSessionSlot) !== null;
  if (showFooterHintGate()) {
    if (isEmbedded) isInsidePanelHost;
  }
  let isFullscreen = presentation === "fullscreen";
  let { storageV5, credentials } = useTheme_2();
  let fleetNudgeStore = useFleetNudgeStore();
  let messageQueue = useCommandQueueOrDefault();
  let mr;
  if ($[0] !== remoteSessionConfig) {
    mr = !!remoteSessionConfig || remoteSessionAwaits();
    $[0] = remoteSessionConfig;
    $[1] = mr;
  } else mr = $[1];
  let isRemoteSession = mr;
  let hasRemoteTransport = isRemoteSession || !!directConnectConfig || !!sshSession;
  let Fr;
  if ($[2] !== hasRemoteTransport) {
    Fr = getIsRemoteMode() || hasRemoteTransport;
    $[2] = hasRemoteTransport;
    $[3] = Fr;
  } else Fr = $[3];
  let isThinClient = Fr;
  let clock = useClock();
  let CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let session = useSession();
  let replTab = useAppState(selectReplTabB);
  let hasGitRepo = useDiffSnapshot();
  let replTab_2 = useAppState(selectMcpClientsReplC);
  let chromeClients = useAppState(selectPendingWorkerRequest_2);
  let setAppState = useSetAppState();
  let setSessionState = useSetAppStateFn();
  let store = useAppStoreDirect();
  let activePlugins = useActivePlugins();
  let sessionHooks = useSessionHooksRegistry();
  useRegistryOverride(session);
  let dialogStore = useDialogStore();
  let spinnerStore = useSpinnerStore();
  useBackgroundStatusSync();
  let _r;
  if ($[4] !== store) {
    _r = () => store.getState();
    $[4] = store;
    $[5] = _r;
  } else _r = $[5];
  let fr;
  if ($[6] !== setAppState || $[7] !== _r) {
    fr = createTaskFramework(_r, setAppState, {
      refillWebSearchBudgetByDefault: true,
    });
    $[6] = setAppState;
    $[7] = _r;
    $[8] = fr;
  } else fr = $[8];
  let taskRegistry = fr;
  let Yr;
  if ($[9] !== initialMessages || $[10] !== store) {
    Yr = () => {
      let Er = mainAgentId();
      let messages = initialMessages ?? createEmptyList();
      store.setState((ms) => ({
        ...ms,
        transcripts: {
          ...ms.transcripts,
          [Er]: {
            messages,
            inProgressToolUseIDs: new Set(),
          },
        },
      }));
      return null;
    };
    $[9] = initialMessages;
    $[10] = store;
    $[11] = Yr;
  } else Yr = $[11];
  y(Yr);
  let teammateColors;
  if ($[12] !== setAppState || $[13] !== store.getState) {
    teammateColors = createColorAssigner(fieldAccessor(store.getState, setAppState, "teammateColors"));
    $[12] = setAppState;
    $[13] = store.getState;
    $[14] = teammateColors;
  } else teammateColors = $[14];
  let teammateColors_2 = teammateColors;
  let terminal = useTerminalNotification();
  let mainLoopModel = useMainLoopModel_3();
  let isBriefOnly = useAppState(selectIsBriefOnlyReplC);
  let briefTranscript = useAppState(selectBriefTranscript);
  let [screen, setScreen] = y("prompt");
  let [dumpMode, setDumpMode] = y(false);
  let qn;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    qn = () => {
      setScreen("prompt");
      setDumpMode(false);
    };
    $[15] = qn;
  } else qn = $[15];
  let exitTranscript = qn;
  let { addNotification, removeNotification } = useNotifications();
  let mergedMcpClients = useMergedClients(mcpClients, replTab_2);
  runStartupNotificationSpecs();
  FeatureOfTheWeekClaim(addNotification, removeNotification);
  noopEffect_2(session, addNotification, removeNotification);
  let Ms;
  let qs;
  if ($[16] !== credentials || $[17] !== storageV5) {
    Ms = () => {
      refreshApiCreditLinkStatus(credentials, storageV5).catch(logError);
    };
    qs = [credentials, storageV5];
    $[16] = credentials;
    $[17] = storageV5;
    $[18] = Ms;
    $[19] = qs;
  } else {
    Ms = $[18];
    qs = $[19];
  }
  P(Ms, qs);
  let gs;
  if (
    $[20] !== credentials ||
    $[21] !== slashCommandsDisabled ||
    $[22] !== filterCommands ||
    $[23] !== commands ||
    $[24] !== initialContentReplacements ||
    $[25] !== dynamicMcpConfig ||
    $[26] !== mainThreadAgentDefinition ||
    $[27] !== mcpClients ||
    $[28] !== initialMessages ||
    $[29] !== initialTools ||
    $[30] !== isThinClient ||
    $[31] !== onCommandsChange ||
    $[32] !== session ||
    $[33] !== storageV5 ||
    $[34] !== store
  ) {
    gs = () =>
      new ReplSessionScope({
        store,
        initialMcpClients: mcpClients,
        storageV5,
        credentials,
        initialMessages,
        initialContentReplacements,
        initialCommands: commands,
        initialDynamicMcpConfig: dynamicMcpConfig,
        initialTools,
        mainThreadAgentDefinition,
        disableSlashCommands: slashCommandsDisabled,
        filterCommands,
        isThinClient,
        session,
        refreshContext: () => invalidateUserContext(session, "hooks_invalidate"),
        onCommandsChange,
      });
    $[20] = credentials;
    $[21] = slashCommandsDisabled;
    $[22] = filterCommands;
    $[23] = commands;
    $[24] = initialContentReplacements;
    $[25] = dynamicMcpConfig;
    $[26] = mainThreadAgentDefinition;
    $[27] = mcpClients;
    $[28] = initialMessages;
    $[29] = initialTools;
    $[30] = isThinClient;
    $[31] = onCommandsChange;
    $[32] = session;
    $[33] = storageV5;
    $[34] = store;
    $[35] = gs;
  } else gs = $[35];
  let [scope] = y(gs);
  let {
    commands: commands_2,
    renderingTools,
    dynamicMcpConfig: dynamicMcpConfig_2,
  } = useStoreSelector(scope);
  let writePacer = Se(SpinnerPaceContext);
  let ii;
  if (
    $[36] !== clock.setTimeout ||
    $[37] !== engine ||
    $[38] !== writePacer ||
    $[39] !== initialMessages?.length ||
    $[40] !== presentation ||
    $[41] !== remoteSessionConfig?.initialPromptUuid ||
    $[42] !== scope ||
    $[43] !== store ||
    $[44] !== taskRegistry
  ) {
    ii = () => {
      let ownsEngine = engine === undefined;
      let Xa =
        engine ??
        runWithQueryParams({
          store,
          scope,
          readPendingQueryParams: () => La.readPendingQueryParams(),
        });
      let dl = isWindowsTerminal();
      let La = new TurnController({
        engine: Xa,
        presentation,
        ownsEngine,
        initialExternalLoading: remoteSessionConfig?.initialPromptUuid !== undefined,
        initialHaikuTitleAttempted: (initialMessages?.length ?? 0) > 0,
        onTimingChange: (value) => mergeTaskProgressIntoTranscript(taskRegistry, mainAgentId(), value),
        frameNotifier: writePacer ?? IMMEDIATE_PACER,
        stream: {
          scheduleTimeout: clock.setTimeout,
          isStreamingTextVisible: () => isMotionAllowed(store.getState().settings.prefersReducedMotion, dl),
          getTranscriptLength: () => Hd.getSnapshot().length,
        },
      });
      let Ss = mainAgentId();
      let Hd = new MessageListStore({
        initial: store.getState().transcripts[Ss]?.messages ?? [],
        project: (sticky, handle) => {
          La.stream.trackTranscriptWrite(handle, sticky);
          let rounded = Math.round(La.stream.responseLength / 4);
          setTranscriptMessages(store, Ss, sticky, rounded);
        },
      });
      return {
        sessionEngine: Xa,
        turn: La,
        transcript: Hd,
      };
    };
    $[36] = clock.setTimeout;
    $[37] = engine;
    $[38] = writePacer;
    $[39] = initialMessages?.length;
    $[40] = presentation;
    $[41] = remoteSessionConfig?.initialPromptUuid;
    $[42] = scope;
    $[43] = store;
    $[44] = taskRegistry;
    $[45] = ii;
  } else ii = $[45];
  let [controllers] = y(ii);
  let { sessionEngine, turn, transcript } = controllers;
  useTrustedDeviceEnrolledNotice(addNotification, transcript);
  useInformationalMessageSink(transcript);
  let qa;
  if ($[46] !== onQueryParamsChange || $[47] !== turn.readPendingQueryParams) {
    qa = () => {
      onQueryParamsChange?.(turn.readPendingQueryParams);
    };
    $[46] = onQueryParamsChange;
    $[47] = turn.readPendingQueryParams;
    $[48] = qa;
  } else qa = $[48];
  let pd;
  if ($[49] !== onQueryParamsChange || $[50] !== turn) {
    pd = [onQueryParamsChange, turn];
    $[49] = onQueryParamsChange;
    $[50] = turn;
    $[51] = pd;
  } else pd = $[51];
  P(qa, pd);
  let $l;
  if (
    $[52] !== addNotification ||
    $[53] !== debug ||
    $[54] !== isEmbedded ||
    $[55] !== shouldHideLoginNotice ||
    $[56] !== isRemoteSession ||
    $[57] !== onDetachToCaller ||
    $[58] !== storageV5 ||
    $[59] !== store ||
    $[60] !== transcript ||
    $[61] !== turn.guard
  ) {
    $l = () =>
      new ComposerChrome({
        debug,
        embedded: isEmbedded,
        onDetachToCaller,
        hasSuppressedDialogs: false,
        hideLoginNotice: shouldHideLoginNotice,
        isRemoteSession,
        addNotification,
        store,
        storageV5,
        exitReaders: {
          getMessages: () => transcript.getSnapshot(),
          isMidTurn: () => turn.guard.isActive,
          isResponseStreaming: () => turn.guard.isRunning,
        },
      });
    $[52] = addNotification;
    $[53] = debug;
    $[54] = isEmbedded;
    $[55] = shouldHideLoginNotice;
    $[56] = isRemoteSession;
    $[57] = onDetachToCaller;
    $[58] = storageV5;
    $[59] = store;
    $[60] = transcript;
    $[61] = turn.guard;
    $[62] = $l;
  } else $l = $[62];
  let [chrome] = y($l);
  let ideSelection = useStoreSelector(chrome, selectIdeSelectionReplB);
  let Ll = transcript.apply;
  uiLogNamespace.useUiLog(transcript);
  let _c;
  if ($[63] !== Ll) {
    _c = () =>
      TURN_BOUNDARIES_MODULE_EXPORTS.createTurnEventTail((value) =>
        Ll({
          type: "append",
          messages: value,
        }),
      );
    $[63] = Ll;
    $[64] = _c;
  } else _c = $[64];
  let [turnEventTail] = y(_c);
  let [permissionRelays] = y(createBridgeChannelSlot);
  let Ka;
  if ($[65] !== permissionRelays || $[66] !== scope.requestDialog || $[67] !== setAppState) {
    Ka = () =>
      new SandboxNetworkPrompts({
        requestDialog: scope.requestDialog,
        getBridge: () => permissionRelays.bridge?.permission,
        applyPermissionUpdate: (remoteSlashCommands) =>
          setAppState((prev) => ({
            ...prev,
            toolPermissionContext: applyValidatedPermissionUpdate(
              prev.toolPermissionContext,
              remoteSlashCommands,
            ),
          })),
      });
    $[65] = permissionRelays;
    $[66] = scope.requestDialog;
    $[67] = setAppState;
    $[68] = Ka;
  } else Ka = $[68];
  let [networkPrompts] = y(Ka);
  let hd;
  if (
    $[69] !== credentials ||
    $[70] !== isRemoteSession ||
    $[71] !== networkPrompts ||
    $[72] !== scope ||
    $[73] !== setAppState ||
    $[74] !== storageV5 ||
    $[75] !== store ||
    $[76] !== transcript.getSnapshot
  ) {
    hd = () =>
      new SandboxStartup({
        store,
        setAppState,
        storageV5,
        credentials,
        scope,
        getMessages: transcript.getSnapshot,
        networkPrompts,
        isRemoteSession,
      });
    $[69] = credentials;
    $[70] = isRemoteSession;
    $[71] = networkPrompts;
    $[72] = scope;
    $[73] = setAppState;
    $[74] = storageV5;
    $[75] = store;
    $[76] = transcript.getSnapshot;
    $[77] = hd;
  } else hd = $[77];
  let [sandbox] = y(hd);
  let isLoading = useStoreSelector(turn, selectTurnIsLoadingE);
  useStoreSelector(turn, alwaysFalseInRepl);
  let toolProgress = useStoreSelector(turn.stream, selectToolProgress);
  let userInputOnProcessing = useStoreSelector(turn.stream, selectUserInputOnProcessingReplB);
  let hasToolProgress = toolProgress.size > 0;
  let qu;
  if ($[78] !== toolProgress) {
    qu = DATE_RANGE_ORDER(toolProgress);
    $[78] = toolProgress;
    $[79] = qu;
  } else qu = $[79];
  let pauseAnimation = qu;
  let { guard, buildToolUseContext } = turn;
  let awaySummary = useAwaySummaryController(transcript, isLoading, !isRemoteSession);
  let Kp;
  if ($[80] !== awaySummary || $[81] !== transcript) {
    Kp = () =>
      new ScrollPin({
        transcript,
        awaySummary,
      });
    $[80] = awaySummary;
    $[81] = transcript;
    $[82] = Kp;
  } else Kp = $[82];
  let [scrollPin] = y(Kp);
  let ss;
  if (
    $[83] !== clock.setTimeout ||
    $[84] !== scrollPin ||
    $[85] !== session ||
    $[86] !== store ||
    $[87] !== transcript ||
    $[88] !== turn
  ) {
    ss = () => {
      let safeYoloMessageShownRef = promptInputStoreFor(session);
      let isTypedAhead = hasEarlyInputField() && hasTypedEarlyInput();
      setPromptValue(safeYoloMessageShownRef, consumeEarlyInput());
      return new PromptDraft({
        valueStore: safeYoloMessageShownRef,
        scheduleTimeout: clock.setTimeout,
        isTypedAhead,
        watchText: raisePromptChange,
        rewriteEdit: ($a, xl) => turn.rewriteInputOverAutoContinuePrefill($a, xl),
        onEdit: (ref, setMessages) => {
          scrollPin.onPromptEdit(ref, setMessages);
          activityManager.recordUserActivity();
          onUserInput();
          updateLastInteractionTime(true);
        },
        screensPrompts: () =>
          hasPromptSubmitHooks(
            turn,
            transcript.getSnapshot(),
            getMainLoopModelFromState(store.getState()),
            "installed",
          ),
      });
    };
    $[83] = clock.setTimeout;
    $[84] = scrollPin;
    $[85] = session;
    $[86] = store;
    $[87] = transcript;
    $[88] = turn;
    $[89] = ss;
  } else ss = $[89];
  let [draft] = y(ss);
  let Ya;
  let tl;
  if ($[90] !== draft) {
    Ya = () => draft.start();
    tl = [draft];
    $[90] = draft;
    $[91] = Ya;
    $[92] = tl;
  } else {
    Ya = $[91];
    tl = $[92];
  }
  zt(Ya, tl);
  let ol;
  let ed;
  if ($[93] !== draft || $[94] !== turn) {
    ol = () => () => {
      turn.dispose();
      draft.dispose();
    };
    ed = [turn, draft];
    $[93] = draft;
    $[94] = turn;
    $[95] = ol;
    $[96] = ed;
  } else {
    ol = $[95];
    ed = $[96];
  }
  P(ol, ed);
  let _d;
  if (
    $[97] !== chrome ||
    $[98] !== clock ||
    $[99] !== credentials ||
    $[100] !== dialogStore ||
    $[101] !== isQueryDisabled ||
    $[102] !== draft ||
    $[103] !== hasRemoteTransport ||
    $[104] !== mainThreadAgentDefinition ||
    $[105] !== initialMessages ||
    $[106] !== initialMessagesOrigin ||
    $[107] !== messageQueue ||
    $[108] !== pendingHookMessages ||
    $[109] !== presentation ||
    $[110] !== sandbox ||
    $[111] !== scope ||
    $[112] !== scrollPin ||
    $[113] !== session ||
    $[114] !== sessionEngine ||
    $[115] !== sessionHooks ||
    $[116] !== setAppState ||
    $[117] !== spinnerStore ||
    $[118] !== storageV5 ||
    $[119] !== store ||
    $[120] !== taskRegistry ||
    $[121] !== transcript ||
    $[122] !== turnEventTail ||
    $[123] !== turn
  ) {
    _d = () =>
      new SessionController({
        session,
        presentation,
        store,
        setAppState,
        transcript,
        turn,
        draft,
        chrome,
        scrollPin,
        scope,
        engine: sessionEngine,
        dialogStore,
        taskRegistry,
        messageQueue,
        storageV5,
        credentials,
        sessionHooks,
        initialMessages,
        initialMessagesOrigin,
        initialMainThreadAgentDefinition: mainThreadAgentDefinition,
        disableQuery: isQueryDisabled,
        hasRemoteTransport,
        resetReplTabToConvo: () => switchToConversationTab(session.host, setAppState),
        resetTurnEventTail: () => turnEventTail.reset(),
        clock,
        sandbox,
        spinnerStore,
        pendingHookMessages,
      });
    $[97] = chrome;
    $[98] = clock;
    $[99] = credentials;
    $[100] = dialogStore;
    $[101] = isQueryDisabled;
    $[102] = draft;
    $[103] = hasRemoteTransport;
    $[104] = mainThreadAgentDefinition;
    $[105] = initialMessages;
    $[106] = initialMessagesOrigin;
    $[107] = messageQueue;
    $[108] = pendingHookMessages;
    $[109] = presentation;
    $[110] = sandbox;
    $[111] = scope;
    $[112] = scrollPin;
    $[113] = session;
    $[114] = sessionEngine;
    $[115] = sessionHooks;
    $[116] = setAppState;
    $[117] = spinnerStore;
    $[118] = storageV5;
    $[119] = store;
    $[120] = taskRegistry;
    $[121] = transcript;
    $[122] = turnEventTail;
    $[123] = turn;
    $[124] = _d;
  } else _d = $[124];
  let [sessionController] = y(_d);
  let { conversationId, headHooksPending } = useStoreSelector(sessionController);
  let isDialogActive = useActive();
  useStartupNotice();
  useExternalDialogBridge(scope.dialogTransport);
  let Wd;
  let Rl;
  if ($[125] !== screen) {
    Wd = () => {
      setDialogHostUnmounted(screen === "transcript");
      return setTranscriptScreen;
    };
    Rl = [screen];
    $[125] = screen;
    $[126] = Wd;
    $[127] = Rl;
  } else {
    Wd = $[126];
    Rl = $[127];
  }
  zt(Wd, Rl);
  let blockingDialogKind = useAutoDialogKindAlt() ?? null;
  let Pi;
  let fa;
  if ($[128] !== blockingDialogKind) {
    Pi = () => {
      markBlockingDialogShown(blockingDialogKind);
      return clearBlockingDialogNow;
    };
    fa = [blockingDialogKind];
    $[128] = blockingDialogKind;
    $[129] = Pi;
    $[130] = fa;
  } else {
    Pi = $[129];
    fa = $[130];
  }
  zt(Pi, fa);
  let requestDialog = scope.requestDialog;
  let td;
  if ($[131] !== requestDialog || $[132] !== turn.loading || $[133] !== turn.tasks) {
    td = {
      requestDialog,
      turnActivity: turn.loading,
      tasks: turn.tasks,
    };
    $[131] = requestDialog;
    $[132] = turn.loading;
    $[133] = turn.tasks;
    $[134] = td;
  } else td = $[134];
  let dialogSurface = td;
  let Ad;
  if (
    $[135] !== addNotification ||
    $[136] !== mainLoopModel ||
    $[137] !== presentation ||
    $[138] !== requestDialog ||
    $[139] !== session ||
    $[140] !== setAppState ||
    $[141] !== storageV5 ||
    $[142] !== store ||
    $[143] !== transcript.getSnapshot ||
    $[144] !== turn.guard ||
    $[145] !== turn.loading
  ) {
    Ad = () =>
      new StartupNudges({
        session,
        presentation,
        store,
        setAppState,
        requestDialog,
        addNotification,
        storageV5,
        getMessages: transcript.getSnapshot,
        getIsResponseStreaming: () => turn.guard.isRunning,
        turnActivity: turn.loading,
        mainLoopModel,
      });
    $[135] = addNotification;
    $[136] = mainLoopModel;
    $[137] = presentation;
    $[138] = requestDialog;
    $[139] = session;
    $[140] = setAppState;
    $[141] = storageV5;
    $[142] = store;
    $[143] = transcript.getSnapshot;
    $[144] = turn.guard;
    $[145] = turn.loading;
    $[146] = Ad;
  } else Ad = $[146];
  let [contextualTips] = y(Ad);
  let md;
  let vp;
  if ($[147] !== contextualTips) {
    md = () => contextualTips.start();
    vp = [contextualTips];
    $[147] = contextualTips;
    $[148] = md;
    $[149] = vp;
  } else {
    md = $[148];
    vp = $[149];
  }
  P(md, vp);
  let recommendationGate = useSerialTaskRunner();
  useLspRecommendationWatcher(requestDialog, recommendationGate);
  useClaudeCodeHintRecommendation(requestDialog, recommendationGate);
  let localJsx = scope.localJsx;
  let hasLocalJsxOverlay = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let hasActiveLocalJsxUI = useDialogSelector(isLocalJsxHoldingQueue);
  let panelHidesPrompt = useHasOpenDialog();
  let Hc;
  if ($[150] !== scope || $[151] !== session || $[152] !== sessionController || $[153] !== store) {
    Hc = () =>
      new TerminalTitleController({
        session,
        store,
        sessionController,
        scope,
        disabled: env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE,
      });
    $[150] = scope;
    $[151] = session;
    $[152] = sessionController;
    $[153] = store;
    $[154] = Hc;
  } else Hc = $[154];
  let [titles] = y(Hc);
  let hasOpenDialog = useHasOpenDialog_2();
  let modalVisibility = LayoutOverflow();
  let readFileState = useDialogSelector(hasBlockingDialog);
  let Eu;
  let Rp;
  if ($[155] !== guard.isRunning) {
    Eu = () => guard.isRunning;
    Rp = () => guard.isRunning;
    $[155] = guard.isRunning;
    $[156] = Eu;
    $[157] = Rp;
  } else {
    Eu = $[156];
    Rp = $[157];
  }
  let isResponseRunning = yt(guard.subscribe, Eu, Rp);
  let cy = hasLocalJsxOverlay && !isResponseRunning;
  let panelHoldsQueue = hasActiveLocalJsxUI && !isResponseRunning;
  let dialogOverPanel = useHasBlockingDialog();
  let topAutoDialogKind = useTopAutoDialogKind();
  let isUltraplanChoiceShowing = blockingDialogKind === ULTRAPLAN_CHOICE_DIALOG_SPEC.kind;
  let Fg;
  if ($[158] !== blockingDialogKind) {
    Fg = isElicitationDialogKind_2(blockingDialogKind);
    $[158] = blockingDialogKind;
    $[159] = Fg;
  } else Fg = $[159];
  let elicitationShowing = Fg;
  let pinnedConsentShowing = isElicitationDialogKind(blockingDialogKind);
  let Mi;
  if ($[160] === MEMO_CACHE_SENTINEL) {
    Mi = mainAgentId();
    $[160] = Mi;
  } else Mi = $[160];
  let { messages } = transcriptMessagesStore(Mi);
  let Qa;
  if ($[161] !== localJsx || $[162] !== sessionController || $[163] !== turn) {
    Qa = () => {
      openRewindSelector({
        localJsx,
        turn,
        sessionController,
      });
    };
    $[161] = localJsx;
    $[162] = sessionController;
    $[163] = turn;
    $[164] = Qa;
  } else Qa = $[164];
  let openMessageSelector = Qa;
  let yl;
  if (
    $[165] !== addNotification ||
    $[166] !== clock ||
    $[167] !== credentials ||
    $[168] !== dialogStore ||
    $[169] !== remoteSessionConfig?.initialPromptUuid ||
    $[170] !== removeNotification ||
    $[171] !== storageV5 ||
    $[172] !== store ||
    $[173] !== terminal ||
    $[174] !== transcript.getSnapshot ||
    $[175] !== turn
  ) {
    yl = () =>
      new IdleReturnHint({
        turn,
        getMessages: transcript.getSnapshot,
        clock,
        now: Date.now,
        getLastInteractionTime,
        isDialogOnScreen: () => dialogStore.getState().open.length > 0,
        hasPendingLoopWakeup: hasLoopTask,
        hasArmedQuotaAutoResume: isQuotaAutoResumeArmed,
        backgroundAgents: {
          subscribe: store.subscribe,
          getSnapshot: () => hasAwaitableAgentTasks(store.getState().tasks),
        },
        getIdleNotifThresholdMs: selectIdleNotifThresholdMs,
        sendIdleNotification: () => {
          notifyAsync(
            {
              message: "Claude is waiting for your input",
              notificationType: "idle_prompt",
            },
            terminal,
            {
              storageV5,
              credentials,
            },
          );
        },
        addNotification,
        removeNotification,
        hasSeededRemotePrompt: remoteSessionConfig?.initialPromptUuid !== undefined,
      });
    $[165] = addNotification;
    $[166] = clock;
    $[167] = credentials;
    $[168] = dialogStore;
    $[169] = remoteSessionConfig?.initialPromptUuid;
    $[170] = removeNotification;
    $[171] = storageV5;
    $[172] = store;
    $[173] = terminal;
    $[174] = transcript.getSnapshot;
    $[175] = turn;
    $[176] = yl;
  } else yl = $[176];
  let [idleNudge] = y(yl);
  let Bh;
  let Hh;
  if ($[177] !== hasLocalJsxOverlay || $[178] !== hasToolProgress || $[179] !== idleNudge) {
    Bh = () => {
      idleNudge.setLocalOverlayShowing(hasToolProgress || hasLocalJsxOverlay);
    };
    Hh = [idleNudge, hasToolProgress, hasLocalJsxOverlay];
    $[177] = hasLocalJsxOverlay;
    $[178] = hasToolProgress;
    $[179] = idleNudge;
    $[180] = Bh;
    $[181] = Hh;
  } else {
    Bh = $[180];
    Hh = $[181];
  }
  P(Bh, Hh);
  let ES;
  if ($[182] !== isThinClient || $[183] !== messageQueue || $[184] !== turn.guard) {
    ES = () =>
      isPollEventIngressActive() && !isThinClient
        ? new PollEventIdleDelivery({
            queue: messageQueue,
            guard: turn.guard,
          })
        : null;
    $[182] = isThinClient;
    $[183] = messageQueue;
    $[184] = turn.guard;
    $[185] = ES;
  } else ES = $[185];
  let [pollEventDelivery] = y(ES);
  let dm;
  if ($[186] !== turnEventTail.enqueue) {
    dm = {
      begin: randomUUID,
      enqueue: turnEventTail.enqueue,
    };
    $[186] = turnEventTail.enqueue;
    $[187] = dm;
  } else dm = $[187];
  let turnEvents = dm;
  let uy;
  let Wh;
  if ($[188] !== turn) {
    uy = () => {
      let updated = onQuotaResumeEvent((prev) => {
        if (prev === "armed" || prev === "rearmed") turn.retractRateLimitAutoContinue();
      });
      let updated_2 = onLowPriorityEvent((msg) => {
        if (msg.type === "accepted") turn.retractRateLimitAutoContinue();
      });
      let removedNotifications = onResetFlowEvent((cmd) => {
        if (cmd.type === "reset") turn.retractRateLimitAutoContinue();
      });
      let systemPrompt = onUsageCreditEvent((Dd) => {
        if (Dd.type === "reset") turn.retractRateLimitAutoContinue();
      });
      return () => {
        updated();
        updated_2();
        removedNotifications();
        systemPrompt();
      };
    };
    Wh = [turn];
    $[188] = turn;
    $[189] = uy;
    $[190] = Wh;
  } else {
    uy = $[189];
    Wh = $[190];
  }
  P(uy, Wh);
  let Mf;
  if (
    $[191] !== clock ||
    $[192] !== credentials ||
    $[193] !== dialogStore ||
    $[194] !== draft.value ||
    $[195] !== fleetNudgeStore ||
    $[196] !== messageQueue ||
    $[197] !== remoteSessionConfig ||
    $[198] !== requestDialog ||
    $[199] !== scope ||
    $[200] !== session ||
    $[201] !== setAppState ||
    $[202] !== storageV5 ||
    $[203] !== store ||
    $[204] !== taskRegistry ||
    $[205] !== titles ||
    $[206] !== transcript ||
    $[207] !== turn
  ) {
    Mf = () =>
      new BackgroundGesture({
        store,
        setAppState,
        transcript,
        turn,
        messageQueue,
        session,
        taskRegistry,
        storageV5,
        credentials,
        fleetNudgeStore,
        clock,
        now: Date.now,
        getInputValue: () => draft.value,
        dialogStore,
        requestDialog,
        titles,
        scope,
        isCloudSession: remoteSessionConfig !== undefined,
        leaveEndsProcess: remoteSessionConfig?.leaveEndsProcess === true,
      });
    $[191] = clock;
    $[192] = credentials;
    $[193] = dialogStore;
    $[194] = draft.value;
    $[195] = fleetNudgeStore;
    $[196] = messageQueue;
    $[197] = remoteSessionConfig;
    $[198] = requestDialog;
    $[199] = scope;
    $[200] = session;
    $[201] = setAppState;
    $[202] = storageV5;
    $[203] = store;
    $[204] = taskRegistry;
    $[205] = titles;
    $[206] = transcript;
    $[207] = turn;
    $[208] = Mf;
  } else Mf = $[208];
  let [gesture] = y(Mf);
  let ig;
  if (
    $[209] !== clock ||
    $[210] !== dialogStore ||
    $[211] !== messageQueue ||
    $[212] !== session ||
    $[213] !== spinnerStore ||
    $[214] !== store ||
    $[215] !== taskRegistry ||
    $[216] !== transcript ||
    $[217] !== turn
  ) {
    ig = () =>
      new QueuedSendNowController({
        turn,
        messageQueue,
        transcript,
        store,
        session,
        taskRegistry,
        spinnerStore,
        dialogStore,
        clock,
      });
    $[209] = clock;
    $[210] = dialogStore;
    $[211] = messageQueue;
    $[212] = session;
    $[213] = spinnerStore;
    $[214] = store;
    $[215] = taskRegistry;
    $[216] = transcript;
    $[217] = turn;
    $[218] = ig;
  } else ig = $[218];
  let [lowLatency] = y(ig);
  let Fx;
  if ($[219] !== sessionController || $[220] !== setAppState) {
    Fx = (event) => {
      setAppState(resetTransientUiState);
      sessionController.applyConversationReset(event);
    };
    $[219] = sessionController;
    $[220] = setAppState;
    $[221] = Fx;
  } else Fx = $[221];
  let applyLocalConversationReset = Fx;
  const adoptRateLimits = !isEmbedded;
  let Fi;
  if (
    $[222] !== applyLocalConversationReset ||
    $[223] !== directConnectConfig ||
    $[224] !== idleNudge ||
    $[225] !== remoteSessionConfig ||
    $[226] !== scope ||
    $[227] !== sessionController.applyConversationReset ||
    $[228] !== spinnerStore.main ||
    $[229] !== sshSession ||
    $[230] !== adoptRateLimits ||
    $[231] !== transcript ||
    $[232] !== turn
  ) {
    Fi = {
      remoteSessionConfig,
      directConnectConfig,
      sshSession,
      adoptRateLimits,
      transcript,
      turn,
      idleNudge,
      scope,
      spinner: spinnerStore.main,
      applyConversationReset: sessionController.applyConversationReset,
      applyLocalConversationReset,
    };
    $[222] = applyLocalConversationReset;
    $[223] = directConnectConfig;
    $[224] = idleNudge;
    $[225] = remoteSessionConfig;
    $[226] = scope;
    $[227] = sessionController.applyConversationReset;
    $[228] = spinnerStore.main;
    $[229] = sshSession;
    $[230] = adoptRateLimits;
    $[231] = transcript;
    $[232] = turn;
    $[233] = Fi;
  } else Fi = $[233];
  let { transport, activeRemote, cancellableExternalLoading } = useRemoteTransport(Fi);
  let dd;
  if (
    $[234] !== clock ||
    $[235] !== dialogStore ||
    $[236] !== isQueryDisabled ||
    $[237] !== isDisabled ||
    $[238] !== isEmbedded ||
    $[239] !== idleNudge ||
    $[240] !== isThinClient ||
    $[241] !== sessionController ||
    $[242] !== store ||
    $[243] !== transcript ||
    $[244] !== turn
  ) {
    dd = () =>
      new ColdCacheWatcher({
        turn,
        isTurnActive: () => turn.guard.isActive,
        clock,
        now: Date.now,
        getLastInteractionTime,
        isEnabled: () =>
          isColdCacheWatchEnabled({
            disabled: isDisabled,
            disableQuery: isQueryDisabled,
            embedded: isEmbedded,
            isThinClient,
          }),
        expectedMissAt: () => promptCacheExpiresAt(transcript.getSnapshot()),
        isDialogOnScreen: () => dialogStore.getState().open.length > 0,
        hasPendingLoopWakeup: hasLoopTask,
        hasArmedQuotaAutoResume: isQuotaAutoResumeArmed,
        hasBackgroundAgents: () => hasAwaitableAgentTasks(store.getState().tasks),
        pastUsageLimitUntil: isRateLimitRejected,
        evaluate: () => sessionController.evaluateIdleCacheQuota(),
        ask: (newMessage) => sessionController.askIdleCacheQuota(newMessage),
        setIdleHintSuppressed: (old) => idleNudge.setHintSuppressed(old),
      });
    $[234] = clock;
    $[235] = dialogStore;
    $[236] = isQueryDisabled;
    $[237] = isDisabled;
    $[238] = isEmbedded;
    $[239] = idleNudge;
    $[240] = isThinClient;
    $[241] = sessionController;
    $[242] = store;
    $[243] = transcript;
    $[244] = turn;
    $[245] = dd;
  } else dd = $[245];
  let [idleCacheQuota] = y(dd);
  let zp;
  if ($[246] !== messages || $[247] !== screen || $[248] !== turn) {
    zp = {
      turn,
      messages,
      screen,
    };
    $[246] = messages;
    $[247] = screen;
    $[248] = turn;
    $[249] = zp;
  } else zp = $[249];
  let { hasDisplayedStreamingText, tailBlank, focusFoldHoldsPreview } = TurnSpinnerRow(zp);
  let axBell = useScreenReaderBell();
  let isBashesDialogOpen = useStoreSelector(chrome, selectHasBashesDialog);
  let hasIdeOverlay = useDialogOfKind(ULTRAPLAN_CHOICE_DIALOG_SPEC.kind);
  let Jl;
  let Cu;
  if ($[250] !== isBashesDialogOpen || $[251] !== chrome || $[252] !== hasIdeOverlay) {
    Jl = () => {
      if (hasIdeOverlay && isBashesDialogOpen) chrome.closeBashesDialog();
    };
    Cu = [hasIdeOverlay, isBashesDialogOpen, chrome];
    $[250] = isBashesDialogOpen;
    $[251] = chrome;
    $[252] = hasIdeOverlay;
    $[253] = Jl;
    $[254] = Cu;
  } else {
    Jl = $[253];
    Cu = $[254];
  }
  P(Jl, Cu);
  let [theme] = useTheme();
  let mainIsBusy =
    userInputOnProcessing || turn.isMainLoopBusy || messageQueue.getMainThreadQueueLength() > 0;
  let g_;
  if ($[255] !== conversationId || $[256] !== mainIsBusy) {
    g_ = {
      mainConversationId: conversationId,
      mainIsBusy,
    };
    $[255] = conversationId;
    $[256] = mainIsBusy;
    $[257] = g_;
  } else g_ = $[257];
  let focused = useViewedAgentTranscript(g_);
  let Hx;
  if (
    $[258] !== focusFoldHoldsPreview ||
    $[259] !== focused.isLoading ||
    $[260] !== readFileState ||
    $[261] !== hasDisplayedStreamingText ||
    $[262] !== isBriefOnly ||
    $[263] !== cy ||
    $[264] !== chromeClients ||
    $[265] !== tailBlank ||
    $[266] !== toolProgress
  ) {
    Hx =
      !hasVisibleProgress(toolProgress) &&
      !readFileState &&
      !cy &&
      focused.isLoading &&
      true &&
      !chromeClients &&
      (!hasDisplayedStreamingText || tailBlank || isBriefOnly || focusFoldHoldsPreview);
    $[258] = focusFoldHoldsPreview;
    $[259] = focused.isLoading;
    $[260] = readFileState;
    $[261] = hasDisplayedStreamingText;
    $[262] = isBriefOnly;
    $[263] = cy;
    $[264] = chromeClients;
    $[265] = tailBlank;
    $[266] = toolProgress;
    $[267] = Hx;
  } else Hx = $[267];
  let showSpinner = Hx;
  useBackgroundAskEmitter();
  useBackgroundQuestionAnswer();
  let tw;
  if ($[268] !== scope || $[269] !== store || $[270] !== transport || $[271] !== turn) {
    tw = {
      turn,
      scope,
      store,
      transport,
    };
    $[268] = scope;
    $[269] = store;
    $[270] = transport;
    $[271] = turn;
    $[272] = tw;
  } else tw = $[272];
  useBridgeImmediateCommands(tw);
  let Ux;
  let ow;
  if (
    $[273] !== gesture ||
    $[274] !== idleCacheQuota ||
    $[275] !== idleNudge ||
    $[276] !== lowLatency ||
    $[277] !== pollEventDelivery ||
    $[278] !== scrollPin ||
    $[279] !== titles
  ) {
    Ux = () => {
      titles.connect();
      pollEventDelivery?.connect();
      return () => {
        idleNudge.dispose();
        idleCacheQuota.dispose();
        pollEventDelivery?.dispose();
        gesture.dispose();
        lowLatency.dispose();
        titles.dispose();
        scrollPin.dispose();
      };
    };
    ow = [idleNudge, idleCacheQuota, pollEventDelivery, gesture, lowLatency, titles, scrollPin];
    $[273] = gesture;
    $[274] = idleCacheQuota;
    $[275] = idleNudge;
    $[276] = lowLatency;
    $[277] = pollEventDelivery;
    $[278] = scrollPin;
    $[279] = titles;
    $[280] = Ux;
    $[281] = ow;
  } else {
    Ux = $[280];
    ow = $[281];
  }
  P(Ux, ow);
  let [surveySlot] = y(createSurveySlotStore);
  let S_;
  if ($[282] !== autoConnectIdeFlag || $[283] !== requestDialog || $[284] !== scope.addAutoConnectedIde) {
    S_ = {
      autoConnectIdeFlag,
      onAutoConnectIde: scope.addAutoConnectedIde,
      requestDialog,
    };
    $[282] = autoConnectIdeFlag;
    $[283] = requestDialog;
    $[284] = scope.addAutoConnectedIde;
    $[285] = S_;
  } else S_ = $[285];
  let { installationStatus, installExtension } = useIDEIntegration(S_);
  let $x;
  if ($[286] !== setAppState) {
    $x = (fileHistoryState) =>
      setAppState((prev) => ({
        ...prev,
        fileHistory: fileHistoryState,
      }));
    $[286] = setAppState;
    $[287] = $x;
  } else $x = $[287];
  useAwaySummaryOnce(initialFileHistorySnapshots, $x);
  let Vx;
  let RE;
  if ($[288] !== sessionController) {
    Vx = () => sessionController.start();
    RE = [sessionController];
    $[288] = sessionController;
    $[289] = Vx;
    $[290] = RE;
  } else {
    Vx = $[289];
    RE = $[290];
  }
  P(Vx, RE);
  let exitState = useStoreSelector(chrome, isExiting);
  let hasTeamModal = useHasModalDialog();
  let isModalOpen = useHasModalUserDialog();
  let dialogSelector = useDialogSelector(hasAutoDialogWithoutMeta);
  let hasSuppressedDialogs = isDialogActive && dialogSelector;
  let qk;
  let PE;
  if (
    $[291] !== chrome ||
    $[292] !== debug ||
    $[293] !== isEmbedded ||
    $[294] !== hasSuppressedDialogs ||
    $[295] !== shouldHideLoginNotice ||
    $[296] !== onDetachToCaller
  ) {
    qk = () => {
      chrome.setView({
        debug,
        embedded: isEmbedded,
        onDetachToCaller,
        hasSuppressedDialogs,
        hideLoginNotice: shouldHideLoginNotice,
      });
    };
    PE = [chrome, debug, isEmbedded, onDetachToCaller, hasSuppressedDialogs, shouldHideLoginNotice];
    $[291] = chrome;
    $[292] = debug;
    $[293] = isEmbedded;
    $[294] = hasSuppressedDialogs;
    $[295] = shouldHideLoginNotice;
    $[296] = onDetachToCaller;
    $[297] = qk;
    $[298] = PE;
  } else {
    qk = $[297];
    PE = $[298];
  }
  zt(qk, PE);
  let b_;
  let $k;
  if ($[299] !== pauseAnimation) {
    b_ = () => {
      setBlockingToolProgress(pauseAnimation);
      return setPauseAnimation;
    };
    $k = [pauseAnimation];
    $[299] = pauseAnimation;
    $[300] = b_;
    $[301] = $k;
  } else {
    b_ = $[300];
    $k = $[301];
  }
  zt(b_, $k);
  let Gx;
  if (
    $[302] !== addNotification ||
    $[303] !== chrome ||
    $[304] !== dialogStore ||
    $[305] !== draft ||
    $[306] !== idleNudge ||
    $[307] !== lowLatency ||
    $[308] !== messageQueue ||
    $[309] !== presentation ||
    $[310] !== scope ||
    $[311] !== scrollPin ||
    $[312] !== session ||
    $[313] !== setAppState ||
    $[314] !== setSessionState ||
    $[315] !== spinnerStore ||
    $[316] !== storageV5 ||
    $[317] !== store ||
    $[318] !== taskRegistry ||
    $[319] !== transcript ||
    $[320] !== transport ||
    $[321] !== turn
  ) {
    Gx = () =>
      new PromptSubmitController({
        store,
        presentation,
        setAppState,
        setSessionState,
        session,
        storageV5,
        dialogStore,
        spinnerStore,
        taskRegistry,
        transcript,
        turn,
        draft,
        messageQueue,
        chrome,
        scope,
        idleNudge,
        transport,
        scrollPin,
        lowLatency,
        addNotification,
      });
    $[302] = addNotification;
    $[303] = chrome;
    $[304] = dialogStore;
    $[305] = draft;
    $[306] = idleNudge;
    $[307] = lowLatency;
    $[308] = messageQueue;
    $[309] = presentation;
    $[310] = scope;
    $[311] = scrollPin;
    $[312] = session;
    $[313] = setAppState;
    $[314] = setSessionState;
    $[315] = spinnerStore;
    $[316] = storageV5;
    $[317] = store;
    $[318] = taskRegistry;
    $[319] = transcript;
    $[320] = transport;
    $[321] = turn;
    $[322] = Gx;
  } else Gx = $[322];
  let [submitController] = y(Gx);
  let AE;
  if ($[323] !== cancelRef || $[324] !== submitController.cancelAndDrainPending) {
    AE = () => {
      if (cancelRef) cancelRef.current = submitController.cancelAndDrainPending;
    };
    $[323] = cancelRef;
    $[324] = submitController.cancelAndDrainPending;
    $[325] = AE;
  } else AE = $[325];
  let If;
  if ($[326] !== cancelRef || $[327] !== submitController) {
    If = [cancelRef, submitController];
    $[326] = cancelRef;
    $[327] = submitController;
    $[328] = If;
  } else If = $[328];
  P(AE, If);
  const isColdResumeQuotaShowing = blockingDialogKind === COLD_RESUME_QUOTA;
  let w_;
  if ($[329] !== dialogStore || $[330] !== draft || $[331] !== isColdResumeQuotaShowing) {
    w_ = jsxProd_default(useIdleReturnTypeThrough, {
      onScreen: isColdResumeQuotaShowing,
      dialogStore,
      draft,
    });
    $[329] = dialogStore;
    $[330] = draft;
    $[331] = isColdResumeQuotaShowing;
    $[332] = w_;
  } else w_ = $[332];
  let Vg;
  if (
    $[333] !== activeRemote.isRemoteMode ||
    $[334] !== cancellableExternalLoading ||
    $[335] !== chrome ||
    $[336] !== draft ||
    $[337] !== screen ||
    $[338] !== submitController ||
    $[339] !== transcript ||
    $[340] !== turn
  ) {
    Vg = jsxProd_default(PromptArea, {
      turn,
      transcript,
      draft,
      chrome,
      submitController,
      stoppableWork: undefined,
      screen,
      isExternalLoading: cancellableExternalLoading,
      sendsPromptsElsewhere: activeRemote.isRemoteMode,
    });
    $[333] = activeRemote.isRemoteMode;
    $[334] = cancellableExternalLoading;
    $[335] = chrome;
    $[336] = draft;
    $[337] = screen;
    $[338] = submitController;
    $[339] = transcript;
    $[340] = turn;
    $[341] = Vg;
  } else Vg = $[341];
  let k_;
  if ($[342] !== w_ || $[343] !== Vg) {
    k_ = jsxProd_default_2(Fragment, {
      children: [w_, Vg],
    });
    $[342] = w_;
    $[343] = Vg;
    $[344] = k_;
  } else k_ = $[344];
  let promptEffects = k_;
  let canUseTool = useCanUseToolReexport();
  let [mcpReconnectContext] = y(createNullContextStore);
  let C_;
  let Jp;
  if ($[345] !== scope) {
    C_ = () => {
      scope.connect();
      return () => scope.dispose();
    };
    Jp = [scope];
    $[345] = scope;
    $[346] = C_;
    $[347] = Jp;
  } else {
    C_ = $[346];
    Jp = $[347];
  }
  zt(C_, Jp);
  let T_;
  if ($[348] !== gesture.backgroundQuery) {
    T_ = {
      onBackgroundQuery: gesture.backgroundQuery,
    };
    $[348] = gesture.backgroundQuery;
    $[349] = T_;
  } else T_ = $[349];
  let { handleBackgroundSession } = useSessionBackgrounding(T_);
  let { markTurnStart, markTurnDone } = useSemanticPromptMarks();
  let lw;
  if ($[350] !== gesture || $[351] !== onDetachToCaller || $[352] !== transcript || $[353] !== turn) {
    lw = {
      gesture,
      turn,
      transcript,
      onDetachToCaller,
    };
    $[350] = gesture;
    $[351] = onDetachToCaller;
    $[352] = transcript;
    $[353] = turn;
    $[354] = lw;
  } else lw = $[354];
  useLeftArrowGesture(lw);
  let WS;
  if ($[355] !== guard.isRunning || $[356] !== storageV5 || $[357] !== transcript) {
    WS = () => {
      registerBeforeInteractiveShutdown(() =>
        relaunchForExit(
          transcript.getSnapshot(),
          {
            responseStreaming: guard.isRunning,
          },
          storageV5,
        ),
      );
    };
    $[355] = guard.isRunning;
    $[356] = storageV5;
    $[357] = transcript;
    $[358] = WS;
  } else WS = $[358];
  let ane;
  if ($[359] !== guard || $[360] !== storageV5 || $[361] !== transcript) {
    ane = [transcript, guard, storageV5];
    $[359] = guard;
    $[360] = storageV5;
    $[361] = transcript;
    $[362] = ane;
  } else ane = $[362];
  P(WS, ane);
  useExitCostReport(isTerminalInterested());
  let Xp;
  if ($[363] !== writePacer || $[364] !== sessionController || $[365] !== transcript || $[366] !== turn) {
    Xp = () =>
      writePacer
        ? {
            transcript,
            isWritePaced: writePacer.isDeferring,
            isRestored: (ref) => sessionController.isAsRestored(ref),
            isHeadPending: () => sessionController.headHooksPending,
            isResponseInFlight: () => turn.getSnapshot().isLoading,
          }
        : undefined;
    $[363] = writePacer;
    $[364] = sessionController;
    $[365] = transcript;
    $[366] = turn;
    $[367] = Xp;
  } else Xp = $[367];
  let [_0] = y(Xp);
  let ME;
  if ($[368] !== messages || $[369] !== sessionController) {
    ME = sessionController.isAsRestored(messages);
    $[368] = messages;
    $[369] = sessionController;
    $[370] = ME;
  } else ME = $[370];
  useLogMessages(messages, ME, isLoading, _0, headHooksPending);
  const spawnThinkingConfig = thinkingConfigExplicit ? thinkingConfig : undefined;
  let IE;
  if (
    $[371] !== appendSystemPrompt ||
    $[372] !== systemPrompt ||
    $[373] !== permissionRelays ||
    $[374] !== scope ||
    $[375] !== systemPromptSnapshot ||
    $[376] !== spawnThinkingConfig ||
    $[377] !== thinkingDisplayFlag ||
    $[378] !== transcript ||
    $[379] !== transport ||
    $[380] !== turn
  ) {
    IE = {
      turn,
      transcript,
      scope,
      permissionRelays,
      transport,
      spawnThinkingConfig,
      thinkingDisplayFlag,
      customSystemPrompt: systemPrompt,
      appendSystemPrompt,
      systemPromptSnapshot,
    };
    $[371] = appendSystemPrompt;
    $[372] = systemPrompt;
    $[373] = permissionRelays;
    $[374] = scope;
    $[375] = systemPromptSnapshot;
    $[376] = spawnThinkingConfig;
    $[377] = thinkingDisplayFlag;
    $[378] = transcript;
    $[379] = transport;
    $[380] = turn;
    $[381] = IE;
  } else IE = $[381];
  let { sendBridgeResult, stampBridgeReply } = ReplBridgeConnector(IE);
  let { columns, rows } = useTerminalSize();
  let EE;
  if (
    $[382] !== activePlugins ||
    $[383] !== activeRemote ||
    $[384] !== addNotification ||
    $[385] !== appendSystemPrompt ||
    $[386] !== applyLocalConversationReset ||
    $[387] !== axBell ||
    $[388] !== briefTranscript ||
    $[389] !== canUseTool ||
    $[390] !== chrome ||
    $[391] !== credentials ||
    $[392] !== systemPrompt ||
    $[393] !== debug ||
    $[394] !== dialogStore ||
    $[395] !== isQueryDisabled ||
    $[396] !== isDisabled ||
    $[397] !== draft ||
    $[398] !== elicitationShowing ||
    $[399] !== fallbackModel ||
    $[400] !== isFullscreen ||
    $[401] !== gesture ||
    $[402] !== buildToolUseContext ||
    $[403] !== installationStatus ||
    $[404] !== ideSelection ||
    $[405] !== installExtension ||
    $[406] !== isBriefOnly ||
    $[407] !== isThinClient ||
    $[408] !== mainLoopModel ||
    $[409] !== markTurnDone ||
    $[410] !== markTurnStart ||
    $[411] !== messageQueue ||
    $[412] !== onBeforeQuery ||
    $[413] !== onCaptureSnapshot ||
    $[414] !== openMessageSelector ||
    $[415] !== onTurnComplete ||
    $[416] !== permissionRelays ||
    $[417] !== presentation ||
    $[418] !== removeNotification ||
    $[419] !== scope ||
    $[420] !== screen ||
    $[421] !== scrollPin.reveal ||
    $[422] !== scrollPin.rowHolding ||
    $[423] !== sendBridgeResult ||
    $[424] !== session ||
    $[425] !== sessionController ||
    $[426] !== sessionHooks ||
    $[427] !== setAppState ||
    $[428] !== setSessionState ||
    $[429] !== spinnerStore ||
    $[430] !== stampBridgeReply ||
    $[431] !== storageV5 ||
    $[432] !== store ||
    $[433] !== submitController ||
    $[434] !== systemPromptSnapshot ||
    $[435] !== taskRegistry ||
    $[436] !== teammateColors_2 ||
    $[437] !== terminal ||
    $[438] !== columns ||
    $[439] !== theme ||
    $[440] !== thinkingConfig ||
    $[441] !== thinkingDisplayFlag ||
    $[442] !== titles ||
    $[443] !== transcript ||
    $[444] !== transport ||
    $[445] !== turnEvents ||
    $[446] !== turn
  ) {
    EE = () => {
      transport.bindHost({
        mainLoopModel,
        addNotification,
      });
      submitController.bindHost({
        mainLoopModel,
        canUseTool,
        onBeforeQuery,
      });
      sessionController.bindHost({
        mainLoopModel,
        canUseTool,
        addNotification,
        removeNotification,
        onSubmit: submitController.submit,
      });
      chrome.bindHost({
        openMessageSelector,
      });
      scope.bindHost({
        mainLoopModel,
        canUseTool,
        getMessages: transcript.getSnapshot,
        conversation: transcript.conversation,
        buildToolUseContext,
        addNotification,
        removeNotification,
        terminal,
        compact: sessionController.compactConversation,
        readDraft: submitController.readDraft,
        fillDraft: submitController.fillDraft,
        paintDraft: draft.paintLayer,
        forgetPaint: draft.dropLayer,
        attributeDraft: draft.attribute,
        suggestDraft: submitController.suggestDraft,
        revealInTranscript: scrollPin.reveal,
        rowHoldingSelection: scrollPin.rowHolding,
        stacksToasts: isFullscreen,
      });
      gesture.bindHost({
        mainLoopModel,
        customSystemPrompt: systemPrompt,
        appendSystemPrompt,
        canUseTool,
        fallbackModel,
      });
      turn.bindHost({
        store,
        setAppState,
        setSessionState,
        activePlugins,
        session,
        transcript,
        storageV5,
        credentials,
        spinnerStore,
        taskRegistry,
        sessionHooks,
        teammateColors: teammateColors_2,
        messageQueue,
        dialogStore,
        addNotification,
        scope,
        canUseTool,
        debug,
        fallbackModel,
        thinkingConfig,
        thinkingDisplayFlag,
        ideInstallationStatus: installationStatus,
        disabled: isDisabled,
        resolveCommandDialog,
        theme,
        customSystemPrompt: systemPrompt,
        appendSystemPrompt,
        systemPromptSnapshot,
        permissionRelays,
        installIDEExtension: installExtension,
        resume: sessionController.resume,
        markConversationRemote: sessionController.markConversationRemote,
        applyConversationReset: applyLocalConversationReset,
        bumpConversationId: sessionController.bumpConversationId,
        openMessageSelector: chrome.openMessageSelector,
        onTurnComplete,
        onCaptureSnapshot,
        markTurnStart,
        markTurnDone,
        columns,
        streamingPreviewHold: spinnerPlacement(screen, isBriefOnly, briefTranscript, presentation),
        sendBridgeResult,
        stampBridgeReply,
        terminal,
        axBell,
        restoreMessageSync: sessionController.restoreMessageSync,
        draft,
        isThinClient,
        titles,
        setHaikuTitle: sessionController.setHaikuTitle,
        activeRemote,
        elicitationShowing,
        gesture,
        turnEvents,
        mainLoopModel,
        onBeforeQuery,
        disableQuery: isQueryDisabled,
        deferSlashToEngine: isCompactCommand,
        ideSelection,
        consumeIdeSelection: chrome.consumeIdeSelection,
        recordIdeSelectionConsumedBy: chrome.recordIdeSelectionConsumedBy,
        restoreIdeSelectionConsumedBy: chrome.restoreIdeSelectionConsumedBy,
        onSubmit: submitController.submit,
        awaitPendingHooks: sessionController.awaitPendingHooks,
        deferHookMessages: sessionController.deferHookMessages,
        releaseDeferredHookMessages: sessionController.releasePendingHookMessages,
        adoptedPrefillRef: sessionController.adoptedPrefillRef,
      });
    };
    $[382] = activePlugins;
    $[383] = activeRemote;
    $[384] = addNotification;
    $[385] = appendSystemPrompt;
    $[386] = applyLocalConversationReset;
    $[387] = axBell;
    $[388] = briefTranscript;
    $[389] = canUseTool;
    $[390] = chrome;
    $[391] = credentials;
    $[392] = systemPrompt;
    $[393] = debug;
    $[394] = dialogStore;
    $[395] = isQueryDisabled;
    $[396] = isDisabled;
    $[397] = draft;
    $[398] = elicitationShowing;
    $[399] = fallbackModel;
    $[400] = isFullscreen;
    $[401] = gesture;
    $[402] = buildToolUseContext;
    $[403] = installationStatus;
    $[404] = ideSelection;
    $[405] = installExtension;
    $[406] = isBriefOnly;
    $[407] = isThinClient;
    $[408] = mainLoopModel;
    $[409] = markTurnDone;
    $[410] = markTurnStart;
    $[411] = messageQueue;
    $[412] = onBeforeQuery;
    $[413] = onCaptureSnapshot;
    $[414] = openMessageSelector;
    $[415] = onTurnComplete;
    $[416] = permissionRelays;
    $[417] = presentation;
    $[418] = removeNotification;
    $[419] = scope;
    $[420] = screen;
    $[421] = scrollPin.reveal;
    $[422] = scrollPin.rowHolding;
    $[423] = sendBridgeResult;
    $[424] = session;
    $[425] = sessionController;
    $[426] = sessionHooks;
    $[427] = setAppState;
    $[428] = setSessionState;
    $[429] = spinnerStore;
    $[430] = stampBridgeReply;
    $[431] = storageV5;
    $[432] = store;
    $[433] = submitController;
    $[434] = systemPromptSnapshot;
    $[435] = taskRegistry;
    $[436] = teammateColors_2;
    $[437] = terminal;
    $[438] = columns;
    $[439] = theme;
    $[440] = thinkingConfig;
    $[441] = thinkingDisplayFlag;
    $[442] = titles;
    $[443] = transcript;
    $[444] = transport;
    $[445] = turnEvents;
    $[446] = turn;
    $[447] = EE;
  } else EE = $[447];
  zt(EE);
  let A_;
  if (
    $[448] !== commands_2 ||
    $[449] !== gesture.handOverInFlight ||
    $[450] !== hasActiveLocalJsxUI ||
    $[451] !== turn
  ) {
    A_ = {
      turn,
      hasActiveLocalJsxUI,
      commands: commands_2,
      handOverInFlight: gesture.handOverInFlight,
    };
    $[448] = commands_2;
    $[449] = gesture.handOverInFlight;
    $[450] = hasActiveLocalJsxUI;
    $[451] = turn;
    $[452] = A_;
  } else A_ = $[452];
  useQueueProcessor(A_);
  let blocksBtwReopen = hasOpenDialog || hasLocalJsxOverlay;
  let WK;
  if (
    $[453] !== blocksBtwReopen ||
    $[454] !== session.btwHistory ||
    $[455] !== store ||
    $[456] !== submitController ||
    $[457] !== turn
  ) {
    WK = () => {
      let btwHistory = session.btwHistory;
      btwHistory.setReopener(() => {
        if (store.getState().endedByModel) {
          return true;
        }
        if (blocksBtwReopen) {
          return false;
        }
        if (!turn.guard.isActive && turn.getSnapshot().isLoading) {
          return false;
        }
        submitController
          .submit("/btw", NOOP_HELPERS, {
            fromKeybinding: true,
            inputModeOverride: "prompt",
            leavesIdeSelection: true,
          })
          .catch(logError);
        return true;
      });
      return () => btwHistory.setReopener(null);
    };
    $[453] = blocksBtwReopen;
    $[454] = session.btwHistory;
    $[455] = store;
    $[456] = submitController;
    $[457] = turn;
    $[458] = WK;
  } else WK = $[458];
  let DE;
  if (
    $[459] !== blocksBtwReopen ||
    $[460] !== session ||
    $[461] !== store ||
    $[462] !== submitController ||
    $[463] !== turn
  ) {
    DE = [session, submitController, blocksBtwReopen, store, turn];
    $[459] = blocksBtwReopen;
    $[460] = session;
    $[461] = store;
    $[462] = submitController;
    $[463] = turn;
    $[464] = DE;
  } else DE = $[464];
  P(WK, DE);
  let OE;
  if (
    $[465] !== dialogStore ||
    $[466] !== isDisabled ||
    $[467] !== dynamicMcpConfig_2 ||
    $[468] !== hasOpenDialog ||
    $[469] !== installationStatus ||
    $[470] !== isRemoteSession ||
    $[471] !== mainLoopModel ||
    $[472] !== mergedMcpClients ||
    $[473] !== requestDialog ||
    $[474] !== screen ||
    $[475] !== scrollPin.isAtBottom ||
    $[476] !== submitController.submit ||
    $[477] !== transcript ||
    $[478] !== turn
  ) {
    OE = {
      mainLoopModel,
      mcpClients: mergedMcpClients,
      ideInstallationStatus: installationStatus,
      dynamicMcpConfig: dynamicMcpConfig_2,
      turn,
      transcript,
      requestDialog,
      dialogStore,
      hasOpenDialog,
      submitPrompt: submitController.submit,
      screen,
      disabled: isDisabled,
      isRemoteSession,
      isTranscriptAtBottom: scrollPin.isAtBottom,
    };
    $[465] = dialogStore;
    $[466] = isDisabled;
    $[467] = dynamicMcpConfig_2;
    $[468] = hasOpenDialog;
    $[469] = installationStatus;
    $[470] = isRemoteSession;
    $[471] = mainLoopModel;
    $[472] = mergedMcpClients;
    $[473] = requestDialog;
    $[474] = screen;
    $[475] = scrollPin.isAtBottom;
    $[476] = submitController.submit;
    $[477] = transcript;
    $[478] = turn;
    $[479] = OE;
  } else OE = $[479];
  let idleThresholdMin = useStartupNotifications(OE);
  useEffectSlots(STARTUP_NOTIFICATION_SPECS, idleThresholdMin);
  const swarmEnabled = renderWithForceUpdate(isAgentSwarmsEnabled) && !isRemoteSession;
  const visibleDialogKind = topAutoDialogKind ?? (hasActiveLocalJsxUI ? LOCAL_JSX_DIALOG.kind : undefined);
  let props_2;
  if (
    $[480] !== isLoading ||
    $[481] !== requestDialog ||
    $[482] !== swarmEnabled ||
    $[483] !== visibleDialogKind ||
    $[484] !== turn.submitIncomingPrompt
  ) {
    props_2 = {
      enabled: swarmEnabled,
      isLoading,
      visibleDialogKind,
      onSubmitMessage: turn.submitIncomingPrompt,
      requestDialog,
    };
    $[480] = isLoading;
    $[481] = requestDialog;
    $[482] = swarmEnabled;
    $[483] = visibleDialogKind;
    $[484] = turn.submitIncomingPrompt;
    $[485] = props_2;
  } else props_2 = $[485];
  useInboxPollerHook(props_2);
  useMailboxBridge(turn);
  let assistantMode = env.CLAUDE_CODE_PROACTIVE;
  let jK;
  if (
    $[486] !== isLoading ||
    $[487] !== sessionController.runsNoModelTurn ||
    $[488] !== storageV5 ||
    $[489] !== transcript
  ) {
    jK = {
      isLoading,
      assistantMode,
      transcript,
      storageV5,
      disabled: sessionController.runsNoModelTurn,
    };
    $[486] = isLoading;
    $[487] = sessionController.runsNoModelTurn;
    $[488] = storageV5;
    $[489] = transcript;
    $[490] = jK;
  } else jK = $[490];
  useScheduledTasks(jK);
  let zx;
  if ($[491] !== isLoading || $[492] !== transcript) {
    zx = {
      isLoading,
      transcript,
    };
    $[491] = isLoading;
    $[492] = transcript;
    $[493] = zx;
  } else zx = $[493];
  let tokenWarningState = useUsageLimitNotices(zx);
  let A0;
  if ($[494] === MEMO_CACHE_SENTINEL) {
    A0 = [];
    $[494] = A0;
  } else A0 = $[494];
  P(noop_6, A0);
  let Yx;
  if ($[495] === MEMO_CACHE_SENTINEL) {
    Yx = [];
    $[495] = Yx;
  } else Yx = $[495];
  P(noop_7, Yx);
  let suspendKey = useSuspendResume();
  let virtualScrollActive = isFullscreen && !CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let GS = columns;
  let I_;
  if (
    $[496] !== dialogSurface ||
    $[497] !== draft ||
    $[498] !== isEmbedded ||
    $[499] !== gesture ||
    $[500] !== localJsx ||
    $[501] !== screen ||
    $[502] !== scrollPin ||
    $[503] !== titles ||
    $[504] !== transcript ||
    $[505] !== turn
  ) {
    I_ = {
      embedded: isEmbedded,
      screen,
      turn,
      transcript,
      titles,
      localJsx,
      dialogSurface,
      attachRequests: gesture,
      draft,
      scrollPin,
    };
    $[496] = dialogSurface;
    $[497] = draft;
    $[498] = isEmbedded;
    $[499] = gesture;
    $[500] = localJsx;
    $[501] = screen;
    $[502] = scrollPin;
    $[503] = titles;
    $[504] = transcript;
    $[505] = turn;
    $[506] = I_;
  } else I_ = $[506];
  let screenFrameProps = I_;
  let NE;
  if (
    $[507] !== isRemoteSession ||
    $[508] !== localJsx ||
    $[509] !== surveySlot ||
    $[510] !== transcript ||
    $[511] !== turn
  ) {
    NE = jsxProd_default(SurveyStatePublisher, {
      turn,
      transcript,
      isRemoteSession,
      slot: surveySlot,
      localJsx,
    });
    $[507] = isRemoteSession;
    $[508] = localJsx;
    $[509] = surveySlot;
    $[510] = transcript;
    $[511] = turn;
    $[512] = NE;
  } else NE = $[512];
  let qK = NE;
  let Tc;
  if (
    $[513] !== chrome ||
    $[514] !== initialMessages ||
    $[515] !== isRemoteSession ||
    $[516] !== mergedMcpClients
  ) {
    Tc = jsxProd_default(ReplEffects, {
      chrome,
      mcpClients: mergedMcpClients,
      initialMessages,
      isRemoteSession,
    });
    $[513] = chrome;
    $[514] = initialMessages;
    $[515] = isRemoteSession;
    $[516] = mergedMcpClients;
    $[517] = Tc;
  } else Tc = $[517];
  let $K = Tc;
  let um;
  if (
    $[518] !== $K ||
    $[519] !== dynamicMcpConfig_2 ||
    $[520] !== permissionRelays ||
    $[521] !== requestDialog ||
    $[522] !== mcpReconnectContext ||
    $[523] !== isStrictMcpConfig ||
    $[524] !== qK
  ) {
    um = function cw(children) {
      return jsxProd_default_2(Fragment, {
        children: [
          qK,
          null,
          jsxProd_default(MCPConnectionManager, {
            dynamicMcpConfig: dynamicMcpConfig_2,
            isStrictMcpConfig,
            permissionRelays,
            requestDialog,
            children: jsxProd_default(BRIDGE_PLACED_KEYS_CONTEXT.Provider, {
              value: mcpReconnectContext,
              children,
            }),
          }),
          $K,
          null,
        ],
      });
    };
    $[518] = $K;
    $[519] = dynamicMcpConfig_2;
    $[520] = permissionRelays;
    $[521] = requestDialog;
    $[522] = mcpReconnectContext;
    $[523] = isStrictMcpConfig;
    $[524] = qK;
    $[525] = um;
  } else um = $[525];
  let wrapWithProviders = um;
  getViewedTeammateTask_2();
  useAgentsHintExpiry();
  let diffSidebarEnabled = useDiffSidebarState();
  let Yk = PaneDockNamespace.usePanesAtOnce(PaneDockNamespace.hasOpenPanes);
  let Jx = PaneDockNamespace.useDockColumns(GS);
  PaneDockNamespace.usePaneToastHold();
  PaneDockNamespace.useBarToasts();
  let W0;
  if (
    $[526] !== diffSidebarEnabled ||
    $[527] !== hasGitRepo ||
    $[528] !== focused.isMain ||
    $[529] !== isFullscreen ||
    $[530] !== isThinClient ||
    $[531] !== replTab ||
    $[532] !== GS
  ) {
    W0 =
      replTab === "diff" &&
      shouldShowDiffSidebar({
        enabled: diffSidebarEnabled,
        fullscreen: isFullscreen,
        columns: GS,
        isThinClient,
        isMainFocused: focused.isMain,
        hasGitRepo,
      })
        ? computeMaxDockColumns(GS)
        : 0;
    $[526] = diffSidebarEnabled;
    $[527] = hasGitRepo;
    $[528] = focused.isMain;
    $[529] = isFullscreen;
    $[530] = isThinClient;
    $[531] = replTab;
    $[532] = GS;
    $[533] = W0;
  } else W0 = $[533];
  let sidebarWidth = W0;
  let j0 = isFullscreen && sidebarWidth === 0 ? Jx : 0;
  let dockWidth = toastRegionWidth(Yk, j0, GS);
  let lne = screen === "transcript" ? 0 : sidebarWidth + dockWidth;
  useTerminalViewportNamespace.useTerminalViewport(columns, rows, lne);
  let Xx;
  if ($[534] !== diffSidebarEnabled) {
    Xx = (KK) => (diffSidebarEnabled ? KK.fileHistory.trackedFiles.size : 0);
    $[534] = diffSidebarEnabled;
    $[535] = Xx;
  } else Xx = $[535];
  let userMessage = useAppState(Xx);
  let autoOpenBaseline = useDiffAutoOpenBaseline(diffSidebarEnabled, userMessage);
  let dne;
  if ($[536] !== hasToolProgress || $[537] !== renderingTools || $[538] !== toolProgress) {
    dne = hasToolProgress
      ? jsxProd_default(InlineProgressList, {
          progress: toolProgress,
          tools: renderingTools,
        })
      : null;
    $[536] = hasToolProgress;
    $[537] = renderingTools;
    $[538] = toolProgress;
    $[539] = dne;
  } else dne = $[539];
  let Jk = dne;
  let scrollViewport = isEmbedded || (virtualScrollActive && !dumpMode) ? scrollPin.viewport : undefined;
  let UE = !isFullscreen && !isEmbedded && !isDecstbmRendererEnabled();
  let isTranscriptScreen = screen === "transcript";
  let V0;
  if (
    $[540] !== commands_2 ||
    $[541] !== dumpMode ||
    $[542] !== isEmbedded ||
    $[543] !== focused ||
    $[544] !== hideWelcomeChrome ||
    $[545] !== isRemoteSession ||
    $[546] !== renderingTools ||
    $[547] !== scrollPin.onUserScrollWithoutDivider ||
    $[548] !== scrollPin.revealRef ||
    $[549] !== Jk ||
    $[550] !== scrollViewport ||
    $[551] !== isTranscriptScreen ||
    $[552] !== turn ||
    $[553] !== isUltraplanChoiceShowing ||
    $[554] !== virtualScrollActive
  ) {
    V0 =
      isTranscriptScreen &&
      jsxProd_default(TranscriptView, {
        focused,
        tools: renderingTools,
        commands: commands_2,
        turn,
        hideWelcomeChrome: hideWelcomeChrome ?? isEmbedded,
        toolProgress: Jk,
        scrollViewport,
        reveal: scrollPin.revealRef,
        onUserScroll: scrollPin.onUserScrollWithoutDivider,
        virtualScrollActive,
        embedded: isEmbedded,
        scrollKeysActive: !isUltraplanChoiceShowing,
        showSandboxViolations: !isRemoteSession,
        dumpMode,
        onDumpToScrollback: () => setDumpMode(true),
        onExit: exitTranscript,
      });
    $[540] = commands_2;
    $[541] = dumpMode;
    $[542] = isEmbedded;
    $[543] = focused;
    $[544] = hideWelcomeChrome;
    $[545] = isRemoteSession;
    $[546] = renderingTools;
    $[547] = scrollPin.onUserScrollWithoutDivider;
    $[548] = scrollPin.revealRef;
    $[549] = Jk;
    $[550] = scrollViewport;
    $[551] = isTranscriptScreen;
    $[552] = turn;
    $[553] = isUltraplanChoiceShowing;
    $[554] = virtualScrollActive;
    $[555] = V0;
  } else V0 = $[555];
  let transcriptView = V0;
  if (isTranscriptScreen && !UE) {
    const fullscreen = scrollViewport !== undefined;
    let children;
    if ($[556] !== promptEffects || $[557] !== transcriptView) {
      children = jsxProd_default_2(KeybindingRoot, {
        children: [promptEffects, transcriptView],
      });
      $[556] = promptEffects;
      $[557] = transcriptView;
      $[558] = children;
    } else children = $[558];
    let children_2;
    if ($[559] !== isEmbedded || $[560] !== children) {
      children_2 = jsxProd_default(UnattendedNoticeProvider, {
        drawn: false,
        hideSessionTitle: isEmbedded,
        children,
      });
      $[559] = isEmbedded;
      $[560] = children;
      $[561] = children_2;
    } else children_2 = $[561];
    let children_3;
    if ($[562] !== tokenWarningState || $[563] !== children_2) {
      children_3 = jsxProd_default(noticeQueueStore.Provider, {
        value: tokenWarningState,
        children: children_2,
      });
      $[562] = tokenWarningState;
      $[563] = children_2;
      $[564] = children_3;
    } else children_3 = $[564];
    let mw;
    if ($[565] !== screenFrameProps || $[566] !== fullscreen || $[567] !== children_3) {
      mw = jsxProd_default(ReplScreenFrame, {
        ...screenFrameProps,
        fullscreen,
        children: children_3,
      });
      $[565] = screenFrameProps;
      $[566] = fullscreen;
      $[567] = children_3;
      $[568] = mw;
    } else mw = $[568];
    let jc;
    if ($[569] !== mw || $[570] !== wrapWithProviders) {
      jc = wrapWithProviders(mw);
      $[569] = mw;
      $[570] = wrapWithProviders;
      $[571] = jc;
    } else jc = $[571];
    return jc;
  }
  let modalSlotActive = isModalOpen && modalVisibility === "visible";
  let layoutSlots = resolveModalPlacement({
    onScreenBlockingKind: blockingDialogKind,
    modalSlotActive,
    panelHidesPrompt,
    pinnedConsentShowing,
    dialogOverPanel: hasLocalJsxOverlay && dialogOverPanel,
    fullscreen: isFullscreen,
  });
  let QS;
  if (
    $[572] !== modalVisibility ||
    $[573] !== isEmbedded ||
    $[574] !== hasTeamModal ||
    $[575] !== isModalOpen ||
    $[576] !== layoutSlots.inPane
  ) {
    QS = hasTeamModal
      ? {
          content: jsxProd_default(DialogHost, {
            variant: "modal",
          }),
          visible: isModalOpen && modalVisibility === "visible",
          footer: layoutSlots.inPane
            ? jsxProd_default(UnattendedAutoBlockNotice, {
                hideSessionTitle: isEmbedded,
              })
            : undefined,
        }
      : undefined;
    $[572] = modalVisibility;
    $[573] = isEmbedded;
    $[574] = hasTeamModal;
    $[575] = isModalOpen;
    $[576] = layoutSlots.inPane;
    $[577] = QS;
  } else QS = $[577];
  let O_ = QS;
  let promptVisible = !dialogOverPanel && !exitState && !isDisabled;
  let JS;
  if ($[578] !== focused.messages || $[579] !== screen || $[580] !== isTranscriptScreen) {
    JS =
      !isTranscriptScreen &&
      jsxProd_default(GlobalKeybindingHandlers, {
        screen,
        onToggleTranscript: () => setScreen(toggleScreen),
        messageCount: focused.messages.length,
      });
    $[578] = focused.messages;
    $[579] = screen;
    $[580] = isTranscriptScreen;
    $[581] = JS;
  } else JS = $[581];
  let Sy;
  if (
    $[582] !== focused.isMain ||
    $[583] !== modalSlotActive ||
    $[584] !== scrollPin ||
    $[585] !== isTranscriptScreen ||
    $[586] !== isUltraplanChoiceShowing
  ) {
    Sy =
      !isTranscriptScreen &&
      jsxProd_default(MessageScrollHandler, {
        scrollPin,
        modalSlotActive,
        ultraplanChoiceShowing: isUltraplanChoiceShowing,
        isMain: focused.isMain,
      });
    $[582] = focused.isMain;
    $[583] = modalSlotActive;
    $[584] = scrollPin;
    $[585] = isTranscriptScreen;
    $[586] = isUltraplanChoiceShowing;
    $[587] = Sy;
  } else Sy = $[587];
  const modal = isTranscriptScreen ? undefined : O_;
  const hidePill = !focused.isMain;
  let sidebar;
  if (
    $[588] !== chrome.setIdeSelection ||
    $[589] !== autoOpenBaseline ||
    $[590] !== diffSidebarEnabled ||
    $[591] !== sidebarWidth ||
    $[592] !== isThinClient ||
    $[593] !== modalSlotActive
  ) {
    sidebar = diffSidebarEnabled
      ? jsxProd_default(SentryErrorBoundary, {
          onError: logDiffSidebarRenderError,
          children: jsxProd_default(DiffSidebar, {
            width: sidebarWidth,
            isThinClient,
            onAskAboutSelection: modalSlotActive ? undefined : chrome.setIdeSelection,
            autoOpenBaseline,
          }),
        })
      : null;
    $[588] = chrome.setIdeSelection;
    $[589] = autoOpenBaseline;
    $[590] = diffSidebarEnabled;
    $[591] = sidebarWidth;
    $[592] = isThinClient;
    $[593] = modalSlotActive;
    $[594] = sidebar;
  } else sidebar = $[594];
  const isOffered = j0 > 0;
  let dock;
  if ($[595] !== draft || $[596] !== dockWidth || $[597] !== isOffered || $[598] !== turn) {
    dock = jsxProd_default(PromptDock, {
      turn,
      draft,
      isOffered,
      width: dockWidth,
    });
    $[595] = draft;
    $[596] = dockWidth;
    $[597] = isOffered;
    $[598] = turn;
    $[599] = dock;
  } else dock = $[599];
  let dockTail;
  let transcriptOverlay;
  if ($[600] === MEMO_CACHE_SENTINEL) {
    dockTail = jsxProd_default(PaneDockNamespace.DockTail, {});
    transcriptOverlay = jsxProd_default(ToastStackViewNamespace.ToastStackView, {});
    $[600] = dockTail;
    $[601] = transcriptOverlay;
  } else {
    dockTail = $[600];
    transcriptOverlay = $[601];
  }
  const toolProgress_2 = panelHidesPrompt ? null : Jk;
  const stateRowYields = cy || !!chromeClients;
  const hidePlaceholder = isDisabled || modalSlotActive;
  const hideWelcomeChrome_2 = hideWelcomeChrome ?? isEmbedded;
  let scrollable;
  if (
    $[602] !== commands_2 ||
    $[603] !== focused ||
    $[604] !== isRemoteSession ||
    $[605] !== panelHoldsQueue ||
    $[606] !== pauseAnimation ||
    $[607] !== promptVisible ||
    $[608] !== renderingTools ||
    $[609] !== scrollPin ||
    $[610] !== showSpinner ||
    $[611] !== submitController.remoteSendsNow ||
    $[612] !== toolProgress_2 ||
    $[613] !== stateRowYields ||
    $[614] !== hidePlaceholder ||
    $[615] !== hideWelcomeChrome_2 ||
    $[616] !== isTranscriptScreen ||
    $[617] !== transport.rowsDrawn ||
    $[618] !== transport.waitingLines ||
    $[619] !== turn
  ) {
    scrollable = jsxProd_default(MessageArea, {
      scrollPin,
      turn,
      focused,
      tools: renderingTools,
      commands: commands_2,
      toolProgress: toolProgress_2,
      showSpinner,
      stateRowYields,
      panelHoldsQueue,
      promptMounted: promptVisible,
      remoteSendsNow: submitController.remoteSendsNow,
      waitingLines: transport.waitingLines,
      onRowsDrawn: transport.rowsDrawn,
      isRemoteSession,
      pauseAnimation,
      hidePlaceholder,
      hideWelcomeChrome: hideWelcomeChrome_2,
      historyHidden: isTranscriptScreen,
    });
    $[602] = commands_2;
    $[603] = focused;
    $[604] = isRemoteSession;
    $[605] = panelHoldsQueue;
    $[606] = pauseAnimation;
    $[607] = promptVisible;
    $[608] = renderingTools;
    $[609] = scrollPin;
    $[610] = showSpinner;
    $[611] = submitController.remoteSendsNow;
    $[612] = toolProgress_2;
    $[613] = stateRowYields;
    $[614] = hidePlaceholder;
    $[615] = hideWelcomeChrome_2;
    $[616] = isTranscriptScreen;
    $[617] = transport.rowsDrawn;
    $[618] = transport.waitingLines;
    $[619] = turn;
    $[620] = scrollable;
  } else scrollable = $[620];
  let abovePrompt;
  if (
    $[621] !== chrome ||
    $[622] !== draft ||
    $[623] !== isEmbedded ||
    $[624] !== isFullscreen ||
    $[625] !== hasLocalJsxOverlay ||
    $[626] !== hasActiveLocalJsxUI ||
    $[627] !== blockingDialogKind ||
    $[628] !== panelHoldsQueue ||
    $[629] !== Jx ||
    $[630] !== pinnedConsentShowing ||
    $[631] !== promptVisible ||
    $[632] !== layoutSlots.abovePrompt ||
    $[633] !== showSpinner ||
    $[634] !== submitController ||
    $[635] !== surveySlot ||
    $[636] !== isTranscriptScreen ||
    $[637] !== transcript ||
    $[638] !== turn
  ) {
    abovePrompt =
      !isTranscriptScreen &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        width: "100%",
        children: [
          null,
          layoutSlots.abovePrompt &&
            jsxProd_default(UnattendedAutoBlockNotice, {
              hideSessionTitle: isEmbedded,
            }),
          hasActiveLocalJsxUI && jsxProd_default(NullComponent, {}),
          panelHoldsQueue && !isFullscreen && jsxProd_default(PendingTaskUpdatesNote, {}),
          jsxProd_default(DialogHost, {
            variant: "bottom",
          }),
          jsxProd_default(ExpandedTaskList, {
            hidden:
              showSpinner ||
              hasLocalJsxOverlay ||
              pinnedConsentShowing ||
              blockingDialogKind === AUTOCOMPACT_OFFER,
          }),
          !pinnedConsentShowing && jsxProd_default(WorkerPendingPermissions, {}),
          jsxProd_default(runExitInterstitial, {
            chrome,
          }),
          jsxProd_default(InlinePanesAndBands, {
            turn,
            transcript,
            draft,
            submitController,
            surveySlot,
            visible: promptVisible,
            panesDocked: isFullscreen && Jx > 0,
          }),
        ],
      });
    $[621] = chrome;
    $[622] = draft;
    $[623] = isEmbedded;
    $[624] = isFullscreen;
    $[625] = hasLocalJsxOverlay;
    $[626] = hasActiveLocalJsxUI;
    $[627] = blockingDialogKind;
    $[628] = panelHoldsQueue;
    $[629] = Jx;
    $[630] = pinnedConsentShowing;
    $[631] = promptVisible;
    $[632] = layoutSlots.abovePrompt;
    $[633] = showSpinner;
    $[634] = submitController;
    $[635] = surveySlot;
    $[636] = isTranscriptScreen;
    $[637] = transcript;
    $[638] = turn;
    $[639] = abovePrompt;
  } else abovePrompt = $[639];
  let bottom;
  if (
    $[640] !== chrome ||
    $[641] !== draft ||
    $[642] !== gesture ||
    $[643] !== handleBackgroundSession ||
    $[644] !== promptVisible ||
    $[645] !== scope ||
    $[646] !== submitController ||
    $[647] !== isTranscriptScreen ||
    $[648] !== transcript ||
    $[649] !== turn
  ) {
    bottom =
      !isTranscriptScreen &&
      jsxProd_default(Box, {
        flexDirection: "row",
        width: "100%",
        alignItems: "flex-end",
        children: jsxProd_default(Box, {
          flexDirection: "column",
          flexGrow: 1,
          children: jsxProd_default(PromptAreaWithBackgroundHint, {
            turn,
            transcript,
            scope,
            draft,
            chrome,
            gesture,
            submitController,
            visible: promptVisible,
            onBackgroundSession: handleBackgroundSession,
          }),
        }),
      });
    $[640] = chrome;
    $[641] = draft;
    $[642] = gesture;
    $[643] = handleBackgroundSession;
    $[644] = promptVisible;
    $[645] = scope;
    $[646] = submitController;
    $[647] = isTranscriptScreen;
    $[648] = transcript;
    $[649] = turn;
    $[650] = bottom;
  } else bottom = $[650];
  let layout;
  if (
    $[651] !== sidebarWidth ||
    $[652] !== focused.isTeammate ||
    $[653] !== dockWidth ||
    $[654] !== scrollPin ||
    $[655] !== modal ||
    $[656] !== hidePill ||
    $[657] !== sidebar ||
    $[658] !== dock ||
    $[659] !== scrollable ||
    $[660] !== abovePrompt ||
    $[661] !== bottom
  ) {
    layout = jsxProd_default(FullscreenLayout, {
      scrollViewport: scrollPin.viewport,
      modal,
      modalScrollViewport: scrollPin.modalViewport,
      unseen: scrollPin,
      hidePill,
      hideSticky: focused.isTeammate,
      header: undefined,
      top: null,
      sidebar,
      sidebarWidth,
      dock,
      dockWidth,
      dockTail,
      transcriptOverlay,
      scrollable,
      abovePrompt,
      bottom,
    });
    $[651] = sidebarWidth;
    $[652] = focused.isTeammate;
    $[653] = dockWidth;
    $[654] = scrollPin;
    $[655] = modal;
    $[656] = hidePill;
    $[657] = sidebar;
    $[658] = dock;
    $[659] = scrollable;
    $[660] = abovePrompt;
    $[661] = bottom;
    $[662] = layout;
  } else layout = $[662];
  let $E;
  if ($[663] !== suspendKey || $[664] !== layout) {
    $E = jsxProd_default(
      Kc,
      {
        children: layout,
      },
      suspendKey,
    );
    $[663] = suspendKey;
    $[664] = layout;
    $[665] = $E;
  } else $E = $[665];
  let K0;
  if (
    $[666] !== promptEffects ||
    $[667] !== JS ||
    $[668] !== Sy ||
    $[669] !== $E ||
    $[670] !== transcriptView
  ) {
    K0 = jsxProd_default_2(KeybindingRoot, {
      children: [JS, promptEffects, Sy, $E, transcriptView],
    });
    $[666] = promptEffects;
    $[667] = JS;
    $[668] = Sy;
    $[669] = $E;
    $[670] = transcriptView;
    $[671] = K0;
  } else K0 = $[671];
  let children = K0;
  let children_2;
  if ($[672] !== isEmbedded || $[673] !== children || $[674] !== layoutSlots.drawn) {
    children_2 = jsxProd_default(UnattendedNoticeProvider, {
      drawn: layoutSlots.drawn,
      hideSessionTitle: isEmbedded,
      children,
    });
    $[672] = isEmbedded;
    $[673] = children;
    $[674] = layoutSlots.drawn;
    $[675] = children_2;
  } else children_2 = $[675];
  let children_3;
  if ($[676] !== tokenWarningState || $[677] !== children_2) {
    children_3 = jsxProd_default(noticeQueueStore.Provider, {
      value: tokenWarningState,
      children: children_2,
    });
    $[676] = tokenWarningState;
    $[677] = children_2;
    $[678] = children_3;
  } else children_3 = $[678];
  let Xk;
  if ($[679] !== screenFrameProps || $[680] !== isFullscreen || $[681] !== children_3) {
    Xk = jsxProd_default(ReplScreenFrame, {
      ...screenFrameProps,
      fullscreen: isFullscreen,
      children: children_3,
    });
    $[679] = screenFrameProps;
    $[680] = isFullscreen;
    $[681] = children_3;
    $[682] = Xk;
  } else Xk = $[682];
  let GE;
  if ($[683] !== Xk || $[684] !== wrapWithProviders) {
    GE = wrapWithProviders(Xk);
    $[683] = Xk;
    $[684] = wrapWithProviders;
    $[685] = GE;
  } else GE = $[685];
  return GE;
}
export {
  negateBoolean,
  notB,
  TranscriptSearchBar,
  TranscriptHelpFooter,
  TranscriptModeFooter,
  REPL,
  AnimatedTerminalTitle,
};
