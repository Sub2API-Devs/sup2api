/**
 * components/PromptInput/PromptComposer.tsx
 *
 * 2.1.316 新增。重构后的输入框主体（编辑、补全、模式、提交）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (77)
 * attribution: placement 77
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { Oy } from "./footerGates.js";
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
import { jw, NOTIFICATION_TIMEOUT_MS, NotificationOverlay, Notifications } from "./Notifications.js";
import { useAppState, Cr, useSetAppState } from "../../state/AppState.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import { QFe } from "./_new/PromptComposer.helpers-18hw.js";
import { wt, ml, Jn } from "../../remote/remoteMode.js";
import {
  getFastModeUnavailableMessage,
  isFastModeEnabled,
  isFastModeAvailable,
  NCn,
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
  MO,
} from "../../screens/repl/PromptDraft.js";
import { Hce, JY, rW } from "../dialogs/dialogKinds.js";
import { useDialogStore, useDialogOfKind } from "../../state/dialogQueue.js";
import { useProactivityStepState, Wv } from "../ProactivityMenu.js";
import { yt, R, y, P, zt, Rh, j } from "../../../vendor/react/cjs/react.production.js";
import { onAttacherCapsChange, clearRefusalFallbackModelLatch } from "../../bootstrap/state.js";
import { Sre } from "../../screens/repl/backgroundConfirm.js";
import {
  useLeftArrowGesture,
  touchPlanModeUse,
  useSavedModelSuccessorKey,
  useFastModeCooldownActive,
} from "./promptInputState.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import { UV } from "../../context/overlayContext.js";
import { yv } from "../../screens/repl/storeHooks.js";
import { useSession } from "../../context/session.js";
import { Cg } from "../../utils/subagentStatusLine.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { Tue } from "../../hooks/useTypeahead.js";
import { van, bM, noteLinkSuppliedEdit } from "../../state/promptInputStore.js";
import { useSetVoiceState } from "../../context/voice.js";
import { Me } from "../design-system/ThemeProvider.js";
import { Nu, dg } from "../../context/QueuedMessageContext.js";
import { bWe, countVisibleTasks } from "../../utils/claudeInChrome/toolRendering.js";
import { shouldHideTasksFooter } from "../tasks/taskStatusUtils.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  FOOTER_WIDE_COLUMNS,
  shouldShowFooterStatus,
  setCwdState,
  PromptInputFooterMemo,
} from "./PromptInputFooter.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";
import { ZT, k2, visibleArtifactFrames, BO, openArtifactRow } from "../artifacts/artifactFrames.js";
import { useCommandQueue } from "../Messages.js";
import { wuo, aue } from "../../commands/model/model.js";
import { vuo, ModelPicker } from "../ModelPicker.js";
import {
  getViewedTeammateTask_2 as getViewedTeammateTask_2_2,
  getActiveAgentForInput,
} from "../../state/selectors.js";
import { getActiveAgentName } from "./_new/getActiveAgentName.js";
import { AGENT_COLOR_NAMES } from "../../tools/AgentTool/agentColorManager.js";
import { primePasteIdsFromMessages, renumberPastedContents } from "../../history.js";
import {
  useVisibleAgentTaskCount,
  getVisibleBackgroundTasks,
  ou,
  remapTaskPanelIndex,
  useShadowedFooterActionHandler,
  useFooterAwareMessageActions,
  SU,
  yU,
  hU,
} from "../CoordinatorAgentStatus.js";
import { Xre } from "../../utils/transcriptDiagnostics.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { shouldOfferAutoModeEnvOnboarding, AutoModeEnvOnboardingDialog } from "../AutoModeEnvOnboarding.js";
import { runningWorkflowTasks } from "../Spinner/workflowStatus.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { sge, PromptHintRow, NJ, StatusNoticeList } from "../StatusNotices.js";
import { usePromptSuggestion, sDe } from "../../hooks/usePromptSuggestion.js";
import { useNotifications } from "../../context/notifications.js";
import { usePromptInputPlaceholder } from "./usePromptInputPlaceholder.js";
import { logEvent } from "../../services/analytics/index.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { Up, shouldPrependModeChar } from "../../utils/messageQueueManager.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { AGENT_VIEW_COMMAND_NOTICE, AgentViewCommandNotice, Jfe } from "../tasks/AgentViewCommandNotice.js";
import { di } from "../../ink/terminal.js";
import { CC } from "../../utils/kbCohesionFixes.js";
import {
  expandPastedTextRefs,
  stripInvisiblePromptChars,
  skipInvisibleCharsNotice,
} from "../../utils/promptTextSanitize.js";
import { formatInvisibleCharsRemoved } from "../../utils/invisibleChars.js";
import { jBn, nGe, logSuggestionSuppressed } from "../../services/PromptSuggestion/promptSuggestion.js";
import {
  getAutoModeConfigOrDefault,
  transitionPermissionMode,
} from "../../utils/permissions/permissionSetup.js";
import { stripModePrefix, getModeFromInput as getModeFromInput_2 } from "./inputModes.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  parseDirectMemberMessage,
  sendDirectMemberMessageAndNotify,
  hA,
} from "../../utils/directMemberMessage.js";
import { writeToMailbox } from "../../utils/teammateMailbox.js";
import { QIo } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { scanDirectory } from "../../utils/suggestions/directoryCompletion.js";
import {
  recordSuggestionOutcome,
  logPromptSuggestionBackOff,
  BACK_OFF_NOTICE_PARTS,
} from "../../services/PromptSuggestion/backOff.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { cX } from "../../utils/handlePromptSubmit.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { GCo } from "../../utils/frozenMarkers.js";
import { useHistorySearch, freeze } from "../../hooks/useHistorySearch.js";
import { PASTE_THRESHOLD } from "../../utils/imagePaste.js";
import { getInsertModeEscapeRemaps } from "../../vim/operators.js";
import { queryTerminalBackground } from "../../utils/terminalProbe.js";
import { NOOP_HELPERS } from "../../hooks/useCommandKeybindings.js";
import { getThinkingCannotBeDisabledMessage } from "../../utils/thinking.js";
import { g$o } from "../../state/statusLineWidth.js";
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
import { _Un } from "../Spinner/spinnerStatus.js";
import {
  isUltracodeActive,
  modelSupportsPerTurnEffortControl,
  persistEffortSetting,
  levelEffortSetting,
} from "../../utils/effort.js";
import { kUo } from "../../services/api/responseDiagnostics.js";
import { buildBorderText } from "./PromptInput.js";
import { zE, serializeModelSwitch, bk, useMainLoopModel } from "../../utils/model/modelSwitchHooks.js";
import {
  setDefaultModel,
  describeDefaultSaved,
  Nf,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
} from "../../commands/model/modelSwitch.js";
import { modelDisplayString } from "../../utils/model/model.js";
import { SAVED_AS_DEFAULT_SUFFIX } from "../../commands/model/modelMessages.js";
import { formatFastModeSuffix, FastModePicker } from "../../commands/fast/fast.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { savedModelPickReply } from "../../commands/config/configShorthand.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { lue } from "../../utils/model/modelUnavailability.js";
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
import { Kbe } from "./promptText.js";
import { NoConversationsMessage } from "../../screens/ResumeConversation.js";

//@ chunk-18hwfzwa.js:770563-770990 placement = ConfirmRemoveTag (0.165)
function ConfirmRemoveTag(t0) {
  let ke = w(8),
    { title: title, confirmLabel: confirmLabel, onConfirm: onConfirm, onCancel: onCancel } = t0,
    Re;
  if (ke[0] !== confirmLabel || ke[1] !== onCancel || ke[2] !== onConfirm)
    ((Re = e(ConfirmSelect, {
      cancelFirst: !0,
      focus: "cancel",
      hideIndexes: !0,
      confirmLabel: confirmLabel,
      cancelLabel: "Cancel",
      onConfirm: onConfirm,
      onCancel: onCancel,
    })),
      (ke[0] = confirmLabel),
      (ke[1] = onCancel),
      (ke[2] = onConfirm),
      (ke[3] = Re));
  else Re = ke[3];
  let Be;
  if (ke[4] !== onCancel || ke[5] !== Re || ke[6] !== title)
    ((Be = e(Dialog, { title: title, onCancel: onCancel, children: Re })),
      (ke[4] = onCancel),
      (ke[5] = Re),
      (ke[6] = title),
      (ke[7] = Be));
  else Be = ke[7];
  return Be;
}
/**
 * "Save and close editor to continue..." 等待提示（外部编辑器打开期间显示），可上下加分隔线。
 */
//@ chunk-18hwfzwa.js:920094-920856 placement = CompanionSprite (0.359)
function EditorWaitNotice(h) {
  let $ = w(15),
    { mode: mode, columns: columns } = h,
    setAppState = useIsScreenReaderEnabled(),
    companion = Oy(),
    Re;
  if ($[0] !== companion || $[1] !== setAppState || $[2] !== mode)
    ((Re = companion ? {} : getEditorWaitBorderStyle(mode, setAppState)),
      ($[0] = companion),
      ($[1] = setAppState),
      ($[2] = mode),
      ($[3] = Re));
  else Re = $[3];
  let Be;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((Be = e(Text, { dimColor: !0, italic: !0, children: "Save and close editor to continue..." })),
      ($[4] = Be));
  else Be = $[4];
  let He;
  if ($[5] !== Re)
    ((He = e(Box, {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      ...Re,
      width: "100%",
      children: Be,
    })),
      ($[5] = Re),
      ($[6] = He));
  else He = $[6];
  let We = He;
  if (!companion) {
    return We;
  }
  let ze;
  if ($[7] !== columns) ((ze = e(Divider, { width: columns })), ($[7] = columns), ($[8] = ze));
  else ze = $[8];
  let Xe;
  if ($[9] !== columns) ((Xe = e(Divider, { width: columns })), ($[9] = columns), ($[10] = Xe));
  else Xe = $[10];
  let rt;
  if ($[11] !== We || $[12] !== ze || $[13] !== Xe)
    ((rt = r(Fragment, { children: [ze, We, Xe] })), ($[11] = We), ($[12] = ze), ($[13] = Xe), ($[14] = rt));
  else rt = $[14];
  return rt;
}
//@ chunk-18hwfzwa.js:927945-928268 placement
function usePromptChromeRows({ scope: scope, chrome: chrome, rowsDrawn: rowsDrawn }) {
  let L = Oy(),
    ee = jw(
      scope.initialMcpClients,
      useAppState((He) => He.mcp.clients),
    ),
    ke = useStoreSelector(chrome, (He) => He.ideSelection),
    Re = useAppState((He) => He.viewingAgentTaskId !== void 0);
  if (!L) return !1;
  let Be = useIdeConnectionStatus(ee);
  return QFe(
    {
      ideStatus: Be.status,
      ideName: Be.ideName,
      isRemoteWorkspace: wt(),
      isViewingAgent: Re,
      ideSelection: ke,
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
function duo(QNe) {
  return QNe.queueEditIndex === null ? QNe : { ...QNe, queueEditIndex: null };
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
    (XB.replBridgeError !== void 0 && !XB.replBridgeOutboundOnly) ||
    (XB.replBridgeConnected &&
      !XB.replBridgeOutboundOnly &&
      (XB.replBridgeExplicit || XB.replBridgeReconnecting))
  );
}
//@ chunk-18hwfzwa.js:929188-929215 placement
function fuo(J9s) {
  return !1;
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
function selectIsBriefOnly_2(iXo) {
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
function selectUltracode(uXo) {
  return uXo.ultracode;
}
//@ chunk-18hwfzwa.js:929617-929652 placement
function _uo() {
  return { inFlight: !1 };
}
//@ chunk-18hwfzwa.js:929652-929702 placement
function selectCoordinatorTaskIndex2(mXo) {
  return mXo.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:929702-929747 placement
function selectTaskDecorations(pXo) {
  return pXo.taskDecorations;
}
//@ chunk-18hwfzwa.js:929747-929802 placement
function xuo(fXo) {
  return fXo.idleTeammatesExpanded ?? !1;
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
function Iuo(HAt) {
  return HAt.suggestions.length > 0 || !!HAt.suggestionsEmptyMessage;
}
//@ chunk-18hwfzwa.js:929997-930031 placement
function Euo(bXo) {
  return !E9e[bXo];
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
function Luo(CXo) {
  return !CXo;
}
//@ chunk-18hwfzwa.js:930186-930265 placement
function Fuo(zNe) {
  return zNe.hasSeenTasksHint ? zNe : { ...zNe, hasSeenTasksHint: !0 };
}
//@ chunk-18hwfzwa.js:930265-930296 placement
function Buo(TXo) {
  return TXo + 1;
}
//@ chunk-18hwfzwa.js:930296-930340 placement = _temp (1)
function Huo(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:930395-930411 placement
function Wuo() {}
//@ chunk-18hwfzwa.js:930411-930444 placement
function juo(X9s, PXo) {
  return PXo;
}
//@ chunk-18hwfzwa.js:930444-930460 placement
function quo() {}
//@ chunk-18hwfzwa.js:930460-930527 placement
function $uo(IXo) {
  return { ...IXo, promptSuggestion: { status: "empty" } };
}
//@ chunk-18hwfzwa.js:930527-930558 placement
function Vuo(EXo) {
  return EXo + 1;
}
//@ chunk-18hwfzwa.js:930558-930587 placement
function Kuo(DXo) {
  return !DXo;
}
//@ chunk-18hwfzwa.js:930587-930646 placement
function Guo(OXo) {
  return OXo ? null : { unavailableReason: getFastModeUnavailableMessage() };
}
//@ chunk-18hwfzwa.js:930646-930675 placement
function Quo(NXo) {
  return !NXo;
}
//@ chunk-18hwfzwa.js:930675-930723 placement
function zuo(WAt) {
  return WAt.show ? { show: !1 } : WAt;
}
//@ chunk-18hwfzwa.js:930723-930739 placement
function Yuo() {}
//@ chunk-18hwfzwa.js:930739-930763 placement
function Juo() {
  return !1;
}
//@ chunk-18hwfzwa.js:930763-930854 placement
function Xuo(LXo) {
  return { ...LXo, initialMessage: { message: createUserMessage({ content: "/auto-mode-setup" }) } };
}
//@ chunk-18hwfzwa.js:930854-930898 placement = _temp (1)
function Zuo(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:930898-930929 placement
function emo(BXo) {
  return BXo - 1;
}
//@ chunk-18hwfzwa.js:930929-930960 placement
function tmo(HXo) {
  return HXo - 1;
}
//@ chunk-18hwfzwa.js:930960-930991 placement
function omo(UXo) {
  return UXo + 1;
}
//@ chunk-18hwfzwa.js:930991-931022 placement
function nmo(WXo) {
  return WXo + 1;
}
//@ chunk-18hwfzwa.js:931022-931111 placement
function rmo(YNe) {
  return !YNe.idleTeammatesExpanded ? YNe : { ...YNe, idleTeammatesExpanded: !1 };
}
//@ chunk-18hwfzwa.js:931111-931127 placement
function smo() {}
//@ chunk-18hwfzwa.js:931127-931166 placement
function cmo(jXo) {
  return jXo?.key === EFFORT_LEVEL_KEY;
}
//@ chunk-18hwfzwa.js:931166-931182 placement
function umo() {}
//@ chunk-18hwfzwa.js:931182-931227 placement
function gmo(qXo) {
  return qXo ? { unsaved: "" } : "";
}
//@ chunk-18hwfzwa.js:931227-931251 placement
function Cmo() {
  return !1;
}
//@ chunk-18hwfzwa.js:931251-931322 placement
function _mo($Xo) {
  logForDebugging(`[remote] set_max_thinking_tokens failed: ${$Xo}`);
}
//@ chunk-18hwfzwa.js:931322-931459 placement
function clearFooterSelection(ore) {
  return ore.workflowDetail === void 0 && ore.footerSelection === null
    ? ore
    : { ...ore, workflowDetail: void 0, footerSelection: null };
}
//@ chunk-18hwfzwa.js:931459-931543 placement
var E9e = { tasks: !1, bagel: !0, bridge: !0, ideSelection: !0, workflows: !1, frame: !0 },
  D9e = 150;
//@ chunk-18hwfzwa.js:931543-931612 placement
function J3(h) {
  return h.replace(regExp_5, (x, D, L) => `[${D} #${Number(L)}]`);
}
/**
 * 2.1.316 的主输入框组件（约 47 KB）：组合草稿、vim 模式、bash/模式切换、自动补全、页脚各胶囊、排队命令、提交到主线程或代理；取代旧版 PromptInput 的大部分逻辑。
 */
//@ chunk-18hwfzwa.js:931612-978434 placement
function PromptComposer(h) {
  let $ = w(666),
    {
      turn: turn,
      transcript: transcript,
      scope: scope,
      draft: draft,
      chrome: chrome,
      gesture: gesture,
      submit: submit,
    } = h,
    He = useIsFullscreen(),
    We = Oy(),
    { submit: submit_2, submitEmpty: submitEmpty, submitToAgent: submitToAgent } = submit,
    kt = useStoreSelector(chrome, selectEmbedded),
    At = useStoreSelector(chrome, selectIdeSelection),
    It = useStoreSelector(chrome, selectBashesDialog),
    Ot = useStoreSelector(chrome, selectHasSuppressedDialogs),
    Et = useStoreSelector(chrome, selectHideLoginNotice_2),
    Dt = useStoreSelector(draft, selectIsEmpty);
  Hce(draft);
  let Lt = useDialogStore(),
    oo = useStoreSelector(draft, selectIsMultiline),
    Xt = useStoreSelector(draft, selectInputMode),
    io = useStoreSelector(draft, selectHasStash),
    so = useStoreSelector(transcript, Iet),
    po = useStoreSelector(transcript, Eet),
    {
      setValue: setValue,
      setCursorOffset: setCursorOffset,
      setMode: setMode,
      setPastedContents: setPastedContents,
    } = draft,
    Bo = useStoreSelector(turn, selectIsLoading2),
    Ro = useStoreSelector(turn, selectIsExternalLoading2),
    Ho = useStoreSelector(turn, selectSubmitCount),
    Io = useAppState(selectToolPermissionContext),
    Wo = useProactivityStepState(),
    mn = useAppState(selectVerbose2),
    Cn = yt(onAttacherCapsChange, Sre);
  const No = useStoreSelector(chrome, selectOnDetachToCaller);
  let Yo;
  if ($[0] !== gesture || $[1] !== No || $[2] !== transcript || $[3] !== turn)
    ((Yo = { gesture: gesture, turn: turn, transcript: transcript, onDetachToCaller: No }),
      ($[0] = gesture),
      ($[1] = No),
      ($[2] = transcript),
      ($[3] = turn),
      ($[4] = Yo));
  else Yo = $[4];
  let kn = useLeftArrowGesture(Yo),
    Fn = useMainLoopModel_3(),
    bn = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    Go = UV() || bn,
    hn = yv(),
    Mn = useSession(),
    Xo = R(null),
    Sn = Cg(),
    [$n, on] = useLatestState(!1),
    [_o] = y(Tue),
    [, cn, Dn] = useLatestState(null),
    wn = Sn && hn !== "NORMAL",
    mr,
    Kn;
  if ($[5] !== draft || $[6] !== wn)
    ((mr = () => (draft.setVimEditing(wn), () => draft.setVimEditing(!1))),
      (Kn = [wn, draft]),
      ($[5] = draft),
      ($[6] = wn),
      ($[7] = mr),
      ($[8] = Kn));
  else ((mr = $[7]), (Kn = $[8]));
  P(mr, Kn);
  let Wn, Fr;
  if ($[9] !== Mn || $[10] !== Sn)
    ((Wn = () => {
      if (!Sn) van(Mn, "INSERT");
    }),
      (Fr = [Mn, Sn]),
      ($[9] = Mn),
      ($[10] = Sn),
      ($[11] = Wn),
      ($[12] = Fr));
  else ((Wn = $[11]), (Fr = $[12]));
  P(Wn, Fr);
  let [Zn, Un] = y(!1),
    dr;
  if ($[13] === MEMO_CACHE_SENTINEL) ((dr = { show: !1 }), ($[13] = dr));
  else dr = $[13];
  let [or, pr] = y(dr),
    Qn;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((Qn = (ur, Ir) => pr(ur ? { show: ur, key: Ir } : { show: !1 })), ($[14] = Qn));
  else Qn = $[14];
  let Pr = Qn,
    ts;
  if ($[15] === MEMO_CACHE_SENTINEL) ((ts = Promise.resolve()), ($[15] = ts));
  else ts = $[15];
  let Gn = R(ts),
    Ur;
  if ($[16] === MEMO_CACHE_SENTINEL) ((Ur = new Set()), ($[16] = Ur));
  else Ur = $[16];
  let Zr = R(Ur),
    wr = Cr(),
    zr = useSetAppState(),
    _r = useAppState(selectQueueEditIndex2),
    fr;
  if ($[17] !== zr) ((fr = () => zr(duo)), ($[17] = zr), ($[18] = fr));
  else fr = $[18];
  let $r = fr,
    Yr = useSetVoiceState(),
    { storageV5: storageV5 } = Me(),
    Vr = Nu(),
    ms = useAppState(selectTasks2),
    Xs = useAppState(selectRemoteBackgroundTasks2),
    Ls;
  if ($[19] !== Xs || $[20] !== ms)
    ((Ls = bWe(Xs) > 0 && !Object.values(ms).some(shouldHideTasksFooter)),
      ($[19] = Xs),
      ($[20] = ms),
      ($[21] = Ls));
  else Ls = $[21];
  let is = Ls,
    ws = Boolean(It),
    [Ci, oi] = y(ws),
    [Oi, Hi] = y(is);
  if (ws !== Ci) (oi(ws), Hi(is));
  let Zi = useAppState(selectWorkflowDetail),
    da = Zi?.taskId,
    { columns: columns } = useTerminalSize(),
    ps = useAppState(shouldShowBridgeStatus),
    xs;
  if ($[22] !== ps || $[23] !== columns || $[24] !== He || $[25] !== We)
    ((xs = (!He || We) && ps && columns >= FOOTER_WIDE_COLUMNS && isBridgeEnabled()),
      ($[22] = ps),
      ($[23] = columns),
      ($[24] = He),
      ($[25] = We),
      ($[26] = xs));
  else xs = $[26];
  let kr = xs,
    ls = useAppState(fuo),
    Ms = ZT(),
    qs = useAppState(selectTeamContext_2),
    gs = useCommandQueue(),
    es = useAppState(selectPromptSuggestion),
    ds = useAppState(selectViewingAgentTaskId_4),
    Hs = useAppState(selectIsBriefOnly_2) && !ds,
    _s = useAppState(selectMainLoopModel),
    fs = useAppState(wuo),
    ii = useAppState(selectThinkingEnabled2),
    ua = useAppState(vuo),
    La = dg(),
    Xa = useAppState(selectUltracode),
    dl = useAppState(getViewedTeammateTask_2_2),
    Vl = dl?.identity.agentName,
    Hd = useAppState(getActiveAgentName),
    Ss;
  if ($[27] !== dl)
    ((Ss = dl?.identity.color && AGENT_COLOR_NAMES.includes(dl.identity.color) ? dl.identity.color : void 0),
      ($[27] = dl),
      ($[28] = Ss));
  else Ss = $[28];
  let yi = Ss,
    Ws;
  cl: {
    if (dl) {
      let za;
      if ($[29] !== Io || $[30] !== dl.permissionMode)
        ((za = { ...Io, mode: dl.permissionMode }), ($[29] = Io), ($[30] = dl.permissionMode), ($[31] = za));
      else za = $[31];
      Ws = za;
      break cl;
    }
    Ws = Io;
  }
  let Ol = Ws,
    za;
  if ($[32] !== transcript)
    ((za = () => primePasteIdsFromMessages(transcript.getSnapshot())), ($[32] = transcript), ($[33] = za));
  else za = $[33];
  y(za);
  let [as, pi] = y(!1),
    [qa, pd] = y(!1),
    [$l] = y(_uo),
    Yi = useAppState(selectCoordinatorTaskIndex2),
    El = useAppState(selectTaskDecorations),
    Ll = useAppState(xuo),
    _c;
  if ($[34] !== zr)
    ((_c = (mc) =>
      zr((Vd) => {
        let cd = typeof mc === "function" ? mc(Vd.coordinatorTaskIndex) : mc;
        if (cd === Vd.coordinatorTaskIndex) {
          return Vd;
        }
        return { ...Vd, coordinatorTaskIndex: cd };
      })),
      ($[34] = zr),
      ($[35] = _c));
  else _c = $[35];
  let Ka = _c,
    pl = useVisibleAgentTaskCount(),
    Gl = Xre(),
    gd = Xt !== "bash" && countVisibleTasks(ms, Xs) > 0,
    hd = gd ? -1 : 0,
    bd;
  if ($[36] !== Ll || $[37] !== El || $[38] !== ms || $[39] !== ds)
    ((bd = getVisibleBackgroundTasks(ms, El, ds, Ll)),
      ($[36] = Ll),
      ($[37] = El),
      ($[38] = ms),
      ($[39] = ds),
      ($[40] = bd));
  else bd = $[40];
  let Od = bd,
    pc;
  if ($[41] !== Od) ((pc = Od.map(selectId)), ($[41] = Od), ($[42] = pc));
  else pc = $[42];
  let Kd = pc,
    ec;
  if ($[43] !== El || $[44] !== ms || $[45] !== ds || $[46] !== Od)
    ((ec = Od.some(ou) ? getVisibleBackgroundTasks(ms, El, ds, !0).map(selectId2) : void 0),
      ($[43] = El),
      ($[44] = ms),
      ($[45] = ds),
      ($[46] = Od),
      ($[47] = ec));
  else ec = $[47];
  let qu = ec,
    Ku = R(Kd),
    iu = R(qu),
    Iu,
    Am;
  if (
    $[48] !== pl ||
    $[49] !== Yi ||
    $[50] !== Ll ||
    $[51] !== hd ||
    $[52] !== Ka ||
    $[53] !== qu ||
    $[54] !== Od ||
    $[55] !== Kd
  )
    ((Iu = () => {
      let Kp = (Ll ? iu.current : void 0) ?? Ku.current;
      ((Ku.current = Kd), (iu.current = qu));
      let nl = remapTaskPanelIndex(Yi, Kp, Kd, Od);
      if (nl !== Yi) Ka(nl);
      else if (Yi >= pl) Ka(Math.max(hd, pl - 1));
      else if (Yi < hd) Ka(hd);
    }),
      (Am = [Ll, qu, Kd, Od, pl, Yi, hd, Ka]),
      ($[48] = pl),
      ($[49] = Yi),
      ($[50] = Ll),
      ($[51] = hd),
      ($[52] = Ka),
      ($[53] = qu),
      ($[54] = Od),
      ($[55] = Kd),
      ($[56] = Iu),
      ($[57] = Am));
  else ((Iu = $[56]), (Am = $[57]));
  P(Iu, Am);
  let [ss, Gs] = y(!1),
    [ma, $a] = y(!1),
    xl = useClock(),
    [Si, na] = y(!1),
    [js, Ya] = y(!1),
    tl = R(!1),
    [ol, ed] = y(!1),
    [_d, ga] = y(null),
    [du, rg] = y(!1),
    wp = useStoreSelector(turn, selectEnvOnboardingOffered),
    Wd = Io.mode === "auto",
    Rl;
  if ($[58] !== Bo || $[59] !== Wd || $[60] !== wp)
    ((Rl = wp && !Bo && Wd && shouldOfferAutoModeEnvOnboarding()),
      ($[58] = Bo),
      ($[59] = Wd),
      ($[60] = wp),
      ($[61] = Rl));
  else Rl = $[61];
  let Yd = Rl,
    Pi;
  if ($[62] !== ms) ((Pi = runningWorkflowTasks(ms)), ($[62] = ms), ($[63] = Pi));
  else Pi = $[63];
  let fa = Pi,
    sa = pl > 0 || gd,
    td = fa.length > 0 && !Gl && Xt === "prompt" && !or.show && !ss,
    Pl;
  if ($[64] !== or || $[65] !== Ms || $[66] !== ss || $[67] !== Xt)
    ((Pl = Ms && getArtifactPublishStubDir() === null && Xt === "prompt" && !or.show && !ss),
      ($[64] = or),
      ($[65] = Ms),
      ($[66] = ss),
      ($[67] = Xt),
      ($[68] = Pl));
  else Pl = $[68];
  let Ad = Pl,
    od;
  if ($[69] !== ls || $[70] !== or || $[71] !== ss || $[72] !== Xt)
    ((od = ls && Xt !== "bash" && !wt() && !or.show && !ss),
      ($[69] = ls),
      ($[70] = or),
      ($[71] = ss),
      ($[72] = Xt),
      ($[73] = od));
  else od = $[73];
  let md = od,
    vp = useStoreSelector(_o.drawn, Iuo),
    sg;
  if ($[74] !== He || $[75] !== $n || $[76] !== vp)
    ((sg = shouldShowFooterStatus({ hasSuggestionContent: vp, isFullscreen: He, helpOpen: $n })),
      ($[74] = He),
      ($[75] = $n),
      ($[76] = vp),
      ($[77] = sg));
  else sg = $[77];
  let zi = sg,
    rd;
  if ($[78] !== chrome || $[79] !== zi || $[80] !== scope)
    ((rd = { scope: scope, chrome: chrome, rowsDrawn: zi }),
      ($[78] = chrome),
      ($[79] = zi),
      ($[80] = scope),
      ($[81] = rd));
  else rd = $[81];
  let Qd = usePromptChromeRows(rd),
    zd;
  if (
    $[82] !== md ||
    $[83] !== kr ||
    $[84] !== Ad ||
    $[85] !== Qd ||
    $[86] !== zi ||
    $[87] !== sa ||
    $[88] !== td
  )
    ((zd = !zi
      ? []
      : [
          sa && "tasks",
          Ad && "frame",
          md && "bagel",
          Qd && "ideSelection",
          kr && "bridge",
          td && "workflows",
        ].filter(Boolean)),
      ($[82] = md),
      ($[83] = kr),
      ($[84] = Ad),
      ($[85] = Qd),
      ($[86] = zi),
      ($[87] = sa),
      ($[88] = td),
      ($[89] = zd));
  else zd = $[89];
  let Hc = zd,
    xc = pl > 0 || td,
    Yc;
  if ($[90] !== Hc || $[91] !== xc)
    ((Yc = xc ? Hc.filter(Euo) : Hc), ($[90] = Hc), ($[91] = xc), ($[92] = Yc));
  else Yc = $[92];
  let tc = Yc,
    Cp = useAppState(selectWorkflowFooterIndex2),
    Eu;
  if ($[93] !== zr)
    ((Eu = (Rp) =>
      zr((Fh) => {
        let cy = typeof Rp === "function" ? Rp(Fh.workflowFooterIndex) : Rp;
        if (cy === Fh.workflowFooterIndex) {
          return Fh;
        }
        return { ...Fh, workflowFooterIndex: cy };
      })),
      ($[93] = zr),
      ($[94] = Eu));
  else Eu = $[94];
  let Nd = Eu,
    Af;
  if ($[95] !== fa) ((Af = fa.map(selectId3)), ($[95] = fa), ($[96] = Af));
  else Af = $[96];
  let Du = Af,
    Va = R(Du),
    Fg,
    ns;
  if ($[97] !== Du || $[98] !== Nd || $[99] !== Cp)
    ((Fg = () => {
      let ba = Va.current;
      Va.current = Du;
      let Mi = ba[Cp];
      if (Mi !== void 0) {
        let index = Du.indexOf(Mi);
        if (index !== -1 && index !== Cp) {
          Nd(index);
          return;
        }
      }
      if (Cp >= Du.length) Nd(Math.max(0, Du.length - 1));
    }),
      (ns = [Du, Cp, Nd]),
      ($[97] = Du),
      ($[98] = Nd),
      ($[99] = Cp),
      ($[100] = Fg),
      ($[101] = ns));
  else ((Fg = $[100]), (ns = $[101]));
  P(Fg, ns);
  let Qa = useAppState(selectFooterSelection2),
    Gp = Qa === "tasks" && Xt === "bash" && Yi < 0,
    yl = Qa && Hc.includes(Qa) && !Gp ? Qa : null,
    Dc,
    Bh;
  if ($[102] !== yl || $[103] !== Qa || $[104] !== zr)
    ((Dc = () => {
      if (Qa && !yl) zr(clearFooterSelectionState);
    }),
      (Bh = [Qa, yl, zr]),
      ($[102] = yl),
      ($[103] = Qa),
      ($[104] = zr),
      ($[105] = Dc),
      ($[106] = Bh));
  else ((Dc = $[105]), (Bh = $[106]));
  P(Dc, Bh);
  let Hh = sge(We && !$n);
  const ES = yl !== null;
  let vu;
  if (
    $[107] !== or ||
    $[108] !== Ot ||
    $[109] !== ss ||
    $[110] !== Xt ||
    $[111] !== Hh ||
    $[112] !== ma ||
    $[113] !== ES
  )
    ((vu = {
      enabled: Hh,
      exitMessage: or,
      isPasting: ss,
      showExpandPasteHint: ma,
      mode: Xt,
      permissionParked: Ot,
      footerNavActive: ES,
    }),
      ($[107] = or),
      ($[108] = Ot),
      ($[109] = ss),
      ($[110] = Xt),
      ($[111] = Hh),
      ($[112] = ma),
      ($[113] = ES),
      ($[114] = vu));
  else vu = $[114];
  let dm = PromptHintRow(vu),
    Uc = yl === "tasks",
    uy = yl === "workflows",
    Wh = yl === "bridge",
    my = yl === "ideSelection",
    jh = yl !== null && !tc.includes(yl),
    Jb;
  if ($[115] !== We || $[116] !== hd || $[117] !== zr || $[118] !== Ka || $[119] !== Nd)
    ((Jb = (Im) => {
      if (
        (zr((Hg) => {
          if (Hg.footerSelection === Im) {
            return Hg;
          }
          let Zb = { ...Hg, footerSelection: Im };
          if (Im === "frame") Zb.frameOpenFailedSeen = k2(Hg);
          if (Hg.footerSelection === "tasks") Zb.idleTeammatesExpanded = !1;
          return Zb;
        }),
        Im === "tasks")
      )
        Ka(hd);
      if (Im === "workflows") Nd(0);
      if (Im !== null && !We) $a(!1);
    }),
      ($[115] = We),
      ($[116] = hd),
      ($[117] = zr),
      ($[118] = Ka),
      ($[119] = Nd),
      ($[120] = Jb));
  else Jb = $[120];
  let Dd = Jb,
    p_;
  if (
    $[121] !== pl ||
    $[122] !== yl ||
    $[123] !== fa.length ||
    $[124] !== Dd ||
    $[125] !== jh ||
    $[126] !== Ka ||
    $[127] !== Nd
  )
    ((p_ = function Br(Mf, Zd, ig) {
      let fy = ig === void 0 ? !1 : ig;
      let Fx = yl ? Mf.indexOf(yl) : -1;
      let Wk = Mf[Fx + Zd];
      if (Wk) {
        Dd(Wk);
        let Qp = Zd < 0 && !jh;
        if (Qp && Wk === "tasks" && pl > 0) Ka(pl - 1);
        if (Qp && Wk === "workflows") Nd(Math.max(0, fa.length - 1));
        return !0;
      }
      if (Zd < 0 && fy) {
        return (Dd(null), !0);
      }
      return !1;
    }),
      ($[121] = pl),
      ($[122] = yl),
      ($[123] = fa.length),
      ($[124] = Dd),
      ($[125] = jh),
      ($[126] = Ka),
      ($[127] = Nd),
      ($[128] = p_));
  else p_ = $[128];
  let Br = p_;
  const ig = !Dt;
  let Fi;
  if ($[129] !== Bo || $[130] !== ig)
    ((Fi = { hasInput: ig, isAssistantResponding: Bo }), ($[129] = Bo), ($[130] = ig), ($[131] = Fi));
  else Fi = $[131];
  let {
      suggestion: suggestion,
      markAccepted: markAccepted,
      logOutcomeAtSubmission: logOutcomeAtSubmission,
      markShown: markShown,
    } = usePromptSuggestion(Fi),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    Gu;
  if ($[132] !== so || $[133] !== Dt || $[134] !== Ho || $[135] !== Hd)
    ((Gu = { isInputEmpty: Dt, submitCount: Ho, hasMessages: so, viewingAgentName: Hd }),
      ($[132] = so),
      ($[133] = Dt),
      ($[134] = Ho),
      ($[135] = Hd),
      ($[136] = Gu));
  else Gu = $[136];
  let zp = usePromptInputPlaceholder(Gu),
    qh;
  if ($[137] !== on)
    ((qh = () => {
      (logEvent("tengu_help_toggled", {}), on(Luo));
    }),
      ($[137] = on),
      ($[138] = qh));
  else qh = $[138];
  let Pc = qh,
    Aa;
  if ($[139] !== Dd || $[140] !== storageV5 || $[141] !== tc[0])
    ((Aa = () => {
      let rl = tc[0];
      if (rl === void 0) {
        return;
      }
      if ((Dd(rl), rl === "tasks" && !getGlobalConfig().hasSeenTasksHint)) saveGlobalConfig(Fuo, storageV5);
    }),
      ($[139] = Dd),
      ($[140] = storageV5),
      ($[141] = tc[0]),
      ($[142] = Aa));
  else Aa = $[142];
  let Cl = Aa,
    _a;
  if (
    $[143] !== addNotification ||
    $[144] !== chrome ||
    $[145] !== $r ||
    $[146] !== draft ||
    $[147] !== setMode ||
    $[148] !== Vr ||
    $[149] !== Mn ||
    $[150] !== setCursorOffset ||
    $[151] !== setValue ||
    $[152] !== setPastedContents ||
    $[153] !== wr ||
    $[154] !== Sn
  )
    ((_a = () => {
      let queueEditIndex = wr.getState().queueEditIndex;
      if (queueEditIndex === null) {
        return !1;
      }
      let Cu = draft.value;
      let ew = Vr.getCommandQueue().filter(Up)[queueEditIndex];
      if (ew && !shouldPrependModeChar(ew, Cu === "")) {
        return (
          addNotification({
            key: "queue-pull-needs-empty-input",
            kind: "feedback",
            text: "Clear the input to edit this queued shell command",
            row1Hint: "clear input to edit shell command",
            priority: "immediate",
            timeoutMs: 2000,
          }),
          $r(),
          logFeatureSad("input_queue_pop_to_edit", "bash_needs_empty_draft"),
          !0
        );
      }
      let popEditableAt = Vr.popEditableAt(queueEditIndex, Cu, draft.cursorOffset, draft.pastedContents);
      if (($r(), !popEditableAt)) {
        return (logFeatureSad("input_queue_pop_to_edit", "stale_index"), !0);
      }
      if ((setValue(popEditableAt.text), popEditableAt.unpassed)) draft.markCameBack();
      if (
        (setMode(popEditableAt.mode),
        setCursorOffset(
          Sn && bM(Mn).getState().vimMode === "NORMAL"
            ? setCwdState(draft.value, popEditableAt.cursorOffset)
            : popEditableAt.cursorOffset,
        ),
        chrome.returnIdeSelection(popEditableAt.ideSelection),
        popEditableAt.images.length > 0)
      )
        setPastedContents((g_) => mergeTurnTags(g_, popEditableAt.images));
      return (logFeatureOk("input_queue_pop_to_edit"), !0);
    }),
      ($[143] = addNotification),
      ($[144] = chrome),
      ($[145] = $r),
      ($[146] = draft),
      ($[147] = setMode),
      ($[148] = Vr),
      ($[149] = Mn),
      ($[150] = setCursorOffset),
      ($[151] = setValue),
      ($[152] = setPastedContents),
      ($[153] = wr),
      ($[154] = Sn),
      ($[155] = _a));
  else _a = $[155];
  let fc = _a,
    Hx = R(null),
    gy = R(null),
    tw = R(null),
    Ux;
  if ($[156] !== removeNotification)
    ((Ux = () => () => {
      ((gy.current = null), tw.current?.close(), removeNotification(AGENT_VIEW_COMMAND_NOTICE));
    }),
      ($[156] = removeNotification),
      ($[157] = Ux));
  else Ux = $[157];
  let ow;
  if ($[158] !== removeNotification || $[159] !== ds)
    ((ow = [ds, removeNotification]), ($[158] = removeNotification), ($[159] = ds), ($[160] = ow));
  else ow = $[160];
  P(Ux, ow);
  let jg = R(!1),
    S_;
  if ($[161] === MEMO_CACHE_SENTINEL)
    ((S_ = () => {
      ((Hx.current = null), (jg.current = !1));
    }),
      ($[161] = S_));
  else S_ = $[161];
  let pu = S_,
    qx;
  if ($[162] !== draft.changedFromOutside || $[163] !== draft.value)
    ((qx = ($x) => {
      if ($x === void 0 && jg.current && draft.changedFromOutside) {
        return !0;
      }
      let C0 = Hx.current;
      if (C0 === null) {
        return !1;
      }
      return $x === "" || $x === C0 || draft.value === "" || draft.value === C0;
    }),
      ($[162] = draft.changedFromOutside),
      ($[163] = draft.value),
      ($[164] = qx));
  else qx = $[164];
  let Yp = qx,
    Vx;
  if ($[165] !== xl)
    ((Vx = (RE) => {
      ((Hx.current = RE), (jg.current = !0), xl.setTimeout(pu, 0));
    }),
      ($[165] = xl),
      ($[166] = Vx));
  else Vx = $[166];
  let qg = Vx,
    $g;
  if ($[167] !== xl)
    (($g = () => {
      ((jg.current = !0), xl.setTimeout(pu, 0));
    }),
      ($[167] = xl),
      ($[168] = $g));
  else $g = $[168];
  let OS = $g,
    xE = R(null),
    nw;
  if ($[169] === MEMO_CACHE_SENTINEL)
    ((nw = () => {
      let qk = { sameChunk: !0, at: performance.now() };
      ((xE.current = qk),
        queueMicrotask(() => {
          qk.sameChunk = !1;
        }));
    }),
      ($[169] = nw));
  else nw = $[169];
  let PE = nw,
    b_;
  if ($[170] === MEMO_CACHE_SENTINEL)
    ((b_ = () => {
      let $k = xE.current;
      return $k !== null && ($k.sameChunk || performance.now() - $k.at < D9e);
    }),
      ($[170] = b_));
  else b_ = $[170];
  let Gx = b_,
    Md;
  if ($[171] !== Hc || $[172] !== wr)
    ((Md = () => {
      let { footerSelection: footerSelection } = wr.getState();
      return footerSelection !== null && Hc.includes(footerSelection);
    }),
      ($[171] = Hc),
      ($[172] = wr),
      ($[173] = Md));
  else Md = $[173];
  let If = Md,
    fu = useShadowedFooterActionHandler(If),
    w_;
  if ($[174] === MEMO_CACHE_SENTINEL) ((w_ = () => Xo.current?.clearBuffer()), ($[174] = w_));
  else w_ = $[174];
  let Vg = w_,
    [k_, Vk] = y(0),
    NS,
    Kk;
  if ($[175] !== k_)
    ((NS = () => {
      if (k_ === 0) {
        return;
      }
      di().get(process.stdout)?.forceRedraw();
    }),
      (Kk = [k_]),
      ($[175] = k_),
      ($[176] = NS),
      ($[177] = Kk));
  else ((NS = $[176]), (Kk = $[177]));
  zt(NS, Kk);
  let C_;
  if (
    $[178] !== addNotification ||
    $[179] !== Lt ||
    $[180] !== draft ||
    $[181] !== If ||
    $[182] !== logOutcomeAtSubmission ||
    $[183] !== markAccepted ||
    $[184] !== OS ||
    $[185] !== submitToAgent ||
    $[186] !== submitEmpty ||
    $[187] !== submit_2 ||
    $[188] !== es ||
    $[189] !== fc ||
    $[190] !== removeNotification ||
    $[191] !== scope ||
    $[192] !== Mn ||
    $[193] !== setCursorOffset ||
    $[194] !== setValue ||
    $[195] !== setPastedContents ||
    $[196] !== storageV5 ||
    $[197] !== wr ||
    $[198] !== _o.own ||
    $[199] !== qs
  )
    ((C_ = async (Jp, T_, sw, hy, FS, lw, WS) => {
      let ane = T_ === void 0 ? !1 : T_;
      let Xp = hy === void 0 ? !1 : hy;
      let Qx = lw === void 0 ? !1 : lw;
      let _0 = WS === void 0 ? !1 : WS;
      let ME = Jp === "";
      let x_ = gy.current;
      if (((gy.current = null), JY(Lt.getState()))) {
        return;
      }
      let state = wr.getState();
      if (CC() && state.queueEditIndex !== null && fc()) {
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
        if (
          (noteLinkSuppliedEdit(Mn, Jp, cm.input),
          setValue(cm.input),
          setCursorOffset(cm.input.length),
          cm.pastedContents !== draft.pastedContents)
        )
          setPastedContents(cm.pastedContents);
        if (
          (addNotification({
            key: "prompt-invisible-removed",
            kind: "feedback",
            text: formatInvisibleCharsRemoved(
              cm.removed.removedTotal,
              R0 ? "empty" : P_ ? "review" : "cleaned",
            ),
            priority: "immediate",
            timeoutMs: NOTIFICATION_TIMEOUT_MS,
          }),
          Vk(Buo),
          PE(),
          P_)
        ) {
          return;
        }
        ((Jp = cm.input), (sw = cm.pastedContents), (FS = void 0));
      }
      Jp = Jp.trimEnd();
      let UK = sw ?? draft.pastedContents;
      let any = Object.values(UK).some(Huo);
      let A_ = jBn(es);
      let Zp = Jp === A_;
      if (getAutoModeConfigOrDefault().typedMarks === !0) {
        let WK = A_ === null ? "" : J3(expandPastedTextRefs(A_, {}).input.trimEnd());
        let M_ = J3(cm.input.trimEnd());
        Zp = M_ !== "" && (M_ === WK || M_ === stripModePrefix(WK));
      }
      let DE = Boolean(Zp && A_ && es.status === "accepted" && es.acceptedAt > es.shownAt);
      if (Zp && A_ && !any && !state.viewingAgentTaskId) {
        if (nGe(es)) markAccepted();
      }
      if (isAgentSwarmsEnabled()) {
        let OE = parseDirectMemberMessage(Jp);
        if (OE) {
          if (Zr.current.has(Jp)) {
            return;
          }
          if (
            (Zr.current.add(Jp),
            OS(),
            (await sendDirectMemberMessageAndNotify({
              recipientName: OE.recipientName,
              message: rW(OE.message, UK),
              teamContext: qs,
              writeToMailbox: writeToMailbox,
              storageV5: storageV5,
              addNotification: addNotification,
              clearInput: () => {
                (setValue(""), setPastedContents({}), setCursorOffset(0), Vg(), Xo.current?.resetHistory());
              },
            }).finally(() => {
              Zr.current.delete(Jp);
            })) === "handled")
          ) {
            return;
          }
        }
      }
      let jS = draft.mode === "prompt" && getActiveAgentForInput(wr.getState()).type === "leader";
      let VS = Jp;
      let yy = !1;
      if (VS.trim() === "" && !any && jS) {
        let x0 = QIo();
        if (x0 !== null) ((VS = x0), (yy = !0));
      }
      if (VS.trim() === "" && !any) {
        if (!(jS && ME && !Xp && submitEmpty())) logFeatureOk("prompt_submit_empty");
        return;
      }
      let { suggestions: suggestions } = _o.own.getState();
      let P0 = suggestions.length > 0 && suggestions.every(scanDirectory);
      if (suggestions.length > 0 && !ane && !P0) {
        logForDebugging(`[onSubmit] early return: suggestions showing (count=${suggestions.length})`);
        return;
      }
      if (nGe(es)) {
        let jK = logOutcomeAtSubmission(Jp);
        if (jK !== null) recordSuggestionOutcome(jK, storageV5, Mn.promptSuggestion);
      }
      let zx = parseSlashCommand(VS);
      let Kg = zx && findCommand(zx.commandName, scope.commands);
      let A0 = Kg?.type === "local" || Kg?.type === "local-jsx";
      if (
        jS &&
        !A0 &&
        !cX.includes(Jp.trim()) &&
        !isUnattendedBgSession() &&
        wr.getState().promptSuggestionEnabled &&
        logPromptSuggestionBackOff(storageV5)
      )
        (Mn.promptSuggestion.askOnNextTurn(),
          addNotification({
            key: "prompt-suggestion-back-off",
            kind: "hint",
            segments: BACK_OFF_NOTICE_PARTS,
            priority: "medium",
          }));
      (removeNotification("stash-hint"), Xo.current?.resetHistory());
      let Yx = getActiveAgentForInput(wr.getState());
      if (Yx.type !== "leader") {
        if (!A0) {
          (logEvent("tengu_transcript_input_to_teammate", {}),
            OS(),
            await submitToAgent(
              VS,
              Yx.task,
              { setCursorOffset: setCursorOffset, clearBuffer: Vg, resetHistory: Wuo },
              sw,
            ));
          return;
        }
        let KS =
          zx && Kg
            ? AgentViewCommandNotice(Kg, { invokedAs: zx.commandName, isTeammate: Yx.type === "viewed" })
            : void 0;
        E0: switch (KS?.onSubmit) {
          case void 0: {
            break E0;
          }
          case "block": {
            (logEvent("tengu_agent_view_leader_command_notice", {}),
              addNotification({
                key: AGENT_VIEW_COMMAND_NOTICE,
                kind: "feedback",
                segments: KS.segments,
                priority: "immediate",
                exemptFromDiffPanelHold: !0,
                fold: juo,
              }));
            return;
          }
          case "confirm": {
            let id = Yx.task.id;
            if (Jfe(x_, { input: VS, taskId: id })) {
              logEvent("tengu_agent_view_leader_command_confirmed", {});
              break E0;
            }
            if (tw.current !== null) {
              return;
            }
            logEvent("tengu_agent_view_leader_command_notice", {});
            let show = scope.localJsx.show(
              e(ConfirmRemoveTag, {
                title: KS.title,
                confirmLabel: KS.confirmLabel,
                onCancel: () => show.close(),
                onConfirm: () => {
                  (show.close(), (gy.current = { input: VS, taskId: id }), draft.submit(VS, !0));
                },
              }),
              { commandName: KS.commandName, immediate: !0, hidesPrompt: !1, retireAtTurnBoundary: !1 },
            );
            ((tw.current = show),
              show.closed.then(() => {
                if (tw.current === show) tw.current = null;
              }));
            return;
          }
        }
      }
      let zk = Xo.current?.isWorkflowKeywordSuppressed() ?? !1;
      let NE = yy || Qx ? void 0 : GCo();
      let qK =
        zk || DE || sw || yy || Xp || FS || NE || _0 || Qx
          ? {
              suppressWorkflowKeyword: zk || void 0,
              inputSource: DE ? "suggestion_accepted" : void 0,
              pastedContentsOverride: sw,
              fromKeybinding: yy || void 0,
              resumesStaleQuotaWait: yy || void 0,
              wait: Xp || void 0,
              keyboard: yy ? void 0 : FS,
              composerEnter: NE,
              sendNow: _0 || void 0,
              inputModeOverride: Qx ? "prompt" : void 0,
            }
          : void 0;
      (OS(),
        await submit_2(VS, { setCursorOffset: setCursorOffset, clearBuffer: Vg, resetHistory: quo }, qK));
    }),
      ($[178] = addNotification),
      ($[179] = Lt),
      ($[180] = draft),
      ($[181] = If),
      ($[182] = logOutcomeAtSubmission),
      ($[183] = markAccepted),
      ($[184] = OS),
      ($[185] = submitToAgent),
      ($[186] = submitEmpty),
      ($[187] = submit_2),
      ($[188] = es),
      ($[189] = fc),
      ($[190] = removeNotification),
      ($[191] = scope),
      ($[192] = Mn),
      ($[193] = setCursorOffset),
      ($[194] = setValue),
      ($[195] = setPastedContents),
      ($[196] = storageV5),
      ($[197] = wr),
      ($[198] = _o.own),
      ($[199] = qs),
      ($[200] = C_));
  else C_ = $[200];
  let Tc = C_,
    T_,
    hy;
  if ($[201] !== draft || $[202] !== Tc)
    ((T_ = () => draft.onSubmitRequest(($K, VK) => void Tc($K, VK))),
      (hy = [draft, Tc]),
      ($[201] = draft),
      ($[202] = Tc),
      ($[203] = T_),
      ($[204] = hy));
  else ((T_ = $[203]), (hy = $[204]));
  zt(T_, hy);
  let lw;
  if ($[205] !== Tc || $[206] !== setPastedContents)
    ((lw = (D0) => {
      (setPastedContents(D0.pastedContents), Tc(D0.display, !1, D0.pastedContents));
    }),
      ($[205] = Tc),
      ($[206] = setPastedContents),
      ($[207] = lw));
  else lw = $[207];
  let {
      isSearching: isSearching,
      historyQuery: historyQuery,
      setHistoryQuery: setHistoryQuery,
      historyMatch: historyMatch,
      historyFailedMatch: historyFailedMatch,
      handleKeyDown: handleKeyDown,
      openSearch: openSearch,
    } = useHistorySearch(draft, lw),
    Qm = isSearching || $n,
    WS,
    j0;
  if ($[208] !== draft || $[209] !== Qm)
    ((WS = () => (draft.setInputOverlayActive(Qm), () => draft.setInputOverlayActive(!1))),
      (j0 = [Qm, draft]),
      ($[208] = draft),
      ($[209] = Qm),
      ($[210] = WS),
      ($[211] = j0));
  else ((WS = $[210]), (j0 = $[211]));
  P(WS, j0);
  let uw;
  if ($[212] !== Dt || $[213] !== Qm || $[214] !== wn || $[215] !== Xt || $[216] !== _r || $[217] !== gs)
    ((uw =
      wn ||
      Qm ||
      Xt !== "prompt" ||
      _r !== null ||
      (!CC() && gs.some((lne) => shouldPrependModeChar(lne, Dt)))),
      ($[212] = Dt),
      ($[213] = Qm),
      ($[214] = wn),
      ($[215] = Xt),
      ($[216] = _r),
      ($[217] = gs),
      ($[218] = uw));
  else uw = $[218];
  let Xx = uw,
    KK,
    GK;
  if ($[219] !== draft || $[220] !== Xx)
    ((KK = () => (draft.setInputOwnsEscape(Xx), () => draft.setInputOwnsEscape(!1))),
      (GK = [Xx, draft]),
      ($[219] = draft),
      ($[220] = Xx),
      ($[221] = KK),
      ($[222] = GK));
  else ((KK = $[221]), (GK = $[222]));
  P(KK, GK);
  let D_ = useStoreSelector(_o.drawn, G6),
    dne = useStoreSelector(_o, G6),
    Jk;
  if ($[223] === MEMO_CACHE_SENTINEL)
    ((Jk = (HE, UE) => Xo.current?.selectSuggestion(HE, UE)), ($[223] = Jk));
  else Jk = $[223];
  let Ou = Jk,
    V0;
  if ($[224] === MEMO_CACHE_SENTINEL) ((V0 = (Zx) => Xo.current?.setHoveredSuggestion(Zx)), ($[224] = V0));
  else V0 = $[224];
  let QS = V0,
    JS;
  if ($[225] === MEMO_CACHE_SENTINEL) ((JS = []), ($[225] = JS));
  else JS = $[225];
  let Sy = R(JS),
    XS;
  if ($[226] === MEMO_CACHE_SENTINEL) ((XS = () => Sy.current.splice(0)), ($[226] = XS));
  else XS = $[226];
  let mw = XS,
    hw = function hw(jc) {
      if (
        (useComposerEscape(jc, { draft: draft, vimEnabled: Sn, vimMode: hn, helpOpen: $n, setHelpOpen: on }),
        jc.ctrl || jc.meta)
      ) {
        return;
      }
      if (Sn && hn === "NORMAL") {
        if (jc.key === "j") {
          return (jc.preventDefault(), Qg());
        }
        if (jc.key === "k") {
          return (jc.preventDefault(), ag());
        }
        if (jc.key === "l") {
          return (jc.preventDefault(), O_());
        }
        if (jc.key === "h") {
          return (jc.preventDefault(), lg());
        }
      }
      if (jc.key.length > PASTE_THRESHOLD) {
        (jc.preventDefault(), gw(jc.key));
        return;
      }
      let N_ = [...jc.key].length === 1;
      let normalized = jc.key.normalize("NFC");
      let sliced = draft.value.slice(0, draft.cursorOffset);
      let QK =
        !N_ &&
        jc.name === "" &&
        jc.key !== "" &&
        (!Sn || (hn === "INSERT" && !getInsertModeEscapeRemaps().has(normalized))) &&
        draft.value === draft.value.normalize("NFC") &&
        (sliced + normalized).normalize("NFC").length === sliced.length + normalized.length;
      if (N_ || QK) {
        if ((jc.preventDefault(), jc.key === "?" && draft.value === "")) {
          Pc();
          return;
        }
        Xo.current?.typeText(normalized);
      }
    };
  function gw(zK) {
    (Sy.current.push(zK), zr(clearFooterSelectionState));
  }
  let WE = Xt === "prompt" && !D_ && suggestion && !ds;
  if (WE) markShown();
  if (es.status === "generated" && !suggestion && !ds) (logSuggestionSuppressed("timing"), zr($uo));
  queryTerminalBackground();
  let iP;
  if ($[227] === MEMO_CACHE_SENTINEL)
    ((iP = () => {
      Vk(Vuo);
    }),
      ($[227] = iP));
  else iP = $[227];
  let L_ = iP,
    jE;
  if ($[228] !== addNotification)
    ((jE = () => {
      if (!wt()) {
        return !1;
      }
      return (
        addNotification({
          key: "remote-inference-config-unavailable",
          kind: "feedback",
          text: "Fast mode switching in cloud sessions is coming soon \u2014 set at session creation for now",
          priority: "medium",
        }),
        !0
      );
    }),
      ($[228] = addNotification),
      ($[229] = jE));
  else jE = $[229];
  let Sw = jE,
    $E;
  if (
    $[230] !== addNotification ||
    $[231] !== Ro ||
    $[232] !== Bo ||
    $[233] !== Xt ||
    $[234] !== submit_2 ||
    $[235] !== on
  )
    (($E = () => {
      if (wt()) {
        if (Bo || Ro || Xt !== "prompt" || tl.current) {
          addNotification({
            key: "remote-model-picker-unavailable",
            kind: "feedback",
            text: "Use /model to change the model in cloud sessions",
            priority: "medium",
          });
          return;
        }
        ((tl.current = !0),
          submit_2("/model", NOOP_HELPERS, { fromKeybinding: !0, inputModeOverride: "prompt" }).finally(
            () => {
              tl.current = !1;
            },
          ));
        return;
      }
      (Ya(Kuo), on(!1));
    }),
      ($[230] = addNotification),
      ($[231] = Ro),
      ($[232] = Bo),
      ($[233] = Xt),
      ($[234] = submit_2),
      ($[235] = on),
      ($[236] = $E));
  else $E = $[236];
  let K0 = $E,
    Q0;
  if ($[237] !== Sw || $[238] !== on)
    ((Q0 = () => {
      if (!ml() && Sw()) {
        return;
      }
      (ga(Guo), on(!1));
    }),
      ($[237] = Sw),
      ($[238] = on),
      ($[239] = Q0));
  else Q0 = $[239];
  let lP = Q0,
    VE;
  if ($[240] !== addNotification || $[241] !== Fn || $[242] !== Sw || $[243] !== on)
    ((VE = () => {
      if (!ml() && Sw()) {
        return;
      }
      on(!1);
      let Xk = getThinkingCannotBeDisabledMessage(Fn);
      if (Xk !== void 0) {
        addNotification({ key: "thinking-always-on", kind: "feedback", text: Xk, priority: "immediate" });
        return;
      }
      rg(Quo);
    }),
      ($[240] = addNotification),
      ($[241] = Fn),
      ($[242] = Sw),
      ($[243] = on),
      ($[244] = VE));
  else VE = $[244];
  let GE = VE,
    PAt = (cne) => {
      if (Jn() || wt()) {
        return;
      }
      let attentionBudget = wr.getState().attentionBudget;
      let z0 = g$o(attentionBudget, cne);
      if (z0 === attentionBudget) {
        return;
      }
      (zr((J0) => (J0.attentionBudget === z0 ? J0 : { ...J0, attentionBudget: z0 })),
        logEvent("tengu_attention_budget_cycle", { to: fromEnum(z0) }),
        logFeatureOk("attention_budget"));
    },
    X0;
  if (
    $[245] !== addNotification ||
    $[246] !== Mn ||
    $[247] !== zr ||
    $[248] !== on ||
    $[249] !== wp ||
    $[250] !== storageV5 ||
    $[251] !== wr ||
    $[252] !== Yr ||
    $[253] !== qs ||
    $[254] !== turn
  )
    ((X0 = (bw) => {
      let toolPermissionContext = wr.getState().toolPermissionContext;
      ($a(!1), pr(zuo));
      let YK = Wv(wr.getState()) ? getViewedTeammateTask_2_2(wr.getState()) : void 0;
      if (YK) {
        let ZOe = { ...toolPermissionContext, mode: YK.permissionMode };
        let QE = getNextPermissionMode_2(ZOe, void 0);
        (logEvent("tengu_mode_cycle", { to: fromEnum(QE), trigger: fromEnum("shift_tab") }),
          logFeatureOk("mode_switch"));
        let id = YK.id;
        if (
          (zr((Zk) => {
            let Z0 = Zk.tasks[id];
            if (!Z0 || Z0.type !== "in_process_teammate") {
              return Zk;
            }
            if (Z0.permissionMode === QE) {
              return Zk;
            }
            return {
              ...Zk,
              tasks: { ...Zk.tasks, [id]: { ...Z0, permissionMode: QE, planHeldAfterSpawn: QE === "plan" } },
            };
          }),
          QE !== "plan")
        )
          exitTeammatePlanMode(id, Yr);
        on(!1);
        return;
      }
      let ev = null ? null.currentMode : toolPermissionContext.mode;
      logForDebugging(
        `[auto-mode] handleCycleMode: currentMode=${ev} isAutoModeAvailable=${toolPermissionContext.isAutoModeAvailable}`,
      );
      let tv = null ? null.nextMode : (null ?? getNextPermissionMode_2(toolPermissionContext, qs));
      if ((null || !1) && tv === ev) {
        on(!1);
        return;
      }
      if (tv === ev) {
        if ((logFeatureBad("mode_switch", "no_other_modes"), wt()))
          addNotification({
            key: "remote-permission-mode-noop",
            kind: "feedback",
            text: "No other permission modes are available in this cloud session",
            row1Hint: "no other modes in cloud",
            priority: "medium",
          });
        on(!1);
        return;
      }
      if (wp && ev === "auto") turn.dismissEnvOnboardingOffer();
      let { context: context } =
        null ??
        (!1
          ? { context: transitionPermissionMode(ev, null, toolPermissionContext, "shift_tab") }
          : cyclePermissionMode(toolPermissionContext, qs, "shift_tab"));
      announce(`[${permissionModeIndicator(tv)} on]`);
      if ((logEvent("tengu_mode_cycle", { to: fromEnum(tv), trigger: fromEnum("shift_tab") }), !ml()))
        logFeatureOk("mode_switch");
      if (tv === "plan") logFeatureOk("mode_plan_enter");
      else if (ev === "plan") logFeatureOk("mode_plan_exit");
      if (tv === "auto") logFeatureOk("mode_auto_enter");
      if (tv === "plan" && (bw.kind === "carousel" || bw.selection.mode === "plan")) {
        let now = Date.now();
        saveGlobalConfig((mne) => touchPlanModeUse(mne, now), storageV5);
      }
      ((tabCycleState.of(Mn.host).cycled = !0),
        setToolPermissionContextAndNotify(zr, { ...context, mode: tv }),
        (Gn.current = Gn.current.then(() => syncTeammateMode(tv, qs?.teamName, storageV5))),
        on(!1));
    }),
      ($[245] = addNotification),
      ($[246] = Mn),
      ($[247] = zr),
      ($[248] = on),
      ($[249] = wp),
      ($[250] = storageV5),
      ($[251] = wr),
      ($[252] = Yr),
      ($[253] = qs),
      ($[254] = turn),
      ($[255] = X0));
  else X0 = $[255];
  let mm = X0,
    AAt = Yuo,
    pne;
  if ($[256] !== Dn || $[257] !== mm || $[258] !== cn)
    ((pne = () => {
      let JE = Dn();
      if (JE === null) {
        return !1;
      }
      return (cn(null), mm({ kind: "select", selection: JE }), !0);
    }),
      ($[256] = Dn),
      ($[257] = mm),
      ($[258] = cn),
      ($[259] = pne));
  else pne = $[259];
  let ZE = pne,
    XK = Juo,
    hne;
  if ($[260] !== zr || $[261] !== turn)
    ((hne = () => {
      if (
        (setAutoModeEnvOnboardingEligible(!1),
        turn.dismissEnvOnboardingOffer(),
        !isAutoModeSetupNotOverridden())
      ) {
        return;
      }
      zr(Xuo);
    }),
      ($[260] = zr),
      ($[261] = turn),
      ($[262] = hne));
  else hne = $[262];
  let tD = hne,
    oNe;
  if ($[263] !== turn)
    ((oNe = () => {
      (setAutoModeEnvOnboardingEligible(!1), turn.dismissEnvOnboardingOffer());
    }),
      ($[263] = turn),
      ($[264] = oNe));
  else oNe = $[264];
  let eG = oNe,
    Pp = useKeybindingContext(),
    yne;
  if (
    $[265] !== Yp ||
    $[266] !== draft.typedOnly ||
    $[267] !== draft.value ||
    $[268] !== fu ||
    $[269] !== Go ||
    $[270] !== isSearching ||
    $[271] !== Pp ||
    $[272] !== qg ||
    $[273] !== Tc
  )
    ((yne = () => {
      if (!Pp || Go || isSearching) {
        return;
      }
      let MAt = getSingleKeyAction(parseKeystroke("enter"), "Chat", Pp.bindings) === "chat:submit";
      return Pp.registerHandler({
        action: "chat:submit",
        context: "Chat",
        handler: () => {
          if (fu("chat:submit")) {
            return !1;
          }
          if (Yp(void 0)) {
            return;
          }
          let eB = draft.value;
          (qg(eB), Tc(eB, !1, void 0, !1, draft.typedOnly ? MO() : void 0));
        },
        singleKey: !MAt,
      });
    }),
      ($[265] = Yp),
      ($[266] = draft.typedOnly),
      ($[267] = draft.value),
      ($[268] = fu),
      ($[269] = Go),
      ($[270] = isSearching),
      ($[271] = Pp),
      ($[272] = qg),
      ($[273] = Tc),
      ($[274] = yne));
  else yne = $[274];
  let oD;
  if (
    $[275] !== Yp ||
    $[276] !== ZE ||
    $[277] !== draft ||
    $[278] !== fu ||
    $[279] !== Go ||
    $[280] !== isSearching ||
    $[281] !== Pp ||
    $[282] !== qg ||
    $[283] !== Tc
  )
    ((oD = [Pp, Go, isSearching, draft, fu, ZE, Yp, qg, Tc]),
      ($[275] = Yp),
      ($[276] = ZE),
      ($[277] = draft),
      ($[278] = fu),
      ($[279] = Go),
      ($[280] = isSearching),
      ($[281] = Pp),
      ($[282] = qg),
      ($[283] = Tc),
      ($[284] = oD));
  else oD = $[284];
  P(yne, oD);
  let nNe;
  if ($[285] !== Yp || $[286] !== draft.value || $[287] !== qg || $[288] !== Tc)
    ((nNe = () => {
      if (Yp(void 0)) {
        return;
      }
      let iNe = draft.value;
      (qg(iNe), Tc(iNe, !0, void 0, !0));
    }),
      ($[285] = Yp),
      ($[286] = draft.value),
      ($[287] = qg),
      ($[288] = Tc),
      ($[289] = nNe));
  else nNe = $[289];
  let tG = nNe,
    sendQueuedNow = submit.sendQueuedNow,
    Sne;
  if (
    $[290] !== Yp ||
    $[291] !== draft.mode ||
    $[292] !== draft.pastedContents ||
    $[293] !== draft.value ||
    $[294] !== qg ||
    $[295] !== Tc ||
    $[296] !== sendQueuedNow ||
    $[297] !== wr ||
    $[298] !== turn
  )
    ((Sne = () => {
      if (Yp(void 0)) {
        return;
      }
      let nG = draft.value;
      let bne = nG.trim() !== "" || Object.values(draft.pastedContents).some(Zuo);
      let mode = draft.mode;
      let nB = getActiveAgentForInput(wr.getState());
      let sG = nB.type === "named_agent" ? nB.task.id : void 0;
      let nD = mode === "prompt" && nB.type === "leader";
      let iG = mode === "prompt" && sG !== void 0;
      if (!bne || wr.getState().queueEditIndex !== null) {
        if (nD || iG) sendQueuedNow(mode, sG);
        return;
      }
      let abortController = turn.getSnapshot().abortController;
      (qg(nG),
        Tc(nG, !0, void 0, !1, void 0, !1, !0)
          .then(() => {
            let dG = abortController !== null && turn.getSnapshot().abortController === abortController;
            if ((nD && dG) || iG) sendQueuedNow(mode, sG);
          })
          .catch(logError));
    }),
      ($[290] = Yp),
      ($[291] = draft.mode),
      ($[292] = draft.pastedContents),
      ($[293] = draft.value),
      ($[294] = qg),
      ($[295] = Tc),
      ($[296] = sendQueuedNow),
      ($[297] = wr),
      ($[298] = turn),
      ($[299] = Sne));
  else Sne = $[299];
  let cG = Sne,
    sB;
  if ($[300] !== mm) ((sB = () => mm({ kind: "carousel" })), ($[300] = mm), ($[301] = sB));
  else sB = $[301];
  let kne, vne;
  if ($[302] === MEMO_CACHE_SENTINEL) ((kne = {}), (vne = {}), ($[302] = kne), ($[303] = vne));
  else ((kne = $[302]), (vne = $[303]));
  let dNe;
  if ($[304] !== K0 || $[305] !== tG || $[306] !== cG || $[307] !== GE || $[308] !== sB)
    ((dNe = {
      "chat:queueSubmit": tG,
      "chat:sendNow": cG,
      "chat:clearScreen": L_,
      "chat:clearInput": L_,
      "chat:modelPicker": K0,
      "chat:thinkingToggle": GE,
      "chat:cycleMode": sB,
      ...kne,
      ...vne,
    }),
      ($[304] = K0),
      ($[305] = tG),
      ($[306] = cG),
      ($[307] = GE),
      ($[308] = sB),
      ($[309] = dNe));
  else dNe = $[309];
  let uNe = dNe,
    iB = !Go && !isSearching,
    mNe;
  if ($[310] !== iB || $[311] !== fu)
    ((mNe = { isActive: iB, footerOwnsKeyOf: fu }), ($[310] = iB), ($[311] = fu), ($[312] = mNe));
  else mNe = $[312];
  useFooterAwareMessageActions(uNe, mNe);
  const _ne = iB && Xt === "prompt";
  let pNe;
  if ($[313] !== _ne) ((pNe = { context: "Chat", isActive: _ne }), ($[313] = _ne), ($[314] = pNe));
  else pNe = $[314];
  useKeybinding(SEND_NOW_HINT_KEY, cG, pNe);
  const Rne = !Go && !isSearching && !dne && !$n;
  let fNe;
  if ($[315] !== fu || $[316] !== Rne)
    ((fNe = { isActive: Rne, footerOwnsKeyOf: fu }), ($[315] = fu), ($[316] = Rne), ($[317] = fNe));
  else fNe = $[317];
  useSavedModelSuccessorKey(fNe);
  const uG = !Go && !isSearching;
  let gNe;
  if ($[318] !== fu || $[319] !== uG)
    ((gNe = { isActive: uG, footerOwnsKeyOf: fu }), ($[318] = fu), ($[319] = uG), ($[320] = gNe));
  else gNe = $[320];
  let dB = useEffortStepKeys(transcript, gNe),
    pG;
  if ($[321] !== lP) ((pG = { "chat:fastMode": lP }), ($[321] = lP), ($[322] = pG));
  else pG = $[322];
  let uB;
  if ($[323] !== Go)
    ((uB = !Go && isFastModeEnabled() && isFastModeAvailable()), ($[323] = Go), ($[324] = uB));
  else uB = $[324];
  let hNe;
  if ($[325] !== fu || $[326] !== uB)
    ((hNe = { isActive: uB, footerOwnsKeyOf: fu }), ($[325] = fu), ($[326] = uB), ($[327] = hNe));
  else hNe = $[327];
  useFooterAwareMessageActions(pG, hNe);
  let bNe;
  if ($[328] !== on)
    ((bNe = () => {
      on(!1);
    }),
      ($[328] = on),
      ($[329] = bNe));
  else bNe = $[329];
  let pP;
  if ($[330] !== $n) ((pP = { context: "Help", isActive: $n }), ($[330] = $n), ($[331] = pP));
  else pP = $[331];
  useKeybinding("help:dismiss", bNe, pP);
  let xne;
  if ($[332] !== addNotification || $[333] !== on)
    ((xne = () => {
      if (wt()) {
        addNotification({
          key: "remote-history-search-unavailable",
          kind: "feedback",
          text: "History search isn't available in cloud sessions yet",
          row1Hint: NOT_IN_CLOUD_SESSIONS,
          priority: "medium",
        });
        return;
      }
      (ed(!0), on(!1));
    }),
      ($[332] = addNotification),
      ($[333] = on),
      ($[334] = xne));
  else xne = $[334];
  let fG = xne,
    Pne;
  if ($[335] !== Go) ((Pne = isFullscreenActive() && !Go), ($[335] = Go), ($[336] = Pne));
  else Pne = $[336];
  let Ane;
  if ($[337] !== Pne) ((Ane = { context: "Global", isActive: Pne }), ($[337] = Pne), ($[338] = Ane));
  else Ane = $[338];
  useKeybinding("history:search", fG, Ane);
  function ag() {
    if (jh) {
      Dd(null);
      return;
    }
    if (Uc && pl > 0 && Yi > hd) {
      Ka(emo);
      return;
    }
    if (uy && Cp > 0) {
      Nd(tmo);
      return;
    }
    Br(tc, -1, !0);
  }
  function Qg() {
    if (jh) {
      if (pl > 0) (Dd("tasks"), Ka(0));
      else Dd("workflows");
      return;
    }
    if (Uc && pl > 0) {
      if (Yi < pl - 1) {
        Ka(omo);
        return;
      }
      Br(tc, 1);
      return;
    }
    if (Uc) {
      if (!Br(tc, 1)) (chrome.openBashesDialog(), Dd(null));
      return;
    }
    if (uy) {
      if (Cp < fa.length - 1) {
        Nd(nmo);
        return;
      }
      Br(tc, 1);
      return;
    }
    Br(tc, 1);
  }
  let mB;
  if ($[339] !== submit_2)
    ((mB = (gG) => {
      submit_2(gG, NOOP_HELPERS, { fromKeybinding: !0, inputModeOverride: "prompt", leavesIdeSelection: !0 });
    }),
      ($[339] = submit_2),
      ($[340] = mB));
  else mB = $[340];
  let yG = mB,
    Mne;
  if (
    $[341] !== addNotification ||
    $[342] !== $l ||
    $[343] !== submit_2 ||
    $[344] !== removeNotification ||
    $[345] !== wr
  )
    ((Mne = function F_() {
      if (wt()) {
        let { frameUrls: frameUrls } = wr.getState();
        let pB = visibleArtifactFrames(frameUrls);
        if (pB.length > 1) {
          pd(!0);
          return;
        }
        let wNe = BO(frameUrls, pB[0]?.slug);
        if (wNe !== void 0)
          openArtifactRow(
            wNe,
            wr,
            { addNotification: addNotification, removeNotification: removeNotification },
            $l,
          );
        return;
      }
      submit_2("/artifacts", NOOP_HELPERS, { fromKeybinding: !0, inputModeOverride: "prompt" });
    }),
      ($[341] = addNotification),
      ($[342] = $l),
      ($[343] = submit_2),
      ($[344] = removeNotification),
      ($[345] = wr),
      ($[346] = Mne));
  else Mne = $[346];
  let F_ = Mne,
    bG;
  if ($[347] !== wr)
    ((bG = function rv() {
      let state = wr.getState();
      let wG = state.idleTeammatesExpanded ?? !1;
      let ZS = ((wG ? iu.current : void 0) ?? Ku.current)[state.coordinatorTaskIndex - 1];
      if (ZS === void 0) {
        return;
      }
      let wB = getVisibleBackgroundTasks(state.tasks, state.taskDecorations, state.viewingAgentTaskId, wG);
      let found = wB.find((kNe) => kNe.id === ZS);
      if (found) {
        return found;
      }
      return wB.some((kG) => ou(kG) && kG.taskIds.includes(ZS)) ? "folded" : void 0;
    }),
      ($[347] = wr),
      ($[348] = bG));
  else bG = $[348];
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
    $[350] !== pl ||
    $[351] !== If ||
    $[352] !== F_ ||
    $[353] !== rv ||
    $[354] !== Dd ||
    $[355] !== zr ||
    $[356] !== on ||
    $[357] !== wr
  )
    ((sv = () => {
      on(!1);
      let state = wr.getState();
      U_: switch (If() ? state.footerSelection : null) {
        case "tasks": {
          if (state.coordinatorTaskIndex >= 1) {
            let iD = rv();
            if (iD === void 0 || iD === "folded") {
              break U_;
            }
            if (ou(iD)) zr(SU);
            else enterTeammateView(iD.id, zr);
          } else if (state.coordinatorTaskIndex === 0 && pl > 0) exitTeammateView(zr);
          else (chrome.openBashesDialog(), Dd(null));
          break U_;
        }
        case "workflows": {
          let Ene = runningWorkflowTasks(state.tasks)[state.workflowFooterIndex];
          if (Ene)
            (logFeatureOk("workflow_progress_preview"),
              zr((vG) =>
                vG.workflowDetail?.taskId === Ene.id ? vG : { ...vG, workflowDetail: { taskId: Ene.id } },
              ),
              Dd(null));
          break U_;
        }
        case "bagel": {
          break U_;
        }
        case "bridge": {
          (RemoteControlPill(wr.getState()), pi(!0), Dd(null));
          break U_;
        }
        case "frame": {
          (F_(), Dd(null));
        }
      }
    }),
      ($[349] = chrome),
      ($[350] = pl),
      ($[351] = If),
      ($[352] = F_),
      ($[353] = rv),
      ($[354] = Dd),
      ($[355] = zr),
      ($[356] = on),
      ($[357] = wr),
      ($[358] = sv));
  else sv = $[358];
  let kB;
  if (
    $[359] !== $r ||
    $[360] !== $n ||
    $[361] !== Ll ||
    $[362] !== Dd ||
    $[363] !== zr ||
    $[364] !== on ||
    $[365] !== wr ||
    $[366] !== El ||
    $[367] !== ms ||
    $[368] !== Uc ||
    $[369] !== ds
  )
    ((kB = () => {
      if (Uc && Ll) {
        let Dne = getVisibleBackgroundTasks(ms, El, ds, !0);
        if ((zr(rmo), yU(Dne, ds))) {
          return;
        }
      }
      (dismissPromptOverlay({ store: wr, clearQueueSelection: $r, helpOpen: $n, setHelpOpen: on }), Dd(null));
    }),
      ($[359] = $r),
      ($[360] = $n),
      ($[361] = Ll),
      ($[362] = Dd),
      ($[363] = zr),
      ($[364] = on),
      ($[365] = wr),
      ($[366] = El),
      ($[367] = ms),
      ($[368] = Uc),
      ($[369] = ds),
      ($[370] = kB));
  else kB = $[370];
  let kw;
  if (
    $[371] !== If ||
    $[372] !== Pp ||
    $[373] !== hd ||
    $[374] !== rv ||
    $[375] !== Mn ||
    $[376] !== zr ||
    $[377] !== Ka ||
    $[378] !== storageV5 ||
    $[379] !== wr ||
    $[380] !== Yr
  )
    ((kw = () => {
      let state = wr.getState();
      let vB = If() ? state.footerSelection : null;
      if (vB === "tasks" && state.coordinatorTaskIndex >= 1) {
        let W_ = rv();
        if (!W_) {
          return !1;
        }
        if (W_ === "folded" || ou(W_)) {
          return;
        }
        if (hU(W_, state)) {
          let CG = getPrintableKey(Pp?.singleKeyEvent() ?? null);
          if (CG !== null) Xo.current?.typeText(CG);
          return;
        }
        if (stopTask(W_, Yr, zr, { source: "user", session: Mn, storageV5: storageV5 }) === "dismissed")
          Ka((vNe) => Math.max(hd, vNe - 1));
        return;
      }
      if (vB === "workflows") {
        let One = runningWorkflowTasks(state.tasks)[state.workflowFooterIndex];
        if (!One) {
          return !1;
        }
        stopWorkflowTask({ taskId: One.id, taskStatus: One.status, taskRegistry: Yr, setAppState: zr });
        return;
      }
      return !1;
    }),
      ($[371] = If),
      ($[372] = Pp),
      ($[373] = hd),
      ($[374] = rv),
      ($[375] = Mn),
      ($[376] = zr),
      ($[377] = Ka),
      ($[378] = storageV5),
      ($[379] = wr),
      ($[380] = Yr),
      ($[381] = kw));
  else kw = $[381];
  let dD;
  if ($[382] !== chrome || $[383] !== If || $[384] !== Dd || $[385] !== wr)
    ((dD = () => {
      if ((If() ? wr.getState().footerSelection : null) === "ideSelection") {
        (chrome.dismissIdeSelection(), Dd(null));
        return;
      }
      return !1;
    }),
      ($[382] = chrome),
      ($[383] = If),
      ($[384] = Dd),
      ($[385] = wr),
      ($[386] = dD));
  else dD = $[386];
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
  )
    ((Nne = {
      "footer:up": ag,
      "footer:down": Qg,
      "footer:next": O_,
      "footer:previous": lg,
      "footer:openSelected": sv,
      "footer:clearSelection": kB,
      "footer:close": kw,
      "footer:dismiss": dD,
    }),
      ($[387] = Qg),
      ($[388] = O_),
      ($[389] = lg),
      ($[390] = ag),
      ($[391] = sv),
      ($[392] = kB),
      ($[393] = kw),
      ($[394] = dD),
      ($[395] = Nne));
  else Nne = $[395];
  const _G = !!yl && !Go;
  let TG;
  if ($[396] !== _G) ((TG = { context: "Footer", isActive: _G }), ($[396] = _G), ($[397] = TG));
  else TG = $[397];
  MessageActionsKeybindings(Nne, TG);
  let iv = useIsScreenReaderEnabled(),
    ef = useFastModeCooldownActive(),
    CNe;
  if ($[398] !== ef || $[399] !== ua || $[400] !== Fn)
    ((CNe = () => NCn(ua, ef, Fn)), ($[398] = ef), ($[399] = ua), ($[400] = Fn), ($[401] = CNe));
  else CNe = $[401];
  let CB = yt(onFastRejectedFallbackModelsChanged, CNe),
    Lne = useShowFastIconHint(CB ?? !1),
    j_;
  if ($[402] !== ef || $[403] !== iv || $[404] !== CB || $[405] !== Lne)
    ((j_ = CB
      ? iv
        ? ef
          ? "fast mode (cooling down)"
          : "fast mode"
        : Lne
          ? `${getFastIconString(!0, ef)} ${sequential.reset.dim("/fast")}`
          : getFastIconString(!0, ef)
      : void 0),
      ($[402] = ef),
      ($[403] = iv),
      ($[404] = CB),
      ($[405] = Lne),
      ($[406] = j_));
  else j_ = $[406];
  let tb = j_,
    cD = isEffortIndicatorShown(La, Fn, Hs),
    _Ne = cD,
    Fne = _Un("sentEffort"),
    TNe = _Un("turnEffort"),
    TB;
  if ($[407] !== Hs || $[408] !== Fn || $[409] !== Xa)
    ((TB = !Hs && isUltracodeActive(Xa, Fn)), ($[407] = Hs), ($[408] = Fn), ($[409] = Xa), ($[410] = TB));
  else TB = $[410];
  let nf = TB,
    zg = yt(kUo, smo),
    ob = useUltracodeShimmer(nf && !iv),
    uD,
    RB;
  if ($[411] !== tb || $[412] !== zg || $[413] !== ob || $[414] !== nf) {
    let Hne = treeify(nf, ob);
    uD = Hne;
    RB = buildBorderText([Hne, tb, zg]);
    (($[411] = tb), ($[412] = zg), ($[413] = ob), ($[414] = nf), ($[415] = uD), ($[416] = RB));
  } else ((uD = $[415]), (RB = $[416]));
  let fP;
  if ($[417] !== uD || $[418] !== RB)
    ((fP = { ultraEffortTag: uD, topBorderText: RB }), ($[417] = uD), ($[418] = RB), ($[419] = fP));
  else fP = $[419];
  let { ultraEffortTag: ultraEffortTag, topBorderText: topBorderText } = fP,
    q_ = effortStatusText(cD, nf, iv, !1, _Ne),
    gP = Fne !== null && TNe === null && Fne !== cD && modelSupportsPerTurnEffortControl(Fn),
    $_ = effortStatusText(cD, nf, iv, gP, _Ne),
    RNe;
  if (
    $[420] !== addNotification ||
    $[421] !== gP ||
    $[422] !== $_ ||
    $[423] !== removeNotification ||
    $[424] !== wr
  )
    ((RNe = () => {
      let { current: IAt, queue: queue } = wr.getState().notifications;
      let any = [IAt, ...queue].some(cmo);
      if (!gP) removeNotification(EFFORT_LEVEL_KEY);
      else if (any && $_)
        (removeNotification(EFFORT_LEVEL_KEY),
          addNotification({
            key: EFFORT_LEVEL_KEY,
            kind: "feedback",
            text: $_,
            priority: "high",
            timeoutMs: 1e4,
          }));
    }),
      ($[420] = addNotification),
      ($[421] = gP),
      ($[422] = $_),
      ($[423] = removeNotification),
      ($[424] = wr),
      ($[425] = RNe));
  else RNe = $[425];
  let Wne;
  if ($[426] !== addNotification || $[427] !== gP || $[428] !== removeNotification || $[429] !== wr)
    ((Wne = [gP, wr, addNotification, removeNotification]),
      ($[426] = addNotification),
      ($[427] = gP),
      ($[428] = removeNotification),
      ($[429] = wr),
      ($[430] = Wne));
  else Wne = $[430];
  P(RNe, Wne);
  let PNe;
  if ($[431] !== addNotification || $[432] !== q_ || $[433] !== $_ || $[434] !== removeNotification)
    ((PNe = () => {
      if (!q_) {
        removeNotification(EFFORT_LEVEL_KEY);
        return;
      }
      (removeNotification(EFFORT_LEVEL_KEY),
        addNotification({
          key: EFFORT_LEVEL_KEY,
          kind: "feedback",
          text: $_ ?? q_,
          priority: "high",
          timeoutMs: 1e4,
        }));
    }),
      ($[431] = addNotification),
      ($[432] = q_),
      ($[433] = $_),
      ($[434] = removeNotification),
      ($[435] = PNe));
  else PNe = $[435];
  let hP;
  if ($[436] !== addNotification || $[437] !== q_ || $[438] !== removeNotification)
    ((hP = [q_, addNotification, removeNotification]),
      ($[436] = addNotification),
      ($[437] = q_),
      ($[438] = removeNotification),
      ($[439] = hP));
  else hP = $[439];
  (P(PNe, hP), NJ(cD));
  let PG = WE && suggestion ? suggestion : zp,
    xB = R(0),
    _w;
  if ($[440] !== addNotification || $[441] !== Mn || $[442] !== zr || $[443] !== storageV5 || $[444] !== wr)
    ((_w = async (av, PB, AB, yP, IG) => {
      let mD = !1;
      let MB = !1;
      if (yP !== void 0) persistEffortSetting(yP, aue(av), AB, storageV5);
      if ((clearRefusalFallbackModelLatch(), isFastModeEnabled())) clearFastModeCooldown();
      (zE(Mn, wr.getState(), av, "picker"),
        zr(
          (jne) => (
            (mD = !!jne.fastMode),
            (MB = isFastModeEnabled() ? isFastModeActive(av, jne.fastMode) : mD),
            {
              ...jne,
              mainLoopModel: av,
              mainLoopModelForSession: null,
              ...(yP !== void 0 && { sessionEffort: levelEffortSetting(yP) }),
              ...(MB !== mD && { fastMode: MB }),
            }
          ),
        ),
        reportFastModeToggle(mD, MB));
      let IB = AB ? await setDefaultModel(av, storageV5) : null;
      let ANe = IB?.kind === "failed";
      if (IG !== xB.current) {
        return ANe;
      }
      let G_ = `Model set to ${modelDisplayString(av)}${IB?.kind === "saved" ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
      if (((G_ = G_ + formatFastModeSuffix(mD, MB, av)), (G_ = G_ + describeDefaultSaved(IB)), PB.length > 0))
        G_ = G_ + ` \xB7 ${PB.map(Nf).join(" \xB7 ")}`;
      return (
        addNotification({
          key: "model-switched",
          kind: "feedback",
          segments: [{ text: G_ }],
          priority: "immediate",
          timeoutMs: IB === null || IB.kind === "saved" ? 3000 : void 0,
        }),
        logEvent("tengu_model_picker_hotkey", { model: telemetrySafeModelName(av) }),
        ANe
      );
    }),
      ($[440] = addNotification),
      ($[441] = Mn),
      ($[442] = zr),
      ($[443] = storageV5),
      ($[444] = wr),
      ($[445] = _w));
  else _w = $[445];
  let fD = _w,
    DB = R(!1),
    NB;
  if (
    $[446] !== addNotification ||
    $[447] !== fD ||
    $[448] !== Mn ||
    $[449] !== zr ||
    $[450] !== storageV5 ||
    $[451] !== wr
  )
    ((NB = (lv, qne) => {
      let MNe = DB.current;
      DB.current = !1;
      let gD = (xB.current = xB.current + 1);
      (Ya(!1),
        serializeModelSwitch(Mn, () => runPreModelSwitchHooks(Mn, wr.getState, lv, "picker"))
          .then((Q_) => {
            if (gD !== xB.current) {
              return;
            }
            if (Q_.decision !== "proceed") {
              (logFeatureSad("model_switch", "blocked_by_hook"),
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
                }));
              return;
            }
            if (!MNe) {
              return fD(lv, Q_.messages, !1, qne, gD).then(umo);
            }
            let $ne = bk(wr.getState());
            return savedModelPickReply(
              lv,
              {
                getAppState: wr.getState,
                setAppState: zr,
                session: Mn,
                storageV5: storageV5,
                options: { mcpClients: [] },
              },
              () => fD(lv, Q_.messages, !0, qne, gD).then(gmo),
              {
                persistsOffBox: Cmo,
                isSuperseded: () => gD !== xB.current,
                hasModelMoved: () => bk(wr.getState()) !== $ne,
              },
            ).then((FB) => {
              let { text: text, isRefusal: isRefusal, rewrittenTo: rewrittenTo } = FB;
              if (gD !== xB.current) {
                return;
              }
              if (isRefusal)
                addNotification({
                  key: "model-switch-blocked",
                  kind: "warning",
                  text: text,
                  color: "warning",
                  priority: "immediate",
                });
              else if (rewrittenTo !== void 0)
                addNotification({
                  key: "model-switched",
                  kind: "feedback",
                  segments: [
                    { text: `Model set to ${modelDisplayString(rewrittenTo)}${SAVED_AS_DEFAULT_SUFFIX}` },
                  ],
                  priority: "immediate",
                });
            });
          })
          .catch((UB) => {
            (logError(toError(UB)),
              addNotification({
                key: "model-switch-blocked",
                kind: "warning",
                text: `Model switch failed: ${Nf(errorMessage(UB))}`,
                color: "warning",
                priority: "immediate",
              }));
          }));
    }),
      ($[446] = addNotification),
      ($[447] = fD),
      ($[448] = Mn),
      ($[449] = zr),
      ($[450] = storageV5),
      ($[451] = wr),
      ($[452] = NB));
  else NB = $[452];
  let hD = NB,
    FB;
  if ($[453] === MEMO_CACHE_SENTINEL)
    ((FB = () => {
      ((DB.current = !1), Ya(!1));
    }),
      ($[453] = FB));
  else FB = $[453];
  let Vne = FB,
    EG;
  if ($[454] !== fs || $[455] !== _s)
    ((EG = useMainLoopModel({ mainLoopModel: _s, mainLoopModelForSession: fs })),
      ($[454] = fs),
      ($[455] = _s),
      ($[456] = EG));
  else EG = $[456];
  let SD = EG,
    bD = sDe(ua, SD),
    $B;
  ONe: {
    if (!js) {
      $B = null;
      break ONe;
    }
    let SP;
    if ($[457] === MEMO_CACHE_SENTINEL)
      ((SP = (Kne) => {
        if (lue(Kne)) {
          return;
        }
        DB.current = !0;
      }),
        ($[457] = SP));
    else SP = $[457];
    let uv;
    if ($[458] !== bD || $[459] !== SD)
      ((uv = isFastModeEnabled() && bD && supportsFastMode(SD) && isFastModeAvailable()),
        ($[458] = bD),
        ($[459] = SD),
        ($[460] = uv));
    else uv = $[460];
    let nb;
    if ($[461] !== hD || $[462] !== fs || $[463] !== _s || $[464] !== uv)
      ((nb = e(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: e(ModelPicker, {
          initial: _s,
          sessionModel: fs,
          onSelect: hD,
          onSetDefault: SP,
          onCancel: Vne,
          isStandaloneCommand: !0,
          showFastModeNotice: uv,
        }),
      })),
        ($[461] = hD),
        ($[462] = fs),
        ($[463] = _s),
        ($[464] = uv),
        ($[465] = nb));
    else nb = $[465];
    $B = nb;
  }
  let Gne = $B,
    SP;
  if ($[466] !== addNotification)
    ((SP = (NG) => {
      if ((ga(null), NG))
        addNotification({
          key: "fast-mode-toggled",
          kind: "feedback",
          segments: [{ text: hA(NG) }],
          priority: "immediate",
          timeoutMs: 3000,
        });
    }),
      ($[466] = addNotification),
      ($[467] = SP));
  else SP = $[467];
  let LG = SP,
    uv;
  NNe: {
    if (!_d) {
      uv = null;
      break NNe;
    }
    let nb;
    if ($[468] !== _d.unavailableReason || $[469] !== LG || $[470] !== storageV5)
      ((nb = e(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: e(FastModePicker, {
          onDone: LG,
          unavailableReason: _d.unavailableReason,
          storageV5: storageV5,
        }),
      })),
        ($[468] = _d.unavailableReason),
        ($[469] = LG),
        ($[470] = storageV5),
        ($[471] = nb));
    else nb = $[471];
    uv = nb;
  }
  let Qne = uv,
    nb;
  if ($[472] !== addNotification || $[473] !== zr)
    ((nb = (Yg) => {
      (zr((Jg) => ({ ...Jg, thinkingEnabled: Yg })),
        rg(!1),
        Jn()
          ?.sendControlRequest({ subtype: "set_max_thinking_tokens", max_thinking_tokens: Yg ? null : 0 })
          .catch(_mo),
        logEvent("tengu_thinking_toggled_hotkey", { enabled: Yg }),
        logFeatureOk("thinking_toggle"),
        addNotification({
          key: "thinking-toggled-hotkey",
          kind: "feedback",
          text: `Thinking ${Yg ? "on" : "off"}`,
          row1Hint: `thinking ${Yg ? "on" : "off"}`,
          ...(Yg && { color: "suggestion" }),
          priority: "immediate",
          timeoutMs: 3000,
        }));
    }),
      ($[472] = addNotification),
      ($[473] = zr),
      ($[474] = nb));
  else nb = $[474];
  let Of = nb,
    Xg;
  if ($[475] === MEMO_CACHE_SENTINEL)
    ((Xg = () => {
      rg(!1);
    }),
      ($[475] = Xg));
  else Xg = $[475];
  let wy = Xg,
    wP;
  UJo: {
    if (!du) {
      wP = null;
      break UJo;
    }
    const wD = ii ?? !0;
    let GB;
    if ($[476] !== Of || $[477] !== po || $[478] !== wD)
      ((GB = e(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: e(ThinkingToggle, { currentValue: wD, onSelect: Of, onCancel: wy, isMidConversation: po }),
      })),
        ($[476] = Of),
        ($[477] = po),
        ($[478] = wD),
        ($[479] = GB));
    else GB = $[479];
    wP = GB;
  }
  let LNe = wP,
    wD;
  if ($[480] !== Yd || $[481] !== tD || $[482] !== eG)
    ((wD = Yd ? e(AutoModeEnvOnboardingDialog, { onAccept: tD, onLater: eG, onDismiss: eG }) : null),
      ($[480] = Yd),
      ($[481] = tD),
      ($[482] = eG),
      ($[483] = wD));
  else wD = $[483];
  let FNe = wD;
  useFullscreenDialogSlot(He ? FNe : null);
  let QB = useFullscreenAnchor(),
    GB;
  if ($[484] !== Bo || $[485] !== Xt || $[486] !== Vl || $[487] !== yi)
    ((GB = e(PromptInputModeIndicator, {
      mode: Xt,
      isLoading: Bo,
      viewingAgentName: Vl,
      viewingAgentColor: yi,
    })),
      ($[484] = Bo),
      ($[485] = Xt),
      ($[486] = Vl),
      ($[487] = yi),
      ($[488] = GB));
  else GB = $[488];
  let zne = GB,
    Ym = null,
    Jm = da ? ms[da] : void 0;
  if (Jm && Jm.type === "local_workflow") {
    let ky = Jm.status === "running";
    let $c;
    if ($[489] !== addNotification || $[490] !== zr)
      (($c = (BNe) => {
        if (BNe)
          addNotification({
            key: "workflow-save-result",
            kind: "feedback",
            text: BNe,
            priority: "high",
            timeoutMs: 8000,
          });
        zr(clearFooterSelection);
      }),
        ($[489] = addNotification),
        ($[490] = zr),
        ($[491] = $c));
    else $c = $[491];
    let CD = $c;
    const sf = Zi?.phaseIndex;
    let cg;
    if ($[492] !== ky || $[493] !== Yr || $[494] !== Jm.id)
      ((cg = ky ? () => killWorkflowTask_2(Jm.id, Yr, "user") : void 0),
        ($[492] = ky),
        ($[493] = Yr),
        ($[494] = Jm.id),
        ($[495] = cg));
    else cg = $[495];
    let vy;
    if ($[496] !== ky || $[497] !== Yr || $[498] !== Jm.id)
      ((vy = ky ? () => pauseWorkflowTask_2(Jm.id, Yr) : void 0),
        ($[496] = ky),
        ($[497] = Yr),
        ($[498] = Jm.id),
        ($[499] = vy));
    else vy = $[499];
    let z_;
    if ($[500] !== CD || $[501] !== Tc)
      ((z_ = (EAt) => {
        (CD(), Tc(EAt, !0, void 0, !1, void 0, !0));
      }),
        ($[500] = CD),
        ($[501] = Tc),
        ($[502] = z_));
    else z_ = $[502];
    let Y_;
    if ($[503] !== ky || $[504] !== Yr || $[505] !== Jm.id)
      ((Y_ = ky ? (DAt) => skipWorkflowAgent_2(Jm.id, DAt, Yr) : void 0),
        ($[503] = ky),
        ($[504] = Yr),
        ($[505] = Jm.id),
        ($[506] = Y_));
    else Y_ = $[506];
    let Cy;
    if ($[507] !== ky || $[508] !== Yr || $[509] !== Jm.id)
      ((Cy = ky ? (Yne) => retryWorkflowAgent_2(Jm.id, Yne, Yr) : void 0),
        ($[507] = ky),
        ($[508] = Yr),
        ($[509] = Jm.id),
        ($[510] = Cy));
    else Cy = $[510];
    let CP;
    if (
      $[511] !== CD ||
      $[512] !== sf ||
      $[513] !== cg ||
      $[514] !== vy ||
      $[515] !== z_ ||
      $[516] !== Y_ ||
      $[517] !== Cy ||
      $[518] !== Jm
    )
      ((CP = e(WorkflowDetailDialog_2, {
        workflow: Jm,
        initialPhaseIndex: sf,
        onDone: CD,
        onKill: cg,
        onPause: vy,
        onResume: z_,
        onSkipAgent: Y_,
        onRetryAgent: Cy,
      })),
        ($[511] = CD),
        ($[512] = sf),
        ($[513] = cg),
        ($[514] = vy),
        ($[515] = z_),
        ($[516] = Y_),
        ($[517] = Cy),
        ($[518] = Jm),
        ($[519] = CP));
    else CP = $[519];
    Ym = CP;
  } else if (It && Oi) {
    let $c;
    if ($[520] !== chrome.closeBashesDialog)
      (($c = e(CloudTasksDialog, { onDone: chrome.closeBashesDialog })),
        ($[520] = chrome.closeBashesDialog),
        ($[521] = $c));
    else $c = $[521];
    Ym = $c;
  } else if (It) {
    const closeBashesDialog = chrome.closeBashesDialog;
    let sf;
    if ($[522] !== scope) ((sf = scope.computeTools()), ($[522] = scope), ($[523] = sf));
    else sf = $[523];
    const cg = typeof It === "string" ? It : void 0;
    let vy;
    if (
      $[524] !== chrome.closeBashesDialog ||
      $[525] !== Vr ||
      $[526] !== scope.commands ||
      $[527] !== Mn ||
      $[528] !== storageV5 ||
      $[529] !== sf ||
      $[530] !== cg ||
      $[531] !== mn
    )
      ((vy = e(BackgroundTasksDialog, {
        onDone: closeBashesDialog,
        storageV5: storageV5,
        session: Mn,
        messageQueue: Vr,
        tools: sf,
        commands: scope.commands,
        verbose: mn,
        initialDetailTaskId: cg,
      })),
        ($[524] = chrome.closeBashesDialog),
        ($[525] = Vr),
        ($[526] = scope.commands),
        ($[527] = Mn),
        ($[528] = storageV5),
        ($[529] = sf),
        ($[530] = cg),
        ($[531] = mn),
        ($[532] = vy));
    else vy = $[532];
    Ym = vy;
  } else if (isFullscreenActive() && ol) {
    let $c;
    if (
      $[533] !== draft ||
      $[534] !== setMode ||
      $[535] !== setCursorOffset ||
      $[536] !== setValue ||
      $[537] !== setPastedContents
    )
      (($c = (OAt) => {
        let HNe = renumberPastedContents({ display: OAt.display, pastedContents: OAt.pastedContents });
        let WJo = getModeFromInput_2(HNe.display);
        let NAt = stripModePrefix(HNe.display);
        (setMode(WJo),
          draft.attribute(freeze, () => setValue(NAt)),
          setPastedContents(HNe.pastedContents),
          setCursorOffset(NAt.length),
          ed(!1));
      }),
        ($[533] = draft),
        ($[534] = setMode),
        ($[535] = setCursorOffset),
        ($[536] = setValue),
        ($[537] = setPastedContents),
        ($[538] = $c));
    else $c = $[538];
    let sf;
    if ($[539] === MEMO_CACHE_SENTINEL) ((sf = () => ed(!1)), ($[539] = sf));
    else sf = $[539];
    let cg;
    if ($[540] !== draft.value || $[541] !== $c)
      ((cg = e(HistorySearchDialog, { initialQuery: draft.value, onSelect: $c, onCancel: sf })),
        ($[540] = draft.value),
        ($[541] = $c),
        ($[542] = cg));
    else cg = $[542];
    Ym = cg;
  } else if (Gne) Ym = Gne;
  else if (Qne) Ym = Qne;
  else if (LNe) Ym = LNe;
  else if (dB !== null) Ym = dB;
  else if (qa) {
    let $c;
    if ($[543] === MEMO_CACHE_SENTINEL) (($c = () => pd(!1)), ($[543] = $c));
    else $c = $[543];
    let sf;
    if ($[544] !== $l)
      ((sf = e(WizardNavigationFooter, { onDone: $c, cloudRowCheck: $l })), ($[544] = $l), ($[545] = sf));
    else sf = $[545];
    Ym = sf;
  } else if (as) {
    let $c;
    if ($[546] !== Dd)
      (($c = e(BridgeDialog, {
        onDone: () => {
          (pi(!1), Dd(null));
        },
      })),
        ($[546] = Dd),
        ($[547] = $c));
    else $c = $[547];
    Ym = $c;
  } else if (Si) {
    let $c;
    if ($[548] !== columns || $[549] !== Xt)
      (($c = e(EditorWaitNotice, { mode: Xt, columns: columns })),
        ($[548] = columns),
        ($[549] = Xt),
        ($[550] = $c));
    else $c = $[550];
    Ym = $c;
  }
  let zB = Ym === null && !isSearching && !Go,
    Jne = Ym !== null || Qm || _r !== null || yl !== null,
    $c,
    sf;
  if ($[551] !== draft || $[552] !== Jne)
    (($c = () => (draft.setInputRowReplaced(Jne), () => draft.setInputRowReplaced(!1))),
      (sf = [Jne, draft]),
      ($[551] = draft),
      ($[552] = Jne),
      ($[553] = $c),
      ($[554] = sf));
  else (($c = $[553]), (sf = $[554]));
  P($c, sf);
  const cg = Ym !== null;
  let vy;
  if ($[555] !== openSearch || $[556] !== fG)
    ((vy = isFullscreenActive() ? fG : openSearch), ($[555] = openSearch), ($[556] = fG), ($[557] = vy));
  else vy = $[557];
  const z_ = yl !== null;
  let Y_;
  if (
    $[558] !== Yp ||
    $[559] !== chrome ||
    $[560] !== yG ||
    $[561] !== draft ||
    $[562] !== kt ||
    $[563] !== Cl ||
    $[564] !== ef ||
    $[565] !== tb ||
    $[566] !== fu ||
    $[567] !== $n ||
    $[568] !== historyFailedMatch ||
    $[569] !== historyMatch ||
    $[570] !== historyQuery ||
    $[571] !== handleKeyDown ||
    $[572] !== At ||
    $[573] !== Qd ||
    $[574] !== zB ||
    $[575] !== zg ||
    $[576] !== Go ||
    $[577] !== isSearching ||
    $[578] !== kn ||
    $[579] !== markAccepted ||
    $[580] !== zne ||
    $[581] !== Tc ||
    $[582] !== PG ||
    $[583] !== scope ||
    $[584] !== on ||
    $[585] !== _o ||
    $[586] !== cg ||
    $[587] !== vy ||
    $[588] !== z_ ||
    $[589] !== XK ||
    $[590] !== Pc ||
    $[591] !== topBorderText ||
    $[592] !== transcript ||
    $[593] !== turn ||
    $[594] !== ultraEffortTag
  )
    ((Y_ = e(
      Kbe,
      {
        ref: Xo,
        draft: draft,
        transcript: transcript,
        scope: scope,
        turn: turn,
        chrome: chrome,
        suggestionsStore: _o,
        hidden: cg,
        inputTakesFocus: zB,
        takePendingPastes: mw,
        takeEnter: XK,
        embedded: kt,
        onSubmit: Tc,
        dispatchCommand: yG,
        chordGestureSpent: Yp,
        markAccepted: markAccepted,
        isSearchingHistory: isSearching,
        historyQuery: historyQuery,
        historyMatch: historyMatch,
        historyFailedMatch: historyFailedMatch,
        historySearchKeyDown: handleKeyDown,
        onOpenHistorySearch: vy,
        helpOpen: $n,
        setHelpOpen: on,
        toggleHelp: Pc,
        isModalOverlayActive: Go,
        footerItemSelected: z_,
        ideSelectionRidesRow1: Qd,
        footerOwnsKeyOf: fu,
        onHistoryDownPastEnd: Cl,
        placeholder: PG,
        leftArrowRoute: kn,
        modeIndicator: zne,
        ideSelection: At,
        topBorderText: topBorderText,
        fastModeTag: tb,
        fastModeCooldown: ef,
        ultraEffortTag: ultraEffortTag,
        internalTag: zg,
        onIsPastingChange: Gs,
        onExitMessage: Pr,
        onExpandPasteHintChange: $a,
        onExternalEditorActiveChange: na,
      },
      "editor",
    )),
      ($[558] = Yp),
      ($[559] = chrome),
      ($[560] = yG),
      ($[561] = draft),
      ($[562] = kt),
      ($[563] = Cl),
      ($[564] = ef),
      ($[565] = tb),
      ($[566] = fu),
      ($[567] = $n),
      ($[568] = historyFailedMatch),
      ($[569] = historyMatch),
      ($[570] = historyQuery),
      ($[571] = handleKeyDown),
      ($[572] = At),
      ($[573] = Qd),
      ($[574] = zB),
      ($[575] = zg),
      ($[576] = Go),
      ($[577] = isSearching),
      ($[578] = kn),
      ($[579] = markAccepted),
      ($[580] = zne),
      ($[581] = Tc),
      ($[582] = PG),
      ($[583] = scope),
      ($[584] = on),
      ($[585] = _o),
      ($[586] = cg),
      ($[587] = vy),
      ($[588] = z_),
      ($[589] = XK),
      ($[590] = Pc),
      ($[591] = topBorderText),
      ($[592] = transcript),
      ($[593] = turn),
      ($[594] = ultraEffortTag),
      ($[595] = Y_));
  else Y_ = $[595];
  let FG = Y_;
  if (Ym !== null) {
    let Cy;
    if ($[596] !== FG || $[597] !== Ym)
      ((Cy = r(Box, { flexDirection: "column", children: [Ym, FG] })),
        ($[596] = FG),
        ($[597] = Ym),
        ($[598] = Cy));
    else Cy = $[598];
    return Cy;
  }
  const Cy = Hs ? 0 : 1;
  let CP;
  if ($[599] !== yl || $[600] !== hw || $[601] !== Go || $[602] !== gw)
    ((CP =
      yl &&
      !Go &&
      e(Box, {
        tabIndex: 0,
        autoFocus: !0,
        onKeyDown: hw,
        onPaste: (LAt) => {
          (LAt.preventDefault(), gw(LAt));
        },
      })),
      ($[599] = yl),
      ($[600] = hw),
      ($[601] = Go),
      ($[602] = gw),
      ($[603] = CP));
  else CP = $[603];
  let Xne;
  if ($[604] !== Ot || $[605] !== Hh)
    ((Xne =
      Ot &&
      !Hh &&
      e(Box, {
        marginTop: 1,
        marginLeft: 2,
        children: e(Text, { dimColor: !0, children: "Waiting for permission\u2026" }),
      })),
      ($[604] = Ot),
      ($[605] = Hh),
      ($[606] = Xne));
  else Xne = $[606];
  const UNe = !iv && FG;
  let FAt;
  if ($[607] === MEMO_CACHE_SENTINEL) ((FAt = e(StatusNoticeList, {})), ($[607] = FAt));
  else FAt = $[607];
  const WNe = kn !== void 0 && !kn.onlyExplains && !Cn,
    qNe = Sn ? hn : void 0,
    $Ne = !Dt;
  let Zne;
  if (
    $[608] !== Wh ||
    $[609] !== chrome ||
    $[610] !== Ol ||
    $[611] !== or ||
    $[612] !== io ||
    $[613] !== $n ||
    $[614] !== historyFailedMatch ||
    $[615] !== historyQuery ||
    $[616] !== my ||
    $[617] !== zB ||
    $[618] !== Zn ||
    $[619] !== oo ||
    $[620] !== ss ||
    $[621] !== isSearching ||
    $[622] !== Wo.collapsed ||
    $[623] !== Wo.stepped ||
    $[624] !== Xt ||
    $[625] !== F_ ||
    $[626] !== dm ||
    $[627] !== scope ||
    $[628] !== setHistoryQuery ||
    $[629] !== ma ||
    $[630] !== _o.drawn ||
    $[631] !== WNe ||
    $[632] !== qNe ||
    $[633] !== $Ne ||
    $[634] !== Uc ||
    $[635] !== transcript ||
    $[636] !== turn ||
    $[637] !== mn
  )
    ((Zne = e(PromptInputFooterMemo, {
      scope: scope,
      transcript: transcript,
      turn: turn,
      chrome: chrome,
      exitMessage: or,
      row1Hint: dm,
      leftArrowDetachAvailable: WNe,
      proactivityLevelStepped: Wo.stepped,
      proactivityPillCollapsed: Wo.collapsed,
      vimMode: qNe,
      mode: Xt,
      isAutoUpdating: Zn,
      verbose: mn,
      onChangeIsUpdating: Un,
      suggestionsStore: _o.drawn,
      inputTakesFocus: zB,
      onSelectSuggestion: Ou,
      onHoverSuggestion: QS,
      toolPermissionContext: Ol,
      helpOpen: $n,
      suppressHint: $Ne,
      tasksSelected: Uc,
      bridgeSelected: Wh,
      ideSelectionSelected: my,
      isPasting: ss,
      showExpandPasteHint: ma,
      hasStash: io,
      isInputWrapped: oo,
      isSearching: isSearching,
      historyQuery: historyQuery,
      setHistoryQuery: setHistoryQuery,
      historyFailedMatch: historyFailedMatch,
      onOpenArtifacts: F_,
    })),
      ($[608] = Wh),
      ($[609] = chrome),
      ($[610] = Ol),
      ($[611] = or),
      ($[612] = io),
      ($[613] = $n),
      ($[614] = historyFailedMatch),
      ($[615] = historyQuery),
      ($[616] = my),
      ($[617] = zB),
      ($[618] = Zn),
      ($[619] = oo),
      ($[620] = ss),
      ($[621] = isSearching),
      ($[622] = Wo.collapsed),
      ($[623] = Wo.stepped),
      ($[624] = Xt),
      ($[625] = F_),
      ($[626] = dm),
      ($[627] = scope),
      ($[628] = setHistoryQuery),
      ($[629] = ma),
      ($[630] = _o.drawn),
      ($[631] = WNe),
      ($[632] = qNe),
      ($[633] = $Ne),
      ($[634] = Uc),
      ($[635] = transcript),
      ($[636] = turn),
      ($[637] = mn),
      ($[638] = Zne));
  else Zne = $[638];
  let ere;
  if ($[639] !== $l || $[640] !== Ms)
    ((ere = Ms ? e(NoConversationsMessage, { cloudRowCheck: $l }) : null),
      ($[639] = $l),
      ($[640] = Ms),
      ($[641] = ere));
  else ere = $[641];
  const VNe = He ? null : FNe;
  let tre;
  if (
    $[642] !== Yd ||
    $[643] !== Hs ||
    $[644] !== He ||
    $[645] !== io ||
    $[646] !== D_ ||
    $[647] !== Et ||
    $[648] !== Zn ||
    $[649] !== oo ||
    $[650] !== dm?.id ||
    $[651] !== scope ||
    $[652] !== transcript ||
    $[653] !== mn
  )
    ((tre = He
      ? e(NotificationOverlay, {
          marginTop: Hs ? -2 : -1,
          height: !D_ && !Yd ? 1 : 0,
          children: e(Notifications, {
            apiKeyVerification: scope.apiKeyVerification,
            hideLoginNotice: Et,
            isAutoUpdating: Zn,
            verbose: mn,
            transcript: transcript,
            onChangeIsUpdating: Un,
            isInputWrapped: oo,
            hasStash: io,
            row1HintId: dm?.id,
          }),
        })
      : null),
      ($[642] = Yd),
      ($[643] = Hs),
      ($[644] = He),
      ($[645] = io),
      ($[646] = D_),
      ($[647] = Et),
      ($[648] = Zn),
      ($[649] = oo),
      ($[650] = dm?.id),
      ($[651] = scope),
      ($[652] = transcript),
      ($[653] = mn),
      ($[654] = tre));
  else tre = $[654];
  const GNe = iv && FG;
  let BAt;
  if (
    $[655] !== QB ||
    $[656] !== Cy ||
    $[657] !== CP ||
    $[658] !== Xne ||
    $[659] !== UNe ||
    $[660] !== Zne ||
    $[661] !== ere ||
    $[662] !== VNe ||
    $[663] !== tre ||
    $[664] !== GNe
  )
    ((BAt = r(Box, {
      ref: QB,
      flexDirection: "column",
      marginTop: Cy,
      children: [CP, Xne, UNe, FAt, Zne, ere, VNe, tre, GNe],
    })),
      ($[655] = QB),
      ($[656] = Cy),
      ($[657] = CP),
      ($[658] = Xne),
      ($[659] = UNe),
      ($[660] = Zne),
      ($[661] = ere),
      ($[662] = VNe),
      ($[663] = tre),
      ($[664] = GNe),
      ($[665] = BAt));
  else BAt = $[665];
  return BAt;
}
//@ chunk-18hwfzwa.js:978434-978508 placement
function Iet(h) {
  return h.some((x) => x.type === "user" || x.type === "assistant");
}
//@ chunk-18hwfzwa.js:978508-978565 placement
function Eet(h) {
  return h.some((x) => x.type === "assistant");
}
//@ chunk-18hwfzwa.js:978565-978610 placement
function G6(h) {
  return h.suggestions.length > 0;
}
//@ chunk-18hwfzwa.js:978610-978626 placement
var Nke = Rh(PromptComposer);
//@ chunk-18hwfzwa.js:978626-978630 placement
j();

export { Nke };
