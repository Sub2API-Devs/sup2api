/**
 * components/dialogs/registry.tsx
 *
 * 2.1.316 新增。对话框种类到视图组件的注册表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (20)
 * attribution: placement 20
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentDetail } from "../agents/AgentDetail.js";
import { ComputerUseApproval } from "../permissions/ComputerUseApproval/ComputerUseApproval.js";
import { CostThresholdDialog } from "../CostThresholdDialog.js";
import { AutocompactOfferDialog } from "../AutocompactOfferDialog.js";
import { SingleEnvironmentContent } from "../RemoteEnvironmentDialog.js";
import { IdleReturnDialog } from "../IdleReturnDialog.js";
import { ResumeStaleConversationDialog } from "../ResumeStaleConversationDialog.js";
import { NewerModelOfferDialog } from "../NewerModelOfferDialog.js";
import { AutoModeDefaultNudgeDialog } from "../grove/Grove.js";
import { EffortMediumNudgeDialog } from "../EffortMediumNudgeDialog.js";
import { IdeOnboardingDialog } from "../IdeOnboardingDialog.js";
import { SandboxPermissionRequest } from "../permissions/SandboxPermissionRequest.js";
import { BackgroundConfirmDialog } from "../../screens/repl/backgroundConfirm.js";
import { LspRecommendationMenu } from "../LspRecommendation/LspRecommendationMenu.js";
import { PluginHintMenu } from "../ClaudeCodeHint/PluginHintMenu.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { RemoteCallout, REMOTE_CALLOUT_DIALOG } from "../RemoteCallout.js";
import { UltraplanLaunchDialog } from "../ultraplan/UltraplanLaunchDialog.js";
import { UltraplanChoiceDialog } from "../ultraplan/UltraplanChoiceDialog.js";
import { ManagedSettingsSecurityDialogHost } from "../ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.js";
import { ElicitationDialog } from "../mcp/ElicitationDialog.js";
import { useNotifications } from "../../context/notifications.js";
import { Nu } from "../../context/QueuedMessageContext.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { FableUsageCreditsConsent } from "../usageCredits/FableUsageCreditsConsent.js";
import { qt, Se, yt, j } from "../../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import {
  EO,
  tW,
  DIALOG_KIND_META,
  pVe,
  dialogLayout,
  computerUseApprovalDialogDef,
  costThresholdDialogDef,
  autoModeSetupReviewDialogDef,
  HZt,
} from "./dialogKinds.js";
import { useDialogStore, topAutoDialog, topUserDialog } from "../../state/dialogQueue.js";
import { getActiveBottomSurface, tO } from "../../screens/repl/storeHooks.js";
import {
  NON_BLOCKING_DIALOG_KINDS,
  topBlockingDialog,
  IDE_ONBOARDING_DIALOG,
  LEFT_ARROW_CONFIRM_DIALOG,
  LSP_RECOMMENDATION_DIALOG,
  HXe,
} from "../../screens/replDialogState.js";
import { useRenderMode } from "../../ink/renderModeContext.js";
import { IT2_SETUP_DIALOG } from "../../utils/swarm/it2SetupResult.js";
import { AUTOCOMPACT_OFFER_DIALOG } from "../../services/compact/autocompactOffer.js";
import { serverFallbackNoticeSpec } from "../../utils/permissions/serverClassifier/fallbackNotice.js";
import { RESUME_COMPACT_DIALOG } from "../../screens/repl/resumeCompactOffer.js";
import { idleReturnDialogDef } from "../../screens/repl/idleReturn.js";
import { resumeOnNewerModelDialogDef } from "../../utils/newerModelOffer.js";
import { managedSettingsSecurityDialogDef } from "../../screens/repl/StartupNudges.js";
import { sandboxNetworkAccessDialogDef } from "../../screens/repl/SandboxNetworkPrompts.js";
import { ULTRAPLAN_LAUNCH_DIALOG, IKe } from "../../commands/ultraplan.js";
import {
  AUTO_DEFAULT_NUDGE_DIALOG,
  FULLSCREEN_UPSELL_DIALOG,
  FullscreenUpsellDialog,
} from "../FullscreenUpsellDialog.js";
import { effortMediumNudgeDialogDef } from "../../utils/effortMediumNudge.js";
import {
  MCP_ELICITATION_DIALOG,
  MCP_ELICITATION_WAITING_DIALOG,
  MCP_URL_ELICITATION_DIALOG,
} from "../../services/mcp/elicitationDialogs.js";
import { PERMISSION_PROMPT_DIALOG } from "../../utils/agentContext.js";
import { FallbackPermissionRequest } from "../permissions/FallbackPermissionRequest.js";
import {
  WEBFETCH_PERMISSION_CARD,
  SKILL_PERMISSION_CARD,
  POWERSHELL_PERMISSION_CARD,
  FILE_PERMISSION_CARD,
  ASK_USER_QUESTION_PERMISSION_CARD,
  ENTER_PLAN_MODE_PERMISSION_CARD,
  PUBLISH_PLUGIN_PERMISSION_CARD,
  EXIT_PLAN_MODE_V2_PERMISSION_CARD,
  MONITOR_PERMISSION_CARD,
  BASH_PERMISSION_CARD,
  BROWSER_PERMISSION_CARD,
} from "../permissions/permissionCardKinds.js";
import { WebFetchPermissionRequest } from "../permissions/WebFetchPermissionRequest/WebFetchPermissionRequest.js";
import {
  SkillUsePermissionDialog,
  SkillPermissionRequest,
} from "../permissions/SkillPermissionRequest/SkillPermissionRequest.js";
import { PowerShellPermissionRequest } from "../permissions/PowerShellPermissionRequest/PowerShellPermissionRequest.js";
import { FilePermissionDialog } from "../permissions/FilePermissionDialog/FilePermissionDialog.js";
import { AskUserQuestionPermissionRequest } from "../permissions/AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.js";
import { EnterPlanModePermissionRequest } from "../permissions/EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.js";
import { FolderAccessPermissionRequest } from "../permissions/FolderAccessPermissionRequest.js";
import { GOAL_PROPOSAL_DIALOG } from "../goal/goalProposalDialog.js";
import { GoalProposalPermissionRequest } from "../permissions/GoalProposalPermissionRequest.js";
import { ExitPlanModePermissionRequest } from "../permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.js";
import { BashPermissionRequestInner } from "../permissions/BashPermissionRequest/BashPermissionRequest.js";
import { REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { ModelRefusalPausedDialog } from "../ModelRefusalPausedDialog.js";
import { FABLE_OVERAGE_CONSENT_DIALOG } from "../../services/api/overageConsent.js";
import { ChromePermissionRequest } from "../permissions/ChromePermissionRequest.js";
import { peerInboundApprovalDialogDef } from "../../utils/peerInbound/heldPeerMessages.js";
import { PeerMessageApproval } from "../permissions/PeerMessageApproval.js";
import {
  CHROME_INSTALL_UPSELL_DIALOG,
  CHROME_INSTALL_SETUP_DIALOG,
} from "../../utils/claudeInChrome/installUpsell.js";
import { ChromeSetupDialog, ChromeInstallFlow } from "../ChromeSetupDialog.js";
import { autoModeSetupReviewDialog, autoModeSetupFlaggedDialog } from "../permissions/AutoModeSetupReview.js";

/**
 * 对话框种类到懒加载视图组件的映射表。
 */
//@ chunk-18hwfzwa.js:1417159-1420111 placement
var LAZY_DIALOG_COMPONENTS = null,
  Yyt = null,
  WorkflowPermissionDialog = require("./chunk-sycr1qkz.js").WorkflowPermissionDialog,
  workflowPermissionDialog_2 = require("./chunk-vhnfh0m3.js").workflowPermissionDialog,
  Jyt = null,
  Xyt = null,
  Zyt = null,
  eSt = null,
  tSt = null,
  oSt = null,
  ContinueInProjectsPermissionDialog = require("./chunk-6d9n2xk3.js").ContinueInProjectsPermissionDialog,
  E0o = require("./chunk-dkjq625a.js"),
  rSt = E0o?.projectContinuePermissionDialog ?? null,
  ContinueInProjectsTargetDialog = require("./chunk-ftzr67d2.js").ContinueInProjectsTargetDialog,
  continueInProjectsTargetDialog = require("./chunk-c7qavzqd.js").continueInProjectsTargetDialog,
  ContinueInProjectsMessageDialog = require("./chunk-kv464nx7.js").ContinueInProjectsMessageDialog,
  continueInProjectsMessageDialog = require("./chunk-j3dac3ab.js").continueInProjectsMessageDialog,
  cSt = null,
  uSt = null,
  pSt = null,
  fSt = null,
  hSt = null,
  ySt = null,
  bSt = null,
  wSt = null,
  kSt = null,
  CSt = null,
  _St = null,
  TSt = null,
  RSt = null,
  xSt = null,
  PSt = null,
  ASt = null,
  MSt = null,
  ISt = null,
  ESt = null,
  DSt = null,
  OSt = null,
  NSt = null,
  LSt = null,
  FSt = null,
  BSt = LSt
    ? ({ payload: payload, answer: answer }) =>
        e(LSt, {
          left: payload.left,
          right: payload.right,
          mode: {
            optOut: payload.optOut,
            comparesModels: payload.comparesModels,
            hasSeenBoth: payload.hasSeenBoth,
            minTogetherRows: payload.minTogetherRows,
            minPaneRows: payload.minPaneRows,
            onDone: (D, L) => answer({ choice: D, arrangement: L }),
          },
        })
    : null,
  D0o = ({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) =>
    e(AgentDetail, {
      tmuxAvailable: payload.tmuxAvailable,
      onDone: answer,
      wouldTakeAnswer: wouldTakeAnswer,
    }),
  ComputerUseApprovalDialogView = ({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) =>
    e(ComputerUseApproval, { request: payload, onDone: answer, wouldTakeAnswer: wouldTakeAnswer }),
  N0o = ({ answer: answer }) => e(CostThresholdDialog, { onDone: () => answer("acknowledged") }),
  L0o = ({ payload: payload, answer: answer }) =>
    e(AutocompactOfferDialog, { payload: payload, onDone: answer }),
  F0o = ({ payload: payload, answer: answer }) =>
    e(SingleEnvironmentContent, { title: payload.title, paragraphs: payload.paragraphs, onDone: answer }),
  B0o = ({ payload: payload, answer: answer }) =>
    e(IdleReturnDialog, {
      sessionAgeMinutes: payload.sessionAgeMinutes,
      estimatedTokens: payload.estimatedTokens,
      hasPrecomputedSummary: payload.hasPrecomputedSummary,
      onDone: answer,
    }),
  H0o = ({ payload: payload, answer: answer }) =>
    e(ResumeStaleConversationDialog, {
      inactiveSince: payload.inactiveSince,
      contextTokens: payload.contextTokens,
      percentOfFiveHourLimit: payload.percentOfFiveHourLimit,
      trigger: payload.trigger,
      focusedAction: payload.focusedAction,
      offersLookUp: payload.offersLookUp,
      ask: payload,
      onDone: answer,
    }),
  U0o = ({ payload: payload, answer: answer }) =>
    e(NewerModelOfferDialog, { offer: payload, onDone: answer }),
  W0o = ({ payload: payload, answer: answer }) =>
    e(AutoModeDefaultNudgeDialog, { currentMode: payload.currentMode, onDone: answer }),
  j0o = ({ payload: payload, answer: answer }) =>
    e(EffortMediumNudgeDialog, {
      model: payload.model,
      copy: payload.copy,
      onDone: (D, L) => answer({ choice: D, optionOrder: L }),
    }),
  q0o = ({ payload: payload, answer: answer }) =>
    e(IdeOnboardingDialog, {
      installationStatus: payload.installationStatus,
      onDone: () => answer("dismissed"),
    }),
  SandboxNetworkAccessDialogView = ({ payload: payload, answer: answer }) =>
    e(SandboxPermissionRequest, {
      hostPattern: { host: payload.host, port: payload.port },
      requestSource: payload.forwardedFromWorker
        ? { type: "subagent", agentName: payload.workerName }
        : void 0,
      onUserResponse: answer,
    }),
  V0o = ({ payload: payload, answer: answer }) =>
    e(BackgroundConfirmDialog, {
      summary: payload.summary,
      carryOverCount: payload.carryOverCount,
      monitorParkCount: payload.monitorParkCount,
      workflowAgents: payload.workflowAgents,
      onConfirm: () => answer("confirm"),
      onCancel: () => answer("stay"),
    }),
  K0o = ({ payload: payload, answer: answer }) =>
    e(LspRecommendationMenu, {
      pluginName: payload.pluginName,
      pluginDescription: payload.pluginDescription,
      marketplaceName: payload.marketplaceName,
      fileExtension: payload.fileExtension,
      onResponse: answer,
    }),
  G0o = ({ payload: payload, answer: answer }) =>
    e(PluginHintMenu, {
      pluginName: payload.pluginName,
      pluginDescription: payload.pluginDescription,
      marketplaceName: payload.marketplaceName,
      sourceCommand: payload.sourceCommand,
      onResponse: answer,
    });
//@ chunk-18hwfzwa.js:1420111-1420385 placement
function RemoteCalloutDialog(h) {
  let $ = w(4),
    { answer: answer } = h,
    D = useRefusableAnswer(answer);
  const L = `remote-callout-${D.attempts}`,
    ee = D.refused ?? void 0;
  let Re;
  if ($[0] !== D.answer || $[1] !== L || $[2] !== ee)
    ((Re = e(RemoteCallout, { defaultFocusValue: ee, onDone: D.answer }, L)),
      ($[0] = D.answer),
      ($[1] = L),
      ($[2] = ee),
      ($[3] = Re));
  else Re = $[3];
  return Re;
}
//@ chunk-18hwfzwa.js:1420385-1421497 placement
var ultraplanLaunchDialogView = ({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) =>
    e(UltraplanLaunchDialog, {
      promptIdentifier: payload.promptIdentifier,
      showTerms: payload.showTerms,
      prompt: payload.prompt,
      deliveredByRelay: payload.deliveredByRelay,
      onDone: answer,
      wouldTakeAnswer: wouldTakeAnswer,
    }),
  Y0o = ({ payload: payload, answer: answer }) =>
    e(UltraplanChoiceDialog, { plan: payload.plan, onDone: answer }),
  ManagedSettingsSecurityDialogView = ({
    payload: payload,
    answer: answer,
    wouldTakeAnswer: wouldTakeAnswer,
  }) =>
    e(ManagedSettingsSecurityDialogHost, {
      settings: payload.settings,
      baseline: payload.baseline,
      reveal: payload.reveal,
      onAccept: () => answer("approved"),
      onReject: () => answer("rejected"),
      wouldTakeAnswer: wouldTakeAnswer,
    }),
  X0o = ({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) =>
    e(ElicitationDialog, {
      serverName: payload.serverName,
      pluginSource: payload.pluginSource,
      params: payload.params,
      onResponse: (L, ee) => answer({ action: L, content: ee }),
      userConfirmsCompletion: payload.userConfirmsCompletion,
      wouldTakeAnswer: wouldTakeAnswer,
    }),
  Z0o = ({ payload: payload, answer: answer }) =>
    e(ElicitationDialog, {
      serverName: payload.serverName,
      params: payload.params,
      waitingState: payload.waitingState,
      initialPhase: "waiting",
      onResponse: () => !1,
      onWaitingDismiss: (D) => {
        answer(D);
      },
    }),
  eBo = ({ payload: payload, answer: answer }) =>
    e(ElicitationDialog, {
      serverName: payload.serverName,
      params: payload.params,
      waitingState: { actionLabel: "Retry now", showCancel: !0 },
      onResponse: (D, L) => {
        if (D === "accept") return;
        return answer({ action: D, content: L });
      },
      onWaitingDismiss: (D) => {
        answer({ action: D === "retry" ? "accept" : "cancel" });
      },
    });
//@ chunk-18hwfzwa.js:1421497-1422258 placement
function FastModeConsentDialogView(h) {
  let $ = w(9),
    { payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer } = h,
    { addNotification: addNotification } = useNotifications(),
    ke = Nu(),
    Be;
  if ($[0] !== addNotification || $[1] !== answer || $[2] !== ke)
    ((Be = (He, We) => {
      let ze = answer(He === "consent" ? "consent" : He === "switch" ? "switch_default" : "cancelled");
      if (ze && We !== void 0)
        addNotification({ kind: "feedback", key: "fable-consent-result", text: We, priority: "high" });
      if (ze && He === "upgrade")
        ke.enqueue({
          agentId: mainAgentId(),
          value: "/upgrade",
          mode: "task-notification",
          origin: { kind: "task-notification" },
        });
      return ze;
    }),
      ($[0] = addNotification),
      ($[1] = answer),
      ($[2] = ke),
      ($[3] = Be));
  else Be = $[3];
  let Xe;
  if ($[4] !== payload.model || $[5] !== payload.modelName || $[6] !== Be || $[7] !== wouldTakeAnswer)
    ((Xe = e(FableUsageCreditsConsent, {
      variant: "mid-session",
      modelName: payload.modelName,
      model: payload.model,
      wouldTakeAnswer: wouldTakeAnswer,
      onDone: Be,
    })),
      ($[4] = payload.model),
      ($[5] = payload.modelName),
      ($[6] = Be),
      ($[7] = wouldTakeAnswer),
      ($[8] = Xe));
  else Xe = $[8];
  return Xe;
}
//@ chunk-18hwfzwa.js:1422258-1422274 placement
var hV = qt(null);
//@ chunk-18hwfzwa.js:1422274-1422543 placement
function LocalJsxDialog(h) {
  let $ = w(2),
    { payload: payload } = h,
    D = Se(hV);
  if (!D) {
    throw ReferenceError("A local_jsx dialog cannot render outside of a LocalJsxRegistryContext provider");
  }
  let ee;
  if ($[0] !== payload.nodeId)
    ((ee = (ke) => ke.get(payload.nodeId) ?? null), ($[0] = payload.nodeId), ($[1] = ee));
  else ee = $[1];
  return useStoreSelector(D, ee);
}
//@ chunk-18hwfzwa.js:1422543-1422592 placement
var aBo = { [LOCAL_JSX_DIALOG.kind]: (h) => EO(h)?.hidesPrompt === !1 };
//@ chunk-18hwfzwa.js:1422592-1422644 placement
function lBo(h) {
  return aBo[h.kind]?.(h.payload) ?? !1;
}
//@ chunk-18hwfzwa.js:1422644-1422846 placement
function useHasBlockingDialog() {
  let $ = w(3),
    h = useDialogStore(),
    x = getActiveBottomSurface() !== null,
    L;
  if ($[0] !== h || $[1] !== x)
    ((L = () => {
      let state = h.getState();
      return PZ(state) || (!x && topAutoDialog(state) !== null);
    }),
      ($[0] = h),
      ($[1] = x),
      ($[2] = L));
  else L = $[2];
  let ke = L;
  return yt(h.subscribe, ke, ke);
}
//@ chunk-18hwfzwa.js:1422846-1422976 placement
function useHasOpenDialog() {
  let $ = w(2),
    h = useDialogStore(),
    D;
  if ($[0] !== h) ((D = () => PZ(h.getState())), ($[0] = h), ($[1] = D));
  else D = $[1];
  let L = D;
  return yt(h.subscribe, L, L);
}
//@ chunk-18hwfzwa.js:1422976-1423029 placement
function PZ(h) {
  let x = topUserDialog(h);
  return x !== null && !lBo(x);
}
//@ chunk-18hwfzwa.js:1423029-1423107 placement
function YAe(h) {
  return h.open.some((x) => x.userInvoked !== !0 && !NON_BLOCKING_DIALOG_KINDS.has(x.kind));
}
//@ chunk-18hwfzwa.js:1423107-1423180 placement
function JAe(h) {
  return YAe({ open: h.open.filter((x) => tW(DIALOG_KIND_META, x) === void 0) });
}
//@ chunk-18hwfzwa.js:1423180-1423238 placement
function XAe(h, x) {
  let D = x ? topBlockingDialog(h) : topAutoDialog(h);
  return pVe(D?.kind);
}
//@ chunk-18hwfzwa.js:1423238-1423398 placement
function useHasModalDialog() {
  let $ = w(3),
    h = useDialogStore(),
    x = useRenderMode(),
    L;
  if ($[0] !== x || $[1] !== h)
    ((L = () => hasModalDialog(h.getState(), x)), ($[0] = x), ($[1] = h), ($[2] = L));
  else L = $[2];
  let ee = L;
  return yt(h.subscribe, ee, ee);
}
/**
 * 判断当前是否有以模态方式显示的用户对话框（对话框存储或本地 JSX 命令）。
 */
//@ chunk-18hwfzwa.js:1423398-1423721 placement
function useHasModalUserDialog() {
  let $ = w(6),
    h = useDialogStore(),
    x = useRenderMode(),
    D = tO(),
    ee;
  if ($[0] !== x || $[1] !== h)
    ((ee = () => {
      let ke = topUserDialog(h.getState());
      return ke !== null && dialogLayout(DIALOG_KIND_META, ke, x) === "modal";
    }),
      ($[0] = x),
      ($[1] = h),
      ($[2] = ee));
  else ee = $[2];
  let Re = ee,
    Be = yt(h.subscribe, Re, Re),
    He;
  if ($[3] !== x || $[4] !== D)
    ((He = D !== null && dialogLayout(DIALOG_KIND_META, D, x) === "modal"),
      ($[3] = x),
      ($[4] = D),
      ($[5] = He));
  else He = $[5];
  return He || Be;
}
//@ chunk-18hwfzwa.js:1423721-1423830 placement
function hasModalDialog(h, x) {
  let D = topAutoDialog(h),
    L = topUserDialog(h);
  return (
    (D !== null && dialogLayout(DIALOG_KIND_META, D, x) === "modal") ||
    (L !== null && dialogLayout(DIALOG_KIND_META, L, x) === "modal")
  );
}
//@ chunk-18hwfzwa.js:1423830-1423866 placement
function gl(h, x) {
  return { [h.kind]: x };
}
/**
 * 对话框注册表：每个 kind 的定义对象经 gl(def, Component) 注册到这里，DialogHost 按 kind 查组件渲染；部分 kind 由可选 chunk 提供。
 */
//@ chunk-18hwfzwa.js:1423866-1425369 placement
var DIALOG_REGISTRY = {
  ...gl(LOCAL_JSX_DIALOG, LocalJsxDialog),
  ...gl(IT2_SETUP_DIALOG, D0o),
  ...gl(computerUseApprovalDialogDef, ComputerUseApprovalDialogView),
  ...gl(costThresholdDialogDef, N0o),
  ...gl(AUTOCOMPACT_OFFER_DIALOG, L0o),
  ...gl(serverFallbackNoticeSpec, F0o),
  ...gl(RESUME_COMPACT_DIALOG, B0o),
  ...gl(idleReturnDialogDef, H0o),
  ...gl(resumeOnNewerModelDialogDef, U0o),
  ...gl(managedSettingsSecurityDialogDef, ManagedSettingsSecurityDialogView),
  ...gl(IDE_ONBOARDING_DIALOG, q0o),
  ...gl(sandboxNetworkAccessDialogDef, SandboxNetworkAccessDialogView),
  ...gl(LEFT_ARROW_CONFIRM_DIALOG, V0o),
  ...gl(REMOTE_CALLOUT_DIALOG, RemoteCalloutDialog),
  ...gl(ULTRAPLAN_LAUNCH_DIALOG, ultraplanLaunchDialogView),
  ...gl(IKe, Y0o),
  ...gl(LSP_RECOMMENDATION_DIALOG, K0o),
  ...gl(HXe, G0o),
  ...gl(AUTO_DEFAULT_NUDGE_DIALOG, W0o),
  ...gl(effortMediumNudgeDialogDef, j0o),
  ...gl(FULLSCREEN_UPSELL_DIALOG, FullscreenUpsellDialog),
  ...(hSt && ySt ? gl(hSt.startupModelSwitchDialog, ySt) : {}),
  ...(bSt && wSt ? gl(bSt.importReviewOfferDialog, wSt) : {}),
  ...(kSt && CSt ? gl(kSt.effortAutoNudgeDialog, CSt) : {}),
  ...(_St && TSt ? gl(_St.accountMemoryEditConfirmDialog, TSt) : {}),
  ...(RSt && xSt ? gl(RSt.accountMemoryEverywhereConfirmDialog, xSt) : {}),
  ...(PSt && ASt ? gl(PSt.secretPromptDialog, ASt) : {}),
  ...(MSt && ISt ? gl(MSt.accountMemoryWritePermissionDialog, ISt) : {}),
  ...gl(MCP_ELICITATION_DIALOG, X0o),
  ...gl(MCP_ELICITATION_WAITING_DIALOG, Z0o),
  ...gl(MCP_URL_ELICITATION_DIALOG, eBo),
  ...gl(PERMISSION_PROMPT_DIALOG, FallbackPermissionRequest),
  ...gl(WEBFETCH_PERMISSION_CARD, WebFetchPermissionRequest),
  ...gl(SKILL_PERMISSION_CARD, SkillUsePermissionDialog),
  ...gl(POWERSHELL_PERMISSION_CARD, PowerShellPermissionRequest),
  ...gl(FILE_PERMISSION_CARD, FilePermissionDialog),
  ...gl(ASK_USER_QUESTION_PERMISSION_CARD, AskUserQuestionPermissionRequest),
  ...gl(ENTER_PLAN_MODE_PERMISSION_CARD, EnterPlanModePermissionRequest),
  ...gl(PUBLISH_PLUGIN_PERMISSION_CARD, FolderAccessPermissionRequest),
  ...gl(GOAL_PROPOSAL_DIALOG, GoalProposalPermissionRequest),
  ...gl(EXIT_PLAN_MODE_V2_PERMISSION_CARD, ExitPlanModePermissionRequest),
  ...gl(MONITOR_PERMISSION_CARD, SkillPermissionRequest),
  ...gl(BASH_PERMISSION_CARD, BashPermissionRequestInner),
  ...gl(REFUSAL_FALLBACK_DIALOG, ModelRefusalPausedDialog),
  ...gl(FABLE_OVERAGE_CONSENT_DIALOG, FastModeConsentDialogView),
  ...gl(BROWSER_PERMISSION_CARD, ChromePermissionRequest),
  ...gl(peerInboundApprovalDialogDef, PeerMessageApproval),
  ...gl(CHROME_INSTALL_UPSELL_DIALOG, ChromeSetupDialog),
  ...gl(CHROME_INSTALL_SETUP_DIALOG, ChromeInstallFlow),
  ...(Jyt && Xyt ? gl(Xyt, Jyt) : {}),
  ...(Zyt && eSt ? gl(eSt, Zyt) : {}),
  ...(tSt && oSt ? gl(oSt, tSt) : {}),
  ...(LAZY_DIALOG_COMPONENTS && Yyt ? gl(Yyt, LAZY_DIALOG_COMPONENTS) : {}),
  ...gl(workflowPermissionDialog_2, WorkflowPermissionDialog),
  ...(ContinueInProjectsPermissionDialog && rSt ? gl(rSt, ContinueInProjectsPermissionDialog) : {}),
  ...(ContinueInProjectsTargetDialog && continueInProjectsTargetDialog
    ? gl(continueInProjectsTargetDialog, ContinueInProjectsTargetDialog)
    : {}),
  ...(ContinueInProjectsMessageDialog && continueInProjectsMessageDialog
    ? gl(continueInProjectsMessageDialog, ContinueInProjectsMessageDialog)
    : {}),
  ...(cSt && uSt ? gl(uSt, cSt) : {}),
  ...(pSt && fSt ? gl(fSt, pSt) : {}),
  ...(ESt && DSt
    ? Object.assign(
        {},
        ...DSt.slackConnectDialogs.map((slackConnectDialog) =>
          gl(slackConnectDialog, ESt.SlackConnectConsentDialog),
        ),
      )
    : {}),
  ...(OSt && NSt ? gl(NSt.slackSignInOfferDialog, OSt.SlackSignInOfferDialog) : {}),
  ...(FSt && BSt ? gl(FSt, BSt) : {}),
  ...gl(autoModeSetupReviewDialogDef, autoModeSetupReviewDialog),
  ...gl(HZt, autoModeSetupFlaggedDialog),
};
//@ chunk-18hwfzwa.js:1425369-1425373 placement
j();

export {
  useHasOpenDialog,
  useHasBlockingDialog,
  useHasModalDialog,
  useHasModalUserDialog,
  JAe,
  XAe,
  hV,
  DIALOG_REGISTRY,
  YAe,
};
