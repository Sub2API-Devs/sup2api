/**
 * components/dialogs/dialogKinds.ts
 *
 * 2.1.316 新增。对话框种类定义（kind/payload/result/default）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (27)
 * attribution: placement 24, layout 3
 */
import { withHideWhile } from "./dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  _enum,
  union,
  literal,
  custom,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  COST_THRESHOLD,
  AUTOCOMPACT_OFFER,
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2,
  AUTO_DEFAULT_NUDGE,
  EFFORT_MEDIUM_NUDGE,
  PROGRAM_USE_CASE_QUESTION,
} from "../nudges/nudgeIds.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  MCP_ELICITATION_DIALOG,
  MCP_ELICITATION_WAITING_DIALOG,
  MCP_URL_ELICITATION_DIALOG,
} from "../../services/mcp/elicitationDialogs.js";
import {
  ASK_USER_QUESTION_PERMISSION_CARD,
  BASH_PERMISSION_CARD,
  FILE_PERMISSION_CARD,
  POWERSHELL_PERMISSION_CARD,
  WEBFETCH_PERMISSION_CARD,
  SKILL_PERMISSION_CARD,
  MONITOR_PERMISSION_CARD,
  ENTER_PLAN_MODE_PERMISSION_CARD,
  EXIT_PLAN_MODE_V2_PERMISSION_CARD,
  PUBLISH_PLUGIN_PERMISSION_CARD,
  PUBLISH_WAITING_MESSAGE,
  BROWSER_PERMISSION_CARD,
} from "../permissions/permissionCardKinds.js";
import { PERMISSION_PROMPT_DIALOG } from "../../utils/agentContext.js";
import { sandboxNetworkAccessDialogDef } from "../../screens/repl/SandboxNetworkPrompts.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import { IT2_SETUP_DIALOG } from "../../utils/swarm/it2SetupResult.js";
import { serverFallbackNoticeSpec } from "../../utils/permissions/serverClassifier/fallbackNotice.js";
import { RESUME_COMPACT_DIALOG } from "../../screens/repl/resumeCompactOffer.js";
import { managedSettingsSecurityDialogDef } from "../../screens/repl/StartupNudges.js";
import {
  IDE_ONBOARDING_DIALOG,
  LEFT_ARROW_CONFIRM_DIALOG,
  LSP_RECOMMENDATION_DIALOG,
  PLUGIN_HINT_DIALOG,
} from "../../screens/replDialogState.js";
import { REMOTE_CALLOUT_DIALOG } from "../RemoteCallout.js";
import { ULTRAPLAN_LAUNCH_DIALOG, ULTRAPLAN_CHOICE_DIALOG_SPEC } from "../../commands/ultraplan.js";
import { FULLSCREEN_UPSELL_DIALOG } from "../FullscreenUpsellDialog.js";
import { GOAL_PROPOSAL_DIALOG } from "../goal/goalProposalDialog.js";
import { REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { FABLE_OVERAGE_CONSENT_DIALOG } from "../../services/api/overageConsent.js";
import { peerInboundApprovalDialogDef } from "../../utils/peerInbound/heldPeerMessages.js";
import {
  CHROME_INSTALL_UPSELL_DIALOG,
  CHROME_INSTALL_SETUP_DIALOG,
} from "../../utils/claudeInChrome/installUpsell.js";
import {
  DIALOG_KINDS_PLACEHOLDER,
  workflowDialogKindsModule,
  dialogKindsModuleA,
  dialogKindsModuleB,
  artifactsMcpEntryModule,
  bridgeCoordinatorModule,
  workflowPermissionDialog,
} from "../../screens/repl/SessionController.js";
import { init_react_production, useLayoutEffect } from "../../../vendor/react/cjs/react.production.js";
import { useDialogSelector } from "../../state/dialogQueue.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectIsEmpty } from "../../screens/repl/PromptDraft.js";
import { isVirtualPancakeEnabled } from "../../utils/permissions/permissionSetup.js";
import { addPastedEntry } from "../../history.js";
import { wrapUserTurnContent, escapePastedContentTag } from "../../utils/userTurnTags.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:353377-353818 placement
/**
 * auto-mode-setup flagged 对话框 spec：kind 为 auto_mode_setup_review 的变体，带通知文案。
 */
var autoModeSetupReviewDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AUTO_MODE_SETUP_FLAGGED_DIALOG;
deferInit("chunk-czq1j3j2.js:353377", () => {
  autoModeSetupReviewDialogDef = withHideWhile({
    kind: "auto_mode_setup_review",
    payload: DoctorLazy(() =>
      objectSchema({
        environment: array(stringSchema()),
        allow: array(stringSchema()),
        soft_deny: array(stringSchema()),
        hard_deny: array(stringSchema()),
        remove_from_permissions_allow: array(stringSchema()),
        notes: array(stringSchema()),
        mode: _enum(["append", "replace"]),
      }),
    ),
    result: DoctorLazy(() => _enum(["accept", "decline", "cancelled"])),
    default: "cancelled",
  });
  AUTO_MODE_SETUP_FLAGGED_DIALOG = withHideWhile({
    kind: "auto_mode_flagged_allow",
    payload: DoctorLazy(() =>
      objectSchema({
        flagged: array(stringSchema()),
        runId: stringSchema(),
      }),
    ),
    result: DoctorLazy(() =>
      union([
        objectSchema({
          toRemove: array(stringSchema()),
        }),
        literal("cancelled"),
      ]),
    ),
    default: "cancelled",
  });
});
//@ chunk-czq1j3j2.js:353818-353881 placement
var EMPTY_SANDBOX_FLAGS = {
  clipboardRead: false,
  clipboardWrite: false,
  systemKeyCombos: false,
};
//@ chunk-czq1j3j2.js:353881-354070 placement
var computerUseApprovalDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:353881", () => {
  computerUseApprovalDialogDef = withHideWhile({
    kind: "computer_use_approval",
    payload: DoctorLazy(() => custom((payload) => typeof payload === "object" && payload !== null)),
    result: DoctorLazy(() => custom((result) => typeof result === "object" && result !== null)),
    default: {
      granted: [],
      denied: [],
      flags: EMPTY_SANDBOX_FLAGS,
    },
  });
});
//@ chunk-czq1j3j2.js:354070-354179 placement
var costThresholdDialogDef; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:354070", () => {
  costThresholdDialogDef = withHideWhile({
    kind: COST_THRESHOLD,
    payload: DoctorLazy(() => objectSchema({})),
    result: DoctorLazy(() => _enum(["acknowledged", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-czq1j3j2.js:354179-354336 placement
async function acknowledgeCostThreshold(requestDialog, storageV5) {
  if ((await requestDialog(costThresholdDialogDef, {})) === "cancelled") return;
  saveGlobalConfig(
    (config) => ({
      ...config,
      hasAcknowledgedCostThreshold: true,
    }),
    storageV5,
  );
  logEvent("tengu_cost_threshold_acknowledged", {});
}
//@ chunk-czq1j3j2.js:356195-356206 placement
var OPTIONAL_WORKFLOW_DIALOG_KINDS_1 = {};
//@ chunk-czq1j3j2.js:356206-356217 placement
var OPTIONAL_WORKFLOW_DIALOG_KINDS_2 = {};
//@ chunk-czq1j3j2.js:356217-356235 placement
var OPTIONAL_WORKFLOW_DIALOG_META_2 = {};
var OPTIONAL_WORKFLOW_DIALOG_KINDS_3 = {};
//@ chunk-czq1j3j2.js:356235-356253 layout
var OPTIONAL_WORKFLOW_DIALOG_META_3 = {};
var OPTIONAL_WORKFLOW_DIALOG_META_5 = {};
//@ chunk-czq1j3j2.js:356253-356350 placement
var OPTIONAL_WORKFLOW_DIALOG_META_4; // deferred: uses MCP_ELICITATION_DIALOG (../../services/mcp/elicitationDialogs.js) of its import cycle while loading; runs once the cycle is complete
var PERMISSION_NEEDED_NOTIFICATION;
var ELICITATION_DIALOG_KINDS;
deferInit("chunk-czq1j3j2.js:356253", () => {
  OPTIONAL_WORKFLOW_DIALOG_META_4 = {};
  PERMISSION_NEEDED_NOTIFICATION = {
    text: "Claude needs your permission",
  };
  ELICITATION_DIALOG_KINDS = [
    MCP_ELICITATION_DIALOG.kind,
    MCP_ELICITATION_WAITING_DIALOG.kind,
    MCP_URL_ELICITATION_DIALOG.kind,
    ...[],
    ...[],
  ];
});
//@ chunk-czq1j3j2.js:356350-356410 placement
function isElicitationDialogKind(blockingDialogKind) {
  return typeof blockingDialogKind === "string" && ELICITATION_DIALOG_KINDS.includes(blockingDialogKind);
}
//@ chunk-czq1j3j2.js:356410-356518 placement
var PERMISSION_CARD_KINDS; // deferred: uses ASK_USER_QUESTION_PERMISSION_CARD (../permissions/permissionCardKinds.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:356410", () => {
  PERMISSION_CARD_KINDS = [
    ASK_USER_QUESTION_PERMISSION_CARD.kind,
    PERMISSION_PROMPT_DIALOG.kind,
    BASH_PERMISSION_CARD.kind,
    FILE_PERMISSION_CARD.kind,
    POWERSHELL_PERMISSION_CARD.kind,
    WEBFETCH_PERMISSION_CARD.kind,
    SKILL_PERMISSION_CARD.kind,
    MONITOR_PERMISSION_CARD.kind,
    sandboxNetworkAccessDialogDef.kind,
    ENTER_PLAN_MODE_PERMISSION_CARD.kind,
    EXIT_PLAN_MODE_V2_PERMISSION_CARD.kind,
  ];
});
//@ chunk-czq1j3j2.js:356518-356594 placement
function parseLocalJsxDialogPayload(payload) {
  let parsed = LOCAL_JSX_DIALOG.payload().safeParse(payload);
  return parsed.success ? parsed.data : null;
}
//@ chunk-czq1j3j2.js:356594-356617 layout
var SESSION_OWNER = "session-owner";
//@ chunk-czq1j3j2.js:356617-356708 layout
function isSessionOwnerDialogOpen(state) {
  return state.open.some(
    (entry) =>
      entry.kind === LOCAL_JSX_DIALOG.kind &&
      parseLocalJsxDialogPayload(entry.payload)?.commandName === SESSION_OWNER,
  );
}
//@ chunk-czq1j3j2.js:356708-360756 placement
/**
 * 对话框 kind → 元数据表：layout(fullscreen/modal/bottom/inline)、waitingFor 文案、终端通知（"Claude needs your permission" 等）、是否立即显示。
 */
var DIALOG_KIND_META; // deferred: uses LOCAL_JSX_DIALOG (../../commands/rate-limit-options/index.js) of its import cycle while loading; runs once the cycle is complete
var NEEDS_INPUT_NOTIFICATION;
deferInit("chunk-czq1j3j2.js:356708", () => {
  DIALOG_KIND_META = {
    [LOCAL_JSX_DIALOG.kind]: {
      layout: (payload, renderMode) =>
        renderMode === "fullscreen"
          ? "modal"
          : parseLocalJsxDialogPayload(payload)?.immediate
            ? "bottom"
            : "inline",
    },
    [IT2_SETUP_DIALOG.kind]: {
      waitingFor: "input needed",
      needs: "choose: install the iTerm2 integration or use tmux",
      notification: {
        text: "Teammate setup needs your input",
        type: "agent_needs_input",
      },
    },
    [computerUseApprovalDialogDef.kind]: {
      needs: "choose: allow or deny the computer-use action",
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [costThresholdDialogDef.kind]: {
      waitingFor: "dialog open",
    },
    [AUTOCOMPACT_OFFER]: {
      waitingFor: "dialog open",
    },
    [serverFallbackNoticeSpec.kind]: {
      waitingFor: "dialog open",
      needs: "acknowledge the classifier billing notice (Enter continues in auto mode)",
      notification: {
        text: "Auto mode has a classifier billing notice to acknowledge",
        type: "agent_needs_input",
      },
      layout: "bottom",
    },
    [RESUME_COMPACT_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    [COLD_RESUME_QUOTA]: {
      waitingFor: "dialog open",
    },
    [NEWER_MODEL_OFFER_2]: {
      waitingFor: "dialog open",
    },
    [managedSettingsSecurityDialogDef.kind]: {
      waitingFor: "dialog open",
      notification: {
        text: "Managed settings need your review before they apply",
      },
    },
    [IDE_ONBOARDING_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    [sandboxNetworkAccessDialogDef.kind]: {
      waitingFor: "sandbox request",
      notification: {
        text: "A sandboxed command needs network access",
      },
    },
    [LEFT_ARROW_CONFIRM_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    [REMOTE_CALLOUT_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    [ULTRAPLAN_LAUNCH_DIALOG.kind]: {
      waitingFor: "dialog open",
      needs: "choose: run ultraplan in the cloud",
    },
    [ULTRAPLAN_CHOICE_DIALOG_SPEC.kind]: {
      waitingFor: "dialog open",
      layout: "modal",
    },
    [LSP_RECOMMENDATION_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    [PLUGIN_HINT_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    [AUTO_DEFAULT_NUDGE]: {
      waitingFor: "dialog open",
      needs: "choose: make auto mode the default permission mode",
    },
    [EFFORT_MEDIUM_NUDGE]: {
      waitingFor: "dialog open",
    },
    [PROGRAM_USE_CASE_QUESTION]: {
      waitingFor: "dialog open",
    },
    [FULLSCREEN_UPSELL_DIALOG.kind]: {
      waitingFor: "dialog open",
    },
    ...{},
    ...OPTIONAL_WORKFLOW_DIALOG_KINDS_1,
    ...OPTIONAL_WORKFLOW_DIALOG_KINDS_2,
    ...OPTIONAL_WORKFLOW_DIALOG_META_2,
    ...OPTIONAL_WORKFLOW_DIALOG_KINDS_3,
    ...OPTIONAL_WORKFLOW_DIALOG_META_3,
    ...OPTIONAL_WORKFLOW_DIALOG_META_5,
    [MCP_ELICITATION_DIALOG.kind]: {
      waitingFor: "input needed",
      notification: (spec) => ({
        text: NEEDS_INPUT_NOTIFICATION,
        type: isUrlElicitationDialog(spec) ? "elicitation_url_dialog" : "elicitation_dialog",
      }),
      layout: "bottom",
    },
    [MCP_ELICITATION_WAITING_DIALOG.kind]: {
      waitingFor: "input needed",
      notification: (refusal) =>
        isWaitingElicitationDialog(refusal)
          ? {
              text: NEEDS_INPUT_NOTIFICATION,
              type: "elicitation_url_dialog",
            }
          : undefined,
      layout: "bottom",
    },
    [MCP_URL_ELICITATION_DIALOG.kind]: {
      waitingFor: "input needed",
      needs: "MCP input: open link",
      notification: {
        text: "An MCP server needs your input",
        type: "elicitation_url_dialog",
      },
      layout: "bottom",
    },
    [PERMISSION_PROMPT_DIALOG.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [WEBFETCH_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [SKILL_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [POWERSHELL_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [FILE_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [ASK_USER_QUESTION_PERMISSION_CARD.kind]: {
      waitingFor: "input needed",
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [ENTER_PLAN_MODE_PERMISSION_CARD.kind]: {
      notification: {
        text: "Claude Code wants to enter plan mode",
      },
    },
    [PUBLISH_PLUGIN_PERMISSION_CARD.kind]: {
      notification: {
        text: PUBLISH_WAITING_MESSAGE,
      },
    },
    [GOAL_PROPOSAL_DIALOG.kind]: {
      waitingFor: "goal proposal",
      notification: {
        text: "Claude proposed a session goal",
      },
    },
    [EXIT_PLAN_MODE_V2_PERMISSION_CARD.kind]: {
      notification: {
        text: "Claude Code needs your approval for the plan",
      },
      layout: "modal",
    },
    [MONITOR_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [BASH_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [REFUSAL_FALLBACK_DIALOG.kind]: {
      waitingFor: "dialog open",
      needs: "choose: retry on fallback model or edit prompt",
      notification: {
        text: "Session paused",
      },
    },
    [FABLE_OVERAGE_CONSENT_DIALOG.kind]: {
      waitingFor: "dialog open",
      needs: "choose: continue on usage credits or switch models",
      notification: {
        text: "Session paused",
      },
    },
    [BROWSER_PERMISSION_CARD.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    [peerInboundApprovalDialogDef.kind]: {
      notification: {
        text: "A message from another session needs your approval",
      },
    },
    [CHROME_INSTALL_UPSELL_DIALOG.kind]: {
      notification: {
        text: "Claude wants to use your browser",
      },
    },
    [CHROME_INSTALL_SETUP_DIALOG.kind]: {
      notification: {
        text: "Setting up Claude in Chrome",
      },
    },
    ...{},
    ...{},
    ...{},
    ...(DIALOG_KINDS_PLACEHOLDER && {
      [DIALOG_KINDS_PLACEHOLDER.kind]: {
        notification: {
          text: "Claude needs your approval for a review artifact",
        },
      },
    }),
    ...(workflowDialogKindsModule
      ? {
          [workflowDialogKindsModule.projectContinuePermissionDialog.kind]: {
            notification: {
              text: workflowDialogKindsModule.CONTINUE_NOTIFICATION,
            },
          },
        }
      : {}),
    ...(dialogKindsModuleA
      ? {
          [dialogKindsModuleA.continueInProjectsTargetDialog.kind]: {
            waitingFor: "dialog open",
            needs: "choose: the project this session is sent to",
          },
        }
      : {}),
    ...(dialogKindsModuleB
      ? {
          [dialogKindsModuleB.continueInProjectsMessageDialog.kind]: {
            waitingFor: "dialog open",
            needs: "confirm: the message sent to the project",
          },
        }
      : {}),
    ...(artifactsMcpEntryModule
      ? {
          [artifactsMcpEntryModule.continueInProjectsComposeDialog.kind]: {
            waitingFor: "dialog open",
            needs: "type: the message sent to the project",
          },
        }
      : {}),
    ...(bridgeCoordinatorModule
      ? {
          [bridgeCoordinatorModule.continueInProjectsRemoteControlDialog.kind]: {
            waitingFor: "dialog open",
            needs: "confirm: turning Remote Control on to send",
          },
        }
      : {}),
    ...{},
    ...{},
    [workflowPermissionDialog.kind]: {
      notification: PERMISSION_NEEDED_NOTIFICATION,
    },
    ...OPTIONAL_WORKFLOW_DIALOG_META_4,
    [autoModeSetupReviewDialogDef.kind]: {
      notification: {
        text: "Auto-mode setup proposal is ready for review",
      },
    },
    [AUTO_MODE_SETUP_FLAGGED_DIALOG.kind]: {
      notification: {
        text: "Auto-mode setup flagged some permission rules for review",
      },
    },
  };
  NEEDS_INPUT_NOTIFICATION = "Claude Code needs your input";
});
//@ chunk-czq1j3j2.js:360756-360850 placement
function isUrlElicitationDialog(payload) {
  let parsed = MCP_ELICITATION_DIALOG.payload().safeParse(payload);
  return parsed.success && parsed.data.params.mode === "url";
}
//@ chunk-czq1j3j2.js:360850-360946 placement
function isWaitingElicitationDialog(payload) {
  let parsed = MCP_ELICITATION_WAITING_DIALOG.payload().safeParse(payload);
  return parsed.success && parsed.data.waitingState === undefined;
}
//@ chunk-czq1j3j2.js:360946-361037 placement
function dialogNotification(meta, request) {
  let notification = meta[request.kind]?.notification;
  return typeof notification === "function" ? notification(request.payload) : notification;
}
//@ chunk-czq1j3j2.js:361037-361155 placement
function dialogLayout(meta, request, renderMode) {
  let layout = meta[request.kind]?.layout;
  if (layout === undefined) return "inline";
  return typeof layout === "function" ? layout(request.payload, renderMode) : layout;
}
//@ chunk-czq1j3j2.js:361155-361218 placement
function dialogCueBehindDraft(meta, request) {
  return meta[request.kind]?.cueBehindDraft?.(request.payload);
}
//@ chunk-czq1j3j2.js:361218-361298 placement
function dialogWaitingForLabel(kind) {
  return kind === undefined ? undefined : (DIALOG_KIND_META[kind]?.waitingFor ?? "permission prompt");
}
//@ chunk-czq1j3j2.js:541001-541005 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:541001", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:555966-556042 placement
function hasDraftHiddenCueDialog(state) {
  return state.open.some((request) => DIALOG_KIND_META[request.kind]?.draftHiddenCue !== undefined);
}
//@ chunk-czq1j3j2.js:556042-556126 placement
function hasSecretEligibleDialog(state) {
  return (
    hasDraftHiddenCueDialog(state) ||
    state.open.some((request) => DIALOG_KIND_META[request.kind]?.mayBeHandedASecret === true)
  );
}
//@ chunk-czq1j3j2.js:556126-556214 placement
function useHasSecretEligibleDialog(draft) {
  let dialogSelector = useDialogSelector(hasSecretEligibleDialog);
  let storeSelector = useStoreSelector(draft, selectIsEmpty);
  useLayoutEffect(() => {
    if (dialogSelector && !storeSelector) draft.markMaybeSecret();
  }, [draft, dialogSelector, storeSelector]);
}
//@ chunk-czq1j3j2.js:556214-556284 placement
function requestDialogWrapper(content, tag) {
  let wrapEnabled = isVirtualPancakeEnabled();
  return addPastedEntry(
    content,
    tag,
    wrapEnabled ? wrapUserTurnContent : undefined,
    wrapEnabled ? escapePastedContentTag : undefined,
  );
}
export {
  autoModeSetupReviewDialogDef,
  AUTO_MODE_SETUP_FLAGGED_DIALOG,
  useHasSecretEligibleDialog,
  hasDraftHiddenCueDialog,
  requestDialogWrapper,
  isElicitationDialogKind,
  SESSION_OWNER,
  EMPTY_SANDBOX_FLAGS,
  parseLocalJsxDialogPayload,
  dialogCueBehindDraft,
  DIALOG_KIND_META,
  dialogWaitingForLabel,
  dialogLayout,
  computerUseApprovalDialogDef,
  costThresholdDialogDef,
  dialogNotification,
  PERMISSION_CARD_KINDS,
  isSessionOwnerDialogOpen,
  acknowledgeCostThreshold,
};
