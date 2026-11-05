/**
 * components/dialogs/registry.tsx
 *
 * 2.1.316 新增。对话框种类到视图组件的注册表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  createContext,
  useContext,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentDetail } from "../agents/AgentDetail.js";
import { ComputerUseApproval } from "../permissions/ComputerUseApproval/ComputerUseApproval.js";
import { CostThresholdDialog } from "../CostThresholdDialog.js";
import { AutocompactOfferDialog } from "../AutocompactOfferDialog.js";
import { SingleEnvironmentContent } from "../RemoteEnvironmentDialog.js";
import { IdleReturnDialog } from "../IdleReturnDialog.js";
import { ResumeStaleConversationDialog } from "../ResumeStaleConversationDialog.js";
import { NewerModelOfferDialog } from "../NewerModelOfferDialog.js";
import { AutoModeDefaultNudgeDialog } from "../permissions/rules/AddWorkspaceDirectory.js";
import { EffortMediumNudgeDialog } from "../EffortMediumNudgeDialog.js";
import { DesktopUpsellStartup } from "../DesktopUpsell/DesktopUpsellStartup.js";
import { IdeOnboardingDialog } from "../IdeOnboardingDialog.js";
import { SandboxPermissionRequest } from "../permissions/SandboxPermissionRequest.js";
import { BackgroundConfirmDialog } from "../../screens/repl/backgroundConfirm.js";
import { LspRecommendationMenu } from "../LspRecommendation/LspRecommendationMenu.js";
import { PluginHintMenu } from "../ClaudeCodeHint/PluginHintMenu.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { managedSettingsSecurityDialogDef, useCaseSpec } from "../../screens/repl/StartupNudges.js";
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
import { ConnectorFileSendPermissionView } from "./PermissionPromptDialog.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1452044-1452048 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1452044", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1456235-1459594 placement
/**
 * 对话框种类到懒加载视图组件的映射表。
 */
var LAZY_DIALOG_COMPONENTS; // deferred: loads other modules while loading; runs once its import cycle is complete
var OPTIONAL_DIALOG_KIND_1;
var WorkflowPermissionDialog;
var workflowPermissionDialog_2;
var OPTIONAL_DIALOG_VIEW_2;
var OPTIONAL_DIALOG_KIND_2;
var OPTIONAL_DIALOG_KIND_3;
var OPTIONAL_DIALOG_VIEW_3;
var OPTIONAL_DIALOG_KIND_4;
var OPTIONAL_DIALOG_VIEW_4;
var ContinueInProjectsPermissionDialog;
var optionalProjectContinueChunk;
var PROJECT_CONTINUE_PERMISSION_DIALOG;
var ContinueInProjectsTargetDialog;
var continueInProjectsTargetDialog;
var ContinueInProjectsMessageDialog;
var continueInProjectsMessageDialog;
var ContinueInProjectsRemoteControlDialog;
var continueInProjectsRemoteControlDialog;
var ContinueInProjectsComposeDialog;
var continueInProjectsComposeDialog;
var OPTIONAL_DIALOG_KIND_5;
var OPTIONAL_DIALOG_VIEW_5;
var OPTIONAL_DIALOG_KIND_6;
var OPTIONAL_DIALOG_VIEW_6;
var STARTUP_MODEL_SWITCH_MODULE;
var STARTUP_MODEL_SWITCH_VIEW;
var IMPORT_REVIEW_OFFER_MODULE;
var IMPORT_REVIEW_OFFER_VIEW;
var EFFORT_AUTO_NUDGE_MODULE;
var EFFORT_AUTO_NUDGE_VIEW;
var ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE;
var ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW;
var ACCOUNT_MEMORY_EVERYWHERE_MODULE;
var ACCOUNT_MEMORY_EVERYWHERE_VIEW;
var SECRET_PROMPT_MODULE;
var SECRET_PROMPT_VIEW;
var ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE;
var ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW;
var SLACK_CONNECT_DIALOGS_MODULE;
var SLACK_CONNECT_DIALOG_SPECS;
var SLACK_SIGN_IN_OFFER_VIEW;
var SLACK_SIGN_IN_OFFER_SPEC;
var OPTIONAL_COMPARE_MODELS_KIND;
var HOME_PAGE;
var OPTIONAL_COMPARE_MODELS_VIEW;
var STATE_ROW_SOURCE_CONTEXT;
var OPTIONAL_COMPARE_MODELS_WRAPPER;
var It2SetupDialogView;
var ComputerUseApprovalDialogView;
var CostThresholdDialogView;
var AutocompactOfferDialogView;
var ServerFallbackNoticeView;
var ResumeCompactDialogView;
var IdleReturnDialogView;
var NewerModelOfferDialogView;
var AutoModeDefaultNudgeDialogView;
var EffortMediumNudgeDialogView;
var DesktopUpsellStartupView;
var IdeOnboardingDialogView;
var SandboxNetworkAccessDialogView;
var LeftArrowConfirmDialogView;
var LspRecommendationDialogView;
var PluginHintMenuDialogView;
deferInit("chunk-czq1j3j2.js:1456235", () => {
  LAZY_DIALOG_COMPONENTS = null;
  OPTIONAL_DIALOG_KIND_1 = null;
  WorkflowPermissionDialog = require("../permissions/WorkflowPermissionDialog.js").WorkflowPermissionDialog;
  workflowPermissionDialog_2 = require("./workflowPermissionDialog.lazy.js").workflowPermissionDialog;
  OPTIONAL_DIALOG_VIEW_2 = null;
  OPTIONAL_DIALOG_KIND_2 = null;
  OPTIONAL_DIALOG_KIND_3 = null;
  OPTIONAL_DIALOG_VIEW_3 = null;
  OPTIONAL_DIALOG_KIND_4 = null;
  OPTIONAL_DIALOG_VIEW_4 = null;
  ContinueInProjectsPermissionDialog =
    require("../sendToProject/ContinueInProjectsPermissionDialog.lazy.js").ContinueInProjectsPermissionDialog;
  optionalProjectContinueChunk = require("../../tools/ContinueInProjectsTool/CONTINUE_NOTIFICATION.lazy.js");
  PROJECT_CONTINUE_PERMISSION_DIALOG = optionalProjectContinueChunk?.projectContinuePermissionDialog ?? null;
  ContinueInProjectsTargetDialog =
    require("../projects/ContinueInProjectsTargetDialog.js").ContinueInProjectsTargetDialog;
  continueInProjectsTargetDialog =
    require("../projects/continueInProjectsTargetRequest.js").continueInProjectsTargetDialog;
  ContinueInProjectsMessageDialog =
    require("../projects/ContinueInProjectsMessageDialog.js").ContinueInProjectsMessageDialog;
  continueInProjectsMessageDialog =
    require("../projects/messageRevealConfirm.js").continueInProjectsMessageDialog;
  ContinueInProjectsRemoteControlDialog =
    require("../../commands/tag/ContinueInProjectsRemoteControlDialog.lazy.js").ContinueInProjectsRemoteControlDialog;
  continueInProjectsRemoteControlDialog =
    require("../../commands/send-to-project/remoteControlOffRequest.js").continueInProjectsRemoteControlDialog;
  ContinueInProjectsComposeDialog =
    require("../agents/new-agent-creation/wizard-steps/ContinueInProjectsComposeDialog.lazy.js").ContinueInProjectsComposeDialog;
  continueInProjectsComposeDialog =
    require("../projects/continueInProjectsComposeRequest.js").continueInProjectsComposeDialog;
  OPTIONAL_DIALOG_KIND_5 = null;
  OPTIONAL_DIALOG_VIEW_5 = null;
  OPTIONAL_DIALOG_KIND_6 = null;
  OPTIONAL_DIALOG_VIEW_6 = null;
  STARTUP_MODEL_SWITCH_MODULE = null;
  STARTUP_MODEL_SWITCH_VIEW = null;
  IMPORT_REVIEW_OFFER_MODULE = null;
  IMPORT_REVIEW_OFFER_VIEW = null;
  EFFORT_AUTO_NUDGE_MODULE = null;
  EFFORT_AUTO_NUDGE_VIEW = null;
  ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE = null;
  ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW = null;
  ACCOUNT_MEMORY_EVERYWHERE_MODULE = null;
  ACCOUNT_MEMORY_EVERYWHERE_VIEW = null;
  SECRET_PROMPT_MODULE = null;
  SECRET_PROMPT_VIEW = null;
  ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE = null;
  ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW = null;
  SLACK_CONNECT_DIALOGS_MODULE = null;
  SLACK_CONNECT_DIALOG_SPECS = null;
  SLACK_SIGN_IN_OFFER_VIEW = null;
  SLACK_SIGN_IN_OFFER_SPEC = null;
  OPTIONAL_COMPARE_MODELS_KIND = null;
  HOME_PAGE = null;
  OPTIONAL_COMPARE_MODELS_VIEW = null;
  STATE_ROW_SOURCE_CONTEXT = null;
  OPTIONAL_COMPARE_MODELS_WRAPPER = OPTIONAL_COMPARE_MODELS_VIEW
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
  It2SetupDialogView = ({ payload, answer, wouldTakeAnswer }) =>
    jsxProd_default(AgentDetail, {
      tmuxAvailable: payload.tmuxAvailable,
      onDone: answer,
      wouldTakeAnswer,
    });
  ComputerUseApprovalDialogView = ({ payload, answer, wouldTakeAnswer }) =>
    jsxProd_default(ComputerUseApproval, {
      request: payload,
      onDone: answer,
      wouldTakeAnswer,
    });
  CostThresholdDialogView = ({ answer }) =>
    jsxProd_default(CostThresholdDialog, {
      onDone: () => answer("acknowledged"),
    });
  AutocompactOfferDialogView = ({ payload, answer }) =>
    jsxProd_default(AutocompactOfferDialog, {
      payload,
      onDone: answer,
    });
  ServerFallbackNoticeView = ({ payload, answer }) =>
    jsxProd_default(SingleEnvironmentContent, {
      title: payload.title,
      paragraphs: payload.paragraphs,
      onDone: answer,
    });
  ResumeCompactDialogView = ({ payload, answer }) =>
    jsxProd_default(IdleReturnDialog, {
      sessionAgeMinutes: payload.sessionAgeMinutes,
      estimatedTokens: payload.estimatedTokens,
      hasPrecomputedSummary: payload.hasPrecomputedSummary,
      onDone: answer,
    });
  IdleReturnDialogView = ({ payload, answer }) =>
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
  NewerModelOfferDialogView = ({ payload, answer }) =>
    jsxProd_default(NewerModelOfferDialog, {
      offer: payload,
      onDone: answer,
    });
  AutoModeDefaultNudgeDialogView = ({ payload, answer }) =>
    jsxProd_default(AutoModeDefaultNudgeDialog, {
      currentMode: payload.currentMode,
      onDone: answer,
    });
  EffortMediumNudgeDialogView = ({ payload, answer }) =>
    jsxProd_default(EffortMediumNudgeDialog, {
      model: payload.model,
      copy: payload.copy,
      onDone: (choice, optionOrder) =>
        answer({
          choice,
          optionOrder,
        }),
    });
  DesktopUpsellStartupView = ({ payload, answer }) =>
    jsxProd_default(DesktopUpsellStartup, {
      choices: payload.choices,
      onDone: (id) =>
        answer({
          id,
        }),
      onDismiss: () => void answer("cancelled"),
    });
  IdeOnboardingDialogView = ({ payload, answer }) =>
    jsxProd_default(IdeOnboardingDialog, {
      installationStatus: payload.installationStatus,
      onDone: () => answer("dismissed"),
    });
  SandboxNetworkAccessDialogView = ({ payload, answer }) =>
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
  LeftArrowConfirmDialogView = ({ payload, answer }) =>
    jsxProd_default(BackgroundConfirmDialog, {
      summary: payload.summary,
      carryOverCount: payload.carryOverCount,
      monitorParkCount: payload.monitorParkCount,
      workflowAgents: payload.workflowAgents,
      onConfirm: () => answer("confirm"),
      onCancel: () => answer("stay"),
    });
  LspRecommendationDialogView = ({ payload, answer }) =>
    jsxProd_default(LspRecommendationMenu, {
      pluginName: payload.pluginName,
      pluginDescription: payload.pluginDescription,
      marketplaceName: payload.marketplaceName,
      fileExtension: payload.fileExtension,
      onResponse: answer,
    });
  PluginHintMenuDialogView = ({ payload, answer }) =>
    jsxProd_default(PluginHintMenu, {
      pluginName: payload.pluginName,
      pluginDescription: payload.pluginDescription,
      marketplaceName: payload.marketplaceName,
      sourceCommand: payload.sourceCommand,
      onResponse: answer,
    });
});
//@ chunk-czq1j3j2.js:1459594-1459868 placement
function RemoteCalloutDialog(props) {
  let $ = useMemoCache(4);
  let { answer } = props;
  let refusableAnswer = useRefusableAnswer(answer);
  const rowKey = `remote-callout-${refusableAnswer.attempts}`;
  const defaultFocusValue = refusableAnswer.refused ?? undefined;
  let dialog;
  if ($[0] !== refusableAnswer.answer || $[1] !== rowKey || $[2] !== defaultFocusValue) {
    dialog = jsxProd_default(
      RemoteCallout,
      {
        defaultFocusValue,
        onDone: refusableAnswer.answer,
      },
      rowKey,
    );
    $[0] = refusableAnswer.answer;
    $[1] = rowKey;
    $[2] = defaultFocusValue;
    $[3] = dialog;
  } else dialog = $[3];
  return dialog;
}
//@ chunk-czq1j3j2.js:1459868-1460980 placement
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
    onWaitingDismiss: (dismissValue) => {
      answer(dismissValue);
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
    onResponse: (action, content) => {
      if (action === "accept") return;
      return answer({
        action,
        content,
      });
    },
    onWaitingDismiss: (dismissValue) => {
      answer({
        action: dismissValue === "retry" ? "accept" : "cancel",
      });
    },
  });
//@ chunk-czq1j3j2.js:1460980-1461741 placement
function FastModeConsentDialogView(props) {
  let $ = useMemoCache(9);
  let { payload, answer, wouldTakeAnswer } = props;
  let { addNotification } = useNotifications();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let onDone;
  if ($[0] !== addNotification || $[1] !== answer || $[2] !== commandQueueOrDefault) {
    onDone = (choice, notice) => {
      let taken = answer(
        choice === "consent" ? "consent" : choice === "switch" ? "switch_default" : "cancelled",
      );
      if (taken && notice !== undefined)
        addNotification({
          kind: "feedback",
          key: "fable-consent-result",
          text: notice,
          priority: "high",
        });
      if (taken && choice === "upgrade")
        commandQueueOrDefault.enqueue({
          agentId: mainAgentId(),
          value: "/upgrade",
          mode: "task-notification",
          origin: {
            kind: "task-notification",
          },
        });
      return taken;
    };
    $[0] = addNotification;
    $[1] = answer;
    $[2] = commandQueueOrDefault;
    $[3] = onDone;
  } else onDone = $[3];
  let dialog;
  if ($[4] !== payload.model || $[5] !== payload.modelName || $[6] !== onDone || $[7] !== wouldTakeAnswer) {
    dialog = jsxProd_default(FableUsageCreditsConsent, {
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
    $[8] = dialog;
  } else dialog = $[8];
  return dialog;
}
//@ chunk-czq1j3j2.js:1461741-1461757 placement
var LOCAL_JSX_REGISTRY_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1461741", () => {
  LOCAL_JSX_REGISTRY_CONTEXT = createContext(null);
});
//@ chunk-czq1j3j2.js:1461757-1462026 placement
function LocalJsxDialog(props) {
  let $ = useMemoCache(2);
  let { payload } = props;
  let registryStore = useContext(LOCAL_JSX_REGISTRY_CONTEXT);
  if (!registryStore) {
    throw ReferenceError("A local_jsx dialog cannot render outside of a LocalJsxRegistryContext provider");
  }
  let selector;
  if ($[0] !== payload.nodeId) {
    selector = (registry) => registry.get(payload.nodeId) ?? null;
    $[0] = payload.nodeId;
    $[1] = selector;
  } else selector = $[1];
  return useStoreSelector(registryStore, selector);
}
//@ chunk-czq1j3j2.js:1462026-1462075 placement
var LOCAL_JSX_PROMPT_VISIBILITY; // deferred: uses LOCAL_JSX_DIALOG (../../commands/rate-limit-options/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1462026", () => {
  LOCAL_JSX_PROMPT_VISIBILITY = {
    [LOCAL_JSX_DIALOG.kind]: (payload) => parseLocalJsxDialogPayload(payload)?.hidesPrompt === false,
  };
});
//@ chunk-czq1j3j2.js:1462075-1462127 placement
function isLocalJsxPromptVisible(request) {
  return LOCAL_JSX_PROMPT_VISIBILITY[request.kind]?.(request.payload) ?? false;
}
//@ chunk-czq1j3j2.js:1462127-1462329 placement
function useHasBlockingDialog() {
  let $ = useMemoCache(3);
  let dialogStore = useDialogStore();
  let hasBottomSurface = getActiveBottomSurface() !== null;
  let computeCached;
  if ($[0] !== dialogStore || $[1] !== hasBottomSurface) {
    computeCached = () => {
      let state = dialogStore.getState();
      return hasVisibleUserDialog(state) || (!hasBottomSurface && topAutoDialog(state) !== null);
    };
    $[0] = dialogStore;
    $[1] = hasBottomSurface;
    $[2] = computeCached;
  } else computeCached = $[2];
  let store = computeCached;
  return useSyncExternalStore(dialogStore.subscribe, store, store);
}
//@ chunk-czq1j3j2.js:1462329-1462459 placement
function useHasOpenDialog() {
  let $ = useMemoCache(2);
  let dialogStore = useDialogStore();
  let selector;
  if ($[0] !== dialogStore) {
    selector = () => hasVisibleUserDialog(dialogStore.getState());
    $[0] = dialogStore;
    $[1] = selector;
  } else selector = $[1];
  let hasOpen = selector;
  return useSyncExternalStore(dialogStore.subscribe, hasOpen, hasOpen);
}
//@ chunk-czq1j3j2.js:1462459-1462512 placement
function hasVisibleUserDialog(state) {
  let top = topUserDialog(state);
  return top !== null && !isLocalJsxPromptVisible(top);
}
//@ chunk-czq1j3j2.js:1462512-1462590 placement
function hasNonBlockingAutoDialog(state) {
  return state.open.some(
    (request) => request.userInvoked !== true && !NON_BLOCKING_DIALOG_KINDS.has(request.kind),
  );
}
//@ chunk-czq1j3j2.js:1462590-1462663 placement
function hasAutoDialogWithoutMeta(state) {
  return hasNonBlockingAutoDialog({
    open: state.open.filter((request) => dialogCueBehindDraft(DIALOG_KIND_META, request) === undefined),
  });
}
//@ chunk-czq1j3j2.js:1462663-1462721 placement
function isDialogKindBlocking(state, userFacing) {
  let topDialog = userFacing ? topBlockingDialog(state) : topAutoDialog(state);
  return dialogWaitingForLabel(topDialog?.kind);
}
//@ chunk-czq1j3j2.js:1462721-1462881 placement
function useHasModalDialog() {
  let $ = useMemoCache(3);
  let dialogStore = useDialogStore();
  let renderMode = useRenderMode();
  let selector;
  if ($[0] !== renderMode || $[1] !== dialogStore) {
    selector = () => hasModalDialog(dialogStore.getState(), renderMode);
    $[0] = renderMode;
    $[1] = dialogStore;
    $[2] = selector;
  } else selector = $[2];
  let hasModal = selector;
  return useSyncExternalStore(dialogStore.subscribe, hasModal, hasModal);
}
//@ chunk-czq1j3j2.js:1462881-1463204 placement
/**
 * 判断当前是否有以模态方式显示的用户对话框（对话框存储或本地 JSX 命令）。
 */
function useHasModalUserDialog() {
  let $ = useMemoCache(6);
  let dialogStore = useDialogStore();
  let renderMode = useRenderMode();
  let autoDialogKind = useAutoDialogKind();
  let selector;
  if ($[0] !== renderMode || $[1] !== dialogStore) {
    selector = () => {
      let top = topUserDialog(dialogStore.getState());
      return top !== null && dialogLayout(DIALOG_KIND_META, top, renderMode) === "modal";
    };
    $[0] = renderMode;
    $[1] = dialogStore;
    $[2] = selector;
  } else selector = $[2];
  let userModalSelector = selector;
  let result = useSyncExternalStore(dialogStore.subscribe, userModalSelector, userModalSelector);
  let autoModal;
  if ($[3] !== renderMode || $[4] !== autoDialogKind) {
    autoModal =
      autoDialogKind !== null && dialogLayout(DIALOG_KIND_META, autoDialogKind, renderMode) === "modal";
    $[3] = renderMode;
    $[4] = autoDialogKind;
    $[5] = autoModal;
  } else autoModal = $[5];
  return autoModal || result;
}
//@ chunk-czq1j3j2.js:1463204-1463313 placement
function hasModalDialog(state, renderMode) {
  let autoTop = topAutoDialog(state);
  let userTop = topUserDialog(state);
  return (
    (autoTop !== null && dialogLayout(DIALOG_KIND_META, autoTop, renderMode) === "modal") ||
    (userTop !== null && dialogLayout(DIALOG_KIND_META, userTop, renderMode) === "modal")
  );
}
//@ chunk-czq1j3j2.js:1463313-1463349 placement
function dialogEntry(kind, payload) {
  return {
    [kind.kind]: payload,
  };
}
//@ chunk-czq1j3j2.js:1463349-1465032 placement
/**
 * 对话框注册表：每个 kind 的定义对象经 gl(def, Component) 注册到这里，DialogHost 按 kind 查组件渲染；部分 kind 由可选 chunk 提供。
 */
var DIALOG_REGISTRY; // deferred: uses dialogEntry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1463349", () => {
  DIALOG_REGISTRY = {
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
    ...dialogEntry(useCaseSpec, DesktopUpsellStartupView),
    ...dialogEntry(FULLSCREEN_UPSELL_DIALOG, FullscreenUpsellDialog),
    ...(STARTUP_MODEL_SWITCH_MODULE && STARTUP_MODEL_SWITCH_VIEW
      ? dialogEntry(STARTUP_MODEL_SWITCH_MODULE.startupModelSwitchDialog, STARTUP_MODEL_SWITCH_VIEW)
      : {}),
    ...(IMPORT_REVIEW_OFFER_MODULE && IMPORT_REVIEW_OFFER_VIEW
      ? dialogEntry(IMPORT_REVIEW_OFFER_MODULE.importReviewOfferDialog, IMPORT_REVIEW_OFFER_VIEW)
      : {}),
    ...(EFFORT_AUTO_NUDGE_MODULE && EFFORT_AUTO_NUDGE_VIEW
      ? dialogEntry(EFFORT_AUTO_NUDGE_MODULE.livePreviewShareDialog, EFFORT_AUTO_NUDGE_VIEW)
      : {}),
    ...(ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE && ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW
      ? dialogEntry(
          ACCOUNT_MEMORY_EDIT_CONFIRM_MODULE.effortAutoNudgeDialog,
          ACCOUNT_MEMORY_EDIT_CONFIRM_VIEW,
        )
      : {}),
    ...(ACCOUNT_MEMORY_EVERYWHERE_MODULE && ACCOUNT_MEMORY_EVERYWHERE_VIEW
      ? dialogEntry(
          ACCOUNT_MEMORY_EVERYWHERE_MODULE.accountMemoryEditConfirmDialog,
          ACCOUNT_MEMORY_EVERYWHERE_VIEW,
        )
      : {}),
    ...(SECRET_PROMPT_MODULE && SECRET_PROMPT_VIEW
      ? dialogEntry(SECRET_PROMPT_MODULE.accountMemoryEverywhereConfirmDialog, SECRET_PROMPT_VIEW)
      : {}),
    ...(ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE && ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW
      ? dialogEntry(
          ACCOUNT_MEMORY_WRITE_PERMISSION_MODULE.secretPromptDialog,
          ACCOUNT_MEMORY_WRITE_PERMISSION_VIEW,
        )
      : {}),
    ...(SLACK_CONNECT_DIALOGS_MODULE && SLACK_CONNECT_DIALOG_SPECS
      ? dialogEntry(
          SLACK_CONNECT_DIALOGS_MODULE.accountMemoryWritePermissionDialog,
          SLACK_CONNECT_DIALOG_SPECS,
        )
      : {}),
    ...dialogEntry(MCP_ELICITATION_DIALOG, McpElicitationDialogView),
    ...dialogEntry(MCP_ELICITATION_WAITING_DIALOG, McpElicitationWaitingDialogView),
    ...dialogEntry(MCP_URL_ELICITATION_DIALOG, McpUrlElicitationDialogView),
    ...dialogEntry(PERMISSION_PROMPT_DIALOG, ConnectorFileSendPermissionView),
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
    ...(ContinueInProjectsComposeDialog && continueInProjectsComposeDialog
      ? dialogEntry(continueInProjectsComposeDialog, ContinueInProjectsComposeDialog)
      : {}),
    ...(ContinueInProjectsRemoteControlDialog && continueInProjectsRemoteControlDialog
      ? dialogEntry(continueInProjectsRemoteControlDialog, ContinueInProjectsRemoteControlDialog)
      : {}),
    ...(OPTIONAL_DIALOG_KIND_5 && OPTIONAL_DIALOG_VIEW_5
      ? dialogEntry(OPTIONAL_DIALOG_VIEW_5, OPTIONAL_DIALOG_KIND_5)
      : {}),
    ...(OPTIONAL_DIALOG_KIND_6 && OPTIONAL_DIALOG_VIEW_6
      ? dialogEntry(OPTIONAL_DIALOG_VIEW_6.confirmPromptDialog, OPTIONAL_DIALOG_KIND_6)
      : {}),
    ...(OPTIONAL_DIALOG_KIND_6 && OPTIONAL_DIALOG_VIEW_6
      ? dialogEntry(OPTIONAL_DIALOG_VIEW_6.connectPromptDialog, OPTIONAL_DIALOG_KIND_6)
      : {}),
    ...(SLACK_SIGN_IN_OFFER_VIEW && SLACK_SIGN_IN_OFFER_SPEC
      ? Object.assign(
          {},
          ...SLACK_SIGN_IN_OFFER_SPEC.slackConnectDialogs.map((slackConnectDialog) =>
            dialogEntry(slackConnectDialog, SLACK_SIGN_IN_OFFER_VIEW.SlackConnectConsentDialog),
          ),
        )
      : {}),
    ...(OPTIONAL_COMPARE_MODELS_KIND && HOME_PAGE
      ? dialogEntry(HOME_PAGE.slackSignInOfferDialog, OPTIONAL_COMPARE_MODELS_KIND.SlackSignInOfferDialog)
      : {}),
    ...(STATE_ROW_SOURCE_CONTEXT && OPTIONAL_COMPARE_MODELS_WRAPPER
      ? dialogEntry(STATE_ROW_SOURCE_CONTEXT, OPTIONAL_COMPARE_MODELS_WRAPPER)
      : {}),
    ...dialogEntry(autoModeSetupReviewDialogDef, autoModeSetupReviewDialog),
    ...dialogEntry(AUTO_MODE_SETUP_FLAGGED_DIALOG, autoModeSetupFlaggedDialog),
  };
});
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
