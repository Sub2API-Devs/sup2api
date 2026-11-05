/**
 * components/PromptInput/PromptComposer.tsx
 *
 * 2.1.316 新增。重构后的输入框主体（编辑、补全、模式、提交）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (84)
 * attribution: placement 77, layout 5, affinity 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { IdeStatusIndicator } from "../IdeStatusIndicator.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { showSwarmFooterGate } from "./footerGates.js";
import {
  getEditorWaitBorderStyle,
  clearFooterSelectionState,
  useComposerEscape,
  dismissPromptOverlay,
  getPrintableKey,
} from "./usePromptInputKeys.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Divider } from "../design-system/Divider.js";
import {
  init_react_production,
  useSyncExternalStore,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  memo,
} from "../../../vendor/react/cjs/react.production.js";
import {
  useMergedClients,
  NOTIFICATION_TIMEOUT_MS,
  NotificationOverlay,
  Notifications,
} from "./Notifications.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../../state/AppState.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import {
  isRemoteSessionAvailable,
  getRemoteCaps,
  isRemoteControlChannelAvailable,
} from "../../remote/remoteMode.js";
import {
  runningRemoteWorkflows,
  runningWorkflowTasks,
  selectWorkflowFooterTask,
} from "../Spinner/workflowStatus.js";
import {
  getFastModeUnavailableMessage,
  isFastModeEnabled,
  isFastModeAvailable,
  isFastModeOnForRequestModel,
  onFastRejectedFallbackModelsChanged,
  clearFastModeCooldown,
  isFastModeActive,
  reportFastModeToggle,
  supportsFastMode,
} from "../../utils/fastMode.js";
import { createUserMessage } from "../../utils/messages.js";
import {
  EFFORT_LEVEL_KEY,
  isEffortIndicatorShown,
  useUltracodeShimmer,
  treeify,
  effortStatusText,
} from "../EffortIndicator.js";
import { logForDebugging } from "../../utils/debug.js";
import { regExp as regExp_6, findCommand } from "../../commands.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import {
  selectIsEmpty,
  selectIsMultiline,
  selectInputMode,
  selectHasStash,
  createFrozenEmpty,
} from "../../screens/repl/PromptDraft.js";
import {
  useHasSecretEligibleDialog,
  hasDraftHiddenCueDialog,
  requestDialogWrapper,
} from "../dialogs/dialogKinds.js";
import { useDialogStore, useDialogOfKind } from "../../state/dialogQueue.js";
import { useProactivityStepState, isViewingTeammate } from "../ProactivityMenu.js";
import { onAttacherCapsChange, clearRefusalFallbackModelLatch } from "../../bootstrap/state.js";
import { alwaysFalseB } from "../../screens/repl/backgroundConfirm.js";
import {
  useLeftArrowGesture,
  touchPlanModeUse,
  useSavedModelSuccessorKey,
  useFastModeCooldownActive,
} from "./promptInputState.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import { useThirdOverlayKeys } from "../../context/overlayContext.js";
import { useVimMode } from "../../screens/repl/storeHooks.js";
import { useSession } from "../../context/session.js";
import { useEditorMode } from "../../utils/subagentStatusLine.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { createEmptyAutocompleteStore } from "../../hooks/useTypeahead.js";
import {
  setLaunchWarningFor,
  promptInputStoreFor,
  noteLinkSuppliedEdit,
} from "../../state/promptInputStore.js";
import { useTaskFramework } from "../../context/voice.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useCommandQueueOrDefault, useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { useHasRemoteWork, countOf } from "../tasks/remoteTaskStatus.js";
import { shouldHideTasksFooter } from "../tasks/taskStatusUtils.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  FOOTER_WIDE_COLUMNS,
  shouldShowFooterStatus,
  setCwdState,
  PromptInputFooterMemo,
} from "./PromptInputFooter.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";
import {
  useFrameFooterState,
  frameOpenFailed,
  visibleArtifactFrames,
  liveFramesForSlug,
  openArtifactRow,
} from "../artifacts/artifactFrames.js";
import { useCommandQueue } from "../Messages.js";
import { selectMainLoopModelForSession_2, resolveRequestedModel } from "../../commands/model/model.js";
import { selectIsFastModeOn, ModelPicker } from "../ModelPicker.js";
import {
  getViewedTeammateTask_2 as getViewedTeammateTask_2_2,
  getActiveAgentName,
  getActiveAgentForInput,
} from "../../state/selectors.js";
import { AGENT_COLOR_NAMES } from "../../tools/AgentTool/agentColorManager.js";
import { primePasteIdsFromMessages, renumberPastedContents } from "../../history.js";
import {
  useVisibleAgentTaskCount,
  getVisibleBackgroundTasks,
  isAgentRowVisible,
  remapTaskPanelIndex,
  selectFooterSelection,
  useShadowedFooterActionHandler,
  useFooterAwareMessageActions,
  expandIdleTeammates,
  hasFoldedIdleTeammates,
  isViewingThisAgent,
  canStopRemoteWorkflow,
  stopRemoteWorkflow,
} from "../CoordinatorAgentStatus.js";
import { subscribeCoordinatorPanel } from "../../utils/transcriptDiagnostics.js";
import { countVisibleTasks } from "../../utils/claudeInChrome/toolRendering.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { shouldOfferAutoModeEnvOnboarding, AutoModeEnvOnboardingDialog } from "../AutoModeEnvOnboarding.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import {
  shouldShowStatusNotices,
  PromptHintRow,
  useMaxEffortNotice,
  StatusNoticeList,
} from "../StatusNotices.js";
import { usePromptSuggestion, useFastModeOnForModel } from "../../hooks/usePromptSuggestion.js";
import { useNotifications } from "../../context/notifications.js";
import { usePromptInputPlaceholder } from "./usePromptInputPlaceholder.js";
import { logEvent } from "../../services/analytics/index.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { isQueuedCommandEditable, isQueuedCommandPullableInto } from "../../utils/messageQueueManager.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import {
  AGENT_VIEW_COMMAND_NOTICE,
  AgentViewCommandNotice,
  isSameAgentViewCommand,
} from "../tasks/AgentViewCommandNotice.js";
import { getSecondRootError } from "../../ink/terminal.js";
import { isKbCohesionFixesOn } from "../../utils/kbCohesionFixes.js";
import {
  expandPastedTextRefs,
  stripInvisiblePromptChars,
  skipInvisibleCharsNotice,
} from "../../utils/promptTextSanitize.js";
import { formatInvisibleCharsRemoved } from "../../utils/invisibleChars.js";
import {
  suggestionTextOrNull,
  isShownOrAcceptedSuggestion,
  logSuggestionSuppressed,
} from "../../services/PromptSuggestion/promptSuggestion.js";
import {
  getAutoModeConfigOrDefault,
  transitionPermissionMode,
} from "../../utils/permissions/permissionSetup.js";
import { stripModePrefix, getModeFromInput as getModeFromInput_2 } from "./inputModes.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  parseDirectMemberMessage,
  sendDirectMemberMessageAndNotify,
  boldDirectMemberMessage,
} from "../../utils/directMemberMessage.js";
import { writeToMailbox } from "../../utils/teammateMailbox.js";
import { autoResumePromptIfStale } from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  recordSuggestionOutcome,
  logPromptSuggestionBackOff,
  BACK_OFF_NOTICE_PARTS,
} from "../../services/PromptSuggestion/backOff.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { EXIT_COMMAND_WORDS } from "../../utils/handlePromptSubmit.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { createFrozenMarker } from "../../utils/frozenMarkers.js";
import { useHistorySearch, historyPromptOrigin } from "../../hooks/useHistorySearch.js";
import { PASTE_THRESHOLD } from "../../utils/imagePaste.js";
import { getInsertModeEscapeRemaps } from "../../vim/operators.js";
import { queryTerminalBackground } from "../../utils/terminalProbe.js";
import { NOOP_HELPERS } from "../../hooks/useCommandKeybindings.js";
import { getThinkingCannotBeDisabledMessage } from "../../utils/thinking.js";
import { stepStatusLineWidth } from "../../state/statusLineWidth.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getNextPermissionMode_2 } from "../../types/permissions.js";
import { exitTeammatePlanMode } from "../../utils/swarm/planApprovalWake.js";
import { cyclePermissionMode } from "../../utils/permissions/getNextPermissionMode.js";
import { announce } from "../../utils/accessibility/screenReader.js";
import { permissionModeIndicator } from "../../utils/permissions/PermissionMode.js";
import { tabCycleState } from "../../hooks/useWorkspaceDiff.js";
import { setToolPermissionContextAndNotify } from "../agents/AgentsMenu.js";
import { syncTeammateMode } from "../../utils/swarm/teamHelpers.js";
import { setAutoModeEnvOnboardingEligible } from "../../utils/permissions/autoModeState.js";
import { isAutoModeSetupNotOverridden } from "../../commands/auto-mode-setup/index.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { getSingleKeyAction } from "../../keybindings/resolver.js";
import { parseKeystroke } from "../../keybindings/parser.js";
import { logError } from "../../utils/log.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { SEND_NOW_HINT_KEY } from "../../screens/repl/sendNow.js";
import { useEffortStepKeys } from "./effortStepKeys.js";
import { NOT_IN_CLOUD_SESSIONS } from "./PromptInputModeHints.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import { enterTeammateView, exitTeammateView } from "../../state/teammateViewHelpers.js";
import { RemoteControlPill } from "./RemoteControlPill.js";
import { stopTask, stopWorkflowTask } from "../tasks/stopTask.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useShowFastIconHint } from "./useShowFastIconHint.js";
import { getFastIconString } from "../FastIcon.js";
import { sequential } from "../../utils/sequential.js";
import { useStatusField } from "../Spinner/spinnerStatus.js";
import {
  isUltracodeActive,
  modelSupportsPerTurnEffortControl,
  persistEffortSetting,
  levelEffortSetting,
} from "../../utils/effort.js";
import { onRefusalSettingsChange } from "../../services/api/responseDiagnostics.js";
import { buildBorderText, MemoizedPromptInput } from "./PromptInput.js";
import {
  recordSwitchIfChanged,
  serializeModelSwitch,
  effectiveModelForContext,
  useMainLoopModel,
} from "../../utils/model/modelSwitchHooks.js";
import {
  setDefaultModel,
  describeDefaultSaved,
  sanitizeHookText,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
} from "../../commands/model/modelSwitch.js";
import { modelDisplayString } from "../../utils/model/model.js";
import { SAVED_AS_DEFAULT_SUFFIX } from "../../commands/model/modelMessages.js";
import { formatFastModeSuffix, FastModePicker } from "../../commands/fast/fast.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { savedModelPickReply } from "../../commands/config/configShorthand.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { hasLadderForSetting } from "../../utils/model/modelUnavailability.js";
import { ThinkingToggle } from "../ThinkingToggle.js";
import { useFullscreenDialogSlot, useFullscreenAnchor } from "../FullscreenLayout.js";
import { PromptInputModeIndicator } from "./PromptInputModeIndicator.js";
import {
  killWorkflowTask as killWorkflowTask_2,
  pauseWorkflowTask as pauseWorkflowTask_2,
  skipWorkflowAgent as skipWorkflowAgent_2,
  retryWorkflowAgent as retryWorkflowAgent_2,
} from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { WorkflowDetailDialog as WorkflowDetailDialog_2 } from "../workflows/WorkflowDetailDialog.js";
import { CloudWorkflowsDialog } from "../../commands/workflows/workflows.js";
import { CloudTasksDialog } from "../tasks/CloudTasksDialog.js";
import { BackgroundTasksDialog } from "../tasks/BackgroundTasksDialog.js";
import { HistorySearchDialog } from "../HistorySearchDialog.js";
import { WizardNavigationFooter } from "../wizard/WizardNavigationFooter.js";
import { BridgeDialog } from "../BridgeDialog.js";
import { NoConversationsMessage } from "../../screens/ResumeConversation.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:121242-121284 placement
function shouldShowIdeStatus(props, rowsDrawn) {
  return rowsDrawn && IdeStatusIndicator(props) !== null;
}
//@ chunk-czq1j3j2.js:465890-465943 placement
function selectIdleTeammatesExpanded_3(state) {
  return state.idleTeammatesExpanded ?? false;
}
//@ chunk-czq1j3j2.js:802988-803415 placement
function ConfirmDialog(props) {
  let $ = useMemoCache(8);
  let { title, confirmLabel, onConfirm, onCancel } = props;
  let children;
  if ($[0] !== confirmLabel || $[1] !== onCancel || $[2] !== onConfirm) {
    children = jsxProd_default(ConfirmSelect, {
      cancelFirst: true,
      focus: "cancel",
      hideIndexes: true,
      confirmLabel,
      cancelLabel: "Cancel",
      onConfirm,
      onCancel,
    });
    $[0] = confirmLabel;
    $[1] = onCancel;
    $[2] = onConfirm;
    $[3] = children;
  } else children = $[3];
  let dialogElement;
  if ($[4] !== onCancel || $[5] !== children || $[6] !== title) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      onCancel,
      children,
    });
    $[4] = onCancel;
    $[5] = children;
    $[6] = title;
    $[7] = dialogElement;
  } else dialogElement = $[7];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:912118-912164 placement (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId_4(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-czq1j3j2.js:952998-953761 placement (2.1.88 match: CompanionSprite, 0.359)
/**
 * "Save and close editor to continue..." 等待提示（外部编辑器打开期间显示），可上下加分隔线。
 */
function EditorWaitNotice(props) {
  let $ = useMemoCache(15);
  let { mode, columns } = props;
  let setAppState = useIsScreenReaderEnabled();
  let companion = showSwarmFooterGate();
  let borderStyle;
  if ($[0] !== companion || $[1] !== setAppState || $[2] !== mode) {
    borderStyle = companion ? {} : getEditorWaitBorderStyle(mode, setAppState);
    $[0] = companion;
    $[1] = setAppState;
    $[2] = mode;
    $[3] = borderStyle;
  } else borderStyle = $[3];
  let children;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: "Save and close editor to continue...",
    });
    $[4] = children;
  } else children = $[4];
  let noticeBox;
  if ($[5] !== borderStyle) {
    noticeBox = jsxProd_default(Box, {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      ...borderStyle,
      width: "100%",
      children,
    });
    $[5] = borderStyle;
    $[6] = noticeBox;
  } else noticeBox = $[6];
  let noticeBoxMemo = noticeBox;
  if (!companion) {
    return noticeBoxMemo;
  }
  let topDivider;
  if ($[7] !== columns) {
    topDivider = jsxProd_default(Divider, {
      width: columns,
    });
    $[7] = columns;
    $[8] = topDivider;
  } else topDivider = $[8];
  let bottomDivider;
  if ($[9] !== columns) {
    bottomDivider = jsxProd_default(Divider, {
      width: columns,
    });
    $[9] = columns;
    $[10] = bottomDivider;
  } else bottomDivider = $[10];
  let noticeRow;
  if ($[11] !== noticeBoxMemo || $[12] !== topDivider || $[13] !== bottomDivider) {
    noticeRow = jsxProd_default_2(Fragment, {
      children: [topDivider, noticeBoxMemo, bottomDivider],
    });
    $[11] = noticeBoxMemo;
    $[12] = topDivider;
    $[13] = bottomDivider;
    $[14] = noticeRow;
  } else noticeRow = $[14];
  return noticeRow;
}
//@ chunk-czq1j3j2.js:954134-954138 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:954134", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:960897-961220 placement
function usePromptChromeRows({ scope, chrome, rowsDrawn }) {
  let swarmFooterVisible = showSwarmFooterGate();
  let mergedClients = useMergedClients(
    scope.initialMcpClients,
    useAppState((state) => state.mcp.clients),
  );
  let ideSelection = useStoreSelector(chrome, (state) => state.ideSelection);
  let isViewingAgent = useAppState((state) => state.viewingAgentTaskId !== undefined);
  if (!swarmFooterVisible) return false;
  let ideConnectionStatus = useIdeConnectionStatus(mergedClients);
  return shouldShowIdeStatus(
    {
      ideStatus: ideConnectionStatus.status,
      ideName: ideConnectionStatus.ideName,
      isRemoteWorkspace: isRemoteSessionAvailable(),
      isViewingAgent,
      ideSelection,
    },
    rowsDrawn,
  );
}
//@ chunk-czq1j3j2.js:961220-961258 placement
function selectEmbedded(state) {
  return state.embedded;
}
//@ chunk-czq1j3j2.js:961258-961300 placement
function selectIdeSelection(state) {
  return state.ideSelection;
}
//@ chunk-czq1j3j2.js:961300-961342 placement
function selectBashesDialog(state) {
  return state.bashesDialog;
}
//@ chunk-czq1j3j2.js:961342-961392 placement
function selectHasSuppressedDialogs(state) {
  return state.hasSuppressedDialogs;
}
//@ chunk-czq1j3j2.js:961392-961437 placement
function selectHideLoginNotice_2(state) {
  return state.hideLoginNotice;
}
//@ chunk-czq1j3j2.js:961437-961476 placement
function selectIsLoading2(state) {
  return state.isLoading;
}
//@ chunk-czq1j3j2.js:961476-961523 placement
function selectIsExternalLoading2(state) {
  return state.isExternalLoading;
}
//@ chunk-czq1j3j2.js:961523-961564 placement
function selectSubmitCount(state) {
  return state.submitCount;
}
//@ chunk-czq1j3j2.js:961564-961615 placement
function selectToolPermissionContext(state) {
  return state.toolPermissionContext;
}
//@ chunk-czq1j3j2.js:961615-961652 placement
function selectVerbose2(state) {
  return state.verbose;
}
//@ chunk-czq1j3j2.js:961652-961698 placement
function selectOnDetachToCaller(state) {
  return state.onDetachToCaller;
}
//@ chunk-czq1j3j2.js:961698-961742 placement
function selectQueueEditIndex2(state) {
  return state.queueEditIndex;
}
//@ chunk-czq1j3j2.js:961742-961826 placement
function clearQueueEditIndex(state) {
  return state.queueEditIndex === null
    ? state
    : {
        ...state,
        queueEditIndex: null,
      };
}
//@ chunk-czq1j3j2.js:961826-961861 placement
function selectTasks2(state) {
  return state.tasks;
}
//@ chunk-czq1j3j2.js:961861-961912 placement
function selectRemoteBackgroundTasks2(state) {
  return state.remoteBackgroundTasks;
}
//@ chunk-czq1j3j2.js:961912-961956 placement
function selectWorkflowDetail(state) {
  return state.workflowDetail;
}
//@ chunk-czq1j3j2.js:961956-962140 placement
function shouldShowBridgeStatus(state) {
  return (
    (state.replBridgeError !== undefined && !state.replBridgeOutboundOnly) ||
    (state.replBridgeConnected &&
      !state.replBridgeOutboundOnly &&
      (state.replBridgeExplicit || state.replBridgeReconnecting))
  );
}
//@ chunk-czq1j3j2.js:962140-962167 placement
function selectNever(state) {
  return false;
}
//@ chunk-czq1j3j2.js:962167-962208 placement (2.1.88 match: _temp, 1)
function selectTeamContext_2(s) {
  return s.teamContext;
}
//@ chunk-czq1j3j2.js:962208-962254 placement
function selectPromptSuggestion(state) {
  return state.promptSuggestion;
}
//@ chunk-czq1j3j2.js:962254-962302 layout (2.1.88 match: _temp2, 1)
function viewingAgentTaskIdSelector(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-czq1j3j2.js:962302-962343 placement
function selectIsBriefOnly_3(state) {
  return state.isBriefOnly;
}
//@ chunk-czq1j3j2.js:962343-962386 placement
function selectMainLoopModel(state) {
  return state.mainLoopModel;
}
//@ chunk-czq1j3j2.js:962439-962484 placement
function selectThinkingEnabled2(state) {
  return state.thinkingEnabled;
}
//@ chunk-czq1j3j2.js:962530-962569 placement
function selectUltracode_2(state) {
  return state.ultracode;
}
//@ chunk-czq1j3j2.js:962569-962604 placement
function getIdleInFlightState() {
  return {
    inFlight: false,
  };
}
//@ chunk-czq1j3j2.js:962604-962654 placement
function selectCoordinatorTaskIndex2(state) {
  return state.coordinatorTaskIndex;
}
//@ chunk-czq1j3j2.js:962654-962699 placement
function selectTaskDecorations_3(state) {
  return state.taskDecorations;
}
//@ chunk-czq1j3j2.js:962699-962754 layout
function idleTeammatesExpandedSelector(state) {
  return state.idleTeammatesExpanded ?? false;
}
//@ chunk-czq1j3j2.js:962754-962786 placement
function selectId(state) {
  return state.id;
}
//@ chunk-czq1j3j2.js:962786-962818 placement
function selectId2(state) {
  return state.id;
}
//@ chunk-czq1j3j2.js:962818-962868 placement
function selectEnvOnboardingOffered(state) {
  return state.envOnboardingOffered;
}
//@ chunk-czq1j3j2.js:962868-962900 placement
function selectId3(state) {
  return state.id;
}
//@ chunk-czq1j3j2.js:962900-962971 layout
function remoteWorkflowRunIdsSelector(state) {
  return runningRemoteWorkflows(state.remoteWorkflowRuns).map(selectId3).join(`
`);
}
//@ chunk-czq1j3j2.js:962971-963003 layout
function idSelector(state) {
  return state.id;
}
//@ chunk-czq1j3j2.js:963003-963084 placement
function hasSuggestionContent(state) {
  return state.suggestions.length > 0 || !!state.suggestionsEmptyMessage;
}
//@ chunk-czq1j3j2.js:963084-963118 placement
function isFooterTabEnabled(tab) {
  return !FOOTER_TAB_ENABLED[tab];
}
//@ chunk-czq1j3j2.js:963118-963167 placement
function selectWorkflowFooterIndex2(state) {
  return state.workflowFooterIndex;
}
//@ chunk-czq1j3j2.js:963167-963216 affinity
function workflowFooterRunIdSelector(state) {
  return state.workflowFooterRunId;
}
//@ chunk-czq1j3j2.js:963216-963336 affinity
function clearWorkflowFooterSelection(state) {
  return state.footerSelection === "workflows"
    ? {
        ...state,
        footerSelection: null,
        workflowFooterRunId: undefined,
      }
    : state;
}
//@ chunk-czq1j3j2.js:963381-963410 placement
function toggleHelpOpen(isOpen) {
  return !isOpen;
}
//@ chunk-czq1j3j2.js:963410-963489 placement
function markTasksHintSeen(state) {
  return state.hasSeenTasksHint
    ? state
    : {
        ...state,
        hasSeenTasksHint: true,
      };
}
//@ chunk-czq1j3j2.js:963489-963520 placement
function bumpCounter(count) {
  return count + 1;
}
//@ chunk-czq1j3j2.js:963520-963564 placement (2.1.88 match: _temp, 1)
function isPastedImageBlock(c) {
  return c.type === "image";
}
//@ chunk-czq1j3j2.js:963564-963619 layout (2.1.88 match: scanDirectory, 0.767)
function scanDirectory(dirPath) {
  return dirPath.description === "directory";
}
//@ chunk-czq1j3j2.js:963619-963635 placement
function noopResetHistory() {}
//@ chunk-czq1j3j2.js:963635-963668 placement
function foldKeepNewest(previous, next) {
  return next;
}
//@ chunk-czq1j3j2.js:963668-963684 placement
function noopAfterSubmit() {}
//@ chunk-czq1j3j2.js:963684-963751 placement
function clearPromptSuggestion(state) {
  return {
    ...state,
    promptSuggestion: {
      status: "empty",
    },
  };
}
//@ chunk-czq1j3j2.js:963751-963782 placement
function bumpRetryCount(count) {
  return count + 1;
}
//@ chunk-czq1j3j2.js:963782-963811 placement
function toggleFlag(flag) {
  return !flag;
}
//@ chunk-czq1j3j2.js:963811-963870 placement
function unavailableReasonState(isAvailable) {
  return isAvailable
    ? null
    : {
        unavailableReason: getFastModeUnavailableMessage(),
      };
}
//@ chunk-czq1j3j2.js:963870-963899 placement
function negateBoolean_2(flag) {
  return !flag;
}
//@ chunk-czq1j3j2.js:963899-963947 placement
function dismissShowFlag(state) {
  return state.show
    ? {
        show: false,
      }
    : state;
}
//@ chunk-czq1j3j2.js:963947-963963 placement
function noopOnConfirm() {}
//@ chunk-czq1j3j2.js:963963-963987 placement
function returnFalse() {
  return false;
}
//@ chunk-czq1j3j2.js:963987-964078 placement
function withAutoModeSetupMessage(state) {
  return {
    ...state,
    initialMessage: {
      message: createUserMessage({
        content: "/auto-mode-setup",
      }),
    },
  };
}
//@ chunk-czq1j3j2.js:964078-964122 placement (2.1.88 match: _temp, 1)
function isImagePasteBlock(c) {
  return c.type === "image";
}
//@ chunk-czq1j3j2.js:964122-964153 placement
function decrementIndex(index) {
  return index - 1;
}
//@ chunk-czq1j3j2.js:964153-964184 placement
function decrementWorkflowIndex(index) {
  return index - 1;
}
//@ chunk-czq1j3j2.js:964184-964215 placement
function incrementIndex(index) {
  return index + 1;
}
//@ chunk-czq1j3j2.js:964215-964246 placement
function incrementWorkflowIndex(index) {
  return index + 1;
}
//@ chunk-czq1j3j2.js:964246-964335 placement
function collapseIdleTeammates(state) {
  return !state.idleTeammatesExpanded
    ? state
    : {
        ...state,
        idleTeammatesExpanded: false,
      };
}
//@ chunk-czq1j3j2.js:964335-964351 placement
function noopOutputHandler() {}
//@ chunk-czq1j3j2.js:964351-964390 placement
function isEffortLevelNotice(notice) {
  return notice?.key === EFFORT_LEVEL_KEY;
}
//@ chunk-czq1j3j2.js:964390-964406 placement
function noopReplyHandler() {}
//@ chunk-czq1j3j2.js:964406-964451 placement
function unsavedTextState(isDraft) {
  return isDraft
    ? {
        unsaved: "",
      }
    : "";
}
//@ chunk-czq1j3j2.js:964451-964475 placement
function isNotOffBox() {
  return false;
}
//@ chunk-czq1j3j2.js:964475-964546 placement
function logSetMaxThinkingTokensFailure(error) {
  logForDebugging(`[remote] set_max_thinking_tokens failed: ${error}`);
}
//@ chunk-czq1j3j2.js:964546-964683 placement
function clearFooterSelection(state) {
  return state.workflowDetail === undefined && state.footerSelection === null
    ? state
    : {
        ...state,
        workflowDetail: undefined,
        footerSelection: null,
      };
}
//@ chunk-czq1j3j2.js:964683-964767 placement
var FOOTER_TAB_ENABLED = {
  tasks: false,
  bagel: true,
  bridge: true,
  ideSelection: true,
  workflows: false,
  frame: true,
};
var FOOTER_DOUBLE_CLICK_MS = 150;
//@ chunk-czq1j3j2.js:964767-964836 placement
function stripPastedRefMarkers(text) {
  return text.replace(regExp_6, (fullMatch, label, pasteId) => `[${label} #${Number(pasteId)}]`);
}
//@ chunk-czq1j3j2.js:964836-1012485 placement
/**
 * 2.1.316 的主输入框组件（约 47 KB）：组合草稿、vim 模式、bash/模式切换、自动补全、页脚各胶囊、排队命令、提交到主线程或代理；取代旧版 PromptInput 的大部分逻辑。
 */
function PromptComposer(props) {
  let $ = useMemoCache(677);
  let { turn, transcript, scope, draft, chrome, gesture, submit } = props;
  let isFullscreen = useIsFullscreen();
  let isSwarmFooterVisible = showSwarmFooterGate();
  let { submit: submit_2, submitEmpty, submitToAgent } = submit;
  let embedded = useStoreSelector(chrome, selectEmbedded);
  let ideSelection = useStoreSelector(chrome, selectIdeSelection);
  let storeSelector = useStoreSelector(chrome, selectBashesDialog);
  let storeSelector_2 = useStoreSelector(chrome, selectHasSuppressedDialogs);
  let hideLoginNotice = useStoreSelector(chrome, selectHideLoginNotice_2);
  let storeSelector_3 = useStoreSelector(draft, selectIsEmpty);
  useHasSecretEligibleDialog(draft);
  let dialogStore = useDialogStore();
  let isInputWrapped = useStoreSelector(draft, selectIsMultiline);
  let storeSelector_4 = useStoreSelector(draft, selectInputMode);
  let hasStash = useStoreSelector(draft, selectHasStash);
  let hasMessages = useStoreSelector(transcript, hasUserOrAssistantMessage);
  let isMidConversation = useStoreSelector(transcript, hasAssistantMessage);
  let { setValue, setCursorOffset, setMode, setPastedContents } = draft;
  let storeSelector_5 = useStoreSelector(turn, selectIsLoading2);
  let storeSelector_6 = useStoreSelector(turn, selectIsExternalLoading2);
  let submitCount = useStoreSelector(turn, selectSubmitCount);
  let appState = useAppState(selectToolPermissionContext);
  let proactivityStepState = useProactivityStepState();
  let verbose = useAppState(selectVerbose2);
  let isDetachSuppressed = useSyncExternalStore(onAttacherCapsChange, alwaysFalseB);
  const onDetachToCaller = useStoreSelector(chrome, selectOnDetachToCaller);
  let gestureArgs;
  if ($[0] !== gesture || $[1] !== onDetachToCaller || $[2] !== transcript || $[3] !== turn) {
    gestureArgs = {
      gesture,
      turn,
      transcript,
      onDetachToCaller,
    };
    $[0] = gesture;
    $[1] = onDetachToCaller;
    $[2] = transcript;
    $[3] = turn;
    $[4] = gestureArgs;
  } else gestureArgs = $[4];
  let leftArrowGesture = useLeftArrowGesture(gestureArgs);
  let mainLoopModel = useMainLoopModel_3();
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let isModalOverlayActive = useThirdOverlayKeys() || dialogOfKind;
  let vimMode = useVimMode();
  let session = useSession();
  let composerHandleRef = useRef(null);
  let editorMode = useEditorMode();
  let [isHelpOpen, setHelpOpen] = useLatestState(false);
  let [suggestionsStore] = useState(createEmptyAutocompleteStore);
  let [, setPendingEnterSelection, takePendingEnterSelection] = useLatestState(null);
  let isVimEditing = editorMode && vimMode !== "NORMAL";
  let vimEditingEffect;
  let vimEditingDeps;
  if ($[5] !== draft || $[6] !== isVimEditing) {
    vimEditingEffect = () => {
      draft.setVimEditing(isVimEditing);
      return () => draft.setVimEditing(false);
    };
    vimEditingDeps = [isVimEditing, draft];
    $[5] = draft;
    $[6] = isVimEditing;
    $[7] = vimEditingEffect;
    $[8] = vimEditingDeps;
  } else {
    vimEditingEffect = $[7];
    vimEditingDeps = $[8];
  }
  useEffect(vimEditingEffect, vimEditingDeps);
  let warnInsertModeEffect;
  let warnInsertModeDeps;
  if ($[9] !== session || $[10] !== editorMode) {
    warnInsertModeEffect = () => {
      if (!editorMode) setLaunchWarningFor(session, "INSERT");
    };
    warnInsertModeDeps = [session, editorMode];
    $[9] = session;
    $[10] = editorMode;
    $[11] = warnInsertModeEffect;
    $[12] = warnInsertModeDeps;
  } else {
    warnInsertModeEffect = $[11];
    warnInsertModeDeps = $[12];
  }
  useEffect(warnInsertModeEffect, warnInsertModeDeps);
  let [isAutoUpdating, setIsAutoUpdating] = useState(false);
  let initialExitMessage;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    initialExitMessage = {
      show: false,
    };
    $[13] = initialExitMessage;
  } else initialExitMessage = $[13];
  let [exitMessage, setExitMessage] = useState(initialExitMessage);
  let showExitMessage;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    showExitMessage = (showExitMessage, key) =>
      setExitMessage(
        showExitMessage
          ? {
              show: showExitMessage,
              key,
            }
          : {
              show: false,
            },
      );
    $[14] = showExitMessage;
  } else showExitMessage = $[14];
  let onExitMessage = showExitMessage;
  let resolvedPromise;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    resolvedPromise = Promise.resolve();
    $[15] = resolvedPromise;
  } else resolvedPromise = $[15];
  let pendingModeSync = useRef(resolvedPromise);
  let emptySet;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    emptySet = new Set();
    $[16] = emptySet;
  } else emptySet = $[16];
  let sentDirectMessages = useRef(emptySet);
  let store = useAppStoreDirect();
  let setShowState = useSetAppState();
  let appState_2 = useAppState(selectQueueEditIndex2);
  let clearQueueEditEffect;
  if ($[17] !== setShowState) {
    clearQueueEditEffect = () => setShowState(clearQueueEditIndex);
    $[17] = setShowState;
    $[18] = clearQueueEditEffect;
  } else clearQueueEditEffect = $[18];
  let clearQueueEditIndexAction = clearQueueEditEffect;
  let taskStore = useTaskFramework();
  let { storageV5 } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let tasks = useAppState(selectTasks2);
  let taskList = useAppState(selectRemoteBackgroundTasks2);
  let taskDecorations = useHasRemoteWork();
  let hasBackgroundTasks;
  if ($[19] !== taskDecorations || $[20] !== taskList || $[21] !== tasks) {
    hasBackgroundTasks =
      countOf(taskList, taskDecorations) > 0 && !Object.values(tasks).some(shouldHideTasksFooter);
    $[19] = taskDecorations;
    $[20] = taskList;
    $[21] = tasks;
    $[22] = hasBackgroundTasks;
  } else hasBackgroundTasks = $[22];
  let showTasksFooter = hasBackgroundTasks;
  let isBashDialogOpen = Boolean(storeSelector);
  let [bashDialogOpen, setBashDialogOpen] = useState(isBashDialogOpen);
  let [tasksFooterVisible, setTasksFooterVisible] = useState(showTasksFooter);
  if (isBashDialogOpen !== bashDialogOpen) {
    setBashDialogOpen(isBashDialogOpen);
    setTasksFooterVisible(showTasksFooter);
  }
  let appState_3 = useAppState(selectWorkflowDetail);
  let taskId = appState_3?.taskId;
  let { columns } = useTerminalSize();
  let appState_4 = useAppState(shouldShowBridgeStatus);
  let showBridgeTab;
  if ($[23] !== appState_4 || $[24] !== columns || $[25] !== isFullscreen || $[26] !== isSwarmFooterVisible) {
    showBridgeTab =
      (!isFullscreen || isSwarmFooterVisible) &&
      appState_4 &&
      columns >= FOOTER_WIDE_COLUMNS &&
      isBridgeEnabled();
    $[23] = appState_4;
    $[24] = columns;
    $[25] = isFullscreen;
    $[26] = isSwarmFooterVisible;
    $[27] = showBridgeTab;
  } else showBridgeTab = $[27];
  let bridgeTabEnabled = showBridgeTab;
  let appState_5 = useAppState(selectNever);
  let frameFooterState = useFrameFooterState();
  let teamContext = useAppState(selectTeamContext_2);
  let commandQueue = useCommandQueue();
  let suggestion = useAppState(selectPromptSuggestion);
  let tasks_2 = useAppState(viewingAgentTaskIdSelector);
  let isBriefOnly = useAppState(selectIsBriefOnly_3) && !tasks_2;
  let appState_6 = useAppState(selectMainLoopModel);
  let appState_7 = useAppState(selectMainLoopModelForSession_2);
  let appState_8 = useAppState(selectThinkingEnabled2);
  let model = useAppState(selectIsFastModeOn);
  let level = useQueuedMessageText();
  let appState_9 = useAppState(selectUltracode_2);
  let appState_10 = useAppState(getViewedTeammateTask_2_2);
  let viewingAgentName = appState_10?.identity.agentName;
  let viewingAgentName_2 = useAppState(getActiveAgentName);
  let viewingAgentColorRaw;
  if ($[28] !== appState_10) {
    viewingAgentColorRaw =
      appState_10?.identity.color && AGENT_COLOR_NAMES.includes(appState_10.identity.color)
        ? appState_10.identity.color
        : undefined;
    $[28] = appState_10;
    $[29] = viewingAgentColorRaw;
  } else viewingAgentColorRaw = $[29];
  let viewingAgentColor = viewingAgentColorRaw;
  let agentPermissionContext;
  ci: {
    if (appState_10) {
      let agentContext;
      if ($[30] !== appState || $[31] !== appState_10.permissionMode) {
        agentContext = {
          ...appState,
          mode: appState_10.permissionMode,
        };
        $[30] = appState;
        $[31] = appState_10.permissionMode;
        $[32] = agentContext;
      } else agentContext = $[32];
      agentPermissionContext = agentContext;
      break ci;
    }
    agentPermissionContext = appState;
  }
  let toolPermissionContext = agentPermissionContext;
  let seedPasteIdsEffect;
  if ($[33] !== transcript) {
    seedPasteIdsEffect = () => primePasteIdsFromMessages(transcript.getSnapshot());
    $[33] = transcript;
    $[34] = seedPasteIdsEffect;
  } else seedPasteIdsEffect = $[34];
  useState(seedPasteIdsEffect);
  let [isBridgeDialogOpen, setBridgeDialogOpen] = useState(false);
  let [isWizardOpen, setWizardOpen] = useState(false);
  let [cloudRowCheck] = useState(getIdleInFlightState);
  let appState_11 = useAppState(selectCoordinatorTaskIndex2);
  let appState_12 = useAppState(selectTaskDecorations_3);
  let appState_13 = useAppState(idleTeammatesExpandedSelector);
  let updateCoordinatorIndex;
  if ($[35] !== setShowState) {
    updateCoordinatorIndex = (nextIndex) =>
      setShowState((prevState) => {
        let nextCoordinatorIndex =
          typeof nextIndex === "function" ? nextIndex(prevState.coordinatorTaskIndex) : nextIndex;
        if (nextCoordinatorIndex === prevState.coordinatorTaskIndex) {
          return prevState;
        }
        return {
          ...prevState,
          coordinatorTaskIndex: nextCoordinatorIndex,
        };
      });
    $[35] = setShowState;
    $[36] = updateCoordinatorIndex;
  } else updateCoordinatorIndex = $[36];
  let setCoordinatorTaskIndex = updateCoordinatorIndex;
  let visibleAgentTaskCount = useVisibleAgentTaskCount();
  let isCoordinatorPanelSubscribed = subscribeCoordinatorPanel();
  let isPromptModeWithTasks =
    storeSelector_4 !== "bash" && countVisibleTasks(tasks, taskList, taskDecorations) > 0;
  let firstTaskIndex = isPromptModeWithTasks ? -1 : 0;
  let visibleTasksRaw;
  if ($[37] !== appState_13 || $[38] !== appState_12 || $[39] !== tasks || $[40] !== tasks_2) {
    visibleTasksRaw = getVisibleBackgroundTasks(tasks, appState_12, tasks_2, appState_13);
    $[37] = appState_13;
    $[38] = appState_12;
    $[39] = tasks;
    $[40] = tasks_2;
    $[41] = visibleTasksRaw;
  } else visibleTasksRaw = $[41];
  let visibleBackgroundTasks = visibleTasksRaw;
  let taskIdsRaw;
  if ($[42] !== visibleBackgroundTasks) {
    taskIdsRaw = visibleBackgroundTasks.map(selectId);
    $[42] = visibleBackgroundTasks;
    $[43] = taskIdsRaw;
  } else taskIdsRaw = $[43];
  let taskIds = taskIdsRaw;
  let agentRowTaskIds;
  if ($[44] !== appState_12 || $[45] !== tasks || $[46] !== tasks_2 || $[47] !== visibleBackgroundTasks) {
    agentRowTaskIds = visibleBackgroundTasks.some(isAgentRowVisible)
      ? getVisibleBackgroundTasks(tasks, appState_12, tasks_2, true).map(selectId2)
      : undefined;
    $[44] = appState_12;
    $[45] = tasks;
    $[46] = tasks_2;
    $[47] = visibleBackgroundTasks;
    $[48] = agentRowTaskIds;
  } else agentRowTaskIds = $[48];
  let agentRowTaskIdsStable = agentRowTaskIds;
  let prevTaskIdsRef = useRef(taskIds);
  let prevAgentRowIdsRef = useRef(agentRowTaskIdsStable);
  let clampTaskIndexEffect;
  let clampTaskIndexDeps;
  if (
    $[49] !== visibleAgentTaskCount ||
    $[50] !== appState_11 ||
    $[51] !== appState_13 ||
    $[52] !== firstTaskIndex ||
    $[53] !== setCoordinatorTaskIndex ||
    $[54] !== agentRowTaskIdsStable ||
    $[55] !== visibleBackgroundTasks ||
    $[56] !== taskIds
  ) {
    clampTaskIndexEffect = () => {
      let previousSelectedId =
        (appState_13 ? prevAgentRowIdsRef.current : undefined) ?? prevTaskIdsRef.current;
      prevTaskIdsRef.current = taskIds;
      prevAgentRowIdsRef.current = agentRowTaskIdsStable;
      let remappedIndex = remapTaskPanelIndex(
        appState_11,
        previousSelectedId,
        taskIds,
        visibleBackgroundTasks,
      );
      if (remappedIndex !== appState_11) setCoordinatorTaskIndex(remappedIndex);
      else if (appState_11 >= visibleAgentTaskCount)
        setCoordinatorTaskIndex(Math.max(firstTaskIndex, visibleAgentTaskCount - 1));
      else if (appState_11 < firstTaskIndex) setCoordinatorTaskIndex(firstTaskIndex);
    };
    clampTaskIndexDeps = [
      appState_13,
      agentRowTaskIdsStable,
      taskIds,
      visibleBackgroundTasks,
      visibleAgentTaskCount,
      appState_11,
      firstTaskIndex,
      setCoordinatorTaskIndex,
    ];
    $[49] = visibleAgentTaskCount;
    $[50] = appState_11;
    $[51] = appState_13;
    $[52] = firstTaskIndex;
    $[53] = setCoordinatorTaskIndex;
    $[54] = agentRowTaskIdsStable;
    $[55] = visibleBackgroundTasks;
    $[56] = taskIds;
    $[57] = clampTaskIndexEffect;
    $[58] = clampTaskIndexDeps;
  } else {
    clampTaskIndexEffect = $[57];
    clampTaskIndexDeps = $[58];
  }
  useEffect(clampTaskIndexEffect, clampTaskIndexDeps);
  let [isPasting, setIsPasting] = useState(false);
  let [showExpandPasteHint, setShowExpandPasteHint] = useState(false);
  let clock = useClock();
  let [isExternalEditorActive, setIsExternalEditorActive] = useState(false);
  let [isModelPickerOpen, setModelPickerOpen] = useState(false);
  let isModelSwitchPendingRef = useRef(false);
  let [isHistorySearchOpen, setHistorySearchOpen] = useState(false);
  let [fastModePickerState, setFastModePickerState] = useState(null);
  let [isThinkingToggleOpen, setThinkingToggleOpen] = useState(false);
  let storeSelector_7 = useStoreSelector(turn, selectEnvOnboardingOffered);
  let isAutoPermissionMode = appState.mode === "auto";
  let shouldOfferEnvOnboarding;
  if ($[59] !== storeSelector_5 || $[60] !== isAutoPermissionMode || $[61] !== storeSelector_7) {
    shouldOfferEnvOnboarding =
      storeSelector_7 && !storeSelector_5 && isAutoPermissionMode && shouldOfferAutoModeEnvOnboarding();
    $[59] = storeSelector_5;
    $[60] = isAutoPermissionMode;
    $[61] = storeSelector_7;
    $[62] = shouldOfferEnvOnboarding;
  } else shouldOfferEnvOnboarding = $[62];
  let showEnvOnboarding = shouldOfferEnvOnboarding;
  let appState_14 = useAppState(remoteWorkflowRunIdsSelector);
  let runningWorkflowIds;
  if ($[63] !== appState_14 || $[64] !== tasks) {
    runningWorkflowIds = [
      ...runningWorkflowTasks(tasks).map(idSelector),
      ...(appState_14 === ""
        ? []
        : appState_14.split(`
`)),
    ];
    $[63] = appState_14;
    $[64] = tasks;
    $[65] = runningWorkflowIds;
  } else runningWorkflowIds = $[65];
  let runningWorkflowIds_2 = runningWorkflowIds;
  let tasksTabVisible = visibleAgentTaskCount > 0 || isPromptModeWithTasks;
  let workflowsTabVisible =
    runningWorkflowIds_2.length > 0 &&
    !isCoordinatorPanelSubscribed &&
    storeSelector_4 === "prompt" &&
    !exitMessage.show &&
    !isPasting;
  let frameTabVisible;
  if (
    $[66] !== exitMessage ||
    $[67] !== frameFooterState ||
    $[68] !== isPasting ||
    $[69] !== storeSelector_4
  ) {
    frameTabVisible =
      frameFooterState &&
      getArtifactPublishStubDir() === null &&
      storeSelector_4 === "prompt" &&
      !exitMessage.show &&
      !isPasting;
    $[66] = exitMessage;
    $[67] = frameFooterState;
    $[68] = isPasting;
    $[69] = storeSelector_4;
    $[70] = frameTabVisible;
  } else frameTabVisible = $[70];
  let isFrameTabVisible = frameTabVisible;
  let isBagelTabVisible;
  if ($[71] !== appState_5 || $[72] !== exitMessage || $[73] !== isPasting || $[74] !== storeSelector_4) {
    isBagelTabVisible =
      appState_5 &&
      storeSelector_4 !== "bash" &&
      !isRemoteSessionAvailable() &&
      !exitMessage.show &&
      !isPasting;
    $[71] = appState_5;
    $[72] = exitMessage;
    $[73] = isPasting;
    $[74] = storeSelector_4;
    $[75] = isBagelTabVisible;
  } else isBagelTabVisible = $[75];
  let bagelTabVisible = isBagelTabVisible;
  let hasSuggestionContent_2 = useStoreSelector(suggestionsStore.drawn, hasSuggestionContent);
  let footerStatusVisible;
  if ($[76] !== isFullscreen || $[77] !== isHelpOpen || $[78] !== hasSuggestionContent_2) {
    footerStatusVisible = shouldShowFooterStatus({
      hasSuggestionContent: hasSuggestionContent_2,
      isFullscreen,
      helpOpen: isHelpOpen,
    });
    $[76] = isFullscreen;
    $[77] = isHelpOpen;
    $[78] = hasSuggestionContent_2;
    $[79] = footerStatusVisible;
  } else footerStatusVisible = $[79];
  let showFooterStatus = footerStatusVisible;
  let chromeRowsArgs;
  if ($[80] !== chrome || $[81] !== showFooterStatus || $[82] !== scope) {
    chromeRowsArgs = {
      scope,
      chrome,
      rowsDrawn: showFooterStatus,
    };
    $[80] = chrome;
    $[81] = showFooterStatus;
    $[82] = scope;
    $[83] = chromeRowsArgs;
  } else chromeRowsArgs = $[83];
  let promptChromeRows = usePromptChromeRows(chromeRowsArgs);
  let footerTabCandidates;
  if (
    $[84] !== bagelTabVisible ||
    $[85] !== bridgeTabEnabled ||
    $[86] !== isFrameTabVisible ||
    $[87] !== promptChromeRows ||
    $[88] !== showFooterStatus ||
    $[89] !== tasksTabVisible ||
    $[90] !== workflowsTabVisible
  ) {
    footerTabCandidates = !showFooterStatus
      ? []
      : [
          tasksTabVisible && "tasks",
          isFrameTabVisible && "frame",
          bagelTabVisible && "bagel",
          promptChromeRows && "ideSelection",
          bridgeTabEnabled && "bridge",
          workflowsTabVisible && "workflows",
        ].filter(Boolean);
    $[84] = bagelTabVisible;
    $[85] = bridgeTabEnabled;
    $[86] = isFrameTabVisible;
    $[87] = promptChromeRows;
    $[88] = showFooterStatus;
    $[89] = tasksTabVisible;
    $[90] = workflowsTabVisible;
    $[91] = footerTabCandidates;
  } else footerTabCandidates = $[91];
  let footerTabs = footerTabCandidates;
  let hasTasksOrWorkflowsSelected = visibleAgentTaskCount > 0 || workflowsTabVisible;
  let enabledFooterTabs;
  if ($[92] !== footerTabs || $[93] !== hasTasksOrWorkflowsSelected) {
    enabledFooterTabs = hasTasksOrWorkflowsSelected ? footerTabs.filter(isFooterTabEnabled) : footerTabs;
    $[92] = footerTabs;
    $[93] = hasTasksOrWorkflowsSelected;
    $[94] = enabledFooterTabs;
  } else enabledFooterTabs = $[94];
  let footerTabsEnabled = enabledFooterTabs;
  let appState_15 = useAppState(selectWorkflowFooterIndex2);
  let appState_16 = useAppState(workflowFooterRunIdSelector);
  let setWorkflowFooterIndexThunk;
  if ($[95] !== appState_14 || $[96] !== runningWorkflowIds_2 || $[97] !== setShowState) {
    setWorkflowFooterIndexThunk = (nextWorkflowIndex) =>
      setShowState((prevState) => {
        let workflowIndex =
          typeof nextWorkflowIndex === "function"
            ? nextWorkflowIndex(prevState.workflowFooterIndex)
            : nextWorkflowIndex;
        let runningWorkflowId = runningWorkflowIds_2[workflowIndex];
        let nextWorkflowRunId =
          runningWorkflowId !== undefined &&
          appState_14
            .split(
              `
`,
            )
            .includes(runningWorkflowId)
            ? runningWorkflowId
            : undefined;
        if (
          workflowIndex === prevState.workflowFooterIndex &&
          nextWorkflowRunId === prevState.workflowFooterRunId
        ) {
          return prevState;
        }
        return {
          ...prevState,
          workflowFooterIndex: workflowIndex,
          workflowFooterRunId: nextWorkflowRunId,
        };
      });
    $[95] = appState_14;
    $[96] = runningWorkflowIds_2;
    $[97] = setShowState;
    $[98] = setWorkflowFooterIndexThunk;
  } else setWorkflowFooterIndexThunk = $[98];
  let setWorkflowFooterIndex = setWorkflowFooterIndexThunk;
  let prevWorkflowIdsRef = useRef(runningWorkflowIds_2);
  let clampWorkflowIndexEffect;
  let clampWorkflowDeps;
  if (
    $[99] !== runningWorkflowIds_2 ||
    $[100] !== setShowState ||
    $[101] !== setWorkflowFooterIndex ||
    $[102] !== appState_15 ||
    $[103] !== appState_16
  ) {
    clampWorkflowIndexEffect = () => {
      let previousIds = prevWorkflowIdsRef.current;
      prevWorkflowIdsRef.current = runningWorkflowIds_2;
      let selectedWorkflowId = appState_16 ?? previousIds[appState_15];
      if (selectedWorkflowId !== undefined) {
        let index = runningWorkflowIds_2.indexOf(selectedWorkflowId);
        if (index !== -1 && index !== appState_15) {
          setWorkflowFooterIndex(index);
          return;
        }
        if (index === -1 && getRemoteCaps() !== null) setShowState(clearWorkflowFooterSelection);
      }
      if (appState_15 >= runningWorkflowIds_2.length)
        setWorkflowFooterIndex(Math.max(0, runningWorkflowIds_2.length - 1));
    };
    clampWorkflowDeps = [
      runningWorkflowIds_2,
      appState_15,
      appState_16,
      setWorkflowFooterIndex,
      setShowState,
    ];
    $[99] = runningWorkflowIds_2;
    $[100] = setShowState;
    $[101] = setWorkflowFooterIndex;
    $[102] = appState_15;
    $[103] = appState_16;
    $[104] = clampWorkflowIndexEffect;
    $[105] = clampWorkflowDeps;
  } else {
    clampWorkflowIndexEffect = $[104];
    clampWorkflowDeps = $[105];
  }
  useEffect(clampWorkflowIndexEffect, clampWorkflowDeps);
  let appState_17 = useAppState(selectFooterSelection);
  let isBashTasksSelection = appState_17 === "tasks" && storeSelector_4 === "bash" && appState_11 < 0;
  let activeFooterTab =
    appState_17 && footerTabs.includes(appState_17) && !isBashTasksSelection ? appState_17 : null;
  let clearStaleFooterEffect;
  let clearStaleFooterDeps;
  if ($[106] !== activeFooterTab || $[107] !== appState_17 || $[108] !== setShowState) {
    clearStaleFooterEffect = () => {
      if (appState_17 && !activeFooterTab) setShowState(clearFooterSelectionState);
    };
    clearStaleFooterDeps = [appState_17, activeFooterTab, setShowState];
    $[106] = activeFooterTab;
    $[107] = appState_17;
    $[108] = setShowState;
    $[109] = clearStaleFooterEffect;
    $[110] = clearStaleFooterDeps;
  } else {
    clearStaleFooterEffect = $[109];
    clearStaleFooterDeps = $[110];
  }
  useEffect(clearStaleFooterEffect, clearStaleFooterDeps);
  let showStatusNotices = shouldShowStatusNotices(isSwarmFooterVisible && !isHelpOpen);
  const footerNavActive = activeFooterTab !== null;
  let hintRowArgs;
  if (
    $[111] !== exitMessage ||
    $[112] !== storeSelector_2 ||
    $[113] !== isPasting ||
    $[114] !== storeSelector_4 ||
    $[115] !== showStatusNotices ||
    $[116] !== showExpandPasteHint ||
    $[117] !== footerNavActive
  ) {
    hintRowArgs = {
      enabled: showStatusNotices,
      exitMessage,
      isPasting,
      showExpandPasteHint,
      mode: storeSelector_4,
      permissionParked: storeSelector_2,
      footerNavActive,
    };
    $[111] = exitMessage;
    $[112] = storeSelector_2;
    $[113] = isPasting;
    $[114] = storeSelector_4;
    $[115] = showStatusNotices;
    $[116] = showExpandPasteHint;
    $[117] = footerNavActive;
    $[118] = hintRowArgs;
  } else hintRowArgs = $[118];
  let row1Hint = PromptHintRow(hintRowArgs);
  let tasksTabSelected = activeFooterTab === "tasks";
  let workflowsTabSelected = activeFooterTab === "workflows";
  let bridgeSelected = activeFooterTab === "bridge";
  let ideSelectionSelected = activeFooterTab === "ideSelection";
  let footerTabMissing = activeFooterTab !== null && !footerTabsEnabled.includes(activeFooterTab);
  let setFooterTabThunk;
  if (
    $[119] !== isSwarmFooterVisible ||
    $[120] !== firstTaskIndex ||
    $[121] !== setShowState ||
    $[122] !== setCoordinatorTaskIndex ||
    $[123] !== setWorkflowFooterIndex
  ) {
    setFooterTabThunk = (tab) => {
      setShowState((prevState) => {
        if (prevState.footerSelection === tab) {
          return prevState;
        }
        let nextState = {
          ...prevState,
          footerSelection: tab,
        };
        if (tab === "frame") nextState.frameOpenFailedSeen = frameOpenFailed(prevState);
        if (prevState.footerSelection === "tasks") nextState.idleTeammatesExpanded = false;
        return nextState;
      });
      if (tab === "tasks") setCoordinatorTaskIndex(firstTaskIndex);
      if (tab === "workflows") setWorkflowFooterIndex(0);
      if (tab !== null && !isSwarmFooterVisible) setShowExpandPasteHint(false);
    };
    $[119] = isSwarmFooterVisible;
    $[120] = firstTaskIndex;
    $[121] = setShowState;
    $[122] = setCoordinatorTaskIndex;
    $[123] = setWorkflowFooterIndex;
    $[124] = setFooterTabThunk;
  } else setFooterTabThunk = $[124];
  let selectFooterTab = setFooterTabThunk;
  let moveFooterSelection;
  if (
    $[125] !== visibleAgentTaskCount ||
    $[126] !== activeFooterTab ||
    $[127] !== runningWorkflowIds_2.length ||
    $[128] !== selectFooterTab ||
    $[129] !== footerTabMissing ||
    $[130] !== setCoordinatorTaskIndex ||
    $[131] !== setWorkflowFooterIndex
  ) {
    moveFooterSelection = function moveFooterSelectionImpl(tabs, delta, allowLeave) {
      let allowClear = allowLeave === undefined ? false : allowLeave;
      let currentTabIndex = activeFooterTab ? tabs.indexOf(activeFooterTab) : -1;
      let nextTab = tabs[currentTabIndex + delta];
      if (nextTab) {
        selectFooterTab(nextTab);
        let isBackward = delta < 0 && !footerTabMissing;
        if (isBackward && nextTab === "tasks" && visibleAgentTaskCount > 0)
          setCoordinatorTaskIndex(visibleAgentTaskCount - 1);
        if (isBackward && nextTab === "workflows")
          setWorkflowFooterIndex(Math.max(0, runningWorkflowIds_2.length - 1));
        return true;
      }
      if (delta < 0 && allowClear) {
        selectFooterTab(null);
        return true;
      }
      return false;
    };
    $[125] = visibleAgentTaskCount;
    $[126] = activeFooterTab;
    $[127] = runningWorkflowIds_2.length;
    $[128] = selectFooterTab;
    $[129] = footerTabMissing;
    $[130] = setCoordinatorTaskIndex;
    $[131] = setWorkflowFooterIndex;
    $[132] = moveFooterSelection;
  } else moveFooterSelection = $[132];
  let moveFooterSelectionStable = moveFooterSelection;
  const hasInput = !storeSelector_3;
  let suggestionArgs;
  if ($[133] !== storeSelector_5 || $[134] !== hasInput) {
    suggestionArgs = {
      hasInput,
      isAssistantResponding: storeSelector_5,
    };
    $[133] = storeSelector_5;
    $[134] = hasInput;
    $[135] = suggestionArgs;
  } else suggestionArgs = $[135];
  let {
    suggestion: suggestion_2,
    markAccepted,
    logOutcomeAtSubmission,
    markShown,
  } = usePromptSuggestion(suggestionArgs);
  let { addNotification, removeNotification } = useNotifications();
  let placeholderArgs;
  if (
    $[136] !== hasMessages ||
    $[137] !== storeSelector_3 ||
    $[138] !== submitCount ||
    $[139] !== viewingAgentName_2
  ) {
    placeholderArgs = {
      isInputEmpty: storeSelector_3,
      submitCount,
      hasMessages,
      viewingAgentName: viewingAgentName_2,
    };
    $[136] = hasMessages;
    $[137] = storeSelector_3;
    $[138] = submitCount;
    $[139] = viewingAgentName_2;
    $[140] = placeholderArgs;
  } else placeholderArgs = $[140];
  let promptInputPlaceholder = usePromptInputPlaceholder(placeholderArgs);
  let toggleHelp;
  if ($[141] !== setHelpOpen) {
    toggleHelp = () => {
      logEvent("tengu_help_toggled", {});
      setHelpOpen(toggleHelpOpen);
    };
    $[141] = setHelpOpen;
    $[142] = toggleHelp;
  } else toggleHelp = $[142];
  let toggleHelpStable = toggleHelp;
  let onHistoryDownPastEnd;
  if ($[143] !== selectFooterTab || $[144] !== storageV5 || $[145] !== footerTabsEnabled[0]) {
    onHistoryDownPastEnd = () => {
      let firstTab = footerTabsEnabled[0];
      if (firstTab === undefined) {
        return;
      }
      selectFooterTab(firstTab);
      if (firstTab === "tasks" && !getGlobalConfig().hasSeenTasksHint)
        saveGlobalConfig(markTasksHintSeen, storageV5);
    };
    $[143] = selectFooterTab;
    $[144] = storageV5;
    $[145] = footerTabsEnabled[0];
    $[146] = onHistoryDownPastEnd;
  } else onHistoryDownPastEnd = $[146];
  let onHistoryDownPastEnd_2 = onHistoryDownPastEnd;
  let popQueuedInput;
  if (
    $[147] !== addNotification ||
    $[148] !== chrome ||
    $[149] !== clearQueueEditIndexAction ||
    $[150] !== draft ||
    $[151] !== setMode ||
    $[152] !== commandQueueOrDefault ||
    $[153] !== session ||
    $[154] !== setCursorOffset ||
    $[155] !== setValue ||
    $[156] !== setPastedContents ||
    $[157] !== store ||
    $[158] !== editorMode
  ) {
    popQueuedInput = () => {
      let queueEditIndex = store.getState().queueEditIndex;
      if (queueEditIndex === null) {
        return false;
      }
      let currentDraftValue = draft.value;
      let queuedCommand = commandQueueOrDefault.getCommandQueue().filter(isQueuedCommandEditable)[
        queueEditIndex
      ];
      if (queuedCommand && !isQueuedCommandPullableInto(queuedCommand, currentDraftValue === "")) {
        addNotification({
          key: "queue-pull-needs-empty-input",
          kind: "feedback",
          text: "Clear the input to edit this queued shell command",
          row1Hint: "clear input to edit shell command",
          priority: "immediate",
          timeoutMs: 2000,
        });
        clearQueueEditIndexAction();
        logFeatureSad("input_queue_pop_to_edit", "bash_needs_empty_draft");
        return true;
      }
      let queuedInput = commandQueueOrDefault.popEditableAt(
        queueEditIndex,
        currentDraftValue,
        draft.cursorOffset,
        draft.pastedContents,
      );
      clearQueueEditIndexAction();
      if (!queuedInput) {
        logFeatureSad("input_queue_pop_to_edit", "stale_index");
        return true;
      }
      setValue(queuedInput.text);
      if (queuedInput.unpassed) draft.markCameBack();
      setMode(queuedInput.mode);
      setCursorOffset(
        editorMode && promptInputStoreFor(session).getState().vimMode === "NORMAL"
          ? setCwdState(draft.value, queuedInput.cursorOffset)
          : queuedInput.cursorOffset,
      );
      chrome.returnIdeSelection(queuedInput.ideSelection);
      if (queuedInput.images.length > 0)
        setPastedContents((pastedContents) => mergeTurnTags(pastedContents, queuedInput.images));
      logFeatureOk("input_queue_pop_to_edit");
      return true;
    };
    $[147] = addNotification;
    $[148] = chrome;
    $[149] = clearQueueEditIndexAction;
    $[150] = draft;
    $[151] = setMode;
    $[152] = commandQueueOrDefault;
    $[153] = session;
    $[154] = setCursorOffset;
    $[155] = setValue;
    $[156] = setPastedContents;
    $[157] = store;
    $[158] = editorMode;
    $[159] = popQueuedInput;
  } else popQueuedInput = $[159];
  let popQueuedInputStable = popQueuedInput;
  let lastSubmittedInputRef = useRef(null);
  let lastConfirmedAgentCommand = useRef(null);
  let agentCommandDialog = useRef(null);
  let cleanupAgentNoticeEffect;
  if ($[160] !== removeNotification) {
    cleanupAgentNoticeEffect = () => () => {
      lastConfirmedAgentCommand.current = null;
      agentCommandDialog.current?.close();
      removeNotification(AGENT_VIEW_COMMAND_NOTICE);
    };
    $[160] = removeNotification;
    $[161] = cleanupAgentNoticeEffect;
  } else cleanupAgentNoticeEffect = $[161];
  let cleanupAgentNoticeDeps;
  if ($[162] !== removeNotification || $[163] !== tasks_2) {
    cleanupAgentNoticeDeps = [tasks_2, removeNotification];
    $[162] = removeNotification;
    $[163] = tasks_2;
    $[164] = cleanupAgentNoticeDeps;
  } else cleanupAgentNoticeDeps = $[164];
  useEffect(cleanupAgentNoticeEffect, cleanupAgentNoticeDeps);
  let submittedRecentlyRef = useRef(false);
  let resetSubmitTracking;
  if ($[165] === MEMO_CACHE_SENTINEL) {
    resetSubmitTracking = () => {
      lastSubmittedInputRef.current = null;
      submittedRecentlyRef.current = false;
    };
    $[165] = resetSubmitTracking;
  } else resetSubmitTracking = $[165];
  let resetSubmitTrackingStable = resetSubmitTracking;
  let isChordGestureSpent;
  if ($[166] !== draft.changedFromOutside || $[167] !== draft.value) {
    isChordGestureSpent = (inputValue) => {
      if (inputValue === undefined && submittedRecentlyRef.current && draft.changedFromOutside) {
        return true;
      }
      let lastSubmittedInput = lastSubmittedInputRef.current;
      if (lastSubmittedInput === null) {
        return false;
      }
      return (
        inputValue === "" ||
        inputValue === lastSubmittedInput ||
        draft.value === "" ||
        draft.value === lastSubmittedInput
      );
    };
    $[166] = draft.changedFromOutside;
    $[167] = draft.value;
    $[168] = isChordGestureSpent;
  } else isChordGestureSpent = $[168];
  let chordGestureSpent = isChordGestureSpent;
  let markSubmitted;
  if ($[169] !== clock) {
    markSubmitted = (submittedInput) => {
      lastSubmittedInputRef.current = submittedInput;
      submittedRecentlyRef.current = true;
      clock.setTimeout(resetSubmitTrackingStable, 0);
    };
    $[169] = clock;
    $[170] = markSubmitted;
  } else markSubmitted = $[170];
  let markSubmittedStable = markSubmitted;
  let markSubmittedOnly;
  if ($[171] !== clock) {
    markSubmittedOnly = () => {
      submittedRecentlyRef.current = true;
      clock.setTimeout(resetSubmitTrackingStable, 0);
    };
    $[171] = clock;
    $[172] = markSubmittedOnly;
  } else markSubmittedOnly = $[172];
  let markSubmittedOnlyStable = markSubmittedOnly;
  let lastClickRef = useRef(null);
  let noteClick;
  if ($[173] === MEMO_CACHE_SENTINEL) {
    noteClick = () => {
      let clickStamp = {
        sameChunk: true,
        at: performance.now(),
      };
      lastClickRef.current = clickStamp;
      queueMicrotask(() => {
        clickStamp.sameChunk = false;
      });
    };
    $[173] = noteClick;
  } else noteClick = $[173];
  let noteDoubleClickCandidate = noteClick;
  let isDoubleClick;
  if ($[174] === MEMO_CACHE_SENTINEL) {
    isDoubleClick = () => {
      let lastClick = lastClickRef.current;
      return (
        lastClick !== null &&
        (lastClick.sameChunk || performance.now() - lastClick.at < FOOTER_DOUBLE_CLICK_MS)
      );
    };
    $[174] = isDoubleClick;
  } else isDoubleClick = $[174];
  let isDoubleClickActive = isDoubleClick;
  let footerOwnsKey;
  if ($[175] !== footerTabs || $[176] !== store) {
    footerOwnsKey = () => {
      let { footerSelection } = store.getState();
      return footerSelection !== null && footerTabs.includes(footerSelection);
    };
    $[175] = footerTabs;
    $[176] = store;
    $[177] = footerOwnsKey;
  } else footerOwnsKey = $[177];
  let footerOwnsKeyCheck = footerOwnsKey;
  let shadowedFooterActionHandler = useShadowedFooterActionHandler(footerOwnsKeyCheck);
  let clearBuffer;
  if ($[178] === MEMO_CACHE_SENTINEL) {
    clearBuffer = () => composerHandleRef.current?.clearBuffer();
    $[178] = clearBuffer;
  } else clearBuffer = $[178];
  let clearBufferStable = clearBuffer;
  let [redrawCount, setRedrawCount] = useState(0);
  let forceRedrawEffect;
  let redrawDeps;
  if ($[179] !== redrawCount) {
    forceRedrawEffect = () => {
      if (redrawCount === 0) {
        return;
      }
      getSecondRootError().get(process.stdout)?.forceRedraw();
    };
    redrawDeps = [redrawCount];
    $[179] = redrawCount;
    $[180] = forceRedrawEffect;
    $[181] = redrawDeps;
  } else {
    forceRedrawEffect = $[180];
    redrawDeps = $[181];
  }
  useLayoutEffect(forceRedrawEffect, redrawDeps);
  let handleSubmitRaw;
  if (
    $[182] !== addNotification ||
    $[183] !== dialogStore ||
    $[184] !== draft ||
    $[185] !== footerOwnsKeyCheck ||
    $[186] !== logOutcomeAtSubmission ||
    $[187] !== markAccepted ||
    $[188] !== markSubmittedOnlyStable ||
    $[189] !== submitToAgent ||
    $[190] !== submitEmpty ||
    $[191] !== submit_2 ||
    $[192] !== suggestion ||
    $[193] !== popQueuedInputStable ||
    $[194] !== removeNotification ||
    $[195] !== scope ||
    $[196] !== session ||
    $[197] !== setCursorOffset ||
    $[198] !== setValue ||
    $[199] !== setPastedContents ||
    $[200] !== storageV5 ||
    $[201] !== store ||
    $[202] !== suggestionsStore.own ||
    $[203] !== teamContext
  ) {
    handleSubmitRaw = async (
      input,
      fromKeybinding,
      pastedContentsOverride,
      waitForResume,
      keyboard,
      inputModeOverride,
      sendNow,
    ) => {
      let isFromKeybinding = fromKeybinding === undefined ? false : fromKeybinding;
      let shouldWaitForResume = waitForResume === undefined ? false : waitForResume;
      let shouldForcePromptMode = inputModeOverride === undefined ? false : inputModeOverride;
      let shouldSendNow = sendNow === undefined ? false : sendNow;
      let isInputEmpty = input === "";
      let lastAgentCommand = lastConfirmedAgentCommand.current;
      lastConfirmedAgentCommand.current = null;
      if (hasDraftHiddenCueDialog(dialogStore.getState())) {
        return;
      }
      let state = store.getState();
      if (isKbCohesionFixesOn() && state.queueEditIndex !== null && popQueuedInputStable()) {
        return;
      }
      if (footerOwnsKeyCheck()) {
        return;
      }
      if (isDoubleClickActive()) {
        return;
      }
      let expanded = expandPastedTextRefs(input, pastedContentsOverride ?? draft.pastedContents);
      if (expanded.removed.removedTotal > 0) {
        stripInvisiblePromptChars(expanded.removed, "prompt");
        let inputEmptyAfterStrip = expanded.input.trim() === "";
        let needsReview = skipInvisibleCharsNotice(expanded.input, expanded.removed, draft.mode);
        noteLinkSuppliedEdit(session, input, expanded.input);
        setValue(expanded.input);
        setCursorOffset(expanded.input.length);
        if (expanded.pastedContents !== draft.pastedContents) setPastedContents(expanded.pastedContents);
        addNotification({
          key: "prompt-invisible-removed",
          kind: "feedback",
          text: formatInvisibleCharsRemoved(
            expanded.removed.removedTotal,
            inputEmptyAfterStrip ? "empty" : needsReview ? "review" : "cleaned",
          ),
          priority: "immediate",
          timeoutMs: NOTIFICATION_TIMEOUT_MS,
        });
        setRedrawCount(bumpCounter);
        noteDoubleClickCandidate();
        if (needsReview) {
          return;
        }
        input = expanded.input;
        pastedContentsOverride = expanded.pastedContents;
        keyboard = undefined;
      }
      input = input.trimEnd();
      let pastedContents_2 = pastedContentsOverride ?? draft.pastedContents;
      let any = Object.values(pastedContents_2).some(isPastedImageBlock);
      let suggestionText = suggestionTextOrNull(suggestion);
      let matchesSuggestion = input === suggestionText;
      if (getAutoModeConfigOrDefault().typedMarks === true) {
        let suggestionPlainText =
          suggestionText === null
            ? ""
            : stripPastedRefMarkers(expandPastedTextRefs(suggestionText, {}).input.trimEnd());
        let inputPlainText = stripPastedRefMarkers(expanded.input.trimEnd());
        matchesSuggestion =
          inputPlainText !== "" &&
          (inputPlainText === suggestionPlainText || inputPlainText === stripModePrefix(suggestionPlainText));
      }
      let isSuggestionAccepted = Boolean(
        matchesSuggestion &&
        suggestionText &&
        suggestion.status === "accepted" &&
        suggestion.acceptedAt > suggestion.shownAt,
      );
      if (matchesSuggestion && suggestionText && !any && !state.viewingAgentTaskId) {
        if (isShownOrAcceptedSuggestion(suggestion)) markAccepted();
      }
      if (isAgentSwarmsEnabled()) {
        let directMemberMessage = parseDirectMemberMessage(input);
        if (directMemberMessage) {
          if (sentDirectMessages.current.has(input)) {
            return;
          }
          sentDirectMessages.current.add(input);
          markSubmittedOnlyStable();
          if (
            (await sendDirectMemberMessageAndNotify({
              recipientName: directMemberMessage.recipientName,
              message: requestDialogWrapper(directMemberMessage.message, pastedContents_2),
              teamContext,
              writeToMailbox,
              storageV5,
              addNotification,
              clearInput: () => {
                setValue("");
                setPastedContents({});
                setCursorOffset(0);
                clearBufferStable();
                composerHandleRef.current?.resetHistory();
              },
            }).finally(() => {
              sentDirectMessages.current.delete(input);
            })) === "handled"
          ) {
            return;
          }
        }
      }
      let isLeaderInput =
        draft.mode === "prompt" && getActiveAgentForInput(store.getState()).type === "leader";
      let submitText = input;
      let resumedFromKeybinding = false;
      if (submitText.trim() === "" && !any && isLeaderInput) {
        let autoResumeInput = autoResumePromptIfStale();
        if (autoResumeInput !== null) {
          submitText = autoResumeInput;
          resumedFromKeybinding = true;
        }
      }
      if (submitText.trim() === "" && !any) {
        if (!(isLeaderInput && isInputEmpty && !shouldWaitForResume && submitEmpty()))
          logFeatureOk("prompt_submit_empty");
        return;
      }
      let { suggestions } = suggestionsStore.own.getState();
      let allSuggestionsScan = suggestions.length > 0 && suggestions.every(scanDirectory);
      if (suggestions.length > 0 && !isFromKeybinding && !allSuggestionsScan) {
        logForDebugging(`[onSubmit] early return: suggestions showing (count=${suggestions.length})`);
        return;
      }
      if (isShownOrAcceptedSuggestion(suggestion)) {
        let suggestionOutcome = logOutcomeAtSubmission(input);
        if (suggestionOutcome !== null)
          recordSuggestionOutcome(suggestionOutcome, storageV5, session.promptSuggestion);
      }
      let slashCommand = parseSlashCommand(submitText);
      let matchedCommand = slashCommand && findCommand(slashCommand.commandName, scope.commands);
      let isLocalCommand = matchedCommand?.type === "local" || matchedCommand?.type === "local-jsx";
      if (
        isLeaderInput &&
        !isLocalCommand &&
        !EXIT_COMMAND_WORDS.includes(input.trim()) &&
        !isUnattendedBgSession() &&
        store.getState().promptSuggestionEnabled &&
        logPromptSuggestionBackOff(storageV5)
      ) {
        session.promptSuggestion.askOnNextTurn();
        addNotification({
          key: "prompt-suggestion-back-off",
          kind: "hint",
          segments: BACK_OFF_NOTICE_PARTS,
          priority: "medium",
        });
      }
      removeNotification("stash-hint");
      composerHandleRef.current?.resetHistory();
      let activeAgentForInput = getActiveAgentForInput(store.getState());
      if (activeAgentForInput.type !== "leader") {
        if (!isLocalCommand) {
          logEvent("tengu_transcript_input_to_teammate", {});
          markSubmittedOnlyStable();
          await submitToAgent(
            submitText,
            activeAgentForInput.task,
            {
              setCursorOffset,
              clearBuffer: clearBufferStable,
              resetHistory: noopResetHistory,
            },
            pastedContentsOverride,
          );
          return;
        }
        let agentCommandNotice =
          slashCommand && matchedCommand
            ? AgentViewCommandNotice(matchedCommand, {
                invokedAs: slashCommand.commandName,
                isTeammate: activeAgentForInput.type === "viewed",
              })
            : undefined;
        cne: switch (agentCommandNotice?.onSubmit) {
          case undefined: {
            break cne;
          }
          case "block": {
            logEvent("tengu_agent_view_leader_command_notice", {});
            addNotification({
              key: AGENT_VIEW_COMMAND_NOTICE,
              kind: "feedback",
              segments: agentCommandNotice.segments,
              priority: "immediate",
              exemptFromDiffPanelHold: true,
              fold: foldKeepNewest,
            });
            return;
          }
          case "confirm": {
            let taskId = activeAgentForInput.task.id;
            if (
              isSameAgentViewCommand(lastAgentCommand, {
                input: submitText,
                taskId,
              })
            ) {
              logEvent("tengu_agent_view_leader_command_confirmed", {});
              break cne;
            }
            if (agentCommandDialog.current !== null) {
              return;
            }
            logEvent("tengu_agent_view_leader_command_notice", {});
            let confirmDialog = scope.localJsx.show(
              jsxProd_default(ConfirmDialog, {
                title: agentCommandNotice.title,
                confirmLabel: agentCommandNotice.confirmLabel,
                onCancel: () => confirmDialog.close(),
                onConfirm: () => {
                  confirmDialog.close();
                  lastConfirmedAgentCommand.current = {
                    input: submitText,
                    taskId,
                  };
                  draft.submit(submitText, true);
                },
              }),
              {
                commandName: agentCommandNotice.commandName,
                immediate: true,
                hidesPrompt: false,
                retireAtTurnBoundary: false,
              },
            );
            agentCommandDialog.current = confirmDialog;
            confirmDialog.closed.then(() => {
              if (agentCommandDialog.current === confirmDialog) agentCommandDialog.current = null;
            });
            return;
          }
        }
      }
      let isWorkflowKeywordSuppressed = composerHandleRef.current?.isWorkflowKeywordSuppressed() ?? false;
      let frozenMarker = resumedFromKeybinding || shouldForcePromptMode ? undefined : createFrozenMarker();
      let submitOptions =
        isWorkflowKeywordSuppressed ||
        isSuggestionAccepted ||
        pastedContentsOverride ||
        resumedFromKeybinding ||
        shouldWaitForResume ||
        keyboard ||
        frozenMarker ||
        shouldSendNow ||
        shouldForcePromptMode
          ? {
              suppressWorkflowKeyword: isWorkflowKeywordSuppressed || undefined,
              inputSource: isSuggestionAccepted ? "suggestion_accepted" : undefined,
              pastedContentsOverride,
              fromKeybinding: resumedFromKeybinding || undefined,
              resumesStaleQuotaWait: resumedFromKeybinding || undefined,
              wait: shouldWaitForResume || undefined,
              keyboard: resumedFromKeybinding ? undefined : keyboard,
              composerEnter: frozenMarker,
              sendNow: shouldSendNow || undefined,
              inputModeOverride: shouldForcePromptMode ? "prompt" : undefined,
            }
          : undefined;
      markSubmittedOnlyStable();
      await submit_2(
        submitText,
        {
          setCursorOffset,
          clearBuffer: clearBufferStable,
          resetHistory: noopAfterSubmit,
        },
        submitOptions,
      );
    };
    $[182] = addNotification;
    $[183] = dialogStore;
    $[184] = draft;
    $[185] = footerOwnsKeyCheck;
    $[186] = logOutcomeAtSubmission;
    $[187] = markAccepted;
    $[188] = markSubmittedOnlyStable;
    $[189] = submitToAgent;
    $[190] = submitEmpty;
    $[191] = submit_2;
    $[192] = suggestion;
    $[193] = popQueuedInputStable;
    $[194] = removeNotification;
    $[195] = scope;
    $[196] = session;
    $[197] = setCursorOffset;
    $[198] = setValue;
    $[199] = setPastedContents;
    $[200] = storageV5;
    $[201] = store;
    $[202] = suggestionsStore.own;
    $[203] = teamContext;
    $[204] = handleSubmitRaw;
  } else handleSubmitRaw = $[204];
  let handleSubmit = handleSubmitRaw;
  let submitRequestHandler;
  let submitDeps;
  if ($[205] !== draft || $[206] !== handleSubmit) {
    submitRequestHandler = () =>
      draft.onSubmitRequest(
        (requestInput, requestOptions) => void handleSubmit(requestInput, requestOptions),
      );
    submitDeps = [draft, handleSubmit];
    $[205] = draft;
    $[206] = handleSubmit;
    $[207] = submitRequestHandler;
    $[208] = submitDeps;
  } else {
    submitRequestHandler = $[207];
    submitDeps = $[208];
  }
  useLayoutEffect(submitRequestHandler, submitDeps);
  let historySubmitHandler;
  if ($[209] !== handleSubmit || $[210] !== setPastedContents) {
    historySubmitHandler = (historyEntry) => {
      setPastedContents(historyEntry.pastedContents);
      handleSubmit(historyEntry.display, false, historyEntry.pastedContents);
    };
    $[209] = handleSubmit;
    $[210] = setPastedContents;
    $[211] = historySubmitHandler;
  } else historySubmitHandler = $[211];
  let {
    isSearching,
    historyQuery,
    setHistoryQuery,
    historyMatch,
    historyFailedMatch,
    handleKeyDown,
    openSearch,
  } = useHistorySearch(draft, historySubmitHandler);
  let isOverlayOpen = isSearching || isHelpOpen;
  let overlayEffect;
  let overlayDeps;
  if ($[212] !== draft || $[213] !== isOverlayOpen) {
    overlayEffect = () => {
      draft.setInputOverlayActive(isOverlayOpen);
      return () => draft.setInputOverlayActive(false);
    };
    overlayDeps = [isOverlayOpen, draft];
    $[212] = draft;
    $[213] = isOverlayOpen;
    $[214] = overlayEffect;
    $[215] = overlayDeps;
  } else {
    overlayEffect = $[214];
    overlayDeps = $[215];
  }
  useEffect(overlayEffect, overlayDeps);
  let inputOwnsEscape;
  if (
    $[216] !== storeSelector_3 ||
    $[217] !== isOverlayOpen ||
    $[218] !== isVimEditing ||
    $[219] !== storeSelector_4 ||
    $[220] !== appState_2 ||
    $[221] !== commandQueue
  ) {
    inputOwnsEscape =
      isVimEditing ||
      isOverlayOpen ||
      storeSelector_4 !== "prompt" ||
      appState_2 !== null ||
      (!isKbCohesionFixesOn() &&
        commandQueue.some((queuedCommand_2) =>
          isQueuedCommandPullableInto(queuedCommand_2, storeSelector_3),
        ));
    $[216] = storeSelector_3;
    $[217] = isOverlayOpen;
    $[218] = isVimEditing;
    $[219] = storeSelector_4;
    $[220] = appState_2;
    $[221] = commandQueue;
    $[222] = inputOwnsEscape;
  } else inputOwnsEscape = $[222];
  let inputOwnsEscapeFlag = inputOwnsEscape;
  let escapeOwnershipEffect;
  let escapeOwnershipDeps;
  if ($[223] !== draft || $[224] !== inputOwnsEscapeFlag) {
    escapeOwnershipEffect = () => {
      draft.setInputOwnsEscape(inputOwnsEscapeFlag);
      return () => draft.setInputOwnsEscape(false);
    };
    escapeOwnershipDeps = [inputOwnsEscapeFlag, draft];
    $[223] = draft;
    $[224] = inputOwnsEscapeFlag;
    $[225] = escapeOwnershipEffect;
    $[226] = escapeOwnershipDeps;
  } else {
    escapeOwnershipEffect = $[225];
    escapeOwnershipDeps = $[226];
  }
  useEffect(escapeOwnershipEffect, escapeOwnershipDeps);
  let storeSelector_8 = useStoreSelector(suggestionsStore.drawn, hasSuggestions);
  let storeSelector_9 = useStoreSelector(suggestionsStore, hasSuggestions);
  let onSelectSuggestionImpl;
  if ($[227] === MEMO_CACHE_SENTINEL) {
    onSelectSuggestionImpl = (suggestionIndex, hovered) =>
      composerHandleRef.current?.selectSuggestion(suggestionIndex, hovered);
    $[227] = onSelectSuggestionImpl;
  } else onSelectSuggestionImpl = $[227];
  let onSelectSuggestion = onSelectSuggestionImpl;
  let onHoverSuggestionImpl;
  if ($[228] === MEMO_CACHE_SENTINEL) {
    onHoverSuggestionImpl = (suggestionIndex) =>
      composerHandleRef.current?.setHoveredSuggestion(suggestionIndex);
    $[228] = onHoverSuggestionImpl;
  } else onHoverSuggestionImpl = $[228];
  let onHoverSuggestion = onHoverSuggestionImpl;
  let emptyArray;
  if ($[229] === MEMO_CACHE_SENTINEL) {
    emptyArray = [];
    $[229] = emptyArray;
  } else emptyArray = $[229];
  let pendingPastes = useRef(emptyArray);
  let takePendingPastesImpl;
  if ($[230] === MEMO_CACHE_SENTINEL) {
    takePendingPastesImpl = () => pendingPastes.current.splice(0);
    $[230] = takePendingPastesImpl;
  } else takePendingPastesImpl = $[230];
  let takePendingPastes = takePendingPastesImpl;
  let onKeyDown = function onKeyDown(event) {
    useComposerEscape(event, {
      draft,
      vimEnabled: editorMode,
      vimMode,
      helpOpen: isHelpOpen,
      setHelpOpen,
    });
    if (event.ctrl || event.meta) {
      return;
    }
    if (editorMode && vimMode === "NORMAL") {
      if (event.key === "j") {
        event.preventDefault();
        return moveFooterDown();
      }
      if (event.key === "k") {
        event.preventDefault();
        return moveFooterUp();
      }
      if (event.key === "l") {
        event.preventDefault();
        return footerNext();
      }
      if (event.key === "h") {
        event.preventDefault();
        return footerPrevious();
      }
    }
    if (event.key.length > PASTE_THRESHOLD) {
      event.preventDefault();
      queuePaste(event.key);
      return;
    }
    let isSingleChar = [...event.key].length === 1;
    let normalized = event.key.normalize("NFC");
    let sliced = draft.value.slice(0, draft.cursorOffset);
    let shouldTypeText =
      !isSingleChar &&
      event.name === "" &&
      event.key !== "" &&
      (!editorMode || (vimMode === "INSERT" && !getInsertModeEscapeRemaps().has(normalized))) &&
      draft.value === draft.value.normalize("NFC") &&
      (sliced + normalized).normalize("NFC").length === sliced.length + normalized.length;
    if (isSingleChar || shouldTypeText) {
      event.preventDefault();
      if (event.key === "?" && draft.value === "") {
        toggleHelpStable();
        return;
      }
      composerHandleRef.current?.typeText(normalized);
    }
  };
  function queuePaste(pastedText) {
    pendingPastes.current.push(pastedText);
    setShowState(clearFooterSelectionState);
  }
  let shouldMarkSuggestionShown =
    storeSelector_4 === "prompt" && !storeSelector_8 && suggestion_2 && !tasks_2;
  if (shouldMarkSuggestionShown) markShown();
  if (suggestion.status === "generated" && !suggestion_2 && !tasks_2) {
    logSuggestionSuppressed("timing");
    setShowState(clearPromptSuggestion);
  }
  queryTerminalBackground();
  let clearScreen;
  if ($[231] === MEMO_CACHE_SENTINEL) {
    clearScreen = () => {
      setRedrawCount(bumpRetryCount);
    };
    $[231] = clearScreen;
  } else clearScreen = $[231];
  let clearScreenStable = clearScreen;
  let showRemoteSwitchNotice;
  if ($[232] !== addNotification) {
    showRemoteSwitchNotice = () => {
      if (!isRemoteSessionAvailable()) {
        return false;
      }
      addNotification({
        key: "remote-inference-config-unavailable",
        kind: "feedback",
        text: "Fast mode switching in cloud sessions is coming soon \u2014 set at session creation for now",
        priority: "medium",
      });
      return true;
    };
    $[232] = addNotification;
    $[233] = showRemoteSwitchNotice;
  } else showRemoteSwitchNotice = $[233];
  let remoteSwitchNotice = showRemoteSwitchNotice;
  let openModelPicker;
  if (
    $[234] !== addNotification ||
    $[235] !== storeSelector_6 ||
    $[236] !== storeSelector_5 ||
    $[237] !== storeSelector_4 ||
    $[238] !== submit_2 ||
    $[239] !== setHelpOpen
  ) {
    openModelPicker = () => {
      if (isRemoteSessionAvailable()) {
        if (
          storeSelector_5 ||
          storeSelector_6 ||
          storeSelector_4 !== "prompt" ||
          isModelSwitchPendingRef.current
        ) {
          addNotification({
            key: "remote-model-picker-unavailable",
            kind: "feedback",
            text: "Use /model to change the model in cloud sessions",
            priority: "medium",
          });
          return;
        }
        isModelSwitchPendingRef.current = true;
        submit_2("/model", NOOP_HELPERS, {
          fromKeybinding: true,
          inputModeOverride: "prompt",
        }).finally(() => {
          isModelSwitchPendingRef.current = false;
        });
        return;
      }
      setModelPickerOpen(toggleFlag);
      setHelpOpen(false);
    };
    $[234] = addNotification;
    $[235] = storeSelector_6;
    $[236] = storeSelector_5;
    $[237] = storeSelector_4;
    $[238] = submit_2;
    $[239] = setHelpOpen;
    $[240] = openModelPicker;
  } else openModelPicker = $[240];
  let openModelPickerStable = openModelPicker;
  let toggleFastMode;
  if ($[241] !== remoteSwitchNotice || $[242] !== setHelpOpen) {
    toggleFastMode = () => {
      if (!isRemoteControlChannelAvailable() && remoteSwitchNotice()) {
        return;
      }
      setFastModePickerState(unavailableReasonState);
      setHelpOpen(false);
    };
    $[241] = remoteSwitchNotice;
    $[242] = setHelpOpen;
    $[243] = toggleFastMode;
  } else toggleFastMode = $[243];
  let toggleFastModeStable = toggleFastMode;
  let toggleThinking;
  if (
    $[244] !== addNotification ||
    $[245] !== mainLoopModel ||
    $[246] !== remoteSwitchNotice ||
    $[247] !== setHelpOpen
  ) {
    toggleThinking = () => {
      if (!isRemoteControlChannelAvailable() && remoteSwitchNotice()) {
        return;
      }
      setHelpOpen(false);
      let thinkingCannotBeDisabledMessage = getThinkingCannotBeDisabledMessage(mainLoopModel);
      if (thinkingCannotBeDisabledMessage !== undefined) {
        addNotification({
          key: "thinking-always-on",
          kind: "feedback",
          text: thinkingCannotBeDisabledMessage,
          row1Hint: "thinking always on for this model",
          priority: "immediate",
          timeoutMs: 3000,
        });
        return;
      }
      setThinkingToggleOpen(negateBoolean_2);
    };
    $[244] = addNotification;
    $[245] = mainLoopModel;
    $[246] = remoteSwitchNotice;
    $[247] = setHelpOpen;
    $[248] = toggleThinking;
  } else toggleThinking = $[248];
  let toggleThinkingStable = toggleThinking;
  let cycleAttentionBudget = (delta) => {
    if (getRemoteCaps() || isRemoteSessionAvailable()) {
      return;
    }
    let attentionBudget = store.getState().attentionBudget;
    let nextBudget = stepStatusLineWidth(attentionBudget, delta);
    if (nextBudget === attentionBudget) {
      return;
    }
    setShowState((prevState) =>
      prevState.attentionBudget === nextBudget
        ? prevState
        : {
            ...prevState,
            attentionBudget: nextBudget,
          },
    );
    logEvent("tengu_attention_budget_cycle", {
      to: fromEnum(nextBudget),
    });
    logFeatureOk("attention_budget");
  };
  let cycleMode;
  if (
    $[249] !== addNotification ||
    $[250] !== session ||
    $[251] !== setShowState ||
    $[252] !== setHelpOpen ||
    $[253] !== storeSelector_7 ||
    $[254] !== storageV5 ||
    $[255] !== store ||
    $[256] !== taskStore ||
    $[257] !== teamContext ||
    $[258] !== turn
  ) {
    cycleMode = (cycleSource) => {
      let toolPermissionContext = store.getState().toolPermissionContext;
      setShowExpandPasteHint(false);
      setExitMessage(dismissShowFlag);
      let viewedTask = isViewingTeammate(store.getState())
        ? getViewedTeammateTask_2_2(store.getState())
        : undefined;
      if (viewedTask) {
        let context = {
          ...toolPermissionContext,
          mode: viewedTask.permissionMode,
        };
        let nextPermissionMode = getNextPermissionMode_2(context, undefined);
        logEvent("tengu_mode_cycle", {
          to: fromEnum(nextPermissionMode),
          trigger: fromEnum("shift_tab"),
        });
        logFeatureOk("mode_switch");
        let id = viewedTask.id;
        setShowState((prevState) => {
          let task = prevState.tasks[id];
          if (!task || task.type !== "in_process_teammate") {
            return prevState;
          }
          if (task.permissionMode === nextPermissionMode) {
            return prevState;
          }
          return {
            ...prevState,
            tasks: {
              ...prevState.tasks,
              [id]: {
                ...task,
                permissionMode: nextPermissionMode,
                planHeldAfterSpawn: nextPermissionMode === "plan",
              },
            },
          };
        });
        if (nextPermissionMode !== "plan") exitTeammatePlanMode(id, taskStore);
        setHelpOpen(false);
        return;
      }
      let currentMode = null ? null.currentMode : toolPermissionContext.mode;
      logForDebugging(
        `[auto-mode] handleCycleMode: currentMode=${currentMode} isAutoModeAvailable=${toolPermissionContext.isAutoModeAvailable}`,
      );
      let mode = null ? null.nextMode : (null ?? getNextPermissionMode_2(toolPermissionContext, teamContext));
      if ((null || false) && mode === currentMode) {
        setHelpOpen(false);
        return;
      }
      if (mode === currentMode) {
        logFeatureBad("mode_switch", "no_other_modes");
        if (isRemoteSessionAvailable())
          addNotification({
            key: "remote-permission-mode-noop",
            kind: "feedback",
            text: "No other permission modes are available in this cloud session",
            row1Hint: "no other modes in cloud",
            priority: "medium",
          });
        setHelpOpen(false);
        return;
      }
      if (storeSelector_7 && currentMode === "auto") turn.dismissEnvOnboardingOffer();
      let { context } =
        null ??
        (false
          ? {
              context: transitionPermissionMode(currentMode, null, toolPermissionContext, "shift_tab"),
            }
          : cyclePermissionMode(toolPermissionContext, teamContext, "shift_tab"));
      announce(`[${permissionModeIndicator(mode)} on]`);
      logEvent("tengu_mode_cycle", {
        to: fromEnum(mode),
        trigger: fromEnum("shift_tab"),
      });
      if (!isRemoteControlChannelAvailable()) logFeatureOk("mode_switch");
      if (mode === "plan") logFeatureOk("mode_plan_enter");
      else if (currentMode === "plan") logFeatureOk("mode_plan_exit");
      if (mode === "auto") logFeatureOk("mode_auto_enter");
      if (mode === "plan" && (cycleSource.kind === "carousel" || cycleSource.selection.mode === "plan")) {
        let now = Date.now();
        saveGlobalConfig((config) => touchPlanModeUse(config, now), storageV5);
      }
      tabCycleState.of(session.host).cycled = true;
      setToolPermissionContextAndNotify(setShowState, {
        ...context,
        mode,
      });
      pendingModeSync.current = pendingModeSync.current.then(() =>
        syncTeammateMode(mode, teamContext?.teamName, storageV5),
      );
      setHelpOpen(false);
    };
    $[249] = addNotification;
    $[250] = session;
    $[251] = setShowState;
    $[252] = setHelpOpen;
    $[253] = storeSelector_7;
    $[254] = storageV5;
    $[255] = store;
    $[256] = taskStore;
    $[257] = teamContext;
    $[258] = turn;
    $[259] = cycleMode;
  } else cycleMode = $[259];
  let cycleModeStable = cycleMode;
  let onConfirmPlaceholder = noopOnConfirm;
  let acceptCarouselSelection;
  if (
    $[260] !== takePendingEnterSelection ||
    $[261] !== cycleModeStable ||
    $[262] !== setPendingEnterSelection
  ) {
    acceptCarouselSelection = () => {
      let carouselSelection = takePendingEnterSelection();
      if (carouselSelection === null) {
        return false;
      }
      setPendingEnterSelection(null);
      cycleModeStable({
        kind: "select",
        selection: carouselSelection,
      });
      return true;
    };
    $[260] = takePendingEnterSelection;
    $[261] = cycleModeStable;
    $[262] = setPendingEnterSelection;
    $[263] = acceptCarouselSelection;
  } else acceptCarouselSelection = $[263];
  let acceptCarouselSelectionStable = acceptCarouselSelection;
  let takeEnter = returnFalse;
  let acceptEnvOnboarding;
  if ($[264] !== setShowState || $[265] !== turn) {
    acceptEnvOnboarding = () => {
      setAutoModeEnvOnboardingEligible(false);
      turn.dismissEnvOnboardingOffer();
      if (!isAutoModeSetupNotOverridden()) {
        return;
      }
      setShowState(withAutoModeSetupMessage);
    };
    $[264] = setShowState;
    $[265] = turn;
    $[266] = acceptEnvOnboarding;
  } else acceptEnvOnboarding = $[266];
  let onAccept = acceptEnvOnboarding;
  let dismissEnvOnboarding;
  if ($[267] !== turn) {
    dismissEnvOnboarding = () => {
      setAutoModeEnvOnboardingEligible(false);
      turn.dismissEnvOnboardingOffer();
    };
    $[267] = turn;
    $[268] = dismissEnvOnboarding;
  } else dismissEnvOnboarding = $[268];
  let dismissEnvOnboardingStable = dismissEnvOnboarding;
  let keybindingContext = useKeybindingContext();
  let registerSubmitHandler;
  if (
    $[269] !== chordGestureSpent ||
    $[270] !== draft.typedOnly ||
    $[271] !== draft.value ||
    $[272] !== shadowedFooterActionHandler ||
    $[273] !== isModalOverlayActive ||
    $[274] !== isSearching ||
    $[275] !== keybindingContext ||
    $[276] !== markSubmittedStable ||
    $[277] !== handleSubmit
  ) {
    registerSubmitHandler = () => {
      if (!keybindingContext || isModalOverlayActive || isSearching) {
        return;
      }
      let isEnterSingleKey =
        getSingleKeyAction(parseKeystroke("enter"), "Chat", keybindingContext.bindings) === "chat:submit";
      return keybindingContext.registerHandler({
        action: "chat:submit",
        context: "Chat",
        handler: () => {
          if (shadowedFooterActionHandler("chat:submit")) {
            return false;
          }
          if (chordGestureSpent(undefined)) {
            return;
          }
          let inputValue = draft.value;
          markSubmittedStable(inputValue);
          handleSubmit(
            inputValue,
            false,
            undefined,
            false,
            draft.typedOnly ? createFrozenEmpty() : undefined,
          );
        },
        singleKey: !isEnterSingleKey,
      });
    };
    $[269] = chordGestureSpent;
    $[270] = draft.typedOnly;
    $[271] = draft.value;
    $[272] = shadowedFooterActionHandler;
    $[273] = isModalOverlayActive;
    $[274] = isSearching;
    $[275] = keybindingContext;
    $[276] = markSubmittedStable;
    $[277] = handleSubmit;
    $[278] = registerSubmitHandler;
  } else registerSubmitHandler = $[278];
  let submitHandlerDeps;
  if (
    $[279] !== chordGestureSpent ||
    $[280] !== acceptCarouselSelectionStable ||
    $[281] !== draft ||
    $[282] !== shadowedFooterActionHandler ||
    $[283] !== isModalOverlayActive ||
    $[284] !== isSearching ||
    $[285] !== keybindingContext ||
    $[286] !== markSubmittedStable ||
    $[287] !== handleSubmit
  ) {
    submitHandlerDeps = [
      keybindingContext,
      isModalOverlayActive,
      isSearching,
      draft,
      shadowedFooterActionHandler,
      acceptCarouselSelectionStable,
      chordGestureSpent,
      markSubmittedStable,
      handleSubmit,
    ];
    $[279] = chordGestureSpent;
    $[280] = acceptCarouselSelectionStable;
    $[281] = draft;
    $[282] = shadowedFooterActionHandler;
    $[283] = isModalOverlayActive;
    $[284] = isSearching;
    $[285] = keybindingContext;
    $[286] = markSubmittedStable;
    $[287] = handleSubmit;
    $[288] = submitHandlerDeps;
  } else submitHandlerDeps = $[288];
  useEffect(registerSubmitHandler, submitHandlerDeps);
  let queueSubmitHandler;
  if (
    $[289] !== chordGestureSpent ||
    $[290] !== draft.value ||
    $[291] !== markSubmittedStable ||
    $[292] !== handleSubmit
  ) {
    queueSubmitHandler = () => {
      if (chordGestureSpent(undefined)) {
        return;
      }
      let inputValue = draft.value;
      markSubmittedStable(inputValue);
      handleSubmit(inputValue, true, undefined, true);
    };
    $[289] = chordGestureSpent;
    $[290] = draft.value;
    $[291] = markSubmittedStable;
    $[292] = handleSubmit;
    $[293] = queueSubmitHandler;
  } else queueSubmitHandler = $[293];
  let queueSubmit = queueSubmitHandler;
  let sendQueuedNow = submit.sendQueuedNow;
  let sendNowHandler;
  if (
    $[294] !== chordGestureSpent ||
    $[295] !== draft.mode ||
    $[296] !== draft.pastedContents ||
    $[297] !== draft.value ||
    $[298] !== markSubmittedStable ||
    $[299] !== handleSubmit ||
    $[300] !== sendQueuedNow ||
    $[301] !== store ||
    $[302] !== turn
  ) {
    sendNowHandler = () => {
      if (chordGestureSpent(undefined)) {
        return;
      }
      let inputValue = draft.value;
      let hasSubmitContent =
        inputValue.trim() !== "" || Object.values(draft.pastedContents).some(isImagePasteBlock);
      let mode = draft.mode;
      let activeAgentForInput = getActiveAgentForInput(store.getState());
      let id = activeAgentForInput.type === "named_agent" ? activeAgentForInput.task.id : undefined;
      let isLeaderPromptMode = mode === "prompt" && activeAgentForInput.type === "leader";
      let isNamedAgentPromptMode = mode === "prompt" && id !== undefined;
      if (!hasSubmitContent || store.getState().queueEditIndex !== null) {
        if (isLeaderPromptMode || isNamedAgentPromptMode) sendQueuedNow(mode, id);
        return;
      }
      let abortController = turn.getSnapshot().abortController;
      markSubmittedStable(inputValue);
      handleSubmit(inputValue, true, undefined, false, undefined, false, true)
        .then(() => {
          let requestAborted =
            abortController !== null && turn.getSnapshot().abortController === abortController;
          if ((isLeaderPromptMode && requestAborted) || isNamedAgentPromptMode) sendQueuedNow(mode, id);
        })
        .catch(logError);
    };
    $[294] = chordGestureSpent;
    $[295] = draft.mode;
    $[296] = draft.pastedContents;
    $[297] = draft.value;
    $[298] = markSubmittedStable;
    $[299] = handleSubmit;
    $[300] = sendQueuedNow;
    $[301] = store;
    $[302] = turn;
    $[303] = sendNowHandler;
  } else sendNowHandler = $[303];
  let sendNowAction = sendNowHandler;
  let cycleModeAction;
  if ($[304] !== cycleModeStable) {
    cycleModeAction = () =>
      cycleModeStable({
        kind: "carousel",
      });
    $[304] = cycleModeStable;
    $[305] = cycleModeAction;
  } else cycleModeAction = $[305];
  let extraMessageActionsA;
  let extraMessageActionsB;
  if ($[306] === MEMO_CACHE_SENTINEL) {
    extraMessageActionsA = {};
    extraMessageActionsB = {};
    $[306] = extraMessageActionsA;
    $[307] = extraMessageActionsB;
  } else {
    extraMessageActionsA = $[306];
    extraMessageActionsB = $[307];
  }
  let messageActions;
  if (
    $[308] !== openModelPickerStable ||
    $[309] !== queueSubmit ||
    $[310] !== sendNowAction ||
    $[311] !== toggleThinkingStable ||
    $[312] !== cycleModeAction
  ) {
    messageActions = {
      "chat:queueSubmit": queueSubmit,
      "chat:sendNow": sendNowAction,
      "chat:clearScreen": clearScreenStable,
      "chat:clearInput": clearScreenStable,
      "chat:modelPicker": openModelPickerStable,
      "chat:thinkingToggle": toggleThinkingStable,
      "chat:cycleMode": cycleModeAction,
      ...extraMessageActionsA,
      ...extraMessageActionsB,
    };
    $[308] = openModelPickerStable;
    $[309] = queueSubmit;
    $[310] = sendNowAction;
    $[311] = toggleThinkingStable;
    $[312] = cycleModeAction;
    $[313] = messageActions;
  } else messageActions = $[313];
  let messageActionsStable = messageActions;
  let isActionsActive = !isModalOverlayActive && !isSearching;
  let actionsArgs;
  if ($[314] !== isActionsActive || $[315] !== shadowedFooterActionHandler) {
    actionsArgs = {
      isActive: isActionsActive,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[314] = isActionsActive;
    $[315] = shadowedFooterActionHandler;
    $[316] = actionsArgs;
  } else actionsArgs = $[316];
  useFooterAwareMessageActions(messageActionsStable, actionsArgs);
  const isActive = isActionsActive && storeSelector_4 === "prompt";
  let sendNowKeyOptions;
  if ($[317] !== isActive) {
    sendNowKeyOptions = {
      context: "Chat",
      isActive,
    };
    $[317] = isActive;
    $[318] = sendNowKeyOptions;
  } else sendNowKeyOptions = $[318];
  useKeybinding(SEND_NOW_HINT_KEY, sendNowAction, sendNowKeyOptions);
  const isActive_2 = !isModalOverlayActive && !isSearching && !storeSelector_9 && !isHelpOpen;
  let successorKeyArgs;
  if ($[319] !== shadowedFooterActionHandler || $[320] !== isActive_2) {
    successorKeyArgs = {
      isActive: isActive_2,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[319] = shadowedFooterActionHandler;
    $[320] = isActive_2;
    $[321] = successorKeyArgs;
  } else successorKeyArgs = $[321];
  useSavedModelSuccessorKey(successorKeyArgs);
  const isActive_3 = !isModalOverlayActive && !isSearching;
  let effortStepArgs;
  if ($[322] !== shadowedFooterActionHandler || $[323] !== isActive_3) {
    effortStepArgs = {
      isActive: isActive_3,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[322] = shadowedFooterActionHandler;
    $[323] = isActive_3;
    $[324] = effortStepArgs;
  } else effortStepArgs = $[324];
  let effortStepKeys = useEffortStepKeys(transcript, effortStepArgs);
  let fastModeActions;
  if ($[325] !== toggleFastModeStable) {
    fastModeActions = {
      "chat:fastMode": toggleFastModeStable,
    };
    $[325] = toggleFastModeStable;
    $[326] = fastModeActions;
  } else fastModeActions = $[326];
  let isActive_4;
  if ($[327] !== isModalOverlayActive) {
    isActive_4 = !isModalOverlayActive && isFastModeEnabled() && isFastModeAvailable();
    $[327] = isModalOverlayActive;
    $[328] = isActive_4;
  } else isActive_4 = $[328];
  let fastModeArgs;
  if ($[329] !== shadowedFooterActionHandler || $[330] !== isActive_4) {
    fastModeArgs = {
      isActive: isActive_4,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[329] = shadowedFooterActionHandler;
    $[330] = isActive_4;
    $[331] = fastModeArgs;
  } else fastModeArgs = $[331];
  useFooterAwareMessageActions(fastModeActions, fastModeArgs);
  let dismissHelp;
  if ($[332] !== setHelpOpen) {
    dismissHelp = () => {
      setHelpOpen(false);
    };
    $[332] = setHelpOpen;
    $[333] = dismissHelp;
  } else dismissHelp = $[333];
  let helpKeyArgs;
  if ($[334] !== isHelpOpen) {
    helpKeyArgs = {
      context: "Help",
      isActive: isHelpOpen,
    };
    $[334] = isHelpOpen;
    $[335] = helpKeyArgs;
  } else helpKeyArgs = $[335];
  useKeybinding("help:dismiss", dismissHelp, helpKeyArgs);
  let openHistorySearch;
  if ($[336] !== addNotification || $[337] !== setHelpOpen) {
    openHistorySearch = () => {
      if (isRemoteSessionAvailable()) {
        addNotification({
          key: "remote-history-search-unavailable",
          kind: "feedback",
          text: "History search isn't available in cloud sessions yet",
          row1Hint: NOT_IN_CLOUD_SESSIONS,
          priority: "medium",
        });
        return;
      }
      setHistorySearchOpen(true);
      setHelpOpen(false);
    };
    $[336] = addNotification;
    $[337] = setHelpOpen;
    $[338] = openHistorySearch;
  } else openHistorySearch = $[338];
  let openHistorySearchStable = openHistorySearch;
  let isActive_5;
  if ($[339] !== isModalOverlayActive) {
    isActive_5 = isFullscreenActive() && !isModalOverlayActive;
    $[339] = isModalOverlayActive;
    $[340] = isActive_5;
  } else isActive_5 = $[340];
  let historySearchKeyArgs;
  if ($[341] !== isActive_5) {
    historySearchKeyArgs = {
      context: "Global",
      isActive: isActive_5,
    };
    $[341] = isActive_5;
    $[342] = historySearchKeyArgs;
  } else historySearchKeyArgs = $[342];
  useKeybinding("history:search", openHistorySearchStable, historySearchKeyArgs);
  function moveFooterUp() {
    if (footerTabMissing) {
      selectFooterTab(null);
      return;
    }
    if (tasksTabSelected && visibleAgentTaskCount > 0 && appState_11 > firstTaskIndex) {
      setCoordinatorTaskIndex(decrementIndex);
      return;
    }
    if (workflowsTabSelected && appState_15 > 0) {
      setWorkflowFooterIndex(decrementWorkflowIndex);
      return;
    }
    moveFooterSelectionStable(footerTabsEnabled, -1, true);
  }
  function moveFooterDown() {
    if (footerTabMissing) {
      if (visibleAgentTaskCount > 0) {
        selectFooterTab("tasks");
        setCoordinatorTaskIndex(0);
      } else selectFooterTab("workflows");
      return;
    }
    if (tasksTabSelected && visibleAgentTaskCount > 0) {
      if (appState_11 < visibleAgentTaskCount - 1) {
        setCoordinatorTaskIndex(incrementIndex);
        return;
      }
      moveFooterSelectionStable(footerTabsEnabled, 1);
      return;
    }
    if (tasksTabSelected) {
      if (!moveFooterSelectionStable(footerTabsEnabled, 1)) {
        chrome.openBashesDialog();
        selectFooterTab(null);
      }
      return;
    }
    if (workflowsTabSelected) {
      if (appState_15 < runningWorkflowIds_2.length - 1) {
        setWorkflowFooterIndex(incrementWorkflowIndex);
        return;
      }
      moveFooterSelectionStable(footerTabsEnabled, 1);
      return;
    }
    moveFooterSelectionStable(footerTabsEnabled, 1);
  }
  let dispatchCommandImpl;
  if ($[343] !== submit_2) {
    dispatchCommandImpl = (commandText) => {
      submit_2(commandText, NOOP_HELPERS, {
        fromKeybinding: true,
        inputModeOverride: "prompt",
        leavesIdeSelection: true,
      });
    };
    $[343] = submit_2;
    $[344] = dispatchCommandImpl;
  } else dispatchCommandImpl = $[344];
  let dispatchCommand = dispatchCommandImpl;
  let openArtifacts;
  if (
    $[345] !== addNotification ||
    $[346] !== cloudRowCheck ||
    $[347] !== submit_2 ||
    $[348] !== removeNotification ||
    $[349] !== store
  ) {
    openArtifacts = function openArtifacts() {
      if (isRemoteSessionAvailable()) {
        let { frameUrls } = store.getState();
        let frames = visibleArtifactFrames(frameUrls);
        if (frames.length > 1) {
          setWizardOpen(true);
          return;
        }
        let liveFrame = liveFramesForSlug(frameUrls, frames[0]?.slug);
        if (liveFrame !== undefined)
          openArtifactRow(
            liveFrame,
            store,
            {
              addNotification,
              removeNotification,
            },
            cloudRowCheck,
          );
        return;
      }
      submit_2("/artifacts", NOOP_HELPERS, {
        fromKeybinding: true,
        inputModeOverride: "prompt",
      });
    };
    $[345] = addNotification;
    $[346] = cloudRowCheck;
    $[347] = submit_2;
    $[348] = removeNotification;
    $[349] = store;
    $[350] = openArtifacts;
  } else openArtifacts = $[350];
  let openArtifactsStable = openArtifacts;
  let findSelectedTask;
  if ($[351] !== store) {
    findSelectedTask = function findSelectedTask() {
      let state = store.getState();
      let idleTeammatesExpanded = state.idleTeammatesExpanded ?? false;
      let selectedTaskId = ((idleTeammatesExpanded ? prevAgentRowIdsRef.current : undefined) ??
        prevTaskIdsRef.current)[state.coordinatorTaskIndex - 1];
      if (selectedTaskId === undefined) {
        return;
      }
      let visibleBackgroundTasks = getVisibleBackgroundTasks(
        state.tasks,
        state.taskDecorations,
        state.viewingAgentTaskId,
        idleTeammatesExpanded,
      );
      let found = visibleBackgroundTasks.find(
        (visibleBackgroundTask) => visibleBackgroundTask.id === selectedTaskId,
      );
      if (found) {
        return found;
      }
      return visibleBackgroundTasks.some(
        (visibleBackgroundTask) =>
          isAgentRowVisible(visibleBackgroundTask) && visibleBackgroundTask.taskIds.includes(selectedTaskId),
      )
        ? "folded"
        : undefined;
    };
    $[351] = store;
    $[352] = findSelectedTask;
  } else findSelectedTask = $[352];
  let findSelectedTaskStable = findSelectedTask;
  function footerNext() {
    moveFooterSelectionStable(footerTabs, 1);
  }
  function footerPrevious() {
    moveFooterSelectionStable(footerTabs, -1);
  }
  let footerOpenSelected;
  if (
    $[353] !== chrome ||
    $[354] !== visibleAgentTaskCount ||
    $[355] !== footerOwnsKeyCheck ||
    $[356] !== openArtifactsStable ||
    $[357] !== findSelectedTaskStable ||
    $[358] !== selectFooterTab ||
    $[359] !== setShowState ||
    $[360] !== setHelpOpen ||
    $[361] !== store
  ) {
    footerOpenSelected = () => {
      setHelpOpen(false);
      let state = store.getState();
      OIt: switch (footerOwnsKeyCheck() ? state.footerSelection : null) {
        case "tasks": {
          if (state.coordinatorTaskIndex >= 1) {
            let selectedTask = findSelectedTaskStable();
            if (selectedTask === undefined || selectedTask === "folded") {
              break OIt;
            }
            if (isAgentRowVisible(selectedTask)) setShowState(expandIdleTeammates);
            else enterTeammateView(selectedTask.id, setShowState);
          } else if (state.coordinatorTaskIndex === 0 && visibleAgentTaskCount > 0)
            exitTeammateView(setShowState);
          else {
            chrome.openBashesDialog();
            selectFooterTab(null);
          }
          break OIt;
        }
        case "workflows": {
          let workflowTask = selectWorkflowFooterTask(state);
          if (workflowTask) {
            logFeatureOk("workflow_progress_preview");
            setShowState((prevState) =>
              prevState.workflowDetail?.taskId === workflowTask.id
                ? prevState
                : {
                    ...prevState,
                    workflowDetail: {
                      taskId: workflowTask.id,
                      isCloudRun: "presence" in workflowTask,
                    },
                  },
            );
            selectFooterTab(null);
          }
          break OIt;
        }
        case "bagel": {
          break OIt;
        }
        case "bridge": {
          RemoteControlPill(store.getState());
          setBridgeDialogOpen(true);
          selectFooterTab(null);
          break OIt;
        }
        case "frame": {
          openArtifactsStable();
          selectFooterTab(null);
        }
      }
    };
    $[353] = chrome;
    $[354] = visibleAgentTaskCount;
    $[355] = footerOwnsKeyCheck;
    $[356] = openArtifactsStable;
    $[357] = findSelectedTaskStable;
    $[358] = selectFooterTab;
    $[359] = setShowState;
    $[360] = setHelpOpen;
    $[361] = store;
    $[362] = footerOpenSelected;
  } else footerOpenSelected = $[362];
  let footerClearSelection;
  if (
    $[363] !== clearQueueEditIndexAction ||
    $[364] !== isHelpOpen ||
    $[365] !== appState_13 ||
    $[366] !== selectFooterTab ||
    $[367] !== setShowState ||
    $[368] !== setHelpOpen ||
    $[369] !== store ||
    $[370] !== appState_12 ||
    $[371] !== tasks ||
    $[372] !== tasksTabSelected ||
    $[373] !== tasks_2
  ) {
    footerClearSelection = () => {
      if (tasksTabSelected && appState_13) {
        let visibleBackgroundTasks = getVisibleBackgroundTasks(tasks, appState_12, tasks_2, true);
        setShowState(collapseIdleTeammates);
        if (hasFoldedIdleTeammates(visibleBackgroundTasks, tasks_2)) {
          return;
        }
      }
      dismissPromptOverlay({
        store,
        clearQueueSelection: clearQueueEditIndexAction,
        helpOpen: isHelpOpen,
        setHelpOpen,
      });
      selectFooterTab(null);
    };
    $[363] = clearQueueEditIndexAction;
    $[364] = isHelpOpen;
    $[365] = appState_13;
    $[366] = selectFooterTab;
    $[367] = setShowState;
    $[368] = setHelpOpen;
    $[369] = store;
    $[370] = appState_12;
    $[371] = tasks;
    $[372] = tasksTabSelected;
    $[373] = tasks_2;
    $[374] = footerClearSelection;
  } else footerClearSelection = $[374];
  let footerClose;
  if (
    $[375] !== addNotification ||
    $[376] !== footerOwnsKeyCheck ||
    $[377] !== keybindingContext ||
    $[378] !== firstTaskIndex ||
    $[379] !== findSelectedTaskStable ||
    $[380] !== selectFooterTab ||
    $[381] !== session ||
    $[382] !== setShowState ||
    $[383] !== setCoordinatorTaskIndex ||
    $[384] !== storageV5 ||
    $[385] !== store ||
    $[386] !== taskStore
  ) {
    footerClose = () => {
      let state = store.getState();
      let footerSelection = footerOwnsKeyCheck() ? state.footerSelection : null;
      if (footerSelection === "tasks" && state.coordinatorTaskIndex >= 1) {
        let selectedTask = findSelectedTaskStable();
        if (!selectedTask) {
          return false;
        }
        if (selectedTask === "folded" || isAgentRowVisible(selectedTask)) {
          return;
        }
        if (isViewingThisAgent(selectedTask, state)) {
          let printableKey = getPrintableKey(keybindingContext?.singleKeyEvent() ?? null);
          if (printableKey !== null) composerHandleRef.current?.typeText(printableKey);
          return;
        }
        if (
          stopTask(selectedTask, taskStore, setShowState, {
            source: "user",
            session,
            storageV5,
          }) === "dismissed"
        )
          setCoordinatorTaskIndex((index) => Math.max(firstTaskIndex, index - 1));
        return;
      }
      if (footerSelection === "workflows") {
        let workflowTask = selectWorkflowFooterTask(state);
        if (!workflowTask) {
          return state.workflowFooterRunId === undefined ? false : undefined;
        }
        if ("presence" in workflowTask) {
          if (canStopRemoteWorkflow(state.remoteWorkerReportedGone)) {
            stopRemoteWorkflow(workflowTask.id, addNotification);
            selectFooterTab(null);
          }
          return;
        }
        stopWorkflowTask({
          taskId: workflowTask.id,
          taskStatus: workflowTask.status,
          taskRegistry: taskStore,
          setAppState: setShowState,
        });
        return;
      }
      return false;
    };
    $[375] = addNotification;
    $[376] = footerOwnsKeyCheck;
    $[377] = keybindingContext;
    $[378] = firstTaskIndex;
    $[379] = findSelectedTaskStable;
    $[380] = selectFooterTab;
    $[381] = session;
    $[382] = setShowState;
    $[383] = setCoordinatorTaskIndex;
    $[384] = storageV5;
    $[385] = store;
    $[386] = taskStore;
    $[387] = footerClose;
  } else footerClose = $[387];
  let footerDismiss;
  if ($[388] !== chrome || $[389] !== footerOwnsKeyCheck || $[390] !== selectFooterTab || $[391] !== store) {
    footerDismiss = () => {
      if ((footerOwnsKeyCheck() ? store.getState().footerSelection : null) === "ideSelection") {
        chrome.dismissIdeSelection();
        selectFooterTab(null);
        return;
      }
      return false;
    };
    $[388] = chrome;
    $[389] = footerOwnsKeyCheck;
    $[390] = selectFooterTab;
    $[391] = store;
    $[392] = footerDismiss;
  } else footerDismiss = $[392];
  let footerKeybindings;
  if (
    $[393] !== moveFooterDown ||
    $[394] !== footerNext ||
    $[395] !== footerPrevious ||
    $[396] !== moveFooterUp ||
    $[397] !== footerOpenSelected ||
    $[398] !== footerClearSelection ||
    $[399] !== footerClose ||
    $[400] !== footerDismiss
  ) {
    footerKeybindings = {
      "footer:up": moveFooterUp,
      "footer:down": moveFooterDown,
      "footer:next": footerNext,
      "footer:previous": footerPrevious,
      "footer:openSelected": footerOpenSelected,
      "footer:clearSelection": footerClearSelection,
      "footer:close": footerClose,
      "footer:dismiss": footerDismiss,
    };
    $[393] = moveFooterDown;
    $[394] = footerNext;
    $[395] = footerPrevious;
    $[396] = moveFooterUp;
    $[397] = footerOpenSelected;
    $[398] = footerClearSelection;
    $[399] = footerClose;
    $[400] = footerDismiss;
    $[401] = footerKeybindings;
  } else footerKeybindings = $[401];
  const isActive_6 = !!activeFooterTab && !isModalOverlayActive;
  let footerKeyArgs;
  if ($[402] !== isActive_6) {
    footerKeyArgs = {
      context: "Footer",
      isActive: isActive_6,
    };
    $[402] = isActive_6;
    $[403] = footerKeyArgs;
  } else footerKeyArgs = $[403];
  MessageActionsKeybindings(footerKeybindings, footerKeyArgs);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let fastModeCooldownActive = useFastModeCooldownActive();
  let isFastModeOnForRequestedModel;
  if ($[404] !== fastModeCooldownActive || $[405] !== model || $[406] !== mainLoopModel) {
    isFastModeOnForRequestedModel = () =>
      isFastModeOnForRequestModel(model, fastModeCooldownActive, mainLoopModel);
    $[404] = fastModeCooldownActive;
    $[405] = model;
    $[406] = mainLoopModel;
    $[407] = isFastModeOnForRequestedModel;
  } else isFastModeOnForRequestedModel = $[407];
  let fastModeSignals = useSyncExternalStore(
    onFastRejectedFallbackModelsChanged,
    isFastModeOnForRequestedModel,
  );
  let showFastIconHint = useShowFastIconHint(fastModeSignals ?? false);
  let fastModeTag;
  if (
    $[408] !== fastModeCooldownActive ||
    $[409] !== isScreenReaderEnabled ||
    $[410] !== fastModeSignals ||
    $[411] !== showFastIconHint
  ) {
    fastModeTag = fastModeSignals
      ? isScreenReaderEnabled
        ? fastModeCooldownActive
          ? "fast mode (cooling down)"
          : "fast mode"
        : showFastIconHint
          ? `${getFastIconString(true, fastModeCooldownActive)} ${sequential.reset.dim("/fast")}`
          : getFastIconString(true, fastModeCooldownActive)
      : undefined;
    $[408] = fastModeCooldownActive;
    $[409] = isScreenReaderEnabled;
    $[410] = fastModeSignals;
    $[411] = showFastIconHint;
    $[412] = fastModeTag;
  } else fastModeTag = $[412];
  let fastModeTagStable = fastModeTag;
  let isEffortShown = isEffortIndicatorShown(level, mainLoopModel, isBriefOnly);
  let isEffortShownStable = isEffortShown;
  let statusField = useStatusField("sentEffort");
  let statusField_2 = useStatusField("turnEffort");
  let isUltracodeOn;
  if ($[413] !== isBriefOnly || $[414] !== mainLoopModel || $[415] !== appState_9) {
    isUltracodeOn = !isBriefOnly && isUltracodeActive(appState_9, mainLoopModel);
    $[413] = isBriefOnly;
    $[414] = mainLoopModel;
    $[415] = appState_9;
    $[416] = isUltracodeOn;
  } else isUltracodeOn = $[416];
  let ultraEffortActive = isUltracodeOn;
  let refusalSettingsTag = useSyncExternalStore(onRefusalSettingsChange, noopOutputHandler);
  let options = useUltracodeShimmer(ultraEffortActive && !isScreenReaderEnabled);
  let ultraEffortTag;
  let topBorderText;
  if (
    $[417] !== fastModeTagStable ||
    $[418] !== refusalSettingsTag ||
    $[419] !== options ||
    $[420] !== ultraEffortActive
  ) {
    let ultraTag = treeify(ultraEffortActive, options);
    ultraEffortTag = ultraTag;
    topBorderText = buildBorderText([ultraTag, fastModeTagStable, refusalSettingsTag]);
    $[417] = fastModeTagStable;
    $[418] = refusalSettingsTag;
    $[419] = options;
    $[420] = ultraEffortActive;
    $[421] = ultraEffortTag;
    $[422] = topBorderText;
  } else {
    ultraEffortTag = $[421];
    topBorderText = $[422];
  }
  let borderProps;
  if ($[423] !== ultraEffortTag || $[424] !== topBorderText) {
    borderProps = {
      ultraEffortTag,
      topBorderText,
    };
    $[423] = ultraEffortTag;
    $[424] = topBorderText;
    $[425] = borderProps;
  } else borderProps = $[425];
  let { ultraEffortTag: ultraEffortTag_2, topBorderText: topBorderText_2 } = borderProps;
  let effortStatus = effortStatusText(
    isEffortShown,
    ultraEffortActive,
    isScreenReaderEnabled,
    false,
    isEffortShownStable,
  );
  let supportsPerTurnEffort =
    statusField !== null &&
    statusField_2 === null &&
    statusField !== isEffortShown &&
    modelSupportsPerTurnEffortControl(mainLoopModel);
  let effortStatusText_2 = effortStatusText(
    isEffortShown,
    ultraEffortActive,
    isScreenReaderEnabled,
    supportsPerTurnEffort,
    isEffortShownStable,
  );
  let syncEffortNotice;
  if (
    $[426] !== addNotification ||
    $[427] !== supportsPerTurnEffort ||
    $[428] !== effortStatusText_2 ||
    $[429] !== removeNotification ||
    $[430] !== store
  ) {
    syncEffortNotice = () => {
      let { current: notification, queue } = store.getState().notifications;
      let any = [notification, ...queue].some(isEffortLevelNotice);
      if (!supportsPerTurnEffort) removeNotification(EFFORT_LEVEL_KEY);
      else if (any && effortStatusText_2) {
        removeNotification(EFFORT_LEVEL_KEY);
        addNotification({
          key: EFFORT_LEVEL_KEY,
          kind: "feedback",
          text: effortStatusText_2,
          priority: "high",
          timeoutMs: 1e4,
        });
      }
    };
    $[426] = addNotification;
    $[427] = supportsPerTurnEffort;
    $[428] = effortStatusText_2;
    $[429] = removeNotification;
    $[430] = store;
    $[431] = syncEffortNotice;
  } else syncEffortNotice = $[431];
  let syncEffortDeps;
  if (
    $[432] !== addNotification ||
    $[433] !== supportsPerTurnEffort ||
    $[434] !== removeNotification ||
    $[435] !== store
  ) {
    syncEffortDeps = [supportsPerTurnEffort, store, addNotification, removeNotification];
    $[432] = addNotification;
    $[433] = supportsPerTurnEffort;
    $[434] = removeNotification;
    $[435] = store;
    $[436] = syncEffortDeps;
  } else syncEffortDeps = $[436];
  useEffect(syncEffortNotice, syncEffortDeps);
  let showEffortNotice;
  if (
    $[437] !== addNotification ||
    $[438] !== effortStatus ||
    $[439] !== effortStatusText_2 ||
    $[440] !== removeNotification
  ) {
    showEffortNotice = () => {
      if (!effortStatus) {
        removeNotification(EFFORT_LEVEL_KEY);
        return;
      }
      removeNotification(EFFORT_LEVEL_KEY);
      addNotification({
        key: EFFORT_LEVEL_KEY,
        kind: "feedback",
        text: effortStatusText_2 ?? effortStatus,
        priority: "high",
        timeoutMs: 1e4,
      });
    };
    $[437] = addNotification;
    $[438] = effortStatus;
    $[439] = effortStatusText_2;
    $[440] = removeNotification;
    $[441] = showEffortNotice;
  } else showEffortNotice = $[441];
  let showEffortDeps;
  if ($[442] !== addNotification || $[443] !== effortStatus || $[444] !== removeNotification) {
    showEffortDeps = [effortStatus, addNotification, removeNotification];
    $[442] = addNotification;
    $[443] = effortStatus;
    $[444] = removeNotification;
    $[445] = showEffortDeps;
  } else showEffortDeps = $[445];
  useEffect(showEffortNotice, showEffortDeps);
  useMaxEffortNotice(isEffortShown);
  let placeholder = shouldMarkSuggestionShown && suggestion_2 ? suggestion_2 : promptInputPlaceholder;
  let modelSwitchGeneration = useRef(0);
  let applyModelSwitch;
  if (
    $[446] !== addNotification ||
    $[447] !== session ||
    $[448] !== setShowState ||
    $[449] !== storageV5 ||
    $[450] !== store
  ) {
    applyModelSwitch = async (model, hookMessages, saveAsDefault, effortSetting, generation) => {
      let wasFastMode = false;
      let willBeFastMode = false;
      if (effortSetting !== undefined)
        persistEffortSetting(effortSetting, resolveRequestedModel(model), saveAsDefault, storageV5);
      clearRefusalFallbackModelLatch();
      if (isFastModeEnabled()) clearFastModeCooldown();
      recordSwitchIfChanged(session, store.getState(), model, "picker");
      setShowState((prevState) => {
        wasFastMode = !!prevState.fastMode;
        willBeFastMode = isFastModeEnabled() ? isFastModeActive(model, prevState.fastMode) : wasFastMode;
        return {
          ...prevState,
          mainLoopModel: model,
          mainLoopModelForSession: null,
          ...(effortSetting !== undefined && {
            sessionEffort: levelEffortSetting(effortSetting),
          }),
          ...(willBeFastMode !== wasFastMode && {
            fastMode: willBeFastMode,
          }),
        };
      });
      reportFastModeToggle(wasFastMode, willBeFastMode);
      let saveResult = saveAsDefault ? await setDefaultModel(model, storageV5) : null;
      let saveFailed = saveResult?.kind === "failed";
      if (generation !== modelSwitchGeneration.current) {
        return saveFailed;
      }
      let message = `Model set to ${modelDisplayString(model)}${saveResult?.kind === "saved" ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
      message = message + formatFastModeSuffix(wasFastMode, willBeFastMode, model);
      message = message + describeDefaultSaved(saveResult);
      if (hookMessages.length > 0)
        message = message + ` \xB7 ${hookMessages.map(sanitizeHookText).join(" \xB7 ")}`;
      addNotification({
        key: "model-switched",
        kind: "feedback",
        segments: [
          {
            text: message,
          },
        ],
        priority: "immediate",
        timeoutMs: saveResult === null || saveResult.kind === "saved" ? 3000 : undefined,
      });
      logEvent("tengu_model_picker_hotkey", {
        model: telemetrySafeModelName(model),
      });
      return saveFailed;
    };
    $[446] = addNotification;
    $[447] = session;
    $[448] = setShowState;
    $[449] = storageV5;
    $[450] = store;
    $[451] = applyModelSwitch;
  } else applyModelSwitch = $[451];
  let applyModelSwitchStable = applyModelSwitch;
  let isSavedPick = useRef(false);
  let onSelectModel;
  if (
    $[452] !== addNotification ||
    $[453] !== applyModelSwitchStable ||
    $[454] !== session ||
    $[455] !== setShowState ||
    $[456] !== storageV5 ||
    $[457] !== store
  ) {
    onSelectModel = (model, saveAsDefault) => {
      let wasSavedPick = isSavedPick.current;
      isSavedPick.current = false;
      let generation = (modelSwitchGeneration.current = modelSwitchGeneration.current + 1);
      setModelPickerOpen(false);
      serializeModelSwitch(session, () => runPreModelSwitchHooks(session, store.getState, model, "picker"))
        .then((decisionResult) => {
          if (generation !== modelSwitchGeneration.current) {
            return;
          }
          if (decisionResult.decision !== "proceed") {
            logFeatureSad("model_switch", "blocked_by_hook");
            addNotification({
              key: "model-switch-blocked",
              kind: "warning",
              text: preModelSwitchBlockedMessage(
                model,
                decisionResult.decision === "ask"
                  ? `${decisionResult.reason ?? "confirmation required"} (use /model to confirm)`
                  : decisionResult.reason,
                decisionResult.messages,
              ),
              color: "warning",
              priority: "immediate",
            });
            return;
          }
          if (!wasSavedPick) {
            return applyModelSwitchStable(
              model,
              decisionResult.messages,
              false,
              saveAsDefault,
              generation,
            ).then(noopReplyHandler);
          }
          let effectiveBefore = effectiveModelForContext(store.getState());
          return savedModelPickReply(
            model,
            {
              getAppState: store.getState,
              setAppState: setShowState,
              session,
              storageV5,
              options: {
                mcpClients: [],
              },
            },
            () =>
              applyModelSwitchStable(model, decisionResult.messages, true, saveAsDefault, generation).then(
                unsavedTextState,
              ),
            {
              persistsOffBox: isNotOffBox,
              isSuperseded: () => generation !== modelSwitchGeneration.current,
              hasModelMoved: () => effectiveModelForContext(store.getState()) !== effectiveBefore,
            },
          ).then((reply) => {
            let { text, isRefusal, rewrittenTo } = reply;
            if (generation !== modelSwitchGeneration.current) {
              return;
            }
            if (isRefusal)
              addNotification({
                key: "model-switch-blocked",
                kind: "warning",
                text,
                color: "warning",
                priority: "immediate",
              });
            else if (rewrittenTo !== undefined)
              addNotification({
                key: "model-switched",
                kind: "feedback",
                segments: [
                  {
                    text: `Model set to ${modelDisplayString(rewrittenTo)}${SAVED_AS_DEFAULT_SUFFIX}`,
                  },
                ],
                priority: "immediate",
              });
          });
        })
        .catch((error) => {
          logError(toError(error));
          addNotification({
            key: "model-switch-blocked",
            kind: "warning",
            text: `Model switch failed: ${sanitizeHookText(errorMessage(error))}`,
            color: "warning",
            priority: "immediate",
          });
        });
    };
    $[452] = addNotification;
    $[453] = applyModelSwitchStable;
    $[454] = session;
    $[455] = setShowState;
    $[456] = storageV5;
    $[457] = store;
    $[458] = onSelectModel;
  } else onSelectModel = $[458];
  let onSelect = onSelectModel;
  let onCancelModelPicker;
  if ($[459] === MEMO_CACHE_SENTINEL) {
    onCancelModelPicker = () => {
      isSavedPick.current = false;
      setModelPickerOpen(false);
    };
    $[459] = onCancelModelPicker;
  } else onCancelModelPicker = $[459];
  let onCancel = onCancelModelPicker;
  let resolvedModel;
  if ($[460] !== appState_7 || $[461] !== appState_6) {
    resolvedModel = useMainLoopModel({
      mainLoopModel: appState_6,
      mainLoopModelForSession: appState_7,
    });
    $[460] = appState_7;
    $[461] = appState_6;
    $[462] = resolvedModel;
  } else resolvedModel = $[462];
  let activeModel = resolvedModel;
  let fastModeOnForModel = useFastModeOnForModel(model, activeModel);
  let modelPickerElement;
  FIt: {
    if (!isModelPickerOpen) {
      modelPickerElement = null;
      break FIt;
    }
    let onSetDefault;
    if ($[463] === MEMO_CACHE_SENTINEL) {
      onSetDefault = (model) => {
        if (hasLadderForSetting(model)) {
          return;
        }
        isSavedPick.current = true;
      };
      $[463] = onSetDefault;
    } else onSetDefault = $[463];
    let showFastModeNotice;
    if ($[464] !== fastModeOnForModel || $[465] !== activeModel) {
      showFastModeNotice =
        isFastModeEnabled() && fastModeOnForModel && supportsFastMode(activeModel) && isFastModeAvailable();
      $[464] = fastModeOnForModel;
      $[465] = activeModel;
      $[466] = showFastModeNotice;
    } else showFastModeNotice = $[466];
    let pickerBox;
    if (
      $[467] !== onSelect ||
      $[468] !== appState_7 ||
      $[469] !== appState_6 ||
      $[470] !== showFastModeNotice
    ) {
      pickerBox = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(ModelPicker, {
          initial: appState_6,
          sessionModel: appState_7,
          onSelect,
          onSetDefault,
          onCancel,
          isStandaloneCommand: true,
          showFastModeNotice,
        }),
      });
      $[467] = onSelect;
      $[468] = appState_7;
      $[469] = appState_6;
      $[470] = showFastModeNotice;
      $[471] = pickerBox;
    } else pickerBox = $[471];
    modelPickerElement = pickerBox;
  }
  let modelPickerBox = modelPickerElement;
  let showFastModeResult;
  if ($[472] !== addNotification) {
    showFastModeResult = (resultText) => {
      setFastModePickerState(null);
      if (resultText)
        addNotification({
          key: "fast-mode-toggled",
          kind: "feedback",
          segments: [
            {
              text: boldDirectMemberMessage(resultText),
            },
          ],
          priority: "immediate",
          timeoutMs: 3000,
        });
    };
    $[472] = addNotification;
    $[473] = showFastModeResult;
  } else showFastModeResult = $[473];
  let onDone = showFastModeResult;
  let fastModePickerBox;
  fy: {
    if (!fastModePickerState) {
      fastModePickerBox = null;
      break fy;
    }
    let fastModeBox;
    if ($[474] !== fastModePickerState.unavailableReason || $[475] !== onDone || $[476] !== storageV5) {
      fastModeBox = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(FastModePicker, {
          onDone,
          unavailableReason: fastModePickerState.unavailableReason,
          storageV5,
        }),
      });
      $[474] = fastModePickerState.unavailableReason;
      $[475] = onDone;
      $[476] = storageV5;
      $[477] = fastModeBox;
    } else fastModeBox = $[477];
    fastModePickerBox = fastModeBox;
  }
  let fastModePickerColumn = fastModePickerBox;
  let toggleThinkingHandler;
  if ($[478] !== addNotification || $[479] !== setShowState) {
    toggleThinkingHandler = (enabled) => {
      setShowState((prevState) => ({
        ...prevState,
        thinkingEnabled: enabled,
      }));
      setThinkingToggleOpen(false);
      getRemoteCaps()
        ?.sendControlRequest({
          subtype: "set_max_thinking_tokens",
          max_thinking_tokens: enabled ? null : 0,
        })
        .catch(logSetMaxThinkingTokensFailure);
      logEvent("tengu_thinking_toggled_hotkey", {
        enabled,
      });
      logFeatureOk("thinking_toggle");
      addNotification({
        key: "thinking-toggled-hotkey",
        kind: "feedback",
        text: `Thinking ${enabled ? "on" : "off"}`,
        row1Hint: `thinking ${enabled ? "on" : "off"}`,
        ...(enabled && {
          color: "suggestion",
        }),
        priority: "immediate",
        timeoutMs: 3000,
      });
    };
    $[478] = addNotification;
    $[479] = setShowState;
    $[480] = toggleThinkingHandler;
  } else toggleThinkingHandler = $[480];
  let onSelect_2 = toggleThinkingHandler;
  let closeThinkingToggle;
  if ($[481] === MEMO_CACHE_SENTINEL) {
    closeThinkingToggle = () => {
      setThinkingToggleOpen(false);
    };
    $[481] = closeThinkingToggle;
  } else closeThinkingToggle = $[481];
  let onCancel_2 = closeThinkingToggle;
  let thinkingBox;
  x8o: {
    if (!isThinkingToggleOpen) {
      thinkingBox = null;
      break x8o;
    }
    const currentValue = appState_8 ?? true;
    let thinkingElement;
    if ($[482] !== onSelect_2 || $[483] !== isMidConversation || $[484] !== currentValue) {
      thinkingElement = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(ThinkingToggle, {
          currentValue,
          onSelect: onSelect_2,
          onCancel: onCancel_2,
          isMidConversation,
        }),
      });
      $[482] = onSelect_2;
      $[483] = isMidConversation;
      $[484] = currentValue;
      $[485] = thinkingElement;
    } else thinkingElement = $[485];
    thinkingBox = thinkingElement;
  }
  let thinkingToggleBox = thinkingBox;
  let onboardingDialog;
  if ($[486] !== showEnvOnboarding || $[487] !== onAccept || $[488] !== dismissEnvOnboardingStable) {
    onboardingDialog = showEnvOnboarding
      ? jsxProd_default(AutoModeEnvOnboardingDialog, {
          onAccept,
          onLater: dismissEnvOnboardingStable,
          onDismiss: dismissEnvOnboardingStable,
        })
      : null;
    $[486] = showEnvOnboarding;
    $[487] = onAccept;
    $[488] = dismissEnvOnboardingStable;
    $[489] = onboardingDialog;
  } else onboardingDialog = $[489];
  let onboardingDialogStable = onboardingDialog;
  useFullscreenDialogSlot(isFullscreen ? onboardingDialogStable : null);
  let ref = useFullscreenAnchor();
  let modeIndicatorElement;
  if (
    $[490] !== storeSelector_5 ||
    $[491] !== storeSelector_4 ||
    $[492] !== viewingAgentName ||
    $[493] !== viewingAgentColor
  ) {
    modeIndicatorElement = jsxProd_default(PromptInputModeIndicator, {
      mode: storeSelector_4,
      isLoading: storeSelector_5,
      viewingAgentName,
      viewingAgentColor,
    });
    $[490] = storeSelector_5;
    $[491] = storeSelector_4;
    $[492] = viewingAgentName;
    $[493] = viewingAgentColor;
    $[494] = modeIndicatorElement;
  } else modeIndicatorElement = $[494];
  let modeIndicator = modeIndicatorElement;
  let dialogElement = null;
  let workflowTask = taskId ? tasks[taskId] : undefined;
  let onWorkflowDone;
  if ($[495] !== addNotification || $[496] !== setShowState) {
    onWorkflowDone = (errorText) => {
      if (errorText)
        addNotification({
          key: "workflow-save-result",
          kind: "feedback",
          text: errorText,
          priority: "high",
          timeoutMs: 8000,
        });
      setShowState(clearFooterSelection);
    };
    $[495] = addNotification;
    $[496] = setShowState;
    $[497] = onWorkflowDone;
  } else onWorkflowDone = $[497];
  let onWorkflowDoneStable = onWorkflowDone;
  if (workflowTask && workflowTask.type === "local_workflow") {
    let isWorkflowRunning = workflowTask.status === "running";
    const initialPhaseIndex = appState_3?.phaseIndex;
    let onKill;
    if ($[498] !== isWorkflowRunning || $[499] !== taskStore || $[500] !== workflowTask.id) {
      onKill = isWorkflowRunning ? () => killWorkflowTask_2(workflowTask.id, taskStore, "user") : undefined;
      $[498] = isWorkflowRunning;
      $[499] = taskStore;
      $[500] = workflowTask.id;
      $[501] = onKill;
    } else onKill = $[501];
    let onPause;
    if ($[502] !== isWorkflowRunning || $[503] !== taskStore || $[504] !== workflowTask.id) {
      onPause = isWorkflowRunning ? () => pauseWorkflowTask_2(workflowTask.id, taskStore) : undefined;
      $[502] = isWorkflowRunning;
      $[503] = taskStore;
      $[504] = workflowTask.id;
      $[505] = onPause;
    } else onPause = $[505];
    let onResume;
    if ($[506] !== onWorkflowDoneStable || $[507] !== handleSubmit) {
      onResume = (input) => {
        onWorkflowDoneStable();
        handleSubmit(input, true, undefined, false, undefined, true);
      };
      $[506] = onWorkflowDoneStable;
      $[507] = handleSubmit;
      $[508] = onResume;
    } else onResume = $[508];
    let onSkipAgent;
    if ($[509] !== isWorkflowRunning || $[510] !== taskStore || $[511] !== workflowTask.id) {
      onSkipAgent = isWorkflowRunning
        ? (agentId) => skipWorkflowAgent_2(workflowTask.id, agentId, taskStore)
        : undefined;
      $[509] = isWorkflowRunning;
      $[510] = taskStore;
      $[511] = workflowTask.id;
      $[512] = onSkipAgent;
    } else onSkipAgent = $[512];
    let onRetryAgent;
    if ($[513] !== isWorkflowRunning || $[514] !== taskStore || $[515] !== workflowTask.id) {
      onRetryAgent = isWorkflowRunning
        ? (agentId) => retryWorkflowAgent_2(workflowTask.id, agentId, taskStore)
        : undefined;
      $[513] = isWorkflowRunning;
      $[514] = taskStore;
      $[515] = workflowTask.id;
      $[516] = onRetryAgent;
    } else onRetryAgent = $[516];
    let workflowDialog;
    if (
      $[517] !== onWorkflowDoneStable ||
      $[518] !== initialPhaseIndex ||
      $[519] !== onKill ||
      $[520] !== onPause ||
      $[521] !== onResume ||
      $[522] !== onSkipAgent ||
      $[523] !== onRetryAgent ||
      $[524] !== workflowTask
    ) {
      workflowDialog = jsxProd_default(WorkflowDetailDialog_2, {
        workflow: workflowTask,
        initialPhaseIndex,
        onDone: onWorkflowDoneStable,
        onKill,
        onPause,
        onResume,
        onSkipAgent,
        onRetryAgent,
      });
      $[517] = onWorkflowDoneStable;
      $[518] = initialPhaseIndex;
      $[519] = onKill;
      $[520] = onPause;
      $[521] = onResume;
      $[522] = onSkipAgent;
      $[523] = onRetryAgent;
      $[524] = workflowTask;
      $[525] = workflowDialog;
    } else workflowDialog = $[525];
    dialogElement = workflowDialog;
  } else if (appState_3?.isCloudRun) {
    let onDone;
    if ($[526] !== onWorkflowDoneStable) {
      onDone = () => onWorkflowDoneStable();
      $[526] = onWorkflowDoneStable;
      $[527] = onDone;
    } else onDone = $[527];
    let cloudWorkflowsDialog;
    if ($[528] !== onDone || $[529] !== appState_3.taskId) {
      cloudWorkflowsDialog = jsxProd_default(CloudWorkflowsDialog, {
        initialRunId: appState_3.taskId,
        onDone,
        promptVisibleBelow: false,
      });
      $[528] = onDone;
      $[529] = appState_3.taskId;
      $[530] = cloudWorkflowsDialog;
    } else cloudWorkflowsDialog = $[530];
    dialogElement = cloudWorkflowsDialog;
  } else if (storeSelector && tasksFooterVisible) {
    let cloudTasksDialog;
    if ($[531] !== chrome.closeBashesDialog) {
      cloudTasksDialog = jsxProd_default(CloudTasksDialog, {
        onDone: chrome.closeBashesDialog,
      });
      $[531] = chrome.closeBashesDialog;
      $[532] = cloudTasksDialog;
    } else cloudTasksDialog = $[532];
    dialogElement = cloudTasksDialog;
  } else if (storeSelector) {
    const onDone = chrome.closeBashesDialog;
    let tools;
    if ($[533] !== scope) {
      tools = scope.computeTools();
      $[533] = scope;
      $[534] = tools;
    } else tools = $[534];
    const initialDetailTaskId = typeof storeSelector === "string" ? storeSelector : undefined;
    let backgroundTasksDialog;
    if (
      $[535] !== chrome.closeBashesDialog ||
      $[536] !== commandQueueOrDefault ||
      $[537] !== scope.commands ||
      $[538] !== session ||
      $[539] !== storageV5 ||
      $[540] !== tools ||
      $[541] !== initialDetailTaskId ||
      $[542] !== verbose
    ) {
      backgroundTasksDialog = jsxProd_default(BackgroundTasksDialog, {
        onDone,
        storageV5,
        session,
        messageQueue: commandQueueOrDefault,
        tools,
        commands: scope.commands,
        verbose,
        initialDetailTaskId,
      });
      $[535] = chrome.closeBashesDialog;
      $[536] = commandQueueOrDefault;
      $[537] = scope.commands;
      $[538] = session;
      $[539] = storageV5;
      $[540] = tools;
      $[541] = initialDetailTaskId;
      $[542] = verbose;
      $[543] = backgroundTasksDialog;
    } else backgroundTasksDialog = $[543];
    dialogElement = backgroundTasksDialog;
  } else if (isFullscreenActive() && isHistorySearchOpen) {
    let onSelect;
    if (
      $[544] !== draft ||
      $[545] !== setMode ||
      $[546] !== setCursorOffset ||
      $[547] !== setValue ||
      $[548] !== setPastedContents
    ) {
      onSelect = (entry) => {
        let renumbered = renumberPastedContents({
          display: entry.display,
          pastedContents: entry.pastedContents,
        });
        let modeFromInput = getModeFromInput_2(renumbered.display);
        let strippedDisplay = stripModePrefix(renumbered.display);
        setMode(modeFromInput);
        draft.attribute(historyPromptOrigin, () => setValue(strippedDisplay));
        setPastedContents(renumbered.pastedContents);
        setCursorOffset(strippedDisplay.length);
        setHistorySearchOpen(false);
      };
      $[544] = draft;
      $[545] = setMode;
      $[546] = setCursorOffset;
      $[547] = setValue;
      $[548] = setPastedContents;
      $[549] = onSelect;
    } else onSelect = $[549];
    let onCancel;
    if ($[550] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setHistorySearchOpen(false);
      $[550] = onCancel;
    } else onCancel = $[550];
    let historySearchDialog;
    if ($[551] !== draft.value || $[552] !== onSelect) {
      historySearchDialog = jsxProd_default(HistorySearchDialog, {
        initialQuery: draft.value,
        onSelect,
        onCancel,
      });
      $[551] = draft.value;
      $[552] = onSelect;
      $[553] = historySearchDialog;
    } else historySearchDialog = $[553];
    dialogElement = historySearchDialog;
  } else if (modelPickerBox) dialogElement = modelPickerBox;
  else if (fastModePickerColumn) dialogElement = fastModePickerColumn;
  else if (thinkingToggleBox) dialogElement = thinkingToggleBox;
  else if (effortStepKeys !== null) dialogElement = effortStepKeys;
  else if (isWizardOpen) {
    let onDone;
    if ($[554] === MEMO_CACHE_SENTINEL) {
      onDone = () => setWizardOpen(false);
      $[554] = onDone;
    } else onDone = $[554];
    let wizardFooter;
    if ($[555] !== cloudRowCheck) {
      wizardFooter = jsxProd_default(WizardNavigationFooter, {
        onDone,
        cloudRowCheck,
      });
      $[555] = cloudRowCheck;
      $[556] = wizardFooter;
    } else wizardFooter = $[556];
    dialogElement = wizardFooter;
  } else if (isBridgeDialogOpen) {
    let bridgeDialog;
    if ($[557] !== selectFooterTab) {
      bridgeDialog = jsxProd_default(BridgeDialog, {
        onDone: () => {
          setBridgeDialogOpen(false);
          selectFooterTab(null);
        },
      });
      $[557] = selectFooterTab;
      $[558] = bridgeDialog;
    } else bridgeDialog = $[558];
    dialogElement = bridgeDialog;
  } else if (isExternalEditorActive) {
    let editorWaitNotice;
    if ($[559] !== columns || $[560] !== storeSelector_4) {
      editorWaitNotice = jsxProd_default(EditorWaitNotice, {
        mode: storeSelector_4,
        columns,
      });
      $[559] = columns;
      $[560] = storeSelector_4;
      $[561] = editorWaitNotice;
    } else editorWaitNotice = $[561];
    dialogElement = editorWaitNotice;
  }
  let inputTakesFocus = dialogElement === null && !isSearching && !isModalOverlayActive;
  let isInputRowReplaced =
    dialogElement !== null || isOverlayOpen || appState_2 !== null || activeFooterTab !== null;
  let inputRowReplacedEffect;
  let inputRowReplacedDeps;
  if ($[562] !== draft || $[563] !== isInputRowReplaced) {
    inputRowReplacedEffect = () => {
      draft.setInputRowReplaced(isInputRowReplaced);
      return () => draft.setInputRowReplaced(false);
    };
    inputRowReplacedDeps = [isInputRowReplaced, draft];
    $[562] = draft;
    $[563] = isInputRowReplaced;
    $[564] = inputRowReplacedEffect;
    $[565] = inputRowReplacedDeps;
  } else {
    inputRowReplacedEffect = $[564];
    inputRowReplacedDeps = $[565];
  }
  useEffect(inputRowReplacedEffect, inputRowReplacedDeps);
  const hidden = dialogElement !== null;
  let onOpenHistorySearch;
  if ($[566] !== openSearch || $[567] !== openHistorySearchStable) {
    onOpenHistorySearch = isFullscreenActive() ? openHistorySearchStable : openSearch;
    $[566] = openSearch;
    $[567] = openHistorySearchStable;
    $[568] = onOpenHistorySearch;
  } else onOpenHistorySearch = $[568];
  const footerItemSelected = activeFooterTab !== null;
  let promptInputElement;
  if (
    $[569] !== chordGestureSpent ||
    $[570] !== chrome ||
    $[571] !== dispatchCommand ||
    $[572] !== draft ||
    $[573] !== embedded ||
    $[574] !== onHistoryDownPastEnd_2 ||
    $[575] !== fastModeCooldownActive ||
    $[576] !== fastModeTagStable ||
    $[577] !== shadowedFooterActionHandler ||
    $[578] !== isHelpOpen ||
    $[579] !== historyFailedMatch ||
    $[580] !== historyMatch ||
    $[581] !== historyQuery ||
    $[582] !== handleKeyDown ||
    $[583] !== ideSelection ||
    $[584] !== promptChromeRows ||
    $[585] !== inputTakesFocus ||
    $[586] !== refusalSettingsTag ||
    $[587] !== isModalOverlayActive ||
    $[588] !== isSearching ||
    $[589] !== leftArrowGesture ||
    $[590] !== markAccepted ||
    $[591] !== modeIndicator ||
    $[592] !== handleSubmit ||
    $[593] !== placeholder ||
    $[594] !== scope ||
    $[595] !== setHelpOpen ||
    $[596] !== suggestionsStore ||
    $[597] !== hidden ||
    $[598] !== onOpenHistorySearch ||
    $[599] !== footerItemSelected ||
    $[600] !== takeEnter ||
    $[601] !== toggleHelpStable ||
    $[602] !== topBorderText_2 ||
    $[603] !== transcript ||
    $[604] !== turn ||
    $[605] !== ultraEffortTag_2
  ) {
    promptInputElement = jsxProd_default(
      MemoizedPromptInput,
      {
        ref: composerHandleRef,
        draft,
        transcript,
        scope,
        turn,
        chrome,
        suggestionsStore,
        hidden,
        inputTakesFocus,
        takePendingPastes,
        takeEnter,
        embedded,
        onSubmit: handleSubmit,
        dispatchCommand,
        chordGestureSpent,
        markAccepted,
        isSearchingHistory: isSearching,
        historyQuery,
        historyMatch,
        historyFailedMatch,
        historySearchKeyDown: handleKeyDown,
        onOpenHistorySearch,
        helpOpen: isHelpOpen,
        setHelpOpen,
        toggleHelp: toggleHelpStable,
        isModalOverlayActive,
        footerItemSelected,
        ideSelectionRidesRow1: promptChromeRows,
        footerOwnsKeyOf: shadowedFooterActionHandler,
        onHistoryDownPastEnd: onHistoryDownPastEnd_2,
        placeholder,
        leftArrowRoute: leftArrowGesture,
        modeIndicator,
        ideSelection,
        topBorderText: topBorderText_2,
        fastModeTag: fastModeTagStable,
        fastModeCooldown: fastModeCooldownActive,
        ultraEffortTag: ultraEffortTag_2,
        internalTag: refusalSettingsTag,
        onIsPastingChange: setIsPasting,
        onExitMessage,
        onExpandPasteHintChange: setShowExpandPasteHint,
        onExternalEditorActiveChange: setIsExternalEditorActive,
      },
      "editor",
    );
    $[569] = chordGestureSpent;
    $[570] = chrome;
    $[571] = dispatchCommand;
    $[572] = draft;
    $[573] = embedded;
    $[574] = onHistoryDownPastEnd_2;
    $[575] = fastModeCooldownActive;
    $[576] = fastModeTagStable;
    $[577] = shadowedFooterActionHandler;
    $[578] = isHelpOpen;
    $[579] = historyFailedMatch;
    $[580] = historyMatch;
    $[581] = historyQuery;
    $[582] = handleKeyDown;
    $[583] = ideSelection;
    $[584] = promptChromeRows;
    $[585] = inputTakesFocus;
    $[586] = refusalSettingsTag;
    $[587] = isModalOverlayActive;
    $[588] = isSearching;
    $[589] = leftArrowGesture;
    $[590] = markAccepted;
    $[591] = modeIndicator;
    $[592] = handleSubmit;
    $[593] = placeholder;
    $[594] = scope;
    $[595] = setHelpOpen;
    $[596] = suggestionsStore;
    $[597] = hidden;
    $[598] = onOpenHistorySearch;
    $[599] = footerItemSelected;
    $[600] = takeEnter;
    $[601] = toggleHelpStable;
    $[602] = topBorderText_2;
    $[603] = transcript;
    $[604] = turn;
    $[605] = ultraEffortTag_2;
    $[606] = promptInputElement;
  } else promptInputElement = $[606];
  let promptInputElementStable = promptInputElement;
  if (dialogElement !== null) {
    let dialogColumn;
    if ($[607] !== promptInputElementStable || $[608] !== dialogElement) {
      dialogColumn = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [dialogElement, promptInputElementStable],
      });
      $[607] = promptInputElementStable;
      $[608] = dialogElement;
      $[609] = dialogColumn;
    } else dialogColumn = $[609];
    return dialogColumn;
  }
  const marginTop = isBriefOnly ? 0 : 1;
  let footerKeyCapture;
  if (
    $[610] !== activeFooterTab ||
    $[611] !== onKeyDown ||
    $[612] !== isModalOverlayActive ||
    $[613] !== queuePaste
  ) {
    footerKeyCapture =
      activeFooterTab &&
      !isModalOverlayActive &&
      jsxProd_default(Box, {
        tabIndex: 0,
        autoFocus: true,
        onKeyDown,
        onPaste: (event) => {
          event.preventDefault();
          queuePaste(event);
        },
      });
    $[610] = activeFooterTab;
    $[611] = onKeyDown;
    $[612] = isModalOverlayActive;
    $[613] = queuePaste;
    $[614] = footerKeyCapture;
  } else footerKeyCapture = $[614];
  let waitingForPermission;
  if ($[615] !== storeSelector_2 || $[616] !== showStatusNotices) {
    waitingForPermission =
      storeSelector_2 &&
      !showStatusNotices &&
      jsxProd_default(Box, {
        marginTop: 1,
        marginLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Waiting for permission\u2026",
        }),
      });
    $[615] = storeSelector_2;
    $[616] = showStatusNotices;
    $[617] = waitingForPermission;
  } else waitingForPermission = $[617];
  const promptInputVisible = !isScreenReaderEnabled && promptInputElementStable;
  let statusNoticeList;
  if ($[618] === MEMO_CACHE_SENTINEL) {
    statusNoticeList = jsxProd_default(StatusNoticeList, {});
    $[618] = statusNoticeList;
  } else statusNoticeList = $[618];
  const leftArrowDetachAvailable =
    leftArrowGesture !== undefined && !leftArrowGesture.onlyExplains && !isDetachSuppressed;
  const vimMode_2 = editorMode ? vimMode : undefined;
  const suppressHint = !storeSelector_3;
  let footerElement;
  if (
    $[619] !== bridgeSelected ||
    $[620] !== chrome ||
    $[621] !== toolPermissionContext ||
    $[622] !== exitMessage ||
    $[623] !== hasStash ||
    $[624] !== isHelpOpen ||
    $[625] !== historyFailedMatch ||
    $[626] !== historyQuery ||
    $[627] !== ideSelectionSelected ||
    $[628] !== inputTakesFocus ||
    $[629] !== isAutoUpdating ||
    $[630] !== isInputWrapped ||
    $[631] !== isPasting ||
    $[632] !== isSearching ||
    $[633] !== proactivityStepState.collapsed ||
    $[634] !== proactivityStepState.stepped ||
    $[635] !== storeSelector_4 ||
    $[636] !== openArtifactsStable ||
    $[637] !== row1Hint ||
    $[638] !== scope ||
    $[639] !== setHistoryQuery ||
    $[640] !== showExpandPasteHint ||
    $[641] !== suggestionsStore.drawn ||
    $[642] !== leftArrowDetachAvailable ||
    $[643] !== vimMode_2 ||
    $[644] !== suppressHint ||
    $[645] !== tasksTabSelected ||
    $[646] !== transcript ||
    $[647] !== turn ||
    $[648] !== verbose
  ) {
    footerElement = jsxProd_default(PromptInputFooterMemo, {
      scope,
      transcript,
      turn,
      chrome,
      exitMessage,
      row1Hint,
      leftArrowDetachAvailable,
      proactivityLevelStepped: proactivityStepState.stepped,
      proactivityPillCollapsed: proactivityStepState.collapsed,
      vimMode: vimMode_2,
      mode: storeSelector_4,
      isAutoUpdating,
      verbose,
      onChangeIsUpdating: setIsAutoUpdating,
      suggestionsStore: suggestionsStore.drawn,
      inputTakesFocus,
      onSelectSuggestion,
      onHoverSuggestion,
      toolPermissionContext,
      helpOpen: isHelpOpen,
      suppressHint,
      tasksSelected: tasksTabSelected,
      bridgeSelected,
      ideSelectionSelected,
      isPasting,
      showExpandPasteHint,
      hasStash,
      isInputWrapped,
      isSearching,
      historyQuery,
      setHistoryQuery,
      historyFailedMatch,
      onOpenArtifacts: openArtifactsStable,
    });
    $[619] = bridgeSelected;
    $[620] = chrome;
    $[621] = toolPermissionContext;
    $[622] = exitMessage;
    $[623] = hasStash;
    $[624] = isHelpOpen;
    $[625] = historyFailedMatch;
    $[626] = historyQuery;
    $[627] = ideSelectionSelected;
    $[628] = inputTakesFocus;
    $[629] = isAutoUpdating;
    $[630] = isInputWrapped;
    $[631] = isPasting;
    $[632] = isSearching;
    $[633] = proactivityStepState.collapsed;
    $[634] = proactivityStepState.stepped;
    $[635] = storeSelector_4;
    $[636] = openArtifactsStable;
    $[637] = row1Hint;
    $[638] = scope;
    $[639] = setHistoryQuery;
    $[640] = showExpandPasteHint;
    $[641] = suggestionsStore.drawn;
    $[642] = leftArrowDetachAvailable;
    $[643] = vimMode_2;
    $[644] = suppressHint;
    $[645] = tasksTabSelected;
    $[646] = transcript;
    $[647] = turn;
    $[648] = verbose;
    $[649] = footerElement;
  } else footerElement = $[649];
  let noConversationsMessage;
  if ($[650] !== cloudRowCheck || $[651] !== frameFooterState) {
    noConversationsMessage = frameFooterState
      ? jsxProd_default(NoConversationsMessage, {
          cloudRowCheck,
        })
      : null;
    $[650] = cloudRowCheck;
    $[651] = frameFooterState;
    $[652] = noConversationsMessage;
  } else noConversationsMessage = $[652];
  const onboardingNotice = isFullscreen ? null : onboardingDialogStable;
  let notificationOverlay;
  if (
    $[653] !== showEnvOnboarding ||
    $[654] !== isBriefOnly ||
    $[655] !== isFullscreen ||
    $[656] !== hasStash ||
    $[657] !== storeSelector_8 ||
    $[658] !== hideLoginNotice ||
    $[659] !== isAutoUpdating ||
    $[660] !== isInputWrapped ||
    $[661] !== row1Hint?.id ||
    $[662] !== scope ||
    $[663] !== transcript ||
    $[664] !== verbose
  ) {
    notificationOverlay = isFullscreen
      ? jsxProd_default(NotificationOverlay, {
          marginTop: isBriefOnly ? -2 : -1,
          height: !storeSelector_8 && !showEnvOnboarding ? 1 : 0,
          children: jsxProd_default(Notifications, {
            apiKeyVerification: scope.apiKeyVerification,
            hideLoginNotice,
            isAutoUpdating,
            verbose,
            transcript,
            onChangeIsUpdating: setIsAutoUpdating,
            isInputWrapped,
            hasStash,
            row1HintId: row1Hint?.id,
          }),
        })
      : null;
    $[653] = showEnvOnboarding;
    $[654] = isBriefOnly;
    $[655] = isFullscreen;
    $[656] = hasStash;
    $[657] = storeSelector_8;
    $[658] = hideLoginNotice;
    $[659] = isAutoUpdating;
    $[660] = isInputWrapped;
    $[661] = row1Hint?.id;
    $[662] = scope;
    $[663] = transcript;
    $[664] = verbose;
    $[665] = notificationOverlay;
  } else notificationOverlay = $[665];
  const promptInputScreenReader = isScreenReaderEnabled && promptInputElementStable;
  let rootBox;
  if (
    $[666] !== ref ||
    $[667] !== marginTop ||
    $[668] !== footerKeyCapture ||
    $[669] !== waitingForPermission ||
    $[670] !== promptInputVisible ||
    $[671] !== footerElement ||
    $[672] !== noConversationsMessage ||
    $[673] !== onboardingNotice ||
    $[674] !== notificationOverlay ||
    $[675] !== promptInputScreenReader
  ) {
    rootBox = jsxProd_default_2(Box, {
      ref,
      flexDirection: "column",
      marginTop,
      children: [
        footerKeyCapture,
        waitingForPermission,
        promptInputVisible,
        statusNoticeList,
        footerElement,
        noConversationsMessage,
        onboardingNotice,
        notificationOverlay,
        promptInputScreenReader,
      ],
    });
    $[666] = ref;
    $[667] = marginTop;
    $[668] = footerKeyCapture;
    $[669] = waitingForPermission;
    $[670] = promptInputVisible;
    $[671] = footerElement;
    $[672] = noConversationsMessage;
    $[673] = onboardingNotice;
    $[674] = notificationOverlay;
    $[675] = promptInputScreenReader;
    $[676] = rootBox;
  } else rootBox = $[676];
  return rootBox;
}
//@ chunk-czq1j3j2.js:1012485-1012559 placement
function hasUserOrAssistantMessage(messages) {
  return messages.some((message) => message.type === "user" || message.type === "assistant");
}
//@ chunk-czq1j3j2.js:1012559-1012616 placement
function hasAssistantMessage(messages) {
  return messages.some((message) => message.type === "assistant");
}
//@ chunk-czq1j3j2.js:1012616-1012661 placement
function hasSuggestions(state) {
  return state.suggestions.length > 0;
}
//@ chunk-czq1j3j2.js:1012661-1012677 placement
var PromptComposerMemo; // deferred: uses PromptComposer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1012661", () => {
  PromptComposerMemo = memo(PromptComposer);
});
export { selectIdleTeammatesExpanded_3, PromptComposerMemo, selectViewingAgentTaskId_4 };
