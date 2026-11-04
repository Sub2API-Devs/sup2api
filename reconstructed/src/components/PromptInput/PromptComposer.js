/**
 * components/PromptInput/PromptComposer.tsx
 *
 * 2.1.316 新增。重构后的输入框主体（编辑、补全、模式、提交）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (78)
 * attribution: placement 78
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
  isRemoteControlChannelAvailable,
  getRemoteCaps,
} from "../../remote/remoteMode.js";
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
import { regExp as regExp_5, findCommand } from "../../commands.js";
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
import {
  useSyncExternalStore,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  memo,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
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
import { useSetVoiceState } from "../../context/voice.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useCommandQueueOrDefault, useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { countNonAmbientTasks } from "../../utils/tasks.js";
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
  useShadowedFooterActionHandler,
  useFooterAwareMessageActions,
  expandIdleTeammates,
  hasFoldedIdleTeammates,
  isViewingThisAgent,
} from "../CoordinatorAgentStatus.js";
import { subscribeCoordinatorPanel } from "../../utils/transcriptDiagnostics.js";
import { countVisibleTasks } from "../../utils/claudeInChrome/toolRendering.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { shouldOfferAutoModeEnvOnboarding, AutoModeEnvOnboardingDialog } from "../AutoModeEnvOnboarding.js";
import { runningWorkflowTasks } from "../Spinner/workflowStatus.js";
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
import { isRefillableInput, shouldPrependModeChar } from "../../utils/messageQueueManager.js";
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
import { scanDirectory } from "../../utils/suggestions/directoryCompletion.js";
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
import { buildBorderText } from "./PromptInput.js";
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
import { CloudTasksDialog } from "../tasks/CloudTasksDialog.js";
import { BackgroundTasksDialog } from "../tasks/BackgroundTasksDialog.js";
import { HistorySearchDialog } from "../HistorySearchDialog.js";
import { WizardNavigationFooter } from "../wizard/WizardNavigationFooter.js";
import { BridgeDialog } from "../BridgeDialog.js";
import { PromptInputMemo } from "./promptText.js";
import { NoConversationsMessage } from "../../screens/ResumeConversation.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:120241-120283 placement
function shouldShowIdeStatus(props, rowsDrawn) {
  return rowsDrawn && IdeStatusIndicator(props) !== null;
}
//@ chunk-18hwfzwa.js:770563-770990 placement = ConfirmRemoveTag (0.165)
function ConfirmRemoveTag(props) {
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
//@ chunk-18hwfzwa.js:920094-920856 placement = CompanionSprite (0.359)
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
//@ chunk-18hwfzwa.js:927945-928268 placement
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
//@ chunk-18hwfzwa.js:928268-928306 placement
function selectEmbedded(state) {
  return state.embedded;
}
//@ chunk-18hwfzwa.js:928306-928348 placement
function selectIdeSelection(state) {
  return state.ideSelection;
}
//@ chunk-18hwfzwa.js:928348-928390 placement
function selectBashesDialog(state) {
  return state.bashesDialog;
}
//@ chunk-18hwfzwa.js:928390-928440 placement
function selectHasSuppressedDialogs(state) {
  return state.hasSuppressedDialogs;
}
//@ chunk-18hwfzwa.js:928440-928485 placement
function selectHideLoginNotice_2(state) {
  return state.hideLoginNotice;
}
//@ chunk-18hwfzwa.js:928485-928524 placement
function selectIsLoading2(state) {
  return state.isLoading;
}
//@ chunk-18hwfzwa.js:928524-928571 placement
function selectIsExternalLoading2(state) {
  return state.isExternalLoading;
}
//@ chunk-18hwfzwa.js:928571-928612 placement
function selectSubmitCount(state) {
  return state.submitCount;
}
//@ chunk-18hwfzwa.js:928612-928663 placement
function selectToolPermissionContext(state) {
  return state.toolPermissionContext;
}
//@ chunk-18hwfzwa.js:928663-928700 placement
function selectVerbose2(state) {
  return state.verbose;
}
//@ chunk-18hwfzwa.js:928700-928746 placement
function selectOnDetachToCaller(state) {
  return state.onDetachToCaller;
}
//@ chunk-18hwfzwa.js:928746-928790 placement
function selectQueueEditIndex2(state) {
  return state.queueEditIndex;
}
//@ chunk-18hwfzwa.js:928790-928874 placement
function clearQueueEditIndex(state) {
  return state.queueEditIndex === null
    ? state
    : {
        ...state,
        queueEditIndex: null,
      };
}
//@ chunk-18hwfzwa.js:928874-928909 placement
function selectTasks2(state) {
  return state.tasks;
}
//@ chunk-18hwfzwa.js:928909-928960 placement
function selectRemoteBackgroundTasks2(state) {
  return state.remoteBackgroundTasks;
}
//@ chunk-18hwfzwa.js:928960-929004 placement
function selectWorkflowDetail(state) {
  return state.workflowDetail;
}
//@ chunk-18hwfzwa.js:929004-929188 placement
function shouldShowBridgeStatus(state) {
  return (
    (state.replBridgeError !== undefined && !state.replBridgeOutboundOnly) ||
    (state.replBridgeConnected &&
      !state.replBridgeOutboundOnly &&
      (state.replBridgeExplicit || state.replBridgeReconnecting))
  );
}
//@ chunk-18hwfzwa.js:929188-929215 placement
function selectNever(state) {
  return false;
}
//@ chunk-18hwfzwa.js:929215-929256 placement = _temp (1)
function selectTeamContext_2(s) {
  return s.teamContext;
}
//@ chunk-18hwfzwa.js:929256-929302 placement
function selectPromptSuggestion(state) {
  return state.promptSuggestion;
}
//@ chunk-18hwfzwa.js:929302-929350 placement = _temp2 (1)
function selectViewingAgentTaskId_4(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:929350-929391 placement
function selectIsBriefOnly_3(state) {
  return state.isBriefOnly;
}
//@ chunk-18hwfzwa.js:929391-929434 placement
function selectMainLoopModel(state) {
  return state.mainLoopModel;
}
//@ chunk-18hwfzwa.js:929487-929532 placement
function selectThinkingEnabled2(state) {
  return state.thinkingEnabled;
}
//@ chunk-18hwfzwa.js:929578-929617 placement
function selectUltracode_2(state) {
  return state.ultracode;
}
//@ chunk-18hwfzwa.js:929617-929652 placement
function getIdleInFlightState() {
  return {
    inFlight: false,
  };
}
//@ chunk-18hwfzwa.js:929652-929702 placement
function selectCoordinatorTaskIndex2(state) {
  return state.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:929702-929747 placement
function selectTaskDecorations_3(state) {
  return state.taskDecorations;
}
//@ chunk-18hwfzwa.js:929747-929802 placement
function selectIdleTeammatesExpanded_3(state) {
  return state.idleTeammatesExpanded ?? false;
}
//@ chunk-18hwfzwa.js:929802-929834 placement
function selectId(state) {
  return state.id;
}
//@ chunk-18hwfzwa.js:929834-929866 placement
function selectId2(state) {
  return state.id;
}
//@ chunk-18hwfzwa.js:929866-929916 placement
function selectEnvOnboardingOffered(state) {
  return state.envOnboardingOffered;
}
//@ chunk-18hwfzwa.js:929916-929997 placement
function hasSuggestionContent(state) {
  return state.suggestions.length > 0 || !!state.suggestionsEmptyMessage;
}
//@ chunk-18hwfzwa.js:929997-930031 placement
function isFooterTabEnabled(tab) {
  return !FOOTER_TAB_ENABLED[tab];
}
//@ chunk-18hwfzwa.js:930031-930080 placement
function selectWorkflowFooterIndex2(state) {
  return state.workflowFooterIndex;
}
//@ chunk-18hwfzwa.js:930080-930112 placement
function selectId3(state) {
  return state.id;
}
//@ chunk-18hwfzwa.js:930112-930157 placement
function selectFooterSelection2(state) {
  return state.footerSelection;
}
//@ chunk-18hwfzwa.js:930157-930186 placement
function toggleHelpOpen(isOpen) {
  return !isOpen;
}
//@ chunk-18hwfzwa.js:930186-930265 placement
function markTasksHintSeen(state) {
  return state.hasSeenTasksHint
    ? state
    : {
        ...state,
        hasSeenTasksHint: true,
      };
}
//@ chunk-18hwfzwa.js:930265-930296 placement
function bumpCounter(count) {
  return count + 1;
}
//@ chunk-18hwfzwa.js:930296-930340 placement = _temp (1)
function isPastedImageBlock(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:930395-930411 placement
function noopResetHistory() {}
//@ chunk-18hwfzwa.js:930411-930444 placement
function foldKeepNewest(previous, next) {
  return next;
}
//@ chunk-18hwfzwa.js:930444-930460 placement
function noopAfterSubmit() {}
//@ chunk-18hwfzwa.js:930460-930527 placement
function clearPromptSuggestion(state) {
  return {
    ...state,
    promptSuggestion: {
      status: "empty",
    },
  };
}
//@ chunk-18hwfzwa.js:930527-930558 placement
function bumpRetryCount(count) {
  return count + 1;
}
//@ chunk-18hwfzwa.js:930558-930587 placement
function toggleFlag(flag) {
  return !flag;
}
//@ chunk-18hwfzwa.js:930587-930646 placement
function unavailableReasonState(isAvailable) {
  return isAvailable
    ? null
    : {
        unavailableReason: getFastModeUnavailableMessage(),
      };
}
//@ chunk-18hwfzwa.js:930646-930675 placement
function negateBoolean_2(flag) {
  return !flag;
}
//@ chunk-18hwfzwa.js:930675-930723 placement
function dismissShowFlag(state) {
  return state.show
    ? {
        show: false,
      }
    : state;
}
//@ chunk-18hwfzwa.js:930723-930739 placement
function noopOnConfirm() {}
//@ chunk-18hwfzwa.js:930739-930763 placement
function returnFalse() {
  return false;
}
//@ chunk-18hwfzwa.js:930763-930854 placement
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
//@ chunk-18hwfzwa.js:930854-930898 placement = _temp (1)
function isImagePasteBlock(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:930898-930929 placement
function decrementIndex(index) {
  return index - 1;
}
//@ chunk-18hwfzwa.js:930929-930960 placement
function decrementWorkflowIndex(index) {
  return index - 1;
}
//@ chunk-18hwfzwa.js:930960-930991 placement
function incrementIndex(index) {
  return index + 1;
}
//@ chunk-18hwfzwa.js:930991-931022 placement
function incrementWorkflowIndex(index) {
  return index + 1;
}
//@ chunk-18hwfzwa.js:931022-931111 placement
function collapseIdleTeammates(state) {
  return !state.idleTeammatesExpanded
    ? state
    : {
        ...state,
        idleTeammatesExpanded: false,
      };
}
//@ chunk-18hwfzwa.js:931111-931127 placement
function noopOutputHandler() {}
//@ chunk-18hwfzwa.js:931127-931166 placement
function isEffortLevelNotice(notice) {
  return notice?.key === EFFORT_LEVEL_KEY;
}
//@ chunk-18hwfzwa.js:931166-931182 placement
function noopReplyHandler() {}
//@ chunk-18hwfzwa.js:931182-931227 placement
function unsavedTextState(isDraft) {
  return isDraft
    ? {
        unsaved: "",
      }
    : "";
}
//@ chunk-18hwfzwa.js:931227-931251 placement
function isNotOffBox() {
  return false;
}
//@ chunk-18hwfzwa.js:931251-931322 placement
function logSetMaxThinkingTokensFailure(error) {
  logForDebugging(`[remote] set_max_thinking_tokens failed: ${error}`);
}
//@ chunk-18hwfzwa.js:931322-931459 placement
function clearFooterSelection(state) {
  return state.workflowDetail === undefined && state.footerSelection === null
    ? state
    : {
        ...state,
        workflowDetail: undefined,
        footerSelection: null,
      };
}
//@ chunk-18hwfzwa.js:931459-931543 placement
var FOOTER_TAB_ENABLED = {
  tasks: false,
  bagel: true,
  bridge: true,
  ideSelection: true,
  workflows: false,
  frame: true,
};
var FOOTER_DOUBLE_CLICK_MS = 150;
//@ chunk-18hwfzwa.js:931543-931612 placement
function stripPastedRefMarkers(text) {
  return text.replace(regExp_5, (fullMatch, label, pasteId) => `[${label} #${Number(pasteId)}]`);
}
//@ chunk-18hwfzwa.js:931612-978434 placement
/**
 * 2.1.316 的主输入框组件（约 47 KB）：组合草稿、vim 模式、bash/模式切换、自动补全、页脚各胶囊、排队命令、提交到主线程或代理；取代旧版 PromptInput 的大部分逻辑。
 */
function PromptComposer(props) {
  let $ = useMemoCache(666);
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
  let taskStore = useSetVoiceState();
  let { storageV5 } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let tasks = useAppState(selectTasks2);
  let options = useAppState(selectRemoteBackgroundTasks2);
  let hasBackgroundTasks;
  if ($[19] !== options || $[20] !== tasks) {
    hasBackgroundTasks =
      countNonAmbientTasks(options) > 0 && !Object.values(tasks).some(shouldHideTasksFooter);
    $[19] = options;
    $[20] = tasks;
    $[21] = hasBackgroundTasks;
  } else hasBackgroundTasks = $[21];
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
  if ($[22] !== appState_4 || $[23] !== columns || $[24] !== isFullscreen || $[25] !== isSwarmFooterVisible) {
    showBridgeTab =
      (!isFullscreen || isSwarmFooterVisible) &&
      appState_4 &&
      columns >= FOOTER_WIDE_COLUMNS &&
      isBridgeEnabled();
    $[22] = appState_4;
    $[23] = columns;
    $[24] = isFullscreen;
    $[25] = isSwarmFooterVisible;
    $[26] = showBridgeTab;
  } else showBridgeTab = $[26];
  let bridgeTabEnabled = showBridgeTab;
  let appState_5 = useAppState(selectNever);
  let frameFooterState = useFrameFooterState();
  let teamContext = useAppState(selectTeamContext_2);
  let commandQueue = useCommandQueue();
  let suggestion = useAppState(selectPromptSuggestion);
  let tasks_2 = useAppState(selectViewingAgentTaskId_4);
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
  if ($[27] !== appState_10) {
    viewingAgentColorRaw =
      appState_10?.identity.color && AGENT_COLOR_NAMES.includes(appState_10.identity.color)
        ? appState_10.identity.color
        : undefined;
    $[27] = appState_10;
    $[28] = viewingAgentColorRaw;
  } else viewingAgentColorRaw = $[28];
  let viewingAgentColor = viewingAgentColorRaw;
  let agentPermissionContext;
  cl: {
    if (appState_10) {
      let agentContext;
      if ($[29] !== appState || $[30] !== appState_10.permissionMode) {
        agentContext = {
          ...appState,
          mode: appState_10.permissionMode,
        };
        $[29] = appState;
        $[30] = appState_10.permissionMode;
        $[31] = agentContext;
      } else agentContext = $[31];
      agentPermissionContext = agentContext;
      break cl;
    }
    agentPermissionContext = appState;
  }
  let toolPermissionContext = agentPermissionContext;
  let seedPasteIdsEffect;
  if ($[32] !== transcript) {
    seedPasteIdsEffect = () => primePasteIdsFromMessages(transcript.getSnapshot());
    $[32] = transcript;
    $[33] = seedPasteIdsEffect;
  } else seedPasteIdsEffect = $[33];
  useState(seedPasteIdsEffect);
  let [isBridgeDialogOpen, setBridgeDialogOpen] = useState(false);
  let [isWizardOpen, setWizardOpen] = useState(false);
  let [cloudRowCheck] = useState(getIdleInFlightState);
  let appState_11 = useAppState(selectCoordinatorTaskIndex2);
  let appState_12 = useAppState(selectTaskDecorations_3);
  let appState_13 = useAppState(selectIdleTeammatesExpanded_3);
  let updateCoordinatorIndex;
  if ($[34] !== setShowState) {
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
    $[34] = setShowState;
    $[35] = updateCoordinatorIndex;
  } else updateCoordinatorIndex = $[35];
  let setCoordinatorTaskIndex = updateCoordinatorIndex;
  let visibleAgentTaskCount = useVisibleAgentTaskCount();
  let isCoordinatorPanelSubscribed = subscribeCoordinatorPanel();
  let isPromptModeWithTasks = storeSelector_4 !== "bash" && countVisibleTasks(tasks, options) > 0;
  let firstTaskIndex = isPromptModeWithTasks ? -1 : 0;
  let visibleTasksRaw;
  if ($[36] !== appState_13 || $[37] !== appState_12 || $[38] !== tasks || $[39] !== tasks_2) {
    visibleTasksRaw = getVisibleBackgroundTasks(tasks, appState_12, tasks_2, appState_13);
    $[36] = appState_13;
    $[37] = appState_12;
    $[38] = tasks;
    $[39] = tasks_2;
    $[40] = visibleTasksRaw;
  } else visibleTasksRaw = $[40];
  let visibleBackgroundTasks = visibleTasksRaw;
  let taskIdsRaw;
  if ($[41] !== visibleBackgroundTasks) {
    taskIdsRaw = visibleBackgroundTasks.map(selectId);
    $[41] = visibleBackgroundTasks;
    $[42] = taskIdsRaw;
  } else taskIdsRaw = $[42];
  let taskIds = taskIdsRaw;
  let agentRowTaskIds;
  if ($[43] !== appState_12 || $[44] !== tasks || $[45] !== tasks_2 || $[46] !== visibleBackgroundTasks) {
    agentRowTaskIds = visibleBackgroundTasks.some(isAgentRowVisible)
      ? getVisibleBackgroundTasks(tasks, appState_12, tasks_2, true).map(selectId2)
      : undefined;
    $[43] = appState_12;
    $[44] = tasks;
    $[45] = tasks_2;
    $[46] = visibleBackgroundTasks;
    $[47] = agentRowTaskIds;
  } else agentRowTaskIds = $[47];
  let agentRowTaskIdsStable = agentRowTaskIds;
  let prevTaskIdsRef = useRef(taskIds);
  let prevAgentRowIdsRef = useRef(agentRowTaskIdsStable);
  let clampTaskIndexEffect;
  let clampTaskIndexDeps;
  if (
    $[48] !== visibleAgentTaskCount ||
    $[49] !== appState_11 ||
    $[50] !== appState_13 ||
    $[51] !== firstTaskIndex ||
    $[52] !== setCoordinatorTaskIndex ||
    $[53] !== agentRowTaskIdsStable ||
    $[54] !== visibleBackgroundTasks ||
    $[55] !== taskIds
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
    $[48] = visibleAgentTaskCount;
    $[49] = appState_11;
    $[50] = appState_13;
    $[51] = firstTaskIndex;
    $[52] = setCoordinatorTaskIndex;
    $[53] = agentRowTaskIdsStable;
    $[54] = visibleBackgroundTasks;
    $[55] = taskIds;
    $[56] = clampTaskIndexEffect;
    $[57] = clampTaskIndexDeps;
  } else {
    clampTaskIndexEffect = $[56];
    clampTaskIndexDeps = $[57];
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
  if ($[58] !== storeSelector_5 || $[59] !== isAutoPermissionMode || $[60] !== storeSelector_7) {
    shouldOfferEnvOnboarding =
      storeSelector_7 && !storeSelector_5 && isAutoPermissionMode && shouldOfferAutoModeEnvOnboarding();
    $[58] = storeSelector_5;
    $[59] = isAutoPermissionMode;
    $[60] = storeSelector_7;
    $[61] = shouldOfferEnvOnboarding;
  } else shouldOfferEnvOnboarding = $[61];
  let showEnvOnboarding = shouldOfferEnvOnboarding;
  let memoRunningWorkflows;
  if ($[62] !== tasks) {
    memoRunningWorkflows = runningWorkflowTasks(tasks);
    $[62] = tasks;
    $[63] = memoRunningWorkflows;
  } else memoRunningWorkflows = $[63];
  let runningWorkflows = memoRunningWorkflows;
  let tasksTabVisible = visibleAgentTaskCount > 0 || isPromptModeWithTasks;
  let workflowsTabVisible =
    runningWorkflows.length > 0 &&
    !isCoordinatorPanelSubscribed &&
    storeSelector_4 === "prompt" &&
    !exitMessage.show &&
    !isPasting;
  let frameTabVisible;
  if (
    $[64] !== exitMessage ||
    $[65] !== frameFooterState ||
    $[66] !== isPasting ||
    $[67] !== storeSelector_4
  ) {
    frameTabVisible =
      frameFooterState &&
      getArtifactPublishStubDir() === null &&
      storeSelector_4 === "prompt" &&
      !exitMessage.show &&
      !isPasting;
    $[64] = exitMessage;
    $[65] = frameFooterState;
    $[66] = isPasting;
    $[67] = storeSelector_4;
    $[68] = frameTabVisible;
  } else frameTabVisible = $[68];
  let isFrameTabVisible = frameTabVisible;
  let isBagelTabVisible;
  if ($[69] !== appState_5 || $[70] !== exitMessage || $[71] !== isPasting || $[72] !== storeSelector_4) {
    isBagelTabVisible =
      appState_5 &&
      storeSelector_4 !== "bash" &&
      !isRemoteSessionAvailable() &&
      !exitMessage.show &&
      !isPasting;
    $[69] = appState_5;
    $[70] = exitMessage;
    $[71] = isPasting;
    $[72] = storeSelector_4;
    $[73] = isBagelTabVisible;
  } else isBagelTabVisible = $[73];
  let bagelTabVisible = isBagelTabVisible;
  let hasSuggestionContent_2 = useStoreSelector(suggestionsStore.drawn, hasSuggestionContent);
  let footerStatusVisible;
  if ($[74] !== isFullscreen || $[75] !== isHelpOpen || $[76] !== hasSuggestionContent_2) {
    footerStatusVisible = shouldShowFooterStatus({
      hasSuggestionContent: hasSuggestionContent_2,
      isFullscreen,
      helpOpen: isHelpOpen,
    });
    $[74] = isFullscreen;
    $[75] = isHelpOpen;
    $[76] = hasSuggestionContent_2;
    $[77] = footerStatusVisible;
  } else footerStatusVisible = $[77];
  let showFooterStatus = footerStatusVisible;
  let chromeRowsArgs;
  if ($[78] !== chrome || $[79] !== showFooterStatus || $[80] !== scope) {
    chromeRowsArgs = {
      scope,
      chrome,
      rowsDrawn: showFooterStatus,
    };
    $[78] = chrome;
    $[79] = showFooterStatus;
    $[80] = scope;
    $[81] = chromeRowsArgs;
  } else chromeRowsArgs = $[81];
  let promptChromeRows = usePromptChromeRows(chromeRowsArgs);
  let footerTabCandidates;
  if (
    $[82] !== bagelTabVisible ||
    $[83] !== bridgeTabEnabled ||
    $[84] !== isFrameTabVisible ||
    $[85] !== promptChromeRows ||
    $[86] !== showFooterStatus ||
    $[87] !== tasksTabVisible ||
    $[88] !== workflowsTabVisible
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
    $[82] = bagelTabVisible;
    $[83] = bridgeTabEnabled;
    $[84] = isFrameTabVisible;
    $[85] = promptChromeRows;
    $[86] = showFooterStatus;
    $[87] = tasksTabVisible;
    $[88] = workflowsTabVisible;
    $[89] = footerTabCandidates;
  } else footerTabCandidates = $[89];
  let footerTabs = footerTabCandidates;
  let hasTasksOrWorkflowsSelected = visibleAgentTaskCount > 0 || workflowsTabVisible;
  let enabledFooterTabs;
  if ($[90] !== footerTabs || $[91] !== hasTasksOrWorkflowsSelected) {
    enabledFooterTabs = hasTasksOrWorkflowsSelected ? footerTabs.filter(isFooterTabEnabled) : footerTabs;
    $[90] = footerTabs;
    $[91] = hasTasksOrWorkflowsSelected;
    $[92] = enabledFooterTabs;
  } else enabledFooterTabs = $[92];
  let footerTabsEnabled = enabledFooterTabs;
  let appState_14 = useAppState(selectWorkflowFooterIndex2);
  let setWorkflowFooterIndexThunk;
  if ($[93] !== setShowState) {
    setWorkflowFooterIndexThunk = (nextWorkflowIndex) =>
      setShowState((prevState) => {
        let workflowIndex =
          typeof nextWorkflowIndex === "function"
            ? nextWorkflowIndex(prevState.workflowFooterIndex)
            : nextWorkflowIndex;
        if (workflowIndex === prevState.workflowFooterIndex) {
          return prevState;
        }
        return {
          ...prevState,
          workflowFooterIndex: workflowIndex,
        };
      });
    $[93] = setShowState;
    $[94] = setWorkflowFooterIndexThunk;
  } else setWorkflowFooterIndexThunk = $[94];
  let setWorkflowFooterIndex = setWorkflowFooterIndexThunk;
  let workflowIdsRaw;
  if ($[95] !== runningWorkflows) {
    workflowIdsRaw = runningWorkflows.map(selectId3);
    $[95] = runningWorkflows;
    $[96] = workflowIdsRaw;
  } else workflowIdsRaw = $[96];
  let runningWorkflowIds = workflowIdsRaw;
  let prevWorkflowIdsRef = useRef(runningWorkflowIds);
  let clampWorkflowIndexEffect;
  let clampWorkflowDeps;
  if ($[97] !== runningWorkflowIds || $[98] !== setWorkflowFooterIndex || $[99] !== appState_14) {
    clampWorkflowIndexEffect = () => {
      let previousIds = prevWorkflowIdsRef.current;
      prevWorkflowIdsRef.current = runningWorkflowIds;
      let selectedWorkflowId = previousIds[appState_14];
      if (selectedWorkflowId !== undefined) {
        let index = runningWorkflowIds.indexOf(selectedWorkflowId);
        if (index !== -1 && index !== appState_14) {
          setWorkflowFooterIndex(index);
          return;
        }
      }
      if (appState_14 >= runningWorkflowIds.length)
        setWorkflowFooterIndex(Math.max(0, runningWorkflowIds.length - 1));
    };
    clampWorkflowDeps = [runningWorkflowIds, appState_14, setWorkflowFooterIndex];
    $[97] = runningWorkflowIds;
    $[98] = setWorkflowFooterIndex;
    $[99] = appState_14;
    $[100] = clampWorkflowIndexEffect;
    $[101] = clampWorkflowDeps;
  } else {
    clampWorkflowIndexEffect = $[100];
    clampWorkflowDeps = $[101];
  }
  useEffect(clampWorkflowIndexEffect, clampWorkflowDeps);
  let appState_15 = useAppState(selectFooterSelection2);
  let isBashTasksSelection = appState_15 === "tasks" && storeSelector_4 === "bash" && appState_11 < 0;
  let activeFooterTab =
    appState_15 && footerTabs.includes(appState_15) && !isBashTasksSelection ? appState_15 : null;
  let clearStaleFooterEffect;
  let clearStaleFooterDeps;
  if ($[102] !== activeFooterTab || $[103] !== appState_15 || $[104] !== setShowState) {
    clearStaleFooterEffect = () => {
      if (appState_15 && !activeFooterTab) setShowState(clearFooterSelectionState);
    };
    clearStaleFooterDeps = [appState_15, activeFooterTab, setShowState];
    $[102] = activeFooterTab;
    $[103] = appState_15;
    $[104] = setShowState;
    $[105] = clearStaleFooterEffect;
    $[106] = clearStaleFooterDeps;
  } else {
    clearStaleFooterEffect = $[105];
    clearStaleFooterDeps = $[106];
  }
  useEffect(clearStaleFooterEffect, clearStaleFooterDeps);
  let showStatusNotices = shouldShowStatusNotices(isSwarmFooterVisible && !isHelpOpen);
  const footerNavActive = activeFooterTab !== null;
  let hintRowArgs;
  if (
    $[107] !== exitMessage ||
    $[108] !== storeSelector_2 ||
    $[109] !== isPasting ||
    $[110] !== storeSelector_4 ||
    $[111] !== showStatusNotices ||
    $[112] !== showExpandPasteHint ||
    $[113] !== footerNavActive
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
    $[107] = exitMessage;
    $[108] = storeSelector_2;
    $[109] = isPasting;
    $[110] = storeSelector_4;
    $[111] = showStatusNotices;
    $[112] = showExpandPasteHint;
    $[113] = footerNavActive;
    $[114] = hintRowArgs;
  } else hintRowArgs = $[114];
  let row1Hint = PromptHintRow(hintRowArgs);
  let tasksTabSelected = activeFooterTab === "tasks";
  let workflowsTabSelected = activeFooterTab === "workflows";
  let bridgeSelected = activeFooterTab === "bridge";
  let ideSelectionSelected = activeFooterTab === "ideSelection";
  let footerTabMissing = activeFooterTab !== null && !footerTabsEnabled.includes(activeFooterTab);
  let setFooterTabThunk;
  if (
    $[115] !== isSwarmFooterVisible ||
    $[116] !== firstTaskIndex ||
    $[117] !== setShowState ||
    $[118] !== setCoordinatorTaskIndex ||
    $[119] !== setWorkflowFooterIndex
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
    $[115] = isSwarmFooterVisible;
    $[116] = firstTaskIndex;
    $[117] = setShowState;
    $[118] = setCoordinatorTaskIndex;
    $[119] = setWorkflowFooterIndex;
    $[120] = setFooterTabThunk;
  } else setFooterTabThunk = $[120];
  let selectFooterTab = setFooterTabThunk;
  let moveFooterSelection;
  if (
    $[121] !== visibleAgentTaskCount ||
    $[122] !== activeFooterTab ||
    $[123] !== runningWorkflows.length ||
    $[124] !== selectFooterTab ||
    $[125] !== footerTabMissing ||
    $[126] !== setCoordinatorTaskIndex ||
    $[127] !== setWorkflowFooterIndex
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
          setWorkflowFooterIndex(Math.max(0, runningWorkflows.length - 1));
        return true;
      }
      if (delta < 0 && allowClear) {
        selectFooterTab(null);
        return true;
      }
      return false;
    };
    $[121] = visibleAgentTaskCount;
    $[122] = activeFooterTab;
    $[123] = runningWorkflows.length;
    $[124] = selectFooterTab;
    $[125] = footerTabMissing;
    $[126] = setCoordinatorTaskIndex;
    $[127] = setWorkflowFooterIndex;
    $[128] = moveFooterSelection;
  } else moveFooterSelection = $[128];
  let moveFooterSelectionStable = moveFooterSelection;
  const hasInput = !storeSelector_3;
  let suggestionArgs;
  if ($[129] !== storeSelector_5 || $[130] !== hasInput) {
    suggestionArgs = {
      hasInput,
      isAssistantResponding: storeSelector_5,
    };
    $[129] = storeSelector_5;
    $[130] = hasInput;
    $[131] = suggestionArgs;
  } else suggestionArgs = $[131];
  let {
    suggestion: suggestion_2,
    markAccepted,
    logOutcomeAtSubmission,
    markShown,
  } = usePromptSuggestion(suggestionArgs);
  let { addNotification, removeNotification } = useNotifications();
  let placeholderArgs;
  if (
    $[132] !== hasMessages ||
    $[133] !== storeSelector_3 ||
    $[134] !== submitCount ||
    $[135] !== viewingAgentName_2
  ) {
    placeholderArgs = {
      isInputEmpty: storeSelector_3,
      submitCount,
      hasMessages,
      viewingAgentName: viewingAgentName_2,
    };
    $[132] = hasMessages;
    $[133] = storeSelector_3;
    $[134] = submitCount;
    $[135] = viewingAgentName_2;
    $[136] = placeholderArgs;
  } else placeholderArgs = $[136];
  let promptInputPlaceholder = usePromptInputPlaceholder(placeholderArgs);
  let toggleHelp;
  if ($[137] !== setHelpOpen) {
    toggleHelp = () => {
      logEvent("tengu_help_toggled", {});
      setHelpOpen(toggleHelpOpen);
    };
    $[137] = setHelpOpen;
    $[138] = toggleHelp;
  } else toggleHelp = $[138];
  let toggleHelpStable = toggleHelp;
  let onHistoryDownPastEnd;
  if ($[139] !== selectFooterTab || $[140] !== storageV5 || $[141] !== footerTabsEnabled[0]) {
    onHistoryDownPastEnd = () => {
      let firstTab = footerTabsEnabled[0];
      if (firstTab === undefined) {
        return;
      }
      selectFooterTab(firstTab);
      if (firstTab === "tasks" && !getGlobalConfig().hasSeenTasksHint)
        saveGlobalConfig(markTasksHintSeen, storageV5);
    };
    $[139] = selectFooterTab;
    $[140] = storageV5;
    $[141] = footerTabsEnabled[0];
    $[142] = onHistoryDownPastEnd;
  } else onHistoryDownPastEnd = $[142];
  let onHistoryDownPastEnd_2 = onHistoryDownPastEnd;
  let popQueuedInput;
  if (
    $[143] !== addNotification ||
    $[144] !== chrome ||
    $[145] !== clearQueueEditIndexAction ||
    $[146] !== draft ||
    $[147] !== setMode ||
    $[148] !== commandQueueOrDefault ||
    $[149] !== session ||
    $[150] !== setCursorOffset ||
    $[151] !== setValue ||
    $[152] !== setPastedContents ||
    $[153] !== store ||
    $[154] !== editorMode
  ) {
    popQueuedInput = () => {
      let queueEditIndex = store.getState().queueEditIndex;
      if (queueEditIndex === null) {
        return false;
      }
      let currentDraftValue = draft.value;
      let queuedCommand = commandQueueOrDefault.getCommandQueue().filter(isRefillableInput)[queueEditIndex];
      if (queuedCommand && !shouldPrependModeChar(queuedCommand, currentDraftValue === "")) {
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
    $[143] = addNotification;
    $[144] = chrome;
    $[145] = clearQueueEditIndexAction;
    $[146] = draft;
    $[147] = setMode;
    $[148] = commandQueueOrDefault;
    $[149] = session;
    $[150] = setCursorOffset;
    $[151] = setValue;
    $[152] = setPastedContents;
    $[153] = store;
    $[154] = editorMode;
    $[155] = popQueuedInput;
  } else popQueuedInput = $[155];
  let popQueuedInputStable = popQueuedInput;
  let lastSubmittedInputRef = useRef(null);
  let lastConfirmedAgentCommand = useRef(null);
  let agentCommandDialog = useRef(null);
  let cleanupAgentNoticeEffect;
  if ($[156] !== removeNotification) {
    cleanupAgentNoticeEffect = () => () => {
      lastConfirmedAgentCommand.current = null;
      agentCommandDialog.current?.close();
      removeNotification(AGENT_VIEW_COMMAND_NOTICE);
    };
    $[156] = removeNotification;
    $[157] = cleanupAgentNoticeEffect;
  } else cleanupAgentNoticeEffect = $[157];
  let cleanupAgentNoticeDeps;
  if ($[158] !== removeNotification || $[159] !== tasks_2) {
    cleanupAgentNoticeDeps = [tasks_2, removeNotification];
    $[158] = removeNotification;
    $[159] = tasks_2;
    $[160] = cleanupAgentNoticeDeps;
  } else cleanupAgentNoticeDeps = $[160];
  useEffect(cleanupAgentNoticeEffect, cleanupAgentNoticeDeps);
  let submittedRecentlyRef = useRef(false);
  let resetSubmitTracking;
  if ($[161] === MEMO_CACHE_SENTINEL) {
    resetSubmitTracking = () => {
      lastSubmittedInputRef.current = null;
      submittedRecentlyRef.current = false;
    };
    $[161] = resetSubmitTracking;
  } else resetSubmitTracking = $[161];
  let resetSubmitTrackingStable = resetSubmitTracking;
  let isChordGestureSpent;
  if ($[162] !== draft.changedFromOutside || $[163] !== draft.value) {
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
    $[162] = draft.changedFromOutside;
    $[163] = draft.value;
    $[164] = isChordGestureSpent;
  } else isChordGestureSpent = $[164];
  let chordGestureSpent = isChordGestureSpent;
  let markSubmitted;
  if ($[165] !== clock) {
    markSubmitted = (submittedInput) => {
      lastSubmittedInputRef.current = submittedInput;
      submittedRecentlyRef.current = true;
      clock.setTimeout(resetSubmitTrackingStable, 0);
    };
    $[165] = clock;
    $[166] = markSubmitted;
  } else markSubmitted = $[166];
  let markSubmittedStable = markSubmitted;
  let markSubmittedOnly;
  if ($[167] !== clock) {
    markSubmittedOnly = () => {
      submittedRecentlyRef.current = true;
      clock.setTimeout(resetSubmitTrackingStable, 0);
    };
    $[167] = clock;
    $[168] = markSubmittedOnly;
  } else markSubmittedOnly = $[168];
  let markSubmittedOnlyStable = markSubmittedOnly;
  let lastClickRef = useRef(null);
  let noteClick;
  if ($[169] === MEMO_CACHE_SENTINEL) {
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
    $[169] = noteClick;
  } else noteClick = $[169];
  let noteDoubleClickCandidate = noteClick;
  let isDoubleClick;
  if ($[170] === MEMO_CACHE_SENTINEL) {
    isDoubleClick = () => {
      let lastClick = lastClickRef.current;
      return (
        lastClick !== null &&
        (lastClick.sameChunk || performance.now() - lastClick.at < FOOTER_DOUBLE_CLICK_MS)
      );
    };
    $[170] = isDoubleClick;
  } else isDoubleClick = $[170];
  let isDoubleClickActive = isDoubleClick;
  let footerOwnsKey;
  if ($[171] !== footerTabs || $[172] !== store) {
    footerOwnsKey = () => {
      let { footerSelection } = store.getState();
      return footerSelection !== null && footerTabs.includes(footerSelection);
    };
    $[171] = footerTabs;
    $[172] = store;
    $[173] = footerOwnsKey;
  } else footerOwnsKey = $[173];
  let footerOwnsKeyCheck = footerOwnsKey;
  let shadowedFooterActionHandler = useShadowedFooterActionHandler(footerOwnsKeyCheck);
  let clearBuffer;
  if ($[174] === MEMO_CACHE_SENTINEL) {
    clearBuffer = () => composerHandleRef.current?.clearBuffer();
    $[174] = clearBuffer;
  } else clearBuffer = $[174];
  let clearBufferStable = clearBuffer;
  let [redrawCount, setRedrawCount] = useState(0);
  let forceRedrawEffect;
  let redrawDeps;
  if ($[175] !== redrawCount) {
    forceRedrawEffect = () => {
      if (redrawCount === 0) {
        return;
      }
      getSecondRootError().get(process.stdout)?.forceRedraw();
    };
    redrawDeps = [redrawCount];
    $[175] = redrawCount;
    $[176] = forceRedrawEffect;
    $[177] = redrawDeps;
  } else {
    forceRedrawEffect = $[176];
    redrawDeps = $[177];
  }
  useLayoutEffect(forceRedrawEffect, redrawDeps);
  let handleSubmitRaw;
  if (
    $[178] !== addNotification ||
    $[179] !== dialogStore ||
    $[180] !== draft ||
    $[181] !== footerOwnsKeyCheck ||
    $[182] !== logOutcomeAtSubmission ||
    $[183] !== markAccepted ||
    $[184] !== markSubmittedOnlyStable ||
    $[185] !== submitToAgent ||
    $[186] !== submitEmpty ||
    $[187] !== submit_2 ||
    $[188] !== suggestion ||
    $[189] !== popQueuedInputStable ||
    $[190] !== removeNotification ||
    $[191] !== scope ||
    $[192] !== session ||
    $[193] !== setCursorOffset ||
    $[194] !== setValue ||
    $[195] !== setPastedContents ||
    $[196] !== storageV5 ||
    $[197] !== store ||
    $[198] !== suggestionsStore.own ||
    $[199] !== teamContext
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
        E0: switch (agentCommandNotice?.onSubmit) {
          case undefined: {
            break E0;
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
              break E0;
            }
            if (agentCommandDialog.current !== null) {
              return;
            }
            logEvent("tengu_agent_view_leader_command_notice", {});
            let confirmDialog = scope.localJsx.show(
              jsxProd_default(ConfirmRemoveTag, {
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
    $[178] = addNotification;
    $[179] = dialogStore;
    $[180] = draft;
    $[181] = footerOwnsKeyCheck;
    $[182] = logOutcomeAtSubmission;
    $[183] = markAccepted;
    $[184] = markSubmittedOnlyStable;
    $[185] = submitToAgent;
    $[186] = submitEmpty;
    $[187] = submit_2;
    $[188] = suggestion;
    $[189] = popQueuedInputStable;
    $[190] = removeNotification;
    $[191] = scope;
    $[192] = session;
    $[193] = setCursorOffset;
    $[194] = setValue;
    $[195] = setPastedContents;
    $[196] = storageV5;
    $[197] = store;
    $[198] = suggestionsStore.own;
    $[199] = teamContext;
    $[200] = handleSubmitRaw;
  } else handleSubmitRaw = $[200];
  let handleSubmit = handleSubmitRaw;
  let submitRequestHandler;
  let submitDeps;
  if ($[201] !== draft || $[202] !== handleSubmit) {
    submitRequestHandler = () =>
      draft.onSubmitRequest(
        (requestInput, requestOptions) => void handleSubmit(requestInput, requestOptions),
      );
    submitDeps = [draft, handleSubmit];
    $[201] = draft;
    $[202] = handleSubmit;
    $[203] = submitRequestHandler;
    $[204] = submitDeps;
  } else {
    submitRequestHandler = $[203];
    submitDeps = $[204];
  }
  useLayoutEffect(submitRequestHandler, submitDeps);
  let historySubmitHandler;
  if ($[205] !== handleSubmit || $[206] !== setPastedContents) {
    historySubmitHandler = (historyEntry) => {
      setPastedContents(historyEntry.pastedContents);
      handleSubmit(historyEntry.display, false, historyEntry.pastedContents);
    };
    $[205] = handleSubmit;
    $[206] = setPastedContents;
    $[207] = historySubmitHandler;
  } else historySubmitHandler = $[207];
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
  if ($[208] !== draft || $[209] !== isOverlayOpen) {
    overlayEffect = () => {
      draft.setInputOverlayActive(isOverlayOpen);
      return () => draft.setInputOverlayActive(false);
    };
    overlayDeps = [isOverlayOpen, draft];
    $[208] = draft;
    $[209] = isOverlayOpen;
    $[210] = overlayEffect;
    $[211] = overlayDeps;
  } else {
    overlayEffect = $[210];
    overlayDeps = $[211];
  }
  useEffect(overlayEffect, overlayDeps);
  let inputOwnsEscape;
  if (
    $[212] !== storeSelector_3 ||
    $[213] !== isOverlayOpen ||
    $[214] !== isVimEditing ||
    $[215] !== storeSelector_4 ||
    $[216] !== appState_2 ||
    $[217] !== commandQueue
  ) {
    inputOwnsEscape =
      isVimEditing ||
      isOverlayOpen ||
      storeSelector_4 !== "prompt" ||
      appState_2 !== null ||
      (!isKbCohesionFixesOn() &&
        commandQueue.some((queuedCommand_2) => shouldPrependModeChar(queuedCommand_2, storeSelector_3)));
    $[212] = storeSelector_3;
    $[213] = isOverlayOpen;
    $[214] = isVimEditing;
    $[215] = storeSelector_4;
    $[216] = appState_2;
    $[217] = commandQueue;
    $[218] = inputOwnsEscape;
  } else inputOwnsEscape = $[218];
  let inputOwnsEscapeFlag = inputOwnsEscape;
  let escapeOwnershipEffect;
  let escapeOwnershipDeps;
  if ($[219] !== draft || $[220] !== inputOwnsEscapeFlag) {
    escapeOwnershipEffect = () => {
      draft.setInputOwnsEscape(inputOwnsEscapeFlag);
      return () => draft.setInputOwnsEscape(false);
    };
    escapeOwnershipDeps = [inputOwnsEscapeFlag, draft];
    $[219] = draft;
    $[220] = inputOwnsEscapeFlag;
    $[221] = escapeOwnershipEffect;
    $[222] = escapeOwnershipDeps;
  } else {
    escapeOwnershipEffect = $[221];
    escapeOwnershipDeps = $[222];
  }
  useEffect(escapeOwnershipEffect, escapeOwnershipDeps);
  let storeSelector_8 = useStoreSelector(suggestionsStore.drawn, hasSuggestions);
  let storeSelector_9 = useStoreSelector(suggestionsStore, hasSuggestions);
  let onSelectSuggestionImpl;
  if ($[223] === MEMO_CACHE_SENTINEL) {
    onSelectSuggestionImpl = (suggestionIndex, hovered) =>
      composerHandleRef.current?.selectSuggestion(suggestionIndex, hovered);
    $[223] = onSelectSuggestionImpl;
  } else onSelectSuggestionImpl = $[223];
  let onSelectSuggestion = onSelectSuggestionImpl;
  let onHoverSuggestionImpl;
  if ($[224] === MEMO_CACHE_SENTINEL) {
    onHoverSuggestionImpl = (suggestionIndex) =>
      composerHandleRef.current?.setHoveredSuggestion(suggestionIndex);
    $[224] = onHoverSuggestionImpl;
  } else onHoverSuggestionImpl = $[224];
  let onHoverSuggestion = onHoverSuggestionImpl;
  let emptyArray;
  if ($[225] === MEMO_CACHE_SENTINEL) {
    emptyArray = [];
    $[225] = emptyArray;
  } else emptyArray = $[225];
  let pendingPastes = useRef(emptyArray);
  let takePendingPastesImpl;
  if ($[226] === MEMO_CACHE_SENTINEL) {
    takePendingPastesImpl = () => pendingPastes.current.splice(0);
    $[226] = takePendingPastesImpl;
  } else takePendingPastesImpl = $[226];
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
  if ($[227] === MEMO_CACHE_SENTINEL) {
    clearScreen = () => {
      setRedrawCount(bumpRetryCount);
    };
    $[227] = clearScreen;
  } else clearScreen = $[227];
  let clearScreenStable = clearScreen;
  let showRemoteSwitchNotice;
  if ($[228] !== addNotification) {
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
    $[228] = addNotification;
    $[229] = showRemoteSwitchNotice;
  } else showRemoteSwitchNotice = $[229];
  let remoteSwitchNotice = showRemoteSwitchNotice;
  let openModelPicker;
  if (
    $[230] !== addNotification ||
    $[231] !== storeSelector_6 ||
    $[232] !== storeSelector_5 ||
    $[233] !== storeSelector_4 ||
    $[234] !== submit_2 ||
    $[235] !== setHelpOpen
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
    $[230] = addNotification;
    $[231] = storeSelector_6;
    $[232] = storeSelector_5;
    $[233] = storeSelector_4;
    $[234] = submit_2;
    $[235] = setHelpOpen;
    $[236] = openModelPicker;
  } else openModelPicker = $[236];
  let openModelPickerStable = openModelPicker;
  let toggleFastMode;
  if ($[237] !== remoteSwitchNotice || $[238] !== setHelpOpen) {
    toggleFastMode = () => {
      if (!isRemoteControlChannelAvailable() && remoteSwitchNotice()) {
        return;
      }
      setFastModePickerState(unavailableReasonState);
      setHelpOpen(false);
    };
    $[237] = remoteSwitchNotice;
    $[238] = setHelpOpen;
    $[239] = toggleFastMode;
  } else toggleFastMode = $[239];
  let toggleFastModeStable = toggleFastMode;
  let toggleThinking;
  if (
    $[240] !== addNotification ||
    $[241] !== mainLoopModel ||
    $[242] !== remoteSwitchNotice ||
    $[243] !== setHelpOpen
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
          priority: "immediate",
        });
        return;
      }
      setThinkingToggleOpen(negateBoolean_2);
    };
    $[240] = addNotification;
    $[241] = mainLoopModel;
    $[242] = remoteSwitchNotice;
    $[243] = setHelpOpen;
    $[244] = toggleThinking;
  } else toggleThinking = $[244];
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
    $[245] !== addNotification ||
    $[246] !== session ||
    $[247] !== setShowState ||
    $[248] !== setHelpOpen ||
    $[249] !== storeSelector_7 ||
    $[250] !== storageV5 ||
    $[251] !== store ||
    $[252] !== taskStore ||
    $[253] !== teamContext ||
    $[254] !== turn
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
    $[245] = addNotification;
    $[246] = session;
    $[247] = setShowState;
    $[248] = setHelpOpen;
    $[249] = storeSelector_7;
    $[250] = storageV5;
    $[251] = store;
    $[252] = taskStore;
    $[253] = teamContext;
    $[254] = turn;
    $[255] = cycleMode;
  } else cycleMode = $[255];
  let cycleModeStable = cycleMode;
  let onConfirmPlaceholder = noopOnConfirm;
  let acceptCarouselSelection;
  if (
    $[256] !== takePendingEnterSelection ||
    $[257] !== cycleModeStable ||
    $[258] !== setPendingEnterSelection
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
    $[256] = takePendingEnterSelection;
    $[257] = cycleModeStable;
    $[258] = setPendingEnterSelection;
    $[259] = acceptCarouselSelection;
  } else acceptCarouselSelection = $[259];
  let acceptCarouselSelectionStable = acceptCarouselSelection;
  let takeEnter = returnFalse;
  let acceptEnvOnboarding;
  if ($[260] !== setShowState || $[261] !== turn) {
    acceptEnvOnboarding = () => {
      setAutoModeEnvOnboardingEligible(false);
      turn.dismissEnvOnboardingOffer();
      if (!isAutoModeSetupNotOverridden()) {
        return;
      }
      setShowState(withAutoModeSetupMessage);
    };
    $[260] = setShowState;
    $[261] = turn;
    $[262] = acceptEnvOnboarding;
  } else acceptEnvOnboarding = $[262];
  let onAccept = acceptEnvOnboarding;
  let dismissEnvOnboarding;
  if ($[263] !== turn) {
    dismissEnvOnboarding = () => {
      setAutoModeEnvOnboardingEligible(false);
      turn.dismissEnvOnboardingOffer();
    };
    $[263] = turn;
    $[264] = dismissEnvOnboarding;
  } else dismissEnvOnboarding = $[264];
  let dismissEnvOnboardingStable = dismissEnvOnboarding;
  let keybindingContext = useKeybindingContext();
  let registerSubmitHandler;
  if (
    $[265] !== chordGestureSpent ||
    $[266] !== draft.typedOnly ||
    $[267] !== draft.value ||
    $[268] !== shadowedFooterActionHandler ||
    $[269] !== isModalOverlayActive ||
    $[270] !== isSearching ||
    $[271] !== keybindingContext ||
    $[272] !== markSubmittedStable ||
    $[273] !== handleSubmit
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
    $[265] = chordGestureSpent;
    $[266] = draft.typedOnly;
    $[267] = draft.value;
    $[268] = shadowedFooterActionHandler;
    $[269] = isModalOverlayActive;
    $[270] = isSearching;
    $[271] = keybindingContext;
    $[272] = markSubmittedStable;
    $[273] = handleSubmit;
    $[274] = registerSubmitHandler;
  } else registerSubmitHandler = $[274];
  let submitHandlerDeps;
  if (
    $[275] !== chordGestureSpent ||
    $[276] !== acceptCarouselSelectionStable ||
    $[277] !== draft ||
    $[278] !== shadowedFooterActionHandler ||
    $[279] !== isModalOverlayActive ||
    $[280] !== isSearching ||
    $[281] !== keybindingContext ||
    $[282] !== markSubmittedStable ||
    $[283] !== handleSubmit
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
    $[275] = chordGestureSpent;
    $[276] = acceptCarouselSelectionStable;
    $[277] = draft;
    $[278] = shadowedFooterActionHandler;
    $[279] = isModalOverlayActive;
    $[280] = isSearching;
    $[281] = keybindingContext;
    $[282] = markSubmittedStable;
    $[283] = handleSubmit;
    $[284] = submitHandlerDeps;
  } else submitHandlerDeps = $[284];
  useEffect(registerSubmitHandler, submitHandlerDeps);
  let queueSubmitHandler;
  if (
    $[285] !== chordGestureSpent ||
    $[286] !== draft.value ||
    $[287] !== markSubmittedStable ||
    $[288] !== handleSubmit
  ) {
    queueSubmitHandler = () => {
      if (chordGestureSpent(undefined)) {
        return;
      }
      let inputValue = draft.value;
      markSubmittedStable(inputValue);
      handleSubmit(inputValue, true, undefined, true);
    };
    $[285] = chordGestureSpent;
    $[286] = draft.value;
    $[287] = markSubmittedStable;
    $[288] = handleSubmit;
    $[289] = queueSubmitHandler;
  } else queueSubmitHandler = $[289];
  let queueSubmit = queueSubmitHandler;
  let sendQueuedNow = submit.sendQueuedNow;
  let sendNowHandler;
  if (
    $[290] !== chordGestureSpent ||
    $[291] !== draft.mode ||
    $[292] !== draft.pastedContents ||
    $[293] !== draft.value ||
    $[294] !== markSubmittedStable ||
    $[295] !== handleSubmit ||
    $[296] !== sendQueuedNow ||
    $[297] !== store ||
    $[298] !== turn
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
    $[290] = chordGestureSpent;
    $[291] = draft.mode;
    $[292] = draft.pastedContents;
    $[293] = draft.value;
    $[294] = markSubmittedStable;
    $[295] = handleSubmit;
    $[296] = sendQueuedNow;
    $[297] = store;
    $[298] = turn;
    $[299] = sendNowHandler;
  } else sendNowHandler = $[299];
  let sendNowAction = sendNowHandler;
  let cycleModeAction;
  if ($[300] !== cycleModeStable) {
    cycleModeAction = () =>
      cycleModeStable({
        kind: "carousel",
      });
    $[300] = cycleModeStable;
    $[301] = cycleModeAction;
  } else cycleModeAction = $[301];
  let extraMessageActionsA;
  let extraMessageActionsB;
  if ($[302] === MEMO_CACHE_SENTINEL) {
    extraMessageActionsA = {};
    extraMessageActionsB = {};
    $[302] = extraMessageActionsA;
    $[303] = extraMessageActionsB;
  } else {
    extraMessageActionsA = $[302];
    extraMessageActionsB = $[303];
  }
  let messageActions;
  if (
    $[304] !== openModelPickerStable ||
    $[305] !== queueSubmit ||
    $[306] !== sendNowAction ||
    $[307] !== toggleThinkingStable ||
    $[308] !== cycleModeAction
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
    $[304] = openModelPickerStable;
    $[305] = queueSubmit;
    $[306] = sendNowAction;
    $[307] = toggleThinkingStable;
    $[308] = cycleModeAction;
    $[309] = messageActions;
  } else messageActions = $[309];
  let messageActionsStable = messageActions;
  let isActionsActive = !isModalOverlayActive && !isSearching;
  let actionsArgs;
  if ($[310] !== isActionsActive || $[311] !== shadowedFooterActionHandler) {
    actionsArgs = {
      isActive: isActionsActive,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[310] = isActionsActive;
    $[311] = shadowedFooterActionHandler;
    $[312] = actionsArgs;
  } else actionsArgs = $[312];
  useFooterAwareMessageActions(messageActionsStable, actionsArgs);
  const isActive = isActionsActive && storeSelector_4 === "prompt";
  let sendNowKeyOptions;
  if ($[313] !== isActive) {
    sendNowKeyOptions = {
      context: "Chat",
      isActive,
    };
    $[313] = isActive;
    $[314] = sendNowKeyOptions;
  } else sendNowKeyOptions = $[314];
  useKeybinding(SEND_NOW_HINT_KEY, sendNowAction, sendNowKeyOptions);
  const isActive_2 = !isModalOverlayActive && !isSearching && !storeSelector_9 && !isHelpOpen;
  let successorKeyArgs;
  if ($[315] !== shadowedFooterActionHandler || $[316] !== isActive_2) {
    successorKeyArgs = {
      isActive: isActive_2,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[315] = shadowedFooterActionHandler;
    $[316] = isActive_2;
    $[317] = successorKeyArgs;
  } else successorKeyArgs = $[317];
  useSavedModelSuccessorKey(successorKeyArgs);
  const isActive_3 = !isModalOverlayActive && !isSearching;
  let effortStepArgs;
  if ($[318] !== shadowedFooterActionHandler || $[319] !== isActive_3) {
    effortStepArgs = {
      isActive: isActive_3,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[318] = shadowedFooterActionHandler;
    $[319] = isActive_3;
    $[320] = effortStepArgs;
  } else effortStepArgs = $[320];
  let effortStepKeys = useEffortStepKeys(transcript, effortStepArgs);
  let fastModeActions;
  if ($[321] !== toggleFastModeStable) {
    fastModeActions = {
      "chat:fastMode": toggleFastModeStable,
    };
    $[321] = toggleFastModeStable;
    $[322] = fastModeActions;
  } else fastModeActions = $[322];
  let isActive_4;
  if ($[323] !== isModalOverlayActive) {
    isActive_4 = !isModalOverlayActive && isFastModeEnabled() && isFastModeAvailable();
    $[323] = isModalOverlayActive;
    $[324] = isActive_4;
  } else isActive_4 = $[324];
  let fastModeArgs;
  if ($[325] !== shadowedFooterActionHandler || $[326] !== isActive_4) {
    fastModeArgs = {
      isActive: isActive_4,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[325] = shadowedFooterActionHandler;
    $[326] = isActive_4;
    $[327] = fastModeArgs;
  } else fastModeArgs = $[327];
  useFooterAwareMessageActions(fastModeActions, fastModeArgs);
  let dismissHelp;
  if ($[328] !== setHelpOpen) {
    dismissHelp = () => {
      setHelpOpen(false);
    };
    $[328] = setHelpOpen;
    $[329] = dismissHelp;
  } else dismissHelp = $[329];
  let helpKeyArgs;
  if ($[330] !== isHelpOpen) {
    helpKeyArgs = {
      context: "Help",
      isActive: isHelpOpen,
    };
    $[330] = isHelpOpen;
    $[331] = helpKeyArgs;
  } else helpKeyArgs = $[331];
  useKeybinding("help:dismiss", dismissHelp, helpKeyArgs);
  let openHistorySearch;
  if ($[332] !== addNotification || $[333] !== setHelpOpen) {
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
    $[332] = addNotification;
    $[333] = setHelpOpen;
    $[334] = openHistorySearch;
  } else openHistorySearch = $[334];
  let openHistorySearchStable = openHistorySearch;
  let isActive_5;
  if ($[335] !== isModalOverlayActive) {
    isActive_5 = isFullscreenActive() && !isModalOverlayActive;
    $[335] = isModalOverlayActive;
    $[336] = isActive_5;
  } else isActive_5 = $[336];
  let historySearchKeyArgs;
  if ($[337] !== isActive_5) {
    historySearchKeyArgs = {
      context: "Global",
      isActive: isActive_5,
    };
    $[337] = isActive_5;
    $[338] = historySearchKeyArgs;
  } else historySearchKeyArgs = $[338];
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
    if (workflowsTabSelected && appState_14 > 0) {
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
      if (appState_14 < runningWorkflows.length - 1) {
        setWorkflowFooterIndex(incrementWorkflowIndex);
        return;
      }
      moveFooterSelectionStable(footerTabsEnabled, 1);
      return;
    }
    moveFooterSelectionStable(footerTabsEnabled, 1);
  }
  let dispatchCommandImpl;
  if ($[339] !== submit_2) {
    dispatchCommandImpl = (commandText) => {
      submit_2(commandText, NOOP_HELPERS, {
        fromKeybinding: true,
        inputModeOverride: "prompt",
        leavesIdeSelection: true,
      });
    };
    $[339] = submit_2;
    $[340] = dispatchCommandImpl;
  } else dispatchCommandImpl = $[340];
  let dispatchCommand = dispatchCommandImpl;
  let openArtifacts;
  if (
    $[341] !== addNotification ||
    $[342] !== cloudRowCheck ||
    $[343] !== submit_2 ||
    $[344] !== removeNotification ||
    $[345] !== store
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
    $[341] = addNotification;
    $[342] = cloudRowCheck;
    $[343] = submit_2;
    $[344] = removeNotification;
    $[345] = store;
    $[346] = openArtifacts;
  } else openArtifacts = $[346];
  let openArtifactsStable = openArtifacts;
  let findSelectedTask;
  if ($[347] !== store) {
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
    $[347] = store;
    $[348] = findSelectedTask;
  } else findSelectedTask = $[348];
  let findSelectedTaskStable = findSelectedTask;
  function footerNext() {
    moveFooterSelectionStable(footerTabs, 1);
  }
  function footerPrevious() {
    moveFooterSelectionStable(footerTabs, -1);
  }
  let footerOpenSelected;
  if (
    $[349] !== chrome ||
    $[350] !== visibleAgentTaskCount ||
    $[351] !== footerOwnsKeyCheck ||
    $[352] !== openArtifactsStable ||
    $[353] !== findSelectedTaskStable ||
    $[354] !== selectFooterTab ||
    $[355] !== setShowState ||
    $[356] !== setHelpOpen ||
    $[357] !== store
  ) {
    footerOpenSelected = () => {
      setHelpOpen(false);
      let state = store.getState();
      U_: switch (footerOwnsKeyCheck() ? state.footerSelection : null) {
        case "tasks": {
          if (state.coordinatorTaskIndex >= 1) {
            let selectedTask = findSelectedTaskStable();
            if (selectedTask === undefined || selectedTask === "folded") {
              break U_;
            }
            if (isAgentRowVisible(selectedTask)) setShowState(expandIdleTeammates);
            else enterTeammateView(selectedTask.id, setShowState);
          } else if (state.coordinatorTaskIndex === 0 && visibleAgentTaskCount > 0)
            exitTeammateView(setShowState);
          else {
            chrome.openBashesDialog();
            selectFooterTab(null);
          }
          break U_;
        }
        case "workflows": {
          let workflowTask = runningWorkflowTasks(state.tasks)[state.workflowFooterIndex];
          if (workflowTask) {
            logFeatureOk("workflow_progress_preview");
            setShowState((prevState) =>
              prevState.workflowDetail?.taskId === workflowTask.id
                ? prevState
                : {
                    ...prevState,
                    workflowDetail: {
                      taskId: workflowTask.id,
                    },
                  },
            );
            selectFooterTab(null);
          }
          break U_;
        }
        case "bagel": {
          break U_;
        }
        case "bridge": {
          RemoteControlPill(store.getState());
          setBridgeDialogOpen(true);
          selectFooterTab(null);
          break U_;
        }
        case "frame": {
          openArtifactsStable();
          selectFooterTab(null);
        }
      }
    };
    $[349] = chrome;
    $[350] = visibleAgentTaskCount;
    $[351] = footerOwnsKeyCheck;
    $[352] = openArtifactsStable;
    $[353] = findSelectedTaskStable;
    $[354] = selectFooterTab;
    $[355] = setShowState;
    $[356] = setHelpOpen;
    $[357] = store;
    $[358] = footerOpenSelected;
  } else footerOpenSelected = $[358];
  let footerClearSelection;
  if (
    $[359] !== clearQueueEditIndexAction ||
    $[360] !== isHelpOpen ||
    $[361] !== appState_13 ||
    $[362] !== selectFooterTab ||
    $[363] !== setShowState ||
    $[364] !== setHelpOpen ||
    $[365] !== store ||
    $[366] !== appState_12 ||
    $[367] !== tasks ||
    $[368] !== tasksTabSelected ||
    $[369] !== tasks_2
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
    $[359] = clearQueueEditIndexAction;
    $[360] = isHelpOpen;
    $[361] = appState_13;
    $[362] = selectFooterTab;
    $[363] = setShowState;
    $[364] = setHelpOpen;
    $[365] = store;
    $[366] = appState_12;
    $[367] = tasks;
    $[368] = tasksTabSelected;
    $[369] = tasks_2;
    $[370] = footerClearSelection;
  } else footerClearSelection = $[370];
  let footerClose;
  if (
    $[371] !== footerOwnsKeyCheck ||
    $[372] !== keybindingContext ||
    $[373] !== firstTaskIndex ||
    $[374] !== findSelectedTaskStable ||
    $[375] !== session ||
    $[376] !== setShowState ||
    $[377] !== setCoordinatorTaskIndex ||
    $[378] !== storageV5 ||
    $[379] !== store ||
    $[380] !== taskStore
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
        let workflowTask = runningWorkflowTasks(state.tasks)[state.workflowFooterIndex];
        if (!workflowTask) {
          return false;
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
    $[371] = footerOwnsKeyCheck;
    $[372] = keybindingContext;
    $[373] = firstTaskIndex;
    $[374] = findSelectedTaskStable;
    $[375] = session;
    $[376] = setShowState;
    $[377] = setCoordinatorTaskIndex;
    $[378] = storageV5;
    $[379] = store;
    $[380] = taskStore;
    $[381] = footerClose;
  } else footerClose = $[381];
  let footerDismiss;
  if ($[382] !== chrome || $[383] !== footerOwnsKeyCheck || $[384] !== selectFooterTab || $[385] !== store) {
    footerDismiss = () => {
      if ((footerOwnsKeyCheck() ? store.getState().footerSelection : null) === "ideSelection") {
        chrome.dismissIdeSelection();
        selectFooterTab(null);
        return;
      }
      return false;
    };
    $[382] = chrome;
    $[383] = footerOwnsKeyCheck;
    $[384] = selectFooterTab;
    $[385] = store;
    $[386] = footerDismiss;
  } else footerDismiss = $[386];
  let footerKeybindings;
  if (
    $[387] !== moveFooterDown ||
    $[388] !== footerNext ||
    $[389] !== footerPrevious ||
    $[390] !== moveFooterUp ||
    $[391] !== footerOpenSelected ||
    $[392] !== footerClearSelection ||
    $[393] !== footerClose ||
    $[394] !== footerDismiss
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
    $[387] = moveFooterDown;
    $[388] = footerNext;
    $[389] = footerPrevious;
    $[390] = moveFooterUp;
    $[391] = footerOpenSelected;
    $[392] = footerClearSelection;
    $[393] = footerClose;
    $[394] = footerDismiss;
    $[395] = footerKeybindings;
  } else footerKeybindings = $[395];
  const isActive_6 = !!activeFooterTab && !isModalOverlayActive;
  let footerKeyArgs;
  if ($[396] !== isActive_6) {
    footerKeyArgs = {
      context: "Footer",
      isActive: isActive_6,
    };
    $[396] = isActive_6;
    $[397] = footerKeyArgs;
  } else footerKeyArgs = $[397];
  MessageActionsKeybindings(footerKeybindings, footerKeyArgs);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let fastModeCooldownActive = useFastModeCooldownActive();
  let isFastModeOnForRequestedModel;
  if ($[398] !== fastModeCooldownActive || $[399] !== model || $[400] !== mainLoopModel) {
    isFastModeOnForRequestedModel = () =>
      isFastModeOnForRequestModel(model, fastModeCooldownActive, mainLoopModel);
    $[398] = fastModeCooldownActive;
    $[399] = model;
    $[400] = mainLoopModel;
    $[401] = isFastModeOnForRequestedModel;
  } else isFastModeOnForRequestedModel = $[401];
  let fastModeSignals = useSyncExternalStore(
    onFastRejectedFallbackModelsChanged,
    isFastModeOnForRequestedModel,
  );
  let showFastIconHint = useShowFastIconHint(fastModeSignals ?? false);
  let fastModeTag;
  if (
    $[402] !== fastModeCooldownActive ||
    $[403] !== isScreenReaderEnabled ||
    $[404] !== fastModeSignals ||
    $[405] !== showFastIconHint
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
    $[402] = fastModeCooldownActive;
    $[403] = isScreenReaderEnabled;
    $[404] = fastModeSignals;
    $[405] = showFastIconHint;
    $[406] = fastModeTag;
  } else fastModeTag = $[406];
  let fastModeTagStable = fastModeTag;
  let isEffortShown = isEffortIndicatorShown(level, mainLoopModel, isBriefOnly);
  let isEffortShownStable = isEffortShown;
  let statusField = useStatusField("sentEffort");
  let statusField_2 = useStatusField("turnEffort");
  let isUltracodeOn;
  if ($[407] !== isBriefOnly || $[408] !== mainLoopModel || $[409] !== appState_9) {
    isUltracodeOn = !isBriefOnly && isUltracodeActive(appState_9, mainLoopModel);
    $[407] = isBriefOnly;
    $[408] = mainLoopModel;
    $[409] = appState_9;
    $[410] = isUltracodeOn;
  } else isUltracodeOn = $[410];
  let ultraEffortActive = isUltracodeOn;
  let refusalSettingsTag = useSyncExternalStore(onRefusalSettingsChange, noopOutputHandler);
  let options_2 = useUltracodeShimmer(ultraEffortActive && !isScreenReaderEnabled);
  let ultraEffortTag;
  let topBorderText;
  if (
    $[411] !== fastModeTagStable ||
    $[412] !== refusalSettingsTag ||
    $[413] !== options_2 ||
    $[414] !== ultraEffortActive
  ) {
    let ultraTag = treeify(ultraEffortActive, options_2);
    ultraEffortTag = ultraTag;
    topBorderText = buildBorderText([ultraTag, fastModeTagStable, refusalSettingsTag]);
    $[411] = fastModeTagStable;
    $[412] = refusalSettingsTag;
    $[413] = options_2;
    $[414] = ultraEffortActive;
    $[415] = ultraEffortTag;
    $[416] = topBorderText;
  } else {
    ultraEffortTag = $[415];
    topBorderText = $[416];
  }
  let borderProps;
  if ($[417] !== ultraEffortTag || $[418] !== topBorderText) {
    borderProps = {
      ultraEffortTag,
      topBorderText,
    };
    $[417] = ultraEffortTag;
    $[418] = topBorderText;
    $[419] = borderProps;
  } else borderProps = $[419];
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
    $[420] !== addNotification ||
    $[421] !== supportsPerTurnEffort ||
    $[422] !== effortStatusText_2 ||
    $[423] !== removeNotification ||
    $[424] !== store
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
    $[420] = addNotification;
    $[421] = supportsPerTurnEffort;
    $[422] = effortStatusText_2;
    $[423] = removeNotification;
    $[424] = store;
    $[425] = syncEffortNotice;
  } else syncEffortNotice = $[425];
  let syncEffortDeps;
  if (
    $[426] !== addNotification ||
    $[427] !== supportsPerTurnEffort ||
    $[428] !== removeNotification ||
    $[429] !== store
  ) {
    syncEffortDeps = [supportsPerTurnEffort, store, addNotification, removeNotification];
    $[426] = addNotification;
    $[427] = supportsPerTurnEffort;
    $[428] = removeNotification;
    $[429] = store;
    $[430] = syncEffortDeps;
  } else syncEffortDeps = $[430];
  useEffect(syncEffortNotice, syncEffortDeps);
  let showEffortNotice;
  if (
    $[431] !== addNotification ||
    $[432] !== effortStatus ||
    $[433] !== effortStatusText_2 ||
    $[434] !== removeNotification
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
    $[431] = addNotification;
    $[432] = effortStatus;
    $[433] = effortStatusText_2;
    $[434] = removeNotification;
    $[435] = showEffortNotice;
  } else showEffortNotice = $[435];
  let showEffortDeps;
  if ($[436] !== addNotification || $[437] !== effortStatus || $[438] !== removeNotification) {
    showEffortDeps = [effortStatus, addNotification, removeNotification];
    $[436] = addNotification;
    $[437] = effortStatus;
    $[438] = removeNotification;
    $[439] = showEffortDeps;
  } else showEffortDeps = $[439];
  useEffect(showEffortNotice, showEffortDeps);
  useMaxEffortNotice(isEffortShown);
  let placeholder = shouldMarkSuggestionShown && suggestion_2 ? suggestion_2 : promptInputPlaceholder;
  let modelSwitchGeneration = useRef(0);
  let applyModelSwitch;
  if (
    $[440] !== addNotification ||
    $[441] !== session ||
    $[442] !== setShowState ||
    $[443] !== storageV5 ||
    $[444] !== store
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
    $[440] = addNotification;
    $[441] = session;
    $[442] = setShowState;
    $[443] = storageV5;
    $[444] = store;
    $[445] = applyModelSwitch;
  } else applyModelSwitch = $[445];
  let applyModelSwitchStable = applyModelSwitch;
  let isSavedPick = useRef(false);
  let onSelectModel;
  if (
    $[446] !== addNotification ||
    $[447] !== applyModelSwitchStable ||
    $[448] !== session ||
    $[449] !== setShowState ||
    $[450] !== storageV5 ||
    $[451] !== store
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
    $[446] = addNotification;
    $[447] = applyModelSwitchStable;
    $[448] = session;
    $[449] = setShowState;
    $[450] = storageV5;
    $[451] = store;
    $[452] = onSelectModel;
  } else onSelectModel = $[452];
  let onSelect = onSelectModel;
  let onCancelModelPicker;
  if ($[453] === MEMO_CACHE_SENTINEL) {
    onCancelModelPicker = () => {
      isSavedPick.current = false;
      setModelPickerOpen(false);
    };
    $[453] = onCancelModelPicker;
  } else onCancelModelPicker = $[453];
  let onCancel = onCancelModelPicker;
  let resolvedModel;
  if ($[454] !== appState_7 || $[455] !== appState_6) {
    resolvedModel = useMainLoopModel({
      mainLoopModel: appState_6,
      mainLoopModelForSession: appState_7,
    });
    $[454] = appState_7;
    $[455] = appState_6;
    $[456] = resolvedModel;
  } else resolvedModel = $[456];
  let activeModel = resolvedModel;
  let fastModeOnForModel = useFastModeOnForModel(model, activeModel);
  let modelPickerElement;
  ONe: {
    if (!isModelPickerOpen) {
      modelPickerElement = null;
      break ONe;
    }
    let onSetDefault;
    if ($[457] === MEMO_CACHE_SENTINEL) {
      onSetDefault = (model) => {
        if (hasLadderForSetting(model)) {
          return;
        }
        isSavedPick.current = true;
      };
      $[457] = onSetDefault;
    } else onSetDefault = $[457];
    let showFastModeNotice;
    if ($[458] !== fastModeOnForModel || $[459] !== activeModel) {
      showFastModeNotice =
        isFastModeEnabled() && fastModeOnForModel && supportsFastMode(activeModel) && isFastModeAvailable();
      $[458] = fastModeOnForModel;
      $[459] = activeModel;
      $[460] = showFastModeNotice;
    } else showFastModeNotice = $[460];
    let pickerBox;
    if (
      $[461] !== onSelect ||
      $[462] !== appState_7 ||
      $[463] !== appState_6 ||
      $[464] !== showFastModeNotice
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
      $[461] = onSelect;
      $[462] = appState_7;
      $[463] = appState_6;
      $[464] = showFastModeNotice;
      $[465] = pickerBox;
    } else pickerBox = $[465];
    modelPickerElement = pickerBox;
  }
  let modelPickerBox = modelPickerElement;
  let showFastModeResult;
  if ($[466] !== addNotification) {
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
    $[466] = addNotification;
    $[467] = showFastModeResult;
  } else showFastModeResult = $[467];
  let onDone = showFastModeResult;
  let fastModePickerBox;
  NNe: {
    if (!fastModePickerState) {
      fastModePickerBox = null;
      break NNe;
    }
    let fastModeBox;
    if ($[468] !== fastModePickerState.unavailableReason || $[469] !== onDone || $[470] !== storageV5) {
      fastModeBox = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(FastModePicker, {
          onDone,
          unavailableReason: fastModePickerState.unavailableReason,
          storageV5,
        }),
      });
      $[468] = fastModePickerState.unavailableReason;
      $[469] = onDone;
      $[470] = storageV5;
      $[471] = fastModeBox;
    } else fastModeBox = $[471];
    fastModePickerBox = fastModeBox;
  }
  let fastModePickerColumn = fastModePickerBox;
  let toggleThinkingHandler;
  if ($[472] !== addNotification || $[473] !== setShowState) {
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
    $[472] = addNotification;
    $[473] = setShowState;
    $[474] = toggleThinkingHandler;
  } else toggleThinkingHandler = $[474];
  let onSelect_2 = toggleThinkingHandler;
  let closeThinkingToggle;
  if ($[475] === MEMO_CACHE_SENTINEL) {
    closeThinkingToggle = () => {
      setThinkingToggleOpen(false);
    };
    $[475] = closeThinkingToggle;
  } else closeThinkingToggle = $[475];
  let onCancel_2 = closeThinkingToggle;
  let thinkingBox;
  UJo: {
    if (!isThinkingToggleOpen) {
      thinkingBox = null;
      break UJo;
    }
    const currentValue = appState_8 ?? true;
    let thinkingElement;
    if ($[476] !== onSelect_2 || $[477] !== isMidConversation || $[478] !== currentValue) {
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
      $[476] = onSelect_2;
      $[477] = isMidConversation;
      $[478] = currentValue;
      $[479] = thinkingElement;
    } else thinkingElement = $[479];
    thinkingBox = thinkingElement;
  }
  let thinkingToggleBox = thinkingBox;
  let onboardingDialog;
  if ($[480] !== showEnvOnboarding || $[481] !== onAccept || $[482] !== dismissEnvOnboardingStable) {
    onboardingDialog = showEnvOnboarding
      ? jsxProd_default(AutoModeEnvOnboardingDialog, {
          onAccept,
          onLater: dismissEnvOnboardingStable,
          onDismiss: dismissEnvOnboardingStable,
        })
      : null;
    $[480] = showEnvOnboarding;
    $[481] = onAccept;
    $[482] = dismissEnvOnboardingStable;
    $[483] = onboardingDialog;
  } else onboardingDialog = $[483];
  let onboardingDialogStable = onboardingDialog;
  useFullscreenDialogSlot(isFullscreen ? onboardingDialogStable : null);
  let ref = useFullscreenAnchor();
  let modeIndicatorElement;
  if (
    $[484] !== storeSelector_5 ||
    $[485] !== storeSelector_4 ||
    $[486] !== viewingAgentName ||
    $[487] !== viewingAgentColor
  ) {
    modeIndicatorElement = jsxProd_default(PromptInputModeIndicator, {
      mode: storeSelector_4,
      isLoading: storeSelector_5,
      viewingAgentName,
      viewingAgentColor,
    });
    $[484] = storeSelector_5;
    $[485] = storeSelector_4;
    $[486] = viewingAgentName;
    $[487] = viewingAgentColor;
    $[488] = modeIndicatorElement;
  } else modeIndicatorElement = $[488];
  let modeIndicator = modeIndicatorElement;
  let dialogElement = null;
  let workflowTask = taskId ? tasks[taskId] : undefined;
  if (workflowTask && workflowTask.type === "local_workflow") {
    let isWorkflowRunning = workflowTask.status === "running";
    let onWorkflowDone;
    if ($[489] !== addNotification || $[490] !== setShowState) {
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
      $[489] = addNotification;
      $[490] = setShowState;
      $[491] = onWorkflowDone;
    } else onWorkflowDone = $[491];
    let onWorkflowDoneStable = onWorkflowDone;
    const initialPhaseIndex = appState_3?.phaseIndex;
    let onKill;
    if ($[492] !== isWorkflowRunning || $[493] !== taskStore || $[494] !== workflowTask.id) {
      onKill = isWorkflowRunning ? () => killWorkflowTask_2(workflowTask.id, taskStore, "user") : undefined;
      $[492] = isWorkflowRunning;
      $[493] = taskStore;
      $[494] = workflowTask.id;
      $[495] = onKill;
    } else onKill = $[495];
    let onPause;
    if ($[496] !== isWorkflowRunning || $[497] !== taskStore || $[498] !== workflowTask.id) {
      onPause = isWorkflowRunning ? () => pauseWorkflowTask_2(workflowTask.id, taskStore) : undefined;
      $[496] = isWorkflowRunning;
      $[497] = taskStore;
      $[498] = workflowTask.id;
      $[499] = onPause;
    } else onPause = $[499];
    let onResume;
    if ($[500] !== onWorkflowDoneStable || $[501] !== handleSubmit) {
      onResume = (input) => {
        onWorkflowDoneStable();
        handleSubmit(input, true, undefined, false, undefined, true);
      };
      $[500] = onWorkflowDoneStable;
      $[501] = handleSubmit;
      $[502] = onResume;
    } else onResume = $[502];
    let onSkipAgent;
    if ($[503] !== isWorkflowRunning || $[504] !== taskStore || $[505] !== workflowTask.id) {
      onSkipAgent = isWorkflowRunning
        ? (agentId) => skipWorkflowAgent_2(workflowTask.id, agentId, taskStore)
        : undefined;
      $[503] = isWorkflowRunning;
      $[504] = taskStore;
      $[505] = workflowTask.id;
      $[506] = onSkipAgent;
    } else onSkipAgent = $[506];
    let onRetryAgent;
    if ($[507] !== isWorkflowRunning || $[508] !== taskStore || $[509] !== workflowTask.id) {
      onRetryAgent = isWorkflowRunning
        ? (agentId) => retryWorkflowAgent_2(workflowTask.id, agentId, taskStore)
        : undefined;
      $[507] = isWorkflowRunning;
      $[508] = taskStore;
      $[509] = workflowTask.id;
      $[510] = onRetryAgent;
    } else onRetryAgent = $[510];
    let workflowDialog;
    if (
      $[511] !== onWorkflowDoneStable ||
      $[512] !== initialPhaseIndex ||
      $[513] !== onKill ||
      $[514] !== onPause ||
      $[515] !== onResume ||
      $[516] !== onSkipAgent ||
      $[517] !== onRetryAgent ||
      $[518] !== workflowTask
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
      $[511] = onWorkflowDoneStable;
      $[512] = initialPhaseIndex;
      $[513] = onKill;
      $[514] = onPause;
      $[515] = onResume;
      $[516] = onSkipAgent;
      $[517] = onRetryAgent;
      $[518] = workflowTask;
      $[519] = workflowDialog;
    } else workflowDialog = $[519];
    dialogElement = workflowDialog;
  } else if (storeSelector && tasksFooterVisible) {
    let cloudTasksDialog;
    if ($[520] !== chrome.closeBashesDialog) {
      cloudTasksDialog = jsxProd_default(CloudTasksDialog, {
        onDone: chrome.closeBashesDialog,
      });
      $[520] = chrome.closeBashesDialog;
      $[521] = cloudTasksDialog;
    } else cloudTasksDialog = $[521];
    dialogElement = cloudTasksDialog;
  } else if (storeSelector) {
    const onDone = chrome.closeBashesDialog;
    let tools;
    if ($[522] !== scope) {
      tools = scope.computeTools();
      $[522] = scope;
      $[523] = tools;
    } else tools = $[523];
    const initialDetailTaskId = typeof storeSelector === "string" ? storeSelector : undefined;
    let backgroundTasksDialog;
    if (
      $[524] !== chrome.closeBashesDialog ||
      $[525] !== commandQueueOrDefault ||
      $[526] !== scope.commands ||
      $[527] !== session ||
      $[528] !== storageV5 ||
      $[529] !== tools ||
      $[530] !== initialDetailTaskId ||
      $[531] !== verbose
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
      $[524] = chrome.closeBashesDialog;
      $[525] = commandQueueOrDefault;
      $[526] = scope.commands;
      $[527] = session;
      $[528] = storageV5;
      $[529] = tools;
      $[530] = initialDetailTaskId;
      $[531] = verbose;
      $[532] = backgroundTasksDialog;
    } else backgroundTasksDialog = $[532];
    dialogElement = backgroundTasksDialog;
  } else if (isFullscreenActive() && isHistorySearchOpen) {
    let onSelect;
    if (
      $[533] !== draft ||
      $[534] !== setMode ||
      $[535] !== setCursorOffset ||
      $[536] !== setValue ||
      $[537] !== setPastedContents
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
      $[533] = draft;
      $[534] = setMode;
      $[535] = setCursorOffset;
      $[536] = setValue;
      $[537] = setPastedContents;
      $[538] = onSelect;
    } else onSelect = $[538];
    let onCancel;
    if ($[539] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setHistorySearchOpen(false);
      $[539] = onCancel;
    } else onCancel = $[539];
    let historySearchDialog;
    if ($[540] !== draft.value || $[541] !== onSelect) {
      historySearchDialog = jsxProd_default(HistorySearchDialog, {
        initialQuery: draft.value,
        onSelect,
        onCancel,
      });
      $[540] = draft.value;
      $[541] = onSelect;
      $[542] = historySearchDialog;
    } else historySearchDialog = $[542];
    dialogElement = historySearchDialog;
  } else if (modelPickerBox) dialogElement = modelPickerBox;
  else if (fastModePickerColumn) dialogElement = fastModePickerColumn;
  else if (thinkingToggleBox) dialogElement = thinkingToggleBox;
  else if (effortStepKeys !== null) dialogElement = effortStepKeys;
  else if (isWizardOpen) {
    let onDone;
    if ($[543] === MEMO_CACHE_SENTINEL) {
      onDone = () => setWizardOpen(false);
      $[543] = onDone;
    } else onDone = $[543];
    let wizardFooter;
    if ($[544] !== cloudRowCheck) {
      wizardFooter = jsxProd_default(WizardNavigationFooter, {
        onDone,
        cloudRowCheck,
      });
      $[544] = cloudRowCheck;
      $[545] = wizardFooter;
    } else wizardFooter = $[545];
    dialogElement = wizardFooter;
  } else if (isBridgeDialogOpen) {
    let bridgeDialog;
    if ($[546] !== selectFooterTab) {
      bridgeDialog = jsxProd_default(BridgeDialog, {
        onDone: () => {
          setBridgeDialogOpen(false);
          selectFooterTab(null);
        },
      });
      $[546] = selectFooterTab;
      $[547] = bridgeDialog;
    } else bridgeDialog = $[547];
    dialogElement = bridgeDialog;
  } else if (isExternalEditorActive) {
    let editorWaitNotice;
    if ($[548] !== columns || $[549] !== storeSelector_4) {
      editorWaitNotice = jsxProd_default(EditorWaitNotice, {
        mode: storeSelector_4,
        columns,
      });
      $[548] = columns;
      $[549] = storeSelector_4;
      $[550] = editorWaitNotice;
    } else editorWaitNotice = $[550];
    dialogElement = editorWaitNotice;
  }
  let inputTakesFocus = dialogElement === null && !isSearching && !isModalOverlayActive;
  let isInputRowReplaced =
    dialogElement !== null || isOverlayOpen || appState_2 !== null || activeFooterTab !== null;
  let inputRowReplacedEffect;
  let inputRowReplacedDeps;
  if ($[551] !== draft || $[552] !== isInputRowReplaced) {
    inputRowReplacedEffect = () => {
      draft.setInputRowReplaced(isInputRowReplaced);
      return () => draft.setInputRowReplaced(false);
    };
    inputRowReplacedDeps = [isInputRowReplaced, draft];
    $[551] = draft;
    $[552] = isInputRowReplaced;
    $[553] = inputRowReplacedEffect;
    $[554] = inputRowReplacedDeps;
  } else {
    inputRowReplacedEffect = $[553];
    inputRowReplacedDeps = $[554];
  }
  useEffect(inputRowReplacedEffect, inputRowReplacedDeps);
  const hidden = dialogElement !== null;
  let onOpenHistorySearch;
  if ($[555] !== openSearch || $[556] !== openHistorySearchStable) {
    onOpenHistorySearch = isFullscreenActive() ? openHistorySearchStable : openSearch;
    $[555] = openSearch;
    $[556] = openHistorySearchStable;
    $[557] = onOpenHistorySearch;
  } else onOpenHistorySearch = $[557];
  const footerItemSelected = activeFooterTab !== null;
  let promptInputElement;
  if (
    $[558] !== chordGestureSpent ||
    $[559] !== chrome ||
    $[560] !== dispatchCommand ||
    $[561] !== draft ||
    $[562] !== embedded ||
    $[563] !== onHistoryDownPastEnd_2 ||
    $[564] !== fastModeCooldownActive ||
    $[565] !== fastModeTagStable ||
    $[566] !== shadowedFooterActionHandler ||
    $[567] !== isHelpOpen ||
    $[568] !== historyFailedMatch ||
    $[569] !== historyMatch ||
    $[570] !== historyQuery ||
    $[571] !== handleKeyDown ||
    $[572] !== ideSelection ||
    $[573] !== promptChromeRows ||
    $[574] !== inputTakesFocus ||
    $[575] !== refusalSettingsTag ||
    $[576] !== isModalOverlayActive ||
    $[577] !== isSearching ||
    $[578] !== leftArrowGesture ||
    $[579] !== markAccepted ||
    $[580] !== modeIndicator ||
    $[581] !== handleSubmit ||
    $[582] !== placeholder ||
    $[583] !== scope ||
    $[584] !== setHelpOpen ||
    $[585] !== suggestionsStore ||
    $[586] !== hidden ||
    $[587] !== onOpenHistorySearch ||
    $[588] !== footerItemSelected ||
    $[589] !== takeEnter ||
    $[590] !== toggleHelpStable ||
    $[591] !== topBorderText_2 ||
    $[592] !== transcript ||
    $[593] !== turn ||
    $[594] !== ultraEffortTag_2
  ) {
    promptInputElement = jsxProd_default(
      PromptInputMemo,
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
    $[558] = chordGestureSpent;
    $[559] = chrome;
    $[560] = dispatchCommand;
    $[561] = draft;
    $[562] = embedded;
    $[563] = onHistoryDownPastEnd_2;
    $[564] = fastModeCooldownActive;
    $[565] = fastModeTagStable;
    $[566] = shadowedFooterActionHandler;
    $[567] = isHelpOpen;
    $[568] = historyFailedMatch;
    $[569] = historyMatch;
    $[570] = historyQuery;
    $[571] = handleKeyDown;
    $[572] = ideSelection;
    $[573] = promptChromeRows;
    $[574] = inputTakesFocus;
    $[575] = refusalSettingsTag;
    $[576] = isModalOverlayActive;
    $[577] = isSearching;
    $[578] = leftArrowGesture;
    $[579] = markAccepted;
    $[580] = modeIndicator;
    $[581] = handleSubmit;
    $[582] = placeholder;
    $[583] = scope;
    $[584] = setHelpOpen;
    $[585] = suggestionsStore;
    $[586] = hidden;
    $[587] = onOpenHistorySearch;
    $[588] = footerItemSelected;
    $[589] = takeEnter;
    $[590] = toggleHelpStable;
    $[591] = topBorderText_2;
    $[592] = transcript;
    $[593] = turn;
    $[594] = ultraEffortTag_2;
    $[595] = promptInputElement;
  } else promptInputElement = $[595];
  let promptInputElementStable = promptInputElement;
  if (dialogElement !== null) {
    let dialogColumn;
    if ($[596] !== promptInputElementStable || $[597] !== dialogElement) {
      dialogColumn = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [dialogElement, promptInputElementStable],
      });
      $[596] = promptInputElementStable;
      $[597] = dialogElement;
      $[598] = dialogColumn;
    } else dialogColumn = $[598];
    return dialogColumn;
  }
  const marginTop = isBriefOnly ? 0 : 1;
  let footerKeyCapture;
  if (
    $[599] !== activeFooterTab ||
    $[600] !== onKeyDown ||
    $[601] !== isModalOverlayActive ||
    $[602] !== queuePaste
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
    $[599] = activeFooterTab;
    $[600] = onKeyDown;
    $[601] = isModalOverlayActive;
    $[602] = queuePaste;
    $[603] = footerKeyCapture;
  } else footerKeyCapture = $[603];
  let waitingForPermission;
  if ($[604] !== storeSelector_2 || $[605] !== showStatusNotices) {
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
    $[604] = storeSelector_2;
    $[605] = showStatusNotices;
    $[606] = waitingForPermission;
  } else waitingForPermission = $[606];
  const promptInputVisible = !isScreenReaderEnabled && promptInputElementStable;
  let statusNoticeList;
  if ($[607] === MEMO_CACHE_SENTINEL) {
    statusNoticeList = jsxProd_default(StatusNoticeList, {});
    $[607] = statusNoticeList;
  } else statusNoticeList = $[607];
  const leftArrowDetachAvailable =
    leftArrowGesture !== undefined && !leftArrowGesture.onlyExplains && !isDetachSuppressed;
  const vimMode_2 = editorMode ? vimMode : undefined;
  const suppressHint = !storeSelector_3;
  let footerElement;
  if (
    $[608] !== bridgeSelected ||
    $[609] !== chrome ||
    $[610] !== toolPermissionContext ||
    $[611] !== exitMessage ||
    $[612] !== hasStash ||
    $[613] !== isHelpOpen ||
    $[614] !== historyFailedMatch ||
    $[615] !== historyQuery ||
    $[616] !== ideSelectionSelected ||
    $[617] !== inputTakesFocus ||
    $[618] !== isAutoUpdating ||
    $[619] !== isInputWrapped ||
    $[620] !== isPasting ||
    $[621] !== isSearching ||
    $[622] !== proactivityStepState.collapsed ||
    $[623] !== proactivityStepState.stepped ||
    $[624] !== storeSelector_4 ||
    $[625] !== openArtifactsStable ||
    $[626] !== row1Hint ||
    $[627] !== scope ||
    $[628] !== setHistoryQuery ||
    $[629] !== showExpandPasteHint ||
    $[630] !== suggestionsStore.drawn ||
    $[631] !== leftArrowDetachAvailable ||
    $[632] !== vimMode_2 ||
    $[633] !== suppressHint ||
    $[634] !== tasksTabSelected ||
    $[635] !== transcript ||
    $[636] !== turn ||
    $[637] !== verbose
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
    $[608] = bridgeSelected;
    $[609] = chrome;
    $[610] = toolPermissionContext;
    $[611] = exitMessage;
    $[612] = hasStash;
    $[613] = isHelpOpen;
    $[614] = historyFailedMatch;
    $[615] = historyQuery;
    $[616] = ideSelectionSelected;
    $[617] = inputTakesFocus;
    $[618] = isAutoUpdating;
    $[619] = isInputWrapped;
    $[620] = isPasting;
    $[621] = isSearching;
    $[622] = proactivityStepState.collapsed;
    $[623] = proactivityStepState.stepped;
    $[624] = storeSelector_4;
    $[625] = openArtifactsStable;
    $[626] = row1Hint;
    $[627] = scope;
    $[628] = setHistoryQuery;
    $[629] = showExpandPasteHint;
    $[630] = suggestionsStore.drawn;
    $[631] = leftArrowDetachAvailable;
    $[632] = vimMode_2;
    $[633] = suppressHint;
    $[634] = tasksTabSelected;
    $[635] = transcript;
    $[636] = turn;
    $[637] = verbose;
    $[638] = footerElement;
  } else footerElement = $[638];
  let noConversationsMessage;
  if ($[639] !== cloudRowCheck || $[640] !== frameFooterState) {
    noConversationsMessage = frameFooterState
      ? jsxProd_default(NoConversationsMessage, {
          cloudRowCheck,
        })
      : null;
    $[639] = cloudRowCheck;
    $[640] = frameFooterState;
    $[641] = noConversationsMessage;
  } else noConversationsMessage = $[641];
  const onboardingNotice = isFullscreen ? null : onboardingDialogStable;
  let notificationOverlay;
  if (
    $[642] !== showEnvOnboarding ||
    $[643] !== isBriefOnly ||
    $[644] !== isFullscreen ||
    $[645] !== hasStash ||
    $[646] !== storeSelector_8 ||
    $[647] !== hideLoginNotice ||
    $[648] !== isAutoUpdating ||
    $[649] !== isInputWrapped ||
    $[650] !== row1Hint?.id ||
    $[651] !== scope ||
    $[652] !== transcript ||
    $[653] !== verbose
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
    $[642] = showEnvOnboarding;
    $[643] = isBriefOnly;
    $[644] = isFullscreen;
    $[645] = hasStash;
    $[646] = storeSelector_8;
    $[647] = hideLoginNotice;
    $[648] = isAutoUpdating;
    $[649] = isInputWrapped;
    $[650] = row1Hint?.id;
    $[651] = scope;
    $[652] = transcript;
    $[653] = verbose;
    $[654] = notificationOverlay;
  } else notificationOverlay = $[654];
  const promptInputScreenReader = isScreenReaderEnabled && promptInputElementStable;
  let rootBox;
  if (
    $[655] !== ref ||
    $[656] !== marginTop ||
    $[657] !== footerKeyCapture ||
    $[658] !== waitingForPermission ||
    $[659] !== promptInputVisible ||
    $[660] !== footerElement ||
    $[661] !== noConversationsMessage ||
    $[662] !== onboardingNotice ||
    $[663] !== notificationOverlay ||
    $[664] !== promptInputScreenReader
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
    $[655] = ref;
    $[656] = marginTop;
    $[657] = footerKeyCapture;
    $[658] = waitingForPermission;
    $[659] = promptInputVisible;
    $[660] = footerElement;
    $[661] = noConversationsMessage;
    $[662] = onboardingNotice;
    $[663] = notificationOverlay;
    $[664] = promptInputScreenReader;
    $[665] = rootBox;
  } else rootBox = $[665];
  return rootBox;
}
//@ chunk-18hwfzwa.js:978434-978508 placement
function hasUserOrAssistantMessage(messages) {
  return messages.some((message) => message.type === "user" || message.type === "assistant");
}
//@ chunk-18hwfzwa.js:978508-978565 placement
function hasAssistantMessage(messages) {
  return messages.some((message) => message.type === "assistant");
}
//@ chunk-18hwfzwa.js:978565-978610 placement
function hasSuggestions(state) {
  return state.suggestions.length > 0;
}
//@ chunk-18hwfzwa.js:978610-978626 placement
var PromptComposerMemo; // deferred: uses PromptComposer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:978610", () => {
  PromptComposerMemo = memo(PromptComposer);
});
//@ chunk-18hwfzwa.js:978626-978630 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:978626", () => {
  init_react_production();
});
export { PromptComposerMemo };
