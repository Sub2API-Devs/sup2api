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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { useCommandQueueOrDefault } from "../../context/QueuedMessageContext.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { FableUsageCreditsConsent } from "../usageCredits/FableUsageCreditsConsent.js";
import { qt, Se, yt, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import {
  parseLocalJsxDialogPayload,
  dialogCueBehindDraft,
  DIALOG_KIND_META,
  dialogWaitingForLabel,
  dialogLayout,
  computerUseApprovalDialogDef,
  costThresholdDialogDef,
  autoModeSetupReviewDialogDef,
  AUTO_MODE_SETUP_FLAGGED_DIALOG,
} from "./dialogKinds.js";
import { useDialogStore, topAutoDialog, topUserDialog } from "../../state/dialogQueue.js";
import { getActiveBottomSurface, useAutoDialogKind } from "../../screens/repl/storeHooks.js";
import {
  NON_BLOCKING_DIALOG_KINDS,
  topBlockingDialog,
  IDE_ONBOARDING_DIALOG,
  LEFT_ARROW_CONFIRM_DIALOG,
  LSP_RECOMMENDATION_DIALOG,
  PLUGIN_HINT_DIALOG,
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
import { ULTRAPLAN_LAUNCH_DIALOG, ULTRAPLAN_CHOICE_DIALOG_SPEC } from "../../commands/ultraplan.js";
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

//@ chunk-18hwfzwa.js:1417159-1420111 placement
/**
 * 对话框种类到懒加载视图组件的映射表。
 */
var LAZY_DIALOG_COMPONENTS = null;
var OPTIONAL_DIALOG_KIND_1 = null;
var WorkflowPermissionDialog = require("./chunk-sycr1qkz.js").WorkflowPermissionDialog;
var workflowPermissionDialog_2 = require("./chunk-vhnfh0m3.js").workflowPermissionDialog;
var OPTIONAL_DIALOG_VIEW_2 = null;
var OPTIONAL_DIALOG_KIND_2 = null;
var OPTIONAL_DIALOG_KIND_3 = null;
var OPTIONAL_DIALOG_VIEW_3 = null;
var OPTIONAL_DIALOG_KIND_4 = null;
var OPTIONAL_DIALOG_VIEW_4 = null;
var ContinueInProjectsPermissionDialog = require("./chunk-6d9n2xk3.js").ContinueInProjectsPermissionDialog;
var optionalProjectContinueChunk = require("./chunk-dkjq625a.js");
var PROJECT_CONTINUE_PERMISSION_DIALOG =
  optionalProjectContinueChunk?.projectContinuePermissionDialog ?? null;
var ContinueInProjectsTargetDialog = require("./chunk-ftzr67d2.js").ContinueInProjectsTargetDialog;
var continueInProjectsTargetDialog = require("./chunk-c7qavzqd.js").continueInProjectsTargetDialog;
var ContinueInProjectsMessageDialog = require("./chunk-kv464nx7.js").ContinueInProjectsMessageDialog;
var continueInProjectsMessageDialog = require("./chunk-j3dac3ab.js").continueInProjectsMessageDialog;
var OPTIONAL_DIALOG_KIND_5 = null;
var OPTIONAL_DIALOG_VIEW_5 = null;
var OPTIONAL_DIALOG_KIND_6 = null;
var OPTIONAL_DIALOG_VIEW_6 = null;
var STARTUP_MODEL_SWITCH_MODULE = null;
var STARTUP_MODEL_SWITCH_VIEW = null;
var IMPORT_REVIEW_OFFER_MODULE = null;
var IMPORT_REVIEW_OFFER_VIEW = null;
var EFFORT_AUTO_NUDGE_MODULE = null;
var EFFORT_AUTO_NUDGE_VIEW = null;
var ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE = null;
var ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW = null;
var ACCOUNT_MEMORY_EVERYWHERE_MODULE = null;
var ACCOUNT_MEMORY_EVERYWHERE_VIEW = null;
var SECRET_PROMPT_MODULE = null;
var SECRET_PROMPT_VIEW = null;
var ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE = null;
var ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW = null;
var SLACK_CONNECT_DIALOGS_MODULE = null;
var SLACK_CONNECT_DIALOG_SPECS = null;
var SLACK_SIGN_IN_OFFER_VIEW = null;
var SLACK_SIGN_IN_OFFER_SPEC = null;
var OPTIONAL_COMPARE_MODELS_VIEW = null;
var OPTIONAL_COMPARE_MODELS_KIND = null;
var OPTIONAL_COMPARE_MODELS_WRAPPER = OPTIONAL_COMPARE_MODELS_VIEW
  ? ({ payload, answer }) =>
      jsxProd_default(OPTIONAL_COMPARE_MODELS_VIEW, {
        left: payload.left,
        right: payload.right,
        mode: {
          optOut: payload.optOut,
          comparesModels: payload.comparesModels,
          hasSeenBoth: payload.hasSeenBoth,
          minTogetherRows: payload.minTogetherRows,
          minPaneRows: payload.minPaneRows,
          onDone: (choice, arrangement) =>
            answer({
              choice,
              arrangement,
            }),
        },
      })
  : null;
var It2SetupDialogView = ({ payload, answer, wouldTakeAnswer }) =>
  jsxProd_default(AgentDetail, {
    tmuxAvailable: payload.tmuxAvailable,
    onDone: answer,
    wouldTakeAnswer,
  });
var ComputerUseApprovalDialogView = ({ payload, answer, wouldTakeAnswer }) =>
  jsxProd_default(ComputerUseApproval, {
    request: payload,
    onDone: answer,
    wouldTakeAnswer,
  });
var CostThresholdDialogView = ({ answer }) =>
  jsxProd_default(CostThresholdDialog, {
    onDone: () => answer("acknowledged"),
  });
var AutocompactOfferDialogView = ({ payload, answer }) =>
  jsxProd_default(AutocompactOfferDialog, {
    payload,
    onDone: answer,
  });
var ServerFallbackNoticeView = ({ payload, answer }) =>
  jsxProd_default(SingleEnvironmentContent, {
    title: payload.title,
    paragraphs: payload.paragraphs,
    onDone: answer,
  });
var ResumeCompactDialogView = ({ payload, answer }) =>
  jsxProd_default(IdleReturnDialog, {
    sessionAgeMinutes: payload.sessionAgeMinutes,
    estimatedTokens: payload.estimatedTokens,
    hasPrecomputedSummary: payload.hasPrecomputedSummary,
    onDone: answer,
  });
var IdleReturnDialogView = ({ payload, answer }) =>
  jsxProd_default(ResumeStaleConversationDialog, {
    inactiveSince: payload.inactiveSince,
    contextTokens: payload.contextTokens,
    percentOfFiveHourLimit: payload.percentOfFiveHourLimit,
    trigger: payload.trigger,
    focusedAction: payload.focusedAction,
    offersLookUp: payload.offersLookUp,
    ask: payload,
    onDone: answer,
  });
var NewerModelOfferDialogView = ({ payload, answer }) =>
  jsxProd_default(NewerModelOfferDialog, {
    offer: payload,
    onDone: answer,
  });
var AutoModeDefaultNudgeDialogView = ({ payload, answer }) =>
  jsxProd_default(AutoModeDefaultNudgeDialog, {
    currentMode: payload.currentMode,
    onDone: answer,
  });
var EffortMediumNudgeDialogView = ({ payload, answer }) =>
  jsxProd_default(EffortMediumNudgeDialog, {
    model: payload.model,
    copy: payload.copy,
    onDone: (choice, optionOrder) =>
      answer({
        choice,
        optionOrder,
      }),
  });
var IdeOnboardingDialogView = ({ payload, answer }) =>
  jsxProd_default(IdeOnboardingDialog, {
    installationStatus: payload.installationStatus,
    onDone: () => answer("dismissed"),
  });
var SandboxNetworkAccessDialogView = ({ payload, answer }) =>
  jsxProd_default(SandboxPermissionRequest, {
    hostPattern: {
      host: payload.host,
      port: payload.port,
    },
    requestSource: payload.forwardedFromWorker
      ? {
          type: "subagent",
          agentName: payload.workerName,
        }
      : undefined,
    onUserResponse: answer,
  });
var LeftArrowConfirmDialogView = ({ payload, answer }) =>
  jsxProd_default(BackgroundConfirmDialog, {
    summary: payload.summary,
    carryOverCount: payload.carryOverCount,
    monitorParkCount: payload.monitorParkCount,
    workflowAgents: payload.workflowAgents,
    onConfirm: () => answer("confirm"),
    onCancel: () => answer("stay"),
  });
var LspRecommendationDialogView = ({ payload, answer }) =>
  jsxProd_default(LspRecommendationMenu, {
    pluginName: payload.pluginName,
    pluginDescription: payload.pluginDescription,
    marketplaceName: payload.marketplaceName,
    fileExtension: payload.fileExtension,
    onResponse: answer,
  });
var PluginHintMenuDialogView = ({ payload, answer }) =>
  jsxProd_default(PluginHintMenu, {
    pluginName: payload.pluginName,
    pluginDescription: payload.pluginDescription,
    marketplaceName: payload.marketplaceName,
    sourceCommand: payload.sourceCommand,
    onResponse: answer,
  });
//@ chunk-18hwfzwa.js:1420111-1420385 placement
function RemoteCalloutDialog(props) {
  let $ = w(4);
  let { answer } = props;
  let refusableAnswer = useRefusableAnswer(answer);
  const L = `remote-callout-${refusableAnswer.attempts}`;
  const defaultFocusValue = refusableAnswer.refused ?? undefined;
  let Re;
  if ($[0] !== refusableAnswer.answer || $[1] !== L || $[2] !== defaultFocusValue) {
    Re = jsxProd_default(
      RemoteCallout,
      {
        defaultFocusValue,
        onDone: refusableAnswer.answer,
      },
      L,
    );
    $[0] = refusableAnswer.answer;
    $[1] = L;
    $[2] = defaultFocusValue;
    $[3] = Re;
  } else Re = $[3];
  return Re;
}
//@ chunk-18hwfzwa.js:1420385-1421497 placement
/**
 * 四个对话框视图：UltraplanChoiceDialog、McpElicitationDialog、McpElicitationWaitingDialog、McpUrlElicitationDialog。
 */
var ultraplanLaunchDialogView = ({ payload, answer, wouldTakeAnswer }) =>
  jsxProd_default(UltraplanLaunchDialog, {
    promptIdentifier: payload.promptIdentifier,
    showTerms: payload.showTerms,
    prompt: payload.prompt,
    deliveredByRelay: payload.deliveredByRelay,
    onDone: answer,
    wouldTakeAnswer,
  });
var UltraplanChoiceDialogView = ({ payload, answer }) =>
  jsxProd_default(UltraplanChoiceDialog, {
    plan: payload.plan,
    onDone: answer,
  });
var ManagedSettingsSecurityDialogView = ({ payload, answer, wouldTakeAnswer }) =>
  jsxProd_default(ManagedSettingsSecurityDialogHost, {
    settings: payload.settings,
    baseline: payload.baseline,
    reveal: payload.reveal,
    onAccept: () => answer("approved"),
    onReject: () => answer("rejected"),
    wouldTakeAnswer,
  });
var McpElicitationDialogView = ({ payload, answer, wouldTakeAnswer }) =>
  jsxProd_default(ElicitationDialog, {
    serverName: payload.serverName,
    pluginSource: payload.pluginSource,
    params: payload.params,
    onResponse: (action, content) =>
      answer({
        action,
        content,
      }),
    userConfirmsCompletion: payload.userConfirmsCompletion,
    wouldTakeAnswer,
  });
var McpElicitationWaitingDialogView = ({ payload, answer }) =>
  jsxProd_default(ElicitationDialog, {
    serverName: payload.serverName,
    params: payload.params,
    waitingState: payload.waitingState,
    initialPhase: "waiting",
    onResponse: () => false,
    onWaitingDismiss: (D) => {
      answer(D);
    },
  });
var McpUrlElicitationDialogView = ({ payload, answer }) =>
  jsxProd_default(ElicitationDialog, {
    serverName: payload.serverName,
    params: payload.params,
    waitingState: {
      actionLabel: "Retry now",
      showCancel: true,
    },
    onResponse: (D, content) => {
      if (D === "accept") return;
      return answer({
        action: D,
        content,
      });
    },
    onWaitingDismiss: (D) => {
      answer({
        action: D === "retry" ? "accept" : "cancel",
      });
    },
  });
//@ chunk-18hwfzwa.js:1421497-1422258 placement
function FastModeConsentDialogView(props) {
  let $ = w(9);
  let { payload, answer, wouldTakeAnswer } = props;
  let { addNotification } = useNotifications();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let onDone;
  if ($[0] !== addNotification || $[1] !== answer || $[2] !== commandQueueOrDefault) {
    onDone = (He, We) => {
      let ze = answer(He === "consent" ? "consent" : He === "switch" ? "switch_default" : "cancelled");
      if (ze && We !== undefined)
        addNotification({
          kind: "feedback",
          key: "fable-consent-result",
          text: We,
          priority: "high",
        });
      if (ze && He === "upgrade")
        commandQueueOrDefault.enqueue({
          agentId: mainAgentId(),
          value: "/upgrade",
          mode: "task-notification",
          origin: {
            kind: "task-notification",
          },
        });
      return ze;
    };
    $[0] = addNotification;
    $[1] = answer;
    $[2] = commandQueueOrDefault;
    $[3] = onDone;
  } else onDone = $[3];
  let Xe;
  if ($[4] !== payload.model || $[5] !== payload.modelName || $[6] !== onDone || $[7] !== wouldTakeAnswer) {
    Xe = jsxProd_default(FableUsageCreditsConsent, {
      variant: "mid-session",
      modelName: payload.modelName,
      model: payload.model,
      wouldTakeAnswer,
      onDone,
    });
    $[4] = payload.model;
    $[5] = payload.modelName;
    $[6] = onDone;
    $[7] = wouldTakeAnswer;
    $[8] = Xe;
  } else Xe = $[8];
  return Xe;
}
//@ chunk-18hwfzwa.js:1422258-1422274 placement
var LOCAL_JSX_REGISTRY_CONTEXT = qt(null);
//@ chunk-18hwfzwa.js:1422274-1422543 placement
function LocalJsxDialog(props) {
  let $ = w(2);
  let { payload } = props;
  let D = Se(LOCAL_JSX_REGISTRY_CONTEXT);
  if (!D) {
    throw ReferenceError("A local_jsx dialog cannot render outside of a LocalJsxRegistryContext provider");
  }
  let ee;
  if ($[0] !== payload.nodeId) {
    ee = (ke) => ke.get(payload.nodeId) ?? null;
    $[0] = payload.nodeId;
    $[1] = ee;
  } else ee = $[1];
  return useStoreSelector(D, ee);
}
//@ chunk-18hwfzwa.js:1422543-1422592 placement
var LOCAL_JSX_PROMPT_VISIBILITY = {
  [LOCAL_JSX_DIALOG.kind]: (h) => parseLocalJsxDialogPayload(h)?.hidesPrompt === false,
};
//@ chunk-18hwfzwa.js:1422592-1422644 placement
function isLocalJsxPromptVisible(h) {
  return LOCAL_JSX_PROMPT_VISIBILITY[h.kind]?.(h.payload) ?? false;
}
//@ chunk-18hwfzwa.js:1422644-1422846 placement
function useHasBlockingDialog() {
  let $ = w(3);
  let dialogStore = useDialogStore();
  let x = getActiveBottomSurface() !== null;
  let L;
  if ($[0] !== dialogStore || $[1] !== x) {
    L = () => {
      let state = dialogStore.getState();
      return hasVisibleUserDialog(state) || (!x && topAutoDialog(state) !== null);
    };
    $[0] = dialogStore;
    $[1] = x;
    $[2] = L;
  } else L = $[2];
  let ke = L;
  return yt(dialogStore.subscribe, ke, ke);
}
//@ chunk-18hwfzwa.js:1422846-1422976 placement
function useHasOpenDialog() {
  let $ = w(2);
  let dialogStore = useDialogStore();
  let D;
  if ($[0] !== dialogStore) {
    D = () => hasVisibleUserDialog(dialogStore.getState());
    $[0] = dialogStore;
    $[1] = D;
  } else D = $[1];
  let L = D;
  return yt(dialogStore.subscribe, L, L);
}
//@ chunk-18hwfzwa.js:1422976-1423029 placement
function hasVisibleUserDialog(h) {
  let x = topUserDialog(h);
  return x !== null && !isLocalJsxPromptVisible(x);
}
//@ chunk-18hwfzwa.js:1423029-1423107 placement
function hasNonBlockingAutoDialog(state) {
  return state.open.some((x) => x.userInvoked !== true && !NON_BLOCKING_DIALOG_KINDS.has(x.kind));
}
//@ chunk-18hwfzwa.js:1423107-1423180 placement
function hasAutoDialogWithoutMeta(h) {
  return hasNonBlockingAutoDialog({
    open: h.open.filter((x) => dialogCueBehindDraft(DIALOG_KIND_META, x) === undefined),
  });
}
//@ chunk-18hwfzwa.js:1423180-1423238 placement
function isDialogKindBlocking(h, x) {
  let D = x ? topBlockingDialog(h) : topAutoDialog(h);
  return dialogWaitingForLabel(D?.kind);
}
//@ chunk-18hwfzwa.js:1423238-1423398 placement
function useHasModalDialog() {
  let $ = w(3);
  let dialogStore = useDialogStore();
  let renderMode = useRenderMode();
  let L;
  if ($[0] !== renderMode || $[1] !== dialogStore) {
    L = () => hasModalDialog(dialogStore.getState(), renderMode);
    $[0] = renderMode;
    $[1] = dialogStore;
    $[2] = L;
  } else L = $[2];
  let ee = L;
  return yt(dialogStore.subscribe, ee, ee);
}
//@ chunk-18hwfzwa.js:1423398-1423721 placement
/**
 * 判断当前是否有以模态方式显示的用户对话框（对话框存储或本地 JSX 命令）。
 */
function useHasModalUserDialog() {
  let $ = w(6);
  let dialogStore = useDialogStore();
  let renderMode = useRenderMode();
  let autoDialogKind = useAutoDialogKind();
  let ee;
  if ($[0] !== renderMode || $[1] !== dialogStore) {
    ee = () => {
      let ke = topUserDialog(dialogStore.getState());
      return ke !== null && dialogLayout(DIALOG_KIND_META, ke, renderMode) === "modal";
    };
    $[0] = renderMode;
    $[1] = dialogStore;
    $[2] = ee;
  } else ee = $[2];
  let Re = ee;
  let Be = yt(dialogStore.subscribe, Re, Re);
  let He;
  if ($[3] !== renderMode || $[4] !== autoDialogKind) {
    He = autoDialogKind !== null && dialogLayout(DIALOG_KIND_META, autoDialogKind, renderMode) === "modal";
    $[3] = renderMode;
    $[4] = autoDialogKind;
    $[5] = He;
  } else He = $[5];
  return He || Be;
}
//@ chunk-18hwfzwa.js:1423721-1423830 placement
function hasModalDialog(state, renderMode) {
  let D = topAutoDialog(state);
  let L = topUserDialog(state);
  return (
    (D !== null && dialogLayout(DIALOG_KIND_META, D, renderMode) === "modal") ||
    (L !== null && dialogLayout(DIALOG_KIND_META, L, renderMode) === "modal")
  );
}
//@ chunk-18hwfzwa.js:1423830-1423866 placement
function dialogEntry(h, x) {
  return {
    [h.kind]: x,
  };
}
//@ chunk-18hwfzwa.js:1423866-1425369 placement
/**
 * 对话框注册表：每个 kind 的定义对象经 gl(def, Component) 注册到这里，DialogHost 按 kind 查组件渲染；部分 kind 由可选 chunk 提供。
 */
var DIALOG_REGISTRY = {
  ...dialogEntry(LOCAL_JSX_DIALOG, LocalJsxDialog),
  ...dialogEntry(IT2_SETUP_DIALOG, It2SetupDialogView),
  ...dialogEntry(computerUseApprovalDialogDef, ComputerUseApprovalDialogView),
  ...dialogEntry(costThresholdDialogDef, CostThresholdDialogView),
  ...dialogEntry(AUTOCOMPACT_OFFER_DIALOG, AutocompactOfferDialogView),
  ...dialogEntry(serverFallbackNoticeSpec, ServerFallbackNoticeView),
  ...dialogEntry(RESUME_COMPACT_DIALOG, ResumeCompactDialogView),
  ...dialogEntry(idleReturnDialogDef, IdleReturnDialogView),
  ...dialogEntry(resumeOnNewerModelDialogDef, NewerModelOfferDialogView),
  ...dialogEntry(managedSettingsSecurityDialogDef, ManagedSettingsSecurityDialogView),
  ...dialogEntry(IDE_ONBOARDING_DIALOG, IdeOnboardingDialogView),
  ...dialogEntry(sandboxNetworkAccessDialogDef, SandboxNetworkAccessDialogView),
  ...dialogEntry(LEFT_ARROW_CONFIRM_DIALOG, LeftArrowConfirmDialogView),
  ...dialogEntry(REMOTE_CALLOUT_DIALOG, RemoteCalloutDialog),
  ...dialogEntry(ULTRAPLAN_LAUNCH_DIALOG, ultraplanLaunchDialogView),
  ...dialogEntry(ULTRAPLAN_CHOICE_DIALOG_SPEC, UltraplanChoiceDialogView),
  ...dialogEntry(LSP_RECOMMENDATION_DIALOG, LspRecommendationDialogView),
  ...dialogEntry(PLUGIN_HINT_DIALOG, PluginHintMenuDialogView),
  ...dialogEntry(AUTO_DEFAULT_NUDGE_DIALOG, AutoModeDefaultNudgeDialogView),
  ...dialogEntry(effortMediumNudgeDialogDef, EffortMediumNudgeDialogView),
  ...dialogEntry(FULLSCREEN_UPSELL_DIALOG, FullscreenUpsellDialog),
  ...(STARTUP_MODEL_SWITCH_MODULE && STARTUP_MODEL_SWITCH_VIEW
    ? dialogEntry(STARTUP_MODEL_SWITCH_MODULE.startupModelSwitchDialog, STARTUP_MODEL_SWITCH_VIEW)
    : {}),
  ...(IMPORT_REVIEW_OFFER_MODULE && IMPORT_REVIEW_OFFER_VIEW
    ? dialogEntry(IMPORT_REVIEW_OFFER_MODULE.importReviewOfferDialog, IMPORT_REVIEW_OFFER_VIEW)
    : {}),
  ...(EFFORT_AUTO_NUDGE_MODULE && EFFORT_AUTO_NUDGE_VIEW
    ? dialogEntry(EFFORT_AUTO_NUDGE_MODULE.effortAutoNudgeDialog, EFFORT_AUTO_NUDGE_VIEW)
    : {}),
  ...(ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE && ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW
    ? dialogEntry(
        ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE.accountMemoryEditConfirmDialog,
        ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW,
      )
    : {}),
  ...(ACCOUNT_MEMORY_EVERYWHERE_MODULE && ACCOUNT_MEMORY_EVERYWHERE_VIEW
    ? dialogEntry(
        ACCOUNT_MEMORY_EVERYWHERE_MODULE.accountMemoryEverywhereConfirmDialog,
        ACCOUNT_MEMORY_EVERYWHERE_VIEW,
      )
    : {}),
  ...(SECRET_PROMPT_MODULE && SECRET_PROMPT_VIEW
    ? dialogEntry(SECRET_PROMPT_MODULE.secretPromptDialog, SECRET_PROMPT_VIEW)
    : {}),
  ...(ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE && ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW
    ? dialogEntry(
        ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE.accountMemoryWritePermissionDialog,
        ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW,
      )
    : {}),
  ...dialogEntry(MCP_ELICITATION_DIALOG, McpElicitationDialogView),
  ...dialogEntry(MCP_ELICITATION_WAITING_DIALOG, McpElicitationWaitingDialogView),
  ...dialogEntry(MCP_URL_ELICITATION_DIALOG, McpUrlElicitationDialogView),
  ...dialogEntry(PERMISSION_PROMPT_DIALOG, FallbackPermissionRequest),
  ...dialogEntry(WEBFETCH_PERMISSION_CARD, WebFetchPermissionRequest),
  ...dialogEntry(SKILL_PERMISSION_CARD, SkillUsePermissionDialog),
  ...dialogEntry(POWERSHELL_PERMISSION_CARD, PowerShellPermissionRequest),
  ...dialogEntry(FILE_PERMISSION_CARD, FilePermissionDialog),
  ...dialogEntry(ASK_USER_QUESTION_PERMISSION_CARD, AskUserQuestionPermissionRequest),
  ...dialogEntry(ENTER_PLAN_MODE_PERMISSION_CARD, EnterPlanModePermissionRequest),
  ...dialogEntry(PUBLISH_PLUGIN_PERMISSION_CARD, FolderAccessPermissionRequest),
  ...dialogEntry(GOAL_PROPOSAL_DIALOG, GoalProposalPermissionRequest),
  ...dialogEntry(EXIT_PLAN_MODE_V2_PERMISSION_CARD, ExitPlanModePermissionRequest),
  ...dialogEntry(MONITOR_PERMISSION_CARD, SkillPermissionRequest),
  ...dialogEntry(BASH_PERMISSION_CARD, BashPermissionRequestInner),
  ...dialogEntry(REFUSAL_FALLBACK_DIALOG, ModelRefusalPausedDialog),
  ...dialogEntry(FABLE_OVERAGE_CONSENT_DIALOG, FastModeConsentDialogView),
  ...dialogEntry(BROWSER_PERMISSION_CARD, ChromePermissionRequest),
  ...dialogEntry(peerInboundApprovalDialogDef, PeerMessageApproval),
  ...dialogEntry(CHROME_INSTALL_UPSELL_DIALOG, ChromeSetupDialog),
  ...dialogEntry(CHROME_INSTALL_SETUP_DIALOG, ChromeInstallFlow),
  ...(OPTIONAL_DIALOG_VIEW_2 && OPTIONAL_DIALOG_KIND_2
    ? dialogEntry(OPTIONAL_DIALOG_KIND_2, OPTIONAL_DIALOG_VIEW_2)
    : {}),
  ...(OPTIONAL_DIALOG_KIND_3 && OPTIONAL_DIALOG_VIEW_3
    ? dialogEntry(OPTIONAL_DIALOG_VIEW_3, OPTIONAL_DIALOG_KIND_3)
    : {}),
  ...(OPTIONAL_DIALOG_KIND_4 && OPTIONAL_DIALOG_VIEW_4
    ? dialogEntry(OPTIONAL_DIALOG_VIEW_4, OPTIONAL_DIALOG_KIND_4)
    : {}),
  ...(LAZY_DIALOG_COMPONENTS && OPTIONAL_DIALOG_KIND_1
    ? dialogEntry(OPTIONAL_DIALOG_KIND_1, LAZY_DIALOG_COMPONENTS)
    : {}),
  ...dialogEntry(workflowPermissionDialog_2, WorkflowPermissionDialog),
  ...(ContinueInProjectsPermissionDialog && PROJECT_CONTINUE_PERMISSION_DIALOG
    ? dialogEntry(PROJECT_CONTINUE_PERMISSION_DIALOG, ContinueInProjectsPermissionDialog)
    : {}),
  ...(ContinueInProjectsTargetDialog && continueInProjectsTargetDialog
    ? dialogEntry(continueInProjectsTargetDialog, ContinueInProjectsTargetDialog)
    : {}),
  ...(ContinueInProjectsMessageDialog && continueInProjectsMessageDialog
    ? dialogEntry(continueInProjectsMessageDialog, ContinueInProjectsMessageDialog)
    : {}),
  ...(OPTIONAL_DIALOG_KIND_5 && OPTIONAL_DIALOG_VIEW_5
    ? dialogEntry(OPTIONAL_DIALOG_VIEW_5, OPTIONAL_DIALOG_KIND_5)
    : {}),
  ...(OPTIONAL_DIALOG_KIND_6 && OPTIONAL_DIALOG_VIEW_6
    ? dialogEntry(OPTIONAL_DIALOG_VIEW_6, OPTIONAL_DIALOG_KIND_6)
    : {}),
  ...(SLACK_CONNECT_DIALOGS_MODULE && SLACK_CONNECT_DIALOG_SPECS
    ? Object.assign(
        {},
        ...SLACK_CONNECT_DIALOG_SPECS.slackConnectDialogs.map((slackConnectDialog) =>
          dialogEntry(slackConnectDialog, SLACK_CONNECT_DIALOGS_MODULE.SlackConnectConsentDialog),
        ),
      )
    : {}),
  ...(SLACK_SIGN_IN_OFFER_VIEW && SLACK_SIGN_IN_OFFER_SPEC
    ? dialogEntry(
        SLACK_SIGN_IN_OFFER_SPEC.slackSignInOfferDialog,
        SLACK_SIGN_IN_OFFER_VIEW.SlackSignInOfferDialog,
      )
    : {}),
  ...(OPTIONAL_COMPARE_MODELS_KIND && OPTIONAL_COMPARE_MODELS_WRAPPER
    ? dialogEntry(OPTIONAL_COMPARE_MODELS_KIND, OPTIONAL_COMPARE_MODELS_WRAPPER)
    : {}),
  ...dialogEntry(autoModeSetupReviewDialogDef, autoModeSetupReviewDialog),
  ...dialogEntry(AUTO_MODE_SETUP_FLAGGED_DIALOG, autoModeSetupFlaggedDialog),
};
//@ chunk-18hwfzwa.js:1425369-1425373 placement
init_react_production();
export {
  useHasOpenDialog,
  useHasBlockingDialog,
  useHasModalDialog,
  useHasModalUserDialog,
  hasAutoDialogWithoutMeta,
  isDialogKindBlocking,
  LOCAL_JSX_REGISTRY_CONTEXT,
  DIALOG_REGISTRY,
  hasNonBlockingAutoDialog,
};
