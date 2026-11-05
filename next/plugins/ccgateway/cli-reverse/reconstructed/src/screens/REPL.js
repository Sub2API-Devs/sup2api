/**
 * screens/REPL.tsx
 *
 * 主交互屏幕：组装会话控制器、消息列表、输入区、对话框、通知与全屏布局；transcript 模式与搜索栏。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/screens/REPL.tsx
 * pieces: chunk-czq1j3j2.js (92)
 * attribution: placement 38, layout 7, fingerprint 4, sole-consumer 39, affinity 1, file-local 1, facade-exports 1, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import { randomUUID } from "crypto";
import {
  init_react_production,
  useState,
  useEffect,
  useMemo,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  fragmentTypeExport,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { countWhere } from "../utils/collections.js";
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
import { UP_ARROW, DOWN_ARROW, HEAVY_MULTIPLICATION_X } from "../constants/figures.js";
import { WorkerBadge } from "../components/permissions/WorkerBadge.js";
import { wrapText } from "../ink/wrap-text.js";
import { ScrollBoxDefault } from "../ink/components/ScrollBox.js";
import { HintText } from "../components/design-system/HintText.js";
import { Divider } from "../components/design-system/Divider.js";
import { truncateStartToWidth } from "../utils/format.js";
import { diffLineToPlainText } from "../components/diff/diffText.js";
import { BridgeChannelSlot } from "./repl/bridgeChannelSlot.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
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
import { createColorAssigner } from "../tools/AgentTool/agentColorManager.js";
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
} from "../hooks/notifs/startupNotificationSpecs.js";
import { FeatureOfTheWeekClaim } from "../components/FeatureOfTheWeekClaim.js";
import { subscribeCodeModeNotices } from "../hooks/notifs/useNpmDeprecationNotification.js";
import { refreshApiCreditLinkStatus } from "../components/LogoV2/ApiCreditLinkNotice.js";
import { ReplSessionScope, runWithQueryParams } from "./repl/ReplSessionScope.js";
import { invalidateUserContext } from "../context.js";
import { isWindowsTerminal } from "../ink/clearTerminal.js";
import { TurnController, useBackgroundQuestionAnswer } from "./repl/TurnController.js";
import { mergeTaskProgressIntoTranscript } from "../services/AgentSummary/agentSummary.js";
import { setTranscriptMessages, transcriptMessagesStore, ReplEffects } from "./repl/ReplEffects.js";
import {
  useTrustedDeviceEnrolledNotice,
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
import {
  shouldPauseForToolProgress,
  hasVisibleProgress,
  InlineProgressList,
} from "./repl/InlineProgressList.js";
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
import { useBackgroundAskEmitter, useSemanticPromptMarks } from "./repl/sessionPresence.js";
import { useBridgeImmediateCommands } from "../bridge/replBridgeInbound.js";
import { useIDEIntegration } from "../hooks/useIDEIntegration.js";
import { PromptSubmitController, isCompactCommand } from "./repl/PromptSubmitController.js";
import { QueuedEarlyPromptController, STARTUP_CHECKS } from "./repl/draftCallouts.js";
import { COLD_RESUME_QUOTA, AUTOCOMPACT_OFFER } from "../components/nudges/nudgeIds.js";
import { PromptArea, PromptDock } from "./repl/PromptArea.js";
import { useCanUseToolRef } from "../hooks/useCanUseTool.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:137180-137184 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:137180", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:137456-137488 placement
function isNonEmptyString(value) {
  return value !== "";
}
//@ chunk-czq1j3j2.js:137488-137515 placement
function negateBoolean(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:137515-137542 placement
function notB(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:137542-137560 layout
var VERBOSE_LABEL = "verbose ";
//@ chunk-czq1j3j2.js:137560-137569 layout
var FOOTER_PADDING = 2;
//@ chunk-czq1j3j2.js:137569-139223 fingerprint (2.1.88 match: TranscriptModeFooter, 0.683)
/**
 * transcript 模式（ctrl+o）底部页脚：显示 "Showing detailed transcript"、切换快捷键、滚动/打开编辑器提示或搜索计数；宽度不足时退化为 "? for shortcuts"。
 */
function TranscriptModeFooter(props) {
  let $ = useMemoCache(17);
  let { showAllInTranscript, virtualScroll, searchBadge, suppressShowAll, status } = props;
  let suppressShowAllFlag = suppressShowAll === undefined ? false : suppressShowAll;
  let toggleShortcut = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let showAllShortcut = useShortcutDisplay_2("transcript:toggleShowAll", "Transcript", "ctrl+e");
  let hasOpenDialog = useHasOpenDialog_2();
  let { columns } = useTerminalSize();
  let editorName;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    editorName = getShortEditorName();
    $[0] = editorName;
  } else editorName = $[0];
  let editorLabel = editorName;
  let openInEditorLabel = editorLabel ? `open in ${editorLabel}` : "open in editor";
  let hintLine = `${figures_default.arrowUp}${figures_default.arrowDown} scroll \xB7 v to ${openInEditorLabel} \xB7 ? for shortcuts`;
  let statusBadge =
    FOOTER_PADDING +
      bunStringWidth(
        [
          hasOpenDialog ? "dialog waiting" : "",
          "Showing detailed transcript",
          `${toggleShortcut} to toggle`,
          hintLine,
        ]
          .filter(isNonEmptyString)
          .join(" \xB7 "),
      ) +
      bunStringWidth(status ? `${status} ` : VERBOSE_LABEL) <
    columns
      ? hintLine
      : "? for shortcuts";
  let dialogWaiting;
  if ($[1] !== hasOpenDialog) {
    dialogWaiting =
      hasOpenDialog &&
      jsxProd_default(Text, {
        color: "permission",
        children: "dialog waiting",
      });
    $[1] = hasOpenDialog;
    $[2] = dialogWaiting;
  } else dialogWaiting = $[2];
  let detailedLabel;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    detailedLabel = jsxProd_default(Fragment, {
      children: "Showing detailed transcript",
    });
    $[3] = detailedLabel;
  } else detailedLabel = $[3];
  let toggleShortcutLabel;
  if ($[4] !== toggleShortcut) {
    toggleShortcutLabel = jsxProd_default_2(Fragment, {
      children: [toggleShortcut, " to ", "toggle"],
    });
    $[4] = toggleShortcut;
    $[5] = toggleShortcutLabel;
  } else toggleShortcutLabel = $[5];
  const searchBadgeText = searchBadge
    ? "n/N to navigate"
    : virtualScroll
      ? statusBadge
      : suppressShowAllFlag
        ? `v to ${openInEditorLabel}`
        : `${showAllShortcut} to ${showAllInTranscript ? "collapse" : "show all"}`;
  let bylineRow;
  if ($[6] !== dialogWaiting || $[7] !== toggleShortcutLabel || $[8] !== searchBadgeText) {
    bylineRow = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: jsxProd_default_2(Byline, {
        children: [dialogWaiting, detailedLabel, toggleShortcutLabel, searchBadgeText],
      }),
    });
    $[6] = dialogWaiting;
    $[7] = toggleShortcutLabel;
    $[8] = searchBadgeText;
    $[9] = bylineRow;
  } else bylineRow = $[9];
  let spacerBox;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    spacerBox = jsxProd_default(Box, {
      flexGrow: 1,
    });
    $[10] = spacerBox;
  } else spacerBox = $[10];
  let footerStatus;
  if ($[11] !== searchBadge || $[12] !== status) {
    footerStatus = jsxProd_default(TranscriptFooterStatus, {
      status,
      searchBadge,
      showVerboseBadge: true,
    });
    $[11] = searchBadge;
    $[12] = status;
    $[13] = footerStatus;
  } else footerStatus = $[13];
  let footerRow;
  if ($[14] !== bylineRow || $[15] !== footerStatus) {
    footerRow = jsxProd_default_2(Box, {
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
      children: [bylineRow, spacerBox, footerStatus],
    });
    $[14] = bylineRow;
    $[15] = footerStatus;
    $[16] = footerRow;
  } else footerRow = $[16];
  return footerRow;
}
//@ chunk-czq1j3j2.js:139223-139671 layout
function TranscriptFooterStatus(props) {
  let $ = useMemoCache(6);
  let { status, searchBadge, showVerboseBadge } = props;
  if (status) {
    let statusText;
    if ($[0] !== status) {
      statusText = jsxProd_default_2(Text, {
        children: [status, " "],
      });
      $[0] = status;
      $[1] = statusText;
    } else statusText = $[1];
    return statusText;
  }
  if (searchBadge) {
    let searchBadgeText;
    if ($[2] !== searchBadge.count || $[3] !== searchBadge.current) {
      searchBadgeText = jsxProd_default_2(Text, {
        dimColor: true,
        children: [searchBadge.current, "/", searchBadge.count, "  "],
      });
      $[2] = searchBadge.count;
      $[3] = searchBadge.current;
      $[4] = searchBadgeText;
    } else searchBadgeText = $[4];
    return searchBadgeText;
  }
  if (!showVerboseBadge) {
    return null;
  }
  let verboseLabel;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    verboseLabel = jsxProd_default(Text, {
      dimColor: true,
      children: VERBOSE_LABEL,
    });
    $[5] = verboseLabel;
  } else verboseLabel = $[5];
  return verboseLabel;
}
//@ chunk-czq1j3j2.js:139671-139997 layout
function SearchIndexStatus({ indexStatus, count, current, query }) {
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
      children: [current, "/", count, "  "],
    });
  return null;
}
//@ chunk-czq1j3j2.js:139997-142040 layout
/**
 * transcript 模式按 ? 显示的快捷键帮助页脚（滚动、搜索、打印到 scrollback、用编辑器打开、退出）。
 */
function TranscriptHelpFooter() {
  let $ = useMemoCache(23);
  let shortcutDisplay = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let shortcutDisplay_2 = useShortcutDisplay_2("transcript:exit", "Transcript", "q");
  let editorName;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    editorName = getShortEditorName();
    $[0] = editorName;
  } else editorName = $[0];
  let resolvedEditorName = editorName;
  let hint;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    hint = jsxProd_default_2(Text, {
      dimColor: true,
      children: [`${figures_default.arrowUp}${figures_default.arrowDown} j/k`.padEnd(9), "scroll"],
    });
    $[1] = hint;
  } else hint = $[1];
  let halfPageHint;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    halfPageHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["ctrl+u/d".padEnd(9), "half page"],
    });
    $[2] = halfPageHint;
  } else halfPageHint = $[2];
  let pageHint;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    pageHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["space b".padEnd(9), "page"],
    });
    $[3] = pageHint;
  } else pageHint = $[3];
  let topBottomHint;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    topBottomHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["g/G".padEnd(9), "top/bottom"],
    });
    $[4] = topBottomHint;
  } else topBottomHint = $[4];
  let scrollColumn;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    scrollColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        hint,
        halfPageHint,
        pageHint,
        topBottomHint,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["{/}".padEnd(9), "prev/next prompt"],
        }),
      ],
    });
    $[5] = scrollColumn;
  } else scrollColumn = $[5];
  let searchHint;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    searchHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["/".padEnd(5), "search"],
    });
    $[6] = searchHint;
  } else searchHint = $[6];
  let matchHint;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    matchHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["n/N".padEnd(5), "next/prev match"],
    });
    $[7] = matchHint;
  } else matchHint = $[7];
  let printHint;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    printHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["[".padEnd(5), "print to scrollback"],
    });
    $[8] = printHint;
  } else printHint = $[8];
  let openEditorKey;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    openEditorKey = "v".padEnd(5);
    $[9] = openEditorKey;
  } else openEditorKey = $[9];
  let searchColumn;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    searchColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        searchHint,
        matchHint,
        printHint,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [openEditorKey, "open in ", resolvedEditorName ?? "editor"],
        }),
      ],
    });
    $[10] = searchColumn;
  } else searchColumn = $[10];
  let toggleKeyLabel;
  if ($[11] !== shortcutDisplay) {
    toggleKeyLabel = shortcutDisplay.padEnd(7);
    $[11] = shortcutDisplay;
    $[12] = toggleKeyLabel;
  } else toggleKeyLabel = $[12];
  let toggleHint;
  if ($[13] !== toggleKeyLabel) {
    toggleHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: [toggleKeyLabel, "toggle transcript"],
    });
    $[13] = toggleKeyLabel;
    $[14] = toggleHint;
  } else toggleHint = $[14];
  let exitKeyLabel;
  if ($[15] !== shortcutDisplay_2) {
    exitKeyLabel = shortcutDisplay_2.padEnd(7);
    $[15] = shortcutDisplay_2;
    $[16] = exitKeyLabel;
  } else exitKeyLabel = $[16];
  let exitHint;
  if ($[17] !== exitKeyLabel) {
    exitHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: [exitKeyLabel, "exit"],
    });
    $[17] = exitKeyLabel;
    $[18] = exitHint;
  } else exitHint = $[18];
  let closeHint;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    closeHint = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["?".padEnd(7), "close help"],
    });
    $[19] = closeHint;
  } else closeHint = $[19];
  let helpRow;
  if ($[20] !== toggleHint || $[21] !== exitHint) {
    helpRow = jsxProd_default_2(Box, {
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
        scrollColumn,
        searchColumn,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [toggleHint, exitHint, closeHint],
        }),
      ],
    });
    $[20] = toggleHint;
    $[21] = exitHint;
    $[22] = helpRow;
  } else helpRow = $[22];
  return helpRow;
}
//@ chunk-czq1j3j2.js:142040-143225 fingerprint (2.1.88 match: TranscriptSearchBar, 0.755)
/**
 * transcript 搜索栏（/）：useSearchInput 读输入，首次打开时预热搜索索引（indexing… / indexed in Nms），查询变化后调用 jumpRef.setSearchQuery 并高亮。
 */
function TranscriptSearchBar({ jumpRef, count, current, onClose, onCancel, setHighlight, initialQuery }) {
  let { query, cursorOffset, handleKeyDown, handlePaste } = useSearchInput({
    isActive: true,
    initialQuery,
    onExit: () => onClose(query),
    onCancel,
  });
  let clock = useClock();
  let [indexStatus, setIndexStatus] = useState("building");
  useEffect(() => {
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
  useEffect(() => {
    if (!warmDone) return;
    jumpRef.current?.setSearchQuery(query);
    setHighlight(query);
  }, [query, warmDone]);
  let off = cursorOffset;
  let cursorChar = off < query.length ? query[off] : " ";
  let isNativeCursorEnabled_2 = useMemo(isNativeCursorEnabled, []);
  let needsFullRepaint = env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT && env.CLAUDE_CODE_SESSION_KIND !== "bg";
  let inverse = !(isNativeCursorEnabled_2 && !needsFullRepaint);
  let ref = useDeclaredCursor({
    line: 0,
    column: 0,
    active: true,
    visible: !needsFullRepaint,
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
        current,
        query,
      }),
    ],
  });
}
//@ chunk-czq1j3j2.js:1121767-1121804 sole-consumer
function selectTurnLoadingRepl(turn) {
  return turn.isLoading;
}
//@ chunk-czq1j3j2.js:1121804-1121841 sole-consumer
function selectTurnIsLoadingB(turn) {
  return turn.isLoading;
}
//@ chunk-czq1j3j2.js:1121841-1121884 sole-consumer
function selectInputOwnsEscapeReplB(repl) {
  return repl.inputOwnsEscape;
}
//@ chunk-czq1j3j2.js:1121884-1121930 sole-consumer
function selectInputRowReplaced(state) {
  return state.isInputRowReplaced;
}
//@ chunk-czq1j3j2.js:1121930-1122153 sole-consumer
var CLOSED_FRUSTRATION_SURVEY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var useFrustrationSurveyStub;
var NullBand;
var SURVEY_SLOT_KEYS;
var SURVEY_KINDS;
deferInit("chunk-czq1j3j2.js:1121930", () => {
  CLOSED_FRUSTRATION_SURVEY = {
    state: "closed",
    transcriptBundlePath: null,
    handleTranscriptSelect: () => {},
  };
  useFrustrationSurveyStub = () => CLOSED_FRUSTRATION_SURVEY;
  NullBand = () => null;
  SURVEY_SLOT_KEYS = {
    postCompact: true,
    longContext: true,
    plugin: true,
    memory: true,
    feedback: true,
    orgSurvey: true,
    frustration: true,
  };
  SURVEY_KINDS = Object.keys(SURVEY_SLOT_KEYS);
});
//@ chunk-czq1j3j2.js:1122153-1122340 sole-consumer
class SurveySlotStore {
  #e = createSignal();
  #t = null;
  subscribe = (listener) => this.#e.subscribe(listener);
  getSnapshot = () => this.#t;
  publish(next) {
    let previous = this.#t;
    if (previous !== null && SURVEY_KINDS.every((kind) => shallowEqualObject(previous[kind], next[kind])))
      return;
    this.#t = next;
    this.#e.emit();
  }
}
//@ chunk-czq1j3j2.js:1122340-1122579 sole-consumer
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
//@ chunk-czq1j3j2.js:1122579-1122694 sole-consumer
function shallowEqualObject(left, right) {
  let keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => Object.is(left[key], right[key]));
}
//@ chunk-czq1j3j2.js:1122694-1125306 sole-consumer
/**
 * 在 REPL 中依次运行各问卷 hook（压缩后、长上下文、插件、记忆、反馈、组织、挫败检测），后者在前者打开时让位，并把全部状态发布到 SurveySlotStore。
 */
function SurveyStatePublisher(props) {
  let $ = useMemoCache(48);
  let { turn, transcript, isRemoteSession, slot, localJsx } = props;
  let messages = useStoreSelector(transcript);
  let isLoading = useStoreSelector(turn, selectTurnLoadingRepl);
  let hasActivePrompt = useHasAutoDialog();
  let surveyState;
  if ($[0] !== transcript) {
    surveyState = () => new AssistantTokenCounter(transcript);
    $[0] = transcript;
    $[1] = surveyState;
  } else surveyState = $[1];
  let [tokenCounter] = useState(surveyState);
  let cumulativeSessionTokens = useStoreSelector(tokenCounter);
  let disposeTokenCounter;
  let disposeDeps;
  if ($[2] !== tokenCounter) {
    disposeTokenCounter = () => () => tokenCounter.dispose();
    disposeDeps = [tokenCounter];
    $[2] = tokenCounter;
    $[3] = disposeTokenCounter;
    $[4] = disposeDeps;
  } else {
    disposeTokenCounter = $[3];
    disposeDeps = $[4];
  }
  useEffect(disposeTokenCounter, disposeDeps);
  const enabled = !isRemoteSession;
  let compactSurveyOptions;
  if ($[5] !== enabled) {
    compactSurveyOptions = {
      enabled,
    };
    $[5] = enabled;
    $[6] = compactSurveyOptions;
  } else compactSurveyOptions = $[6];
  let postCompactSurvey = usePostCompactSurvey(messages, isLoading, hasActivePrompt, compactSurveyOptions);
  const enabled_2 = !isRemoteSession;
  const otherSurveyActive = postCompactSurvey.state !== "closed";
  let props_2;
  if (
    $[7] !== cumulativeSessionTokens ||
    $[8] !== hasActivePrompt ||
    $[9] !== enabled_2 ||
    $[10] !== otherSurveyActive ||
    $[11] !== transcript ||
    $[12] !== turn
  ) {
    props_2 = {
      cumulativeSessionTokens,
      turn,
      transcript,
      hasActivePrompt,
      enabled: enabled_2,
      otherSurveyActive,
    };
    $[7] = cumulativeSessionTokens;
    $[8] = hasActivePrompt;
    $[9] = enabled_2;
    $[10] = otherSurveyActive;
    $[11] = transcript;
    $[12] = turn;
    $[13] = props_2;
  } else props_2 = $[13];
  let longContextSurvey = useLongContextSurvey(props_2);
  const enabled_3 = !isRemoteSession;
  const otherSurveyActive_2 = postCompactSurvey.state !== "closed" || longContextSurvey.state !== "closed";
  let pluginSurveyOptions;
  if ($[14] !== hasActivePrompt || $[15] !== otherSurveyActive_2 || $[16] !== enabled_3 || $[17] !== turn) {
    pluginSurveyOptions = {
      turn,
      hasActivePrompt,
      enabled: enabled_3,
      otherSurveyActive: otherSurveyActive_2,
    };
    $[14] = hasActivePrompt;
    $[15] = otherSurveyActive_2;
    $[16] = enabled_3;
    $[17] = turn;
    $[18] = pluginSurveyOptions;
  } else pluginSurveyOptions = $[18];
  let pluginFeedbackSurvey = usePluginFeedbackSurvey(pluginSurveyOptions);
  const enabled_4 = !isRemoteSession;
  const otherSurveyActive_3 =
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed";
  let memorySurveyOptions;
  if ($[19] !== enabled_4 || $[20] !== otherSurveyActive_3) {
    memorySurveyOptions = {
      enabled: enabled_4,
      otherSurveyActive: otherSurveyActive_3,
    };
    $[19] = enabled_4;
    $[20] = otherSurveyActive_3;
    $[21] = memorySurveyOptions;
  } else memorySurveyOptions = $[21];
  let memorySurvey = useMemorySurvey(messages, isLoading, hasActivePrompt, memorySurveyOptions);
  const otherSurveyActive_4 =
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed" ||
    memorySurvey.state !== "closed";
  let feedbackSurveyOptions;
  if ($[22] !== otherSurveyActive_4 || $[23] !== transcript || $[24] !== turn) {
    feedbackSurveyOptions = {
      turn,
      transcript,
      otherSurveyActive: otherSurveyActive_4,
    };
    $[22] = otherSurveyActive_4;
    $[23] = transcript;
    $[24] = turn;
    $[25] = feedbackSurveyOptions;
  } else feedbackSurveyOptions = $[25];
  let feedbackSurvey = useFeedbackSurvey(feedbackSurveyOptions);
  const enabled_5 = !isRemoteSession;
  const otherSurveyActive_5 =
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed" ||
    memorySurvey.state !== "closed" ||
    feedbackSurvey.state !== "closed";
  let props_3;
  if (
    $[26] !== hasActivePrompt ||
    $[27] !== localJsx ||
    $[28] !== messages ||
    $[29] !== enabled_5 ||
    $[30] !== otherSurveyActive_5 ||
    $[31] !== turn
  ) {
    props_3 = {
      turn,
      messages,
      localJsx,
      hasActivePrompt,
      enabled: enabled_5,
      otherSurveyActive: otherSurveyActive_5,
    };
    $[26] = hasActivePrompt;
    $[27] = localJsx;
    $[28] = messages;
    $[29] = enabled_5;
    $[30] = otherSurveyActive_5;
    $[31] = turn;
    $[32] = props_3;
  } else props_3 = $[32];
  let orgSurvey = useOrgSurvey(props_3);
  const otherSurveyActive_6 =
    feedbackSurvey.state !== "closed" ||
    postCompactSurvey.state !== "closed" ||
    longContextSurvey.state !== "closed" ||
    pluginFeedbackSurvey.state !== "closed" ||
    memorySurvey.state !== "closed" ||
    orgSurvey.state !== "closed";
  let frustrationSurveyOptions;
  if ($[33] !== hasActivePrompt || $[34] !== otherSurveyActive_6 || $[35] !== transcript || $[36] !== turn) {
    frustrationSurveyOptions = {
      turn,
      transcript,
      hasActivePrompt,
      otherSurveyActive: otherSurveyActive_6,
    };
    $[33] = hasActivePrompt;
    $[34] = otherSurveyActive_6;
    $[35] = transcript;
    $[36] = turn;
    $[37] = frustrationSurveyOptions;
  } else frustrationSurveyOptions = $[37];
  let frustration = useFrustrationSurveyStub(frustrationSurveyOptions);
  let spinnerPace = useContext(SpinnerPaceContext);
  let publishSurveyState;
  if (
    $[38] !== feedbackSurvey ||
    $[39] !== frustration ||
    $[40] !== longContextSurvey ||
    $[41] !== memorySurvey ||
    $[42] !== spinnerPace ||
    $[43] !== orgSurvey ||
    $[44] !== pluginFeedbackSurvey ||
    $[45] !== postCompactSurvey ||
    $[46] !== slot
  ) {
    publishSurveyState = () => {
      let doPublish = () =>
        slot.publish({
          postCompact: postCompactSurvey,
          longContext: longContextSurvey,
          plugin: pluginFeedbackSurvey,
          memory: memorySurvey,
          feedback: feedbackSurvey,
          orgSurvey,
          frustration,
        });
      if (spinnerPace) spinnerPace.deferred(doPublish);
      else doPublish();
    };
    $[38] = feedbackSurvey;
    $[39] = frustration;
    $[40] = longContextSurvey;
    $[41] = memorySurvey;
    $[42] = spinnerPace;
    $[43] = orgSurvey;
    $[44] = pluginFeedbackSurvey;
    $[45] = postCompactSurvey;
    $[46] = slot;
    $[47] = publishSurveyState;
  } else publishSurveyState = $[47];
  useLayoutEffect(publishSurveyState);
  return null;
}
//@ chunk-czq1j3j2.js:1125306-1127593 sole-consumer
/**
 * 输入框上方的提示带：有问卷时显示 SurveyHost，另有上方提示位、反馈草稿提示、web-setup 提示等，彼此通过 bandHeld 互斥。
 */
function AbovePromptBands(props) {
  let $ = useMemoCache(39);
  let { slot, turn, transcript, draft, submit } = props;
  let storeSelector = useStoreSelector(slot);
  let storeSelector_2 = useStoreSelector(turn, selectTurnIsLoadingB);
  let [flagA, setFlagA] = useState(false);
  let [flagB, setFlagB] = useState(false);
  let [flagC, setFlagC] = useState(false);
  let promptOwnsEscape = useStoreSelector(draft, selectInputOwnsEscapeReplB);
  let inputRowReplaced = useStoreSelector(draft, selectInputRowReplaced);
  let hasSurvey;
  if ($[0] !== storeSelector) {
    hasSurvey = storeSelector !== null && hasActiveSurvey(storeSelector);
    $[0] = storeSelector;
    $[1] = hasSurvey;
  } else hasSurvey = $[1];
  let hasSurvey_2 = hasSurvey;
  let surveyHoldsList = hasSurvey_2 || flagA || flagB;
  let surveyHost;
  if (
    $[2] !== draft.replaceValue ||
    $[3] !== inputRowReplaced ||
    $[4] !== submit.submitSurveyFollowUp ||
    $[5] !== hasSurvey_2 ||
    $[6] !== storeSelector
  ) {
    surveyHost =
      hasSurvey_2 &&
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
    $[2] = draft.replaceValue;
    $[3] = inputRowReplaced;
    $[4] = submit.submitSurveyFollowUp;
    $[5] = hasSurvey_2;
    $[6] = storeSelector;
    $[7] = surveyHost;
  } else surveyHost = $[7];
  let workingSite;
  if ($[8] !== draft.replaceValue || $[9] !== storeSelector_2 || $[10] !== hasSurvey_2) {
    workingSite = jsxProd_default(AbovePromptBandNamespace.AbovePromptSite, {
      survey: hasSurvey_2,
      working: storeSelector_2,
      setInputValue: draft.replaceValue,
      onHoldsBandChange: setFlagA,
    });
    $[8] = draft.replaceValue;
    $[9] = storeSelector_2;
    $[10] = hasSurvey_2;
    $[11] = workingSite;
  } else workingSite = $[11];
  let onOpenFeedback;
  if ($[12] !== submit) {
    onOpenFeedback = () => submit.submitSurveyFollowUp("/feedback");
    $[12] = submit;
    $[13] = onOpenFeedback;
  } else onOpenFeedback = $[13];
  let feedbackNotice;
  if (
    $[14] !== draft.replaceValue ||
    $[15] !== storeSelector_2 ||
    $[16] !== hasSurvey_2 ||
    $[17] !== onOpenFeedback
  ) {
    feedbackNotice = jsxProd_default(FeedbackDraftNotice, {
      isLoading: storeSelector_2,
      surveyActive: hasSurvey_2,
      setInputValue: draft.replaceValue,
      onOpenFeedback,
      onHoldsBandChange: setFlagB,
    });
    $[14] = draft.replaceValue;
    $[15] = storeSelector_2;
    $[16] = hasSurvey_2;
    $[17] = onOpenFeedback;
    $[18] = feedbackNotice;
  } else feedbackNotice = $[18];
  const bandHeld = surveyHoldsList || flagC;
  let onRunWebSetup;
  if ($[19] !== submit) {
    onRunWebSetup = () => {
      submit
        .submit("/web-setup", NOOP_HELPERS, {
          inputModeOverride: "prompt",
          leavesIdeSelection: true,
        })
        .catch(logError);
    };
    $[19] = submit;
    $[20] = onRunWebSetup;
  } else onRunWebSetup = $[20];
  let webSetupGate;
  if (
    $[21] !== draft.replaceValue ||
    $[22] !== storeSelector_2 ||
    $[23] !== bandHeld ||
    $[24] !== onRunWebSetup ||
    $[25] !== transcript
  ) {
    webSetupGate = jsxProd_default(WebSetupPromptGate, {
      isLoading: storeSelector_2,
      bandHeld,
      transcript,
      setInputValue: draft.replaceValue,
      onRunWebSetup,
    });
    $[21] = draft.replaceValue;
    $[22] = storeSelector_2;
    $[23] = bandHeld;
    $[24] = onRunWebSetup;
    $[25] = transcript;
    $[26] = webSetupGate;
  } else webSetupGate = $[26];
  let nullBand;
  if (
    $[27] !== draft.replaceValue ||
    $[28] !== surveyHoldsList ||
    $[29] !== promptOwnsEscape ||
    $[30] !== transcript ||
    $[31] !== turn
  ) {
    nullBand = jsxProd_default(NullBand, {
      turn,
      transcript,
      bandHeld: surveyHoldsList,
      promptOwnsEscape,
      setInputValue: draft.replaceValue,
      onHoldsBandChange: setFlagC,
    });
    $[27] = draft.replaceValue;
    $[28] = surveyHoldsList;
    $[29] = promptOwnsEscape;
    $[30] = transcript;
    $[31] = turn;
    $[32] = nullBand;
  } else nullBand = $[32];
  let bandsFragment;
  if (
    $[33] !== surveyHost ||
    $[34] !== workingSite ||
    $[35] !== feedbackNotice ||
    $[36] !== webSetupGate ||
    $[37] !== nullBand
  ) {
    bandsFragment = jsxProd_default_2(Fragment, {
      children: [surveyHost, workingSite, feedbackNotice, webSetupGate, nullBand],
    });
    $[33] = surveyHost;
    $[34] = workingSite;
    $[35] = feedbackNotice;
    $[36] = webSetupGate;
    $[37] = nullBand;
    $[38] = bandsFragment;
  } else bandsFragment = $[38];
  return bandsFragment;
}
//@ chunk-czq1j3j2.js:1127593-1127630 sole-consumer
function selectTurnIsLoadingC(turn) {
  return turn.isLoading;
}
//@ chunk-czq1j3j2.js:1127630-1127673 sole-consumer
function selectInputOwnsEscapeB(draft) {
  return draft.inputOwnsEscape;
}
//@ chunk-czq1j3j2.js:1127673-1127710 sole-consumer
function selectTurnIsLoadingD(turn) {
  return turn.isLoading;
}
//@ chunk-czq1j3j2.js:1127710-1128222 sole-consumer
/**
 * REPL 中内嵌面板与调查问卷区域的组件。
 */
function InlinePanesAndBands(props) {
  let $ = useMemoCache(10);
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
//@ chunk-czq1j3j2.js:1128222-1128855 placement
/**
 * REPL 提示区组件，附带后台会话提示。
 */
function PromptAreaWithBackgroundHint(props) {
  let $ = useMemoCache(13);
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
//@ chunk-czq1j3j2.js:1466084-1466125 sole-consumer
function selectTerminalTitle(titles) {
  return titles.terminalTitle;
}
//@ chunk-czq1j3j2.js:1466125-1466161 affinity
function selectTitleDisabled(titles) {
  return titles.disabled;
}
//@ chunk-czq1j3j2.js:1466161-1466201 file-local
function nextTitleFrame(f) {
  return (f + 1) % TITLE_SPINNER_FRAMES.length;
}
//@ chunk-czq1j3j2.js:1466201-1466248 layout
var TITLE_SPINNER_FRAMES = ["\u25D0", "\u25D1"];
var TITLE_IDLE_PREFIX = "\u2733";
var TITLE_FRAME_INTERVAL_MS = 960;
//@ chunk-czq1j3j2.js:1466248-1466575 fingerprint (2.1.88 match: AnimatedTerminalTitle, 0.545)
/**
 * 终端标题组件：从 titles 存储取标题，工作中且终端聚焦时以 960ms 交替 ◐/◑ 前缀，否则 ✳；在 tmux 等复用器下受 tengu_static_title_under_mux 控制改为静态。
 */
function AnimatedTerminalTitle(props) {
  let $ = useMemoCache(1);
  let { titles, isAnimating, noPrefix } = props;
  let terminalTitle = useStoreSelector(titles, selectTerminalTitle);
  let disabled = useStoreSelector(titles, selectTitleDisabled);
  let terminalFocused = useTerminalFocus();
  let underMux =
    getTerminalMultiplexer() !== null &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_static_title_under_mux", true);
  let [frame, setFrame] = useState(0);
  let onTick;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onTick = () => setFrame(nextTitleFrame);
    $[0] = onTick;
  } else onTick = $[0];
  useInterval(
    onTick,
    disabled || noPrefix || underMux || !isAnimating || !terminalFocused ? null : TITLE_FRAME_INTERVAL_MS,
  );
  let prefix =
    isAnimating && !underMux ? (TITLE_SPINNER_FRAMES[frame] ?? TITLE_IDLE_PREFIX) : TITLE_IDLE_PREFIX;
  useTerminalTitle(disabled ? null : noPrefix ? terminalTitle : `${prefix} ${terminalTitle}`);
  return null;
}
//@ chunk-czq1j3j2.js:1703363-1703367 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1703363", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1706878-1706882 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1706878", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1712095-1713000 placement
/**
 * REPL 消息列表的外部存储：getSnapshot/subscribe 供 useSyncExternalStore；replace/apply/keep 修改列表（可延迟发布），flush 发布延迟的修改并调用 project 回调。
 */
class MessageListStore {
  #e;
  #t;
  #o = false;
  #n;
  #r = createSignal();
  conversation = orderedRowSource({
    keep: (messages) =>
      this.keep({
        type: "append",
        messages: [...messages],
      }),
    rows: () => this.#e,
    isHookable: true,
  });
  constructor({ initial, project }) {
    this.#e = initial;
    this.#n = project;
  }
  getSnapshot = () => this.#e;
  subscribe = (listener) => this.#r.subscribe(listener);
  replace = (next, defer = false) => {
    let previous = this.#e;
    this.#e = typeof next === "function" ? next(previous) : next;
    if (defer) {
      this.#t ??= previous;
      this.#o ||= defer !== "held";
      return;
    }
    this.#s(this.#t ?? previous);
  };
  apply = (op, defer = false) => {
    let batch = applyMessageListAppend(op, (row) => this.keep(row, defer));
    if (batch === undefined) {
      this.conversation.behindAppends(() => this.keep(op, defer))?.catch(logError);
      return;
    }
    let appended = appendRowsWithHooks(this.conversation, batch.rows, {
      keep: batch.keep,
    });
    if (appended instanceof Promise) appended.catch(logError);
  };
  keep = (op, defer = false) => {
    this.replace((current) => applyMessageListEdit(current, op), defer);
  };
  settled = () => this.conversation.settled();
  cut = () => this.conversation.cut();
  getPublished = () => this.#t ?? this.#e;
  flush = () => {
    if (this.#t !== undefined && this.#o) this.#s(this.#t);
  };
  #s(next) {
    this.#t = undefined;
    this.#o = false;
    let previous = this.#e;
    this.#n(previous, next);
    if (previous !== next) this.#r.emit();
  }
}
//@ chunk-czq1j3j2.js:1864699-1864703 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1864699", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1870873-1870903 placement
function selectSessionId(state) {
  return state.id;
}
//@ chunk-czq1j3j2.js:1870903-1870938 placement
function selectReplTab(state) {
  return state.replTab;
}
//@ chunk-czq1j3j2.js:1870938-1870995 placement (2.1.88 match: _temp, 1)
function selectFileHistoryTrackedFilesSize(s) {
  return s.fileHistory.trackedFiles.size;
}
//@ chunk-czq1j3j2.js:1870995-1871066 placement
function switchReplTabToDiff(state) {
  return state.replTab === "convo"
    ? {
        ...state,
        replTab: "diff",
      }
    : state;
}
//@ chunk-czq1j3j2.js:1871066-1871096 placement
function selectSessionIdB(state) {
  return state.id;
}
//@ chunk-czq1j3j2.js:1871096-1871131 placement
function selectSessionCwd(session) {
  return getSessionProject(session).cwd;
}
//@ chunk-czq1j3j2.js:1871131-1871187 placement
function selectFileHistorySequence(state) {
  return state.fileHistory.trackSequence ?? 0;
}
//@ chunk-czq1j3j2.js:1871187-1871226 placement (2.1.88 match: extractTodosFromTranscript, 1)
function selectMainAgentTodos(state) {
  return state.todos[mainAgentId()];
}
//@ chunk-czq1j3j2.js:1871226-1871275 placement
function selectToolPermissionCtxRepl(state) {
  return state.toolPermissionContext;
}
//@ chunk-czq1j3j2.js:1871275-1871350 placement
function showDiffPanel(state) {
  return state.diffPanelVisible
    ? state
    : {
        ...state,
        diffPanelVisible: true,
      };
}
//@ chunk-czq1j3j2.js:1871350-1871425 placement
function hideDiffPanel(state) {
  return state.diffPanelVisible
    ? {
        ...state,
        diffPanelVisible: false,
      }
    : state;
}
//@ chunk-czq1j3j2.js:1871425-1871455 placement
function createReplayHandleSlot() {
  return new ReplayHandleSlot();
}
//@ chunk-czq1j3j2.js:1871455-1871503 placement (2.1.88 match: _temp, 1)
function isCompletedStatus(state) {
  return state.status === "completed";
}
//@ chunk-czq1j3j2.js:1871503-1871530 placement
function toggleFalse(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:1871530-1871571 placement
function selectPanelFileViewRepl(state) {
  return state.panelFileView;
}
//@ chunk-czq1j3j2.js:1871571-1871598 placement
function toggleFalseB(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:1871598-1871625 placement
function toggleFalseC(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:1871625-1871686 placement
function renderDimText(children, key) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children,
    },
    key,
  );
}
//@ chunk-czq1j3j2.js:1871686-1871713 placement
function toggleFalseD(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:1871713-1871740 placement
function toggleFalseE(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:1871740-1871765 placement
/**
 * REPL 差异面板的显示限额：最多同时显示 8 个文件、超过 20 个文件折叠提示、加载提示延迟 300 ms 出现。
 */
var MAX_VISIBLE_FILE_DIFFS = 8;
var MAX_DIFF_FILES_BEFORE_HIDING = 20;
var LOADING_HINT_DELAY_MS = 300;
//@ chunk-czq1j3j2.js:1871765-1872365 placement
/**
 * 记录自动打开 diff 时的基线，关闭时切回对话标签。
 */
function useDiffAutoOpenBaseline(enabled, trackedCount) {
  let $ = useMemoCache(8);
  let setAppState = useSetAppState();
  useForceRender();
  let session = useSession(selectSessionId);
  let host = useHost();
  let baselineEntry;
  if ($[0] !== enabled || $[1] !== session) {
    baselineEntry = {
      enabled,
      sessionId: session,
      baseline: null,
    };
    $[0] = enabled;
    $[1] = session;
    $[2] = baselineEntry;
  } else baselineEntry = $[2];
  let [baseline, setBaseline] = useState(baselineEntry);
  let baseline_2 = baseline.baseline;
  if (baseline.enabled !== enabled) baseline_2 = enabled ? trackedCount : null;
  else if (baseline_2 !== null && trackedCount !== baseline_2) baseline_2 = null;
  if (baseline.sessionId !== session) baseline_2 = null;
  if (baseline.enabled !== enabled || baseline.sessionId !== session || baseline.baseline !== baseline_2)
    setBaseline({
      enabled,
      sessionId: session,
      baseline: baseline_2,
    });
  let enabledRef = useRef(enabled);
  let onEnabledChange;
  let onEnabledChangeDeps;
  if ($[3] !== enabled || $[4] !== host || $[5] !== setAppState) {
    onEnabledChange = () => {
      let prevEnabled = enabledRef.current;
      enabledRef.current = enabled;
      if (prevEnabled && !enabled) switchToConversationTab(host, setAppState);
    };
    onEnabledChangeDeps = [enabled, host, setAppState];
    $[3] = enabled;
    $[4] = host;
    $[5] = setAppState;
    $[6] = onEnabledChange;
    $[7] = onEnabledChangeDeps;
  } else {
    onEnabledChange = $[6];
    onEnabledChangeDeps = $[7];
  }
  useEffect(onEnabledChange, onEnabledChangeDeps);
  return baseline_2;
}
//@ chunk-czq1j3j2.js:1872365-1874490 placement
/**
 * 全屏 REPL 的 diff 侧栏：会话有文件改动且终端够宽时预取工作区 diff 并标记自动打开；注册 app:toggleReplTab 快捷键切换；在 diff 标签页渲染 DiffSidebarPanel。
 */
function DiffSidebar(props) {
  let $ = useMemoCache(40);
  let { width, isThinClient, onAskAboutSelection, autoOpenBaseline } = props;
  let baselineProp = autoOpenBaseline === undefined ? null : autoOpenBaseline;
  let appState = useAppState(selectReplTab);
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let { columns } = useTerminalSize();
  let { addNotification } = useNotifications();
  let appState_2 = useAppState(selectFileHistoryTrackedFilesSize);
  let setTimeoutFn = useContext(clockContext)?.setTimeout ?? defaultSetTimeout;
  let refreshDiffEffect;
  if (
    $[0] !== baselineProp ||
    $[1] !== columns ||
    $[2] !== host ||
    $[3] !== isThinClient ||
    $[4] !== appState ||
    $[5] !== setTimeoutFn ||
    $[6] !== setAppState ||
    $[7] !== appStoreDirect ||
    $[8] !== appState_2
  ) {
    refreshDiffEffect = () => {
      if (appState !== "convo" || appState_2 === 0) {
        return;
      }
      if (baselineProp !== null && appState_2 === baselineProp) {
        return;
      }
      if (!isFullscreenEnvEnabled() || isThinClient) {
        return;
      }
      if (!isDiffSidebarPreferred(columns)) {
        return;
      }
      let abortController = new AbortController();
      let cancelTimer = setTimeoutFn(() => {
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
        cancelTimer();
        abortController.abort();
      };
    };
    $[0] = baselineProp;
    $[1] = columns;
    $[2] = host;
    $[3] = isThinClient;
    $[4] = appState;
    $[5] = setTimeoutFn;
    $[6] = setAppState;
    $[7] = appStoreDirect;
    $[8] = appState_2;
    $[9] = refreshDiffEffect;
  } else refreshDiffEffect = $[9];
  let refreshDeps;
  if (
    $[10] !== baselineProp ||
    $[11] !== host ||
    $[12] !== isThinClient ||
    $[13] !== appState ||
    $[14] !== setTimeoutFn ||
    $[15] !== setAppState ||
    $[16] !== appStoreDirect ||
    $[17] !== appState_2
  ) {
    refreshDeps = [
      appState,
      appState_2,
      baselineProp,
      isThinClient,
      setAppState,
      host,
      setTimeoutFn,
      appStoreDirect,
    ];
    $[10] = baselineProp;
    $[11] = host;
    $[12] = isThinClient;
    $[13] = appState;
    $[14] = setTimeoutFn;
    $[15] = setAppState;
    $[16] = appStoreDirect;
    $[17] = appState_2;
    $[18] = refreshDeps;
  } else refreshDeps = $[18];
  useEffect(refreshDiffEffect, refreshDeps);
  let toggleCallback;
  if (
    $[19] !== addNotification ||
    $[20] !== columns ||
    $[21] !== host ||
    $[22] !== setAppState ||
    $[23] !== storageV5 ||
    $[24] !== appStoreDirect
  ) {
    toggleCallback = () => {
      let toggleResult = toggleDiffPanel({
        host,
        getReplTab: () => appStoreDirect.getState().replTab,
        setAppState,
        columns,
        trackSequence: appStoreDirect.getState().fileHistory.trackSequence ?? 0,
        storageV5,
      });
      if (toggleResult.status === "refused")
        addNotification({
          key: `diff-sidebar-${toggleResult.reason}`,
          kind: "feedback",
          text: toggleResult.text,
          priority: "immediate",
          timeoutMs: 3000,
        });
    };
    $[19] = addNotification;
    $[20] = columns;
    $[21] = host;
    $[22] = setAppState;
    $[23] = storageV5;
    $[24] = appStoreDirect;
    $[25] = toggleCallback;
  } else toggleCallback = $[25];
  let isActive;
  if ($[26] !== isThinClient) {
    isActive = isFullscreenEnvEnabled() && !isThinClient;
    $[26] = isThinClient;
    $[27] = isActive;
  } else isActive = $[27];
  let keybindingContext;
  if ($[28] !== isActive) {
    keybindingContext = {
      context: "Global",
      isActive,
    };
    $[28] = isActive;
    $[29] = keybindingContext;
  } else keybindingContext = $[29];
  useKeybinding("app:toggleReplTab", toggleCallback, keybindingContext);
  let session = useSession(selectSessionIdB);
  let panelVisible = appState === "diff" && width > 0;
  let logShownEffect;
  let logShownDeps;
  if ($[30] !== columns || $[31] !== host || $[32] !== panelVisible || $[33] !== session) {
    logShownEffect = () => {
      if (panelVisible) logDiffPanelShown(host, session, columns);
    };
    logShownDeps = [panelVisible, columns, session, host];
    $[30] = columns;
    $[31] = host;
    $[32] = panelVisible;
    $[33] = session;
    $[34] = logShownEffect;
    $[35] = logShownDeps;
  } else {
    logShownEffect = $[34];
    logShownDeps = $[35];
  }
  useEffect(logShownEffect, logShownDeps);
  if (!panelVisible) {
    return null;
  }
  const minCol = columns - width;
  let panel;
  if ($[36] !== onAskAboutSelection || $[37] !== minCol || $[38] !== width) {
    panel = jsxProd_default(DiffSidebarPanel, {
      width,
      minCol,
      onAskAboutSelection,
    });
    $[36] = onAskAboutSelection;
    $[37] = minCol;
    $[38] = width;
    $[39] = panel;
  } else panel = $[39];
  return panel;
}
//@ chunk-czq1j3j2.js:1874490-1883146 placement
/**
 * diff 侧栏面板：读取本地工作区 diff（可切换基线 session/uncommitted/branch），隐藏被 read deny 规则保护的文件，列出改动文件与行数、会话前已编辑文件、测试/生成文件折叠，支持拖动滚动与选中内容提问。
 */
function DiffSidebarPanel(props) {
  let $ = useMemoCache(85);
  let { width, minCol, onAskAboutSelection } = props;
  let session = useSession(selectSessionCwd);
  let host = useHost();
  let { storageV5 } = useTheme_2();
  let appState = useAppState(selectFileHistorySequence);
  let [diffBase, setDiffBase] = useState(getDiffBaseMode);
  let { stats, files, hunks, loading, source, baseMode, noCommits } = useLocalWorkspaceDiff(
    appState,
    true,
    diffBase,
  );
  let cycleDiffBase;
  if ($[0] !== diffBase || $[1] !== storageV5) {
    cycleDiffBase = () => setDiffBase(cycleDiffBaseMode(diffBase, storageV5));
    $[0] = diffBase;
    $[1] = storageV5;
    $[2] = cycleDiffBase;
  } else cycleDiffBase = $[2];
  let keybindingOptions;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "DiffPanel",
    };
    $[3] = keybindingOptions;
  } else keybindingOptions = $[3];
  useKeybinding("app:cycleDiffBase", cycleDiffBase, keybindingOptions);
  let appState_2 = useAppState(selectMainAgentTodos);
  let todos;
  if ($[4] !== appState_2) {
    todos = todoToolsEnabled() ? appState_2 : undefined;
    $[4] = appState_2;
    $[5] = todos;
  } else todos = $[5];
  let visibleTodos = todos;
  let appState_3 = useAppState(selectToolPermissionCtxRepl);
  let setAppState = useSetAppState();
  let { processQueue } = useNotifications();
  let showPanelEffect;
  let showPanelEffectDeps;
  if ($[6] !== processQueue || $[7] !== setAppState) {
    showPanelEffect = () => {
      setAppState(showDiffPanel);
      return () => {
        setAppState(hideDiffPanel);
        processQueue();
      };
    };
    showPanelEffectDeps = [setAppState, processQueue];
    $[6] = processQueue;
    $[7] = setAppState;
    $[8] = showPanelEffect;
    $[9] = showPanelEffectDeps;
  } else {
    showPanelEffect = $[8];
    showPanelEffectDeps = $[9];
  }
  useEffect(showPanelEffect, showPanelEffectDeps);
  let [scrollRef] = useState(createReplayHandleSlot);
  let { attach } = scrollRef;
  let rootBoxRef = useRef(null);
  let scrollBoxRef = useRef(null);
  let initialFileRefMap;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    initialFileRefMap = new Map();
    $[10] = initialFileRefMap;
  } else initialFileRefMap = $[10];
  let fileRefMap = useRef(initialFileRefMap);
  let preSessionFileCount = 0;
  let preSessionLinesAdded = 0;
  let preSessionLinesRemoved = 0;
  if ($[11] !== files) {
    for (const file of files) {
      if (file.preSession) {
        preSessionFileCount++;
        preSessionLinesAdded = preSessionLinesAdded + file.linesAdded;
        preSessionLinesRemoved = preSessionLinesRemoved + file.linesRemoved;
      }
    }
    $[11] = files;
    $[12] = preSessionFileCount;
    $[13] = preSessionLinesAdded;
    $[14] = preSessionLinesRemoved;
  } else {
    preSessionFileCount = $[12];
    preSessionLinesAdded = $[13];
    preSessionLinesRemoved = $[14];
  }
  let preSessionStats;
  if ($[15] !== preSessionFileCount || $[16] !== preSessionLinesAdded || $[17] !== preSessionLinesRemoved) {
    preSessionStats = {
      filesCount: preSessionFileCount,
      linesAdded: preSessionLinesAdded,
      linesRemoved: preSessionLinesRemoved,
    };
    $[15] = preSessionFileCount;
    $[16] = preSessionLinesAdded;
    $[17] = preSessionLinesRemoved;
    $[18] = preSessionStats;
  } else preSessionStats = $[18];
  let baselineStats = preSessionStats;
  let completedTodoCount;
  if ($[19] !== visibleTodos) {
    completedTodoCount = visibleTodos ? countWhere(visibleTodos, isCompletedStatus) : 0;
    $[19] = visibleTodos;
    $[20] = completedTodoCount;
  } else completedTodoCount = $[20];
  let completedTodos = completedTodoCount;
  let todoCount = visibleTodos?.length ?? 0;
  let max = Math.max(width - 2, 20);
  let thirdOverlayKeys = useThirdOverlayKeys();
  let feedIsWide = useFeedIsWide();
  let isOverlayOpen = thirdOverlayKeys || feedIsWide;
  let selection = useSelection();
  let dragOptions;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    dragOptions = {
      requireScope: true,
    };
    $[21] = dragOptions;
  } else dragOptions = $[21];
  useDragToScroll(scrollRef, selection, !isOverlayOpen, undefined, dragOptions);
  let getMaxRow;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    getMaxRow = () => {
      let yogaNode = rootBoxRef.current?.yogaNode;
      if (!yogaNode) {
        return null;
      }
      let offsetTop = 0;
      for (let node = rootBoxRef.current ?? undefined; node; node = node.parentNode)
        offsetTop = offsetTop + (node.yogaNode?.getComputedTop() ?? 0);
      return offsetTop + yogaNode.getComputedHeight() - 1;
    };
    $[22] = getMaxRow;
  } else getMaxRow = $[22];
  let filePathForRow;
  if ($[23] === MEMO_CACHE_SENTINEL) {
    filePathForRow = (row) => findRowOwner(row, scrollBoxRef.current, fileRefMap.current);
    $[23] = filePathForRow;
  } else filePathForRow = $[23];
  useDiffSelectionAttach(minCol, getMaxRow, isOverlayOpen ? undefined : onAskAboutSelection, filePathForRow);
  let [showGenerated, setShowGenerated] = useState(false);
  let diffRepoRoot;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    diffRepoRoot = getDiffRepoRoot();
    $[24] = diffRepoRoot;
  } else diffRepoRoot = $[24];
  let repoRoot = diffRepoRoot;
  let sessionRoot;
  if ($[25] !== session) {
    sessionRoot = findGitRoot(session) ?? session;
    $[25] = session;
    $[26] = sessionRoot;
  } else sessionRoot = $[26];
  let activeRoot = sessionRoot;
  let filteredFiles;
  if ($[27] !== files || $[28] !== activeRoot || $[29] !== showGenerated || $[30] !== appState_3) {
    let roots = activeRoot === repoRoot ? [repoRoot] : [repoRoot, activeRoot];
    let hiddenNoiseCount = 0;
    let deniedCount = 0;
    let keptFiles = [];
    let keptPreSessionFiles = [];
    for (const file of files) {
      if (
        roots.some(
          (root) => matchingRuleForInput(resolve(root, file.path), appState_3, "read", "deny") !== null,
        )
      ) {
        deniedCount++;
        continue;
      }
      if (file.preSession) {
        keptPreSessionFiles.push(file);
        continue;
      }
      if (isLockOrGeneratedFile(file.path) || isTestFile(file.path)) {
        hiddenNoiseCount++;
        if (!showGenerated) {
          continue;
        }
      }
      keptFiles.push(file);
    }
    filteredFiles = {
      files: keptFiles,
      preSessionFiles: keptPreSessionFiles,
      noiseCount: hiddenNoiseCount,
      deniedHidden: deniedCount,
    };
    $[27] = files;
    $[28] = activeRoot;
    $[29] = showGenerated;
    $[30] = appState_3;
    $[31] = filteredFiles;
  } else filteredFiles = $[31];
  let { files: files_2, preSessionFiles, noiseCount, deniedHidden } = filteredFiles;
  let isSessionOnly =
    files.length > 0 && baselineStats.filesCount === files.length && noiseCount === 0 && deniedHidden === 0;
  let unreportedLinesAdded = isSessionOnly ? 0 : (stats?.linesAdded ?? 0) - baselineStats.linesAdded;
  let unreportedLinesRemoved = isSessionOnly ? 0 : (stats?.linesRemoved ?? 0) - baselineStats.linesRemoved;
  let filesChangedCount = isSessionOnly ? 0 : (stats?.filesCount ?? files.length) - baselineStats.filesCount;
  let [scrollOffset, setScrollOffset] = useState(0);
  let max_2 = Math.max(0, files_2.length - MAX_VISIBLE_FILE_DIFFS);
  let min = Math.min(scrollOffset, max_2);
  let sliced = files_2.slice(min, min + MAX_VISIBLE_FILE_DIFFS);
  let filesAbove = min;
  let filesBelow = files_2.length - (min + sliced.length);
  let max_3 = Math.max(0, filesChangedCount - (files.length - baselineStats.filesCount));
  let visibleNoiseCount = showGenerated ? 0 : noiseCount;
  let emptyHeadline = null;
  let emptyHint = null;
  if (!loading) {
    if (stats === null) {
      emptyHeadline = "Diff unavailable";
      emptyHint = "Couldn't read the git diff \u2014 it will retry on the next change";
    } else if (filesChangedCount === 0) {
      if (noCommits) {
        emptyHeadline = "No commits yet";
        emptyHint = "Nothing to diff against until the repo's first commit";
      } else if (baseMode === "uncommitted") emptyHeadline = "No uncommitted changes";
      else if (baseMode === "branch") {
        if (source.kind === "branch") emptyHeadline = `No changes vs ${source.baseBranch}`;
        else {
          emptyHeadline = "No changes vs HEAD";
          emptyHint = "No base branch to compare against \u2014 showing changes vs HEAD";
        }
      } else emptyHeadline = "No changes this session";
    }
  }
  let toggleNoise;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    toggleNoise = () => setShowGenerated(toggleFalse);
    $[32] = toggleNoise;
  } else toggleNoise = $[32];
  const isActive = noiseCount > 0;
  let noiseKeybindingOptions;
  if ($[33] !== isActive) {
    noiseKeybindingOptions = {
      context: "Global",
      isActive,
    };
    $[33] = isActive;
    $[34] = noiseKeybindingOptions;
  } else noiseKeybindingOptions = $[34];
  useKeybinding("app:toggleDiffNoiseFilter", toggleNoise, noiseKeybindingOptions);
  useAppState(selectPanelFileViewRepl);
  let scrollFilesBy;
  if ($[35] !== max_2) {
    scrollFilesBy = function scrollFilesByImpl(delta) {
      setScrollOffset((current) => clamp(Math.min(current, max_2) + delta, 0, max_2));
    };
    $[35] = max_2;
    $[36] = scrollFilesBy;
  } else scrollFilesBy = $[36];
  let scrollFiles = scrollFilesBy;
  let fileListKeybindings;
  if ($[37] !== scrollFiles) {
    fileListKeybindings = {
      "app:diffFileListUp": () => scrollFiles(-1),
      "app:diffFileListDown": () => scrollFiles(1),
    };
    $[37] = scrollFiles;
    $[38] = fileListKeybindings;
  } else fileListKeybindings = $[38];
  const isActive_2 = max_2 > 0;
  let preSessionKeybindingOptions;
  if ($[39] !== isActive_2) {
    preSessionKeybindingOptions = {
      context: "Global",
      isActive: isActive_2,
    };
    $[39] = isActive_2;
    $[40] = preSessionKeybindingOptions;
  } else preSessionKeybindingOptions = $[40];
  MessageActionsKeybindings(fileListKeybindings, preSessionKeybindingOptions);
  let shortcutDisplay = useShortcutDisplay_2("app:diffFileListDown", "Global", "alt+down");
  let [showPreSession, setShowPreSession] = useState(false);
  let togglePreSession;
  if ($[41] === MEMO_CACHE_SENTINEL) {
    togglePreSession = () => setShowPreSession(toggleFalseB);
    $[41] = togglePreSession;
  } else togglePreSession = $[41];
  const isActive_3 = preSessionFiles.length > 0;
  let preSessionSectionKeybindingOptions;
  if ($[42] !== isActive_3) {
    preSessionSectionKeybindingOptions = {
      context: "Global",
      isActive: isActive_3,
    };
    $[42] = isActive_3;
    $[43] = preSessionSectionKeybindingOptions;
  } else preSessionSectionKeybindingOptions = $[43];
  useKeybinding("app:toggleDiffPreSession", togglePreSession, preSessionSectionKeybindingOptions);
  let emptyState = loading
    ? null
    : emptyHeadline !== null
      ? {
          headline: emptyHeadline,
          hint: emptyHint,
        }
      : files.length === 0
        ? {
            headline: "Too many changed files to show diff",
            hint: "Per-file diff is skipped above 500 files",
          }
        : files_2.length === 0
          ? {
              headline:
                deniedHidden > 0 && visibleNoiseCount > 0
                  ? "Only hidden files changed"
                  : deniedHidden > 0
                    ? "Only read-denied files changed"
                    : "Only tests and generated files changed",
              hint:
                deniedHidden > 0 && visibleNoiseCount > 0
                  ? "Read-denied, test, and generated files are hidden in this panel"
                  : deniedHidden > 0
                    ? "Read-denied files are hidden in this panel"
                    : 'Tests and generated files are hidden \xB7 click "show" above to view them',
            }
          : null;
  let preSessionVisible = showPreSession && preSessionFiles.length > 0;
  let showPlaceholder = loading || (emptyState !== null && !preSessionVisible);
  let timeout = useTimeout(loading ? LOADING_HINT_DELAY_MS : null);
  let scrollToFile = function scrollToFileImpl(path) {
    let fileRef = fileRefMap.current.get(path);
    if (fileRef) scrollRef.handle?.scrollToElement(fileRef);
  };
  const OuterBox = Box;
  const flexDirection = "column";
  const height = "100%";
  let onWheel;
  if ($[44] !== scrollRef.handle) {
    onWheel = (event) => {
      scrollRef.handle?.scrollBy(event.deltaY * 3);
      event.preventDefault();
      event.stopPropagation();
    };
    $[44] = scrollRef.handle;
    $[45] = onWheel;
  } else onWheel = $[45];
  const selectionScope = true;
  let headerSummary;
  if (
    $[46] !== emptyHeadline ||
    $[47] !== filesChangedCount ||
    $[48] !== loading ||
    $[49] !== unreportedLinesAdded ||
    $[50] !== unreportedLinesRemoved
  ) {
    headerSummary =
      !loading &&
      emptyHeadline === null &&
      jsxProd_default_2(Text, {
        children: [
          jsxProd_default_2(Text, {
            bold: true,
            children: [filesChangedCount, " ", plural(filesChangedCount, "file")],
          }),
          " ",
          "changed",
          (unreportedLinesAdded > 0 || unreportedLinesRemoved > 0) && " ",
          jsxProd_default(DiffStatCounts, {
            added: unreportedLinesAdded,
            removed: unreportedLinesRemoved,
          }),
        ],
      });
    $[46] = emptyHeadline;
    $[47] = filesChangedCount;
    $[48] = loading;
    $[49] = unreportedLinesAdded;
    $[50] = unreportedLinesRemoved;
    $[51] = headerSummary;
  } else headerSummary = $[51];
  let headerSpacer;
  if ($[52] === MEMO_CACHE_SENTINEL) {
    headerSpacer = jsxProd_default(Box, {
      flexGrow: 1,
    });
    $[52] = headerSpacer;
  } else headerSpacer = $[52];
  let closeButton;
  if ($[53] !== host || $[54] !== setAppState || $[55] !== storageV5) {
    closeButton = jsxProd_default(CloseButton, {
      onClose: () => closeDiffSidebar(host, setAppState, storageV5),
    });
    $[53] = host;
    $[54] = setAppState;
    $[55] = storageV5;
    $[56] = closeButton;
  } else closeButton = $[56];
  let headerRow;
  if ($[57] !== headerSummary || $[58] !== closeButton) {
    headerRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [headerSummary, headerSpacer, closeButton],
    });
    $[57] = headerSummary;
    $[58] = closeButton;
    $[59] = headerRow;
  } else headerRow = $[59];
  let baseLabel;
  if (
    $[60] !== diffBase ||
    $[61] !== baseMode ||
    $[62] !== filesChangedCount ||
    $[63] !== noCommits ||
    $[64] !== source ||
    $[65] !== stats
  ) {
    baseLabel =
      stats !== null &&
      (noCommits
        ? filesChangedCount > 0 &&
          jsxProd_default(Text, {
            dimColor: true,
            children: "no commits yet \u2014 showing staged and new files",
          })
        : (diffBase !== "session" || baseMode !== "session") &&
          jsxProd_default(Text, {
            dimColor: true,
            children: diffBaseLabel(diffBase, source, diffBase !== baseMode),
          }));
    $[60] = diffBase;
    $[61] = baseMode;
    $[62] = filesChangedCount;
    $[63] = noCommits;
    $[64] = source;
    $[65] = stats;
    $[66] = baseLabel;
  } else baseLabel = $[66];
  let todoProgress;
  if ($[67] !== max || $[68] !== completedTodos || $[69] !== todoCount) {
    todoProgress =
      todoCount > 0 &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        flexDirection: "row",
        gap: 1,
        children: [
          jsxProd_default(ProgressBar, {
            ratio: completedTodos / todoCount,
            width: Math.min(20, max - 12),
            fillColor: "success",
            emptyColor: "inactive",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [completedTodos, "/", todoCount],
          }),
        ],
      });
    $[67] = max;
    $[68] = completedTodos;
    $[69] = todoCount;
    $[70] = todoProgress;
  } else todoProgress = $[70];
  const fileListSection =
    (sliced.length > 0 || noiseCount > 0) &&
    jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      onWheel:
        max_2 > 0
          ? (event) => {
              scrollFiles(event.deltaY);
              event.preventDefault();
              event.stopPropagation();
            }
          : undefined,
      children: [
        filesAbove > 0 &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [UP_ARROW, " ", filesAbove, " more above"],
          }),
        sliced.map((fileEntry) =>
          jsxProd_default(
            DiffFileRow,
            {
              path: fileEntry.path,
              added: fileEntry.linesAdded,
              removed: fileEntry.linesRemoved,
              width: max,
              onClick: () => scrollToFile(fileEntry.path),
            },
            fileEntry.path,
          ),
        ),
        (filesBelow > 0 || deniedHidden > 0 || max_3 > 0) &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              filesBelow > 0 ? `${DOWN_ARROW} ` : "\u2026 ",
              [
                filesBelow > 0
                  ? `${filesBelow} more below${shortcutDisplay ? ` (${shortcutDisplay} to scroll)` : ""}`
                  : null,
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
            shown: showGenerated,
            onToggle: () => setShowGenerated(toggleFalseC),
          }),
      ],
    });
  let headerSection;
  if ($[71] !== headerRow || $[72] !== baseLabel || $[73] !== todoProgress || $[74] !== fileListSection) {
    headerSection = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      flexShrink: 0,
      children: [headerRow, baseLabel, todoProgress, fileListSection],
    });
    $[71] = headerRow;
    $[72] = baseLabel;
    $[73] = todoProgress;
    $[74] = fileListSection;
    $[75] = headerSection;
  } else headerSection = $[75];
  const ScrollContainer = Box;
  const flexGrow = 1;
  const flexDirection_2 = "column";
  const overflow = "hidden";
  const children = showPlaceholder
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
              : emptyState !== null &&
                [emptyState.headline, emptyState.hint ?? ""]
                  .flatMap((line) =>
                    line === ""
                      ? []
                      : wrapText(line, max, "wrap").split(`
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
                shown: showPreSession,
                onToggle: () => setShowPreSession(toggleFalseD),
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
            emptyState !== null
              ? jsxProd_default(HintText, {
                  hint: emptyState.hint ?? undefined,
                  children: emptyState.headline,
                })
              : jsxProd_default(Box, {
                  flexDirection: "column",
                  gap: 1,
                  children: files_2.map((file) =>
                    jsxProd_default_2(
                      Box,
                      {
                        flexDirection: "column",
                        ref: (element) => {
                          if (element) fileRefMap.current.set(file.path, element);
                          else fileRefMap.current.delete(file.path);
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
                shown: showPreSession,
                onToggle: () => setShowPreSession(toggleFalseE),
                width: max,
              }),
          ],
        }),
      });
  let fileListScroll;
  if ($[76] !== ScrollContainer || $[77] !== children) {
    fileListScroll = jsxProd_default(ScrollContainer, {
      ref: scrollBoxRef,
      flexGrow,
      flexDirection: flexDirection_2,
      overflow,
      children,
    });
    $[76] = ScrollContainer;
    $[77] = children;
    $[78] = fileListScroll;
  } else fileListScroll = $[78];
  let rootElement;
  if (
    $[79] !== OuterBox ||
    $[80] !== onWheel ||
    $[81] !== headerSection ||
    $[82] !== fileListScroll ||
    $[83] !== width
  ) {
    rootElement = jsxProd_default_2(OuterBox, {
      ref: rootBoxRef,
      flexDirection,
      width,
      height,
      onWheel,
      selectionScope,
      children: [headerSection, fileListScroll],
    });
    $[79] = OuterBox;
    $[80] = onWheel;
    $[81] = headerSection;
    $[82] = fileListScroll;
    $[83] = width;
    $[84] = rootElement;
  } else rootElement = $[84];
  return rootElement;
}
//@ chunk-czq1j3j2.js:1883146-1883413 placement
function diffBaseLabel(base, source, target) {
  let label;
  switch (base) {
    case "session":
      label = "this session";
      break;
    case "uncommitted":
      label = "uncommitted (vs HEAD)";
      break;
    case "branch":
      if (source.kind === "branch") label = `branch vs ${source.baseBranch}`;
      else label = target ? "branch diff" : "vs HEAD (no base branch)";
      break;
  }
  return target ? `${label}\u2026` : label;
}
//@ chunk-czq1j3j2.js:1883413-1885009 placement
/**
 * diff 侧栏里"本次会话前已编辑的文件"折叠区：点击切换显示文件列表及各自 diff（文件过多时隐藏 diff）。
 */
function PreSessionFilesSection(props) {
  let $ = useMemoCache(21);
  let { files, hunks, shown, onToggle, width } = props;
  let [hovered, setHovered] = useState(false);
  let onMouseEnter;
  let onMouseLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHovered(true);
    onMouseLeave = () => setHovered(false);
    $[0] = onMouseEnter;
    $[1] = onMouseLeave;
  } else {
    onMouseEnter = $[0];
    onMouseLeave = $[1];
  }
  const dimColor = !hovered;
  const fileCount = files.length;
  let fileNoun;
  if ($[2] !== files.length) {
    fileNoun = plural(files.length, "file");
    $[2] = files.length;
    $[3] = fileNoun;
  } else fileNoun = $[3];
  const toggleLabel = shown ? "hide" : "show";
  let children;
  if (
    $[4] !== files.length ||
    $[5] !== hovered ||
    $[6] !== dimColor ||
    $[7] !== fileNoun ||
    $[8] !== toggleLabel
  ) {
    children = jsxProd_default_2(Text, {
      dimColor,
      underline: hovered,
      children: ["+", fileCount, " ", fileNoun, " edited before this session (", toggleLabel, ")"],
    });
    $[4] = files.length;
    $[5] = hovered;
    $[6] = dimColor;
    $[7] = fileNoun;
    $[8] = toggleLabel;
    $[9] = children;
  } else children = $[9];
  let summaryRow;
  if ($[10] !== onToggle || $[11] !== children) {
    summaryRow = jsxProd_default(Box, {
      flexDirection: "row",
      onClick: onToggle,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[10] = onToggle;
    $[11] = children;
    $[12] = summaryRow;
  } else summaryRow = $[12];
  let fileRows;
  if ($[13] !== files || $[14] !== hunks || $[15] !== shown || $[16] !== width) {
    fileRows =
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
    $[13] = files;
    $[14] = hunks;
    $[15] = shown;
    $[16] = width;
    $[17] = fileRows;
  } else fileRows = $[17];
  let sectionBox;
  if ($[18] !== summaryRow || $[19] !== fileRows) {
    sectionBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [summaryRow, fileRows],
    });
    $[18] = summaryRow;
    $[19] = fileRows;
    $[20] = sectionBox;
  } else sectionBox = $[20];
  return sectionBox;
}
//@ chunk-czq1j3j2.js:1885009-1885421 placement
/**
 * 关闭按钮组件（悬停加粗）。
 */
function CloseButton(props) {
  let $ = useMemoCache(8);
  let { onClose } = props;
  let [hovered, setHovered] = useState(false);
  let onMouseEnter;
  let onMouseLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHovered(true);
    onMouseLeave = () => setHovered(false);
    $[0] = onMouseEnter;
    $[1] = onMouseLeave;
  } else {
    onMouseEnter = $[0];
    onMouseLeave = $[1];
  }
  const dimColor = !hovered;
  let children;
  if ($[2] !== hovered || $[3] !== dimColor) {
    children = jsxProd_default(Text, {
      bold: hovered,
      dimColor,
      children: HEAVY_MULTIPLICATION_X,
    });
    $[2] = hovered;
    $[3] = dimColor;
    $[4] = children;
  } else children = $[4];
  let buttonBox;
  if ($[5] !== onClose || $[6] !== children) {
    buttonBox = jsxProd_default(Box, {
      onClick: onClose,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[5] = onClose;
    $[6] = children;
    $[7] = buttonBox;
  } else buttonBox = $[7];
  return buttonBox;
}
//@ chunk-czq1j3j2.js:1885421-1886071 placement
/**
 * 显示/隐藏生成测试文件数量的切换组件。
 */
function GeneratedFilesToggle(props) {
  let $ = useMemoCache(13);
  let { count, shown, onToggle } = props;
  let [hovered, setHovered] = useState(false);
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
//@ chunk-czq1j3j2.js:1886071-1886890 placement
/**
 * diff 面板中单个文件的行组件：截断显示路径、悬停下划线，并显示增删行数。
 */
function DiffFileRow(props) {
  let $ = useMemoCache(17);
  let { path, added, removed, width, onClick } = props;
  let [hovered, setHovered] = useState(false);
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
//@ chunk-czq1j3j2.js:1886894-1887010 sole-consumer
function useDiffSnapshot() {
  let trackSequence = useAppState((state) => state.fileHistory.trackSequence ?? 0);
  let replTab = useAppState((state) => state.replTab);
  let diffCwd = getDiffCwd();
  return useMemo(() => isDiffPanelAvailable(), [diffCwd, trackSequence, replTab]);
}
//@ chunk-czq1j3j2.js:1887010-1887037 sole-consumer
function createNullStore() {
  return null;
}
//@ chunk-czq1j3j2.js:1887037-1887074 sole-consumer
function selectReplTabB(state) {
  return state.replTab;
}
//@ chunk-czq1j3j2.js:1887074-1887113 sole-consumer (2.1.88 match: _temp, 1)
function selectMcpClientsReplC(s) {
  return s.mcp.clients;
}
//@ chunk-czq1j3j2.js:1887113-1887161 sole-consumer (2.1.88 match: _temp, 1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-czq1j3j2.js:1887161-1887200 sole-consumer
function selectIsBriefOnlyReplC(state) {
  return state.isBriefOnly;
}
//@ chunk-czq1j3j2.js:1887200-1887243 sole-consumer
function selectBriefTranscript(state) {
  return state.briefTranscript;
}
//@ chunk-czq1j3j2.js:1887243-1887283 sole-consumer
function selectIdeSelectionReplB(state) {
  return state.ideSelection;
}
//@ chunk-czq1j3j2.js:1887283-1887313 sole-consumer
function createBridgeChannelSlot() {
  return new BridgeChannelSlot();
}
//@ chunk-czq1j3j2.js:1887313-1887350 sole-consumer
function selectTurnIsLoadingE(turn) {
  return turn.isLoading;
}
//@ chunk-czq1j3j2.js:1887350-1887399 sole-consumer
function isStopWaitPending(turn) {
  return codeModeAccepted() && turn.stopWaitPending;
}
//@ chunk-czq1j3j2.js:1887399-1887439 sole-consumer
function selectToolProgress(stream) {
  return stream.toolProgress;
}
//@ chunk-czq1j3j2.js:1887439-1887489 sole-consumer
function selectUserInputOnProcessingReplB(stream) {
  return !!stream.userInputOnProcessing;
}
//@ chunk-czq1j3j2.js:1887489-1887518 sole-consumer
function setTranscriptScreen() {
  return setDialogHostUnmounted(false);
}
//@ chunk-czq1j3j2.js:1887518-1887546 sole-consumer
function clearBlockingDialogNow() {
  return clearBlockingDialog();
}
//@ chunk-czq1j3j2.js:1887546-1887584 sole-consumer
function hasBlockingDialog(state) {
  return topBlockingDialog(state) !== null;
}
//@ chunk-czq1j3j2.js:1887584-1887639 sole-consumer
function selectIdleNotifThresholdMs() {
  return getGlobalConfig().messageIdleNotifThresholdMs;
}
//@ chunk-czq1j3j2.js:1887639-1887682 sole-consumer
function selectHasBashesDialog(state) {
  return !!state.bashesDialog;
}
//@ chunk-czq1j3j2.js:1887682-1887711 sole-consumer
function createSurveySlotStore() {
  return new SurveySlotStore();
}
//@ chunk-czq1j3j2.js:1887711-1887740 sole-consumer
function setPauseAnimation() {
  return setBlockingToolProgress(false);
}
//@ chunk-czq1j3j2.js:1887740-1887756 sole-consumer
function noop_5() {}
//@ chunk-czq1j3j2.js:1887756-1887772 sole-consumer
function noop_6() {}
//@ chunk-czq1j3j2.js:1887772-1887838 sole-consumer
function toggleScreen(screen) {
  return screen === "transcript" ? "prompt" : "transcript";
}
//@ chunk-czq1j3j2.js:1887838-1887969 sole-consumer
function logDiffSidebarRenderError(error, info) {
  logFeatureBad(
    "repl_diff_read",
    "render_threw",
    info.componentStack
      ? {
          error_component_stack_hash: shortHash(info.componentStack),
        }
      : undefined,
  );
}
//@ chunk-czq1j3j2.js:1887969-1888026 fingerprint (2.1.88 match: useScheduledTasks, 0.524)
var useScheduledTasks; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-czq1j3j2.js:1887969", () => {
  useScheduledTasks = require("../hooks/useScheduledTasks.js").useScheduledTasks;
});
//@ chunk-czq1j3j2.js:1888026-1888043 layout
var NullComponent = () => null;
//@ chunk-czq1j3j2.js:1888043-1888409 facade-exports
/**
 * REPL 外壳：用 props.messageQueue（缺省取全局消息队列）建队列 Provider，并提供写入节流上下文后渲染 REPL。
 */
function REPL(props) {
  let $ = useMemoCache(8);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let [nullStore] = useState(createNullStore);
  const queue = props.messageQueue ?? commandQueueOrDefault;
  let children;
  if ($[0] !== props) {
    children = jsxProd_default(REPL_2, {
      ...props,
    });
    $[0] = props;
    $[1] = children;
  } else children = $[1];
  let children_2;
  if ($[2] !== nullStore || $[3] !== children) {
    children_2 = jsxProd_default(SpinnerPaceContext.Provider, {
      value: nullStore,
      children,
    });
    $[2] = nullStore;
    $[3] = children;
    $[4] = children_2;
  } else children_2 = $[4];
  let queueWrapper;
  if ($[5] !== queue || $[6] !== children_2) {
    queueWrapper = jsxProd_default(QueueProvider, {
      queue,
      children: children_2,
    });
    $[5] = queue;
    $[6] = children_2;
    $[7] = queueWrapper;
  } else queueWrapper = $[7];
  return queueWrapper;
}
//@ chunk-czq1j3j2.js:1888409-1927328 callgraph-witnessed (2.1.88 match: REPL, 0.128)
/**
 * 主交互屏幕（316 重写为“控制器 + 外部 store”架构）。按 props 建立一组长生命周期控制器（useState 初始化器里 new）：ReplSessionScope、TurnController+转录 store、ComposerChrome、SessionController、PromptSubmitController、ScrollPin、PromptDraft、IdleNudge、BackgroundGesture 等，
 * 再用 useLayoutEffect 一次性 bindHost 把 mainLoopModel/canUseTool/通知等宿主能力注入各控制器。渲染：transcript 屏返回 gQ 转录视图；prompt 屏返回 FullscreenLayout{scrollable=Gee 消息列表, abovePrompt=通知/任务/权限区, bottom=y8 输入区, sidebar=diff 侧栏, dock=面板坞}，
 * 外层包 MCPConnectionManager、$A.Provider(tokenWarning)、LF、_F 屏幕框架。也挂 GlobalKeybindingHandlers、useQueueProcessor、useScheduledTasks、useMailboxBridge、useLogMessages 等副作用 hook。
 */
function REPL_2(props) {
  let $ = useMemoCache(705);
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
  let isInsidePanelHost = useContext(rootSessionSlot) !== null;
  if (showFooterHintGate()) {
    if (isEmbedded) isInsidePanelHost;
  }
  let isFullscreen = presentation === "fullscreen";
  let { storageV5, credentials } = useTheme_2();
  let fleetNudgeStore = useFleetNudgeStore();
  let messageQueue = useCommandQueueOrDefault();
  let isRemoteSession;
  if ($[0] !== remoteSessionConfig) {
    isRemoteSession = !!remoteSessionConfig || remoteSessionAwaits();
    $[0] = remoteSessionConfig;
    $[1] = isRemoteSession;
  } else isRemoteSession = $[1];
  let isRemoteSession_2 = isRemoteSession;
  let hasRemoteTransport = isRemoteSession_2 || !!directConnectConfig || !!sshSession;
  let isThinClient;
  if ($[2] !== hasRemoteTransport) {
    isThinClient = getIsRemoteMode() || hasRemoteTransport;
    $[2] = hasRemoteTransport;
    $[3] = isThinClient;
  } else isThinClient = $[3];
  let isThinClient_2 = isThinClient;
  let clock = useClock();
  let CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let session = useSession();
  let replTab = useAppState(selectReplTabB);
  let hasGitRepo = useDiffSnapshot();
  let replTab_2 = useAppState(selectMcpClientsReplC);
  let teamContext = useAppState(selectPendingWorkerRequest_2);
  let setAppState = useSetAppState();
  let setSessionState = useSetAppStateFn();
  let store = useAppStoreDirect();
  let activePlugins = useActivePlugins();
  let sessionHooks = useSessionHooksRegistry();
  useRegistryOverride(session);
  let dialogStore = useDialogStore();
  let spinnerStore = useSpinnerStore();
  useBackgroundStatusSync();
  let getState;
  if ($[4] !== store) {
    getState = () => store.getState();
    $[4] = store;
    $[5] = getState;
  } else getState = $[5];
  let taskRegistry;
  if ($[6] !== setAppState || $[7] !== getState) {
    taskRegistry = createTaskFramework(getState, setAppState, {
      refillWebSearchBudgetByDefault: true,
    });
    $[6] = setAppState;
    $[7] = getState;
    $[8] = taskRegistry;
  } else taskRegistry = $[8];
  let taskRegistry_2 = taskRegistry;
  let seedTranscript;
  if ($[9] !== initialMessages || $[10] !== store) {
    seedTranscript = () => {
      let agentId = mainAgentId();
      let messages = initialMessages ?? createEmptyList();
      store.setState((state) => ({
        ...state,
        transcripts: {
          ...state.transcripts,
          [agentId]: {
            messages,
            inProgressToolUseIDs: new Set(),
          },
        },
      }));
      return null;
    };
    $[9] = initialMessages;
    $[10] = store;
    $[11] = seedTranscript;
  } else seedTranscript = $[11];
  useState(seedTranscript);
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
  let [screen, setScreen] = useState("prompt");
  let [dumpMode, setDumpMode] = useState(false);
  let resetToPrompt;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    resetToPrompt = () => {
      setScreen("prompt");
      setDumpMode(false);
    };
    $[15] = resetToPrompt;
  } else resetToPrompt = $[15];
  let exitTranscript = resetToPrompt;
  let { addNotification, removeNotification } = useNotifications();
  let mergedMcpClients = useMergedClients(mcpClients, replTab_2);
  runStartupNotificationSpecs();
  FeatureOfTheWeekClaim(addNotification, removeNotification);
  subscribeCodeModeNotices(session, addNotification, removeNotification);
  let refreshCredits;
  let deps;
  if ($[16] !== credentials || $[17] !== storageV5) {
    refreshCredits = () => {
      refreshApiCreditLinkStatus(credentials, storageV5).catch(logError);
    };
    deps = [credentials, storageV5];
    $[16] = credentials;
    $[17] = storageV5;
    $[18] = refreshCredits;
    $[19] = deps;
  } else {
    refreshCredits = $[18];
    deps = $[19];
  }
  useEffect(refreshCredits, deps);
  let slashCommandEffect;
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
    $[30] !== isThinClient_2 ||
    $[31] !== onCommandsChange ||
    $[32] !== session ||
    $[33] !== storageV5 ||
    $[34] !== store
  ) {
    slashCommandEffect = () =>
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
        isThinClient: isThinClient_2,
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
    $[30] = isThinClient_2;
    $[31] = onCommandsChange;
    $[32] = session;
    $[33] = storageV5;
    $[34] = store;
    $[35] = slashCommandEffect;
  } else slashCommandEffect = $[35];
  let [scope] = useState(slashCommandEffect);
  let {
    commands: commands_2,
    renderingTools,
    dynamicMcpConfig: dynamicMcpConfig_2,
  } = useStoreSelector(scope);
  let writePacer = useContext(SpinnerPaceContext);
  let controllersEffect;
  if (
    $[36] !== clock.setTimeout ||
    $[37] !== engine ||
    $[38] !== writePacer ||
    $[39] !== initialMessages?.length ||
    $[40] !== presentation ||
    $[41] !== remoteSessionConfig?.initialPromptUuid ||
    $[42] !== scope ||
    $[43] !== store ||
    $[44] !== taskRegistry_2
  ) {
    controllersEffect = () => {
      let ownsEngine = engine === undefined;
      let engineImpl =
        engine ??
        runWithQueryParams({
          store,
          scope,
          readPendingQueryParams: () => turnController.readPendingQueryParams(),
        });
      let isWindowsTerm = isWindowsTerminal();
      let turnController = new TurnController({
        engine: engineImpl,
        presentation,
        ownsEngine,
        initialExternalLoading: remoteSessionConfig?.initialPromptUuid !== undefined,
        initialHaikuTitleAttempted: (initialMessages?.length ?? 0) > 0,
        onTimingChange: (value) => mergeTaskProgressIntoTranscript(taskRegistry_2, mainAgentId(), value),
        frameNotifier: writePacer ?? IMMEDIATE_PACER,
        stream: {
          scheduleTimeout: clock.setTimeout,
          isStreamingTextVisible: () =>
            isMotionAllowed(store.getState().settings.prefersReducedMotion, isWindowsTerm),
          getTranscriptLength: () => messageListStore.getSnapshot().length,
        },
      });
      let agentId = mainAgentId();
      let messageListStore = new MessageListStore({
        initial: store.getState().transcripts[agentId]?.messages ?? [],
        project: (sticky, handle) => {
          turnController.stream.trackTranscriptWrite(handle, sticky);
          let rounded = Math.round(turnController.stream.responseLength / 4);
          setTranscriptMessages(store, agentId, sticky, rounded);
        },
      });
      return {
        sessionEngine: engineImpl,
        turn: turnController,
        transcript: messageListStore,
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
    $[44] = taskRegistry_2;
    $[45] = controllersEffect;
  } else controllersEffect = $[45];
  let [controllers] = useState(controllersEffect);
  let { sessionEngine, turn, transcript } = controllers;
  useTrustedDeviceEnrolledNotice(addNotification, transcript);
  useInformationalMessageSink(transcript);
  let queryParamsEffect;
  if ($[46] !== onQueryParamsChange || $[47] !== turn.readPendingQueryParams) {
    queryParamsEffect = () => {
      onQueryParamsChange?.(turn.readPendingQueryParams);
    };
    $[46] = onQueryParamsChange;
    $[47] = turn.readPendingQueryParams;
    $[48] = queryParamsEffect;
  } else queryParamsEffect = $[48];
  let queryParamsDeps;
  if ($[49] !== onQueryParamsChange || $[50] !== turn) {
    queryParamsDeps = [onQueryParamsChange, turn];
    $[49] = onQueryParamsChange;
    $[50] = turn;
    $[51] = queryParamsDeps;
  } else queryParamsDeps = $[51];
  useEffect(queryParamsEffect, queryParamsDeps);
  let chromeControllersEffect;
  if (
    $[52] !== addNotification ||
    $[53] !== debug ||
    $[54] !== isEmbedded ||
    $[55] !== shouldHideLoginNotice ||
    $[56] !== isRemoteSession_2 ||
    $[57] !== onDetachToCaller ||
    $[58] !== storageV5 ||
    $[59] !== store ||
    $[60] !== transcript ||
    $[61] !== turn.guard
  ) {
    chromeControllersEffect = () =>
      new ComposerChrome({
        debug,
        embedded: isEmbedded,
        onDetachToCaller,
        hasSuppressedDialogs: false,
        hideLoginNotice: shouldHideLoginNotice,
        isRemoteSession: isRemoteSession_2,
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
    $[56] = isRemoteSession_2;
    $[57] = onDetachToCaller;
    $[58] = storageV5;
    $[59] = store;
    $[60] = transcript;
    $[61] = turn.guard;
    $[62] = chromeControllersEffect;
  } else chromeControllersEffect = $[62];
  let [chrome] = useState(chromeControllersEffect);
  let ideSelection = useStoreSelector(chrome, selectIdeSelectionReplB);
  let applyTranscript = transcript.apply;
  uiLogNamespace.useUiLog(transcript);
  let turnEventTailEffect;
  if ($[63] !== applyTranscript) {
    turnEventTailEffect = () =>
      TURN_BOUNDARIES_MODULE_EXPORTS.createTurnEventTail((value) =>
        applyTranscript({
          type: "append",
          messages: value,
        }),
      );
    $[63] = applyTranscript;
    $[64] = turnEventTailEffect;
  } else turnEventTailEffect = $[64];
  let [turnEventTail] = useState(turnEventTailEffect);
  let [permissionRelays] = useState(createBridgeChannelSlot);
  let networkPromptsEffect;
  if ($[65] !== permissionRelays || $[66] !== scope.requestDialog || $[67] !== setAppState) {
    networkPromptsEffect = () =>
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
    $[68] = networkPromptsEffect;
  } else networkPromptsEffect = $[68];
  let [networkPrompts] = useState(networkPromptsEffect);
  let scrollPinEffect;
  if (
    $[69] !== credentials ||
    $[70] !== isRemoteSession_2 ||
    $[71] !== networkPrompts ||
    $[72] !== scope ||
    $[73] !== setAppState ||
    $[74] !== storageV5 ||
    $[75] !== store ||
    $[76] !== transcript.getSnapshot
  ) {
    scrollPinEffect = () =>
      new SandboxStartup({
        store,
        setAppState,
        storageV5,
        credentials,
        scope,
        getMessages: transcript.getSnapshot,
        networkPrompts,
        isRemoteSession: isRemoteSession_2,
      });
    $[69] = credentials;
    $[70] = isRemoteSession_2;
    $[71] = networkPrompts;
    $[72] = scope;
    $[73] = setAppState;
    $[74] = storageV5;
    $[75] = store;
    $[76] = transcript.getSnapshot;
    $[77] = scrollPinEffect;
  } else scrollPinEffect = $[77];
  let [sandbox] = useState(scrollPinEffect);
  let isLoading = useStoreSelector(turn, selectTurnIsLoadingE);
  let onStreamingText = useStoreSelector(turn, isStopWaitPending);
  let toolProgress = useStoreSelector(turn.stream, selectToolProgress);
  let userInputOnProcessing = useStoreSelector(turn.stream, selectUserInputOnProcessingReplB);
  let hasToolProgress = toolProgress.size > 0;
  let pauseAnimation;
  if ($[78] !== toolProgress) {
    pauseAnimation = shouldPauseForToolProgress(toolProgress);
    $[78] = toolProgress;
    $[79] = pauseAnimation;
  } else pauseAnimation = $[79];
  let pauseAnimation_2 = pauseAnimation;
  let { guard, buildToolUseContext } = turn;
  let awaySummary = useAwaySummaryController(transcript, isLoading, !isRemoteSession_2);
  let scrollPinDeps;
  if ($[80] !== awaySummary || $[81] !== transcript) {
    scrollPinDeps = () =>
      new ScrollPin({
        transcript,
        awaySummary,
      });
    $[80] = awaySummary;
    $[81] = transcript;
    $[82] = scrollPinDeps;
  } else scrollPinDeps = $[82];
  let [scrollPin] = useState(scrollPinDeps);
  let draftControllerEffect;
  if (
    $[83] !== clock.setTimeout ||
    $[84] !== scrollPin ||
    $[85] !== session ||
    $[86] !== store ||
    $[87] !== transcript ||
    $[88] !== turn
  ) {
    draftControllerEffect = () => {
      let safeYoloMessageShownRef = promptInputStoreFor(session);
      let isTypedAhead = hasEarlyInputField() && hasTypedEarlyInput();
      setPromptValue(safeYoloMessageShownRef, consumeEarlyInput());
      return new PromptDraft({
        valueStore: safeYoloMessageShownRef,
        scheduleTimeout: clock.setTimeout,
        isTypedAhead,
        watchText: raisePromptChange,
        rewriteEdit: (ref, edit) => turn.rewriteInputOverAutoContinuePrefill(ref, edit),
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
    $[89] = draftControllerEffect;
  } else draftControllerEffect = $[89];
  let [draft] = useState(draftControllerEffect);
  let startDraft;
  let draftDeps;
  if ($[90] !== draft) {
    startDraft = () => draft.start();
    draftDeps = [draft];
    $[90] = draft;
    $[91] = startDraft;
    $[92] = draftDeps;
  } else {
    startDraft = $[91];
    draftDeps = $[92];
  }
  useLayoutEffect(startDraft, draftDeps);
  let disposeEffect;
  let disposeDeps;
  if ($[93] !== draft || $[94] !== turn) {
    disposeEffect = () => () => {
      turn.dispose();
      draft.dispose();
    };
    disposeDeps = [turn, draft];
    $[93] = draft;
    $[94] = turn;
    $[95] = disposeEffect;
    $[96] = disposeDeps;
  } else {
    disposeEffect = $[95];
    disposeDeps = $[96];
  }
  useEffect(disposeEffect, disposeDeps);
  let chromeEffect;
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
    $[120] !== taskRegistry_2 ||
    $[121] !== transcript ||
    $[122] !== turnEventTail ||
    $[123] !== turn
  ) {
    chromeEffect = () =>
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
        taskRegistry: taskRegistry_2,
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
    $[120] = taskRegistry_2;
    $[121] = transcript;
    $[122] = turnEventTail;
    $[123] = turn;
    $[124] = chromeEffect;
  } else chromeEffect = $[124];
  let [sessionController] = useState(chromeEffect);
  let { conversationId, headHooksPending } = useStoreSelector(sessionController);
  let isDialogActive = useActive();
  useStartupNotice();
  useExternalDialogBridge(scope.dialogTransport);
  let screenEffect;
  let screenDeps;
  if ($[125] !== screen) {
    screenEffect = () => {
      setDialogHostUnmounted(screen === "transcript");
      return setTranscriptScreen;
    };
    screenDeps = [screen];
    $[125] = screen;
    $[126] = screenEffect;
    $[127] = screenDeps;
  } else {
    screenEffect = $[126];
    screenDeps = $[127];
  }
  useLayoutEffect(screenEffect, screenDeps);
  let blockingDialogKind = useAutoDialogKindAlt() ?? null;
  let dialogShownEffect;
  let dialogDeps;
  if ($[128] !== blockingDialogKind) {
    dialogShownEffect = () => {
      markBlockingDialogShown(blockingDialogKind);
      return clearBlockingDialogNow;
    };
    dialogDeps = [blockingDialogKind];
    $[128] = blockingDialogKind;
    $[129] = dialogShownEffect;
    $[130] = dialogDeps;
  } else {
    dialogShownEffect = $[129];
    dialogDeps = $[130];
  }
  useLayoutEffect(dialogShownEffect, dialogDeps);
  let requestDialog = scope.requestDialog;
  let dialogSurface;
  if ($[131] !== requestDialog || $[132] !== turn.loading || $[133] !== turn.tasks) {
    dialogSurface = {
      requestDialog,
      turnActivity: turn.loading,
      tasks: turn.tasks,
    };
    $[131] = requestDialog;
    $[132] = turn.loading;
    $[133] = turn.tasks;
    $[134] = dialogSurface;
  } else dialogSurface = $[134];
  let dialogSurface_2 = dialogSurface;
  let tipsEffect;
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
    tipsEffect = () =>
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
    $[146] = tipsEffect;
  } else tipsEffect = $[146];
  let [contextualTips] = useState(tipsEffect);
  let startTips;
  let tipsDeps;
  if ($[147] !== contextualTips) {
    startTips = () => contextualTips.start();
    tipsDeps = [contextualTips];
    $[147] = contextualTips;
    $[148] = startTips;
    $[149] = tipsDeps;
  } else {
    startTips = $[148];
    tipsDeps = $[149];
  }
  useEffect(startTips, tipsDeps);
  let recommendationGate = useSerialTaskRunner();
  useLspRecommendationWatcher(requestDialog, recommendationGate);
  useClaudeCodeHintRecommendation(requestDialog, recommendationGate);
  let localJsx = scope.localJsx;
  let hasLocalJsxOverlay = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let hasActiveLocalJsxUI = useDialogSelector(isLocalJsxHoldingQueue);
  let panelHidesPrompt = useHasOpenDialog();
  let terminalTitleEffect;
  if ($[150] !== scope || $[151] !== session || $[152] !== sessionController || $[153] !== store) {
    terminalTitleEffect = () =>
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
    $[154] = terminalTitleEffect;
  } else terminalTitleEffect = $[154];
  let [titles] = useState(terminalTitleEffect);
  let hasOpenDialog = useHasOpenDialog_2();
  let modalVisibility = LayoutOverflow();
  let readFileState = useDialogSelector(hasBlockingDialog);
  let readRunning;
  let subscribeRunning;
  if ($[155] !== guard.isRunning) {
    readRunning = () => guard.isRunning;
    subscribeRunning = () => guard.isRunning;
    $[155] = guard.isRunning;
    $[156] = readRunning;
    $[157] = subscribeRunning;
  } else {
    readRunning = $[156];
    subscribeRunning = $[157];
  }
  let isResponseRunning = useSyncExternalStore(guard.subscribe, readRunning, subscribeRunning);
  let hasLocalOverlay = hasLocalJsxOverlay && !isResponseRunning;
  let panelHoldsQueue = hasActiveLocalJsxUI && !isResponseRunning;
  let dialogOverPanel = useHasBlockingDialog();
  let topAutoDialogKind = useTopAutoDialogKind();
  let isUltraplanChoiceShowing = blockingDialogKind === ULTRAPLAN_CHOICE_DIALOG_SPEC.kind;
  let elicitationShowing;
  if ($[158] !== blockingDialogKind) {
    elicitationShowing = isElicitationDialogKind_2(blockingDialogKind);
    $[158] = blockingDialogKind;
    $[159] = elicitationShowing;
  } else elicitationShowing = $[159];
  let elicitationShowing_2 = elicitationShowing;
  let pinnedConsentShowing = isElicitationDialogKind(blockingDialogKind);
  let agentId;
  if ($[160] === MEMO_CACHE_SENTINEL) {
    agentId = mainAgentId();
    $[160] = agentId;
  } else agentId = $[160];
  let { messages } = transcriptMessagesStore(agentId);
  let rewindEffect;
  if ($[161] !== localJsx || $[162] !== sessionController || $[163] !== turn) {
    rewindEffect = () => {
      openRewindSelector({
        localJsx,
        turn,
        sessionController,
      });
    };
    $[161] = localJsx;
    $[162] = sessionController;
    $[163] = turn;
    $[164] = rewindEffect;
  } else rewindEffect = $[164];
  let openMessageSelector = rewindEffect;
  let idleNudgeEffect;
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
    idleNudgeEffect = () =>
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
    $[176] = idleNudgeEffect;
  } else idleNudgeEffect = $[176];
  let [idleNudge] = useState(idleNudgeEffect);
  let overlayEffect;
  let overlayDeps;
  if ($[177] !== hasLocalJsxOverlay || $[178] !== hasToolProgress || $[179] !== idleNudge) {
    overlayEffect = () => {
      idleNudge.setLocalOverlayShowing(hasToolProgress || hasLocalJsxOverlay);
    };
    overlayDeps = [idleNudge, hasToolProgress, hasLocalJsxOverlay];
    $[177] = hasLocalJsxOverlay;
    $[178] = hasToolProgress;
    $[179] = idleNudge;
    $[180] = overlayEffect;
    $[181] = overlayDeps;
  } else {
    overlayEffect = $[180];
    overlayDeps = $[181];
  }
  useEffect(overlayEffect, overlayDeps);
  let pollEventEffect;
  if ($[182] !== isThinClient_2 || $[183] !== messageQueue || $[184] !== turn.guard) {
    pollEventEffect = () =>
      isPollEventIngressActive() && !isThinClient_2
        ? new PollEventIdleDelivery({
            queue: messageQueue,
            guard: turn.guard,
          })
        : null;
    $[182] = isThinClient_2;
    $[183] = messageQueue;
    $[184] = turn.guard;
    $[185] = pollEventEffect;
  } else pollEventEffect = $[185];
  let [pollEventDelivery] = useState(pollEventEffect);
  let turnEvents;
  if ($[186] !== turnEventTail.enqueue) {
    turnEvents = {
      begin: randomUUID,
      enqueue: turnEventTail.enqueue,
    };
    $[186] = turnEventTail.enqueue;
    $[187] = turnEvents;
  } else turnEvents = $[187];
  let turnEvents_2 = turnEvents;
  let quotaResumeEffect;
  let quotaResumeDeps;
  if ($[188] !== turn) {
    quotaResumeEffect = () => {
      let updated = onQuotaResumeEvent((prev) => {
        if (prev === "armed" || prev === "rearmed") turn.retractRateLimitAutoContinue();
      });
      let updated_2 = onLowPriorityEvent((msg) => {
        if (msg.type === "accepted") turn.retractRateLimitAutoContinue();
      });
      let removedNotifications = onResetFlowEvent((cmd) => {
        if (cmd.type === "reset") turn.retractRateLimitAutoContinue();
      });
      let systemPrompt = onUsageCreditEvent((creditEvent) => {
        if (creditEvent.type === "reset") turn.retractRateLimitAutoContinue();
      });
      return () => {
        updated();
        updated_2();
        removedNotifications();
        systemPrompt();
      };
    };
    quotaResumeDeps = [turn];
    $[188] = turn;
    $[189] = quotaResumeEffect;
    $[190] = quotaResumeDeps;
  } else {
    quotaResumeEffect = $[189];
    quotaResumeDeps = $[190];
  }
  useEffect(quotaResumeEffect, quotaResumeDeps);
  let gestureEffect;
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
    $[204] !== taskRegistry_2 ||
    $[205] !== titles ||
    $[206] !== transcript ||
    $[207] !== turn
  ) {
    gestureEffect = () =>
      new BackgroundGesture({
        store,
        setAppState,
        transcript,
        turn,
        messageQueue,
        session,
        taskRegistry: taskRegistry_2,
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
    $[204] = taskRegistry_2;
    $[205] = titles;
    $[206] = transcript;
    $[207] = turn;
    $[208] = gestureEffect;
  } else gestureEffect = $[208];
  let [gesture] = useState(gestureEffect);
  let lowLatencyEffect;
  if (
    $[209] !== clock ||
    $[210] !== dialogStore ||
    $[211] !== messageQueue ||
    $[212] !== session ||
    $[213] !== spinnerStore ||
    $[214] !== store ||
    $[215] !== taskRegistry_2 ||
    $[216] !== transcript ||
    $[217] !== turn
  ) {
    lowLatencyEffect = () =>
      new QueuedSendNowController({
        turn,
        messageQueue,
        transcript,
        store,
        session,
        taskRegistry: taskRegistry_2,
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
    $[215] = taskRegistry_2;
    $[216] = transcript;
    $[217] = turn;
    $[218] = lowLatencyEffect;
  } else lowLatencyEffect = $[218];
  let [lowLatency] = useState(lowLatencyEffect);
  let resetEffect;
  if ($[219] !== sessionController || $[220] !== setAppState) {
    resetEffect = (event) => {
      setAppState(resetTransientUiState);
      sessionController.applyConversationReset(event);
    };
    $[219] = sessionController;
    $[220] = setAppState;
    $[221] = resetEffect;
  } else resetEffect = $[221];
  let applyLocalConversationReset = resetEffect;
  const adoptRateLimits = !isEmbedded;
  let transportArgs;
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
    transportArgs = {
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
    $[233] = transportArgs;
  } else transportArgs = $[233];
  let { transport, activeRemote, cancellableExternalLoading } = useRemoteTransport(transportArgs);
  let idleCacheQuotaEffect;
  if (
    $[234] !== clock ||
    $[235] !== dialogStore ||
    $[236] !== isQueryDisabled ||
    $[237] !== isDisabled ||
    $[238] !== isEmbedded ||
    $[239] !== idleNudge ||
    $[240] !== isThinClient_2 ||
    $[241] !== sessionController ||
    $[242] !== store ||
    $[243] !== transcript ||
    $[244] !== turn
  ) {
    idleCacheQuotaEffect = () =>
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
            isThinClient: isThinClient_2,
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
    $[240] = isThinClient_2;
    $[241] = sessionController;
    $[242] = store;
    $[243] = transcript;
    $[244] = turn;
    $[245] = idleCacheQuotaEffect;
  } else idleCacheQuotaEffect = $[245];
  let [idleCacheQuota] = useState(idleCacheQuotaEffect);
  let viewedAgentArgs;
  if ($[246] !== messages || $[247] !== screen || $[248] !== turn) {
    viewedAgentArgs = {
      turn,
      messages,
      screen,
    };
    $[246] = messages;
    $[247] = screen;
    $[248] = turn;
    $[249] = viewedAgentArgs;
  } else viewedAgentArgs = $[249];
  let { hasDisplayedStreamingText, tailBlank, focusFoldHoldsPreview } = TurnSpinnerRow(viewedAgentArgs);
  let axBell = useScreenReaderBell();
  let isBashesDialogOpen = useStoreSelector(chrome, selectHasBashesDialog);
  let hasIdeOverlay = useDialogOfKind(ULTRAPLAN_CHOICE_DIALOG_SPEC.kind);
  let ideOverlayEffect;
  let ideOverlayDeps;
  if ($[250] !== isBashesDialogOpen || $[251] !== chrome || $[252] !== hasIdeOverlay) {
    ideOverlayEffect = () => {
      if (hasIdeOverlay && isBashesDialogOpen) chrome.closeBashesDialog();
    };
    ideOverlayDeps = [hasIdeOverlay, isBashesDialogOpen, chrome];
    $[250] = isBashesDialogOpen;
    $[251] = chrome;
    $[252] = hasIdeOverlay;
    $[253] = ideOverlayEffect;
    $[254] = ideOverlayDeps;
  } else {
    ideOverlayEffect = $[253];
    ideOverlayDeps = $[254];
  }
  useEffect(ideOverlayEffect, ideOverlayDeps);
  let [theme] = useTheme();
  let mainIsBusy =
    userInputOnProcessing || turn.isMainLoopBusy || messageQueue.getMainThreadQueueLength() > 0;
  let viewedAgentKey;
  if ($[255] !== conversationId || $[256] !== mainIsBusy) {
    viewedAgentKey = {
      mainConversationId: conversationId,
      mainIsBusy,
    };
    $[255] = conversationId;
    $[256] = mainIsBusy;
    $[257] = viewedAgentKey;
  } else viewedAgentKey = $[257];
  let focused = useViewedAgentTranscript(viewedAgentKey);
  let bridgeArgs;
  if (
    $[258] !== focusFoldHoldsPreview ||
    $[259] !== focused.isLoading ||
    $[260] !== focused.isMain ||
    $[261] !== readFileState ||
    $[262] !== hasDisplayedStreamingText ||
    $[263] !== isBriefOnly ||
    $[264] !== hasLocalOverlay ||
    $[265] !== teamContext ||
    $[266] !== onStreamingText ||
    $[267] !== tailBlank ||
    $[268] !== toolProgress
  ) {
    bridgeArgs =
      !hasVisibleProgress(toolProgress) &&
      !readFileState &&
      !hasLocalOverlay &&
      focused.isLoading &&
      !(codeModeAccepted() && focused.isMain && onStreamingText) &&
      !teamContext &&
      (!hasDisplayedStreamingText || tailBlank || isBriefOnly || focusFoldHoldsPreview);
    $[258] = focusFoldHoldsPreview;
    $[259] = focused.isLoading;
    $[260] = focused.isMain;
    $[261] = readFileState;
    $[262] = hasDisplayedStreamingText;
    $[263] = isBriefOnly;
    $[264] = hasLocalOverlay;
    $[265] = teamContext;
    $[266] = onStreamingText;
    $[267] = tailBlank;
    $[268] = toolProgress;
    $[269] = bridgeArgs;
  } else bridgeArgs = $[269];
  let showSpinner = bridgeArgs;
  useBackgroundAskEmitter();
  useBackgroundQuestionAnswer();
  let bridgeCommandsArgs;
  if ($[270] !== scope || $[271] !== store || $[272] !== transport || $[273] !== turn) {
    bridgeCommandsArgs = {
      turn,
      scope,
      store,
      transport,
    };
    $[270] = scope;
    $[271] = store;
    $[272] = transport;
    $[273] = turn;
    $[274] = bridgeCommandsArgs;
  } else bridgeCommandsArgs = $[274];
  useBridgeImmediateCommands(bridgeCommandsArgs);
  let bridgeDeps;
  let bridgeDepsB;
  if (
    $[275] !== gesture ||
    $[276] !== idleCacheQuota ||
    $[277] !== idleNudge ||
    $[278] !== lowLatency ||
    $[279] !== pollEventDelivery ||
    $[280] !== scrollPin ||
    $[281] !== titles
  ) {
    bridgeDeps = () => {
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
    bridgeDepsB = [idleNudge, idleCacheQuota, pollEventDelivery, gesture, lowLatency, titles, scrollPin];
    $[275] = gesture;
    $[276] = idleCacheQuota;
    $[277] = idleNudge;
    $[278] = lowLatency;
    $[279] = pollEventDelivery;
    $[280] = scrollPin;
    $[281] = titles;
    $[282] = bridgeDeps;
    $[283] = bridgeDepsB;
  } else {
    bridgeDeps = $[282];
    bridgeDepsB = $[283];
  }
  useEffect(bridgeDeps, bridgeDepsB);
  let [surveySlot] = useState(createSurveySlotStore);
  let ideArgs;
  if ($[284] !== autoConnectIdeFlag || $[285] !== requestDialog || $[286] !== scope.addAutoConnectedIde) {
    ideArgs = {
      autoConnectIdeFlag,
      onAutoConnectIde: scope.addAutoConnectedIde,
      requestDialog,
    };
    $[284] = autoConnectIdeFlag;
    $[285] = requestDialog;
    $[286] = scope.addAutoConnectedIde;
    $[287] = ideArgs;
  } else ideArgs = $[287];
  let { installationStatus, installExtension } = useIDEIntegration(ideArgs);
  let onFileHistory;
  if ($[288] !== setAppState) {
    onFileHistory = (fileHistoryState) =>
      setAppState((prev) => ({
        ...prev,
        fileHistory: fileHistoryState,
      }));
    $[288] = setAppState;
    $[289] = onFileHistory;
  } else onFileHistory = $[289];
  useAwaySummaryOnce(initialFileHistorySnapshots, onFileHistory);
  let sessionStartEffect;
  let sessionStartDeps;
  if ($[290] !== sessionController) {
    sessionStartEffect = () => sessionController.start();
    sessionStartDeps = [sessionController];
    $[290] = sessionController;
    $[291] = sessionStartEffect;
    $[292] = sessionStartDeps;
  } else {
    sessionStartEffect = $[291];
    sessionStartDeps = $[292];
  }
  useEffect(sessionStartEffect, sessionStartDeps);
  let exitState = useStoreSelector(chrome, isExiting);
  let hasTeamModal = useHasModalDialog();
  let isModalOpen = useHasModalUserDialog();
  let dialogSelector = useDialogSelector(hasAutoDialogWithoutMeta);
  let hasSuppressedDialogs = isDialogActive && dialogSelector;
  let suppressedDialogsEffect;
  let suppressedDeps;
  if (
    $[293] !== chrome ||
    $[294] !== debug ||
    $[295] !== isEmbedded ||
    $[296] !== hasSuppressedDialogs ||
    $[297] !== shouldHideLoginNotice ||
    $[298] !== onDetachToCaller
  ) {
    suppressedDialogsEffect = () => {
      chrome.setView({
        debug,
        embedded: isEmbedded,
        onDetachToCaller,
        hasSuppressedDialogs,
        hideLoginNotice: shouldHideLoginNotice,
      });
    };
    suppressedDeps = [
      chrome,
      debug,
      isEmbedded,
      onDetachToCaller,
      hasSuppressedDialogs,
      shouldHideLoginNotice,
    ];
    $[293] = chrome;
    $[294] = debug;
    $[295] = isEmbedded;
    $[296] = hasSuppressedDialogs;
    $[297] = shouldHideLoginNotice;
    $[298] = onDetachToCaller;
    $[299] = suppressedDialogsEffect;
    $[300] = suppressedDeps;
  } else {
    suppressedDialogsEffect = $[299];
    suppressedDeps = $[300];
  }
  useLayoutEffect(suppressedDialogsEffect, suppressedDeps);
  let pauseEffect;
  let pauseDeps;
  if ($[301] !== pauseAnimation_2) {
    pauseEffect = () => {
      setBlockingToolProgress(pauseAnimation_2);
      return setPauseAnimation;
    };
    pauseDeps = [pauseAnimation_2];
    $[301] = pauseAnimation_2;
    $[302] = pauseEffect;
    $[303] = pauseDeps;
  } else {
    pauseEffect = $[302];
    pauseDeps = $[303];
  }
  useLayoutEffect(pauseEffect, pauseDeps);
  let submitEffect;
  if (
    $[304] !== addNotification ||
    $[305] !== chrome ||
    $[306] !== dialogStore ||
    $[307] !== draft ||
    $[308] !== idleNudge ||
    $[309] !== lowLatency ||
    $[310] !== messageQueue ||
    $[311] !== presentation ||
    $[312] !== scope ||
    $[313] !== scrollPin ||
    $[314] !== session ||
    $[315] !== setAppState ||
    $[316] !== setSessionState ||
    $[317] !== spinnerStore ||
    $[318] !== storageV5 ||
    $[319] !== store ||
    $[320] !== taskRegistry_2 ||
    $[321] !== transcript ||
    $[322] !== transport ||
    $[323] !== turn
  ) {
    submitEffect = () =>
      new PromptSubmitController({
        store,
        presentation,
        setAppState,
        setSessionState,
        session,
        storageV5,
        dialogStore,
        spinnerStore,
        taskRegistry: taskRegistry_2,
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
    $[304] = addNotification;
    $[305] = chrome;
    $[306] = dialogStore;
    $[307] = draft;
    $[308] = idleNudge;
    $[309] = lowLatency;
    $[310] = messageQueue;
    $[311] = presentation;
    $[312] = scope;
    $[313] = scrollPin;
    $[314] = session;
    $[315] = setAppState;
    $[316] = setSessionState;
    $[317] = spinnerStore;
    $[318] = storageV5;
    $[319] = store;
    $[320] = taskRegistry_2;
    $[321] = transcript;
    $[322] = transport;
    $[323] = turn;
    $[324] = submitEffect;
  } else submitEffect = $[324];
  let [submitController] = useState(submitEffect);
  let queuedPromptController;
  if (
    $[325] !== addNotification ||
    $[326] !== contextualTips ||
    $[327] !== dialogStore ||
    $[328] !== draft ||
    $[329] !== removeNotification ||
    $[330] !== store ||
    $[331] !== submitController.submit ||
    $[332] !== turn
  ) {
    queuedPromptController = () =>
      new QueuedEarlyPromptController({
        store,
        dialogStore,
        draft,
        turn,
        callouts: contextualTips,
        submit: submitController.submit,
        addNotification,
        removeNotification,
      });
    $[325] = addNotification;
    $[326] = contextualTips;
    $[327] = dialogStore;
    $[328] = draft;
    $[329] = removeNotification;
    $[330] = store;
    $[331] = submitController.submit;
    $[332] = turn;
    $[333] = queuedPromptController;
  } else queuedPromptController = $[333];
  let [controller] = useState(queuedPromptController);
  let startEffect;
  let startDeps;
  if ($[334] !== controller) {
    startEffect = () => controller.start();
    startDeps = [controller];
    $[334] = controller;
    $[335] = startEffect;
    $[336] = startDeps;
  } else {
    startEffect = $[335];
    startDeps = $[336];
  }
  useEffect(startEffect, startDeps);
  let cancelEffect;
  if ($[337] !== cancelRef || $[338] !== submitController.cancelAndDrainPending) {
    cancelEffect = () => {
      if (cancelRef) cancelRef.current = submitController.cancelAndDrainPending;
    };
    $[337] = cancelRef;
    $[338] = submitController.cancelAndDrainPending;
    $[339] = cancelEffect;
  } else cancelEffect = $[339];
  let cancelDeps;
  if ($[340] !== cancelRef || $[341] !== submitController) {
    cancelDeps = [cancelRef, submitController];
    $[340] = cancelRef;
    $[341] = submitController;
    $[342] = cancelDeps;
  } else cancelDeps = $[342];
  useEffect(cancelEffect, cancelDeps);
  const isColdResumeQuotaShowing = blockingDialogKind === COLD_RESUME_QUOTA;
  let idleReturnNode;
  if ($[343] !== dialogStore || $[344] !== draft || $[345] !== isColdResumeQuotaShowing) {
    idleReturnNode = jsxProd_default(useIdleReturnTypeThrough, {
      onScreen: isColdResumeQuotaShowing,
      dialogStore,
      draft,
    });
    $[343] = dialogStore;
    $[344] = draft;
    $[345] = isColdResumeQuotaShowing;
    $[346] = idleReturnNode;
  } else idleReturnNode = $[346];
  let stoppableWork;
  if ($[347] !== scope.toolState) {
    stoppableWork = codeModeAccepted()
      ? (() => {
          let { ReplSessions, mainThreadStoppableWork } = require("../state/replSessions.js");
          return mainThreadStoppableWork(scope.toolState.get(ReplSessions));
        })()
      : undefined;
    $[347] = scope.toolState;
    $[348] = stoppableWork;
  } else stoppableWork = $[348];
  let topBarNode;
  if (
    $[349] !== activeRemote.isRemoteMode ||
    $[350] !== cancellableExternalLoading ||
    $[351] !== chrome ||
    $[352] !== draft ||
    $[353] !== screen ||
    $[354] !== submitController ||
    $[355] !== stoppableWork ||
    $[356] !== transcript ||
    $[357] !== turn
  ) {
    topBarNode = jsxProd_default(PromptArea, {
      turn,
      transcript,
      draft,
      chrome,
      submitController,
      stoppableWork,
      screen,
      isExternalLoading: cancellableExternalLoading,
      sendsPromptsElsewhere: activeRemote.isRemoteMode,
    });
    $[349] = activeRemote.isRemoteMode;
    $[350] = cancellableExternalLoading;
    $[351] = chrome;
    $[352] = draft;
    $[353] = screen;
    $[354] = submitController;
    $[355] = stoppableWork;
    $[356] = transcript;
    $[357] = turn;
    $[358] = topBarNode;
  } else topBarNode = $[358];
  let topBarNode_2;
  if ($[359] !== idleReturnNode || $[360] !== topBarNode) {
    topBarNode_2 = jsxProd_default_2(Fragment, {
      children: [idleReturnNode, topBarNode],
    });
    $[359] = idleReturnNode;
    $[360] = topBarNode;
    $[361] = topBarNode_2;
  } else topBarNode_2 = $[361];
  let promptEffects = topBarNode_2;
  let canUseTool = useCanUseToolRef();
  let runningScriptsSource;
  if ($[362] !== scope.toolState) {
    runningScriptsSource = () =>
      codeModeAccepted()
        ? require("../utils/codeMode/runningScripts.js").runningScriptsSource(scope.toolState)
        : null;
    $[362] = scope.toolState;
    $[363] = runningScriptsSource;
  } else runningScriptsSource = $[363];
  let [mcpReconnectContext] = useState(runningScriptsSource);
  let connectEffect;
  let connectDeps;
  if ($[364] !== scope) {
    connectEffect = () => {
      scope.connect();
      return () => scope.dispose();
    };
    connectDeps = [scope];
    $[364] = scope;
    $[365] = connectEffect;
    $[366] = connectDeps;
  } else {
    connectEffect = $[365];
    connectDeps = $[366];
  }
  useLayoutEffect(connectEffect, connectDeps);
  let backgroundQueryArgs;
  if ($[367] !== gesture.backgroundQuery) {
    backgroundQueryArgs = {
      onBackgroundQuery: gesture.backgroundQuery,
    };
    $[367] = gesture.backgroundQuery;
    $[368] = backgroundQueryArgs;
  } else backgroundQueryArgs = $[368];
  let { handleBackgroundSession } = useSessionBackgrounding(backgroundQueryArgs);
  let { markTurnStart, markTurnDone } = useSemanticPromptMarks();
  let leftArrowArgs;
  if ($[369] !== gesture || $[370] !== onDetachToCaller || $[371] !== transcript || $[372] !== turn) {
    leftArrowArgs = {
      gesture,
      turn,
      transcript,
      onDetachToCaller,
    };
    $[369] = gesture;
    $[370] = onDetachToCaller;
    $[371] = transcript;
    $[372] = turn;
    $[373] = leftArrowArgs;
  } else leftArrowArgs = $[373];
  useLeftArrowGesture(leftArrowArgs);
  let exitCostEffect;
  if ($[374] !== guard.isRunning || $[375] !== storageV5 || $[376] !== transcript) {
    exitCostEffect = () => {
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
    $[374] = guard.isRunning;
    $[375] = storageV5;
    $[376] = transcript;
    $[377] = exitCostEffect;
  } else exitCostEffect = $[377];
  let exitCostDeps;
  if ($[378] !== guard || $[379] !== storageV5 || $[380] !== transcript) {
    exitCostDeps = [transcript, guard, storageV5];
    $[378] = guard;
    $[379] = storageV5;
    $[380] = transcript;
    $[381] = exitCostDeps;
  } else exitCostDeps = $[381];
  useEffect(exitCostEffect, exitCostDeps);
  useExitCostReport(isTerminalInterested());
  let contextualTipsEffect;
  if ($[382] !== writePacer || $[383] !== sessionController || $[384] !== transcript || $[385] !== turn) {
    contextualTipsEffect = () =>
      writePacer
        ? {
            transcript,
            isWritePaced: writePacer.isDeferring,
            isRestored: (ref) => sessionController.isAsRestored(ref),
            isHeadPending: () => sessionController.headHooksPending,
            isResponseInFlight: () => turn.getSnapshot().isLoading,
          }
        : undefined;
    $[382] = writePacer;
    $[383] = sessionController;
    $[384] = transcript;
    $[385] = turn;
    $[386] = contextualTipsEffect;
  } else contextualTipsEffect = $[386];
  let [restoredFlag] = useState(contextualTipsEffect);
  let isRestored;
  if ($[387] !== messages || $[388] !== sessionController) {
    isRestored = sessionController.isAsRestored(messages);
    $[387] = messages;
    $[388] = sessionController;
    $[389] = isRestored;
  } else isRestored = $[389];
  useLogMessages(messages, isRestored, isLoading, restoredFlag, headHooksPending);
  const spawnThinkingConfig = thinkingConfigExplicit ? thinkingConfig : undefined;
  let screenFrameEffect;
  if (
    $[390] !== appendSystemPrompt ||
    $[391] !== systemPrompt ||
    $[392] !== permissionRelays ||
    $[393] !== scope ||
    $[394] !== systemPromptSnapshot ||
    $[395] !== spawnThinkingConfig ||
    $[396] !== thinkingDisplayFlag ||
    $[397] !== transcript ||
    $[398] !== transport ||
    $[399] !== turn
  ) {
    screenFrameEffect = {
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
    $[390] = appendSystemPrompt;
    $[391] = systemPrompt;
    $[392] = permissionRelays;
    $[393] = scope;
    $[394] = systemPromptSnapshot;
    $[395] = spawnThinkingConfig;
    $[396] = thinkingDisplayFlag;
    $[397] = transcript;
    $[398] = transport;
    $[399] = turn;
    $[400] = screenFrameEffect;
  } else screenFrameEffect = $[400];
  let { sendBridgeResult, stampBridgeReply } = ReplBridgeConnector(screenFrameEffect);
  let { columns, rows } = useTerminalSize();
  let viewportEffect;
  if (
    $[401] !== activePlugins ||
    $[402] !== activeRemote ||
    $[403] !== addNotification ||
    $[404] !== appendSystemPrompt ||
    $[405] !== applyLocalConversationReset ||
    $[406] !== axBell ||
    $[407] !== briefTranscript ||
    $[408] !== canUseTool ||
    $[409] !== chrome ||
    $[410] !== credentials ||
    $[411] !== systemPrompt ||
    $[412] !== debug ||
    $[413] !== dialogStore ||
    $[414] !== isQueryDisabled ||
    $[415] !== isDisabled ||
    $[416] !== draft ||
    $[417] !== elicitationShowing_2 ||
    $[418] !== fallbackModel ||
    $[419] !== isFullscreen ||
    $[420] !== gesture ||
    $[421] !== buildToolUseContext ||
    $[422] !== installationStatus ||
    $[423] !== ideSelection ||
    $[424] !== installExtension ||
    $[425] !== isBriefOnly ||
    $[426] !== isThinClient_2 ||
    $[427] !== mainLoopModel ||
    $[428] !== markTurnDone ||
    $[429] !== markTurnStart ||
    $[430] !== messageQueue ||
    $[431] !== onBeforeQuery ||
    $[432] !== onCaptureSnapshot ||
    $[433] !== openMessageSelector ||
    $[434] !== onTurnComplete ||
    $[435] !== permissionRelays ||
    $[436] !== presentation ||
    $[437] !== removeNotification ||
    $[438] !== scope ||
    $[439] !== screen ||
    $[440] !== scrollPin.reveal ||
    $[441] !== scrollPin.rowHolding ||
    $[442] !== sendBridgeResult ||
    $[443] !== session ||
    $[444] !== sessionController ||
    $[445] !== sessionHooks ||
    $[446] !== setAppState ||
    $[447] !== setSessionState ||
    $[448] !== spinnerStore ||
    $[449] !== stampBridgeReply ||
    $[450] !== storageV5 ||
    $[451] !== store ||
    $[452] !== submitController ||
    $[453] !== systemPromptSnapshot ||
    $[454] !== taskRegistry_2 ||
    $[455] !== teammateColors_2 ||
    $[456] !== terminal ||
    $[457] !== columns ||
    $[458] !== theme ||
    $[459] !== thinkingConfig ||
    $[460] !== thinkingDisplayFlag ||
    $[461] !== titles ||
    $[462] !== transcript ||
    $[463] !== transport ||
    $[464] !== turnEvents_2 ||
    $[465] !== turn
  ) {
    viewportEffect = () => {
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
        taskRegistry: taskRegistry_2,
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
        askAboutSessionOwner: sessionController.askAboutSessionOwner,
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
        restoreDraftsFrom: sessionController.restoreDraftsFrom,
        escTakeBack: transport.escTakeBack,
        draft,
        isThinClient: isThinClient_2,
        titles,
        setHaikuTitle: sessionController.setHaikuTitle,
        activeRemote,
        elicitationShowing: elicitationShowing_2,
        gesture,
        turnEvents: turnEvents_2,
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
    $[401] = activePlugins;
    $[402] = activeRemote;
    $[403] = addNotification;
    $[404] = appendSystemPrompt;
    $[405] = applyLocalConversationReset;
    $[406] = axBell;
    $[407] = briefTranscript;
    $[408] = canUseTool;
    $[409] = chrome;
    $[410] = credentials;
    $[411] = systemPrompt;
    $[412] = debug;
    $[413] = dialogStore;
    $[414] = isQueryDisabled;
    $[415] = isDisabled;
    $[416] = draft;
    $[417] = elicitationShowing_2;
    $[418] = fallbackModel;
    $[419] = isFullscreen;
    $[420] = gesture;
    $[421] = buildToolUseContext;
    $[422] = installationStatus;
    $[423] = ideSelection;
    $[424] = installExtension;
    $[425] = isBriefOnly;
    $[426] = isThinClient_2;
    $[427] = mainLoopModel;
    $[428] = markTurnDone;
    $[429] = markTurnStart;
    $[430] = messageQueue;
    $[431] = onBeforeQuery;
    $[432] = onCaptureSnapshot;
    $[433] = openMessageSelector;
    $[434] = onTurnComplete;
    $[435] = permissionRelays;
    $[436] = presentation;
    $[437] = removeNotification;
    $[438] = scope;
    $[439] = screen;
    $[440] = scrollPin.reveal;
    $[441] = scrollPin.rowHolding;
    $[442] = sendBridgeResult;
    $[443] = session;
    $[444] = sessionController;
    $[445] = sessionHooks;
    $[446] = setAppState;
    $[447] = setSessionState;
    $[448] = spinnerStore;
    $[449] = stampBridgeReply;
    $[450] = storageV5;
    $[451] = store;
    $[452] = submitController;
    $[453] = systemPromptSnapshot;
    $[454] = taskRegistry_2;
    $[455] = teammateColors_2;
    $[456] = terminal;
    $[457] = columns;
    $[458] = theme;
    $[459] = thinkingConfig;
    $[460] = thinkingDisplayFlag;
    $[461] = titles;
    $[462] = transcript;
    $[463] = transport;
    $[464] = turnEvents_2;
    $[465] = turn;
    $[466] = viewportEffect;
  } else viewportEffect = $[466];
  useLayoutEffect(viewportEffect);
  let commandsEffect;
  if (
    $[467] !== commands_2 ||
    $[468] !== gesture.handOverInFlight ||
    $[469] !== hasActiveLocalJsxUI ||
    $[470] !== turn
  ) {
    commandsEffect = {
      turn,
      hasActiveLocalJsxUI,
      commands: commands_2,
      handOverInFlight: gesture.handOverInFlight,
    };
    $[467] = commands_2;
    $[468] = gesture.handOverInFlight;
    $[469] = hasActiveLocalJsxUI;
    $[470] = turn;
    $[471] = commandsEffect;
  } else commandsEffect = $[471];
  useQueueProcessor(commandsEffect);
  let blocksBtwReopen = hasOpenDialog || hasLocalJsxOverlay;
  let reopenEffect;
  if (
    $[472] !== blocksBtwReopen ||
    $[473] !== session.btwHistory ||
    $[474] !== store ||
    $[475] !== submitController ||
    $[476] !== turn
  ) {
    reopenEffect = () => {
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
    $[472] = blocksBtwReopen;
    $[473] = session.btwHistory;
    $[474] = store;
    $[475] = submitController;
    $[476] = turn;
    $[477] = reopenEffect;
  } else reopenEffect = $[477];
  let reopenDeps;
  if (
    $[478] !== blocksBtwReopen ||
    $[479] !== session ||
    $[480] !== store ||
    $[481] !== submitController ||
    $[482] !== turn
  ) {
    reopenDeps = [session, submitController, blocksBtwReopen, store, turn];
    $[478] = blocksBtwReopen;
    $[479] = session;
    $[480] = store;
    $[481] = submitController;
    $[482] = turn;
    $[483] = reopenDeps;
  } else reopenDeps = $[483];
  useEffect(reopenEffect, reopenDeps);
  let scheduledArgs;
  if (
    $[484] !== dialogStore ||
    $[485] !== isDisabled ||
    $[486] !== dynamicMcpConfig_2 ||
    $[487] !== hasOpenDialog ||
    $[488] !== installationStatus ||
    $[489] !== isRemoteSession_2 ||
    $[490] !== mainLoopModel ||
    $[491] !== mergedMcpClients ||
    $[492] !== requestDialog ||
    $[493] !== screen ||
    $[494] !== scrollPin.isAtBottom ||
    $[495] !== submitController.submit ||
    $[496] !== transcript ||
    $[497] !== turn
  ) {
    scheduledArgs = {
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
      isRemoteSession: isRemoteSession_2,
      isTranscriptAtBottom: scrollPin.isAtBottom,
    };
    $[484] = dialogStore;
    $[485] = isDisabled;
    $[486] = dynamicMcpConfig_2;
    $[487] = hasOpenDialog;
    $[488] = installationStatus;
    $[489] = isRemoteSession_2;
    $[490] = mainLoopModel;
    $[491] = mergedMcpClients;
    $[492] = requestDialog;
    $[493] = screen;
    $[494] = scrollPin.isAtBottom;
    $[495] = submitController.submit;
    $[496] = transcript;
    $[497] = turn;
    $[498] = scheduledArgs;
  } else scheduledArgs = $[498];
  let idleThresholdMin = useStartupNotifications(scheduledArgs);
  useEffectSlots(STARTUP_CHECKS, idleThresholdMin);
  const swarmEnabled = renderWithForceUpdate(isAgentSwarmsEnabled) && !isRemoteSession_2;
  const visibleDialogKind = topAutoDialogKind ?? (hasActiveLocalJsxUI ? LOCAL_JSX_DIALOG.kind : undefined);
  let props_2;
  if (
    $[499] !== isLoading ||
    $[500] !== requestDialog ||
    $[501] !== swarmEnabled ||
    $[502] !== visibleDialogKind ||
    $[503] !== turn.submitIncomingPrompt
  ) {
    props_2 = {
      enabled: swarmEnabled,
      isLoading,
      visibleDialogKind,
      onSubmitMessage: turn.submitIncomingPrompt,
      requestDialog,
    };
    $[499] = isLoading;
    $[500] = requestDialog;
    $[501] = swarmEnabled;
    $[502] = visibleDialogKind;
    $[503] = turn.submitIncomingPrompt;
    $[504] = props_2;
  } else props_2 = $[504];
  useInboxPollerHook(props_2);
  useMailboxBridge(turn);
  let assistantMode = env.CLAUDE_CODE_PROACTIVE;
  let usageArgs;
  if (
    $[505] !== isLoading ||
    $[506] !== sessionController.runsNoModelTurn ||
    $[507] !== storageV5 ||
    $[508] !== transcript
  ) {
    usageArgs = {
      isLoading,
      assistantMode,
      transcript,
      storageV5,
      disabled: sessionController.runsNoModelTurn,
    };
    $[505] = isLoading;
    $[506] = sessionController.runsNoModelTurn;
    $[507] = storageV5;
    $[508] = transcript;
    $[509] = usageArgs;
  } else usageArgs = $[509];
  useScheduledTasks(usageArgs);
  let usageDeps;
  if ($[510] !== isLoading || $[511] !== transcript) {
    usageDeps = {
      isLoading,
      transcript,
    };
    $[510] = isLoading;
    $[511] = transcript;
    $[512] = usageDeps;
  } else usageDeps = $[512];
  let tokenWarningState = useUsageLimitNotices(usageDeps);
  let usageDepsB;
  if ($[513] === MEMO_CACHE_SENTINEL) {
    usageDepsB = [];
    $[513] = usageDepsB;
  } else usageDepsB = $[513];
  useEffect(noop_5, usageDepsB);
  let resumeDeps;
  if ($[514] === MEMO_CACHE_SENTINEL) {
    resumeDeps = [];
    $[514] = resumeDeps;
  } else resumeDeps = $[514];
  useEffect(noop_6, resumeDeps);
  let suspendKey = useSuspendResume();
  let virtualScrollActive = isFullscreen && !CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let columnsProp = columns;
  let screenFrameProps;
  if (
    $[515] !== dialogSurface_2 ||
    $[516] !== draft ||
    $[517] !== isEmbedded ||
    $[518] !== gesture ||
    $[519] !== localJsx ||
    $[520] !== screen ||
    $[521] !== scrollPin ||
    $[522] !== titles ||
    $[523] !== transcript ||
    $[524] !== turn
  ) {
    screenFrameProps = {
      embedded: isEmbedded,
      screen,
      turn,
      transcript,
      titles,
      localJsx,
      dialogSurface: dialogSurface_2,
      attachRequests: gesture,
      draft,
      scrollPin,
    };
    $[515] = dialogSurface_2;
    $[516] = draft;
    $[517] = isEmbedded;
    $[518] = gesture;
    $[519] = localJsx;
    $[520] = screen;
    $[521] = scrollPin;
    $[522] = titles;
    $[523] = transcript;
    $[524] = turn;
    $[525] = screenFrameProps;
  } else screenFrameProps = $[525];
  let screenFrameProps_2 = screenFrameProps;
  let frameNode;
  if (
    $[526] !== isRemoteSession_2 ||
    $[527] !== localJsx ||
    $[528] !== surveySlot ||
    $[529] !== transcript ||
    $[530] !== turn
  ) {
    frameNode = jsxProd_default(SurveyStatePublisher, {
      turn,
      transcript,
      isRemoteSession: isRemoteSession_2,
      slot: surveySlot,
      localJsx,
    });
    $[526] = isRemoteSession_2;
    $[527] = localJsx;
    $[528] = surveySlot;
    $[529] = transcript;
    $[530] = turn;
    $[531] = frameNode;
  } else frameNode = $[531];
  let withChrome = frameNode;
  let wrappedNode;
  if (
    $[532] !== chrome ||
    $[533] !== initialMessages ||
    $[534] !== isRemoteSession_2 ||
    $[535] !== mergedMcpClients
  ) {
    wrappedNode = jsxProd_default(ReplEffects, {
      chrome,
      mcpClients: mergedMcpClients,
      initialMessages,
      isRemoteSession: isRemoteSession_2,
    });
    $[532] = chrome;
    $[533] = initialMessages;
    $[534] = isRemoteSession_2;
    $[535] = mergedMcpClients;
    $[536] = wrappedNode;
  } else wrappedNode = $[536];
  let providersNode = wrappedNode;
  let withProviders;
  if (
    $[537] !== providersNode ||
    $[538] !== dynamicMcpConfig_2 ||
    $[539] !== permissionRelays ||
    $[540] !== requestDialog ||
    $[541] !== mcpReconnectContext ||
    $[542] !== isStrictMcpConfig ||
    $[543] !== withChrome
  ) {
    withProviders = function wrapNode(children) {
      return jsxProd_default_2(Fragment, {
        children: [
          withChrome,
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
          providersNode,
          null,
        ],
      });
    };
    $[537] = providersNode;
    $[538] = dynamicMcpConfig_2;
    $[539] = permissionRelays;
    $[540] = requestDialog;
    $[541] = mcpReconnectContext;
    $[542] = isStrictMcpConfig;
    $[543] = withChrome;
    $[544] = withProviders;
  } else withProviders = $[544];
  let wrapWithProviders = withProviders;
  getViewedTeammateTask_2();
  useAgentsHintExpiry();
  let diffSidebarEnabled = useDiffSidebarState();
  let hasOpenPanes = PaneDockNamespace.usePanesAtOnce(PaneDockNamespace.hasOpenPanes);
  let dockColumns = PaneDockNamespace.useDockColumns(columnsProp);
  PaneDockNamespace.usePaneToastHold();
  PaneDockNamespace.useBarToasts();
  let sidebarWidth;
  if (
    $[545] !== diffSidebarEnabled ||
    $[546] !== hasGitRepo ||
    $[547] !== focused.isMain ||
    $[548] !== isFullscreen ||
    $[549] !== isThinClient_2 ||
    $[550] !== replTab ||
    $[551] !== columnsProp
  ) {
    sidebarWidth =
      replTab === "diff" &&
      shouldShowDiffSidebar({
        enabled: diffSidebarEnabled,
        fullscreen: isFullscreen,
        columns: columnsProp,
        isThinClient: isThinClient_2,
        isMainFocused: focused.isMain,
        hasGitRepo,
      })
        ? computeMaxDockColumns(columnsProp)
        : 0;
    $[545] = diffSidebarEnabled;
    $[546] = hasGitRepo;
    $[547] = focused.isMain;
    $[548] = isFullscreen;
    $[549] = isThinClient_2;
    $[550] = replTab;
    $[551] = columnsProp;
    $[552] = sidebarWidth;
  } else sidebarWidth = $[552];
  let sidebarWidth_2 = sidebarWidth;
  let toastWidth = isFullscreen && sidebarWidth_2 === 0 ? dockColumns : 0;
  let dockWidth = toastRegionWidth(hasOpenPanes, toastWidth, columnsProp);
  let reservedWidth = screen === "transcript" ? 0 : sidebarWidth_2 + dockWidth;
  useTerminalViewportNamespace.useTerminalViewport(columns, rows, reservedWidth);
  let trackedCountSelector;
  if ($[553] !== diffSidebarEnabled) {
    trackedCountSelector = (state) => (diffSidebarEnabled ? state.fileHistory.trackedFiles.size : 0);
    $[553] = diffSidebarEnabled;
    $[554] = trackedCountSelector;
  } else trackedCountSelector = $[554];
  let userMessage = useAppState(trackedCountSelector);
  let autoOpenBaseline = useDiffAutoOpenBaseline(diffSidebarEnabled, userMessage);
  let baselineArgs;
  if ($[555] !== hasToolProgress || $[556] !== renderingTools || $[557] !== toolProgress) {
    baselineArgs = hasToolProgress
      ? jsxProd_default(InlineProgressList, {
          progress: toolProgress,
          tools: renderingTools,
        })
      : null;
    $[555] = hasToolProgress;
    $[556] = renderingTools;
    $[557] = toolProgress;
    $[558] = baselineArgs;
  } else baselineArgs = $[558];
  let scrollViewport = baselineArgs;
  let scrollViewport_2 = isEmbedded || (virtualScrollActive && !dumpMode) ? scrollPin.viewport : undefined;
  let inlineRenderer = !isFullscreen && !isEmbedded && !isDecstbmRendererEnabled();
  let isTranscriptScreen = screen === "transcript";
  let promptAreaEffect;
  if (
    $[559] !== commands_2 ||
    $[560] !== dumpMode ||
    $[561] !== isEmbedded ||
    $[562] !== focused ||
    $[563] !== hideWelcomeChrome ||
    $[564] !== isRemoteSession_2 ||
    $[565] !== renderingTools ||
    $[566] !== scrollPin.onUserScrollWithoutDivider ||
    $[567] !== scrollPin.revealRef ||
    $[568] !== scrollViewport ||
    $[569] !== scrollViewport_2 ||
    $[570] !== isTranscriptScreen ||
    $[571] !== turn ||
    $[572] !== isUltraplanChoiceShowing ||
    $[573] !== virtualScrollActive
  ) {
    promptAreaEffect =
      isTranscriptScreen &&
      jsxProd_default(TranscriptView, {
        focused,
        tools: renderingTools,
        commands: commands_2,
        turn,
        hideWelcomeChrome: hideWelcomeChrome ?? isEmbedded,
        toolProgress: scrollViewport,
        scrollViewport: scrollViewport_2,
        reveal: scrollPin.revealRef,
        onUserScroll: scrollPin.onUserScrollWithoutDivider,
        virtualScrollActive,
        embedded: isEmbedded,
        scrollKeysActive: !isUltraplanChoiceShowing,
        showSandboxViolations: !isRemoteSession_2,
        dumpMode,
        onDumpToScrollback: () => setDumpMode(true),
        onExit: exitTranscript,
      });
    $[559] = commands_2;
    $[560] = dumpMode;
    $[561] = isEmbedded;
    $[562] = focused;
    $[563] = hideWelcomeChrome;
    $[564] = isRemoteSession_2;
    $[565] = renderingTools;
    $[566] = scrollPin.onUserScrollWithoutDivider;
    $[567] = scrollPin.revealRef;
    $[568] = scrollViewport;
    $[569] = scrollViewport_2;
    $[570] = isTranscriptScreen;
    $[571] = turn;
    $[572] = isUltraplanChoiceShowing;
    $[573] = virtualScrollActive;
    $[574] = promptAreaEffect;
  } else promptAreaEffect = $[574];
  let transcriptView = promptAreaEffect;
  if (isTranscriptScreen && !inlineRenderer) {
    const fullscreen = scrollViewport_2 !== undefined;
    let children;
    if ($[575] !== promptEffects || $[576] !== transcriptView) {
      children = jsxProd_default_2(KeybindingRoot, {
        children: [promptEffects, transcriptView],
      });
      $[575] = promptEffects;
      $[576] = transcriptView;
      $[577] = children;
    } else children = $[577];
    let children_2;
    if ($[578] !== isEmbedded || $[579] !== children) {
      children_2 = jsxProd_default(UnattendedNoticeProvider, {
        drawn: false,
        hideSessionTitle: isEmbedded,
        children,
      });
      $[578] = isEmbedded;
      $[579] = children;
      $[580] = children_2;
    } else children_2 = $[580];
    let children_3;
    if ($[581] !== tokenWarningState || $[582] !== children_2) {
      children_3 = jsxProd_default(noticeQueueStore.Provider, {
        value: tokenWarningState,
        children: children_2,
      });
      $[581] = tokenWarningState;
      $[582] = children_2;
      $[583] = children_3;
    } else children_3 = $[583];
    let screenFrame;
    if ($[584] !== screenFrameProps_2 || $[585] !== fullscreen || $[586] !== children_3) {
      screenFrame = jsxProd_default(ReplScreenFrame, {
        ...screenFrameProps_2,
        fullscreen,
        children: children_3,
      });
      $[584] = screenFrameProps_2;
      $[585] = fullscreen;
      $[586] = children_3;
      $[587] = screenFrame;
    } else screenFrame = $[587];
    let wrappedScreen;
    if ($[588] !== screenFrame || $[589] !== wrapWithProviders) {
      wrappedScreen = wrapWithProviders(screenFrame);
      $[588] = screenFrame;
      $[589] = wrapWithProviders;
      $[590] = wrappedScreen;
    } else wrappedScreen = $[590];
    return wrappedScreen;
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
  let modalNode;
  if (
    $[591] !== modalVisibility ||
    $[592] !== isEmbedded ||
    $[593] !== hasTeamModal ||
    $[594] !== isModalOpen ||
    $[595] !== layoutSlots.inPane
  ) {
    modalNode = hasTeamModal
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
    $[591] = modalVisibility;
    $[592] = isEmbedded;
    $[593] = hasTeamModal;
    $[594] = isModalOpen;
    $[595] = layoutSlots.inPane;
    $[596] = modalNode;
  } else modalNode = $[596];
  let modalNodeB = modalNode;
  let promptVisible = !dialogOverPanel && !exitState && !isDisabled;
  let focusedNode;
  if ($[597] !== focused.messages || $[598] !== screen || $[599] !== isTranscriptScreen) {
    focusedNode =
      !isTranscriptScreen &&
      jsxProd_default(GlobalKeybindingHandlers, {
        screen,
        onToggleTranscript: () => setScreen(toggleScreen),
        messageCount: focused.messages.length,
      });
    $[597] = focused.messages;
    $[598] = screen;
    $[599] = isTranscriptScreen;
    $[600] = focusedNode;
  } else focusedNode = $[600];
  let focusedFrame;
  if (
    $[601] !== focused.isMain ||
    $[602] !== modalSlotActive ||
    $[603] !== scrollPin ||
    $[604] !== isTranscriptScreen ||
    $[605] !== isUltraplanChoiceShowing
  ) {
    focusedFrame =
      !isTranscriptScreen &&
      jsxProd_default(MessageScrollHandler, {
        scrollPin,
        modalSlotActive,
        ultraplanChoiceShowing: isUltraplanChoiceShowing,
        isMain: focused.isMain,
      });
    $[601] = focused.isMain;
    $[602] = modalSlotActive;
    $[603] = scrollPin;
    $[604] = isTranscriptScreen;
    $[605] = isUltraplanChoiceShowing;
    $[606] = focusedFrame;
  } else focusedFrame = $[606];
  const modal = isTranscriptScreen ? undefined : modalNodeB;
  const hidePill = !focused.isMain;
  let sidebar;
  if (
    $[607] !== chrome.setIdeSelection ||
    $[608] !== autoOpenBaseline ||
    $[609] !== diffSidebarEnabled ||
    $[610] !== sidebarWidth_2 ||
    $[611] !== isThinClient_2 ||
    $[612] !== modalSlotActive
  ) {
    sidebar = diffSidebarEnabled
      ? jsxProd_default(SentryErrorBoundary, {
          onError: logDiffSidebarRenderError,
          children: jsxProd_default(DiffSidebar, {
            width: sidebarWidth_2,
            isThinClient: isThinClient_2,
            onAskAboutSelection: modalSlotActive ? undefined : chrome.setIdeSelection,
            autoOpenBaseline,
          }),
        })
      : null;
    $[607] = chrome.setIdeSelection;
    $[608] = autoOpenBaseline;
    $[609] = diffSidebarEnabled;
    $[610] = sidebarWidth_2;
    $[611] = isThinClient_2;
    $[612] = modalSlotActive;
    $[613] = sidebar;
  } else sidebar = $[613];
  const isOffered = toastWidth > 0;
  let dock;
  if ($[614] !== draft || $[615] !== dockWidth || $[616] !== isOffered || $[617] !== turn) {
    dock = jsxProd_default(PromptDock, {
      turn,
      draft,
      isOffered,
      width: dockWidth,
    });
    $[614] = draft;
    $[615] = dockWidth;
    $[616] = isOffered;
    $[617] = turn;
    $[618] = dock;
  } else dock = $[618];
  let dockTail;
  let transcriptOverlay;
  if ($[619] === MEMO_CACHE_SENTINEL) {
    dockTail = jsxProd_default(PaneDockNamespace.DockTail, {});
    transcriptOverlay = jsxProd_default(ToastStackViewNamespace.ToastStackView, {});
    $[619] = dockTail;
    $[620] = transcriptOverlay;
  } else {
    dockTail = $[619];
    transcriptOverlay = $[620];
  }
  const toolProgress_2 = panelHidesPrompt ? null : scrollViewport;
  const stateRowYields = hasLocalOverlay || !!teamContext;
  const hidePlaceholder = isDisabled || modalSlotActive;
  const hideWelcomeChrome_2 = hideWelcomeChrome ?? isEmbedded;
  let scrollable;
  if (
    $[621] !== commands_2 ||
    $[622] !== focused ||
    $[623] !== isRemoteSession_2 ||
    $[624] !== panelHoldsQueue ||
    $[625] !== pauseAnimation_2 ||
    $[626] !== promptVisible ||
    $[627] !== renderingTools ||
    $[628] !== scrollPin ||
    $[629] !== showSpinner ||
    $[630] !== submitController.remoteSendsNow ||
    $[631] !== toolProgress_2 ||
    $[632] !== stateRowYields ||
    $[633] !== hidePlaceholder ||
    $[634] !== hideWelcomeChrome_2 ||
    $[635] !== isTranscriptScreen ||
    $[636] !== transport.rowsDrawn ||
    $[637] !== transport.waitingLines ||
    $[638] !== turn
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
      isRemoteSession: isRemoteSession_2,
      pauseAnimation: pauseAnimation_2,
      hidePlaceholder,
      hideWelcomeChrome: hideWelcomeChrome_2,
      historyHidden: isTranscriptScreen,
    });
    $[621] = commands_2;
    $[622] = focused;
    $[623] = isRemoteSession_2;
    $[624] = panelHoldsQueue;
    $[625] = pauseAnimation_2;
    $[626] = promptVisible;
    $[627] = renderingTools;
    $[628] = scrollPin;
    $[629] = showSpinner;
    $[630] = submitController.remoteSendsNow;
    $[631] = toolProgress_2;
    $[632] = stateRowYields;
    $[633] = hidePlaceholder;
    $[634] = hideWelcomeChrome_2;
    $[635] = isTranscriptScreen;
    $[636] = transport.rowsDrawn;
    $[637] = transport.waitingLines;
    $[638] = turn;
    $[639] = scrollable;
  } else scrollable = $[639];
  let abovePrompt;
  if (
    $[640] !== chrome ||
    $[641] !== draft ||
    $[642] !== isEmbedded ||
    $[643] !== isFullscreen ||
    $[644] !== hasLocalJsxOverlay ||
    $[645] !== hasActiveLocalJsxUI ||
    $[646] !== blockingDialogKind ||
    $[647] !== panelHoldsQueue ||
    $[648] !== dockColumns ||
    $[649] !== pinnedConsentShowing ||
    $[650] !== promptVisible ||
    $[651] !== layoutSlots.abovePrompt ||
    $[652] !== showSpinner ||
    $[653] !== submitController ||
    $[654] !== surveySlot ||
    $[655] !== isTranscriptScreen ||
    $[656] !== transcript ||
    $[657] !== turn
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
            panesDocked: isFullscreen && dockColumns > 0,
          }),
        ],
      });
    $[640] = chrome;
    $[641] = draft;
    $[642] = isEmbedded;
    $[643] = isFullscreen;
    $[644] = hasLocalJsxOverlay;
    $[645] = hasActiveLocalJsxUI;
    $[646] = blockingDialogKind;
    $[647] = panelHoldsQueue;
    $[648] = dockColumns;
    $[649] = pinnedConsentShowing;
    $[650] = promptVisible;
    $[651] = layoutSlots.abovePrompt;
    $[652] = showSpinner;
    $[653] = submitController;
    $[654] = surveySlot;
    $[655] = isTranscriptScreen;
    $[656] = transcript;
    $[657] = turn;
    $[658] = abovePrompt;
  } else abovePrompt = $[658];
  let bottom;
  if (
    $[659] !== chrome ||
    $[660] !== draft ||
    $[661] !== gesture ||
    $[662] !== handleBackgroundSession ||
    $[663] !== promptVisible ||
    $[664] !== scope ||
    $[665] !== submitController ||
    $[666] !== isTranscriptScreen ||
    $[667] !== transcript ||
    $[668] !== turn
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
    $[659] = chrome;
    $[660] = draft;
    $[661] = gesture;
    $[662] = handleBackgroundSession;
    $[663] = promptVisible;
    $[664] = scope;
    $[665] = submitController;
    $[666] = isTranscriptScreen;
    $[667] = transcript;
    $[668] = turn;
    $[669] = bottom;
  } else bottom = $[669];
  let layout;
  if (
    $[670] !== sidebarWidth_2 ||
    $[671] !== focused.isTeammate ||
    $[672] !== dockWidth ||
    $[673] !== scrollPin ||
    $[674] !== modal ||
    $[675] !== hidePill ||
    $[676] !== sidebar ||
    $[677] !== dock ||
    $[678] !== scrollable ||
    $[679] !== abovePrompt ||
    $[680] !== bottom
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
      sidebarWidth: sidebarWidth_2,
      dock,
      dockWidth,
      dockTail,
      transcriptOverlay,
      scrollable,
      abovePrompt,
      bottom,
    });
    $[670] = sidebarWidth_2;
    $[671] = focused.isTeammate;
    $[672] = dockWidth;
    $[673] = scrollPin;
    $[674] = modal;
    $[675] = hidePill;
    $[676] = sidebar;
    $[677] = dock;
    $[678] = scrollable;
    $[679] = abovePrompt;
    $[680] = bottom;
    $[681] = layout;
  } else layout = $[681];
  let suspendNode;
  if ($[682] !== suspendKey || $[683] !== layout) {
    suspendNode = jsxProd_default(
      fragmentTypeExport,
      {
        children: layout,
      },
      suspendKey,
    );
    $[682] = suspendKey;
    $[683] = layout;
    $[684] = suspendNode;
  } else suspendNode = $[684];
  let layoutNode;
  if (
    $[685] !== promptEffects ||
    $[686] !== focusedNode ||
    $[687] !== focusedFrame ||
    $[688] !== suspendNode ||
    $[689] !== transcriptView
  ) {
    layoutNode = jsxProd_default_2(KeybindingRoot, {
      children: [focusedNode, promptEffects, focusedFrame, suspendNode, transcriptView],
    });
    $[685] = promptEffects;
    $[686] = focusedNode;
    $[687] = focusedFrame;
    $[688] = suspendNode;
    $[689] = transcriptView;
    $[690] = layoutNode;
  } else layoutNode = $[690];
  let children = layoutNode;
  let children_2;
  if ($[691] !== isEmbedded || $[692] !== children || $[693] !== layoutSlots.drawn) {
    children_2 = jsxProd_default(UnattendedNoticeProvider, {
      drawn: layoutSlots.drawn,
      hideSessionTitle: isEmbedded,
      children,
    });
    $[691] = isEmbedded;
    $[692] = children;
    $[693] = layoutSlots.drawn;
    $[694] = children_2;
  } else children_2 = $[694];
  let children_3;
  if ($[695] !== tokenWarningState || $[696] !== children_2) {
    children_3 = jsxProd_default(noticeQueueStore.Provider, {
      value: tokenWarningState,
      children: children_2,
    });
    $[695] = tokenWarningState;
    $[696] = children_2;
    $[697] = children_3;
  } else children_3 = $[697];
  let screenFrameFull;
  if ($[698] !== screenFrameProps_2 || $[699] !== isFullscreen || $[700] !== children_3) {
    screenFrameFull = jsxProd_default(ReplScreenFrame, {
      ...screenFrameProps_2,
      fullscreen: isFullscreen,
      children: children_3,
    });
    $[698] = screenFrameProps_2;
    $[699] = isFullscreen;
    $[700] = children_3;
    $[701] = screenFrameFull;
  } else screenFrameFull = $[701];
  let wrappedScreenFull;
  if ($[702] !== screenFrameFull || $[703] !== wrapWithProviders) {
    wrappedScreenFull = wrapWithProviders(screenFrameFull);
    $[702] = screenFrameFull;
    $[703] = wrapWithProviders;
    $[704] = wrappedScreenFull;
  } else wrappedScreenFull = $[704];
  return wrappedScreenFull;
}
export {
  REPL,
  negateBoolean,
  notB,
  TranscriptSearchBar,
  TranscriptHelpFooter,
  TranscriptModeFooter,
  AnimatedTerminalTitle,
};
