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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { yt, R, y, P, zt, Rh, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { countNonAmbientTasks, countVisibleTasks } from "../../utils/claudeInChrome/toolRendering.js";
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
import { useHistorySearch, IT } from "../../hooks/useHistorySearch.js";
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

//@ chunk-18hwfzwa.js:120241-120283 placement
function shouldShowIdeStatus(h, rowsDrawn) {
  return rowsDrawn && IdeStatusIndicator(h) !== null;
}
//@ chunk-18hwfzwa.js:770563-770990 placement = ConfirmRemoveTag (0.165)
function ConfirmRemoveTag(props) {
  let ke = w(8);
  let { title, confirmLabel, onConfirm, onCancel } = props;
  let children;
  if (ke[0] !== confirmLabel || ke[1] !== onCancel || ke[2] !== onConfirm) {
    children = jsxProd_default(ConfirmSelect, {
      cancelFirst: true,
      focus: "cancel",
      hideIndexes: true,
      confirmLabel,
      cancelLabel: "Cancel",
      onConfirm,
      onCancel,
    });
    ke[0] = confirmLabel;
    ke[1] = onCancel;
    ke[2] = onConfirm;
    ke[3] = children;
  } else children = ke[3];
  let Be;
  if (ke[4] !== onCancel || ke[5] !== children || ke[6] !== title) {
    Be = jsxProd_default(Dialog, {
      title,
      onCancel,
      children,
    });
    ke[4] = onCancel;
    ke[5] = children;
    ke[6] = title;
    ke[7] = Be;
  } else Be = ke[7];
  return Be;
}
//@ chunk-18hwfzwa.js:920094-920856 placement = CompanionSprite (0.359)
/**
 * "Save and close editor to continue..." 等待提示（外部编辑器打开期间显示），可上下加分隔线。
 */
function EditorWaitNotice(props) {
  let $ = w(15);
  let { mode, columns } = props;
  let setAppState = useIsScreenReaderEnabled();
  let companion = showSwarmFooterGate();
  let Re;
  if ($[0] !== companion || $[1] !== setAppState || $[2] !== mode) {
    Re = companion ? {} : getEditorWaitBorderStyle(mode, setAppState);
    $[0] = companion;
    $[1] = setAppState;
    $[2] = mode;
    $[3] = Re;
  } else Re = $[3];
  let children;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: "Save and close editor to continue...",
    });
    $[4] = children;
  } else children = $[4];
  let He;
  if ($[5] !== Re) {
    He = jsxProd_default(Box, {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      ...Re,
      width: "100%",
      children,
    });
    $[5] = Re;
    $[6] = He;
  } else He = $[6];
  let We = He;
  if (!companion) {
    return We;
  }
  let ze;
  if ($[7] !== columns) {
    ze = jsxProd_default(Divider, {
      width: columns,
    });
    $[7] = columns;
    $[8] = ze;
  } else ze = $[8];
  let Xe;
  if ($[9] !== columns) {
    Xe = jsxProd_default(Divider, {
      width: columns,
    });
    $[9] = columns;
    $[10] = Xe;
  } else Xe = $[10];
  let rt;
  if ($[11] !== We || $[12] !== ze || $[13] !== Xe) {
    rt = jsxProd_default_2(Fragment, {
      children: [ze, We, Xe],
    });
    $[11] = We;
    $[12] = ze;
    $[13] = Xe;
    $[14] = rt;
  } else rt = $[14];
  return rt;
}
//@ chunk-18hwfzwa.js:927945-928268 placement
function usePromptChromeRows({ scope, chrome, rowsDrawn }) {
  let L = showSwarmFooterGate();
  let mergedClients = useMergedClients(
    scope.initialMcpClients,
    useAppState((He) => He.mcp.clients),
  );
  let ideSelection = useStoreSelector(chrome, (He) => He.ideSelection);
  let isViewingAgent = useAppState((He) => He.viewingAgentTaskId !== undefined);
  if (!L) return false;
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
function selectEmbedded(jJo) {
  return jJo.embedded;
}
//@ chunk-18hwfzwa.js:928306-928348 placement
function selectIdeSelection(qJo) {
  return qJo.ideSelection;
}
//@ chunk-18hwfzwa.js:928348-928390 placement
function selectBashesDialog($Jo) {
  return $Jo.bashesDialog;
}
//@ chunk-18hwfzwa.js:928390-928440 placement
function selectHasSuppressedDialogs(VJo) {
  return VJo.hasSuppressedDialogs;
}
//@ chunk-18hwfzwa.js:928440-928485 placement
function selectHideLoginNotice_2(KJo) {
  return KJo.hideLoginNotice;
}
//@ chunk-18hwfzwa.js:928485-928524 placement
function selectIsLoading2(GJo) {
  return GJo.isLoading;
}
//@ chunk-18hwfzwa.js:928524-928571 placement
function selectIsExternalLoading2(QJo) {
  return QJo.isExternalLoading;
}
//@ chunk-18hwfzwa.js:928571-928612 placement
function selectSubmitCount(zJo) {
  return zJo.submitCount;
}
//@ chunk-18hwfzwa.js:928612-928663 placement
function selectToolPermissionContext(YJo) {
  return YJo.toolPermissionContext;
}
//@ chunk-18hwfzwa.js:928663-928700 placement
function selectVerbose2(JJo) {
  return JJo.verbose;
}
//@ chunk-18hwfzwa.js:928700-928746 placement
function selectOnDetachToCaller(XJo) {
  return XJo.onDetachToCaller;
}
//@ chunk-18hwfzwa.js:928746-928790 placement
function selectQueueEditIndex2(ZJo) {
  return ZJo.queueEditIndex;
}
//@ chunk-18hwfzwa.js:928790-928874 placement
function clearQueueEditIndex(QNe) {
  return QNe.queueEditIndex === null
    ? QNe
    : {
        ...QNe,
        queueEditIndex: null,
      };
}
//@ chunk-18hwfzwa.js:928874-928909 placement
function selectTasks2(eXo) {
  return eXo.tasks;
}
//@ chunk-18hwfzwa.js:928909-928960 placement
function selectRemoteBackgroundTasks2(tXo) {
  return tXo.remoteBackgroundTasks;
}
//@ chunk-18hwfzwa.js:928960-929004 placement
function selectWorkflowDetail(oXo) {
  return oXo.workflowDetail;
}
//@ chunk-18hwfzwa.js:929004-929188 placement
function shouldShowBridgeStatus(XB) {
  return (
    (XB.replBridgeError !== undefined && !XB.replBridgeOutboundOnly) ||
    (XB.replBridgeConnected &&
      !XB.replBridgeOutboundOnly &&
      (XB.replBridgeExplicit || XB.replBridgeReconnecting))
  );
}
//@ chunk-18hwfzwa.js:929188-929215 placement
function selectNever(J9s) {
  return false;
}
//@ chunk-18hwfzwa.js:929215-929256 placement = _temp (1)
function selectTeamContext_2(s) {
  return s.teamContext;
}
//@ chunk-18hwfzwa.js:929256-929302 placement
function selectPromptSuggestion(rXo) {
  return rXo.promptSuggestion;
}
//@ chunk-18hwfzwa.js:929302-929350 placement = _temp2 (1)
function selectViewingAgentTaskId_4(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:929350-929391 placement
function selectIsBriefOnly_3(iXo) {
  return iXo.isBriefOnly;
}
//@ chunk-18hwfzwa.js:929391-929434 placement
function selectMainLoopModel(aXo) {
  return aXo.mainLoopModel;
}
//@ chunk-18hwfzwa.js:929487-929532 placement
function selectThinkingEnabled2(dXo) {
  return dXo.thinkingEnabled;
}
//@ chunk-18hwfzwa.js:929578-929617 placement
function selectUltracode_2(uXo) {
  return uXo.ultracode;
}
//@ chunk-18hwfzwa.js:929617-929652 placement
function getIdleInFlightState() {
  return {
    inFlight: false,
  };
}
//@ chunk-18hwfzwa.js:929652-929702 placement
function selectCoordinatorTaskIndex2(mXo) {
  return mXo.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:929702-929747 placement
function selectTaskDecorations_3(pXo) {
  return pXo.taskDecorations;
}
//@ chunk-18hwfzwa.js:929747-929802 placement
function selectIdleTeammatesExpanded_3(fXo) {
  return fXo.idleTeammatesExpanded ?? false;
}
//@ chunk-18hwfzwa.js:929802-929834 placement
function selectId(gXo) {
  return gXo.id;
}
//@ chunk-18hwfzwa.js:929834-929866 placement
function selectId2(hXo) {
  return hXo.id;
}
//@ chunk-18hwfzwa.js:929866-929916 placement
function selectEnvOnboardingOffered(SXo) {
  return SXo.envOnboardingOffered;
}
//@ chunk-18hwfzwa.js:929916-929997 placement
function hasSuggestionContent(HAt) {
  return HAt.suggestions.length > 0 || !!HAt.suggestionsEmptyMessage;
}
//@ chunk-18hwfzwa.js:929997-930031 placement
function isFooterTabEnabled(bXo) {
  return !FOOTER_TAB_ENABLED[bXo];
}
//@ chunk-18hwfzwa.js:930031-930080 placement
function selectWorkflowFooterIndex2(wXo) {
  return wXo.workflowFooterIndex;
}
//@ chunk-18hwfzwa.js:930080-930112 placement
function selectId3(kXo) {
  return kXo.id;
}
//@ chunk-18hwfzwa.js:930112-930157 placement
function selectFooterSelection2(vXo) {
  return vXo.footerSelection;
}
//@ chunk-18hwfzwa.js:930157-930186 placement
function toggleHelpOpen(CXo) {
  return !CXo;
}
//@ chunk-18hwfzwa.js:930186-930265 placement
function markTasksHintSeen(zNe) {
  return zNe.hasSeenTasksHint
    ? zNe
    : {
        ...zNe,
        hasSeenTasksHint: true,
      };
}
//@ chunk-18hwfzwa.js:930265-930296 placement
function bumpCounter(TXo) {
  return TXo + 1;
}
//@ chunk-18hwfzwa.js:930296-930340 placement = _temp (1)
function isPastedImageBlock(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:930395-930411 placement
function noopResetHistory() {}
//@ chunk-18hwfzwa.js:930411-930444 placement
function foldKeepNewest(X9s, PXo) {
  return PXo;
}
//@ chunk-18hwfzwa.js:930444-930460 placement
function noopAfterSubmit() {}
//@ chunk-18hwfzwa.js:930460-930527 placement
function clearPromptSuggestion(IXo) {
  return {
    ...IXo,
    promptSuggestion: {
      status: "empty",
    },
  };
}
//@ chunk-18hwfzwa.js:930527-930558 placement
function bumpRetryCount(EXo) {
  return EXo + 1;
}
//@ chunk-18hwfzwa.js:930558-930587 placement
function toggleFlag(DXo) {
  return !DXo;
}
//@ chunk-18hwfzwa.js:930587-930646 placement
function unavailableReasonState(OXo) {
  return OXo
    ? null
    : {
        unavailableReason: getFastModeUnavailableMessage(),
      };
}
//@ chunk-18hwfzwa.js:930646-930675 placement
function negateBoolean_2(NXo) {
  return !NXo;
}
//@ chunk-18hwfzwa.js:930675-930723 placement
function dismissShowFlag(WAt) {
  return WAt.show
    ? {
        show: false,
      }
    : WAt;
}
//@ chunk-18hwfzwa.js:930723-930739 placement
function noopOnConfirm() {}
//@ chunk-18hwfzwa.js:930739-930763 placement
function returnFalse() {
  return false;
}
//@ chunk-18hwfzwa.js:930763-930854 placement
function withAutoModeSetupMessage(LXo) {
  return {
    ...LXo,
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
function decrementIndex(BXo) {
  return BXo - 1;
}
//@ chunk-18hwfzwa.js:930929-930960 placement
function decrementWorkflowIndex(HXo) {
  return HXo - 1;
}
//@ chunk-18hwfzwa.js:930960-930991 placement
function incrementIndex(UXo) {
  return UXo + 1;
}
//@ chunk-18hwfzwa.js:930991-931022 placement
function incrementWorkflowIndex(WXo) {
  return WXo + 1;
}
//@ chunk-18hwfzwa.js:931022-931111 placement
function collapseIdleTeammates(YNe) {
  return !YNe.idleTeammatesExpanded
    ? YNe
    : {
        ...YNe,
        idleTeammatesExpanded: false,
      };
}
//@ chunk-18hwfzwa.js:931111-931127 placement
function noopOutputHandler() {}
//@ chunk-18hwfzwa.js:931127-931166 placement
function isEffortLevelNotice(jXo) {
  return jXo?.key === EFFORT_LEVEL_KEY;
}
//@ chunk-18hwfzwa.js:931166-931182 placement
function noopReplyHandler() {}
//@ chunk-18hwfzwa.js:931182-931227 placement
function unsavedTextState(qXo) {
  return qXo
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
function logSetMaxThinkingTokensFailure($Xo) {
  logForDebugging(`[remote] set_max_thinking_tokens failed: ${$Xo}`);
}
//@ chunk-18hwfzwa.js:931322-931459 placement
function clearFooterSelection(ore) {
  return ore.workflowDetail === undefined && ore.footerSelection === null
    ? ore
    : {
        ...ore,
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
function stripPastedRefMarkers(h) {
  return h.replace(regExp_5, (x, D, L) => `[${D} #${Number(L)}]`);
}
//@ chunk-18hwfzwa.js:931612-978434 placement
/**
 * 2.1.316 的主输入框组件（约 47 KB）：组合草稿、vim 模式、bash/模式切换、自动补全、页脚各胶囊、排队命令、提交到主线程或代理；取代旧版 PromptInput 的大部分逻辑。
 */
function PromptComposer(props) {
  let $ = w(666);
  let { turn, transcript, scope, draft, chrome, gesture, submit } = props;
  let isFullscreen = useIsFullscreen();
  let We = showSwarmFooterGate();
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
  let Cn = yt(onAttacherCapsChange, alwaysFalseB);
  const onDetachToCaller = useStoreSelector(chrome, selectOnDetachToCaller);
  let Yo;
  if ($[0] !== gesture || $[1] !== onDetachToCaller || $[2] !== transcript || $[3] !== turn) {
    Yo = {
      gesture,
      turn,
      transcript,
      onDetachToCaller,
    };
    $[0] = gesture;
    $[1] = onDetachToCaller;
    $[2] = transcript;
    $[3] = turn;
    $[4] = Yo;
  } else Yo = $[4];
  let leftArrowGesture = useLeftArrowGesture(Yo);
  let mainLoopModel = useMainLoopModel_3();
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let Go = useThirdOverlayKeys() || dialogOfKind;
  let vimMode = useVimMode();
  let session = useSession();
  let Xo = R(null);
  let editorMode = useEditorMode();
  let [$n, on] = useLatestState(false);
  let [_o] = y(createEmptyAutocompleteStore);
  let [, cn, Dn] = useLatestState(null);
  let wn = editorMode && vimMode !== "NORMAL";
  let mr;
  let Kn;
  if ($[5] !== draft || $[6] !== wn) {
    mr = () => {
      draft.setVimEditing(wn);
      return () => draft.setVimEditing(false);
    };
    Kn = [wn, draft];
    $[5] = draft;
    $[6] = wn;
    $[7] = mr;
    $[8] = Kn;
  } else {
    mr = $[7];
    Kn = $[8];
  }
  P(mr, Kn);
  let Wn;
  let Fr;
  if ($[9] !== session || $[10] !== editorMode) {
    Wn = () => {
      if (!editorMode) setLaunchWarningFor(session, "INSERT");
    };
    Fr = [session, editorMode];
    $[9] = session;
    $[10] = editorMode;
    $[11] = Wn;
    $[12] = Fr;
  } else {
    Wn = $[11];
    Fr = $[12];
  }
  P(Wn, Fr);
  let [Zn, Un] = y(false);
  let dr;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    dr = {
      show: false,
    };
    $[13] = dr;
  } else dr = $[13];
  let [or, pr] = y(dr);
  let Qn;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    Qn = (ur, key) =>
      pr(
        ur
          ? {
              show: ur,
              key,
            }
          : {
              show: false,
            },
      );
    $[14] = Qn;
  } else Qn = $[14];
  let onExitMessage = Qn;
  let ts;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    ts = Promise.resolve();
    $[15] = ts;
  } else ts = $[15];
  let Gn = R(ts);
  let Ur;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    Ur = new Set();
    $[16] = Ur;
  } else Ur = $[16];
  let Zr = R(Ur);
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let appState_2 = useAppState(selectQueueEditIndex2);
  let fr;
  if ($[17] !== setAppState) {
    fr = () => setAppState(clearQueueEditIndex);
    $[17] = setAppState;
    $[18] = fr;
  } else fr = $[18];
  let $r = fr;
  let setVoiceState = useSetVoiceState();
  let { storageV5 } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let appState_3 = useAppState(selectTasks2);
  let appState_4 = useAppState(selectRemoteBackgroundTasks2);
  let Ls;
  if ($[19] !== appState_4 || $[20] !== appState_3) {
    Ls = countNonAmbientTasks(appState_4) > 0 && !Object.values(appState_3).some(shouldHideTasksFooter);
    $[19] = appState_4;
    $[20] = appState_3;
    $[21] = Ls;
  } else Ls = $[21];
  let is = Ls;
  let ws = Boolean(storeSelector);
  let [Ci, oi] = y(ws);
  let [Oi, Hi] = y(is);
  if (ws !== Ci) {
    oi(ws);
    Hi(is);
  }
  let appState_5 = useAppState(selectWorkflowDetail);
  let taskId = appState_5?.taskId;
  let { columns } = useTerminalSize();
  let appState_6 = useAppState(shouldShowBridgeStatus);
  let xs;
  if ($[22] !== appState_6 || $[23] !== columns || $[24] !== isFullscreen || $[25] !== We) {
    xs = (!isFullscreen || We) && appState_6 && columns >= FOOTER_WIDE_COLUMNS && isBridgeEnabled();
    $[22] = appState_6;
    $[23] = columns;
    $[24] = isFullscreen;
    $[25] = We;
    $[26] = xs;
  } else xs = $[26];
  let kr = xs;
  let appState_7 = useAppState(selectNever);
  let frameFooterState = useFrameFooterState();
  let teamContext = useAppState(selectTeamContext_2);
  let commandQueue = useCommandQueue();
  let appState_8 = useAppState(selectPromptSuggestion);
  let appState_9 = useAppState(selectViewingAgentTaskId_4);
  let Hs = useAppState(selectIsBriefOnly_3) && !appState_9;
  let appState_10 = useAppState(selectMainLoopModel);
  let appState_11 = useAppState(selectMainLoopModelForSession_2);
  let appState_12 = useAppState(selectThinkingEnabled2);
  let appState_13 = useAppState(selectIsFastModeOn);
  let queuedMessageText = useQueuedMessageText();
  let appState_14 = useAppState(selectUltracode_2);
  let appState_15 = useAppState(getViewedTeammateTask_2_2);
  let viewingAgentName = appState_15?.identity.agentName;
  let viewingAgentName_2 = useAppState(getActiveAgentName);
  let Ss;
  if ($[27] !== appState_15) {
    Ss =
      appState_15?.identity.color && AGENT_COLOR_NAMES.includes(appState_15.identity.color)
        ? appState_15.identity.color
        : undefined;
    $[27] = appState_15;
    $[28] = Ss;
  } else Ss = $[28];
  let viewingAgentColor = Ss;
  let Ws;
  cl: {
    if (appState_15) {
      let za;
      if ($[29] !== appState || $[30] !== appState_15.permissionMode) {
        za = {
          ...appState,
          mode: appState_15.permissionMode,
        };
        $[29] = appState;
        $[30] = appState_15.permissionMode;
        $[31] = za;
      } else za = $[31];
      Ws = za;
      break cl;
    }
    Ws = appState;
  }
  let toolPermissionContext = Ws;
  let za;
  if ($[32] !== transcript) {
    za = () => primePasteIdsFromMessages(transcript.getSnapshot());
    $[32] = transcript;
    $[33] = za;
  } else za = $[33];
  y(za);
  let [as, pi] = y(false);
  let [qa, pd] = y(false);
  let [$l] = y(getIdleInFlightState);
  let appState_16 = useAppState(selectCoordinatorTaskIndex2);
  let appState_17 = useAppState(selectTaskDecorations_3);
  let appState_18 = useAppState(selectIdleTeammatesExpanded_3);
  let _c;
  if ($[34] !== setAppState) {
    _c = (mc) =>
      setAppState((Vd) => {
        let cd = typeof mc === "function" ? mc(Vd.coordinatorTaskIndex) : mc;
        if (cd === Vd.coordinatorTaskIndex) {
          return Vd;
        }
        return {
          ...Vd,
          coordinatorTaskIndex: cd,
        };
      });
    $[34] = setAppState;
    $[35] = _c;
  } else _c = $[35];
  let Ka = _c;
  let visibleAgentTaskCount = useVisibleAgentTaskCount();
  let Gl = subscribeCoordinatorPanel();
  let gd = storeSelector_4 !== "bash" && countVisibleTasks(appState_3, appState_4) > 0;
  let hd = gd ? -1 : 0;
  let bd;
  if ($[36] !== appState_18 || $[37] !== appState_17 || $[38] !== appState_3 || $[39] !== appState_9) {
    bd = getVisibleBackgroundTasks(appState_3, appState_17, appState_9, appState_18);
    $[36] = appState_18;
    $[37] = appState_17;
    $[38] = appState_3;
    $[39] = appState_9;
    $[40] = bd;
  } else bd = $[40];
  let Od = bd;
  let pc;
  if ($[41] !== Od) {
    pc = Od.map(selectId);
    $[41] = Od;
    $[42] = pc;
  } else pc = $[42];
  let Kd = pc;
  let ec;
  if ($[43] !== appState_17 || $[44] !== appState_3 || $[45] !== appState_9 || $[46] !== Od) {
    ec = Od.some(isAgentRowVisible)
      ? getVisibleBackgroundTasks(appState_3, appState_17, appState_9, true).map(selectId2)
      : undefined;
    $[43] = appState_17;
    $[44] = appState_3;
    $[45] = appState_9;
    $[46] = Od;
    $[47] = ec;
  } else ec = $[47];
  let qu = ec;
  let Ku = R(Kd);
  let iu = R(qu);
  let Iu;
  let Am;
  if (
    $[48] !== visibleAgentTaskCount ||
    $[49] !== appState_16 ||
    $[50] !== appState_18 ||
    $[51] !== hd ||
    $[52] !== Ka ||
    $[53] !== qu ||
    $[54] !== Od ||
    $[55] !== Kd
  ) {
    Iu = () => {
      let Kp = (appState_18 ? iu.current : undefined) ?? Ku.current;
      Ku.current = Kd;
      iu.current = qu;
      let nl = remapTaskPanelIndex(appState_16, Kp, Kd, Od);
      if (nl !== appState_16) Ka(nl);
      else if (appState_16 >= visibleAgentTaskCount) Ka(Math.max(hd, visibleAgentTaskCount - 1));
      else if (appState_16 < hd) Ka(hd);
    };
    Am = [appState_18, qu, Kd, Od, visibleAgentTaskCount, appState_16, hd, Ka];
    $[48] = visibleAgentTaskCount;
    $[49] = appState_16;
    $[50] = appState_18;
    $[51] = hd;
    $[52] = Ka;
    $[53] = qu;
    $[54] = Od;
    $[55] = Kd;
    $[56] = Iu;
    $[57] = Am;
  } else {
    Iu = $[56];
    Am = $[57];
  }
  P(Iu, Am);
  let [ss, Gs] = y(false);
  let [ma, $a] = y(false);
  let clock = useClock();
  let [Si, na] = y(false);
  let [js, Ya] = y(false);
  let tl = R(false);
  let [ol, ed] = y(false);
  let [_d, ga] = y(null);
  let [du, rg] = y(false);
  let storeSelector_7 = useStoreSelector(turn, selectEnvOnboardingOffered);
  let Wd = appState.mode === "auto";
  let Rl;
  if ($[58] !== storeSelector_5 || $[59] !== Wd || $[60] !== storeSelector_7) {
    Rl = storeSelector_7 && !storeSelector_5 && Wd && shouldOfferAutoModeEnvOnboarding();
    $[58] = storeSelector_5;
    $[59] = Wd;
    $[60] = storeSelector_7;
    $[61] = Rl;
  } else Rl = $[61];
  let Yd = Rl;
  let Pi;
  if ($[62] !== appState_3) {
    Pi = runningWorkflowTasks(appState_3);
    $[62] = appState_3;
    $[63] = Pi;
  } else Pi = $[63];
  let fa = Pi;
  let sa = visibleAgentTaskCount > 0 || gd;
  let td = fa.length > 0 && !Gl && storeSelector_4 === "prompt" && !or.show && !ss;
  let Pl;
  if ($[64] !== or || $[65] !== frameFooterState || $[66] !== ss || $[67] !== storeSelector_4) {
    Pl =
      frameFooterState &&
      getArtifactPublishStubDir() === null &&
      storeSelector_4 === "prompt" &&
      !or.show &&
      !ss;
    $[64] = or;
    $[65] = frameFooterState;
    $[66] = ss;
    $[67] = storeSelector_4;
    $[68] = Pl;
  } else Pl = $[68];
  let Ad = Pl;
  let od;
  if ($[69] !== appState_7 || $[70] !== or || $[71] !== ss || $[72] !== storeSelector_4) {
    od = appState_7 && storeSelector_4 !== "bash" && !isRemoteSessionAvailable() && !or.show && !ss;
    $[69] = appState_7;
    $[70] = or;
    $[71] = ss;
    $[72] = storeSelector_4;
    $[73] = od;
  } else od = $[73];
  let md = od;
  let hasSuggestionContent_2 = useStoreSelector(_o.drawn, hasSuggestionContent);
  let sg;
  if ($[74] !== isFullscreen || $[75] !== $n || $[76] !== hasSuggestionContent_2) {
    sg = shouldShowFooterStatus({
      hasSuggestionContent: hasSuggestionContent_2,
      isFullscreen,
      helpOpen: $n,
    });
    $[74] = isFullscreen;
    $[75] = $n;
    $[76] = hasSuggestionContent_2;
    $[77] = sg;
  } else sg = $[77];
  let zi = sg;
  let rd;
  if ($[78] !== chrome || $[79] !== zi || $[80] !== scope) {
    rd = {
      scope,
      chrome,
      rowsDrawn: zi,
    };
    $[78] = chrome;
    $[79] = zi;
    $[80] = scope;
    $[81] = rd;
  } else rd = $[81];
  let promptChromeRows = usePromptChromeRows(rd);
  let zd;
  if (
    $[82] !== md ||
    $[83] !== kr ||
    $[84] !== Ad ||
    $[85] !== promptChromeRows ||
    $[86] !== zi ||
    $[87] !== sa ||
    $[88] !== td
  ) {
    zd = !zi
      ? []
      : [
          sa && "tasks",
          Ad && "frame",
          md && "bagel",
          promptChromeRows && "ideSelection",
          kr && "bridge",
          td && "workflows",
        ].filter(Boolean);
    $[82] = md;
    $[83] = kr;
    $[84] = Ad;
    $[85] = promptChromeRows;
    $[86] = zi;
    $[87] = sa;
    $[88] = td;
    $[89] = zd;
  } else zd = $[89];
  let Hc = zd;
  let xc = visibleAgentTaskCount > 0 || td;
  let Yc;
  if ($[90] !== Hc || $[91] !== xc) {
    Yc = xc ? Hc.filter(isFooterTabEnabled) : Hc;
    $[90] = Hc;
    $[91] = xc;
    $[92] = Yc;
  } else Yc = $[92];
  let tc = Yc;
  let appState_19 = useAppState(selectWorkflowFooterIndex2);
  let Eu;
  if ($[93] !== setAppState) {
    Eu = (Rp) =>
      setAppState((Fh) => {
        let cy = typeof Rp === "function" ? Rp(Fh.workflowFooterIndex) : Rp;
        if (cy === Fh.workflowFooterIndex) {
          return Fh;
        }
        return {
          ...Fh,
          workflowFooterIndex: cy,
        };
      });
    $[93] = setAppState;
    $[94] = Eu;
  } else Eu = $[94];
  let Nd = Eu;
  let Af;
  if ($[95] !== fa) {
    Af = fa.map(selectId3);
    $[95] = fa;
    $[96] = Af;
  } else Af = $[96];
  let Du = Af;
  let Va = R(Du);
  let Fg;
  let ns;
  if ($[97] !== Du || $[98] !== Nd || $[99] !== appState_19) {
    Fg = () => {
      let ba = Va.current;
      Va.current = Du;
      let Mi = ba[appState_19];
      if (Mi !== undefined) {
        let index = Du.indexOf(Mi);
        if (index !== -1 && index !== appState_19) {
          Nd(index);
          return;
        }
      }
      if (appState_19 >= Du.length) Nd(Math.max(0, Du.length - 1));
    };
    ns = [Du, appState_19, Nd];
    $[97] = Du;
    $[98] = Nd;
    $[99] = appState_19;
    $[100] = Fg;
    $[101] = ns;
  } else {
    Fg = $[100];
    ns = $[101];
  }
  P(Fg, ns);
  let appState_20 = useAppState(selectFooterSelection2);
  let Gp = appState_20 === "tasks" && storeSelector_4 === "bash" && appState_16 < 0;
  let yl = appState_20 && Hc.includes(appState_20) && !Gp ? appState_20 : null;
  let Dc;
  let Bh;
  if ($[102] !== yl || $[103] !== appState_20 || $[104] !== setAppState) {
    Dc = () => {
      if (appState_20 && !yl) setAppState(clearFooterSelectionState);
    };
    Bh = [appState_20, yl, setAppState];
    $[102] = yl;
    $[103] = appState_20;
    $[104] = setAppState;
    $[105] = Dc;
    $[106] = Bh;
  } else {
    Dc = $[105];
    Bh = $[106];
  }
  P(Dc, Bh);
  let Hh = shouldShowStatusNotices(We && !$n);
  const footerNavActive = yl !== null;
  let vu;
  if (
    $[107] !== or ||
    $[108] !== storeSelector_2 ||
    $[109] !== ss ||
    $[110] !== storeSelector_4 ||
    $[111] !== Hh ||
    $[112] !== ma ||
    $[113] !== footerNavActive
  ) {
    vu = {
      enabled: Hh,
      exitMessage: or,
      isPasting: ss,
      showExpandPasteHint: ma,
      mode: storeSelector_4,
      permissionParked: storeSelector_2,
      footerNavActive,
    };
    $[107] = or;
    $[108] = storeSelector_2;
    $[109] = ss;
    $[110] = storeSelector_4;
    $[111] = Hh;
    $[112] = ma;
    $[113] = footerNavActive;
    $[114] = vu;
  } else vu = $[114];
  let dm = PromptHintRow(vu);
  let Uc = yl === "tasks";
  let uy = yl === "workflows";
  let bridgeSelected = yl === "bridge";
  let ideSelectionSelected = yl === "ideSelection";
  let jh = yl !== null && !tc.includes(yl);
  let Jb;
  if ($[115] !== We || $[116] !== hd || $[117] !== setAppState || $[118] !== Ka || $[119] !== Nd) {
    Jb = (Im) => {
      setAppState((Hg) => {
        if (Hg.footerSelection === Im) {
          return Hg;
        }
        let Zb = {
          ...Hg,
          footerSelection: Im,
        };
        if (Im === "frame") Zb.frameOpenFailedSeen = frameOpenFailed(Hg);
        if (Hg.footerSelection === "tasks") Zb.idleTeammatesExpanded = false;
        return Zb;
      });
      if (Im === "tasks") Ka(hd);
      if (Im === "workflows") Nd(0);
      if (Im !== null && !We) $a(false);
    };
    $[115] = We;
    $[116] = hd;
    $[117] = setAppState;
    $[118] = Ka;
    $[119] = Nd;
    $[120] = Jb;
  } else Jb = $[120];
  let Dd = Jb;
  let p_;
  if (
    $[121] !== visibleAgentTaskCount ||
    $[122] !== yl ||
    $[123] !== fa.length ||
    $[124] !== Dd ||
    $[125] !== jh ||
    $[126] !== Ka ||
    $[127] !== Nd
  ) {
    p_ = function Br(Mf, Zd, ig) {
      let fy = ig === undefined ? false : ig;
      let Fx = yl ? Mf.indexOf(yl) : -1;
      let Wk = Mf[Fx + Zd];
      if (Wk) {
        Dd(Wk);
        let Qp = Zd < 0 && !jh;
        if (Qp && Wk === "tasks" && visibleAgentTaskCount > 0) Ka(visibleAgentTaskCount - 1);
        if (Qp && Wk === "workflows") Nd(Math.max(0, fa.length - 1));
        return true;
      }
      if (Zd < 0 && fy) {
        Dd(null);
        return true;
      }
      return false;
    };
    $[121] = visibleAgentTaskCount;
    $[122] = yl;
    $[123] = fa.length;
    $[124] = Dd;
    $[125] = jh;
    $[126] = Ka;
    $[127] = Nd;
    $[128] = p_;
  } else p_ = $[128];
  let Br = p_;
  const hasInput = !storeSelector_3;
  let Fi;
  if ($[129] !== storeSelector_5 || $[130] !== hasInput) {
    Fi = {
      hasInput,
      isAssistantResponding: storeSelector_5,
    };
    $[129] = storeSelector_5;
    $[130] = hasInput;
    $[131] = Fi;
  } else Fi = $[131];
  let { suggestion, markAccepted, logOutcomeAtSubmission, markShown } = usePromptSuggestion(Fi);
  let { addNotification, removeNotification } = useNotifications();
  let Gu;
  if (
    $[132] !== hasMessages ||
    $[133] !== storeSelector_3 ||
    $[134] !== submitCount ||
    $[135] !== viewingAgentName_2
  ) {
    Gu = {
      isInputEmpty: storeSelector_3,
      submitCount,
      hasMessages,
      viewingAgentName: viewingAgentName_2,
    };
    $[132] = hasMessages;
    $[133] = storeSelector_3;
    $[134] = submitCount;
    $[135] = viewingAgentName_2;
    $[136] = Gu;
  } else Gu = $[136];
  let promptInputPlaceholder = usePromptInputPlaceholder(Gu);
  let qh;
  if ($[137] !== on) {
    qh = () => {
      logEvent("tengu_help_toggled", {});
      on(toggleHelpOpen);
    };
    $[137] = on;
    $[138] = qh;
  } else qh = $[138];
  let Pc = qh;
  let Aa;
  if ($[139] !== Dd || $[140] !== storageV5 || $[141] !== tc[0]) {
    Aa = () => {
      let rl = tc[0];
      if (rl === undefined) {
        return;
      }
      Dd(rl);
      if (rl === "tasks" && !getGlobalConfig().hasSeenTasksHint)
        saveGlobalConfig(markTasksHintSeen, storageV5);
    };
    $[139] = Dd;
    $[140] = storageV5;
    $[141] = tc[0];
    $[142] = Aa;
  } else Aa = $[142];
  let onHistoryDownPastEnd = Aa;
  let _a;
  if (
    $[143] !== addNotification ||
    $[144] !== chrome ||
    $[145] !== $r ||
    $[146] !== draft ||
    $[147] !== setMode ||
    $[148] !== commandQueueOrDefault ||
    $[149] !== session ||
    $[150] !== setCursorOffset ||
    $[151] !== setValue ||
    $[152] !== setPastedContents ||
    $[153] !== appStoreDirect ||
    $[154] !== editorMode
  ) {
    _a = () => {
      let queueEditIndex = appStoreDirect.getState().queueEditIndex;
      if (queueEditIndex === null) {
        return false;
      }
      let Cu = draft.value;
      let ew = commandQueueOrDefault.getCommandQueue().filter(isRefillableInput)[queueEditIndex];
      if (ew && !shouldPrependModeChar(ew, Cu === "")) {
        addNotification({
          key: "queue-pull-needs-empty-input",
          kind: "feedback",
          text: "Clear the input to edit this queued shell command",
          row1Hint: "clear input to edit shell command",
          priority: "immediate",
          timeoutMs: 2000,
        });
        $r();
        logFeatureSad("input_queue_pop_to_edit", "bash_needs_empty_draft");
        return true;
      }
      let Wg = commandQueueOrDefault.popEditableAt(
        queueEditIndex,
        Cu,
        draft.cursorOffset,
        draft.pastedContents,
      );
      $r();
      if (!Wg) {
        logFeatureSad("input_queue_pop_to_edit", "stale_index");
        return true;
      }
      setValue(Wg.text);
      if (Wg.unpassed) draft.markCameBack();
      setMode(Wg.mode);
      setCursorOffset(
        editorMode && promptInputStoreFor(session).getState().vimMode === "NORMAL"
          ? setCwdState(draft.value, Wg.cursorOffset)
          : Wg.cursorOffset,
      );
      chrome.returnIdeSelection(Wg.ideSelection);
      if (Wg.images.length > 0) setPastedContents((g_) => mergeTurnTags(g_, Wg.images));
      logFeatureOk("input_queue_pop_to_edit");
      return true;
    };
    $[143] = addNotification;
    $[144] = chrome;
    $[145] = $r;
    $[146] = draft;
    $[147] = setMode;
    $[148] = commandQueueOrDefault;
    $[149] = session;
    $[150] = setCursorOffset;
    $[151] = setValue;
    $[152] = setPastedContents;
    $[153] = appStoreDirect;
    $[154] = editorMode;
    $[155] = _a;
  } else _a = $[155];
  let fc = _a;
  let Hx = R(null);
  let gy = R(null);
  let tw = R(null);
  let Ux;
  if ($[156] !== removeNotification) {
    Ux = () => () => {
      gy.current = null;
      tw.current?.close();
      removeNotification(AGENT_VIEW_COMMAND_NOTICE);
    };
    $[156] = removeNotification;
    $[157] = Ux;
  } else Ux = $[157];
  let ow;
  if ($[158] !== removeNotification || $[159] !== appState_9) {
    ow = [appState_9, removeNotification];
    $[158] = removeNotification;
    $[159] = appState_9;
    $[160] = ow;
  } else ow = $[160];
  P(Ux, ow);
  let jg = R(false);
  let S_;
  if ($[161] === MEMO_CACHE_SENTINEL) {
    S_ = () => {
      Hx.current = null;
      jg.current = false;
    };
    $[161] = S_;
  } else S_ = $[161];
  let pu = S_;
  let qx;
  if ($[162] !== draft.changedFromOutside || $[163] !== draft.value) {
    qx = ($x) => {
      if ($x === undefined && jg.current && draft.changedFromOutside) {
        return true;
      }
      let C0 = Hx.current;
      if (C0 === null) {
        return false;
      }
      return $x === "" || $x === C0 || draft.value === "" || draft.value === C0;
    };
    $[162] = draft.changedFromOutside;
    $[163] = draft.value;
    $[164] = qx;
  } else qx = $[164];
  let Yp = qx;
  let Vx;
  if ($[165] !== clock) {
    Vx = (RE) => {
      Hx.current = RE;
      jg.current = true;
      clock.setTimeout(pu, 0);
    };
    $[165] = clock;
    $[166] = Vx;
  } else Vx = $[166];
  let qg = Vx;
  let $g;
  if ($[167] !== clock) {
    $g = () => {
      jg.current = true;
      clock.setTimeout(pu, 0);
    };
    $[167] = clock;
    $[168] = $g;
  } else $g = $[168];
  let OS = $g;
  let xE = R(null);
  let nw;
  if ($[169] === MEMO_CACHE_SENTINEL) {
    nw = () => {
      let qk = {
        sameChunk: true,
        at: performance.now(),
      };
      xE.current = qk;
      queueMicrotask(() => {
        qk.sameChunk = false;
      });
    };
    $[169] = nw;
  } else nw = $[169];
  let PE = nw;
  let b_;
  if ($[170] === MEMO_CACHE_SENTINEL) {
    b_ = () => {
      let $k = xE.current;
      return $k !== null && ($k.sameChunk || performance.now() - $k.at < FOOTER_DOUBLE_CLICK_MS);
    };
    $[170] = b_;
  } else b_ = $[170];
  let Gx = b_;
  let Md;
  if ($[171] !== Hc || $[172] !== appStoreDirect) {
    Md = () => {
      let { footerSelection } = appStoreDirect.getState();
      return footerSelection !== null && Hc.includes(footerSelection);
    };
    $[171] = Hc;
    $[172] = appStoreDirect;
    $[173] = Md;
  } else Md = $[173];
  let If = Md;
  let shadowedFooterActionHandler = useShadowedFooterActionHandler(If);
  let w_;
  if ($[174] === MEMO_CACHE_SENTINEL) {
    w_ = () => Xo.current?.clearBuffer();
    $[174] = w_;
  } else w_ = $[174];
  let Vg = w_;
  let [k_, Vk] = y(0);
  let NS;
  let Kk;
  if ($[175] !== k_) {
    NS = () => {
      if (k_ === 0) {
        return;
      }
      getSecondRootError().get(process.stdout)?.forceRedraw();
    };
    Kk = [k_];
    $[175] = k_;
    $[176] = NS;
    $[177] = Kk;
  } else {
    NS = $[176];
    Kk = $[177];
  }
  zt(NS, Kk);
  let C_;
  if (
    $[178] !== addNotification ||
    $[179] !== dialogStore ||
    $[180] !== draft ||
    $[181] !== If ||
    $[182] !== logOutcomeAtSubmission ||
    $[183] !== markAccepted ||
    $[184] !== OS ||
    $[185] !== submitToAgent ||
    $[186] !== submitEmpty ||
    $[187] !== submit_2 ||
    $[188] !== appState_8 ||
    $[189] !== fc ||
    $[190] !== removeNotification ||
    $[191] !== scope ||
    $[192] !== session ||
    $[193] !== setCursorOffset ||
    $[194] !== setValue ||
    $[195] !== setPastedContents ||
    $[196] !== storageV5 ||
    $[197] !== appStoreDirect ||
    $[198] !== _o.own ||
    $[199] !== teamContext
  ) {
    C_ = async (Jp, T_, sw, hy, FS, lw, WS) => {
      let ane = T_ === undefined ? false : T_;
      let Xp = hy === undefined ? false : hy;
      let Qx = lw === undefined ? false : lw;
      let _0 = WS === undefined ? false : WS;
      let ME = Jp === "";
      let x_ = gy.current;
      gy.current = null;
      if (hasDraftHiddenCueDialog(dialogStore.getState())) {
        return;
      }
      let state = appStoreDirect.getState();
      if (isKbCohesionFixesOn() && state.queueEditIndex !== null && fc()) {
        return;
      }
      if (If()) {
        return;
      }
      if (Gx()) {
        return;
      }
      let cm = expandPastedTextRefs(Jp, sw ?? draft.pastedContents);
      if (cm.removed.removedTotal > 0) {
        stripInvisiblePromptChars(cm.removed, "prompt");
        let R0 = cm.input.trim() === "";
        let P_ = skipInvisibleCharsNotice(cm.input, cm.removed, draft.mode);
        noteLinkSuppliedEdit(session, Jp, cm.input);
        setValue(cm.input);
        setCursorOffset(cm.input.length);
        if (cm.pastedContents !== draft.pastedContents) setPastedContents(cm.pastedContents);
        addNotification({
          key: "prompt-invisible-removed",
          kind: "feedback",
          text: formatInvisibleCharsRemoved(
            cm.removed.removedTotal,
            R0 ? "empty" : P_ ? "review" : "cleaned",
          ),
          priority: "immediate",
          timeoutMs: NOTIFICATION_TIMEOUT_MS,
        });
        Vk(bumpCounter);
        PE();
        if (P_) {
          return;
        }
        Jp = cm.input;
        sw = cm.pastedContents;
        FS = undefined;
      }
      Jp = Jp.trimEnd();
      let UK = sw ?? draft.pastedContents;
      let any = Object.values(UK).some(isPastedImageBlock);
      let A_ = suggestionTextOrNull(appState_8);
      let Zp = Jp === A_;
      if (getAutoModeConfigOrDefault().typedMarks === true) {
        let WK = A_ === null ? "" : stripPastedRefMarkers(expandPastedTextRefs(A_, {}).input.trimEnd());
        let M_ = stripPastedRefMarkers(cm.input.trimEnd());
        Zp = M_ !== "" && (M_ === WK || M_ === stripModePrefix(WK));
      }
      let DE = Boolean(
        Zp && A_ && appState_8.status === "accepted" && appState_8.acceptedAt > appState_8.shownAt,
      );
      if (Zp && A_ && !any && !state.viewingAgentTaskId) {
        if (isShownOrAcceptedSuggestion(appState_8)) markAccepted();
      }
      if (isAgentSwarmsEnabled()) {
        let directMemberMessage = parseDirectMemberMessage(Jp);
        if (directMemberMessage) {
          if (Zr.current.has(Jp)) {
            return;
          }
          Zr.current.add(Jp);
          OS();
          if (
            (await sendDirectMemberMessageAndNotify({
              recipientName: directMemberMessage.recipientName,
              message: requestDialogWrapper(directMemberMessage.message, UK),
              teamContext,
              writeToMailbox,
              storageV5,
              addNotification,
              clearInput: () => {
                setValue("");
                setPastedContents({});
                setCursorOffset(0);
                Vg();
                Xo.current?.resetHistory();
              },
            }).finally(() => {
              Zr.current.delete(Jp);
            })) === "handled"
          ) {
            return;
          }
        }
      }
      let jS = draft.mode === "prompt" && getActiveAgentForInput(appStoreDirect.getState()).type === "leader";
      let VS = Jp;
      let yy = false;
      if (VS.trim() === "" && !any && jS) {
        let x0 = autoResumePromptIfStale();
        if (x0 !== null) {
          VS = x0;
          yy = true;
        }
      }
      if (VS.trim() === "" && !any) {
        if (!(jS && ME && !Xp && submitEmpty())) logFeatureOk("prompt_submit_empty");
        return;
      }
      let { suggestions } = _o.own.getState();
      let P0 = suggestions.length > 0 && suggestions.every(scanDirectory);
      if (suggestions.length > 0 && !ane && !P0) {
        logForDebugging(`[onSubmit] early return: suggestions showing (count=${suggestions.length})`);
        return;
      }
      if (isShownOrAcceptedSuggestion(appState_8)) {
        let jK = logOutcomeAtSubmission(Jp);
        if (jK !== null) recordSuggestionOutcome(jK, storageV5, session.promptSuggestion);
      }
      let slashCommand = parseSlashCommand(VS);
      let Kg = slashCommand && findCommand(slashCommand.commandName, scope.commands);
      let A0 = Kg?.type === "local" || Kg?.type === "local-jsx";
      if (
        jS &&
        !A0 &&
        !EXIT_COMMAND_WORDS.includes(Jp.trim()) &&
        !isUnattendedBgSession() &&
        appStoreDirect.getState().promptSuggestionEnabled &&
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
      Xo.current?.resetHistory();
      let activeAgentForInput = getActiveAgentForInput(appStoreDirect.getState());
      if (activeAgentForInput.type !== "leader") {
        if (!A0) {
          logEvent("tengu_transcript_input_to_teammate", {});
          OS();
          await submitToAgent(
            VS,
            activeAgentForInput.task,
            {
              setCursorOffset,
              clearBuffer: Vg,
              resetHistory: noopResetHistory,
            },
            sw,
          );
          return;
        }
        let KS =
          slashCommand && Kg
            ? AgentViewCommandNotice(Kg, {
                invokedAs: slashCommand.commandName,
                isTeammate: activeAgentForInput.type === "viewed",
              })
            : undefined;
        E0: switch (KS?.onSubmit) {
          case undefined: {
            break E0;
          }
          case "block": {
            logEvent("tengu_agent_view_leader_command_notice", {});
            addNotification({
              key: AGENT_VIEW_COMMAND_NOTICE,
              kind: "feedback",
              segments: KS.segments,
              priority: "immediate",
              exemptFromDiffPanelHold: true,
              fold: foldKeepNewest,
            });
            return;
          }
          case "confirm": {
            let taskId = activeAgentForInput.task.id;
            if (
              isSameAgentViewCommand(x_, {
                input: VS,
                taskId,
              })
            ) {
              logEvent("tengu_agent_view_leader_command_confirmed", {});
              break E0;
            }
            if (tw.current !== null) {
              return;
            }
            logEvent("tengu_agent_view_leader_command_notice", {});
            let I_ = scope.localJsx.show(
              jsxProd_default(ConfirmRemoveTag, {
                title: KS.title,
                confirmLabel: KS.confirmLabel,
                onCancel: () => I_.close(),
                onConfirm: () => {
                  I_.close();
                  gy.current = {
                    input: VS,
                    taskId,
                  };
                  draft.submit(VS, true);
                },
              }),
              {
                commandName: KS.commandName,
                immediate: true,
                hidesPrompt: false,
                retireAtTurnBoundary: false,
              },
            );
            tw.current = I_;
            I_.closed.then(() => {
              if (tw.current === I_) tw.current = null;
            });
            return;
          }
        }
      }
      let zk = Xo.current?.isWorkflowKeywordSuppressed() ?? false;
      let NE = yy || Qx ? undefined : createFrozenMarker();
      let qK =
        zk || DE || sw || yy || Xp || FS || NE || _0 || Qx
          ? {
              suppressWorkflowKeyword: zk || undefined,
              inputSource: DE ? "suggestion_accepted" : undefined,
              pastedContentsOverride: sw,
              fromKeybinding: yy || undefined,
              resumesStaleQuotaWait: yy || undefined,
              wait: Xp || undefined,
              keyboard: yy ? undefined : FS,
              composerEnter: NE,
              sendNow: _0 || undefined,
              inputModeOverride: Qx ? "prompt" : undefined,
            }
          : undefined;
      OS();
      await submit_2(
        VS,
        {
          setCursorOffset,
          clearBuffer: Vg,
          resetHistory: noopAfterSubmit,
        },
        qK,
      );
    };
    $[178] = addNotification;
    $[179] = dialogStore;
    $[180] = draft;
    $[181] = If;
    $[182] = logOutcomeAtSubmission;
    $[183] = markAccepted;
    $[184] = OS;
    $[185] = submitToAgent;
    $[186] = submitEmpty;
    $[187] = submit_2;
    $[188] = appState_8;
    $[189] = fc;
    $[190] = removeNotification;
    $[191] = scope;
    $[192] = session;
    $[193] = setCursorOffset;
    $[194] = setValue;
    $[195] = setPastedContents;
    $[196] = storageV5;
    $[197] = appStoreDirect;
    $[198] = _o.own;
    $[199] = teamContext;
    $[200] = C_;
  } else C_ = $[200];
  let Tc = C_;
  let T_;
  let hy;
  if ($[201] !== draft || $[202] !== Tc) {
    T_ = () => draft.onSubmitRequest(($K, VK) => void Tc($K, VK));
    hy = [draft, Tc];
    $[201] = draft;
    $[202] = Tc;
    $[203] = T_;
    $[204] = hy;
  } else {
    T_ = $[203];
    hy = $[204];
  }
  zt(T_, hy);
  let lw;
  if ($[205] !== Tc || $[206] !== setPastedContents) {
    lw = (D0) => {
      setPastedContents(D0.pastedContents);
      Tc(D0.display, false, D0.pastedContents);
    };
    $[205] = Tc;
    $[206] = setPastedContents;
    $[207] = lw;
  } else lw = $[207];
  let {
    isSearching,
    historyQuery,
    setHistoryQuery,
    historyMatch,
    historyFailedMatch,
    handleKeyDown,
    openSearch,
  } = useHistorySearch(draft, lw);
  let Qm = isSearching || $n;
  let WS;
  let j0;
  if ($[208] !== draft || $[209] !== Qm) {
    WS = () => {
      draft.setInputOverlayActive(Qm);
      return () => draft.setInputOverlayActive(false);
    };
    j0 = [Qm, draft];
    $[208] = draft;
    $[209] = Qm;
    $[210] = WS;
    $[211] = j0;
  } else {
    WS = $[210];
    j0 = $[211];
  }
  P(WS, j0);
  let uw;
  if (
    $[212] !== storeSelector_3 ||
    $[213] !== Qm ||
    $[214] !== wn ||
    $[215] !== storeSelector_4 ||
    $[216] !== appState_2 ||
    $[217] !== commandQueue
  ) {
    uw =
      wn ||
      Qm ||
      storeSelector_4 !== "prompt" ||
      appState_2 !== null ||
      (!isKbCohesionFixesOn() && commandQueue.some((lne) => shouldPrependModeChar(lne, storeSelector_3)));
    $[212] = storeSelector_3;
    $[213] = Qm;
    $[214] = wn;
    $[215] = storeSelector_4;
    $[216] = appState_2;
    $[217] = commandQueue;
    $[218] = uw;
  } else uw = $[218];
  let Xx = uw;
  let KK;
  let GK;
  if ($[219] !== draft || $[220] !== Xx) {
    KK = () => {
      draft.setInputOwnsEscape(Xx);
      return () => draft.setInputOwnsEscape(false);
    };
    GK = [Xx, draft];
    $[219] = draft;
    $[220] = Xx;
    $[221] = KK;
    $[222] = GK;
  } else {
    KK = $[221];
    GK = $[222];
  }
  P(KK, GK);
  let storeSelector_8 = useStoreSelector(_o.drawn, hasSuggestions);
  let storeSelector_9 = useStoreSelector(_o, hasSuggestions);
  let Jk;
  if ($[223] === MEMO_CACHE_SENTINEL) {
    Jk = (HE, UE) => Xo.current?.selectSuggestion(HE, UE);
    $[223] = Jk;
  } else Jk = $[223];
  let onSelectSuggestion = Jk;
  let V0;
  if ($[224] === MEMO_CACHE_SENTINEL) {
    V0 = (Zx) => Xo.current?.setHoveredSuggestion(Zx);
    $[224] = V0;
  } else V0 = $[224];
  let onHoverSuggestion = V0;
  let JS;
  if ($[225] === MEMO_CACHE_SENTINEL) {
    JS = [];
    $[225] = JS;
  } else JS = $[225];
  let Sy = R(JS);
  let XS;
  if ($[226] === MEMO_CACHE_SENTINEL) {
    XS = () => Sy.current.splice(0);
    $[226] = XS;
  } else XS = $[226];
  let takePendingPastes = XS;
  let onKeyDown = function hw(event) {
    useComposerEscape(event, {
      draft,
      vimEnabled: editorMode,
      vimMode,
      helpOpen: $n,
      setHelpOpen: on,
    });
    if (event.ctrl || event.meta) {
      return;
    }
    if (editorMode && vimMode === "NORMAL") {
      if (event.key === "j") {
        event.preventDefault();
        return Qg();
      }
      if (event.key === "k") {
        event.preventDefault();
        return ag();
      }
      if (event.key === "l") {
        event.preventDefault();
        return O_();
      }
      if (event.key === "h") {
        event.preventDefault();
        return lg();
      }
    }
    if (event.key.length > PASTE_THRESHOLD) {
      event.preventDefault();
      gw(event.key);
      return;
    }
    let N_ = [...event.key].length === 1;
    let normalized = event.key.normalize("NFC");
    let sliced = draft.value.slice(0, draft.cursorOffset);
    let QK =
      !N_ &&
      event.name === "" &&
      event.key !== "" &&
      (!editorMode || (vimMode === "INSERT" && !getInsertModeEscapeRemaps().has(normalized))) &&
      draft.value === draft.value.normalize("NFC") &&
      (sliced + normalized).normalize("NFC").length === sliced.length + normalized.length;
    if (N_ || QK) {
      event.preventDefault();
      if (event.key === "?" && draft.value === "") {
        Pc();
        return;
      }
      Xo.current?.typeText(normalized);
    }
  };
  function gw(zK) {
    Sy.current.push(zK);
    setAppState(clearFooterSelectionState);
  }
  let WE = storeSelector_4 === "prompt" && !storeSelector_8 && suggestion && !appState_9;
  if (WE) markShown();
  if (appState_8.status === "generated" && !suggestion && !appState_9) {
    logSuggestionSuppressed("timing");
    setAppState(clearPromptSuggestion);
  }
  queryTerminalBackground();
  let iP;
  if ($[227] === MEMO_CACHE_SENTINEL) {
    iP = () => {
      Vk(bumpRetryCount);
    };
    $[227] = iP;
  } else iP = $[227];
  let L_ = iP;
  let jE;
  if ($[228] !== addNotification) {
    jE = () => {
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
    $[229] = jE;
  } else jE = $[229];
  let Sw = jE;
  let $E;
  if (
    $[230] !== addNotification ||
    $[231] !== storeSelector_6 ||
    $[232] !== storeSelector_5 ||
    $[233] !== storeSelector_4 ||
    $[234] !== submit_2 ||
    $[235] !== on
  ) {
    $E = () => {
      if (isRemoteSessionAvailable()) {
        if (storeSelector_5 || storeSelector_6 || storeSelector_4 !== "prompt" || tl.current) {
          addNotification({
            key: "remote-model-picker-unavailable",
            kind: "feedback",
            text: "Use /model to change the model in cloud sessions",
            priority: "medium",
          });
          return;
        }
        tl.current = true;
        submit_2("/model", NOOP_HELPERS, {
          fromKeybinding: true,
          inputModeOverride: "prompt",
        }).finally(() => {
          tl.current = false;
        });
        return;
      }
      Ya(toggleFlag);
      on(false);
    };
    $[230] = addNotification;
    $[231] = storeSelector_6;
    $[232] = storeSelector_5;
    $[233] = storeSelector_4;
    $[234] = submit_2;
    $[235] = on;
    $[236] = $E;
  } else $E = $[236];
  let K0 = $E;
  let Q0;
  if ($[237] !== Sw || $[238] !== on) {
    Q0 = () => {
      if (!isRemoteControlChannelAvailable() && Sw()) {
        return;
      }
      ga(unavailableReasonState);
      on(false);
    };
    $[237] = Sw;
    $[238] = on;
    $[239] = Q0;
  } else Q0 = $[239];
  let lP = Q0;
  let VE;
  if ($[240] !== addNotification || $[241] !== mainLoopModel || $[242] !== Sw || $[243] !== on) {
    VE = () => {
      if (!isRemoteControlChannelAvailable() && Sw()) {
        return;
      }
      on(false);
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
      rg(negateBoolean_2);
    };
    $[240] = addNotification;
    $[241] = mainLoopModel;
    $[242] = Sw;
    $[243] = on;
    $[244] = VE;
  } else VE = $[244];
  let GE = VE;
  let PAt = (cne) => {
    if (getRemoteCaps() || isRemoteSessionAvailable()) {
      return;
    }
    let attentionBudget = appStoreDirect.getState().attentionBudget;
    let z0 = stepStatusLineWidth(attentionBudget, cne);
    if (z0 === attentionBudget) {
      return;
    }
    setAppState((J0) =>
      J0.attentionBudget === z0
        ? J0
        : {
            ...J0,
            attentionBudget: z0,
          },
    );
    logEvent("tengu_attention_budget_cycle", {
      to: fromEnum(z0),
    });
    logFeatureOk("attention_budget");
  };
  let X0;
  if (
    $[245] !== addNotification ||
    $[246] !== session ||
    $[247] !== setAppState ||
    $[248] !== on ||
    $[249] !== storeSelector_7 ||
    $[250] !== storageV5 ||
    $[251] !== appStoreDirect ||
    $[252] !== setVoiceState ||
    $[253] !== teamContext ||
    $[254] !== turn
  ) {
    X0 = (bw) => {
      let toolPermissionContext = appStoreDirect.getState().toolPermissionContext;
      $a(false);
      pr(dismissShowFlag);
      let YK = isViewingTeammate(appStoreDirect.getState())
        ? getViewedTeammateTask_2_2(appStoreDirect.getState())
        : undefined;
      if (YK) {
        let context = {
          ...toolPermissionContext,
          mode: YK.permissionMode,
        };
        let nextPermissionMode = getNextPermissionMode_2(context, undefined);
        logEvent("tengu_mode_cycle", {
          to: fromEnum(nextPermissionMode),
          trigger: fromEnum("shift_tab"),
        });
        logFeatureOk("mode_switch");
        let id = YK.id;
        setAppState((Zk) => {
          let Z0 = Zk.tasks[id];
          if (!Z0 || Z0.type !== "in_process_teammate") {
            return Zk;
          }
          if (Z0.permissionMode === nextPermissionMode) {
            return Zk;
          }
          return {
            ...Zk,
            tasks: {
              ...Zk.tasks,
              [id]: {
                ...Z0,
                permissionMode: nextPermissionMode,
                planHeldAfterSpawn: nextPermissionMode === "plan",
              },
            },
          };
        });
        if (nextPermissionMode !== "plan") exitTeammatePlanMode(id, setVoiceState);
        on(false);
        return;
      }
      let ev = null ? null.currentMode : toolPermissionContext.mode;
      logForDebugging(
        `[auto-mode] handleCycleMode: currentMode=${ev} isAutoModeAvailable=${toolPermissionContext.isAutoModeAvailable}`,
      );
      let mode = null ? null.nextMode : (null ?? getNextPermissionMode_2(toolPermissionContext, teamContext));
      if ((null || false) && mode === ev) {
        on(false);
        return;
      }
      if (mode === ev) {
        logFeatureBad("mode_switch", "no_other_modes");
        if (isRemoteSessionAvailable())
          addNotification({
            key: "remote-permission-mode-noop",
            kind: "feedback",
            text: "No other permission modes are available in this cloud session",
            row1Hint: "no other modes in cloud",
            priority: "medium",
          });
        on(false);
        return;
      }
      if (storeSelector_7 && ev === "auto") turn.dismissEnvOnboardingOffer();
      let { context } =
        null ??
        (false
          ? {
              context: transitionPermissionMode(ev, null, toolPermissionContext, "shift_tab"),
            }
          : cyclePermissionMode(toolPermissionContext, teamContext, "shift_tab"));
      announce(`[${permissionModeIndicator(mode)} on]`);
      logEvent("tengu_mode_cycle", {
        to: fromEnum(mode),
        trigger: fromEnum("shift_tab"),
      });
      if (!isRemoteControlChannelAvailable()) logFeatureOk("mode_switch");
      if (mode === "plan") logFeatureOk("mode_plan_enter");
      else if (ev === "plan") logFeatureOk("mode_plan_exit");
      if (mode === "auto") logFeatureOk("mode_auto_enter");
      if (mode === "plan" && (bw.kind === "carousel" || bw.selection.mode === "plan")) {
        let now = Date.now();
        saveGlobalConfig((mne) => touchPlanModeUse(mne, now), storageV5);
      }
      tabCycleState.of(session.host).cycled = true;
      setToolPermissionContextAndNotify(setAppState, {
        ...context,
        mode,
      });
      Gn.current = Gn.current.then(() => syncTeammateMode(mode, teamContext?.teamName, storageV5));
      on(false);
    };
    $[245] = addNotification;
    $[246] = session;
    $[247] = setAppState;
    $[248] = on;
    $[249] = storeSelector_7;
    $[250] = storageV5;
    $[251] = appStoreDirect;
    $[252] = setVoiceState;
    $[253] = teamContext;
    $[254] = turn;
    $[255] = X0;
  } else X0 = $[255];
  let mm = X0;
  let AAt = noopOnConfirm;
  let pne;
  if ($[256] !== Dn || $[257] !== mm || $[258] !== cn) {
    pne = () => {
      let JE = Dn();
      if (JE === null) {
        return false;
      }
      cn(null);
      mm({
        kind: "select",
        selection: JE,
      });
      return true;
    };
    $[256] = Dn;
    $[257] = mm;
    $[258] = cn;
    $[259] = pne;
  } else pne = $[259];
  let ZE = pne;
  let takeEnter = returnFalse;
  let hne;
  if ($[260] !== setAppState || $[261] !== turn) {
    hne = () => {
      setAutoModeEnvOnboardingEligible(false);
      turn.dismissEnvOnboardingOffer();
      if (!isAutoModeSetupNotOverridden()) {
        return;
      }
      setAppState(withAutoModeSetupMessage);
    };
    $[260] = setAppState;
    $[261] = turn;
    $[262] = hne;
  } else hne = $[262];
  let onAccept = hne;
  let oNe;
  if ($[263] !== turn) {
    oNe = () => {
      setAutoModeEnvOnboardingEligible(false);
      turn.dismissEnvOnboardingOffer();
    };
    $[263] = turn;
    $[264] = oNe;
  } else oNe = $[264];
  let eG = oNe;
  let keybindingContext = useKeybindingContext();
  let yne;
  if (
    $[265] !== Yp ||
    $[266] !== draft.typedOnly ||
    $[267] !== draft.value ||
    $[268] !== shadowedFooterActionHandler ||
    $[269] !== Go ||
    $[270] !== isSearching ||
    $[271] !== keybindingContext ||
    $[272] !== qg ||
    $[273] !== Tc
  ) {
    yne = () => {
      if (!keybindingContext || Go || isSearching) {
        return;
      }
      let MAt =
        getSingleKeyAction(parseKeystroke("enter"), "Chat", keybindingContext.bindings) === "chat:submit";
      return keybindingContext.registerHandler({
        action: "chat:submit",
        context: "Chat",
        handler: () => {
          if (shadowedFooterActionHandler("chat:submit")) {
            return false;
          }
          if (Yp(undefined)) {
            return;
          }
          let eB = draft.value;
          qg(eB);
          Tc(eB, false, undefined, false, draft.typedOnly ? createFrozenEmpty() : undefined);
        },
        singleKey: !MAt,
      });
    };
    $[265] = Yp;
    $[266] = draft.typedOnly;
    $[267] = draft.value;
    $[268] = shadowedFooterActionHandler;
    $[269] = Go;
    $[270] = isSearching;
    $[271] = keybindingContext;
    $[272] = qg;
    $[273] = Tc;
    $[274] = yne;
  } else yne = $[274];
  let oD;
  if (
    $[275] !== Yp ||
    $[276] !== ZE ||
    $[277] !== draft ||
    $[278] !== shadowedFooterActionHandler ||
    $[279] !== Go ||
    $[280] !== isSearching ||
    $[281] !== keybindingContext ||
    $[282] !== qg ||
    $[283] !== Tc
  ) {
    oD = [keybindingContext, Go, isSearching, draft, shadowedFooterActionHandler, ZE, Yp, qg, Tc];
    $[275] = Yp;
    $[276] = ZE;
    $[277] = draft;
    $[278] = shadowedFooterActionHandler;
    $[279] = Go;
    $[280] = isSearching;
    $[281] = keybindingContext;
    $[282] = qg;
    $[283] = Tc;
    $[284] = oD;
  } else oD = $[284];
  P(yne, oD);
  let nNe;
  if ($[285] !== Yp || $[286] !== draft.value || $[287] !== qg || $[288] !== Tc) {
    nNe = () => {
      if (Yp(undefined)) {
        return;
      }
      let iNe = draft.value;
      qg(iNe);
      Tc(iNe, true, undefined, true);
    };
    $[285] = Yp;
    $[286] = draft.value;
    $[287] = qg;
    $[288] = Tc;
    $[289] = nNe;
  } else nNe = $[289];
  let tG = nNe;
  let sendQueuedNow = submit.sendQueuedNow;
  let Sne;
  if (
    $[290] !== Yp ||
    $[291] !== draft.mode ||
    $[292] !== draft.pastedContents ||
    $[293] !== draft.value ||
    $[294] !== qg ||
    $[295] !== Tc ||
    $[296] !== sendQueuedNow ||
    $[297] !== appStoreDirect ||
    $[298] !== turn
  ) {
    Sne = () => {
      if (Yp(undefined)) {
        return;
      }
      let nG = draft.value;
      let bne = nG.trim() !== "" || Object.values(draft.pastedContents).some(isImagePasteBlock);
      let mode = draft.mode;
      let activeAgentForInput = getActiveAgentForInput(appStoreDirect.getState());
      let id = activeAgentForInput.type === "named_agent" ? activeAgentForInput.task.id : undefined;
      let nD = mode === "prompt" && activeAgentForInput.type === "leader";
      let iG = mode === "prompt" && id !== undefined;
      if (!bne || appStoreDirect.getState().queueEditIndex !== null) {
        if (nD || iG) sendQueuedNow(mode, id);
        return;
      }
      let abortController = turn.getSnapshot().abortController;
      qg(nG);
      Tc(nG, true, undefined, false, undefined, false, true)
        .then(() => {
          let dG = abortController !== null && turn.getSnapshot().abortController === abortController;
          if ((nD && dG) || iG) sendQueuedNow(mode, id);
        })
        .catch(logError);
    };
    $[290] = Yp;
    $[291] = draft.mode;
    $[292] = draft.pastedContents;
    $[293] = draft.value;
    $[294] = qg;
    $[295] = Tc;
    $[296] = sendQueuedNow;
    $[297] = appStoreDirect;
    $[298] = turn;
    $[299] = Sne;
  } else Sne = $[299];
  let cG = Sne;
  let sB;
  if ($[300] !== mm) {
    sB = () =>
      mm({
        kind: "carousel",
      });
    $[300] = mm;
    $[301] = sB;
  } else sB = $[301];
  let kne;
  let vne;
  if ($[302] === MEMO_CACHE_SENTINEL) {
    kne = {};
    vne = {};
    $[302] = kne;
    $[303] = vne;
  } else {
    kne = $[302];
    vne = $[303];
  }
  let dNe;
  if ($[304] !== K0 || $[305] !== tG || $[306] !== cG || $[307] !== GE || $[308] !== sB) {
    dNe = {
      "chat:queueSubmit": tG,
      "chat:sendNow": cG,
      "chat:clearScreen": L_,
      "chat:clearInput": L_,
      "chat:modelPicker": K0,
      "chat:thinkingToggle": GE,
      "chat:cycleMode": sB,
      ...kne,
      ...vne,
    };
    $[304] = K0;
    $[305] = tG;
    $[306] = cG;
    $[307] = GE;
    $[308] = sB;
    $[309] = dNe;
  } else dNe = $[309];
  let uNe = dNe;
  let iB = !Go && !isSearching;
  let mNe;
  if ($[310] !== iB || $[311] !== shadowedFooterActionHandler) {
    mNe = {
      isActive: iB,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[310] = iB;
    $[311] = shadowedFooterActionHandler;
    $[312] = mNe;
  } else mNe = $[312];
  useFooterAwareMessageActions(uNe, mNe);
  const isActive = iB && storeSelector_4 === "prompt";
  let pNe;
  if ($[313] !== isActive) {
    pNe = {
      context: "Chat",
      isActive,
    };
    $[313] = isActive;
    $[314] = pNe;
  } else pNe = $[314];
  useKeybinding(SEND_NOW_HINT_KEY, cG, pNe);
  const isActive_2 = !Go && !isSearching && !storeSelector_9 && !$n;
  let fNe;
  if ($[315] !== shadowedFooterActionHandler || $[316] !== isActive_2) {
    fNe = {
      isActive: isActive_2,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[315] = shadowedFooterActionHandler;
    $[316] = isActive_2;
    $[317] = fNe;
  } else fNe = $[317];
  useSavedModelSuccessorKey(fNe);
  const isActive_3 = !Go && !isSearching;
  let gNe;
  if ($[318] !== shadowedFooterActionHandler || $[319] !== isActive_3) {
    gNe = {
      isActive: isActive_3,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[318] = shadowedFooterActionHandler;
    $[319] = isActive_3;
    $[320] = gNe;
  } else gNe = $[320];
  let effortStepKeys = useEffortStepKeys(transcript, gNe);
  let pG;
  if ($[321] !== lP) {
    pG = {
      "chat:fastMode": lP,
    };
    $[321] = lP;
    $[322] = pG;
  } else pG = $[322];
  let isActive_4;
  if ($[323] !== Go) {
    isActive_4 = !Go && isFastModeEnabled() && isFastModeAvailable();
    $[323] = Go;
    $[324] = isActive_4;
  } else isActive_4 = $[324];
  let hNe;
  if ($[325] !== shadowedFooterActionHandler || $[326] !== isActive_4) {
    hNe = {
      isActive: isActive_4,
      footerOwnsKeyOf: shadowedFooterActionHandler,
    };
    $[325] = shadowedFooterActionHandler;
    $[326] = isActive_4;
    $[327] = hNe;
  } else hNe = $[327];
  useFooterAwareMessageActions(pG, hNe);
  let bNe;
  if ($[328] !== on) {
    bNe = () => {
      on(false);
    };
    $[328] = on;
    $[329] = bNe;
  } else bNe = $[329];
  let pP;
  if ($[330] !== $n) {
    pP = {
      context: "Help",
      isActive: $n,
    };
    $[330] = $n;
    $[331] = pP;
  } else pP = $[331];
  useKeybinding("help:dismiss", bNe, pP);
  let xne;
  if ($[332] !== addNotification || $[333] !== on) {
    xne = () => {
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
      ed(true);
      on(false);
    };
    $[332] = addNotification;
    $[333] = on;
    $[334] = xne;
  } else xne = $[334];
  let fG = xne;
  let isActive_5;
  if ($[335] !== Go) {
    isActive_5 = isFullscreenActive() && !Go;
    $[335] = Go;
    $[336] = isActive_5;
  } else isActive_5 = $[336];
  let Ane;
  if ($[337] !== isActive_5) {
    Ane = {
      context: "Global",
      isActive: isActive_5,
    };
    $[337] = isActive_5;
    $[338] = Ane;
  } else Ane = $[338];
  useKeybinding("history:search", fG, Ane);
  function ag() {
    if (jh) {
      Dd(null);
      return;
    }
    if (Uc && visibleAgentTaskCount > 0 && appState_16 > hd) {
      Ka(decrementIndex);
      return;
    }
    if (uy && appState_19 > 0) {
      Nd(decrementWorkflowIndex);
      return;
    }
    Br(tc, -1, true);
  }
  function Qg() {
    if (jh) {
      if (visibleAgentTaskCount > 0) {
        Dd("tasks");
        Ka(0);
      } else Dd("workflows");
      return;
    }
    if (Uc && visibleAgentTaskCount > 0) {
      if (appState_16 < visibleAgentTaskCount - 1) {
        Ka(incrementIndex);
        return;
      }
      Br(tc, 1);
      return;
    }
    if (Uc) {
      if (!Br(tc, 1)) {
        chrome.openBashesDialog();
        Dd(null);
      }
      return;
    }
    if (uy) {
      if (appState_19 < fa.length - 1) {
        Nd(incrementWorkflowIndex);
        return;
      }
      Br(tc, 1);
      return;
    }
    Br(tc, 1);
  }
  let mB;
  if ($[339] !== submit_2) {
    mB = (gG) => {
      submit_2(gG, NOOP_HELPERS, {
        fromKeybinding: true,
        inputModeOverride: "prompt",
        leavesIdeSelection: true,
      });
    };
    $[339] = submit_2;
    $[340] = mB;
  } else mB = $[340];
  let dispatchCommand = mB;
  let Mne;
  if (
    $[341] !== addNotification ||
    $[342] !== $l ||
    $[343] !== submit_2 ||
    $[344] !== removeNotification ||
    $[345] !== appStoreDirect
  ) {
    Mne = function F_() {
      if (isRemoteSessionAvailable()) {
        let { frameUrls } = appStoreDirect.getState();
        let pB = visibleArtifactFrames(frameUrls);
        if (pB.length > 1) {
          pd(true);
          return;
        }
        let wNe = liveFramesForSlug(frameUrls, pB[0]?.slug);
        if (wNe !== undefined)
          openArtifactRow(
            wNe,
            appStoreDirect,
            {
              addNotification,
              removeNotification,
            },
            $l,
          );
        return;
      }
      submit_2("/artifacts", NOOP_HELPERS, {
        fromKeybinding: true,
        inputModeOverride: "prompt",
      });
    };
    $[341] = addNotification;
    $[342] = $l;
    $[343] = submit_2;
    $[344] = removeNotification;
    $[345] = appStoreDirect;
    $[346] = Mne;
  } else Mne = $[346];
  let F_ = Mne;
  let bG;
  if ($[347] !== appStoreDirect) {
    bG = function rv() {
      let state = appStoreDirect.getState();
      let idleTeammatesExpanded = state.idleTeammatesExpanded ?? false;
      let ZS = ((idleTeammatesExpanded ? iu.current : undefined) ?? Ku.current)[
        state.coordinatorTaskIndex - 1
      ];
      if (ZS === undefined) {
        return;
      }
      let visibleBackgroundTasks = getVisibleBackgroundTasks(
        state.tasks,
        state.taskDecorations,
        state.viewingAgentTaskId,
        idleTeammatesExpanded,
      );
      let found = visibleBackgroundTasks.find((visibleBackgroundTask) => visibleBackgroundTask.id === ZS);
      if (found) {
        return found;
      }
      return visibleBackgroundTasks.some(
        (visibleBackgroundTask) =>
          isAgentRowVisible(visibleBackgroundTask) && visibleBackgroundTask.taskIds.includes(ZS),
      )
        ? "folded"
        : undefined;
    };
    $[347] = appStoreDirect;
    $[348] = bG;
  } else bG = $[348];
  let rv = bG;
  function O_() {
    Br(Hc, 1);
  }
  function lg() {
    Br(Hc, -1);
  }
  let sv;
  if (
    $[349] !== chrome ||
    $[350] !== visibleAgentTaskCount ||
    $[351] !== If ||
    $[352] !== F_ ||
    $[353] !== rv ||
    $[354] !== Dd ||
    $[355] !== setAppState ||
    $[356] !== on ||
    $[357] !== appStoreDirect
  ) {
    sv = () => {
      on(false);
      let state = appStoreDirect.getState();
      U_: switch (If() ? state.footerSelection : null) {
        case "tasks": {
          if (state.coordinatorTaskIndex >= 1) {
            let iD = rv();
            if (iD === undefined || iD === "folded") {
              break U_;
            }
            if (isAgentRowVisible(iD)) setAppState(expandIdleTeammates);
            else enterTeammateView(iD.id, setAppState);
          } else if (state.coordinatorTaskIndex === 0 && visibleAgentTaskCount > 0)
            exitTeammateView(setAppState);
          else {
            chrome.openBashesDialog();
            Dd(null);
          }
          break U_;
        }
        case "workflows": {
          let Ene = runningWorkflowTasks(state.tasks)[state.workflowFooterIndex];
          if (Ene) {
            logFeatureOk("workflow_progress_preview");
            setAppState((vG) =>
              vG.workflowDetail?.taskId === Ene.id
                ? vG
                : {
                    ...vG,
                    workflowDetail: {
                      taskId: Ene.id,
                    },
                  },
            );
            Dd(null);
          }
          break U_;
        }
        case "bagel": {
          break U_;
        }
        case "bridge": {
          RemoteControlPill(appStoreDirect.getState());
          pi(true);
          Dd(null);
          break U_;
        }
        case "frame": {
          F_();
          Dd(null);
        }
      }
    };
    $[349] = chrome;
    $[350] = visibleAgentTaskCount;
    $[351] = If;
    $[352] = F_;
    $[353] = rv;
    $[354] = Dd;
    $[355] = setAppState;
    $[356] = on;
    $[357] = appStoreDirect;
    $[358] = sv;
  } else sv = $[358];
  let kB;
  if (
    $[359] !== $r ||
    $[360] !== $n ||
    $[361] !== appState_18 ||
    $[362] !== Dd ||
    $[363] !== setAppState ||
    $[364] !== on ||
    $[365] !== appStoreDirect ||
    $[366] !== appState_17 ||
    $[367] !== appState_3 ||
    $[368] !== Uc ||
    $[369] !== appState_9
  ) {
    kB = () => {
      if (Uc && appState_18) {
        let visibleBackgroundTasks = getVisibleBackgroundTasks(appState_3, appState_17, appState_9, true);
        setAppState(collapseIdleTeammates);
        if (hasFoldedIdleTeammates(visibleBackgroundTasks, appState_9)) {
          return;
        }
      }
      dismissPromptOverlay({
        store: appStoreDirect,
        clearQueueSelection: $r,
        helpOpen: $n,
        setHelpOpen: on,
      });
      Dd(null);
    };
    $[359] = $r;
    $[360] = $n;
    $[361] = appState_18;
    $[362] = Dd;
    $[363] = setAppState;
    $[364] = on;
    $[365] = appStoreDirect;
    $[366] = appState_17;
    $[367] = appState_3;
    $[368] = Uc;
    $[369] = appState_9;
    $[370] = kB;
  } else kB = $[370];
  let kw;
  if (
    $[371] !== If ||
    $[372] !== keybindingContext ||
    $[373] !== hd ||
    $[374] !== rv ||
    $[375] !== session ||
    $[376] !== setAppState ||
    $[377] !== Ka ||
    $[378] !== storageV5 ||
    $[379] !== appStoreDirect ||
    $[380] !== setVoiceState
  ) {
    kw = () => {
      let state = appStoreDirect.getState();
      let footerSelection = If() ? state.footerSelection : null;
      if (footerSelection === "tasks" && state.coordinatorTaskIndex >= 1) {
        let W_ = rv();
        if (!W_) {
          return false;
        }
        if (W_ === "folded" || isAgentRowVisible(W_)) {
          return;
        }
        if (isViewingThisAgent(W_, state)) {
          let printableKey = getPrintableKey(keybindingContext?.singleKeyEvent() ?? null);
          if (printableKey !== null) Xo.current?.typeText(printableKey);
          return;
        }
        if (
          stopTask(W_, setVoiceState, setAppState, {
            source: "user",
            session,
            storageV5,
          }) === "dismissed"
        )
          Ka((vNe) => Math.max(hd, vNe - 1));
        return;
      }
      if (footerSelection === "workflows") {
        let One = runningWorkflowTasks(state.tasks)[state.workflowFooterIndex];
        if (!One) {
          return false;
        }
        stopWorkflowTask({
          taskId: One.id,
          taskStatus: One.status,
          taskRegistry: setVoiceState,
          setAppState,
        });
        return;
      }
      return false;
    };
    $[371] = If;
    $[372] = keybindingContext;
    $[373] = hd;
    $[374] = rv;
    $[375] = session;
    $[376] = setAppState;
    $[377] = Ka;
    $[378] = storageV5;
    $[379] = appStoreDirect;
    $[380] = setVoiceState;
    $[381] = kw;
  } else kw = $[381];
  let dD;
  if ($[382] !== chrome || $[383] !== If || $[384] !== Dd || $[385] !== appStoreDirect) {
    dD = () => {
      if ((If() ? appStoreDirect.getState().footerSelection : null) === "ideSelection") {
        chrome.dismissIdeSelection();
        Dd(null);
        return;
      }
      return false;
    };
    $[382] = chrome;
    $[383] = If;
    $[384] = Dd;
    $[385] = appStoreDirect;
    $[386] = dD;
  } else dD = $[386];
  let Nne;
  if (
    $[387] !== Qg ||
    $[388] !== O_ ||
    $[389] !== lg ||
    $[390] !== ag ||
    $[391] !== sv ||
    $[392] !== kB ||
    $[393] !== kw ||
    $[394] !== dD
  ) {
    Nne = {
      "footer:up": ag,
      "footer:down": Qg,
      "footer:next": O_,
      "footer:previous": lg,
      "footer:openSelected": sv,
      "footer:clearSelection": kB,
      "footer:close": kw,
      "footer:dismiss": dD,
    };
    $[387] = Qg;
    $[388] = O_;
    $[389] = lg;
    $[390] = ag;
    $[391] = sv;
    $[392] = kB;
    $[393] = kw;
    $[394] = dD;
    $[395] = Nne;
  } else Nne = $[395];
  const isActive_6 = !!yl && !Go;
  let TG;
  if ($[396] !== isActive_6) {
    TG = {
      context: "Footer",
      isActive: isActive_6,
    };
    $[396] = isActive_6;
    $[397] = TG;
  } else TG = $[397];
  MessageActionsKeybindings(Nne, TG);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let cooldown = useFastModeCooldownActive();
  let CNe;
  if ($[398] !== cooldown || $[399] !== appState_13 || $[400] !== mainLoopModel) {
    CNe = () => isFastModeOnForRequestModel(appState_13, cooldown, mainLoopModel);
    $[398] = cooldown;
    $[399] = appState_13;
    $[400] = mainLoopModel;
    $[401] = CNe;
  } else CNe = $[401];
  let CB = yt(onFastRejectedFallbackModelsChanged, CNe);
  let showFastIconHint = useShowFastIconHint(CB ?? false);
  let j_;
  if (
    $[402] !== cooldown ||
    $[403] !== isScreenReaderEnabled ||
    $[404] !== CB ||
    $[405] !== showFastIconHint
  ) {
    j_ = CB
      ? isScreenReaderEnabled
        ? cooldown
          ? "fast mode (cooling down)"
          : "fast mode"
        : showFastIconHint
          ? `${getFastIconString(true, cooldown)} ${sequential.reset.dim("/fast")}`
          : getFastIconString(true, cooldown)
      : undefined;
    $[402] = cooldown;
    $[403] = isScreenReaderEnabled;
    $[404] = CB;
    $[405] = showFastIconHint;
    $[406] = j_;
  } else j_ = $[406];
  let tb = j_;
  let cD = isEffortIndicatorShown(queuedMessageText, mainLoopModel, Hs);
  let _Ne = cD;
  let statusField = useStatusField("sentEffort");
  let statusField_2 = useStatusField("turnEffort");
  let TB;
  if ($[407] !== Hs || $[408] !== mainLoopModel || $[409] !== appState_14) {
    TB = !Hs && isUltracodeActive(appState_14, mainLoopModel);
    $[407] = Hs;
    $[408] = mainLoopModel;
    $[409] = appState_14;
    $[410] = TB;
  } else TB = $[410];
  let nf = TB;
  let zg = yt(onRefusalSettingsChange, noopOutputHandler);
  let options = useUltracodeShimmer(nf && !isScreenReaderEnabled);
  let ultraEffortTag;
  let topBorderText;
  if ($[411] !== tb || $[412] !== zg || $[413] !== options || $[414] !== nf) {
    let Hne = treeify(nf, options);
    ultraEffortTag = Hne;
    topBorderText = buildBorderText([Hne, tb, zg]);
    $[411] = tb;
    $[412] = zg;
    $[413] = options;
    $[414] = nf;
    $[415] = ultraEffortTag;
    $[416] = topBorderText;
  } else {
    ultraEffortTag = $[415];
    topBorderText = $[416];
  }
  let fP;
  if ($[417] !== ultraEffortTag || $[418] !== topBorderText) {
    fP = {
      ultraEffortTag,
      topBorderText,
    };
    $[417] = ultraEffortTag;
    $[418] = topBorderText;
    $[419] = fP;
  } else fP = $[419];
  let { ultraEffortTag: ultraEffortTag_2, topBorderText: topBorderText_2 } = fP;
  let q_ = effortStatusText(cD, nf, isScreenReaderEnabled, false, _Ne);
  let gP =
    statusField !== null &&
    statusField_2 === null &&
    statusField !== cD &&
    modelSupportsPerTurnEffortControl(mainLoopModel);
  let $_ = effortStatusText(cD, nf, isScreenReaderEnabled, gP, _Ne);
  let RNe;
  if (
    $[420] !== addNotification ||
    $[421] !== gP ||
    $[422] !== $_ ||
    $[423] !== removeNotification ||
    $[424] !== appStoreDirect
  ) {
    RNe = () => {
      let { current: IAt, queue } = appStoreDirect.getState().notifications;
      let any = [IAt, ...queue].some(isEffortLevelNotice);
      if (!gP) removeNotification(EFFORT_LEVEL_KEY);
      else if (any && $_) {
        removeNotification(EFFORT_LEVEL_KEY);
        addNotification({
          key: EFFORT_LEVEL_KEY,
          kind: "feedback",
          text: $_,
          priority: "high",
          timeoutMs: 1e4,
        });
      }
    };
    $[420] = addNotification;
    $[421] = gP;
    $[422] = $_;
    $[423] = removeNotification;
    $[424] = appStoreDirect;
    $[425] = RNe;
  } else RNe = $[425];
  let Wne;
  if (
    $[426] !== addNotification ||
    $[427] !== gP ||
    $[428] !== removeNotification ||
    $[429] !== appStoreDirect
  ) {
    Wne = [gP, appStoreDirect, addNotification, removeNotification];
    $[426] = addNotification;
    $[427] = gP;
    $[428] = removeNotification;
    $[429] = appStoreDirect;
    $[430] = Wne;
  } else Wne = $[430];
  P(RNe, Wne);
  let PNe;
  if ($[431] !== addNotification || $[432] !== q_ || $[433] !== $_ || $[434] !== removeNotification) {
    PNe = () => {
      if (!q_) {
        removeNotification(EFFORT_LEVEL_KEY);
        return;
      }
      removeNotification(EFFORT_LEVEL_KEY);
      addNotification({
        key: EFFORT_LEVEL_KEY,
        kind: "feedback",
        text: $_ ?? q_,
        priority: "high",
        timeoutMs: 1e4,
      });
    };
    $[431] = addNotification;
    $[432] = q_;
    $[433] = $_;
    $[434] = removeNotification;
    $[435] = PNe;
  } else PNe = $[435];
  let hP;
  if ($[436] !== addNotification || $[437] !== q_ || $[438] !== removeNotification) {
    hP = [q_, addNotification, removeNotification];
    $[436] = addNotification;
    $[437] = q_;
    $[438] = removeNotification;
    $[439] = hP;
  } else hP = $[439];
  P(PNe, hP);
  useMaxEffortNotice(cD);
  let placeholder = WE && suggestion ? suggestion : promptInputPlaceholder;
  let xB = R(0);
  let _w;
  if (
    $[440] !== addNotification ||
    $[441] !== session ||
    $[442] !== setAppState ||
    $[443] !== storageV5 ||
    $[444] !== appStoreDirect
  ) {
    _w = async (av, PB, AB, yP, IG) => {
      let mD = false;
      let MB = false;
      if (yP !== undefined) persistEffortSetting(yP, resolveRequestedModel(av), AB, storageV5);
      clearRefusalFallbackModelLatch();
      if (isFastModeEnabled()) clearFastModeCooldown();
      recordSwitchIfChanged(session, appStoreDirect.getState(), av, "picker");
      setAppState((jne) => {
        mD = !!jne.fastMode;
        MB = isFastModeEnabled() ? isFastModeActive(av, jne.fastMode) : mD;
        return {
          ...jne,
          mainLoopModel: av,
          mainLoopModelForSession: null,
          ...(yP !== undefined && {
            sessionEffort: levelEffortSetting(yP),
          }),
          ...(MB !== mD && {
            fastMode: MB,
          }),
        };
      });
      reportFastModeToggle(mD, MB);
      let IB = AB ? await setDefaultModel(av, storageV5) : null;
      let ANe = IB?.kind === "failed";
      if (IG !== xB.current) {
        return ANe;
      }
      let G_ = `Model set to ${modelDisplayString(av)}${IB?.kind === "saved" ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
      G_ = G_ + formatFastModeSuffix(mD, MB, av);
      G_ = G_ + describeDefaultSaved(IB);
      if (PB.length > 0) G_ = G_ + ` \xB7 ${PB.map(sanitizeHookText).join(" \xB7 ")}`;
      addNotification({
        key: "model-switched",
        kind: "feedback",
        segments: [
          {
            text: G_,
          },
        ],
        priority: "immediate",
        timeoutMs: IB === null || IB.kind === "saved" ? 3000 : undefined,
      });
      logEvent("tengu_model_picker_hotkey", {
        model: telemetrySafeModelName(av),
      });
      return ANe;
    };
    $[440] = addNotification;
    $[441] = session;
    $[442] = setAppState;
    $[443] = storageV5;
    $[444] = appStoreDirect;
    $[445] = _w;
  } else _w = $[445];
  let fD = _w;
  let DB = R(false);
  let NB;
  if (
    $[446] !== addNotification ||
    $[447] !== fD ||
    $[448] !== session ||
    $[449] !== setAppState ||
    $[450] !== storageV5 ||
    $[451] !== appStoreDirect
  ) {
    NB = (lv, qne) => {
      let MNe = DB.current;
      DB.current = false;
      let gD = (xB.current = xB.current + 1);
      Ya(false);
      serializeModelSwitch(session, () =>
        runPreModelSwitchHooks(session, appStoreDirect.getState, lv, "picker"),
      )
        .then((Q_) => {
          if (gD !== xB.current) {
            return;
          }
          if (Q_.decision !== "proceed") {
            logFeatureSad("model_switch", "blocked_by_hook");
            addNotification({
              key: "model-switch-blocked",
              kind: "warning",
              text: preModelSwitchBlockedMessage(
                lv,
                Q_.decision === "ask"
                  ? `${Q_.reason ?? "confirmation required"} (use /model to confirm)`
                  : Q_.reason,
                Q_.messages,
              ),
              color: "warning",
              priority: "immediate",
            });
            return;
          }
          if (!MNe) {
            return fD(lv, Q_.messages, false, qne, gD).then(noopReplyHandler);
          }
          let $ne = effectiveModelForContext(appStoreDirect.getState());
          return savedModelPickReply(
            lv,
            {
              getAppState: appStoreDirect.getState,
              setAppState,
              session,
              storageV5,
              options: {
                mcpClients: [],
              },
            },
            () => fD(lv, Q_.messages, true, qne, gD).then(unsavedTextState),
            {
              persistsOffBox: isNotOffBox,
              isSuperseded: () => gD !== xB.current,
              hasModelMoved: () => effectiveModelForContext(appStoreDirect.getState()) !== $ne,
            },
          ).then((FB) => {
            let { text, isRefusal, rewrittenTo } = FB;
            if (gD !== xB.current) {
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
    $[447] = fD;
    $[448] = session;
    $[449] = setAppState;
    $[450] = storageV5;
    $[451] = appStoreDirect;
    $[452] = NB;
  } else NB = $[452];
  let onSelect = NB;
  let FB;
  if ($[453] === MEMO_CACHE_SENTINEL) {
    FB = () => {
      DB.current = false;
      Ya(false);
    };
    $[453] = FB;
  } else FB = $[453];
  let onCancel = FB;
  let EG;
  if ($[454] !== appState_11 || $[455] !== appState_10) {
    EG = useMainLoopModel({
      mainLoopModel: appState_10,
      mainLoopModelForSession: appState_11,
    });
    $[454] = appState_11;
    $[455] = appState_10;
    $[456] = EG;
  } else EG = $[456];
  let SD = EG;
  let fastModeOnForModel = useFastModeOnForModel(appState_13, SD);
  let $B;
  ONe: {
    if (!js) {
      $B = null;
      break ONe;
    }
    let onSetDefault;
    if ($[457] === MEMO_CACHE_SENTINEL) {
      onSetDefault = (Kne) => {
        if (hasLadderForSetting(Kne)) {
          return;
        }
        DB.current = true;
      };
      $[457] = onSetDefault;
    } else onSetDefault = $[457];
    let showFastModeNotice;
    if ($[458] !== fastModeOnForModel || $[459] !== SD) {
      showFastModeNotice =
        isFastModeEnabled() && fastModeOnForModel && supportsFastMode(SD) && isFastModeAvailable();
      $[458] = fastModeOnForModel;
      $[459] = SD;
      $[460] = showFastModeNotice;
    } else showFastModeNotice = $[460];
    let nb;
    if (
      $[461] !== onSelect ||
      $[462] !== appState_11 ||
      $[463] !== appState_10 ||
      $[464] !== showFastModeNotice
    ) {
      nb = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(ModelPicker, {
          initial: appState_10,
          sessionModel: appState_11,
          onSelect,
          onSetDefault,
          onCancel,
          isStandaloneCommand: true,
          showFastModeNotice,
        }),
      });
      $[461] = onSelect;
      $[462] = appState_11;
      $[463] = appState_10;
      $[464] = showFastModeNotice;
      $[465] = nb;
    } else nb = $[465];
    $B = nb;
  }
  let Gne = $B;
  let SP;
  if ($[466] !== addNotification) {
    SP = (NG) => {
      ga(null);
      if (NG)
        addNotification({
          key: "fast-mode-toggled",
          kind: "feedback",
          segments: [
            {
              text: boldDirectMemberMessage(NG),
            },
          ],
          priority: "immediate",
          timeoutMs: 3000,
        });
    };
    $[466] = addNotification;
    $[467] = SP;
  } else SP = $[467];
  let onDone = SP;
  let uv;
  NNe: {
    if (!_d) {
      uv = null;
      break NNe;
    }
    let nb;
    if ($[468] !== _d.unavailableReason || $[469] !== onDone || $[470] !== storageV5) {
      nb = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(FastModePicker, {
          onDone,
          unavailableReason: _d.unavailableReason,
          storageV5,
        }),
      });
      $[468] = _d.unavailableReason;
      $[469] = onDone;
      $[470] = storageV5;
      $[471] = nb;
    } else nb = $[471];
    uv = nb;
  }
  let Qne = uv;
  let nb;
  if ($[472] !== addNotification || $[473] !== setAppState) {
    nb = (Yg) => {
      setAppState((Jg) => ({
        ...Jg,
        thinkingEnabled: Yg,
      }));
      rg(false);
      getRemoteCaps()
        ?.sendControlRequest({
          subtype: "set_max_thinking_tokens",
          max_thinking_tokens: Yg ? null : 0,
        })
        .catch(logSetMaxThinkingTokensFailure);
      logEvent("tengu_thinking_toggled_hotkey", {
        enabled: Yg,
      });
      logFeatureOk("thinking_toggle");
      addNotification({
        key: "thinking-toggled-hotkey",
        kind: "feedback",
        text: `Thinking ${Yg ? "on" : "off"}`,
        row1Hint: `thinking ${Yg ? "on" : "off"}`,
        ...(Yg && {
          color: "suggestion",
        }),
        priority: "immediate",
        timeoutMs: 3000,
      });
    };
    $[472] = addNotification;
    $[473] = setAppState;
    $[474] = nb;
  } else nb = $[474];
  let onSelect_2 = nb;
  let Xg;
  if ($[475] === MEMO_CACHE_SENTINEL) {
    Xg = () => {
      rg(false);
    };
    $[475] = Xg;
  } else Xg = $[475];
  let onCancel_2 = Xg;
  let wP;
  UJo: {
    if (!du) {
      wP = null;
      break UJo;
    }
    const currentValue = appState_12 ?? true;
    let GB;
    if ($[476] !== onSelect_2 || $[477] !== isMidConversation || $[478] !== currentValue) {
      GB = jsxProd_default(Box, {
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
      $[479] = GB;
    } else GB = $[479];
    wP = GB;
  }
  let LNe = wP;
  let wD;
  if ($[480] !== Yd || $[481] !== onAccept || $[482] !== eG) {
    wD = Yd
      ? jsxProd_default(AutoModeEnvOnboardingDialog, {
          onAccept,
          onLater: eG,
          onDismiss: eG,
        })
      : null;
    $[480] = Yd;
    $[481] = onAccept;
    $[482] = eG;
    $[483] = wD;
  } else wD = $[483];
  let FNe = wD;
  useFullscreenDialogSlot(isFullscreen ? FNe : null);
  let ref = useFullscreenAnchor();
  let GB;
  if (
    $[484] !== storeSelector_5 ||
    $[485] !== storeSelector_4 ||
    $[486] !== viewingAgentName ||
    $[487] !== viewingAgentColor
  ) {
    GB = jsxProd_default(PromptInputModeIndicator, {
      mode: storeSelector_4,
      isLoading: storeSelector_5,
      viewingAgentName,
      viewingAgentColor,
    });
    $[484] = storeSelector_5;
    $[485] = storeSelector_4;
    $[486] = viewingAgentName;
    $[487] = viewingAgentColor;
    $[488] = GB;
  } else GB = $[488];
  let modeIndicator = GB;
  let Ym = null;
  let Jm = taskId ? appState_3[taskId] : undefined;
  if (Jm && Jm.type === "local_workflow") {
    let ky = Jm.status === "running";
    let $c;
    if ($[489] !== addNotification || $[490] !== setAppState) {
      $c = (BNe) => {
        if (BNe)
          addNotification({
            key: "workflow-save-result",
            kind: "feedback",
            text: BNe,
            priority: "high",
            timeoutMs: 8000,
          });
        setAppState(clearFooterSelection);
      };
      $[489] = addNotification;
      $[490] = setAppState;
      $[491] = $c;
    } else $c = $[491];
    let CD = $c;
    const initialPhaseIndex = appState_5?.phaseIndex;
    let onKill;
    if ($[492] !== ky || $[493] !== setVoiceState || $[494] !== Jm.id) {
      onKill = ky ? () => killWorkflowTask_2(Jm.id, setVoiceState, "user") : undefined;
      $[492] = ky;
      $[493] = setVoiceState;
      $[494] = Jm.id;
      $[495] = onKill;
    } else onKill = $[495];
    let onPause;
    if ($[496] !== ky || $[497] !== setVoiceState || $[498] !== Jm.id) {
      onPause = ky ? () => pauseWorkflowTask_2(Jm.id, setVoiceState) : undefined;
      $[496] = ky;
      $[497] = setVoiceState;
      $[498] = Jm.id;
      $[499] = onPause;
    } else onPause = $[499];
    let onResume;
    if ($[500] !== CD || $[501] !== Tc) {
      onResume = (EAt) => {
        CD();
        Tc(EAt, true, undefined, false, undefined, true);
      };
      $[500] = CD;
      $[501] = Tc;
      $[502] = onResume;
    } else onResume = $[502];
    let onSkipAgent;
    if ($[503] !== ky || $[504] !== setVoiceState || $[505] !== Jm.id) {
      onSkipAgent = ky ? (DAt) => skipWorkflowAgent_2(Jm.id, DAt, setVoiceState) : undefined;
      $[503] = ky;
      $[504] = setVoiceState;
      $[505] = Jm.id;
      $[506] = onSkipAgent;
    } else onSkipAgent = $[506];
    let onRetryAgent;
    if ($[507] !== ky || $[508] !== setVoiceState || $[509] !== Jm.id) {
      onRetryAgent = ky ? (Yne) => retryWorkflowAgent_2(Jm.id, Yne, setVoiceState) : undefined;
      $[507] = ky;
      $[508] = setVoiceState;
      $[509] = Jm.id;
      $[510] = onRetryAgent;
    } else onRetryAgent = $[510];
    let CP;
    if (
      $[511] !== CD ||
      $[512] !== initialPhaseIndex ||
      $[513] !== onKill ||
      $[514] !== onPause ||
      $[515] !== onResume ||
      $[516] !== onSkipAgent ||
      $[517] !== onRetryAgent ||
      $[518] !== Jm
    ) {
      CP = jsxProd_default(WorkflowDetailDialog_2, {
        workflow: Jm,
        initialPhaseIndex,
        onDone: CD,
        onKill,
        onPause,
        onResume,
        onSkipAgent,
        onRetryAgent,
      });
      $[511] = CD;
      $[512] = initialPhaseIndex;
      $[513] = onKill;
      $[514] = onPause;
      $[515] = onResume;
      $[516] = onSkipAgent;
      $[517] = onRetryAgent;
      $[518] = Jm;
      $[519] = CP;
    } else CP = $[519];
    Ym = CP;
  } else if (storeSelector && Oi) {
    let $c;
    if ($[520] !== chrome.closeBashesDialog) {
      $c = jsxProd_default(CloudTasksDialog, {
        onDone: chrome.closeBashesDialog,
      });
      $[520] = chrome.closeBashesDialog;
      $[521] = $c;
    } else $c = $[521];
    Ym = $c;
  } else if (storeSelector) {
    const onDone = chrome.closeBashesDialog;
    let tools;
    if ($[522] !== scope) {
      tools = scope.computeTools();
      $[522] = scope;
      $[523] = tools;
    } else tools = $[523];
    const initialDetailTaskId = typeof storeSelector === "string" ? storeSelector : undefined;
    let vy;
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
      vy = jsxProd_default(BackgroundTasksDialog, {
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
      $[532] = vy;
    } else vy = $[532];
    Ym = vy;
  } else if (isFullscreenActive() && ol) {
    let onSelect;
    if (
      $[533] !== draft ||
      $[534] !== setMode ||
      $[535] !== setCursorOffset ||
      $[536] !== setValue ||
      $[537] !== setPastedContents
    ) {
      onSelect = (OAt) => {
        let HNe = renumberPastedContents({
          display: OAt.display,
          pastedContents: OAt.pastedContents,
        });
        let modeFromInput = getModeFromInput_2(HNe.display);
        let NAt = stripModePrefix(HNe.display);
        setMode(modeFromInput);
        draft.attribute(IT, () => setValue(NAt));
        setPastedContents(HNe.pastedContents);
        setCursorOffset(NAt.length);
        ed(false);
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
      onCancel = () => ed(false);
      $[539] = onCancel;
    } else onCancel = $[539];
    let cg;
    if ($[540] !== draft.value || $[541] !== onSelect) {
      cg = jsxProd_default(HistorySearchDialog, {
        initialQuery: draft.value,
        onSelect,
        onCancel,
      });
      $[540] = draft.value;
      $[541] = onSelect;
      $[542] = cg;
    } else cg = $[542];
    Ym = cg;
  } else if (Gne) Ym = Gne;
  else if (Qne) Ym = Qne;
  else if (LNe) Ym = LNe;
  else if (effortStepKeys !== null) Ym = effortStepKeys;
  else if (qa) {
    let onDone;
    if ($[543] === MEMO_CACHE_SENTINEL) {
      onDone = () => pd(false);
      $[543] = onDone;
    } else onDone = $[543];
    let sf;
    if ($[544] !== $l) {
      sf = jsxProd_default(WizardNavigationFooter, {
        onDone,
        cloudRowCheck: $l,
      });
      $[544] = $l;
      $[545] = sf;
    } else sf = $[545];
    Ym = sf;
  } else if (as) {
    let $c;
    if ($[546] !== Dd) {
      $c = jsxProd_default(BridgeDialog, {
        onDone: () => {
          pi(false);
          Dd(null);
        },
      });
      $[546] = Dd;
      $[547] = $c;
    } else $c = $[547];
    Ym = $c;
  } else if (Si) {
    let $c;
    if ($[548] !== columns || $[549] !== storeSelector_4) {
      $c = jsxProd_default(EditorWaitNotice, {
        mode: storeSelector_4,
        columns,
      });
      $[548] = columns;
      $[549] = storeSelector_4;
      $[550] = $c;
    } else $c = $[550];
    Ym = $c;
  }
  let inputTakesFocus = Ym === null && !isSearching && !Go;
  let Jne = Ym !== null || Qm || appState_2 !== null || yl !== null;
  let $c;
  let sf;
  if ($[551] !== draft || $[552] !== Jne) {
    $c = () => {
      draft.setInputRowReplaced(Jne);
      return () => draft.setInputRowReplaced(false);
    };
    sf = [Jne, draft];
    $[551] = draft;
    $[552] = Jne;
    $[553] = $c;
    $[554] = sf;
  } else {
    $c = $[553];
    sf = $[554];
  }
  P($c, sf);
  const hidden = Ym !== null;
  let onOpenHistorySearch;
  if ($[555] !== openSearch || $[556] !== fG) {
    onOpenHistorySearch = isFullscreenActive() ? fG : openSearch;
    $[555] = openSearch;
    $[556] = fG;
    $[557] = onOpenHistorySearch;
  } else onOpenHistorySearch = $[557];
  const footerItemSelected = yl !== null;
  let Y_;
  if (
    $[558] !== Yp ||
    $[559] !== chrome ||
    $[560] !== dispatchCommand ||
    $[561] !== draft ||
    $[562] !== embedded ||
    $[563] !== onHistoryDownPastEnd ||
    $[564] !== cooldown ||
    $[565] !== tb ||
    $[566] !== shadowedFooterActionHandler ||
    $[567] !== $n ||
    $[568] !== historyFailedMatch ||
    $[569] !== historyMatch ||
    $[570] !== historyQuery ||
    $[571] !== handleKeyDown ||
    $[572] !== ideSelection ||
    $[573] !== promptChromeRows ||
    $[574] !== inputTakesFocus ||
    $[575] !== zg ||
    $[576] !== Go ||
    $[577] !== isSearching ||
    $[578] !== leftArrowGesture ||
    $[579] !== markAccepted ||
    $[580] !== modeIndicator ||
    $[581] !== Tc ||
    $[582] !== placeholder ||
    $[583] !== scope ||
    $[584] !== on ||
    $[585] !== _o ||
    $[586] !== hidden ||
    $[587] !== onOpenHistorySearch ||
    $[588] !== footerItemSelected ||
    $[589] !== takeEnter ||
    $[590] !== Pc ||
    $[591] !== topBorderText_2 ||
    $[592] !== transcript ||
    $[593] !== turn ||
    $[594] !== ultraEffortTag_2
  ) {
    Y_ = jsxProd_default(
      PromptInputMemo,
      {
        ref: Xo,
        draft,
        transcript,
        scope,
        turn,
        chrome,
        suggestionsStore: _o,
        hidden,
        inputTakesFocus,
        takePendingPastes,
        takeEnter,
        embedded,
        onSubmit: Tc,
        dispatchCommand,
        chordGestureSpent: Yp,
        markAccepted,
        isSearchingHistory: isSearching,
        historyQuery,
        historyMatch,
        historyFailedMatch,
        historySearchKeyDown: handleKeyDown,
        onOpenHistorySearch,
        helpOpen: $n,
        setHelpOpen: on,
        toggleHelp: Pc,
        isModalOverlayActive: Go,
        footerItemSelected,
        ideSelectionRidesRow1: promptChromeRows,
        footerOwnsKeyOf: shadowedFooterActionHandler,
        onHistoryDownPastEnd,
        placeholder,
        leftArrowRoute: leftArrowGesture,
        modeIndicator,
        ideSelection,
        topBorderText: topBorderText_2,
        fastModeTag: tb,
        fastModeCooldown: cooldown,
        ultraEffortTag: ultraEffortTag_2,
        internalTag: zg,
        onIsPastingChange: Gs,
        onExitMessage,
        onExpandPasteHintChange: $a,
        onExternalEditorActiveChange: na,
      },
      "editor",
    );
    $[558] = Yp;
    $[559] = chrome;
    $[560] = dispatchCommand;
    $[561] = draft;
    $[562] = embedded;
    $[563] = onHistoryDownPastEnd;
    $[564] = cooldown;
    $[565] = tb;
    $[566] = shadowedFooterActionHandler;
    $[567] = $n;
    $[568] = historyFailedMatch;
    $[569] = historyMatch;
    $[570] = historyQuery;
    $[571] = handleKeyDown;
    $[572] = ideSelection;
    $[573] = promptChromeRows;
    $[574] = inputTakesFocus;
    $[575] = zg;
    $[576] = Go;
    $[577] = isSearching;
    $[578] = leftArrowGesture;
    $[579] = markAccepted;
    $[580] = modeIndicator;
    $[581] = Tc;
    $[582] = placeholder;
    $[583] = scope;
    $[584] = on;
    $[585] = _o;
    $[586] = hidden;
    $[587] = onOpenHistorySearch;
    $[588] = footerItemSelected;
    $[589] = takeEnter;
    $[590] = Pc;
    $[591] = topBorderText_2;
    $[592] = transcript;
    $[593] = turn;
    $[594] = ultraEffortTag_2;
    $[595] = Y_;
  } else Y_ = $[595];
  let FG = Y_;
  if (Ym !== null) {
    let Cy;
    if ($[596] !== FG || $[597] !== Ym) {
      Cy = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [Ym, FG],
      });
      $[596] = FG;
      $[597] = Ym;
      $[598] = Cy;
    } else Cy = $[598];
    return Cy;
  }
  const marginTop = Hs ? 0 : 1;
  let CP;
  if ($[599] !== yl || $[600] !== onKeyDown || $[601] !== Go || $[602] !== gw) {
    CP =
      yl &&
      !Go &&
      jsxProd_default(Box, {
        tabIndex: 0,
        autoFocus: true,
        onKeyDown,
        onPaste: (event) => {
          event.preventDefault();
          gw(event);
        },
      });
    $[599] = yl;
    $[600] = onKeyDown;
    $[601] = Go;
    $[602] = gw;
    $[603] = CP;
  } else CP = $[603];
  let Xne;
  if ($[604] !== storeSelector_2 || $[605] !== Hh) {
    Xne =
      storeSelector_2 &&
      !Hh &&
      jsxProd_default(Box, {
        marginTop: 1,
        marginLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Waiting for permission\u2026",
        }),
      });
    $[604] = storeSelector_2;
    $[605] = Hh;
    $[606] = Xne;
  } else Xne = $[606];
  const UNe = !isScreenReaderEnabled && FG;
  let FAt;
  if ($[607] === MEMO_CACHE_SENTINEL) {
    FAt = jsxProd_default(StatusNoticeList, {});
    $[607] = FAt;
  } else FAt = $[607];
  const leftArrowDetachAvailable = leftArrowGesture !== undefined && !leftArrowGesture.onlyExplains && !Cn;
  const vimMode_2 = editorMode ? vimMode : undefined;
  const suppressHint = !storeSelector_3;
  let Zne;
  if (
    $[608] !== bridgeSelected ||
    $[609] !== chrome ||
    $[610] !== toolPermissionContext ||
    $[611] !== or ||
    $[612] !== hasStash ||
    $[613] !== $n ||
    $[614] !== historyFailedMatch ||
    $[615] !== historyQuery ||
    $[616] !== ideSelectionSelected ||
    $[617] !== inputTakesFocus ||
    $[618] !== Zn ||
    $[619] !== isInputWrapped ||
    $[620] !== ss ||
    $[621] !== isSearching ||
    $[622] !== proactivityStepState.collapsed ||
    $[623] !== proactivityStepState.stepped ||
    $[624] !== storeSelector_4 ||
    $[625] !== F_ ||
    $[626] !== dm ||
    $[627] !== scope ||
    $[628] !== setHistoryQuery ||
    $[629] !== ma ||
    $[630] !== _o.drawn ||
    $[631] !== leftArrowDetachAvailable ||
    $[632] !== vimMode_2 ||
    $[633] !== suppressHint ||
    $[634] !== Uc ||
    $[635] !== transcript ||
    $[636] !== turn ||
    $[637] !== verbose
  ) {
    Zne = jsxProd_default(PromptInputFooterMemo, {
      scope,
      transcript,
      turn,
      chrome,
      exitMessage: or,
      row1Hint: dm,
      leftArrowDetachAvailable,
      proactivityLevelStepped: proactivityStepState.stepped,
      proactivityPillCollapsed: proactivityStepState.collapsed,
      vimMode: vimMode_2,
      mode: storeSelector_4,
      isAutoUpdating: Zn,
      verbose,
      onChangeIsUpdating: Un,
      suggestionsStore: _o.drawn,
      inputTakesFocus,
      onSelectSuggestion,
      onHoverSuggestion,
      toolPermissionContext,
      helpOpen: $n,
      suppressHint,
      tasksSelected: Uc,
      bridgeSelected,
      ideSelectionSelected,
      isPasting: ss,
      showExpandPasteHint: ma,
      hasStash,
      isInputWrapped,
      isSearching,
      historyQuery,
      setHistoryQuery,
      historyFailedMatch,
      onOpenArtifacts: F_,
    });
    $[608] = bridgeSelected;
    $[609] = chrome;
    $[610] = toolPermissionContext;
    $[611] = or;
    $[612] = hasStash;
    $[613] = $n;
    $[614] = historyFailedMatch;
    $[615] = historyQuery;
    $[616] = ideSelectionSelected;
    $[617] = inputTakesFocus;
    $[618] = Zn;
    $[619] = isInputWrapped;
    $[620] = ss;
    $[621] = isSearching;
    $[622] = proactivityStepState.collapsed;
    $[623] = proactivityStepState.stepped;
    $[624] = storeSelector_4;
    $[625] = F_;
    $[626] = dm;
    $[627] = scope;
    $[628] = setHistoryQuery;
    $[629] = ma;
    $[630] = _o.drawn;
    $[631] = leftArrowDetachAvailable;
    $[632] = vimMode_2;
    $[633] = suppressHint;
    $[634] = Uc;
    $[635] = transcript;
    $[636] = turn;
    $[637] = verbose;
    $[638] = Zne;
  } else Zne = $[638];
  let ere;
  if ($[639] !== $l || $[640] !== frameFooterState) {
    ere = frameFooterState
      ? jsxProd_default(NoConversationsMessage, {
          cloudRowCheck: $l,
        })
      : null;
    $[639] = $l;
    $[640] = frameFooterState;
    $[641] = ere;
  } else ere = $[641];
  const VNe = isFullscreen ? null : FNe;
  let tre;
  if (
    $[642] !== Yd ||
    $[643] !== Hs ||
    $[644] !== isFullscreen ||
    $[645] !== hasStash ||
    $[646] !== storeSelector_8 ||
    $[647] !== hideLoginNotice ||
    $[648] !== Zn ||
    $[649] !== isInputWrapped ||
    $[650] !== dm?.id ||
    $[651] !== scope ||
    $[652] !== transcript ||
    $[653] !== verbose
  ) {
    tre = isFullscreen
      ? jsxProd_default(NotificationOverlay, {
          marginTop: Hs ? -2 : -1,
          height: !storeSelector_8 && !Yd ? 1 : 0,
          children: jsxProd_default(Notifications, {
            apiKeyVerification: scope.apiKeyVerification,
            hideLoginNotice,
            isAutoUpdating: Zn,
            verbose,
            transcript,
            onChangeIsUpdating: Un,
            isInputWrapped,
            hasStash,
            row1HintId: dm?.id,
          }),
        })
      : null;
    $[642] = Yd;
    $[643] = Hs;
    $[644] = isFullscreen;
    $[645] = hasStash;
    $[646] = storeSelector_8;
    $[647] = hideLoginNotice;
    $[648] = Zn;
    $[649] = isInputWrapped;
    $[650] = dm?.id;
    $[651] = scope;
    $[652] = transcript;
    $[653] = verbose;
    $[654] = tre;
  } else tre = $[654];
  const GNe = isScreenReaderEnabled && FG;
  let BAt;
  if (
    $[655] !== ref ||
    $[656] !== marginTop ||
    $[657] !== CP ||
    $[658] !== Xne ||
    $[659] !== UNe ||
    $[660] !== Zne ||
    $[661] !== ere ||
    $[662] !== VNe ||
    $[663] !== tre ||
    $[664] !== GNe
  ) {
    BAt = jsxProd_default_2(Box, {
      ref,
      flexDirection: "column",
      marginTop,
      children: [CP, Xne, UNe, FAt, Zne, ere, VNe, tre, GNe],
    });
    $[655] = ref;
    $[656] = marginTop;
    $[657] = CP;
    $[658] = Xne;
    $[659] = UNe;
    $[660] = Zne;
    $[661] = ere;
    $[662] = VNe;
    $[663] = tre;
    $[664] = GNe;
    $[665] = BAt;
  } else BAt = $[665];
  return BAt;
}
//@ chunk-18hwfzwa.js:978434-978508 placement
function hasUserOrAssistantMessage(h) {
  return h.some((x) => x.type === "user" || x.type === "assistant");
}
//@ chunk-18hwfzwa.js:978508-978565 placement
function hasAssistantMessage(h) {
  return h.some((x) => x.type === "assistant");
}
//@ chunk-18hwfzwa.js:978565-978610 placement
function hasSuggestions(h) {
  return h.suggestions.length > 0;
}
//@ chunk-18hwfzwa.js:978610-978626 placement
var PromptComposerMemo = Rh(PromptComposer);
//@ chunk-18hwfzwa.js:978626-978630 placement
init_react_production();
export { PromptComposerMemo };
