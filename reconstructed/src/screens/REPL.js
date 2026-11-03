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
import { resolve, resolve as resolve_2, resolve as resolve_3 } from "path";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { j, y, P, Q, Se, zt, R, yt, Kc } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import {
  useHasOpenDialog as useHasOpenDialog_2,
  useHasAutoDialog,
  useDialogStore,
  useDialogOfKind,
  useDialogSelector,
  bUn,
} from "../state/dialogQueue.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { C5 } from "../utils/editor.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { e, Fragment, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Byline } from "../components/design-system/Byline.js";
import { useSearchInput } from "../hooks/useSearchInput.js";
import { useClock, _T, $L } from "../ink/components/ClockContext.js";
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
import { usePluginFeedbackSurvey, useOrgSurvey } from "./_new/useOrgSurvey.js";
import { useMemorySurvey } from "../components/FeedbackSurvey/useMemorySurvey.js";
import { useFeedbackSurvey } from "../components/FeedbackSurvey/useFeedbackSurvey.js";
import { SpinnerPaceContext, j_o } from "../components/Spinner/paceContext.js";
import { AbovePromptBandNamespace } from "../components/pluginUi/AbovePromptBand.js";
import { FeedbackDraftNotice } from "../components/FeedbackSurvey/FeedbackDraftNotice.js";
import { NOOP_HELPERS } from "../hooks/useCommandKeybindings.js";
import { logError } from "../utils/log.js";
import { WebSetupPromptGate } from "../components/FeedbackSurvey/TranscriptSharePrompt.js";
import { PaneDockNamespace, NU } from "../components/pluginUi/PaneDock.js";
import { Nke } from "../components/PromptInput/PromptComposer.js";
import { SessionBackgroundHint } from "../components/SessionBackgroundHint.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { getTerminalMultiplexer } from "../ink/terminal.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useInterval, useSelection } from "../ink/components/Input.js";
import { useTerminalTitle, useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { Ebe, appendRowsWithHooks } from "../utils/queryHelpers.js";
import { applyMessageListAppend, applyMessageListEdit } from "../cli/print/turnStreaming.js";
import { xo } from "../bootstrap/sessionSlices.js";
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
  Cr,
  B_o,
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
  rCr,
  toggleDiffPanel,
  useLocalWorkspaceDiff,
  cycleDiffBaseMode,
  closeDiffSidebar,
  wFn,
  useDiffSidebarState,
  shouldShowDiffSidebar,
} from "../hooks/useWorkspaceDiff.js";
import { Me, useTheme } from "../components/design-system/ThemeProvider.js";
import { useNotifications } from "../context/notifications.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { logDiffPanelShown } from "./_new/logDiffPanelShown.js";
import { todoToolsEnabled } from "../utils/sessionKind.js";
import { count } from "../utils/collections.js";
import { UV } from "../context/overlayContext.js";
import { rAr, FullscreenLayout } from "../components/FullscreenLayout.js";
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
import { LI } from "../ink/components/ScrollBox.js";
import { HintText } from "../components/design-system/HintText.js";
import { Divider } from "../components/design-system/Divider.js";
import { truncateStartToWidth } from "../utils/format.js";
import { diffLineToPlainText } from "../components/diff/diffText.js";
import { HEAVY_MULTIPLICATION_X } from "../constants/figures.js";
import { BridgeChannelSlot, createColorAssigner } from "../services/artifacts/artifactReadConsent.js";
import { $H, jH, Aw, KH } from "./repl/storeHooks.js";
import { clearBlockingDialog, markBlockingDialogShown } from "../services/requestUserDialog.js";
import { topBlockingDialog, isMotionAllowed, TurnSpinnerRow, spinnerPlacement } from "./replDialogState.js";
import { getGlobalConfig } from "../utils/config.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { gn } from "../utils/shortHash.js";
import { Nu, QueueProvider } from "../context/QueuedMessageContext.js";
import { useRenderMode } from "../ink/renderModeContext.js";
import { lVt } from "../context/replRootContext.js";
import { AHt } from "../components/PromptInput/footerGates.js";
import { useFleetNudgeStore } from "../components/fleet/FleetNudgeStore.js";
import { htt } from "../utils/remoteSessionCommands.js";
import { useRegistryOverride, useBackgroundStatusSync, useSuspendResume } from "./repl/suspendAndSpinner.js";
import { useSpinnerStore } from "../components/Spinner/spinnerStatus.js";
import { createTaskFramework } from "../utils/task/framework.js";
import { IIe, useInformationalMessageSink, ReplBridgeConnector } from "./_new/ReplBridgeConnector.js";
import { wIe } from "../state/sliceHelpers.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import {
  useMainLoopModel as useMainLoopModel_3,
  getMainLoopModelFromState,
} from "../hooks/useMainLoopModel.js";
import { jw } from "../components/PromptInput/Notifications.js";
import {
  runStartupNotificationSpecs,
  useStartupNotifications,
  STARTUP_NOTIFICATION_SPECS,
} from "../hooks/notifs/startupNotificationSpecs.js";
import { FeatureOfTheWeekClaim } from "../components/FeatureOfTheWeekClaim.js";
import { FEe } from "../hooks/notifs/specs/sessionNotices.js";
import { refreshApiCreditLinkStatus } from "../components/LogoV2/ApiCreditLinkNotice.js";
import { ReplSessionScope, runWithQueryParams } from "./repl/ReplSessionScope.js";
import { invalidateUserContext } from "../context.js";
import { isWindowsTerminal } from "../ink/clearTerminal.js";
import { TurnController, useBackgroundQuestionAnswer } from "./repl/TurnController.js";
import { y2n } from "../services/AgentSummary/agentSummary.js";
import { setTranscriptMessages, ug, ReplEffects } from "./repl/ReplEffects.js";
import { useTrustedDeviceEnrolledNotice } from "../hooks/notifs/useNpmDeprecationNotification.js";
import {
  ComposerChrome,
  BV,
  useExitCostReport,
  getViewedTeammateTask_2,
  useAgentsHintExpiry,
  UnattendedNoticeProvider,
  resolveModalPlacement,
} from "./repl/ComposerChrome.js";
import { uiLogNamespace } from "../components/pluginUi/uiLog.js";
import { ien } from "../cli/print/resumeTurnBoundaries.js";
import { SandboxNetworkPrompts } from "./repl/SandboxNetworkPrompts.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { SandboxStartup } from "./repl/SandboxStartup.js";
import { DATE_RANGE_ORDER } from "../components/Stats.js";
import { useAwaySummaryController, useAwaySummaryOnce } from "../hooks/useAwaySummary.js";
import { ScrollPin } from "./repl/ScrollPin.js";
import { bM, setPromptValue } from "../state/promptInputStore.js";
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
import { useSerialTaskRunner } from "./_new/useSerialTaskRunner.js";
import { useLspRecommendationWatcher } from "../hooks/useLspPluginRecommendation.js";
import { useClaudeCodeHintRecommendation } from "../hooks/useClaudeCodeHintRecommendation.js";
import { LOCAL_JSX_DIALOG, isLocalJsxHoldingQueue } from "../commands/rate-limit-options/index.js";
import {
  useHasOpenDialog,
  useHasBlockingDialog,
  useHasModalDialog,
  useHasModalUserDialog,
  JAe,
} from "../components/dialogs/registry.js";
import { TerminalTitleController } from "./repl/TerminalTitle.js";
import { LayoutOverflow } from "../ink/layout/node.js";
import { IKe } from "../commands/ultraplan.js";
import { oLo } from "../services/mcp/elicitationDialogs.js";
import { Bce } from "../components/dialogs/dialogKinds.js";
import { openRewindSelector } from "../components/MessageSelector.js";
import { IdleReturnHint, isRateLimitRejected } from "./repl/idleReturn.js";
import { hasLoopTask } from "../utils/loop/loopWakeups.js";
import { isQuotaAutoResumeArmed, _Ut } from "../services/quotaAutoResume/quotaAutoResume.js";
import { hasAwaitableAgentTasks } from "../tasks/taskStatus.js";
import { gB } from "../utils/terminalProbe.js";
import { G2 } from "../utils/pollEvents.js";
import { PollEventIdleDelivery, QueuedSendNowController } from "./repl/promptQueue.js";
import { kEn } from "../services/lowPriority/lowPriorityMode.js";
import { Jho } from "../services/rateLimit/rateLimitWall.js";
import { nyo } from "../services/usageCreditOffers.js";
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
import { useViewedAgentTranscript } from "./_new/useViewedAgentTranscript.js";
import { tEe, InlineProgressList } from "./_new/InlineProgressList.js";
import { useBackgroundAskEmitter, useSemanticPromptMarks } from "./repl/sessionPresence.js";
import { useBridgeImmediateCommands } from "../bridge/replBridgeInbound.js";
import { useIDEIntegration } from "../hooks/useIDEIntegration.js";
import { PromptSubmitController, hte } from "./repl/PromptSubmitController.js";
import { COLD_RESUME_QUOTA, AUTOCOMPACT_OFFER } from "../components/nudges/nudgeIds.js";
import { PromptArea, PromptDock } from "./repl/PromptArea.js";
import { HIe } from "../components/UsageLimitGraceNotice.js";
import { useSessionBackgrounding } from "../hooks/useSessionBackgrounding.js";
import { useLeftArrowGesture } from "../components/PromptInput/promptInputState.js";
import { registerBeforeInteractiveShutdown } from "../utils/gracefulShutdown.js";
import { relaunchForExit } from "../utils/processRelaunch.js";
import { qCr } from "./_new/REPL.helpers-xe7z.js";
import { useLogMessages } from "../hooks/useLogMessages.js";
import { resolveCommandDialog } from "../commands/dialogs.js";
import { useQueueProcessor } from "../hooks/useQueueProcessor.js";
import { useEffectSlots } from "../hooks/useTextInputShared.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { useInboxPollerHook } from "../hooks/useInboxPoller.js";
import { useMailboxBridge } from "../hooks/useMailboxBridge.js";
import { useUsageLimitNotices } from "../hooks/notifs/useUsageLimitNotices.js";
import { MCPConnectionManager } from "../services/mcp/MCPConnectionManager.js";
import { ZXe } from "../bridge/inboundMessages.js";
import { mDe, ToastStackViewNamespace } from "../components/pluginUi/ToastStackView.js";
import { useTerminalViewportNamespace } from "../hooks/useTerminalViewport.js";
import { TranscriptView } from "./repl/TranscriptView.js";
import { KeybindingRoot } from "../keybindings/KeybindingProviderSetup.js";
import { $A } from "../components/StatusNotices.js";
import { ReplScreenFrame } from "./repl/ReplScreenFrame.js";
import { UnattendedAutoBlockNotice } from "../components/permissions/UnattendedAutoBlockNotice.js";
import { GlobalKeybindingHandlers } from "../hooks/useGlobalKeybindings.js";
import { MessageScrollHandler, MessageArea } from "./repl/MessageArea.js";
import { SentryErrorBoundary } from "../components/SentryErrorBoundary.js";
import { PendingTaskUpdatesNote } from "../components/SessionHeader.js";
import { ExpandedTaskList } from "../components/TaskListV2.js";
import { WorkerPendingPermissions } from "./_new/WorkerPendingPermissions.js";
import { runExitInterstitial } from "./repl/exitFlow.js";

//@ chunk-18hwfzwa.js:136066-136070 placement
j();
//@ chunk-18hwfzwa.js:136342-136374 placement
function LOt(co) {
  return co !== "";
}
//@ chunk-18hwfzwa.js:136374-136401 placement
function FOt(ls) {
  return !ls;
}
//@ chunk-18hwfzwa.js:136401-136428 placement
function BOt(Ms) {
  return !Ms;
}
//@ chunk-18hwfzwa.js:136428-136451 layout
var VERBOSE_LABEL = "verbose ",
  FOOTER_PADDING = 2;
/**
 * transcript 模式（ctrl+o）底部页脚：显示 "Showing detailed transcript"、切换快捷键、滚动/打开编辑器提示或搜索计数；宽度不足时退化为 "? for shortcuts"。
 */
//@ chunk-18hwfzwa.js:136451-138080 fingerprint = TranscriptModeFooter (0.696)
function TranscriptModeFooter(t0) {
  let $ = w(17),
    {
      showAllInTranscript: showAllInTranscript,
      virtualScroll: virtualScroll,
      searchBadge: searchBadge,
      suppressShowAll: t1,
      status: status,
    } = t0,
    Re = t1 === void 0 ? !1 : t1,
    toggleShortcut = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o"),
    showAllShortcut = useShortcutDisplay_2("transcript:toggleShowAll", "Transcript", "ctrl+e"),
    We = useHasOpenDialog_2(),
    { columns: columns } = useTerminalSize(),
    rt;
  if ($[0] === MEMO_CACHE_SENTINEL) ((rt = C5()), ($[0] = rt));
  else rt = $[0];
  let kt = rt,
    At = kt ? `open in ${kt}` : "open in editor",
    It = `${re.arrowUp}${re.arrowDown} scroll \xB7 v to ${At} \xB7 ? for shortcuts`,
    Et =
      FOOTER_PADDING +
        bunStringWidth(
          [We ? "dialog waiting" : "", "Showing detailed transcript", `${toggleShortcut} to toggle`, It]
            .filter(LOt)
            .join(" \xB7 "),
        ) +
        bunStringWidth(status ? `${status} ` : VERBOSE_LABEL) <
      columns
        ? It
        : "? for shortcuts",
    Dt;
  if ($[1] !== We)
    ((Dt = We && e(Text, { color: "permission", children: "dialog waiting" })), ($[1] = We), ($[2] = Dt));
  else Dt = $[2];
  let Lt;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((Lt = e(Fragment, { children: "Showing detailed transcript" })), ($[3] = Lt));
  else Lt = $[3];
  let oo;
  if ($[4] !== toggleShortcut)
    ((oo = r(Fragment, { children: [toggleShortcut, " to toggle"] })), ($[4] = toggleShortcut), ($[5] = oo));
  else oo = $[5];
  const Xt = searchBadge
    ? "n/N to navigate"
    : virtualScroll
      ? Et
      : Re
        ? `v to ${At}`
        : `${showAllShortcut} to ${showAllInTranscript ? "collapse" : "show all"}`;
  let io;
  if ($[6] !== Dt || $[7] !== oo || $[8] !== Xt)
    ((io = e(Text, {
      dimColor: !0,
      wrap: "truncate-end",
      children: r(Byline, { children: [Dt, Lt, oo, Xt] }),
    })),
      ($[6] = Dt),
      ($[7] = oo),
      ($[8] = Xt),
      ($[9] = io));
  else io = $[9];
  let so;
  if ($[10] === MEMO_CACHE_SENTINEL) ((so = e(Box, { flexGrow: 1 })), ($[10] = so));
  else so = $[10];
  let po;
  if ($[11] !== searchBadge || $[12] !== status)
    ((po = e(TranscriptFooterStatus, { status: status, searchBadge: searchBadge })),
      ($[11] = searchBadge),
      ($[12] = status),
      ($[13] = po));
  else po = $[13];
  let ao;
  if ($[14] !== io || $[15] !== po)
    ((ao = r(Box, {
      noSelect: !0,
      alignItems: "center",
      alignSelf: "center",
      borderTopDimColor: !0,
      borderBottom: !1,
      borderLeft: !1,
      borderRight: !1,
      borderStyle: "single",
      marginTop: 1,
      paddingLeft: FOOTER_PADDING,
      width: "100%",
      children: [io, so, po],
    })),
      ($[14] = io),
      ($[15] = po),
      ($[16] = ao));
  else ao = $[16];
  return ao;
}
//@ chunk-18hwfzwa.js:138080-138476 layout
function TranscriptFooterStatus(h) {
  let $ = w(6),
    { status: status, searchBadge: searchBadge } = h;
  if (status) {
    let ee;
    if ($[0] !== status) ((ee = r(Text, { children: [status, " "] })), ($[0] = status), ($[1] = ee));
    else ee = $[1];
    return ee;
  }
  if (searchBadge) {
    let ee;
    if ($[2] !== searchBadge.count || $[3] !== searchBadge.current)
      ((ee = r(Text, { dimColor: !0, children: [searchBadge.current, "/", searchBadge.count, "  "] })),
        ($[2] = searchBadge.count),
        ($[3] = searchBadge.current),
        ($[4] = ee));
    else ee = $[4];
    return ee;
  }
  let ee;
  if ($[5] === MEMO_CACHE_SENTINEL) ((ee = e(Text, { dimColor: !0, children: VERBOSE_LABEL })), ($[5] = ee));
  else ee = $[5];
  return ee;
}
//@ chunk-18hwfzwa.js:138476-138802 layout
function SearchIndexStatus({ indexStatus: indexStatus, count: count, current: D, query: query }) {
  if (indexStatus === "building") return e(Text, { dimColor: !0, children: "indexing\u2026 " });
  if (indexStatus) return r(Text, { dimColor: !0, children: ["indexed in ", indexStatus.ms, "ms "] });
  if (count === 0 && query) return e(Text, { color: "error", children: "no matches " });
  if (count > 0) return r(Text, { dimColor: !0, children: [D, "/", count, "  "] });
  return null;
}
/**
 * transcript 模式按 ? 显示的快捷键帮助页脚（滚动、搜索、打印到 scrollback、用编辑器打开、退出）。
 */
//@ chunk-18hwfzwa.js:138802-140845 layout
function TranscriptHelpFooter() {
  let $ = w(23),
    h = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o"),
    x = useShortcutDisplay_2("transcript:exit", "Transcript", "q"),
    L;
  if ($[0] === MEMO_CACHE_SENTINEL) ((L = C5()), ($[0] = L));
  else L = $[0];
  let ee = L,
    ke;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((ke = r(Text, { dimColor: !0, children: [`${re.arrowUp}${re.arrowDown} j/k`.padEnd(9), "scroll"] })),
      ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((Re = r(Text, { dimColor: !0, children: ["ctrl+u/d".padEnd(9), "half page"] })), ($[2] = Re));
  else Re = $[2];
  let Be;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((Be = r(Text, { dimColor: !0, children: ["space b".padEnd(9), "page"] })), ($[3] = Be));
  else Be = $[3];
  let He;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((He = r(Text, { dimColor: !0, children: ["g/G".padEnd(9), "top/bottom"] })), ($[4] = He));
  else He = $[4];
  let We;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((We = r(Box, {
      flexDirection: "column",
      children: [ke, Re, Be, He, r(Text, { dimColor: !0, children: ["{/}".padEnd(9), "prev/next prompt"] })],
    })),
      ($[5] = We));
  else We = $[5];
  let ze;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((ze = r(Text, { dimColor: !0, children: ["/".padEnd(5), "search"] })), ($[6] = ze));
  else ze = $[6];
  let Xe;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((Xe = r(Text, { dimColor: !0, children: ["n/N".padEnd(5), "next/prev match"] })), ($[7] = Xe));
  else Xe = $[7];
  let rt;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((rt = r(Text, { dimColor: !0, children: ["[".padEnd(5), "print to scrollback"] })), ($[8] = rt));
  else rt = $[8];
  let kt;
  if ($[9] === MEMO_CACHE_SENTINEL) ((kt = "v".padEnd(5)), ($[9] = kt));
  else kt = $[9];
  let At;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((At = r(Box, {
      flexDirection: "column",
      children: [ze, Xe, rt, r(Text, { dimColor: !0, children: [kt, "open in ", ee ?? "editor"] })],
    })),
      ($[10] = At));
  else At = $[10];
  let It;
  if ($[11] !== h) ((It = h.padEnd(7)), ($[11] = h), ($[12] = It));
  else It = $[12];
  let Ot;
  if ($[13] !== It)
    ((Ot = r(Text, { dimColor: !0, children: [It, "toggle transcript"] })), ($[13] = It), ($[14] = Ot));
  else Ot = $[14];
  let Et;
  if ($[15] !== x) ((Et = x.padEnd(7)), ($[15] = x), ($[16] = Et));
  else Et = $[16];
  let Dt;
  if ($[17] !== Et) ((Dt = r(Text, { dimColor: !0, children: [Et, "exit"] })), ($[17] = Et), ($[18] = Dt));
  else Dt = $[18];
  let Lt;
  if ($[19] === MEMO_CACHE_SENTINEL)
    ((Lt = r(Text, { dimColor: !0, children: ["?".padEnd(7), "close help"] })), ($[19] = Lt));
  else Lt = $[19];
  let oo;
  if ($[20] !== Ot || $[21] !== Dt)
    ((oo = r(Box, {
      noSelect: !0,
      borderTopDimColor: !0,
      borderBottom: !1,
      borderLeft: !1,
      borderRight: !1,
      borderStyle: "single",
      marginTop: 1,
      paddingLeft: 2,
      width: "100%",
      flexDirection: "row",
      gap: 4,
      children: [We, At, r(Box, { flexDirection: "column", children: [Ot, Dt, Lt] })],
    })),
      ($[20] = Ot),
      ($[21] = Dt),
      ($[22] = oo));
  else oo = $[22];
  return oo;
}
/**
 * transcript 搜索栏（/）：useSearchInput 读输入，首次打开时预热搜索索引（indexing… / indexed in Nms），查询变化后调用 jumpRef.setSearchQuery 并高亮。
 */
//@ chunk-18hwfzwa.js:140845-142030 fingerprint = TranscriptSearchBar (0.76)
function TranscriptSearchBar({
  jumpRef: jumpRef,
  count: count,
  current: D,
  onClose: onClose,
  onCancel: onCancel,
  setHighlight: setHighlight,
  initialQuery: initialQuery,
}) {
  let {
      query: query,
      cursorOffset: cursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({
      isActive: !0,
      initialQuery: initialQuery,
      onExit: () => onClose(query),
      onCancel: onCancel,
    }),
    Xe = useClock(),
    [rt, kt] = y("building");
  P(() => {
    let Xt = !0,
      warm = jumpRef.current?.warmSearchIndex;
    if (!warm) {
      kt(null);
      return;
    }
    return (
      kt("building"),
      warm().then((ms) => {
        if (!Xt) return;
        if (ms < 20) kt(null);
        else (kt({ ms: ms }), Xe.setTimeout(() => Xt && kt(null), 2000));
      }),
      () => {
        Xt = !1;
      }
    );
  }, []);
  let warmDone = rt !== "building";
  P(() => {
    if (!warmDone) return;
    (jumpRef.current?.setSearchQuery(query), setHighlight(query));
  }, [query, warmDone]);
  let off = cursorOffset,
    cursorChar = off < query.length ? query[off] : " ",
    Et = Q(isNativeCursorEnabled, []),
    Dt = env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT && env.CLAUDE_CODE_SESSION_KIND !== "bg",
    Lt = !(Et && !Dt),
    oo = useDeclaredCursor({ line: 0, column: 0, active: !0, visible: !Dt });
  return r(Box, {
    borderTopDimColor: !0,
    borderBottom: !1,
    borderLeft: !1,
    borderRight: !1,
    borderStyle: "single",
    marginTop: 1,
    paddingLeft: 2,
    tabIndex: 0,
    autoFocus: !0,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
    width: "100%",
    noSelect: !0,
    children: [
      e(Text, { children: "/" }),
      e(Text, { children: query.slice(0, off) }),
      e(Box, { ref: oo, flexShrink: 0, children: e(Text, { inverse: Lt, children: cursorChar }) }),
      off < query.length && e(Text, { children: query.slice(off + 1) }),
      e(Box, { flexGrow: 1 }),
      SearchIndexStatus({ indexStatus: rt, count: count, current: D, query: query }),
    ],
  });
}
//@ chunk-18hwfzwa.js:1087735-1087772 sole-consumer
function Abo(hn) {
  return hn.isLoading;
}
//@ chunk-18hwfzwa.js:1087772-1087809 sole-consumer
function Mbo(Bo) {
  return Bo.isLoading;
}
//@ chunk-18hwfzwa.js:1087809-1087852 sole-consumer
function Ibo(Ro) {
  return Ro.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:1087852-1087898 sole-consumer
function Ebo(Ho) {
  return Ho.isInputRowReplaced;
}
//@ chunk-18hwfzwa.js:1087898-1088121 sole-consumer
var CLOSED_FRUSTRATION_SURVEY = {
    state: "closed",
    transcriptBundlePath: null,
    handleTranscriptSelect: () => {},
  },
  useFrustrationSurveyStub = () => CLOSED_FRUSTRATION_SURVEY,
  NullBand = () => null,
  SURVEY_SLOT_KEYS = {
    postCompact: !0,
    longContext: !0,
    plugin: !0,
    memory: !0,
    feedback: !0,
    orgSurvey: !0,
    frustration: !0,
  },
  SURVEY_KINDS = Object.keys(SURVEY_SLOT_KEYS);
//@ chunk-18hwfzwa.js:1088121-1088308 sole-consumer
class SurveySlotStore {
  #e = createSignal();
  #t = null;
  subscribe = (h) => this.#e.subscribe(h);
  getSnapshot = () => this.#t;
  publish(h) {
    let x = this.#t;
    if (x !== null && SURVEY_KINDS.every((D) => shallowEqualObject(x[D], h[D]))) return;
    ((this.#t = h), this.#e.emit());
  }
}
//@ chunk-18hwfzwa.js:1088308-1088547 sole-consumer
function hasActiveSurvey(h) {
  return (
    h !== null &&
    pickActiveSurvey({
      postCompact: h.postCompact.state,
      longContext: h.longContext.state,
      plugin: h.plugin.state,
      memory: h.memory.state,
      feedback: h.feedback.state,
      orgSurvey: h.orgSurvey.state,
      frustration: h.frustration.state,
    }) !== null
  );
}
//@ chunk-18hwfzwa.js:1088547-1088662 sole-consumer
function shallowEqualObject(h, x) {
  let keys = Object.keys(h);
  return keys.length === Object.keys(x).length && keys.every((L) => Object.is(h[L], x[L]));
}
/**
 * 在 REPL 中依次运行各问卷 hook（压缩后、长上下文、插件、记忆、反馈、组织、挫败检测），后者在前者打开时让位，并把全部状态发布到 SurveySlotStore。
 */
//@ chunk-18hwfzwa.js:1088662-1091274 sole-consumer
function SurveyStatePublisher(props) {
  let We = w(48),
    {
      turn: turn,
      transcript: transcript,
      isRemoteSession: isRemoteSession,
      slot: slot,
      localJsx: localJsx,
    } = props,
    Re = useStoreSelector(transcript),
    Be = useStoreSelector(turn, Abo),
    He = useHasAutoDialog(),
    ze;
  if (We[0] !== transcript)
    ((ze = () => new AssistantTokenCounter(transcript)), (We[0] = transcript), (We[1] = ze));
  else ze = We[1];
  let [Xe] = y(ze),
    rt = useStoreSelector(Xe),
    kt,
    At;
  if (We[2] !== Xe) ((kt = () => () => Xe.dispose()), (At = [Xe]), (We[2] = Xe), (We[3] = kt), (We[4] = At));
  else ((kt = We[3]), (At = We[4]));
  P(kt, At);
  const It = !isRemoteSession;
  let Ot;
  if (We[5] !== It) ((Ot = { enabled: It }), (We[5] = It), (We[6] = Ot));
  else Ot = We[6];
  let Et = usePostCompactSurvey(Re, Be, He, Ot);
  const Dt = !isRemoteSession,
    Lt = Et.state !== "closed";
  let oo;
  if (
    We[7] !== rt ||
    We[8] !== He ||
    We[9] !== Dt ||
    We[10] !== Lt ||
    We[11] !== transcript ||
    We[12] !== turn
  )
    ((oo = {
      cumulativeSessionTokens: rt,
      turn: turn,
      transcript: transcript,
      hasActivePrompt: He,
      enabled: Dt,
      otherSurveyActive: Lt,
    }),
      (We[7] = rt),
      (We[8] = He),
      (We[9] = Dt),
      (We[10] = Lt),
      (We[11] = transcript),
      (We[12] = turn),
      (We[13] = oo));
  else oo = We[13];
  let Xt = useLongContextSurvey(oo);
  const io = !isRemoteSession,
    so = Et.state !== "closed" || Xt.state !== "closed";
  let po;
  if (We[14] !== He || We[15] !== so || We[16] !== io || We[17] !== turn)
    ((po = { turn: turn, hasActivePrompt: He, enabled: io, otherSurveyActive: so }),
      (We[14] = He),
      (We[15] = so),
      (We[16] = io),
      (We[17] = turn),
      (We[18] = po));
  else po = We[18];
  let ao = usePluginFeedbackSurvey(po);
  const co = !isRemoteSession,
    bo = Et.state !== "closed" || Xt.state !== "closed" || ao.state !== "closed";
  let Ao;
  if (We[19] !== co || We[20] !== bo)
    ((Ao = { enabled: co, otherSurveyActive: bo }), (We[19] = co), (We[20] = bo), (We[21] = Ao));
  else Ao = We[21];
  let Bo = useMemorySurvey(Re, Be, He, Ao);
  const Ro = Et.state !== "closed" || Xt.state !== "closed" || ao.state !== "closed" || Bo.state !== "closed";
  let Ho;
  if (We[22] !== Ro || We[23] !== transcript || We[24] !== turn)
    ((Ho = { turn: turn, transcript: transcript, otherSurveyActive: Ro }),
      (We[22] = Ro),
      (We[23] = transcript),
      (We[24] = turn),
      (We[25] = Ho));
  else Ho = We[25];
  let Io = useFeedbackSurvey(Ho);
  const Wo = !isRemoteSession,
    mn =
      Et.state !== "closed" ||
      Xt.state !== "closed" ||
      ao.state !== "closed" ||
      Bo.state !== "closed" ||
      Io.state !== "closed";
  let Cn;
  if (
    We[26] !== He ||
    We[27] !== localJsx ||
    We[28] !== Re ||
    We[29] !== Wo ||
    We[30] !== mn ||
    We[31] !== turn
  )
    ((Cn = {
      turn: turn,
      messages: Re,
      localJsx: localJsx,
      hasActivePrompt: He,
      enabled: Wo,
      otherSurveyActive: mn,
    }),
      (We[26] = He),
      (We[27] = localJsx),
      (We[28] = Re),
      (We[29] = Wo),
      (We[30] = mn),
      (We[31] = turn),
      (We[32] = Cn));
  else Cn = We[32];
  let No = useOrgSurvey(Cn);
  const vo =
    Io.state !== "closed" ||
    Et.state !== "closed" ||
    Xt.state !== "closed" ||
    ao.state !== "closed" ||
    Bo.state !== "closed" ||
    No.state !== "closed";
  let Yo;
  if (We[33] !== He || We[34] !== vo || We[35] !== transcript || We[36] !== turn)
    ((Yo = { turn: turn, transcript: transcript, hasActivePrompt: He, otherSurveyActive: vo }),
      (We[33] = He),
      (We[34] = vo),
      (We[35] = transcript),
      (We[36] = turn),
      (We[37] = Yo));
  else Yo = We[37];
  let kn = useFrustrationSurveyStub(Yo),
    Fn = Se(SpinnerPaceContext),
    bn;
  if (
    We[38] !== Io ||
    We[39] !== kn ||
    We[40] !== Xt ||
    We[41] !== Bo ||
    We[42] !== Fn ||
    We[43] !== No ||
    We[44] !== ao ||
    We[45] !== Et ||
    We[46] !== slot
  )
    ((bn = () => {
      let Go = () =>
        slot.publish({
          postCompact: Et,
          longContext: Xt,
          plugin: ao,
          memory: Bo,
          feedback: Io,
          orgSurvey: No,
          frustration: kn,
        });
      if (Fn) Fn.deferred(Go);
      else Go();
    }),
      (We[38] = Io),
      (We[39] = kn),
      (We[40] = Xt),
      (We[41] = Bo),
      (We[42] = Fn),
      (We[43] = No),
      (We[44] = ao),
      (We[45] = Et),
      (We[46] = slot),
      (We[47] = bn));
  else bn = We[47];
  return (zt(bn), null);
}
/**
 * 输入框上方的提示带：有问卷时显示 SurveyHost，另有上方提示位、反馈草稿提示、web-setup 提示等，彼此通过 bandHeld 互斥。
 */
//@ chunk-18hwfzwa.js:1091274-1093560 sole-consumer
function AbovePromptBands(props) {
  let Ot = w(39),
    { slot: slot, turn: turn, transcript: transcript, draft: draft, submit: submit } = props,
    Re = useStoreSelector(slot),
    Be = useStoreSelector(turn, Mbo),
    [He, We] = y(!1),
    [ze, Xe] = y(!1),
    [rt, kt] = y(!1),
    At = useStoreSelector(draft, Ibo),
    It = useStoreSelector(draft, Ebo),
    Et;
  if (Ot[0] !== Re) ((Et = Re !== null && hasActiveSurvey(Re)), (Ot[0] = Re), (Ot[1] = Et));
  else Et = Ot[1];
  let Dt = Et,
    Lt = Dt || He || ze,
    oo;
  if (
    Ot[2] !== draft.replaceValue ||
    Ot[3] !== It ||
    Ot[4] !== submit.submitSurveyFollowUp ||
    Ot[5] !== Dt ||
    Ot[6] !== Re
  )
    ((oo =
      Dt &&
      e(SurveyHost, {
        postCompactSurvey: Re.postCompact,
        longContextSurvey: Re.longContext,
        pluginSurvey: Re.plugin,
        memorySurvey: Re.memory,
        feedbackSurvey: Re.feedback,
        frustrationDetection: Re.frustration,
        orgSurvey: Re.orgSurvey,
        setInputValue: draft.replaceValue,
        inputRowReplaced: It,
        handleSurveyRequestFeedback: submit.submitSurveyFollowUp,
      })),
      (Ot[2] = draft.replaceValue),
      (Ot[3] = It),
      (Ot[4] = submit.submitSurveyFollowUp),
      (Ot[5] = Dt),
      (Ot[6] = Re),
      (Ot[7] = oo));
  else oo = Ot[7];
  let Xt;
  if (Ot[8] !== draft.replaceValue || Ot[9] !== Be || Ot[10] !== Dt)
    ((Xt = e(AbovePromptBandNamespace.AbovePromptSite, {
      survey: Dt,
      working: Be,
      setInputValue: draft.replaceValue,
      onHoldsBandChange: We,
    })),
      (Ot[8] = draft.replaceValue),
      (Ot[9] = Be),
      (Ot[10] = Dt),
      (Ot[11] = Xt));
  else Xt = Ot[11];
  let io;
  if (Ot[12] !== submit)
    ((io = () => submit.submitSurveyFollowUp("/feedback")), (Ot[12] = submit), (Ot[13] = io));
  else io = Ot[13];
  let so;
  if (Ot[14] !== draft.replaceValue || Ot[15] !== Be || Ot[16] !== Dt || Ot[17] !== io)
    ((so = e(FeedbackDraftNotice, {
      isLoading: Be,
      surveyActive: Dt,
      setInputValue: draft.replaceValue,
      onOpenFeedback: io,
      onHoldsBandChange: Xe,
    })),
      (Ot[14] = draft.replaceValue),
      (Ot[15] = Be),
      (Ot[16] = Dt),
      (Ot[17] = io),
      (Ot[18] = so));
  else so = Ot[18];
  const po = Lt || rt;
  let ao;
  if (Ot[19] !== submit)
    ((ao = () => {
      submit
        .submit("/web-setup", NOOP_HELPERS, { inputModeOverride: "prompt", leavesIdeSelection: !0 })
        .catch(logError);
    }),
      (Ot[19] = submit),
      (Ot[20] = ao));
  else ao = Ot[20];
  let co;
  if (
    Ot[21] !== draft.replaceValue ||
    Ot[22] !== Be ||
    Ot[23] !== po ||
    Ot[24] !== ao ||
    Ot[25] !== transcript
  )
    ((co = e(WebSetupPromptGate, {
      isLoading: Be,
      bandHeld: po,
      transcript: transcript,
      setInputValue: draft.replaceValue,
      onRunWebSetup: ao,
    })),
      (Ot[21] = draft.replaceValue),
      (Ot[22] = Be),
      (Ot[23] = po),
      (Ot[24] = ao),
      (Ot[25] = transcript),
      (Ot[26] = co));
  else co = Ot[26];
  let bo;
  if (
    Ot[27] !== draft.replaceValue ||
    Ot[28] !== Lt ||
    Ot[29] !== At ||
    Ot[30] !== transcript ||
    Ot[31] !== turn
  )
    ((bo = e(NullBand, {
      turn: turn,
      transcript: transcript,
      bandHeld: Lt,
      promptOwnsEscape: At,
      setInputValue: draft.replaceValue,
      onHoldsBandChange: kt,
    })),
      (Ot[27] = draft.replaceValue),
      (Ot[28] = Lt),
      (Ot[29] = At),
      (Ot[30] = transcript),
      (Ot[31] = turn),
      (Ot[32] = bo));
  else bo = Ot[32];
  let Ao;
  if (Ot[33] !== oo || Ot[34] !== Xt || Ot[35] !== so || Ot[36] !== co || Ot[37] !== bo)
    ((Ao = r(Fragment, { children: [oo, Xt, so, co, bo] })),
      (Ot[33] = oo),
      (Ot[34] = Xt),
      (Ot[35] = so),
      (Ot[36] = co),
      (Ot[37] = bo),
      (Ot[38] = Ao));
  else Ao = Ot[38];
  return Ao;
}
//@ chunk-18hwfzwa.js:1093560-1093597 sole-consumer
function Zbo(rt) {
  return rt.isLoading;
}
//@ chunk-18hwfzwa.js:1093597-1093640 sole-consumer
function ewo(kt) {
  return kt.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:1093640-1093677 sole-consumer
function two(At) {
  return At.isLoading;
}
/**
 * REPL 中内嵌面板与调查问卷区域的组件。
 */
//@ chunk-18hwfzwa.js:1093677-1094188 sole-consumer
function InlinePanesAndBands(h) {
  let $ = w(10),
    {
      turn: turn,
      transcript: transcript,
      draft: draft,
      submitController: submitController,
      surveySlot: surveySlot,
      visible: visible,
      panesDocked: panesDocked,
    } = h,
    isWorking = useStoreSelector(turn, Zbo),
    promptOwnsEscape = useStoreSelector(draft, ewo),
    element;
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
  )
    ((element = visible
      ? r(Fragment, {
          children: [
            e(PaneDockNamespace.InlinePanes, {
              working: isWorking,
              promptOwnsEscape: promptOwnsEscape,
              docked: panesDocked,
            }),
            e(AbovePromptBands, {
              slot: surveySlot,
              turn: turn,
              transcript: transcript,
              draft: draft,
              submit: submitController,
            }),
          ],
        })
      : null),
      ($[0] = draft),
      ($[1] = isWorking),
      ($[2] = panesDocked),
      ($[3] = promptOwnsEscape),
      ($[4] = submitController),
      ($[5] = surveySlot),
      ($[6] = transcript),
      ($[7] = turn),
      ($[8] = visible),
      ($[9] = element));
  else element = $[9];
  return element;
}
/**
 * REPL 提示区组件，附带后台会话提示。
 */
//@ chunk-18hwfzwa.js:1094188-1094819 placement
function PromptAreaWithBackgroundHint(h) {
  let $ = w(13),
    {
      turn: turn,
      transcript: transcript,
      scope: scope,
      draft: draft,
      chrome: chrome,
      gesture: gesture,
      submitController: submitController,
      visible: visible,
      onBackgroundSession: onBackgroundSession,
    } = h,
    isLoading = useStoreSelector(turn, two),
    content;
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
  )
    ((content =
      visible &&
      r(Fragment, {
        children: [
          e(Nke, {
            turn: turn,
            transcript: transcript,
            scope: scope,
            draft: draft,
            chrome: chrome,
            gesture: gesture,
            submit: submitController,
          }),
          e(SessionBackgroundHint, { onBackgroundSession: onBackgroundSession, isLoading: isLoading }),
        ],
      })),
      ($[0] = chrome),
      ($[1] = draft),
      ($[2] = gesture),
      ($[3] = isLoading),
      ($[4] = onBackgroundSession),
      ($[5] = scope),
      ($[6] = submitController),
      ($[7] = transcript),
      ($[8] = turn),
      ($[9] = visible),
      ($[10] = content));
  else content = $[10];
  let element;
  if ($[11] !== content)
    ((element = r(Fragment, { children: [content, !1] })), ($[11] = content), ($[12] = element));
  else element = $[12];
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
var TITLE_SPINNER_FRAMES = ["\u25D0", "\u25D1"],
  TITLE_IDLE_PREFIX = "\u2733",
  TITLE_FRAME_INTERVAL_MS = 960;
/**
 * 终端标题组件：从 titles 存储取标题，工作中且终端聚焦时以 960ms 交替 ◐/◑ 前缀，否则 ✳；在 tmux 等复用器下受 tengu_static_title_under_mux 控制改为静态。
 */
//@ chunk-18hwfzwa.js:1426059-1426386 fingerprint = AnimatedTerminalTitle (0.545)
function AnimatedTerminalTitle(t0) {
  let $ = w(1),
    { titles: titles, isAnimating: isAnimating, noPrefix: noPrefix } = t0,
    terminalTitle = useStoreSelector(titles, selectTerminalTitle),
    disabled = useStoreSelector(titles, selectTitleDisabled),
    terminalFocused = useTerminalFocus(),
    Be =
      getTerminalMultiplexer() !== null &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_static_title_under_mux", !0),
    [He, We] = y(0),
    Xe;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Xe = () => We(nextTitleFrame)), ($[0] = Xe));
  else Xe = $[0];
  useInterval(
    Xe,
    disabled || noPrefix || Be || !isAnimating || !terminalFocused ? null : TITLE_FRAME_INTERVAL_MS,
  );
  let prefix = isAnimating && !Be ? (TITLE_SPINNER_FRAMES[He] ?? TITLE_IDLE_PREFIX) : TITLE_IDLE_PREFIX;
  return (useTerminalTitle(disabled ? null : noPrefix ? terminalTitle : `${prefix} ${terminalTitle}`), null);
}
/**
 * REPL 消息列表的外部存储：getSnapshot/subscribe 供 useSyncExternalStore；replace/apply/keep 修改列表（可延迟发布），flush 发布延迟的修改并调用 project 回调。
 */
//@ chunk-18hwfzwa.js:1666058-1666963 placement
class MessageListStore {
  #e;
  #t;
  #o = !1;
  #n;
  #s = createSignal();
  conversation = Ebe({
    keep: (h) => this.keep({ type: "append", messages: [...h] }),
    rows: () => this.#e,
    isHookable: !0,
  });
  constructor({ initial: h, project: x }) {
    ((this.#e = h), (this.#n = x));
  }
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#s.subscribe(h);
  replace = (h, x = !1) => {
    let D = this.#e;
    if (((this.#e = typeof h === "function" ? h(D) : h), x)) {
      ((this.#t ??= D), (this.#o ||= x !== "held"));
      return;
    }
    this.#r(this.#t ?? D);
  };
  apply = (h, x = !1) => {
    let D = applyMessageListAppend(h, (ee) => this.keep(ee, x));
    if (D === void 0) {
      this.conversation.behindAppends(() => this.keep(h, x))?.catch(logError);
      return;
    }
    let L = appendRowsWithHooks(this.conversation, D.rows, { keep: D.keep });
    if (L instanceof Promise) L.catch(logError);
  };
  keep = (h, x = !1) => {
    this.replace((D) => applyMessageListEdit(D, h), x);
  };
  settled = () => this.conversation.settled();
  cut = () => this.conversation.cut();
  getPublished = () => this.#t ?? this.#e;
  flush = () => {
    if (this.#t !== void 0 && this.#o) this.#r(this.#t);
  };
  #r(h) {
    ((this.#t = void 0), (this.#o = !1));
    let x = this.#e;
    if ((this.#n(x, h), x !== h)) this.#s.emit();
  }
}
//@ chunk-18hwfzwa.js:1667001-1667005 placement
j();
//@ chunk-18hwfzwa.js:1667005-1667009 placement
j();
//@ chunk-18hwfzwa.js:1822891-1822921 sole-consumer
function CYo(At) {
  return At.id;
}
//@ chunk-18hwfzwa.js:1822921-1822956 sole-consumer
function _Yo(Ho) {
  return Ho.replTab;
}
//@ chunk-18hwfzwa.js:1822956-1823013 sole-consumer = _temp (1)
function selectFileHistoryTrackedFilesSize(s) {
  return s.fileHistory.trackedFiles.size;
}
//@ chunk-18hwfzwa.js:1823013-1823084 sole-consumer
function xYo(Wo) {
  return Wo.replTab === "convo" ? { ...Wo, replTab: "diff" } : Wo;
}
//@ chunk-18hwfzwa.js:1823084-1823114 sole-consumer
function PYo(mn) {
  return mn.id;
}
//@ chunk-18hwfzwa.js:1823114-1823149 sole-consumer
function AYo(qu) {
  return xo(qu).cwd;
}
//@ chunk-18hwfzwa.js:1823149-1823205 sole-consumer
function MYo(Ku) {
  return Ku.fileHistory.trackSequence ?? 0;
}
//@ chunk-18hwfzwa.js:1823205-1823244 sole-consumer
function IYo(iu) {
  return iu.todos[mainAgentId()];
}
//@ chunk-18hwfzwa.js:1823244-1823293 sole-consumer
function EYo(Iu) {
  return Iu.toolPermissionContext;
}
//@ chunk-18hwfzwa.js:1823293-1823368 sole-consumer
function DYo(Am) {
  return Am.diffPanelVisible ? Am : { ...Am, diffPanelVisible: !0 };
}
//@ chunk-18hwfzwa.js:1823368-1823443 sole-consumer
function OYo(Kp) {
  return Kp.diffPanelVisible ? { ...Kp, diffPanelVisible: !1 } : Kp;
}
//@ chunk-18hwfzwa.js:1823443-1823473 sole-consumer
function NYo() {
  return new ReplayHandleSlot();
}
//@ chunk-18hwfzwa.js:1823473-1823521 sole-consumer = _temp (1)
function LYo(nl) {
  return nl.status === "completed";
}
//@ chunk-18hwfzwa.js:1823521-1823548 sole-consumer
function FYo(ss) {
  return !ss;
}
//@ chunk-18hwfzwa.js:1823548-1823589 sole-consumer
function BYo(Gs) {
  return Gs.panelFileView;
}
//@ chunk-18hwfzwa.js:1823589-1823616 sole-consumer
function HYo(ma) {
  return !ma;
}
//@ chunk-18hwfzwa.js:1823616-1823643 sole-consumer
function UYo($a) {
  return !$a;
}
//@ chunk-18hwfzwa.js:1823643-1823704 sole-consumer
function WYo(xl, Si) {
  return e(Text, { dimColor: !0, children: xl }, Si);
}
//@ chunk-18hwfzwa.js:1823704-1823731 sole-consumer
function jYo(na) {
  return !na;
}
//@ chunk-18hwfzwa.js:1823731-1823758 sole-consumer
function qYo(js) {
  return !js;
}
//@ chunk-18hwfzwa.js:1823758-1823783 sole-consumer
var Aoe = 8,
  Moe = 20,
  hxt = 300;
/**
 * 记录自动打开 diff 时的基线，关闭时切回对话标签。
 */
//@ chunk-18hwfzwa.js:1823783-1824383 sole-consumer
function useDiffAutoOpenBaseline(enabled, trackedCount) {
  let ke = w(8),
    D = useSetAppState();
  useForceRender();
  let L = useSession(CYo),
    ee = useHost(),
    Re;
  if (ke[0] !== enabled || ke[1] !== L)
    ((Re = { enabled: enabled, sessionId: L, baseline: null }), (ke[0] = enabled), (ke[1] = L), (ke[2] = Re));
  else Re = ke[2];
  let [Be, He] = y(Re),
    baseline = Be.baseline;
  if (Be.enabled !== enabled) baseline = enabled ? trackedCount : null;
  else if (baseline !== null && trackedCount !== baseline) baseline = null;
  if (Be.sessionId !== L) baseline = null;
  if (Be.enabled !== enabled || Be.sessionId !== L || Be.baseline !== baseline)
    He({ enabled: enabled, sessionId: L, baseline: baseline });
  let ze = R(enabled),
    Xe,
    rt;
  if (ke[3] !== enabled || ke[4] !== ee || ke[5] !== D)
    ((Xe = () => {
      let kt = ze.current;
      if (((ze.current = enabled), kt && !enabled)) switchToConversationTab(ee, D);
    }),
      (rt = [enabled, ee, D]),
      (ke[3] = enabled),
      (ke[4] = ee),
      (ke[5] = D),
      (ke[6] = Xe),
      (ke[7] = rt));
  else ((Xe = ke[6]), (rt = ke[7]));
  return (P(Xe, rt), baseline);
}
/**
 * 全屏 REPL 的 diff 侧栏：会话有文件改动且终端够宽时预取工作区 diff 并标记自动打开；注册 app:toggleReplTab 快捷键切换；在 diff 标签页渲染 DiffSidebarPanel。
 */
//@ chunk-18hwfzwa.js:1824383-1826508 sole-consumer
function DiffSidebar(props) {
  let Ot = w(40),
    {
      width: width,
      isThinClient: isThinClient,
      onAskAboutSelection: onAskAboutSelection,
      autoOpenBaseline: autoOpenBaseline,
    } = props,
    ke = autoOpenBaseline === void 0 ? null : autoOpenBaseline,
    Re = useAppState(_Yo),
    Be = useSetAppState(),
    He = Cr(),
    { storageV5: storageV5 } = Me(),
    ze = useHost(),
    { columns: columns } = useTerminalSize(),
    { addNotification: addNotification } = useNotifications(),
    kt = useAppState(selectFileHistoryTrackedFilesSize),
    It = Se(_T)?.setTimeout ?? $L,
    Et;
  if (
    Ot[0] !== ke ||
    Ot[1] !== columns ||
    Ot[2] !== ze ||
    Ot[3] !== isThinClient ||
    Ot[4] !== Re ||
    Ot[5] !== It ||
    Ot[6] !== Be ||
    Ot[7] !== He ||
    Ot[8] !== kt
  )
    ((Et = () => {
      if (Re !== "convo" || kt === 0) {
        return;
      }
      if (ke !== null && kt === ke) {
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
          ze,
          getDiffBaseMode(),
          He.getState().fileHistory.trackSequence ?? 0,
          abortController.signal,
        )
          .then(() => {
            if (abortController.signal.aborted) {
              return;
            }
            (markDiffAutoOpenPending(ze), Be(xYo));
          })
          .catch(logError);
      }, rCr);
      return () => {
        (Lt(), abortController.abort());
      };
    }),
      (Ot[0] = ke),
      (Ot[1] = columns),
      (Ot[2] = ze),
      (Ot[3] = isThinClient),
      (Ot[4] = Re),
      (Ot[5] = It),
      (Ot[6] = Be),
      (Ot[7] = He),
      (Ot[8] = kt),
      (Ot[9] = Et));
  else Et = Ot[9];
  let oo;
  if (
    Ot[10] !== ke ||
    Ot[11] !== ze ||
    Ot[12] !== isThinClient ||
    Ot[13] !== Re ||
    Ot[14] !== It ||
    Ot[15] !== Be ||
    Ot[16] !== He ||
    Ot[17] !== kt
  )
    ((oo = [Re, kt, ke, isThinClient, Be, ze, It, He]),
      (Ot[10] = ke),
      (Ot[11] = ze),
      (Ot[12] = isThinClient),
      (Ot[13] = Re),
      (Ot[14] = It),
      (Ot[15] = Be),
      (Ot[16] = He),
      (Ot[17] = kt),
      (Ot[18] = oo));
  else oo = Ot[18];
  P(Et, oo);
  let Xt;
  if (
    Ot[19] !== addNotification ||
    Ot[20] !== columns ||
    Ot[21] !== ze ||
    Ot[22] !== Be ||
    Ot[23] !== storageV5 ||
    Ot[24] !== He
  )
    ((Xt = () => {
      let io = toggleDiffPanel({
        host: ze,
        getReplTab: () => He.getState().replTab,
        setAppState: Be,
        columns: columns,
        trackSequence: He.getState().fileHistory.trackSequence ?? 0,
        storageV5: storageV5,
      });
      if (io.status === "refused")
        addNotification({
          key: `diff-sidebar-${io.reason}`,
          kind: "feedback",
          text: io.text,
          priority: "immediate",
          timeoutMs: 3000,
        });
    }),
      (Ot[19] = addNotification),
      (Ot[20] = columns),
      (Ot[21] = ze),
      (Ot[22] = Be),
      (Ot[23] = storageV5),
      (Ot[24] = He),
      (Ot[25] = Xt));
  else Xt = Ot[25];
  let so;
  if (Ot[26] !== isThinClient)
    ((so = isFullscreenEnvEnabled() && !isThinClient), (Ot[26] = isThinClient), (Ot[27] = so));
  else so = Ot[27];
  let po;
  if (Ot[28] !== so) ((po = { context: "Global", isActive: so }), (Ot[28] = so), (Ot[29] = po));
  else po = Ot[29];
  useKeybinding("app:toggleReplTab", Xt, po);
  let ao = useSession(PYo),
    co = Re === "diff" && width > 0,
    bo,
    Ao;
  if (Ot[30] !== columns || Ot[31] !== ze || Ot[32] !== co || Ot[33] !== ao)
    ((bo = () => {
      if (co) logDiffPanelShown(ze, ao, columns);
    }),
      (Ao = [co, columns, ao, ze]),
      (Ot[30] = columns),
      (Ot[31] = ze),
      (Ot[32] = co),
      (Ot[33] = ao),
      (Ot[34] = bo),
      (Ot[35] = Ao));
  else ((bo = Ot[34]), (Ao = Ot[35]));
  if ((P(bo, Ao), !co)) {
    return null;
  }
  const Bo = columns - width;
  let Ro;
  if (Ot[36] !== onAskAboutSelection || Ot[37] !== Bo || Ot[38] !== width)
    ((Ro = e(DiffSidebarPanel, { width: width, minCol: Bo, onAskAboutSelection: onAskAboutSelection })),
      (Ot[36] = onAskAboutSelection),
      (Ot[37] = Bo),
      (Ot[38] = width),
      (Ot[39] = Ro));
  else Ro = Ot[39];
  return Ro;
}
/**
 * diff 侧栏面板：读取本地工作区 diff（可切换基线 session/uncommitted/branch），隐藏被 read deny 规则保护的文件，列出改动文件与行数、会话前已编辑文件、测试/生成文件折叠，支持拖动滚动与选中内容提问。
 */
//@ chunk-18hwfzwa.js:1826508-1835163 sole-consumer
function DiffSidebarPanel(props) {
  let Et = w(85),
    { width: width, minCol: minCol, onAskAboutSelection: onAskAboutSelection } = props,
    ee = useSession(AYo),
    ke = useHost(),
    { storageV5: storageV5 } = Me(),
    Be = useAppState(MYo),
    [He, We] = y(getDiffBaseMode),
    {
      stats: stats,
      files: files,
      hunks: hunks,
      loading: loading,
      source: source,
      baseMode: baseMode,
      noCommits: noCommits,
    } = useLocalWorkspaceDiff(Be, !0, He),
    Dt;
  if (Et[0] !== He || Et[1] !== storageV5)
    ((Dt = () => We(cycleDiffBaseMode(He, storageV5))), (Et[0] = He), (Et[1] = storageV5), (Et[2] = Dt));
  else Dt = Et[2];
  let Lt;
  if (Et[3] === MEMO_CACHE_SENTINEL) ((Lt = { context: "DiffPanel" }), (Et[3] = Lt));
  else Lt = Et[3];
  useKeybinding("app:cycleDiffBase", Dt, Lt);
  let oo = useAppState(IYo),
    Xt;
  if (Et[4] !== oo) ((Xt = todoToolsEnabled() ? oo : void 0), (Et[4] = oo), (Et[5] = Xt));
  else Xt = Et[5];
  let io = Xt,
    so = useAppState(EYo),
    po = useSetAppState(),
    { processQueue: processQueue } = useNotifications(),
    co,
    bo;
  if (Et[6] !== processQueue || Et[7] !== po)
    ((co = () => (
      po(DYo),
      () => {
        (po(OYo), processQueue());
      }
    )),
      (bo = [po, processQueue]),
      (Et[6] = processQueue),
      (Et[7] = po),
      (Et[8] = co),
      (Et[9] = bo));
  else ((co = Et[8]), (bo = Et[9]));
  P(co, bo);
  let [Ao] = y(NYo),
    { attach: attach } = Ao,
    Ro = R(null),
    Ho = R(null),
    Io;
  if (Et[10] === MEMO_CACHE_SENTINEL) ((Io = new Map()), (Et[10] = Io));
  else Io = Et[10];
  let Wo = R(Io),
    mn = 0,
    Cn = 0,
    No = 0;
  if (Et[11] !== files) {
    for (const vo of files) {
      if (vo.preSession) (mn++, (Cn = Cn + vo.linesAdded), (No = No + vo.linesRemoved));
    }
    ((Et[11] = files), (Et[12] = mn), (Et[13] = Cn), (Et[14] = No));
  } else ((mn = Et[12]), (Cn = Et[13]), (No = Et[14]));
  let Yo;
  if (Et[15] !== mn || Et[16] !== Cn || Et[17] !== No)
    ((Yo = { filesCount: mn, linesAdded: Cn, linesRemoved: No }),
      (Et[15] = mn),
      (Et[16] = Cn),
      (Et[17] = No),
      (Et[18] = Yo));
  else Yo = Et[18];
  let kn = Yo,
    Fn;
  if (Et[19] !== io) ((Fn = io ? count(io, LYo) : 0), (Et[19] = io), (Et[20] = Fn));
  else Fn = Et[20];
  let bn = Fn,
    Go = io?.length ?? 0,
    max = Math.max(width - 2, 20),
    Mn = UV(),
    Xo = rAr(),
    Sn = Mn || Xo,
    $n = useSelection(),
    on;
  if (Et[21] === MEMO_CACHE_SENTINEL) ((on = { requireScope: !0 }), (Et[21] = on));
  else on = Et[21];
  useDragToScroll(Ao, $n, !Sn, void 0, on);
  let _o;
  if (Et[22] === MEMO_CACHE_SENTINEL)
    ((_o = () => {
      let cn = Ro.current?.yogaNode;
      if (!cn) {
        return null;
      }
      let Dn = 0;
      for (let wn = Ro.current ?? void 0; wn; wn = wn.parentNode)
        Dn = Dn + (wn.yogaNode?.getComputedTop() ?? 0);
      return Dn + cn.getComputedHeight() - 1;
    }),
      (Et[22] = _o));
  else _o = Et[22];
  let mr;
  if (Et[23] === MEMO_CACHE_SENTINEL)
    ((mr = (Kn) => findRowOwner(Kn, Ho.current, Wo.current)), (Et[23] = mr));
  else mr = Et[23];
  useDiffSelectionAttach(minCol, _o, Sn ? void 0 : onAskAboutSelection, mr);
  let [Wn, Fr] = y(!1),
    Zn;
  if (Et[24] === MEMO_CACHE_SENTINEL) ((Zn = getDiffRepoRoot()), (Et[24] = Zn));
  else Zn = Et[24];
  let Un = Zn,
    dr;
  if (Et[25] !== ee) ((dr = findGitRoot(ee) ?? ee), (Et[25] = ee), (Et[26] = dr));
  else dr = Et[26];
  let or = dr,
    pr;
  if (Et[27] !== files || Et[28] !== or || Et[29] !== Wn || Et[30] !== so) {
    let Qn = or === Un ? [Un] : [Un, or];
    let ur = 0;
    let Ir = 0;
    let Pr = [];
    let ts = [];
    for (const Gn of files) {
      if (Qn.some((Ur) => matchingRuleForInput(resolve_2(Ur, Gn.path), so, "read", "deny") !== null)) {
        Ir++;
        continue;
      }
      if (Gn.preSession) {
        ts.push(Gn);
        continue;
      }
      if (isLockOrGeneratedFile(Gn.path) || isTestFile(Gn.path)) {
        if ((ur++, !Wn)) {
          continue;
        }
      }
      Pr.push(Gn);
    }
    pr = { files: Pr, preSessionFiles: ts, noiseCount: ur, deniedHidden: Ir };
    ((Et[27] = files), (Et[28] = or), (Et[29] = Wn), (Et[30] = so), (Et[31] = pr));
  } else pr = Et[31];
  let {
      files: files_2,
      preSessionFiles: preSessionFiles,
      noiseCount: noiseCount,
      deniedHidden: deniedHidden,
    } = pr,
    fr = files.length > 0 && kn.filesCount === files.length && noiseCount === 0 && deniedHidden === 0,
    $r = fr ? 0 : (stats?.linesAdded ?? 0) - kn.linesAdded,
    Yr = fr ? 0 : (stats?.linesRemoved ?? 0) - kn.linesRemoved,
    Er = fr ? 0 : (stats?.filesCount ?? files.length) - kn.filesCount,
    [Vr, ms] = y(0),
    max_2 = Math.max(0, files_2.length - Aoe),
    min = Math.min(Vr, max_2),
    sliced = files_2.slice(min, min + Aoe),
    ws = min,
    Ci = files_2.length - (min + sliced.length),
    max_3 = Math.max(0, Er - (files.length - kn.filesCount)),
    Oi = Wn ? 0 : noiseCount,
    Hi = null,
    Zi = null;
  if (!loading) {
    if (stats === null)
      ((Hi = "Diff unavailable"),
        (Zi = "Couldn't read the git diff \u2014 it will retry on the next change"));
    else if (Er === 0) {
      if (noCommits)
        ((Hi = "No commits yet"), (Zi = "Nothing to diff against until the repo's first commit"));
      else if (baseMode === "uncommitted") Hi = "No uncommitted changes";
      else if (baseMode === "branch") {
        if (source.kind === "branch") Hi = `No changes vs ${source.baseBranch}`;
        else
          ((Hi = "No changes vs HEAD"),
            (Zi = "No base branch to compare against \u2014 showing changes vs HEAD"));
      } else Hi = "No changes this session";
    }
  }
  let da;
  if (Et[32] === MEMO_CACHE_SENTINEL) ((da = () => Fr(FYo)), (Et[32] = da));
  else da = Et[32];
  const qn = noiseCount > 0;
  let ps;
  if (Et[33] !== qn) ((ps = { context: "Global", isActive: qn }), (Et[33] = qn), (Et[34] = ps));
  else ps = Et[34];
  (useKeybinding("app:toggleDiffNoiseFilter", da, ps), useAppState(BYo));
  let xs;
  if (Et[35] !== max_2)
    ((xs = function Ms(kr) {
      ms((ls) => clamp(Math.min(ls, max_2) + kr, 0, max_2));
    }),
      (Et[35] = max_2),
      (Et[36] = xs));
  else xs = Et[36];
  let Ms = xs,
    qs;
  if (Et[37] !== Ms)
    ((qs = { "app:diffFileListUp": () => Ms(-1), "app:diffFileListDown": () => Ms(1) }),
      (Et[37] = Ms),
      (Et[38] = qs));
  else qs = Et[38];
  const gs = max_2 > 0;
  let es;
  if (Et[39] !== gs) ((es = { context: "Global", isActive: gs }), (Et[39] = gs), (Et[40] = es));
  else es = Et[40];
  MessageActionsKeybindings(qs, es);
  let ds = useShortcutDisplay_2("app:diffFileListDown", "Global", "alt+down"),
    [Hs, _s] = y(!1),
    fs;
  if (Et[41] === MEMO_CACHE_SENTINEL) ((fs = () => _s(HYo)), (Et[41] = fs));
  else fs = Et[41];
  const ii = preSessionFiles.length > 0;
  let ua;
  if (Et[42] !== ii) ((ua = { context: "Global", isActive: ii }), (Et[42] = ii), (Et[43] = ua));
  else ua = Et[43];
  useKeybinding("app:toggleDiffPreSession", fs, ua);
  let La = loading
      ? null
      : Hi !== null
        ? { headline: Hi, hint: Zi }
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
            : null,
    Xa = Hs && preSessionFiles.length > 0,
    dl = loading || (La !== null && !Xa),
    Vl = useTimeout(loading ? hxt : null),
    yi = function yi(Hd) {
      let Ss = Wo.current.get(Hd);
      if (Ss) Ao.handle?.scrollToElement(Ss);
    };
  const Ws = Box,
    za = "column",
    cl = "100%";
  let Ol;
  if (Et[44] !== Ao.handle)
    ((Ol = (as) => {
      (Ao.handle?.scrollBy(as.deltaY * 3), as.preventDefault(), as.stopPropagation());
    }),
      (Et[44] = Ao.handle),
      (Et[45] = Ol));
  else Ol = Et[45];
  const pi = !0;
  let qa;
  if (Et[46] !== Hi || Et[47] !== Er || Et[48] !== loading || Et[49] !== $r || Et[50] !== Yr)
    ((qa =
      !loading &&
      Hi === null &&
      r(Text, {
        children: [
          r(Text, { bold: !0, children: [Er, " ", plural(Er, "file")] }),
          " ",
          "changed",
          ($r > 0 || Yr > 0) && " ",
          e(DiffStatCounts, { added: $r, removed: Yr }),
        ],
      })),
      (Et[46] = Hi),
      (Et[47] = Er),
      (Et[48] = loading),
      (Et[49] = $r),
      (Et[50] = Yr),
      (Et[51] = qa));
  else qa = Et[51];
  let pd;
  if (Et[52] === MEMO_CACHE_SENTINEL) ((pd = e(Box, { flexGrow: 1 })), (Et[52] = pd));
  else pd = Et[52];
  let $l;
  if (Et[53] !== ke || Et[54] !== po || Et[55] !== storageV5)
    (($l = e(CloseButton, { onClose: () => closeDiffSidebar(ke, po, storageV5) })),
      (Et[53] = ke),
      (Et[54] = po),
      (Et[55] = storageV5),
      (Et[56] = $l));
  else $l = Et[56];
  let Yi;
  if (Et[57] !== qa || Et[58] !== $l)
    ((Yi = r(Box, { flexDirection: "row", children: [qa, pd, $l] })),
      (Et[57] = qa),
      (Et[58] = $l),
      (Et[59] = Yi));
  else Yi = Et[59];
  let El;
  if (
    Et[60] !== He ||
    Et[61] !== baseMode ||
    Et[62] !== Er ||
    Et[63] !== noCommits ||
    Et[64] !== source ||
    Et[65] !== stats
  )
    ((El =
      stats !== null &&
      (noCommits
        ? Er > 0 && e(Text, { dimColor: !0, children: "no commits yet \u2014 showing staged and new files" })
        : (He !== "session" || baseMode !== "session") &&
          e(Text, { dimColor: !0, children: diffBaseLabel(He, source, He !== baseMode) }))),
      (Et[60] = He),
      (Et[61] = baseMode),
      (Et[62] = Er),
      (Et[63] = noCommits),
      (Et[64] = source),
      (Et[65] = stats),
      (Et[66] = El));
  else El = Et[66];
  let Ll;
  if (Et[67] !== max || Et[68] !== bn || Et[69] !== Go)
    ((Ll =
      Go > 0 &&
      r(Box, {
        marginTop: 1,
        flexDirection: "row",
        gap: 1,
        children: [
          e(ProgressBar, {
            ratio: bn / Go,
            width: Math.min(20, max - 12),
            fillColor: "success",
            emptyColor: "inactive",
          }),
          r(Text, { dimColor: !0, children: [bn, "/", Go] }),
        ],
      })),
      (Et[67] = max),
      (Et[68] = bn),
      (Et[69] = Go),
      (Et[70] = Ll));
  else Ll = Et[70];
  const Vd =
    (sliced.length > 0 || noiseCount > 0) &&
    r(Box, {
      flexDirection: "column",
      marginTop: 1,
      onWheel:
        max_2 > 0
          ? (_c) => {
              (Ms(_c.deltaY), _c.preventDefault(), _c.stopPropagation());
            }
          : void 0,
      children: [
        ws > 0 && r(Text, { dimColor: !0, children: [UP_ARROW, " ", ws, " more above"] }),
        sliced.map((mc) =>
          e(
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
          r(Text, {
            dimColor: !0,
            children: [
              Ci > 0 ? `${DOWN_ARROW} ` : "\u2026 ",
              [
                Ci > 0 ? `${Ci} more below${ds ? ` (${ds} to scroll)` : ""}` : null,
                deniedHidden > 0 ? `${deniedHidden} read-denied` : null,
                max_3 > 0 ? `${max_3} not shown` : null,
              ]
                .filter(Boolean)
                .join(" \xB7 "),
            ],
          }),
        noiseCount > 0 && e(GeneratedFilesToggle, { count: noiseCount, shown: Wn, onToggle: () => Fr(UYo) }),
      ],
    });
  let cd;
  if (Et[71] !== Yi || Et[72] !== El || Et[73] !== Ll || Et[74] !== Vd)
    ((cd = r(Box, {
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      flexShrink: 0,
      children: [Yi, El, Ll, Vd],
    })),
      (Et[71] = Yi),
      (Et[72] = El),
      (Et[73] = Ll),
      (Et[74] = Vd),
      (Et[75] = cd));
  else cd = Et[75];
  const Ka = Box,
    pl = 1,
    Gl = "column",
    gd = "hidden",
    pc = dl
      ? r(Fragment, {
          children: [
            e(Box, {
              flexGrow: 1,
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              paddingX: 1,
              children: loading
                ? Vl && e(WorkerBadge, { message: "Loading diff\u2026", dimColor: !0 })
                : La !== null &&
                  [La.headline, La.hint ?? ""]
                    .flatMap((hd) =>
                      hd === ""
                        ? []
                        : wrapText(hd, max, "wrap").split(`
`),
                    )
                    .map(WYo),
            }),
            stats !== null &&
              preSessionFiles.length > 0 &&
              e(Box, {
                flexShrink: 0,
                paddingX: 1,
                paddingBottom: 1,
                children: e(PreSessionFilesSection, {
                  files: preSessionFiles,
                  hunks: hunks,
                  shown: Hs,
                  onToggle: () => _s(jYo),
                  width: max,
                }),
              }),
          ],
        })
      : e(LI, {
          ref: attach,
          flexGrow: 1,
          flexDirection: "column",
          stickyScroll: !1,
          paddingX: 1,
          children: r(Box, {
            flexDirection: "column",
            width: max,
            children: [
              La !== null
                ? e(HintText, { hint: La.hint ?? void 0, children: La.headline })
                : e(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: files_2.map((bd) =>
                      r(
                        Box,
                        {
                          flexDirection: "column",
                          ref: (Od) => {
                            if (Od) Wo.current.set(bd.path, Od);
                            else Wo.current.delete(bd.path);
                          },
                          children: [
                            e(Divider, { width: max }),
                            e(DiffDetailView, {
                              filePath: bd.path,
                              hunks: hunks.get(bd.path) ?? [],
                              isBinary: bd.isBinary,
                              isLargeFile: bd.isLargeFile,
                              isTruncated: bd.isTruncated,
                              isUntracked: bd.isUntracked,
                              width: max,
                            }),
                          ],
                        },
                        bd.path,
                      ),
                    ),
                  }),
              stats !== null &&
                preSessionFiles.length > 0 &&
                e(PreSessionFilesSection, {
                  files: preSessionFiles,
                  hunks: hunks,
                  shown: Hs,
                  onToggle: () => _s(qYo),
                  width: max,
                }),
            ],
          }),
        });
  let Kd;
  if (Et[76] !== Ka || Et[77] !== pc)
    ((Kd = e(Ka, { ref: Ho, flexGrow: pl, flexDirection: Gl, overflow: gd, children: pc })),
      (Et[76] = Ka),
      (Et[77] = pc),
      (Et[78] = Kd));
  else Kd = Et[78];
  let ec;
  if (Et[79] !== Ws || Et[80] !== Ol || Et[81] !== cd || Et[82] !== Kd || Et[83] !== width)
    ((ec = r(Ws, {
      ref: Ro,
      flexDirection: za,
      width: width,
      height: cl,
      onWheel: Ol,
      selectionScope: pi,
      children: [cd, Kd],
    })),
      (Et[79] = Ws),
      (Et[80] = Ol),
      (Et[81] = cd),
      (Et[82] = Kd),
      (Et[83] = width),
      (Et[84] = ec));
  else ec = Et[84];
  return ec;
}
//@ chunk-18hwfzwa.js:1835163-1835430 sole-consumer
function diffBaseLabel(h, x, D) {
  let L;
  switch (h) {
    case "session":
      L = "this session";
      break;
    case "uncommitted":
      L = "uncommitted (vs HEAD)";
      break;
    case "branch":
      if (x.kind === "branch") L = `branch vs ${x.baseBranch}`;
      else L = D ? "branch diff" : "vs HEAD (no base branch)";
      break;
  }
  return D ? `${L}\u2026` : L;
}
/**
 * diff 侧栏里"本次会话前已编辑的文件"折叠区：点击切换显示文件列表及各自 diff（文件过多时隐藏 diff）。
 */
//@ chunk-18hwfzwa.js:1835430-1837025 sole-consumer
function PreSessionFilesSection(props) {
  let He = w(21),
    { files: files, hunks: hunks, shown: shown, onToggle: onToggle, width: width } = props,
    [Re, Be] = y(!1),
    We,
    ze;
  if (He[0] === MEMO_CACHE_SENTINEL) ((We = () => Be(!0)), (ze = () => Be(!1)), (He[0] = We), (He[1] = ze));
  else ((We = He[0]), (ze = He[1]));
  const Xe = !Re,
    rt = files.length;
  let kt;
  if (He[2] !== files.length) ((kt = plural(files.length, "file")), (He[2] = files.length), (He[3] = kt));
  else kt = He[3];
  const At = shown ? "hide" : "show";
  let It;
  if (He[4] !== files.length || He[5] !== Re || He[6] !== Xe || He[7] !== kt || He[8] !== At)
    ((It = r(Text, {
      dimColor: Xe,
      underline: Re,
      children: ["+", rt, " ", kt, " edited before this session (", At, ")"],
    })),
      (He[4] = files.length),
      (He[5] = Re),
      (He[6] = Xe),
      (He[7] = kt),
      (He[8] = At),
      (He[9] = It));
  else It = He[9];
  let Ot;
  if (He[10] !== onToggle || He[11] !== It)
    ((Ot = e(Box, {
      flexDirection: "row",
      onClick: onToggle,
      onMouseEnter: We,
      onMouseLeave: ze,
      children: It,
    })),
      (He[10] = onToggle),
      (He[11] = It),
      (He[12] = Ot));
  else Ot = He[12];
  let Et;
  if (He[13] !== files || He[14] !== hunks || He[15] !== shown || He[16] !== width)
    ((Et =
      shown &&
      r(Fragment, {
        children: [
          e(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: files.map((Dt) =>
              r(
                Box,
                {
                  flexDirection: "row",
                  width: width,
                  children: [
                    e(Text, {
                      dimColor: !0,
                      children: truncateStartToWidth(diffLineToPlainText(Dt.path), Math.max(width - 12, 8)),
                    }),
                    e(Box, { flexGrow: 1 }),
                    e(DiffStatCounts, { added: Dt.linesAdded, removed: Dt.linesRemoved }),
                  ],
                },
                Dt.path,
              ),
            ),
          }),
          files.length > Moe
            ? r(Text, { dimColor: !0, children: ["diffs hidden above ", Moe, " files"] })
            : files.map((Lt) =>
                r(
                  Box,
                  {
                    flexDirection: "column",
                    children: [
                      e(Divider, { width: width }),
                      e(DiffDetailView, {
                        filePath: Lt.path,
                        hunks: hunks.get(Lt.path) ?? [],
                        isBinary: Lt.isBinary,
                        isLargeFile: Lt.isLargeFile,
                        isTruncated: Lt.isTruncated,
                        isUntracked: Lt.isUntracked,
                        width: width,
                      }),
                    ],
                  },
                  Lt.path,
                ),
              ),
        ],
      })),
      (He[13] = files),
      (He[14] = hunks),
      (He[15] = shown),
      (He[16] = width),
      (He[17] = Et));
  else Et = He[17];
  let oo;
  if (He[18] !== Ot || He[19] !== Et)
    ((oo = r(Box, { flexDirection: "column", marginTop: 1, children: [Ot, Et] })),
      (He[18] = Ot),
      (He[19] = Et),
      (He[20] = oo));
  else oo = He[20];
  return oo;
}
/**
 * 关闭按钮组件（悬停加粗）。
 */
//@ chunk-18hwfzwa.js:1837025-1837437 sole-consumer
function CloseButton(h) {
  let ee = w(8),
    { onClose: onClose } = h,
    [D, L] = y(!1),
    ke,
    Re;
  if (ee[0] === MEMO_CACHE_SENTINEL) ((ke = () => L(!0)), (Re = () => L(!1)), (ee[0] = ke), (ee[1] = Re));
  else ((ke = ee[0]), (Re = ee[1]));
  const Be = !D;
  let He;
  if (ee[2] !== D || ee[3] !== Be)
    ((He = e(Text, { bold: D, dimColor: Be, children: HEAVY_MULTIPLICATION_X })),
      (ee[2] = D),
      (ee[3] = Be),
      (ee[4] = He));
  else He = ee[4];
  let We;
  if (ee[5] !== onClose || ee[6] !== He)
    ((We = e(Box, { onClick: onClose, onMouseEnter: ke, onMouseLeave: Re, children: He })),
      (ee[5] = onClose),
      (ee[6] = He),
      (ee[7] = We));
  else We = ee[7];
  return We;
}
/**
 * 显示/隐藏生成测试文件数量的切换组件。
 */
//@ chunk-18hwfzwa.js:1837437-1838087 sole-consumer
function GeneratedFilesToggle(h) {
  let $ = w(13),
    { count: count, shown: shown, onToggle: onToggle } = h,
    [hovered, setHovered] = y(!1),
    onEnter,
    onLeave;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((onEnter = () => setHovered(!0)), (onLeave = () => setHovered(!1)), ($[0] = onEnter), ($[1] = onLeave));
  else ((onEnter = $[0]), (onLeave = $[1]));
  const dim = !hovered;
  let noun;
  if ($[2] !== count) ((noun = plural(count, "test")), ($[2] = count), ($[3] = noun));
  else noun = $[3];
  const verb = shown ? "hide" : "show";
  let label;
  if ($[4] !== count || $[5] !== hovered || $[6] !== dim || $[7] !== noun || $[8] !== verb)
    ((label = r(Text, {
      dimColor: dim,
      underline: hovered,
      children: [count, " ", noun, "/generated (", verb, ")"],
    })),
      ($[4] = count),
      ($[5] = hovered),
      ($[6] = dim),
      ($[7] = noun),
      ($[8] = verb),
      ($[9] = label));
  else label = $[9];
  let element;
  if ($[10] !== onToggle || $[11] !== label)
    ((element = e(Box, {
      flexDirection: "row",
      onClick: onToggle,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      children: label,
    })),
      ($[10] = onToggle),
      ($[11] = label),
      ($[12] = element));
  else element = $[12];
  return element;
}
/**
 * diff 面板中单个文件的行组件：截断显示路径、悬停下划线，并显示增删行数。
 */
//@ chunk-18hwfzwa.js:1838087-1838906 sole-consumer
function DiffFileRow(h) {
  let $ = w(17),
    { path: path, added: added, removed: removed, width: width, onClick: onClick } = h,
    [hovered, setHovered] = y(!1),
    truncatedPath;
  if ($[0] !== path || $[1] !== width)
    ((truncatedPath = truncateStartToWidth(diffLineToPlainText(path), Math.max(width - 12, 8))),
      ($[0] = path),
      ($[1] = width),
      ($[2] = truncatedPath));
  else truncatedPath = $[2];
  let pathText = truncatedPath,
    onEnter,
    onLeave;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((onEnter = () => setHovered(!0)), (onLeave = () => setHovered(!1)), ($[3] = onEnter), ($[4] = onLeave));
  else ((onEnter = $[3]), (onLeave = $[4]));
  const dim = !hovered;
  let label;
  if ($[5] !== pathText || $[6] !== hovered || $[7] !== dim)
    ((label = e(Text, { dimColor: dim, underline: hovered, children: pathText })),
      ($[5] = pathText),
      ($[6] = hovered),
      ($[7] = dim),
      ($[8] = label));
  else label = $[8];
  let spacer;
  if ($[9] === MEMO_CACHE_SENTINEL) ((spacer = e(Box, { flexGrow: 1 })), ($[9] = spacer));
  else spacer = $[9];
  let stats;
  if ($[10] !== added || $[11] !== removed)
    ((stats = e(DiffStatCounts, { added: added, removed: removed })),
      ($[10] = added),
      ($[11] = removed),
      ($[12] = stats));
  else stats = $[12];
  let element;
  if ($[13] !== onClick || $[14] !== label || $[15] !== stats)
    ((element = r(Box, {
      flexDirection: "row",
      onClick: onClick,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      children: [label, spacer, stats],
    })),
      ($[13] = onClick),
      ($[14] = label),
      ($[15] = stats),
      ($[16] = element));
  else element = $[16];
  return element;
}
//@ chunk-18hwfzwa.js:1838906-1838910 sole-consumer
j();
//@ chunk-18hwfzwa.js:1838910-1839026 sole-consumer
function useDiffSnapshot() {
  let h = useAppState((L) => L.fileHistory.trackSequence ?? 0),
    x = useAppState((L) => L.replTab),
    D = getDiffCwd();
  return Q(() => wFn(), [D, h, x]);
}
//@ chunk-18hwfzwa.js:1839026-1839053 sole-consumer
function gJo() {
  return null;
}
//@ chunk-18hwfzwa.js:1839053-1839090 sole-consumer
function hJo(cne) {
  return cne.replTab;
}
//@ chunk-18hwfzwa.js:1839090-1839131 sole-consumer = _temp (1)
function yJo(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:1839131-1839179 sole-consumer = _temp (1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-18hwfzwa.js:1839179-1839218 sole-consumer
function bJo(J0) {
  return J0.isBriefOnly;
}
//@ chunk-18hwfzwa.js:1839218-1839263 sole-consumer
function wJo(PAt) {
  return PAt.briefTranscript;
}
//@ chunk-18hwfzwa.js:1839263-1839303 sole-consumer
function kJo(X0) {
  return X0.ideSelection;
}
//@ chunk-18hwfzwa.js:1839303-1839333 sole-consumer
function vJo() {
  return new BridgeChannelSlot();
}
//@ chunk-18hwfzwa.js:1839333-1839370 sole-consumer
function CJo(bw) {
  return bw.isLoading;
}
//@ chunk-18hwfzwa.js:1839370-1839396 sole-consumer
function _Jo(uP) {
  return !1;
}
//@ chunk-18hwfzwa.js:1839396-1839436 sole-consumer
function TJo(YK) {
  return YK.toolProgress;
}
//@ chunk-18hwfzwa.js:1839436-1839488 sole-consumer
function RJo(ZOe) {
  return !!ZOe.userInputOnProcessing;
}
//@ chunk-18hwfzwa.js:1839488-1839517 sole-consumer
function xJo() {
  return $H(!1);
}
//@ chunk-18hwfzwa.js:1839517-1839545 sole-consumer
function PJo() {
  return clearBlockingDialog();
}
//@ chunk-18hwfzwa.js:1839545-1839583 sole-consumer
function AJo(QE) {
  return topBlockingDialog(QE) !== null;
}
//@ chunk-18hwfzwa.js:1839583-1839638 sole-consumer
function MJo() {
  return getGlobalConfig().messageIdleNotifThresholdMs;
}
//@ chunk-18hwfzwa.js:1839638-1839679 sole-consumer
function selectHasBashesDialog(JK) {
  return !!JK.bashesDialog;
}
//@ chunk-18hwfzwa.js:1839679-1839708 sole-consumer
function EJo() {
  return new SurveySlotStore();
}
//@ chunk-18hwfzwa.js:1839708-1839737 sole-consumer
function DJo() {
  return jH(!1);
}
//@ chunk-18hwfzwa.js:1839737-1839764 sole-consumer
function OJo() {
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
    ev.componentStack ? { error_component_stack_hash: gn(ev.componentStack) } : void 0,
  );
}
//@ chunk-18hwfzwa.js:1839991-1840048 fingerprint = useScheduledTasks (0.524)
var useScheduledTasks = require("./chunk-4m1yk02k.js").useScheduledTasks;
//@ chunk-18hwfzwa.js:1840048-1840065 layout
var NullComponent = () => null;
/**
 * REPL 外壳：用 props.messageQueue（缺省取全局消息队列）建队列 Provider，并提供写入节流上下文后渲染 REPL。
 */
//@ chunk-18hwfzwa.js:1840065-1840431 facade-exports
function REPL(h) {
  let $ = w(8),
    x = Nu(),
    [D] = y(gJo);
  const L = h.messageQueue ?? x;
  let ke;
  if ($[0] !== h) ((ke = e(REPL_2, { ...h })), ($[0] = h), ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] !== D || $[3] !== ke)
    ((Re = e(SpinnerPaceContext.Provider, { value: D, children: ke })), ($[2] = D), ($[3] = ke), ($[4] = Re));
  else Re = $[4];
  let Be;
  if ($[5] !== L || $[6] !== Re)
    ((Be = e(QueueProvider, { queue: L, children: Re })), ($[5] = L), ($[6] = Re), ($[7] = Be));
  else Be = $[7];
  return Be;
}
/**
 * 主交互屏幕（316 重写为“控制器 + 外部 store”架构）。按 props 建立一组长生命周期控制器（useState 初始化器里 new）：ReplSessionScope、TurnController+转录 store、ComposerChrome、SessionController、PromptSubmitController、ScrollPin、PromptDraft、IdleNudge、BackgroundGesture 等，
 * 再用 useLayoutEffect 一次性 bindHost 把 mainLoopModel/canUseTool/通知等宿主能力注入各控制器。渲染：transcript 屏返回 gQ 转录视图；prompt 屏返回 FullscreenLayout{scrollable=Gee 消息列表, abovePrompt=通知/任务/权限区, bottom=y8 输入区, sidebar=diff 侧栏, dock=面板坞}，
 * 外层包 MCPConnectionManager、$A.Provider(tokenWarning)、LF、_F 屏幕框架。也挂 GlobalKeybindingHandlers、useQueueProcessor、useScheduledTasks、useMailboxBridge、useLogMessages 等副作用 hook。
 */
//@ chunk-18hwfzwa.js:1840431-1878241 callgraph-witnessed = REPL (0.129)
function REPL_2(h) {
  let $ = w(686),
    {
      commands: commands,
      debug: debug,
      initialTools: initialTools,
      initialMessages: initialMessages,
      initialMessagesOrigin: initialMessagesOrigin,
      pendingHookMessages: pendingHookMessages,
      initialFileHistorySnapshots: initialFileHistorySnapshots,
      initialContentReplacements: initialContentReplacements,
      mcpClients: mcpClients,
      dynamicMcpConfig: dynamicMcpConfig,
      autoConnectIdeFlag: autoConnectIdeFlag,
      strictMcpConfig: strictMcpConfig,
      systemPrompt: systemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      systemPromptSnapshot: systemPromptSnapshot,
      onBeforeQuery: onBeforeQuery,
      onTurnComplete: onTurnComplete,
      onCaptureSnapshot: onCaptureSnapshot,
      disabled: disabled,
      mainThreadAgentDefinition: mainThreadAgentDefinition,
      disableSlashCommands: disableSlashCommands,
      remoteSessionConfig: remoteSessionConfig,
      onDetachToCaller: onDetachToCaller,
      embedded: embedded,
      hideWelcomeChrome: hideWelcomeChrome,
      hideLoginNotice: hideLoginNotice,
      disableQuery: disableQuery,
      filterCommands: filterCommands,
      cancelRef: cancelRef,
      directConnectConfig: directConnectConfig,
      sshSession: sshSession,
      thinkingConfig: thinkingConfig,
      thinkingConfigExplicit: thinkingConfigExplicit,
      thinkingDisplayFlag: thinkingDisplayFlag,
      fallbackModel: fallbackModel,
      engine: engine,
      onCommandsChange: onCommandsChange,
      onQueryParamsChange: onQueryParamsChange,
    } = h,
    isStrictMcpConfig = strictMcpConfig === void 0 ? !1 : strictMcpConfig,
    isDisabled = disabled === void 0 ? !1 : disabled,
    slashCommandsDisabled = disableSlashCommands === void 0 ? !1 : disableSlashCommands,
    isEmbedded = embedded === void 0 ? !1 : embedded,
    shouldHideLoginNotice = hideLoginNotice === void 0 ? !1 : hideLoginNotice,
    isQueryDisabled = disableQuery === void 0 ? !1 : disableQuery,
    presentation = useRenderMode(),
    isInsidePanelHost = Se(lVt) !== null;
  AHt() && (!isEmbedded || isInsidePanelHost);
  let isFullscreen = presentation === "fullscreen",
    { storageV5: storageV5, credentials: credentials } = Me(),
    fleetNudgeStore = useFleetNudgeStore(),
    messageQueue = Nu(),
    mr;
  if ($[0] !== remoteSessionConfig)
    ((mr = !!remoteSessionConfig || htt()), ($[0] = remoteSessionConfig), ($[1] = mr));
  else mr = $[1];
  let isRemoteSession = mr,
    hasRemoteTransport = isRemoteSession || !!directConnectConfig || !!sshSession,
    Fr;
  if ($[2] !== hasRemoteTransport)
    ((Fr = getIsRemoteMode() || hasRemoteTransport), ($[2] = hasRemoteTransport), ($[3] = Fr));
  else Fr = $[3];
  let isThinClient = Fr,
    clock = useClock(),
    CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL,
    session = useSession(),
    replTab = useAppState(hJo),
    hasGitRepo = useDiffSnapshot(),
    replTab_2 = useAppState(yJo),
    chromeClients = useAppState(selectPendingWorkerRequest_2),
    setAppState = useSetAppState(),
    setSessionState = B_o(),
    store = Cr(),
    activePlugins = useActivePlugins(),
    sessionHooks = useSessionHooksRegistry();
  useRegistryOverride(session);
  let dialogStore = useDialogStore(),
    spinnerStore = useSpinnerStore();
  useBackgroundStatusSync();
  let _r;
  if ($[4] !== store) ((_r = () => store.getState()), ($[4] = store), ($[5] = _r));
  else _r = $[5];
  let fr;
  if ($[6] !== setAppState || $[7] !== _r)
    ((fr = createTaskFramework(_r, setAppState, { refillWebSearchBudgetByDefault: !0 })),
      ($[6] = setAppState),
      ($[7] = _r),
      ($[8] = fr));
  else fr = $[8];
  let taskRegistry = fr,
    Yr;
  if ($[9] !== initialMessages || $[10] !== store)
    ((Yr = () => {
      let Er = mainAgentId();
      let Vr = initialMessages ?? IIe();
      return (
        store.setState((ms) => ({
          ...ms,
          transcripts: { ...ms.transcripts, [Er]: { messages: Vr, inProgressToolUseIDs: new Set() } },
        })),
        null
      );
    }),
      ($[9] = initialMessages),
      ($[10] = store),
      ($[11] = Yr));
  else Yr = $[11];
  y(Yr);
  let teammateColors;
  if ($[12] !== setAppState || $[13] !== store.getState)
    ((teammateColors = createColorAssigner(wIe(store.getState, setAppState, "teammateColors"))),
      ($[12] = setAppState),
      ($[13] = store.getState),
      ($[14] = teammateColors));
  else teammateColors = $[14];
  let Ls = teammateColors,
    terminal = useTerminalNotification(),
    mainLoopModel = useMainLoopModel_3(),
    isBriefOnly = useAppState(bJo),
    briefTranscript = useAppState(wJo),
    [screen, setScreen] = y("prompt"),
    [dumpMode, setDumpMode] = y(!1),
    qn;
  if ($[15] === MEMO_CACHE_SENTINEL)
    ((qn = () => {
      (setScreen("prompt"), setDumpMode(!1));
    }),
      ($[15] = qn));
  else qn = $[15];
  let exitTranscript = qn,
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    mergedMcpClients = jw(mcpClients, replTab_2);
  (runStartupNotificationSpecs(),
    FeatureOfTheWeekClaim(addNotification, removeNotification),
    FEe(session, addNotification, removeNotification));
  let Ms, qs;
  if ($[16] !== credentials || $[17] !== storageV5)
    ((Ms = () => {
      refreshApiCreditLinkStatus(credentials, storageV5).catch(logError);
    }),
      (qs = [credentials, storageV5]),
      ($[16] = credentials),
      ($[17] = storageV5),
      ($[18] = Ms),
      ($[19] = qs));
  else ((Ms = $[18]), (qs = $[19]));
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
  )
    ((gs = () =>
      new ReplSessionScope({
        store: store,
        initialMcpClients: mcpClients,
        storageV5: storageV5,
        credentials: credentials,
        initialMessages: initialMessages,
        initialContentReplacements: initialContentReplacements,
        initialCommands: commands,
        initialDynamicMcpConfig: dynamicMcpConfig,
        initialTools: initialTools,
        mainThreadAgentDefinition: mainThreadAgentDefinition,
        disableSlashCommands: slashCommandsDisabled,
        filterCommands: filterCommands,
        isThinClient: isThinClient,
        session: session,
        refreshContext: () => invalidateUserContext(session, "hooks_invalidate"),
        onCommandsChange: onCommandsChange,
      })),
      ($[20] = credentials),
      ($[21] = slashCommandsDisabled),
      ($[22] = filterCommands),
      ($[23] = commands),
      ($[24] = initialContentReplacements),
      ($[25] = dynamicMcpConfig),
      ($[26] = mainThreadAgentDefinition),
      ($[27] = mcpClients),
      ($[28] = initialMessages),
      ($[29] = initialTools),
      ($[30] = isThinClient),
      ($[31] = onCommandsChange),
      ($[32] = session),
      ($[33] = storageV5),
      ($[34] = store),
      ($[35] = gs));
  else gs = $[35];
  let [scope] = y(gs),
    {
      commands: commands_2,
      renderingTools: renderingTools,
      dynamicMcpConfig: dynamicMcpConfig_2,
    } = useStoreSelector(scope),
    writePacer = Se(SpinnerPaceContext),
    ii;
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
  )
    ((ii = () => {
      let ua = engine === void 0;
      let Xa =
        engine ??
        runWithQueryParams({
          store: store,
          scope: scope,
          readPendingQueryParams: () => La.readPendingQueryParams(),
        });
      let dl = isWindowsTerminal();
      let La = new TurnController({
        engine: Xa,
        presentation: presentation,
        ownsEngine: ua,
        initialExternalLoading: remoteSessionConfig?.initialPromptUuid !== void 0,
        initialHaikuTitleAttempted: (initialMessages?.length ?? 0) > 0,
        onTimingChange: (value) => y2n(taskRegistry, mainAgentId(), value),
        frameNotifier: writePacer ?? j_o,
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
      return { sessionEngine: Xa, turn: La, transcript: Hd };
    }),
      ($[36] = clock.setTimeout),
      ($[37] = engine),
      ($[38] = writePacer),
      ($[39] = initialMessages?.length),
      ($[40] = presentation),
      ($[41] = remoteSessionConfig?.initialPromptUuid),
      ($[42] = scope),
      ($[43] = store),
      ($[44] = taskRegistry),
      ($[45] = ii));
  else ii = $[45];
  let [controllers] = y(ii),
    { sessionEngine: sessionEngine, turn: turn, transcript: transcript } = controllers;
  (useTrustedDeviceEnrolledNotice(addNotification, transcript), useInformationalMessageSink(transcript));
  let qa;
  if ($[46] !== onQueryParamsChange || $[47] !== turn.readPendingQueryParams)
    ((qa = () => {
      onQueryParamsChange?.(turn.readPendingQueryParams);
    }),
      ($[46] = onQueryParamsChange),
      ($[47] = turn.readPendingQueryParams),
      ($[48] = qa));
  else qa = $[48];
  let pd;
  if ($[49] !== onQueryParamsChange || $[50] !== turn)
    ((pd = [onQueryParamsChange, turn]), ($[49] = onQueryParamsChange), ($[50] = turn), ($[51] = pd));
  else pd = $[51];
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
  )
    (($l = () =>
      new ComposerChrome({
        debug: debug,
        embedded: isEmbedded,
        onDetachToCaller: onDetachToCaller,
        hasSuppressedDialogs: !1,
        hideLoginNotice: shouldHideLoginNotice,
        isRemoteSession: isRemoteSession,
        addNotification: addNotification,
        store: store,
        storageV5: storageV5,
        exitReaders: {
          getMessages: () => transcript.getSnapshot(),
          isMidTurn: () => turn.guard.isActive,
          isResponseStreaming: () => turn.guard.isRunning,
        },
      })),
      ($[52] = addNotification),
      ($[53] = debug),
      ($[54] = isEmbedded),
      ($[55] = shouldHideLoginNotice),
      ($[56] = isRemoteSession),
      ($[57] = onDetachToCaller),
      ($[58] = storageV5),
      ($[59] = store),
      ($[60] = transcript),
      ($[61] = turn.guard),
      ($[62] = $l));
  else $l = $[62];
  let [chrome] = y($l),
    ideSelection = useStoreSelector(chrome, kJo),
    Ll = transcript.apply;
  uiLogNamespace.useUiLog(transcript);
  let _c;
  if ($[63] !== Ll)
    ((_c = () => ien.createTurnEventTail((value) => Ll({ type: "append", messages: value }))),
      ($[63] = Ll),
      ($[64] = _c));
  else _c = $[64];
  let [turnEventTail] = y(_c),
    [permissionRelays] = y(vJo),
    Ka;
  if ($[65] !== permissionRelays || $[66] !== scope.requestDialog || $[67] !== setAppState)
    ((Ka = () =>
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
      })),
      ($[65] = permissionRelays),
      ($[66] = scope.requestDialog),
      ($[67] = setAppState),
      ($[68] = Ka));
  else Ka = $[68];
  let [networkPrompts] = y(Ka),
    hd;
  if (
    $[69] !== credentials ||
    $[70] !== isRemoteSession ||
    $[71] !== networkPrompts ||
    $[72] !== scope ||
    $[73] !== setAppState ||
    $[74] !== storageV5 ||
    $[75] !== store ||
    $[76] !== transcript.getSnapshot
  )
    ((hd = () =>
      new SandboxStartup({
        store: store,
        setAppState: setAppState,
        storageV5: storageV5,
        credentials: credentials,
        scope: scope,
        getMessages: transcript.getSnapshot,
        networkPrompts: networkPrompts,
        isRemoteSession: isRemoteSession,
      })),
      ($[69] = credentials),
      ($[70] = isRemoteSession),
      ($[71] = networkPrompts),
      ($[72] = scope),
      ($[73] = setAppState),
      ($[74] = storageV5),
      ($[75] = store),
      ($[76] = transcript.getSnapshot),
      ($[77] = hd));
  else hd = $[77];
  let [sandbox] = y(hd),
    isLoading = useStoreSelector(turn, CJo);
  useStoreSelector(turn, _Jo);
  let toolProgress = useStoreSelector(turn.stream, TJo),
    userInputOnProcessing = useStoreSelector(turn.stream, RJo),
    hasToolProgress = toolProgress.size > 0,
    qu;
  if ($[78] !== toolProgress) ((qu = DATE_RANGE_ORDER(toolProgress)), ($[78] = toolProgress), ($[79] = qu));
  else qu = $[79];
  let pauseAnimation = qu,
    { guard: guard, buildToolUseContext: buildToolUseContext } = turn,
    awaySummary = useAwaySummaryController(transcript, isLoading, !isRemoteSession),
    Kp;
  if ($[80] !== awaySummary || $[81] !== transcript)
    ((Kp = () => new ScrollPin({ transcript: transcript, awaySummary: awaySummary })),
      ($[80] = awaySummary),
      ($[81] = transcript),
      ($[82] = Kp));
  else Kp = $[82];
  let [scrollPin] = y(Kp),
    ss;
  if (
    $[83] !== clock.setTimeout ||
    $[84] !== scrollPin ||
    $[85] !== session ||
    $[86] !== store ||
    $[87] !== transcript ||
    $[88] !== turn
  )
    ((ss = () => {
      let safeYoloMessageShownRef = bM(session);
      let isTypedAhead = hasEarlyInputField() && hasTypedEarlyInput();
      return (
        setPromptValue(safeYoloMessageShownRef, consumeEarlyInput()),
        new PromptDraft({
          valueStore: safeYoloMessageShownRef,
          scheduleTimeout: clock.setTimeout,
          isTypedAhead: isTypedAhead,
          watchText: raisePromptChange,
          rewriteEdit: ($a, xl) => turn.rewriteInputOverAutoContinuePrefill($a, xl),
          onEdit: (ref, setMessages) => {
            (scrollPin.onPromptEdit(ref, setMessages),
              activityManager.recordUserActivity(),
              onUserInput(),
              updateLastInteractionTime(!0));
          },
          screensPrompts: () =>
            hasPromptSubmitHooks(
              turn,
              transcript.getSnapshot(),
              getMainLoopModelFromState(store.getState()),
              "installed",
            ),
        })
      );
    }),
      ($[83] = clock.setTimeout),
      ($[84] = scrollPin),
      ($[85] = session),
      ($[86] = store),
      ($[87] = transcript),
      ($[88] = turn),
      ($[89] = ss));
  else ss = $[89];
  let [draft] = y(ss),
    Ya,
    tl;
  if ($[90] !== draft)
    ((Ya = () => draft.start()), (tl = [draft]), ($[90] = draft), ($[91] = Ya), ($[92] = tl));
  else ((Ya = $[91]), (tl = $[92]));
  zt(Ya, tl);
  let ol, ed;
  if ($[93] !== draft || $[94] !== turn)
    ((ol = () => () => {
      (turn.dispose(), draft.dispose());
    }),
      (ed = [turn, draft]),
      ($[93] = draft),
      ($[94] = turn),
      ($[95] = ol),
      ($[96] = ed));
  else ((ol = $[95]), (ed = $[96]));
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
  )
    ((_d = () =>
      new SessionController({
        session: session,
        presentation: presentation,
        store: store,
        setAppState: setAppState,
        transcript: transcript,
        turn: turn,
        draft: draft,
        chrome: chrome,
        scrollPin: scrollPin,
        scope: scope,
        engine: sessionEngine,
        dialogStore: dialogStore,
        taskRegistry: taskRegistry,
        messageQueue: messageQueue,
        storageV5: storageV5,
        credentials: credentials,
        sessionHooks: sessionHooks,
        initialMessages: initialMessages,
        initialMessagesOrigin: initialMessagesOrigin,
        initialMainThreadAgentDefinition: mainThreadAgentDefinition,
        disableQuery: isQueryDisabled,
        hasRemoteTransport: hasRemoteTransport,
        resetReplTabToConvo: () => switchToConversationTab(session.host, setAppState),
        resetTurnEventTail: () => turnEventTail.reset(),
        clock: clock,
        sandbox: sandbox,
        spinnerStore: spinnerStore,
        pendingHookMessages: pendingHookMessages,
      })),
      ($[97] = chrome),
      ($[98] = clock),
      ($[99] = credentials),
      ($[100] = dialogStore),
      ($[101] = isQueryDisabled),
      ($[102] = draft),
      ($[103] = hasRemoteTransport),
      ($[104] = mainThreadAgentDefinition),
      ($[105] = initialMessages),
      ($[106] = initialMessagesOrigin),
      ($[107] = messageQueue),
      ($[108] = pendingHookMessages),
      ($[109] = presentation),
      ($[110] = sandbox),
      ($[111] = scope),
      ($[112] = scrollPin),
      ($[113] = session),
      ($[114] = sessionEngine),
      ($[115] = sessionHooks),
      ($[116] = setAppState),
      ($[117] = spinnerStore),
      ($[118] = storageV5),
      ($[119] = store),
      ($[120] = taskRegistry),
      ($[121] = transcript),
      ($[122] = turnEventTail),
      ($[123] = turn),
      ($[124] = _d));
  else _d = $[124];
  let [sessionController] = y(_d),
    { conversationId: conversationId, headHooksPending: headHooksPending } =
      useStoreSelector(sessionController),
    isDialogActive = Aw();
  (useStartupNotice(), useExternalDialogBridge(scope.dialogTransport));
  let Wd, Rl;
  if ($[125] !== screen)
    ((Wd = () => ($H(screen === "transcript"), xJo)),
      (Rl = [screen]),
      ($[125] = screen),
      ($[126] = Wd),
      ($[127] = Rl));
  else ((Wd = $[126]), (Rl = $[127]));
  zt(Wd, Rl);
  let blockingDialogKind = KH() ?? null,
    Pi,
    fa;
  if ($[128] !== blockingDialogKind)
    ((Pi = () => (markBlockingDialogShown(blockingDialogKind), PJo)),
      (fa = [blockingDialogKind]),
      ($[128] = blockingDialogKind),
      ($[129] = Pi),
      ($[130] = fa));
  else ((Pi = $[129]), (fa = $[130]));
  zt(Pi, fa);
  let requestDialog = scope.requestDialog,
    td;
  if ($[131] !== requestDialog || $[132] !== turn.loading || $[133] !== turn.tasks)
    ((td = { requestDialog: requestDialog, turnActivity: turn.loading, tasks: turn.tasks }),
      ($[131] = requestDialog),
      ($[132] = turn.loading),
      ($[133] = turn.tasks),
      ($[134] = td));
  else td = $[134];
  let dialogSurface = td,
    Ad;
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
  )
    ((Ad = () =>
      new StartupNudges({
        session: session,
        presentation: presentation,
        store: store,
        setAppState: setAppState,
        requestDialog: requestDialog,
        addNotification: addNotification,
        storageV5: storageV5,
        getMessages: transcript.getSnapshot,
        getIsResponseStreaming: () => turn.guard.isRunning,
        turnActivity: turn.loading,
        mainLoopModel: mainLoopModel,
      })),
      ($[135] = addNotification),
      ($[136] = mainLoopModel),
      ($[137] = presentation),
      ($[138] = requestDialog),
      ($[139] = session),
      ($[140] = setAppState),
      ($[141] = storageV5),
      ($[142] = store),
      ($[143] = transcript.getSnapshot),
      ($[144] = turn.guard),
      ($[145] = turn.loading),
      ($[146] = Ad));
  else Ad = $[146];
  let [contextualTips] = y(Ad),
    md,
    vp;
  if ($[147] !== contextualTips)
    ((md = () => contextualTips.start()),
      (vp = [contextualTips]),
      ($[147] = contextualTips),
      ($[148] = md),
      ($[149] = vp));
  else ((md = $[148]), (vp = $[149]));
  P(md, vp);
  let recommendationGate = useSerialTaskRunner();
  (useLspRecommendationWatcher(requestDialog, recommendationGate),
    useClaudeCodeHintRecommendation(requestDialog, recommendationGate));
  let localJsx = scope.localJsx,
    hasLocalJsxOverlay = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    hasActiveLocalJsxUI = useDialogSelector(isLocalJsxHoldingQueue),
    panelHidesPrompt = useHasOpenDialog(),
    Hc;
  if ($[150] !== scope || $[151] !== session || $[152] !== sessionController || $[153] !== store)
    ((Hc = () =>
      new TerminalTitleController({
        session: session,
        store: store,
        sessionController: sessionController,
        scope: scope,
        disabled: env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE,
      })),
      ($[150] = scope),
      ($[151] = session),
      ($[152] = sessionController),
      ($[153] = store),
      ($[154] = Hc));
  else Hc = $[154];
  let [titles] = y(Hc),
    hasOpenDialog = useHasOpenDialog_2(),
    modalVisibility = LayoutOverflow(),
    readFileState = useDialogSelector(AJo),
    Eu,
    Rp;
  if ($[155] !== guard.isRunning)
    ((Eu = () => guard.isRunning),
      (Rp = () => guard.isRunning),
      ($[155] = guard.isRunning),
      ($[156] = Eu),
      ($[157] = Rp));
  else ((Eu = $[156]), (Rp = $[157]));
  let isResponseRunning = yt(guard.subscribe, Eu, Rp),
    cy = hasLocalJsxOverlay && !isResponseRunning,
    panelHoldsQueue = hasActiveLocalJsxUI && !isResponseRunning,
    dialogOverPanel = useHasBlockingDialog(),
    Du = bUn(),
    isUltraplanChoiceShowing = blockingDialogKind === IKe.kind,
    Fg;
  if ($[158] !== blockingDialogKind)
    ((Fg = oLo(blockingDialogKind)), ($[158] = blockingDialogKind), ($[159] = Fg));
  else Fg = $[159];
  let elicitationShowing = Fg,
    pinnedConsentShowing = Bce(blockingDialogKind),
    Mi;
  if ($[160] === MEMO_CACHE_SENTINEL) ((Mi = mainAgentId()), ($[160] = Mi));
  else Mi = $[160];
  let { messages: messages } = ug(Mi),
    Qa;
  if ($[161] !== localJsx || $[162] !== sessionController || $[163] !== turn)
    ((Qa = () => {
      openRewindSelector({ localJsx: localJsx, turn: turn, sessionController: sessionController });
    }),
      ($[161] = localJsx),
      ($[162] = sessionController),
      ($[163] = turn),
      ($[164] = Qa));
  else Qa = $[164];
  let openMessageSelector = Qa,
    yl;
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
  )
    ((yl = () =>
      new IdleReturnHint({
        turn: turn,
        getMessages: transcript.getSnapshot,
        clock: clock,
        now: Date.now,
        getLastInteractionTime: getLastInteractionTime,
        isDialogOnScreen: () => dialogStore.getState().open.length > 0,
        hasPendingLoopWakeup: hasLoopTask,
        hasArmedQuotaAutoResume: isQuotaAutoResumeArmed,
        backgroundAgents: {
          subscribe: store.subscribe,
          getSnapshot: () => hasAwaitableAgentTasks(store.getState().tasks),
        },
        getIdleNotifThresholdMs: MJo,
        sendIdleNotification: () => {
          gB({ message: "Claude is waiting for your input", notificationType: "idle_prompt" }, terminal, {
            storageV5: storageV5,
            credentials: credentials,
          });
        },
        addNotification: addNotification,
        removeNotification: removeNotification,
        hasSeededRemotePrompt: remoteSessionConfig?.initialPromptUuid !== void 0,
      })),
      ($[165] = addNotification),
      ($[166] = clock),
      ($[167] = credentials),
      ($[168] = dialogStore),
      ($[169] = remoteSessionConfig?.initialPromptUuid),
      ($[170] = removeNotification),
      ($[171] = storageV5),
      ($[172] = store),
      ($[173] = terminal),
      ($[174] = transcript.getSnapshot),
      ($[175] = turn),
      ($[176] = yl));
  else yl = $[176];
  let [idleNudge] = y(yl),
    Bh,
    Hh;
  if ($[177] !== hasLocalJsxOverlay || $[178] !== hasToolProgress || $[179] !== idleNudge)
    ((Bh = () => {
      idleNudge.setLocalOverlayShowing(hasToolProgress || hasLocalJsxOverlay);
    }),
      (Hh = [idleNudge, hasToolProgress, hasLocalJsxOverlay]),
      ($[177] = hasLocalJsxOverlay),
      ($[178] = hasToolProgress),
      ($[179] = idleNudge),
      ($[180] = Bh),
      ($[181] = Hh));
  else ((Bh = $[180]), (Hh = $[181]));
  P(Bh, Hh);
  let ES;
  if ($[182] !== isThinClient || $[183] !== messageQueue || $[184] !== turn.guard)
    ((ES = () =>
      G2() && !isThinClient ? new PollEventIdleDelivery({ queue: messageQueue, guard: turn.guard }) : null),
      ($[182] = isThinClient),
      ($[183] = messageQueue),
      ($[184] = turn.guard),
      ($[185] = ES));
  else ES = $[185];
  let [pollEventDelivery] = y(ES),
    dm;
  if ($[186] !== turnEventTail.enqueue)
    ((dm = { begin: randomUUID_16, enqueue: turnEventTail.enqueue }),
      ($[186] = turnEventTail.enqueue),
      ($[187] = dm));
  else dm = $[187];
  let turnEvents = dm,
    uy,
    Wh;
  if ($[188] !== turn)
    ((uy = () => {
      let updated = _Ut((prev) => {
        if (prev === "armed" || prev === "rearmed") turn.retractRateLimitAutoContinue();
      });
      let updated_2 = kEn((msg) => {
        if (msg.type === "accepted") turn.retractRateLimitAutoContinue();
      });
      let removedNotifications = Jho((cmd) => {
        if (cmd.type === "reset") turn.retractRateLimitAutoContinue();
      });
      let systemPrompt = nyo((Dd) => {
        if (Dd.type === "reset") turn.retractRateLimitAutoContinue();
      });
      return () => {
        (updated(), updated_2(), removedNotifications(), systemPrompt());
      };
    }),
      (Wh = [turn]),
      ($[188] = turn),
      ($[189] = uy),
      ($[190] = Wh));
  else ((uy = $[189]), (Wh = $[190]));
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
  )
    ((Mf = () =>
      new BackgroundGesture({
        store: store,
        setAppState: setAppState,
        transcript: transcript,
        turn: turn,
        messageQueue: messageQueue,
        session: session,
        taskRegistry: taskRegistry,
        storageV5: storageV5,
        credentials: credentials,
        fleetNudgeStore: fleetNudgeStore,
        clock: clock,
        now: Date.now,
        getInputValue: () => draft.value,
        dialogStore: dialogStore,
        requestDialog: requestDialog,
        titles: titles,
        scope: scope,
        isCloudSession: remoteSessionConfig !== void 0,
        leaveEndsProcess: remoteSessionConfig?.leaveEndsProcess === !0,
      })),
      ($[191] = clock),
      ($[192] = credentials),
      ($[193] = dialogStore),
      ($[194] = draft.value),
      ($[195] = fleetNudgeStore),
      ($[196] = messageQueue),
      ($[197] = remoteSessionConfig),
      ($[198] = requestDialog),
      ($[199] = scope),
      ($[200] = session),
      ($[201] = setAppState),
      ($[202] = storageV5),
      ($[203] = store),
      ($[204] = taskRegistry),
      ($[205] = titles),
      ($[206] = transcript),
      ($[207] = turn),
      ($[208] = Mf));
  else Mf = $[208];
  let [gesture] = y(Mf),
    ig;
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
  )
    ((ig = () =>
      new QueuedSendNowController({
        turn: turn,
        messageQueue: messageQueue,
        transcript: transcript,
        store: store,
        session: session,
        taskRegistry: taskRegistry,
        spinnerStore: spinnerStore,
        dialogStore: dialogStore,
        clock: clock,
      })),
      ($[209] = clock),
      ($[210] = dialogStore),
      ($[211] = messageQueue),
      ($[212] = session),
      ($[213] = spinnerStore),
      ($[214] = store),
      ($[215] = taskRegistry),
      ($[216] = transcript),
      ($[217] = turn),
      ($[218] = ig));
  else ig = $[218];
  let [lowLatency] = y(ig),
    Fx;
  if ($[219] !== sessionController || $[220] !== setAppState)
    ((Fx = (event) => {
      (setAppState(resetTransientUiState), sessionController.applyConversationReset(event));
    }),
      ($[219] = sessionController),
      ($[220] = setAppState),
      ($[221] = Fx));
  else Fx = $[221];
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
  )
    ((Fi = {
      remoteSessionConfig: remoteSessionConfig,
      directConnectConfig: directConnectConfig,
      sshSession: sshSession,
      adoptRateLimits: adoptRateLimits,
      transcript: transcript,
      turn: turn,
      idleNudge: idleNudge,
      scope: scope,
      spinner: spinnerStore.main,
      applyConversationReset: sessionController.applyConversationReset,
      applyLocalConversationReset: applyLocalConversationReset,
    }),
      ($[222] = applyLocalConversationReset),
      ($[223] = directConnectConfig),
      ($[224] = idleNudge),
      ($[225] = remoteSessionConfig),
      ($[226] = scope),
      ($[227] = sessionController.applyConversationReset),
      ($[228] = spinnerStore.main),
      ($[229] = sshSession),
      ($[230] = adoptRateLimits),
      ($[231] = transcript),
      ($[232] = turn),
      ($[233] = Fi));
  else Fi = $[233];
  let {
      transport: transport,
      activeRemote: activeRemote,
      cancellableExternalLoading: cancellableExternalLoading,
    } = useRemoteTransport(Fi),
    dd;
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
  )
    ((dd = () =>
      new ColdCacheWatcher({
        turn: turn,
        isTurnActive: () => turn.guard.isActive,
        clock: clock,
        now: Date.now,
        getLastInteractionTime: getLastInteractionTime,
        isEnabled: () =>
          isColdCacheWatchEnabled({
            disabled: isDisabled,
            disableQuery: isQueryDisabled,
            embedded: isEmbedded,
            isThinClient: isThinClient,
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
      })),
      ($[234] = clock),
      ($[235] = dialogStore),
      ($[236] = isQueryDisabled),
      ($[237] = isDisabled),
      ($[238] = isEmbedded),
      ($[239] = idleNudge),
      ($[240] = isThinClient),
      ($[241] = sessionController),
      ($[242] = store),
      ($[243] = transcript),
      ($[244] = turn),
      ($[245] = dd));
  else dd = $[245];
  let [idleCacheQuota] = y(dd),
    zp;
  if ($[246] !== messages || $[247] !== screen || $[248] !== turn)
    ((zp = { turn: turn, messages: messages, screen: screen }),
      ($[246] = messages),
      ($[247] = screen),
      ($[248] = turn),
      ($[249] = zp));
  else zp = $[249];
  let {
      hasDisplayedStreamingText: hasDisplayedStreamingText,
      tailBlank: tailBlank,
      focusFoldHoldsPreview: focusFoldHoldsPreview,
    } = TurnSpinnerRow(zp),
    axBell = useScreenReaderBell(),
    isBashesDialogOpen = useStoreSelector(chrome, selectHasBashesDialog),
    hasIdeOverlay = useDialogOfKind(IKe.kind),
    Jl,
    Cu;
  if ($[250] !== isBashesDialogOpen || $[251] !== chrome || $[252] !== hasIdeOverlay)
    ((Jl = () => {
      if (hasIdeOverlay && isBashesDialogOpen) chrome.closeBashesDialog();
    }),
      (Cu = [hasIdeOverlay, isBashesDialogOpen, chrome]),
      ($[250] = isBashesDialogOpen),
      ($[251] = chrome),
      ($[252] = hasIdeOverlay),
      ($[253] = Jl),
      ($[254] = Cu));
  else ((Jl = $[253]), (Cu = $[254]));
  P(Jl, Cu);
  let [theme] = useTheme(),
    mainIsBusy = userInputOnProcessing || turn.isMainLoopBusy || messageQueue.getMainThreadQueueLength() > 0,
    g_;
  if ($[255] !== conversationId || $[256] !== mainIsBusy)
    ((g_ = { mainConversationId: conversationId, mainIsBusy: mainIsBusy }),
      ($[255] = conversationId),
      ($[256] = mainIsBusy),
      ($[257] = g_));
  else g_ = $[257];
  let focused = useViewedAgentTranscript(g_),
    Hx;
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
  )
    ((Hx =
      !tEe(toolProgress) &&
      !readFileState &&
      !cy &&
      focused.isLoading &&
      !0 &&
      !chromeClients &&
      (!hasDisplayedStreamingText || tailBlank || isBriefOnly || focusFoldHoldsPreview)),
      ($[258] = focusFoldHoldsPreview),
      ($[259] = focused.isLoading),
      ($[260] = readFileState),
      ($[261] = hasDisplayedStreamingText),
      ($[262] = isBriefOnly),
      ($[263] = cy),
      ($[264] = chromeClients),
      ($[265] = tailBlank),
      ($[266] = toolProgress),
      ($[267] = Hx));
  else Hx = $[267];
  let showSpinner = Hx;
  (useBackgroundAskEmitter(), useBackgroundQuestionAnswer());
  let tw;
  if ($[268] !== scope || $[269] !== store || $[270] !== transport || $[271] !== turn)
    ((tw = { turn: turn, scope: scope, store: store, transport: transport }),
      ($[268] = scope),
      ($[269] = store),
      ($[270] = transport),
      ($[271] = turn),
      ($[272] = tw));
  else tw = $[272];
  useBridgeImmediateCommands(tw);
  let Ux, ow;
  if (
    $[273] !== gesture ||
    $[274] !== idleCacheQuota ||
    $[275] !== idleNudge ||
    $[276] !== lowLatency ||
    $[277] !== pollEventDelivery ||
    $[278] !== scrollPin ||
    $[279] !== titles
  )
    ((Ux = () => (
      titles.connect(),
      pollEventDelivery?.connect(),
      () => {
        (idleNudge.dispose(),
          idleCacheQuota.dispose(),
          pollEventDelivery?.dispose(),
          gesture.dispose(),
          lowLatency.dispose(),
          titles.dispose(),
          scrollPin.dispose());
      }
    )),
      (ow = [idleNudge, idleCacheQuota, pollEventDelivery, gesture, lowLatency, titles, scrollPin]),
      ($[273] = gesture),
      ($[274] = idleCacheQuota),
      ($[275] = idleNudge),
      ($[276] = lowLatency),
      ($[277] = pollEventDelivery),
      ($[278] = scrollPin),
      ($[279] = titles),
      ($[280] = Ux),
      ($[281] = ow));
  else ((Ux = $[280]), (ow = $[281]));
  P(Ux, ow);
  let [surveySlot] = y(EJo),
    S_;
  if ($[282] !== autoConnectIdeFlag || $[283] !== requestDialog || $[284] !== scope.addAutoConnectedIde)
    ((S_ = {
      autoConnectIdeFlag: autoConnectIdeFlag,
      onAutoConnectIde: scope.addAutoConnectedIde,
      requestDialog: requestDialog,
    }),
      ($[282] = autoConnectIdeFlag),
      ($[283] = requestDialog),
      ($[284] = scope.addAutoConnectedIde),
      ($[285] = S_));
  else S_ = $[285];
  let { installationStatus: installationStatus, installExtension: installExtension } = useIDEIntegration(S_),
    $x;
  if ($[286] !== setAppState)
    (($x = (reaction) => setAppState((prev) => ({ ...prev, fileHistory: reaction }))),
      ($[286] = setAppState),
      ($[287] = $x));
  else $x = $[287];
  useAwaySummaryOnce(initialFileHistorySnapshots, $x);
  let Vx, RE;
  if ($[288] !== sessionController)
    ((Vx = () => sessionController.start()),
      (RE = [sessionController]),
      ($[288] = sessionController),
      ($[289] = Vx),
      ($[290] = RE));
  else ((Vx = $[289]), (RE = $[290]));
  P(Vx, RE);
  let exitState = useStoreSelector(chrome, BV),
    hasTeamModal = useHasModalDialog(),
    isModalOpen = useHasModalUserDialog(),
    xE = useDialogSelector(JAe),
    hasSuppressedDialogs = isDialogActive && xE,
    qk,
    PE;
  if (
    $[291] !== chrome ||
    $[292] !== debug ||
    $[293] !== isEmbedded ||
    $[294] !== hasSuppressedDialogs ||
    $[295] !== shouldHideLoginNotice ||
    $[296] !== onDetachToCaller
  )
    ((qk = () => {
      chrome.setView({
        debug: debug,
        embedded: isEmbedded,
        onDetachToCaller: onDetachToCaller,
        hasSuppressedDialogs: hasSuppressedDialogs,
        hideLoginNotice: shouldHideLoginNotice,
      });
    }),
      (PE = [chrome, debug, isEmbedded, onDetachToCaller, hasSuppressedDialogs, shouldHideLoginNotice]),
      ($[291] = chrome),
      ($[292] = debug),
      ($[293] = isEmbedded),
      ($[294] = hasSuppressedDialogs),
      ($[295] = shouldHideLoginNotice),
      ($[296] = onDetachToCaller),
      ($[297] = qk),
      ($[298] = PE));
  else ((qk = $[297]), (PE = $[298]));
  zt(qk, PE);
  let b_, $k;
  if ($[299] !== pauseAnimation)
    ((b_ = () => (jH(pauseAnimation), DJo)),
      ($k = [pauseAnimation]),
      ($[299] = pauseAnimation),
      ($[300] = b_),
      ($[301] = $k));
  else ((b_ = $[300]), ($k = $[301]));
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
  )
    ((Gx = () =>
      new PromptSubmitController({
        store: store,
        presentation: presentation,
        setAppState: setAppState,
        setSessionState: setSessionState,
        session: session,
        storageV5: storageV5,
        dialogStore: dialogStore,
        spinnerStore: spinnerStore,
        taskRegistry: taskRegistry,
        transcript: transcript,
        turn: turn,
        draft: draft,
        messageQueue: messageQueue,
        chrome: chrome,
        scope: scope,
        idleNudge: idleNudge,
        transport: transport,
        scrollPin: scrollPin,
        lowLatency: lowLatency,
        addNotification: addNotification,
      })),
      ($[302] = addNotification),
      ($[303] = chrome),
      ($[304] = dialogStore),
      ($[305] = draft),
      ($[306] = idleNudge),
      ($[307] = lowLatency),
      ($[308] = messageQueue),
      ($[309] = presentation),
      ($[310] = scope),
      ($[311] = scrollPin),
      ($[312] = session),
      ($[313] = setAppState),
      ($[314] = setSessionState),
      ($[315] = spinnerStore),
      ($[316] = storageV5),
      ($[317] = store),
      ($[318] = taskRegistry),
      ($[319] = transcript),
      ($[320] = transport),
      ($[321] = turn),
      ($[322] = Gx));
  else Gx = $[322];
  let [submitController] = y(Gx),
    AE;
  if ($[323] !== cancelRef || $[324] !== submitController.cancelAndDrainPending)
    ((AE = () => {
      if (cancelRef) cancelRef.current = submitController.cancelAndDrainPending;
    }),
      ($[323] = cancelRef),
      ($[324] = submitController.cancelAndDrainPending),
      ($[325] = AE));
  else AE = $[325];
  let If;
  if ($[326] !== cancelRef || $[327] !== submitController)
    ((If = [cancelRef, submitController]), ($[326] = cancelRef), ($[327] = submitController), ($[328] = If));
  else If = $[328];
  P(AE, If);
  const isColdResumeQuotaShowing = blockingDialogKind === COLD_RESUME_QUOTA;
  let w_;
  if ($[329] !== dialogStore || $[330] !== draft || $[331] !== isColdResumeQuotaShowing)
    ((w_ = e(useIdleReturnTypeThrough, {
      onScreen: isColdResumeQuotaShowing,
      dialogStore: dialogStore,
      draft: draft,
    })),
      ($[329] = dialogStore),
      ($[330] = draft),
      ($[331] = isColdResumeQuotaShowing),
      ($[332] = w_));
  else w_ = $[332];
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
  )
    ((Vg = e(PromptArea, {
      turn: turn,
      transcript: transcript,
      draft: draft,
      chrome: chrome,
      submitController: submitController,
      stoppableWork: void 0,
      screen: screen,
      isExternalLoading: cancellableExternalLoading,
      sendsPromptsElsewhere: activeRemote.isRemoteMode,
    })),
      ($[333] = activeRemote.isRemoteMode),
      ($[334] = cancellableExternalLoading),
      ($[335] = chrome),
      ($[336] = draft),
      ($[337] = screen),
      ($[338] = submitController),
      ($[339] = transcript),
      ($[340] = turn),
      ($[341] = Vg));
  else Vg = $[341];
  let k_;
  if ($[342] !== w_ || $[343] !== Vg)
    ((k_ = r(Fragment, { children: [w_, Vg] })), ($[342] = w_), ($[343] = Vg), ($[344] = k_));
  else k_ = $[344];
  let promptEffects = k_,
    canUseTool = HIe(),
    [mcpReconnectContext] = y(OJo),
    C_,
    Jp;
  if ($[345] !== scope)
    ((C_ = () => (scope.connect(), () => scope.dispose())),
      (Jp = [scope]),
      ($[345] = scope),
      ($[346] = C_),
      ($[347] = Jp));
  else ((C_ = $[346]), (Jp = $[347]));
  zt(C_, Jp);
  let T_;
  if ($[348] !== gesture.backgroundQuery)
    ((T_ = { onBackgroundQuery: gesture.backgroundQuery }),
      ($[348] = gesture.backgroundQuery),
      ($[349] = T_));
  else T_ = $[349];
  let { handleBackgroundSession: handleBackgroundSession } = useSessionBackgrounding(T_),
    { markTurnStart: markTurnStart, markTurnDone: markTurnDone } = useSemanticPromptMarks(),
    lw;
  if ($[350] !== gesture || $[351] !== onDetachToCaller || $[352] !== transcript || $[353] !== turn)
    ((lw = { gesture: gesture, turn: turn, transcript: transcript, onDetachToCaller: onDetachToCaller }),
      ($[350] = gesture),
      ($[351] = onDetachToCaller),
      ($[352] = transcript),
      ($[353] = turn),
      ($[354] = lw));
  else lw = $[354];
  useLeftArrowGesture(lw);
  let WS;
  if ($[355] !== guard.isRunning || $[356] !== storageV5 || $[357] !== transcript)
    ((WS = () => {
      registerBeforeInteractiveShutdown(() =>
        relaunchForExit(transcript.getSnapshot(), { responseStreaming: guard.isRunning }, storageV5),
      );
    }),
      ($[355] = guard.isRunning),
      ($[356] = storageV5),
      ($[357] = transcript),
      ($[358] = WS));
  else WS = $[358];
  let ane;
  if ($[359] !== guard || $[360] !== storageV5 || $[361] !== transcript)
    ((ane = [transcript, guard, storageV5]),
      ($[359] = guard),
      ($[360] = storageV5),
      ($[361] = transcript),
      ($[362] = ane));
  else ane = $[362];
  (P(WS, ane), useExitCostReport(qCr()));
  let Xp;
  if ($[363] !== writePacer || $[364] !== sessionController || $[365] !== transcript || $[366] !== turn)
    ((Xp = () =>
      writePacer
        ? {
            transcript: transcript,
            isWritePaced: writePacer.isDeferring,
            isRestored: (ref) => sessionController.isAsRestored(ref),
            isHeadPending: () => sessionController.headHooksPending,
            isResponseInFlight: () => turn.getSnapshot().isLoading,
          }
        : void 0),
      ($[363] = writePacer),
      ($[364] = sessionController),
      ($[365] = transcript),
      ($[366] = turn),
      ($[367] = Xp));
  else Xp = $[367];
  let [_0] = y(Xp),
    ME;
  if ($[368] !== messages || $[369] !== sessionController)
    ((ME = sessionController.isAsRestored(messages)),
      ($[368] = messages),
      ($[369] = sessionController),
      ($[370] = ME));
  else ME = $[370];
  useLogMessages(messages, ME, isLoading, _0, headHooksPending);
  const x_ = thinkingConfigExplicit ? thinkingConfig : void 0;
  let IE;
  if (
    $[371] !== appendSystemPrompt ||
    $[372] !== systemPrompt ||
    $[373] !== permissionRelays ||
    $[374] !== scope ||
    $[375] !== systemPromptSnapshot ||
    $[376] !== x_ ||
    $[377] !== thinkingDisplayFlag ||
    $[378] !== transcript ||
    $[379] !== transport ||
    $[380] !== turn
  )
    ((IE = {
      turn: turn,
      transcript: transcript,
      scope: scope,
      permissionRelays: permissionRelays,
      transport: transport,
      spawnThinkingConfig: x_,
      thinkingDisplayFlag: thinkingDisplayFlag,
      customSystemPrompt: systemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      systemPromptSnapshot: systemPromptSnapshot,
    }),
      ($[371] = appendSystemPrompt),
      ($[372] = systemPrompt),
      ($[373] = permissionRelays),
      ($[374] = scope),
      ($[375] = systemPromptSnapshot),
      ($[376] = x_),
      ($[377] = thinkingDisplayFlag),
      ($[378] = transcript),
      ($[379] = transport),
      ($[380] = turn),
      ($[381] = IE));
  else IE = $[381];
  let { sendBridgeResult: sendBridgeResult, stampBridgeReply: stampBridgeReply } = ReplBridgeConnector(IE),
    { columns: columns, rows: rows } = useTerminalSize(),
    EE;
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
    $[436] !== Ls ||
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
  )
    ((EE = () => {
      (transport.bindHost({ mainLoopModel: mainLoopModel, addNotification: addNotification }),
        submitController.bindHost({
          mainLoopModel: mainLoopModel,
          canUseTool: canUseTool,
          onBeforeQuery: onBeforeQuery,
        }),
        sessionController.bindHost({
          mainLoopModel: mainLoopModel,
          canUseTool: canUseTool,
          addNotification: addNotification,
          removeNotification: removeNotification,
          onSubmit: submitController.submit,
        }),
        chrome.bindHost({ openMessageSelector: openMessageSelector }),
        scope.bindHost({
          mainLoopModel: mainLoopModel,
          canUseTool: canUseTool,
          getMessages: transcript.getSnapshot,
          conversation: transcript.conversation,
          buildToolUseContext: buildToolUseContext,
          addNotification: addNotification,
          removeNotification: removeNotification,
          terminal: terminal,
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
        }),
        gesture.bindHost({
          mainLoopModel: mainLoopModel,
          customSystemPrompt: systemPrompt,
          appendSystemPrompt: appendSystemPrompt,
          canUseTool: canUseTool,
          fallbackModel: fallbackModel,
        }),
        turn.bindHost({
          store: store,
          setAppState: setAppState,
          setSessionState: setSessionState,
          activePlugins: activePlugins,
          session: session,
          transcript: transcript,
          storageV5: storageV5,
          credentials: credentials,
          spinnerStore: spinnerStore,
          taskRegistry: taskRegistry,
          sessionHooks: sessionHooks,
          teammateColors: Ls,
          messageQueue: messageQueue,
          dialogStore: dialogStore,
          addNotification: addNotification,
          scope: scope,
          canUseTool: canUseTool,
          debug: debug,
          fallbackModel: fallbackModel,
          thinkingConfig: thinkingConfig,
          thinkingDisplayFlag: thinkingDisplayFlag,
          ideInstallationStatus: installationStatus,
          disabled: isDisabled,
          resolveCommandDialog: resolveCommandDialog,
          theme: theme,
          customSystemPrompt: systemPrompt,
          appendSystemPrompt: appendSystemPrompt,
          systemPromptSnapshot: systemPromptSnapshot,
          permissionRelays: permissionRelays,
          installIDEExtension: installExtension,
          resume: sessionController.resume,
          markConversationRemote: sessionController.markConversationRemote,
          applyConversationReset: applyLocalConversationReset,
          bumpConversationId: sessionController.bumpConversationId,
          openMessageSelector: chrome.openMessageSelector,
          onTurnComplete: onTurnComplete,
          onCaptureSnapshot: onCaptureSnapshot,
          markTurnStart: markTurnStart,
          markTurnDone: markTurnDone,
          columns: columns,
          streamingPreviewHold: spinnerPlacement(screen, isBriefOnly, briefTranscript, presentation),
          sendBridgeResult: sendBridgeResult,
          stampBridgeReply: stampBridgeReply,
          terminal: terminal,
          axBell: axBell,
          restoreMessageSync: sessionController.restoreMessageSync,
          draft: draft,
          isThinClient: isThinClient,
          titles: titles,
          setHaikuTitle: sessionController.setHaikuTitle,
          activeRemote: activeRemote,
          elicitationShowing: elicitationShowing,
          gesture: gesture,
          turnEvents: turnEvents,
          mainLoopModel: mainLoopModel,
          onBeforeQuery: onBeforeQuery,
          disableQuery: isQueryDisabled,
          deferSlashToEngine: hte,
          ideSelection: ideSelection,
          consumeIdeSelection: chrome.consumeIdeSelection,
          recordIdeSelectionConsumedBy: chrome.recordIdeSelectionConsumedBy,
          restoreIdeSelectionConsumedBy: chrome.restoreIdeSelectionConsumedBy,
          onSubmit: submitController.submit,
          awaitPendingHooks: sessionController.awaitPendingHooks,
          deferHookMessages: sessionController.deferHookMessages,
          releaseDeferredHookMessages: sessionController.releasePendingHookMessages,
          adoptedPrefillRef: sessionController.adoptedPrefillRef,
        }));
    }),
      ($[382] = activePlugins),
      ($[383] = activeRemote),
      ($[384] = addNotification),
      ($[385] = appendSystemPrompt),
      ($[386] = applyLocalConversationReset),
      ($[387] = axBell),
      ($[388] = briefTranscript),
      ($[389] = canUseTool),
      ($[390] = chrome),
      ($[391] = credentials),
      ($[392] = systemPrompt),
      ($[393] = debug),
      ($[394] = dialogStore),
      ($[395] = isQueryDisabled),
      ($[396] = isDisabled),
      ($[397] = draft),
      ($[398] = elicitationShowing),
      ($[399] = fallbackModel),
      ($[400] = isFullscreen),
      ($[401] = gesture),
      ($[402] = buildToolUseContext),
      ($[403] = installationStatus),
      ($[404] = ideSelection),
      ($[405] = installExtension),
      ($[406] = isBriefOnly),
      ($[407] = isThinClient),
      ($[408] = mainLoopModel),
      ($[409] = markTurnDone),
      ($[410] = markTurnStart),
      ($[411] = messageQueue),
      ($[412] = onBeforeQuery),
      ($[413] = onCaptureSnapshot),
      ($[414] = openMessageSelector),
      ($[415] = onTurnComplete),
      ($[416] = permissionRelays),
      ($[417] = presentation),
      ($[418] = removeNotification),
      ($[419] = scope),
      ($[420] = screen),
      ($[421] = scrollPin.reveal),
      ($[422] = scrollPin.rowHolding),
      ($[423] = sendBridgeResult),
      ($[424] = session),
      ($[425] = sessionController),
      ($[426] = sessionHooks),
      ($[427] = setAppState),
      ($[428] = setSessionState),
      ($[429] = spinnerStore),
      ($[430] = stampBridgeReply),
      ($[431] = storageV5),
      ($[432] = store),
      ($[433] = submitController),
      ($[434] = systemPromptSnapshot),
      ($[435] = taskRegistry),
      ($[436] = Ls),
      ($[437] = terminal),
      ($[438] = columns),
      ($[439] = theme),
      ($[440] = thinkingConfig),
      ($[441] = thinkingDisplayFlag),
      ($[442] = titles),
      ($[443] = transcript),
      ($[444] = transport),
      ($[445] = turnEvents),
      ($[446] = turn),
      ($[447] = EE));
  else EE = $[447];
  zt(EE);
  let A_;
  if (
    $[448] !== commands_2 ||
    $[449] !== gesture.handOverInFlight ||
    $[450] !== hasActiveLocalJsxUI ||
    $[451] !== turn
  )
    ((A_ = {
      turn: turn,
      hasActiveLocalJsxUI: hasActiveLocalJsxUI,
      commands: commands_2,
      handOverInFlight: gesture.handOverInFlight,
    }),
      ($[448] = commands_2),
      ($[449] = gesture.handOverInFlight),
      ($[450] = hasActiveLocalJsxUI),
      ($[451] = turn),
      ($[452] = A_));
  else A_ = $[452];
  useQueueProcessor(A_);
  let blocksBtwReopen = hasOpenDialog || hasLocalJsxOverlay,
    WK;
  if (
    $[453] !== blocksBtwReopen ||
    $[454] !== session.btwHistory ||
    $[455] !== store ||
    $[456] !== submitController ||
    $[457] !== turn
  )
    ((WK = () => {
      let btwHistory = session.btwHistory;
      return (
        btwHistory.setReopener(() => {
          if (store.getState().endedByModel) {
            return !0;
          }
          if (blocksBtwReopen) {
            return !1;
          }
          if (!turn.guard.isActive && turn.getSnapshot().isLoading) {
            return !1;
          }
          return (
            submitController
              .submit("/btw", NOOP_HELPERS, {
                fromKeybinding: !0,
                inputModeOverride: "prompt",
                leavesIdeSelection: !0,
              })
              .catch(logError),
            !0
          );
        }),
        () => btwHistory.setReopener(null)
      );
    }),
      ($[453] = blocksBtwReopen),
      ($[454] = session.btwHistory),
      ($[455] = store),
      ($[456] = submitController),
      ($[457] = turn),
      ($[458] = WK));
  else WK = $[458];
  let DE;
  if (
    $[459] !== blocksBtwReopen ||
    $[460] !== session ||
    $[461] !== store ||
    $[462] !== submitController ||
    $[463] !== turn
  )
    ((DE = [session, submitController, blocksBtwReopen, store, turn]),
      ($[459] = blocksBtwReopen),
      ($[460] = session),
      ($[461] = store),
      ($[462] = submitController),
      ($[463] = turn),
      ($[464] = DE));
  else DE = $[464];
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
  )
    ((OE = {
      mainLoopModel: mainLoopModel,
      mcpClients: mergedMcpClients,
      ideInstallationStatus: installationStatus,
      dynamicMcpConfig: dynamicMcpConfig_2,
      turn: turn,
      transcript: transcript,
      requestDialog: requestDialog,
      dialogStore: dialogStore,
      hasOpenDialog: hasOpenDialog,
      submitPrompt: submitController.submit,
      screen: screen,
      disabled: isDisabled,
      isRemoteSession: isRemoteSession,
      isTranscriptAtBottom: scrollPin.isAtBottom,
    }),
      ($[465] = dialogStore),
      ($[466] = isDisabled),
      ($[467] = dynamicMcpConfig_2),
      ($[468] = hasOpenDialog),
      ($[469] = installationStatus),
      ($[470] = isRemoteSession),
      ($[471] = mainLoopModel),
      ($[472] = mergedMcpClients),
      ($[473] = requestDialog),
      ($[474] = screen),
      ($[475] = scrollPin.isAtBottom),
      ($[476] = submitController.submit),
      ($[477] = transcript),
      ($[478] = turn),
      ($[479] = OE));
  else OE = $[479];
  let idleThresholdMin = useStartupNotifications(OE);
  useEffectSlots(STARTUP_NOTIFICATION_SPECS, idleThresholdMin);
  const swarmEnabled = renderWithForceUpdate(isAgentSwarmsEnabled) && !isRemoteSession,
    x0 = Du ?? (hasActiveLocalJsxUI ? LOCAL_JSX_DIALOG.kind : void 0);
  let Qk;
  if (
    $[480] !== isLoading ||
    $[481] !== requestDialog ||
    $[482] !== swarmEnabled ||
    $[483] !== x0 ||
    $[484] !== turn.submitIncomingPrompt
  )
    ((Qk = {
      enabled: swarmEnabled,
      isLoading: isLoading,
      visibleDialogKind: x0,
      onSubmitMessage: turn.submitIncomingPrompt,
      requestDialog: requestDialog,
    }),
      ($[480] = isLoading),
      ($[481] = requestDialog),
      ($[482] = swarmEnabled),
      ($[483] = x0),
      ($[484] = turn.submitIncomingPrompt),
      ($[485] = Qk));
  else Qk = $[485];
  (useInboxPollerHook(Qk), useMailboxBridge(turn));
  let CLAUDE_CODE_PROACTIVE = env.CLAUDE_CODE_PROACTIVE,
    jK;
  if (
    $[486] !== isLoading ||
    $[487] !== sessionController.runsNoModelTurn ||
    $[488] !== storageV5 ||
    $[489] !== transcript
  )
    ((jK = {
      isLoading: isLoading,
      assistantMode: CLAUDE_CODE_PROACTIVE,
      transcript: transcript,
      storageV5: storageV5,
      disabled: sessionController.runsNoModelTurn,
    }),
      ($[486] = isLoading),
      ($[487] = sessionController.runsNoModelTurn),
      ($[488] = storageV5),
      ($[489] = transcript),
      ($[490] = jK));
  else jK = $[490];
  useScheduledTasks(jK);
  let zx;
  if ($[491] !== isLoading || $[492] !== transcript)
    ((zx = { isLoading: isLoading, transcript: transcript }),
      ($[491] = isLoading),
      ($[492] = transcript),
      ($[493] = zx));
  else zx = $[493];
  let tokenWarningState = useUsageLimitNotices(zx),
    A0;
  if ($[494] === MEMO_CACHE_SENTINEL) ((A0 = []), ($[494] = A0));
  else A0 = $[494];
  P(noop_6, A0);
  let Yx;
  if ($[495] === MEMO_CACHE_SENTINEL) ((Yx = []), ($[495] = Yx));
  else Yx = $[495];
  P(noop_7, Yx);
  let suspendKey = useSuspendResume(),
    virtualScrollActive = isFullscreen && !CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL,
    GS = columns,
    I_;
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
  )
    ((I_ = {
      embedded: isEmbedded,
      screen: screen,
      turn: turn,
      transcript: transcript,
      titles: titles,
      localJsx: localJsx,
      dialogSurface: dialogSurface,
      attachRequests: gesture,
      draft: draft,
      scrollPin: scrollPin,
    }),
      ($[496] = dialogSurface),
      ($[497] = draft),
      ($[498] = isEmbedded),
      ($[499] = gesture),
      ($[500] = localJsx),
      ($[501] = screen),
      ($[502] = scrollPin),
      ($[503] = titles),
      ($[504] = transcript),
      ($[505] = turn),
      ($[506] = I_));
  else I_ = $[506];
  let screenFrameProps = I_,
    NE;
  if (
    $[507] !== isRemoteSession ||
    $[508] !== localJsx ||
    $[509] !== surveySlot ||
    $[510] !== transcript ||
    $[511] !== turn
  )
    ((NE = e(SurveyStatePublisher, {
      turn: turn,
      transcript: transcript,
      isRemoteSession: isRemoteSession,
      slot: surveySlot,
      localJsx: localJsx,
    })),
      ($[507] = isRemoteSession),
      ($[508] = localJsx),
      ($[509] = surveySlot),
      ($[510] = transcript),
      ($[511] = turn),
      ($[512] = NE));
  else NE = $[512];
  let qK = NE,
    Tc;
  if (
    $[513] !== chrome ||
    $[514] !== initialMessages ||
    $[515] !== isRemoteSession ||
    $[516] !== mergedMcpClients
  )
    ((Tc = e(ReplEffects, {
      chrome: chrome,
      mcpClients: mergedMcpClients,
      initialMessages: initialMessages,
      isRemoteSession: isRemoteSession,
    })),
      ($[513] = chrome),
      ($[514] = initialMessages),
      ($[515] = isRemoteSession),
      ($[516] = mergedMcpClients),
      ($[517] = Tc));
  else Tc = $[517];
  let $K = Tc,
    um;
  if (
    $[518] !== $K ||
    $[519] !== dynamicMcpConfig_2 ||
    $[520] !== permissionRelays ||
    $[521] !== requestDialog ||
    $[522] !== mcpReconnectContext ||
    $[523] !== isStrictMcpConfig ||
    $[524] !== qK
  )
    ((um = function cw(Rc) {
      return r(Fragment, {
        children: [
          qK,
          null,
          e(MCPConnectionManager, {
            dynamicMcpConfig: dynamicMcpConfig_2,
            isStrictMcpConfig: isStrictMcpConfig,
            permissionRelays: permissionRelays,
            requestDialog: requestDialog,
            children: e(ZXe.Provider, { value: mcpReconnectContext, children: Rc }),
          }),
          $K,
          null,
        ],
      });
    }),
      ($[518] = $K),
      ($[519] = dynamicMcpConfig_2),
      ($[520] = permissionRelays),
      ($[521] = requestDialog),
      ($[522] = mcpReconnectContext),
      ($[523] = isStrictMcpConfig),
      ($[524] = qK),
      ($[525] = um));
  else um = $[525];
  let wrapWithProviders = um;
  (getViewedTeammateTask_2(), useAgentsHintExpiry());
  let diffSidebarEnabled = useDiffSidebarState(),
    usePanesAtOnce = PaneDockNamespace.usePanesAtOnce(PaneDockNamespace.hasOpenPanes),
    useDockColumns = PaneDockNamespace.useDockColumns(GS);
  (PaneDockNamespace.usePaneToastHold(), PaneDockNamespace.useBarToasts());
  let W0;
  if (
    $[526] !== diffSidebarEnabled ||
    $[527] !== hasGitRepo ||
    $[528] !== focused.isMain ||
    $[529] !== isFullscreen ||
    $[530] !== isThinClient ||
    $[531] !== replTab ||
    $[532] !== GS
  )
    ((W0 =
      replTab === "diff" &&
      shouldShowDiffSidebar({
        enabled: diffSidebarEnabled,
        fullscreen: isFullscreen,
        columns: GS,
        isThinClient: isThinClient,
        isMainFocused: focused.isMain,
        hasGitRepo: hasGitRepo,
      })
        ? NU(GS)
        : 0),
      ($[526] = diffSidebarEnabled),
      ($[527] = hasGitRepo),
      ($[528] = focused.isMain),
      ($[529] = isFullscreen),
      ($[530] = isThinClient),
      ($[531] = replTab),
      ($[532] = GS),
      ($[533] = W0));
  else W0 = $[533];
  let sidebarWidth = W0,
    j0 = isFullscreen && sidebarWidth === 0 ? useDockColumns : 0,
    dockWidth = mDe(usePanesAtOnce, j0, GS),
    lne = screen === "transcript" ? 0 : sidebarWidth + dockWidth;
  useTerminalViewportNamespace.useTerminalViewport(columns, rows, lne);
  let Xx;
  if ($[534] !== diffSidebarEnabled)
    ((Xx = (KK) => (diffSidebarEnabled ? KK.fileHistory.trackedFiles.size : 0)),
      ($[534] = diffSidebarEnabled),
      ($[535] = Xx));
  else Xx = $[535];
  let userMessage = useAppState(Xx),
    autoOpenBaseline = useDiffAutoOpenBaseline(diffSidebarEnabled, userMessage),
    dne;
  if ($[536] !== hasToolProgress || $[537] !== renderingTools || $[538] !== toolProgress)
    ((dne = hasToolProgress
      ? e(InlineProgressList, { progress: toolProgress, tools: renderingTools })
      : null),
      ($[536] = hasToolProgress),
      ($[537] = renderingTools),
      ($[538] = toolProgress),
      ($[539] = dne));
  else dne = $[539];
  let Jk = dne,
    scrollViewport = isEmbedded || (virtualScrollActive && !dumpMode) ? scrollPin.viewport : void 0,
    UE = !isFullscreen && !isEmbedded && !isDecstbmRendererEnabled(),
    isTranscriptScreen = screen === "transcript",
    V0;
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
  )
    ((V0 =
      isTranscriptScreen &&
      e(TranscriptView, {
        focused: focused,
        tools: renderingTools,
        commands: commands_2,
        turn: turn,
        hideWelcomeChrome: hideWelcomeChrome ?? isEmbedded,
        toolProgress: Jk,
        scrollViewport: scrollViewport,
        reveal: scrollPin.revealRef,
        onUserScroll: scrollPin.onUserScrollWithoutDivider,
        virtualScrollActive: virtualScrollActive,
        embedded: isEmbedded,
        scrollKeysActive: !isUltraplanChoiceShowing,
        showSandboxViolations: !isRemoteSession,
        dumpMode: dumpMode,
        onDumpToScrollback: () => setDumpMode(!0),
        onExit: exitTranscript,
      })),
      ($[540] = commands_2),
      ($[541] = dumpMode),
      ($[542] = isEmbedded),
      ($[543] = focused),
      ($[544] = hideWelcomeChrome),
      ($[545] = isRemoteSession),
      ($[546] = renderingTools),
      ($[547] = scrollPin.onUserScrollWithoutDivider),
      ($[548] = scrollPin.revealRef),
      ($[549] = Jk),
      ($[550] = scrollViewport),
      ($[551] = isTranscriptScreen),
      ($[552] = turn),
      ($[553] = isUltraplanChoiceShowing),
      ($[554] = virtualScrollActive),
      ($[555] = V0));
  else V0 = $[555];
  let transcriptView = V0;
  if (isTranscriptScreen && !UE) {
    const QS = scrollViewport !== void 0;
    let JS;
    if ($[556] !== promptEffects || $[557] !== transcriptView)
      ((JS = r(KeybindingRoot, { children: [promptEffects, transcriptView] })),
        ($[556] = promptEffects),
        ($[557] = transcriptView),
        ($[558] = JS));
    else JS = $[558];
    let Sy;
    if ($[559] !== isEmbedded || $[560] !== JS)
      ((Sy = e(UnattendedNoticeProvider, { drawn: !1, hideSessionTitle: isEmbedded, children: JS })),
        ($[559] = isEmbedded),
        ($[560] = JS),
        ($[561] = Sy));
    else Sy = $[561];
    let XS;
    if ($[562] !== tokenWarningState || $[563] !== Sy)
      ((XS = e($A.Provider, { value: tokenWarningState, children: Sy })),
        ($[562] = tokenWarningState),
        ($[563] = Sy),
        ($[564] = XS));
    else XS = $[564];
    let mw;
    if ($[565] !== screenFrameProps || $[566] !== QS || $[567] !== XS)
      ((mw = e(ReplScreenFrame, { ...screenFrameProps, fullscreen: QS, children: XS })),
        ($[565] = screenFrameProps),
        ($[566] = QS),
        ($[567] = XS),
        ($[568] = mw));
    else mw = $[568];
    let jc;
    if ($[569] !== mw || $[570] !== wrapWithProviders)
      ((jc = wrapWithProviders(mw)), ($[569] = mw), ($[570] = wrapWithProviders), ($[571] = jc));
    else jc = $[571];
    return jc;
  }
  let modalSlotActive = isModalOpen && modalVisibility === "visible",
    layoutSlots = resolveModalPlacement({
      onScreenBlockingKind: blockingDialogKind,
      modalSlotActive: modalSlotActive,
      panelHidesPrompt: panelHidesPrompt,
      pinnedConsentShowing: pinnedConsentShowing,
      dialogOverPanel: hasLocalJsxOverlay && dialogOverPanel,
      fullscreen: isFullscreen,
    }),
    QS;
  if (
    $[572] !== modalVisibility ||
    $[573] !== isEmbedded ||
    $[574] !== hasTeamModal ||
    $[575] !== isModalOpen ||
    $[576] !== layoutSlots.inPane
  )
    ((QS = hasTeamModal
      ? {
          content: e(DialogHost, { variant: "modal" }),
          visible: isModalOpen && modalVisibility === "visible",
          footer: layoutSlots.inPane
            ? e(UnattendedAutoBlockNotice, { hideSessionTitle: isEmbedded })
            : void 0,
        }
      : void 0),
      ($[572] = modalVisibility),
      ($[573] = isEmbedded),
      ($[574] = hasTeamModal),
      ($[575] = isModalOpen),
      ($[576] = layoutSlots.inPane),
      ($[577] = QS));
  else QS = $[577];
  let O_ = QS,
    promptVisible = !dialogOverPanel && !exitState && !isDisabled,
    JS;
  if ($[578] !== focused.messages || $[579] !== screen || $[580] !== isTranscriptScreen)
    ((JS =
      !isTranscriptScreen &&
      e(GlobalKeybindingHandlers, {
        screen: screen,
        onToggleTranscript: () => setScreen(toggleScreen),
        messageCount: focused.messages.length,
      })),
      ($[578] = focused.messages),
      ($[579] = screen),
      ($[580] = isTranscriptScreen),
      ($[581] = JS));
  else JS = $[581];
  let Sy;
  if (
    $[582] !== focused.isMain ||
    $[583] !== modalSlotActive ||
    $[584] !== scrollPin ||
    $[585] !== isTranscriptScreen ||
    $[586] !== isUltraplanChoiceShowing
  )
    ((Sy =
      !isTranscriptScreen &&
      e(MessageScrollHandler, {
        scrollPin: scrollPin,
        modalSlotActive: modalSlotActive,
        ultraplanChoiceShowing: isUltraplanChoiceShowing,
        isMain: focused.isMain,
      })),
      ($[582] = focused.isMain),
      ($[583] = modalSlotActive),
      ($[584] = scrollPin),
      ($[585] = isTranscriptScreen),
      ($[586] = isUltraplanChoiceShowing),
      ($[587] = Sy));
  else Sy = $[587];
  const XS = isTranscriptScreen ? void 0 : O_,
    mw = !focused.isMain;
  let jc;
  if (
    $[588] !== chrome.setIdeSelection ||
    $[589] !== autoOpenBaseline ||
    $[590] !== diffSidebarEnabled ||
    $[591] !== sidebarWidth ||
    $[592] !== isThinClient ||
    $[593] !== modalSlotActive
  )
    ((jc = diffSidebarEnabled
      ? e(SentryErrorBoundary, {
          onError: logDiffSidebarRenderError,
          children: e(DiffSidebar, {
            width: sidebarWidth,
            isThinClient: isThinClient,
            onAskAboutSelection: modalSlotActive ? void 0 : chrome.setIdeSelection,
            autoOpenBaseline: autoOpenBaseline,
          }),
        })
      : null),
      ($[588] = chrome.setIdeSelection),
      ($[589] = autoOpenBaseline),
      ($[590] = diffSidebarEnabled),
      ($[591] = sidebarWidth),
      ($[592] = isThinClient),
      ($[593] = modalSlotActive),
      ($[594] = jc));
  else jc = $[594];
  const gw = j0 > 0;
  let N_;
  if ($[595] !== draft || $[596] !== dockWidth || $[597] !== gw || $[598] !== turn)
    ((N_ = e(PromptDock, { turn: turn, draft: draft, isOffered: gw, width: dockWidth })),
      ($[595] = draft),
      ($[596] = dockWidth),
      ($[597] = gw),
      ($[598] = turn),
      ($[599] = N_));
  else N_ = $[599];
  let eP, tP;
  if ($[600] === MEMO_CACHE_SENTINEL)
    ((eP = e(PaneDockNamespace.DockTail, {})),
      (tP = e(ToastStackViewNamespace.ToastStackView, {})),
      ($[600] = eP),
      ($[601] = tP));
  else ((eP = $[600]), (tP = $[601]));
  const QK = panelHidesPrompt ? null : Jk,
    hw = cy || !!chromeClients,
    zK = isDisabled || modalSlotActive,
    WE = hideWelcomeChrome ?? isEmbedded;
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
    $[612] !== QK ||
    $[613] !== hw ||
    $[614] !== zK ||
    $[615] !== WE ||
    $[616] !== isTranscriptScreen ||
    $[617] !== transport.rowsDrawn ||
    $[618] !== transport.waitingLines ||
    $[619] !== turn
  )
    ((scrollable = e(MessageArea, {
      scrollPin: scrollPin,
      turn: turn,
      focused: focused,
      tools: renderingTools,
      commands: commands_2,
      toolProgress: QK,
      showSpinner: showSpinner,
      stateRowYields: hw,
      panelHoldsQueue: panelHoldsQueue,
      promptMounted: promptVisible,
      remoteSendsNow: submitController.remoteSendsNow,
      waitingLines: transport.waitingLines,
      onRowsDrawn: transport.rowsDrawn,
      isRemoteSession: isRemoteSession,
      pauseAnimation: pauseAnimation,
      hidePlaceholder: zK,
      hideWelcomeChrome: WE,
      historyHidden: isTranscriptScreen,
    })),
      ($[602] = commands_2),
      ($[603] = focused),
      ($[604] = isRemoteSession),
      ($[605] = panelHoldsQueue),
      ($[606] = pauseAnimation),
      ($[607] = promptVisible),
      ($[608] = renderingTools),
      ($[609] = scrollPin),
      ($[610] = showSpinner),
      ($[611] = submitController.remoteSendsNow),
      ($[612] = QK),
      ($[613] = hw),
      ($[614] = zK),
      ($[615] = WE),
      ($[616] = isTranscriptScreen),
      ($[617] = transport.rowsDrawn),
      ($[618] = transport.waitingLines),
      ($[619] = turn),
      ($[620] = scrollable));
  else scrollable = $[620];
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
    $[629] !== useDockColumns ||
    $[630] !== pinnedConsentShowing ||
    $[631] !== promptVisible ||
    $[632] !== layoutSlots.abovePrompt ||
    $[633] !== showSpinner ||
    $[634] !== submitController ||
    $[635] !== surveySlot ||
    $[636] !== isTranscriptScreen ||
    $[637] !== transcript ||
    $[638] !== turn
  )
    ((abovePrompt =
      !isTranscriptScreen &&
      r(Box, {
        flexDirection: "column",
        width: "100%",
        children: [
          null,
          layoutSlots.abovePrompt && e(UnattendedAutoBlockNotice, { hideSessionTitle: isEmbedded }),
          hasActiveLocalJsxUI && e(NullComponent, {}),
          panelHoldsQueue && !isFullscreen && e(PendingTaskUpdatesNote, {}),
          e(DialogHost, { variant: "bottom" }),
          e(ExpandedTaskList, {
            hidden:
              showSpinner ||
              hasLocalJsxOverlay ||
              pinnedConsentShowing ||
              blockingDialogKind === AUTOCOMPACT_OFFER,
          }),
          !pinnedConsentShowing && e(WorkerPendingPermissions, {}),
          e(runExitInterstitial, { chrome: chrome }),
          e(InlinePanesAndBands, {
            turn: turn,
            transcript: transcript,
            draft: draft,
            submitController: submitController,
            surveySlot: surveySlot,
            visible: promptVisible,
            panesDocked: isFullscreen && useDockColumns > 0,
          }),
        ],
      })),
      ($[621] = chrome),
      ($[622] = draft),
      ($[623] = isEmbedded),
      ($[624] = isFullscreen),
      ($[625] = hasLocalJsxOverlay),
      ($[626] = hasActiveLocalJsxUI),
      ($[627] = blockingDialogKind),
      ($[628] = panelHoldsQueue),
      ($[629] = useDockColumns),
      ($[630] = pinnedConsentShowing),
      ($[631] = promptVisible),
      ($[632] = layoutSlots.abovePrompt),
      ($[633] = showSpinner),
      ($[634] = submitController),
      ($[635] = surveySlot),
      ($[636] = isTranscriptScreen),
      ($[637] = transcript),
      ($[638] = turn),
      ($[639] = abovePrompt));
  else abovePrompt = $[639];
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
  )
    ((bottom =
      !isTranscriptScreen &&
      e(Box, {
        flexDirection: "row",
        width: "100%",
        alignItems: "flex-end",
        children: e(Box, {
          flexDirection: "column",
          flexGrow: 1,
          children: e(PromptAreaWithBackgroundHint, {
            turn: turn,
            transcript: transcript,
            scope: scope,
            draft: draft,
            chrome: chrome,
            gesture: gesture,
            submitController: submitController,
            visible: promptVisible,
            onBackgroundSession: handleBackgroundSession,
          }),
        }),
      })),
      ($[640] = chrome),
      ($[641] = draft),
      ($[642] = gesture),
      ($[643] = handleBackgroundSession),
      ($[644] = promptVisible),
      ($[645] = scope),
      ($[646] = submitController),
      ($[647] = isTranscriptScreen),
      ($[648] = transcript),
      ($[649] = turn),
      ($[650] = bottom));
  else bottom = $[650];
  let layout;
  if (
    $[651] !== sidebarWidth ||
    $[652] !== focused.isTeammate ||
    $[653] !== dockWidth ||
    $[654] !== scrollPin ||
    $[655] !== XS ||
    $[656] !== mw ||
    $[657] !== jc ||
    $[658] !== N_ ||
    $[659] !== scrollable ||
    $[660] !== abovePrompt ||
    $[661] !== bottom
  )
    ((layout = e(FullscreenLayout, {
      scrollViewport: scrollPin.viewport,
      modal: XS,
      modalScrollViewport: scrollPin.modalViewport,
      unseen: scrollPin,
      hidePill: mw,
      hideSticky: focused.isTeammate,
      header: void 0,
      top: null,
      sidebar: jc,
      sidebarWidth: sidebarWidth,
      dock: N_,
      dockWidth: dockWidth,
      dockTail: eP,
      transcriptOverlay: tP,
      scrollable: scrollable,
      abovePrompt: abovePrompt,
      bottom: bottom,
    })),
      ($[651] = sidebarWidth),
      ($[652] = focused.isTeammate),
      ($[653] = dockWidth),
      ($[654] = scrollPin),
      ($[655] = XS),
      ($[656] = mw),
      ($[657] = jc),
      ($[658] = N_),
      ($[659] = scrollable),
      ($[660] = abovePrompt),
      ($[661] = bottom),
      ($[662] = layout));
  else layout = $[662];
  let $E;
  if ($[663] !== suspendKey || $[664] !== layout)
    (($E = e(Kc, { children: layout }, suspendKey)), ($[663] = suspendKey), ($[664] = layout), ($[665] = $E));
  else $E = $[665];
  let K0;
  if (
    $[666] !== promptEffects ||
    $[667] !== JS ||
    $[668] !== Sy ||
    $[669] !== $E ||
    $[670] !== transcriptView
  )
    ((K0 = r(KeybindingRoot, { children: [JS, promptEffects, Sy, $E, transcriptView] })),
      ($[666] = promptEffects),
      ($[667] = JS),
      ($[668] = Sy),
      ($[669] = $E),
      ($[670] = transcriptView),
      ($[671] = K0));
  else K0 = $[671];
  let Q0 = K0,
    lP;
  if ($[672] !== isEmbedded || $[673] !== Q0 || $[674] !== layoutSlots.drawn)
    ((lP = e(UnattendedNoticeProvider, {
      drawn: layoutSlots.drawn,
      hideSessionTitle: isEmbedded,
      children: Q0,
    })),
      ($[672] = isEmbedded),
      ($[673] = Q0),
      ($[674] = layoutSlots.drawn),
      ($[675] = lP));
  else lP = $[675];
  let VE;
  if ($[676] !== tokenWarningState || $[677] !== lP)
    ((VE = e($A.Provider, { value: tokenWarningState, children: lP })),
      ($[676] = tokenWarningState),
      ($[677] = lP),
      ($[678] = VE));
  else VE = $[678];
  let Xk;
  if ($[679] !== screenFrameProps || $[680] !== isFullscreen || $[681] !== VE)
    ((Xk = e(ReplScreenFrame, { ...screenFrameProps, fullscreen: isFullscreen, children: VE })),
      ($[679] = screenFrameProps),
      ($[680] = isFullscreen),
      ($[681] = VE),
      ($[682] = Xk));
  else Xk = $[682];
  let GE;
  if ($[683] !== Xk || $[684] !== wrapWithProviders)
    ((GE = wrapWithProviders(Xk)), ($[683] = Xk), ($[684] = wrapWithProviders), ($[685] = GE));
  else GE = $[685];
  return GE;
}

export {
  FOt,
  BOt,
  TranscriptSearchBar,
  TranscriptHelpFooter,
  TranscriptModeFooter,
  REPL,
  AnimatedTerminalTitle,
};
