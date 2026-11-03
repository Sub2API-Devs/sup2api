/**
 * components/dialogs/dialogKinds.ts
 *
 * 2.1.316 新增。对话框种类定义（kind/payload/result/default）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (25)
 * attribution: placement 25
 */
import { withHideWhile } from "./dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, _enum, union, literal, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  COST_THRESHOLD,
  AUTOCOMPACT_OFFER,
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2,
  AUTO_DEFAULT_NUDGE,
  NUDGE_IDS,
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
import { useDialogSelector } from "../../state/dialogQueue.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectIsEmpty } from "../../screens/repl/PromptDraft.js";
import { zt, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { isVirtualPancakeEnabled } from "../../utils/permissions/permissionSetup.js";
import { addPastedEntry } from "../../history.js";
import { wrapUserTurnContent, escapePastedContentTag } from "../../utils/userTurnTags.js";

//@ chunk-18hwfzwa.js:529449-529890 placement
/**
 * auto-mode-setup flagged 对话框 spec：kind 为 auto_mode_setup_review 的变体，带通知文案。
 */
var autoModeSetupReviewDialogDef = withHideWhile({
  kind: "auto_mode_setup_review",
  payload: DoctorLazy(() =>
    u({
      environment: array(string()),
      allow: array(string()),
      soft_deny: array(string()),
      hard_deny: array(string()),
      remove_from_permissions_allow: array(string()),
      notes: array(string()),
      mode: _enum(["append", "replace"]),
    }),
  ),
  result: DoctorLazy(() => _enum(["accept", "decline", "cancelled"])),
  default: "cancelled",
});
var AUTO_MODE_SETUP_FLAGGED_DIALOG = withHideWhile({
  kind: "auto_mode_flagged_allow",
  payload: DoctorLazy(() =>
    u({
      flagged: array(string()),
      runId: string(),
    }),
  ),
  result: DoctorLazy(() =>
    union([
      u({
        toRemove: array(string()),
      }),
      literal("cancelled"),
    ]),
  ),
  default: "cancelled",
});
//@ chunk-18hwfzwa.js:529890-529953 placement
var EMPTY_SANDBOX_FLAGS = {
  clipboardRead: false,
  clipboardWrite: false,
  systemKeyCombos: false,
};
//@ chunk-18hwfzwa.js:529953-530142 placement
var computerUseApprovalDialogDef = withHideWhile({
  kind: "computer_use_approval",
  payload: DoctorLazy(() => hu((h) => typeof h === "object" && h !== null)),
  result: DoctorLazy(() => hu((h) => typeof h === "object" && h !== null)),
  default: {
    granted: [],
    denied: [],
    flags: EMPTY_SANDBOX_FLAGS,
  },
});
//@ chunk-18hwfzwa.js:530142-530251 placement
var costThresholdDialogDef = withHideWhile({
  kind: COST_THRESHOLD,
  payload: DoctorLazy(() => u({})),
  result: DoctorLazy(() => _enum(["acknowledged", "cancelled"])),
  default: "cancelled",
});
//@ chunk-18hwfzwa.js:530251-530408 placement
async function acknowledgeCostThreshold(requestDialog, storageV5) {
  if ((await requestDialog(costThresholdDialogDef, {})) === "cancelled") return;
  saveGlobalConfig(
    (L) => ({
      ...L,
      hasAcknowledgedCostThreshold: true,
    }),
    storageV5,
  );
  logEvent("tengu_cost_threshold_acknowledged", {});
}
//@ chunk-18hwfzwa.js:530408-530585 placement
var DIALOG_KINDS_PLACEHOLDER = null;
var workflowPermissionDialog = require("./chunk-vhnfh0m3.js").workflowPermissionDialog;
var workflowDialogKindsModule = require("./chunk-dkjq625a.js");
var dialogKindsModuleA = require("./chunk-c7qavzqd.js");
var dialogKindsModuleB = require("./chunk-j3dac3ab.js");
//@ chunk-18hwfzwa.js:530585-530596 placement
var OPTIONAL_WORKFLOW_DIALOG_KINDS_1 = {};
//@ chunk-18hwfzwa.js:530596-530614 placement
var OPTIONAL_WORKFLOW_DIALOG_KINDS_2 = {};
var OPTIONAL_WORKFLOW_DIALOG_META_2 = {};
//@ chunk-18hwfzwa.js:530614-530632 placement
var OPTIONAL_WORKFLOW_DIALOG_KINDS_3 = {};
var OPTIONAL_WORKFLOW_DIALOG_META_3 = {};
//@ chunk-18hwfzwa.js:530632-530722 placement
var OPTIONAL_WORKFLOW_DIALOG_META_4 = {};
var PERMISSION_NEEDED_NOTIFICATION = {
  text: "Claude needs your permission",
};
var ELICITATION_DIALOG_KINDS = [
  MCP_ELICITATION_DIALOG.kind,
  MCP_ELICITATION_WAITING_DIALOG.kind,
  MCP_URL_ELICITATION_DIALOG.kind,
  ...[],
];
//@ chunk-18hwfzwa.js:530722-530782 placement
function isElicitationDialogKind(blockingDialogKind) {
  return typeof blockingDialogKind === "string" && ELICITATION_DIALOG_KINDS.includes(blockingDialogKind);
}
//@ chunk-18hwfzwa.js:530782-530890 placement
var PERMISSION_CARD_KINDS = [
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
//@ chunk-18hwfzwa.js:530890-530966 placement
function parseLocalJsxDialogPayload(h) {
  let x = LOCAL_JSX_DIALOG.payload().safeParse(h);
  return x.success ? x.data : null;
}
//@ chunk-18hwfzwa.js:530966-534705 placement
/**
 * 对话框 kind → 元数据表：layout(fullscreen/modal/bottom/inline)、waitingFor 文案、终端通知（"Claude needs your permission" 等）、是否立即显示。
 */
var DIALOG_KIND_META = {
  [LOCAL_JSX_DIALOG.kind]: {
    layout: (h, x) =>
      x === "fullscreen" ? "modal" : parseLocalJsxDialogPayload(h)?.immediate ? "bottom" : "inline",
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
  [NUDGE_IDS]: {
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
  [MCP_ELICITATION_DIALOG.kind]: {
    waitingFor: "input needed",
    notification: (h) => ({
      text: NEEDS_INPUT_NOTIFICATION,
      type: isUrlElicitationDialog(h) ? "elicitation_url_dialog" : "elicitation_dialog",
    }),
    layout: "bottom",
  },
  [MCP_ELICITATION_WAITING_DIALOG.kind]: {
    waitingFor: "input needed",
    notification: (h) =>
      isWaitingElicitationDialog(h)
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
var NEEDS_INPUT_NOTIFICATION = "Claude Code needs your input";
//@ chunk-18hwfzwa.js:534705-534798 placement
function isUrlElicitationDialog(h) {
  let x = MCP_ELICITATION_DIALOG.payload().safeParse(h);
  return x.success && x.data.params.mode === "url";
}
//@ chunk-18hwfzwa.js:534798-534894 placement
function isWaitingElicitationDialog(h) {
  let x = MCP_ELICITATION_WAITING_DIALOG.payload().safeParse(h);
  return x.success && x.data.waitingState === undefined;
}
//@ chunk-18hwfzwa.js:534894-534985 placement
function dialogNotification(h, x) {
  let notification = h[x.kind]?.notification;
  return typeof notification === "function" ? notification(x.payload) : notification;
}
//@ chunk-18hwfzwa.js:534985-535103 placement
function dialogLayout(h, x, renderMode) {
  let layout = h[x.kind]?.layout;
  if (layout === undefined) return "inline";
  return typeof layout === "function" ? layout(x.payload, renderMode) : layout;
}
//@ chunk-18hwfzwa.js:535103-535166 placement
function dialogCueBehindDraft(h, x) {
  return h[x.kind]?.cueBehindDraft?.(x.payload);
}
//@ chunk-18hwfzwa.js:535166-535246 placement
function dialogWaitingForLabel(kind) {
  return kind === undefined ? undefined : (DIALOG_KIND_META[kind]?.waitingFor ?? "permission prompt");
}
//@ chunk-18hwfzwa.js:535246-535322 placement
function hasDraftHiddenCueDialog(h) {
  return h.open.some((x) => DIALOG_KIND_META[x.kind]?.draftHiddenCue !== undefined);
}
//@ chunk-18hwfzwa.js:535322-535419 placement
function hasSecretEligibleDialog(h) {
  return (
    hasDraftHiddenCueDialog(h) ||
    h.open.some((x) => DIALOG_KIND_META[x.kind]?.mayBeHandedASecret?.(x.payload) === true)
  );
}
//@ chunk-18hwfzwa.js:535419-535507 placement
function useHasSecretEligibleDialog(draft) {
  let dialogSelector = useDialogSelector(hasSecretEligibleDialog);
  let storeSelector = useStoreSelector(draft, selectIsEmpty);
  zt(() => {
    if (dialogSelector && !storeSelector) draft.markMaybeSecret();
  }, [draft, dialogSelector, storeSelector]);
}
//@ chunk-18hwfzwa.js:535507-535577 placement
function requestDialogWrapper(h, x) {
  let D = isVirtualPancakeEnabled();
  return addPastedEntry(h, x, D ? wrapUserTurnContent : undefined, D ? escapePastedContentTag : undefined);
}
//@ chunk-18hwfzwa.js:535577-535581 placement
init_react_production();
export {
  useHasSecretEligibleDialog,
  hasDraftHiddenCueDialog,
  requestDialogWrapper,
  isElicitationDialogKind,
  EMPTY_SANDBOX_FLAGS,
  parseLocalJsxDialogPayload,
  dialogCueBehindDraft,
  DIALOG_KIND_META,
  dialogWaitingForLabel,
  dialogLayout,
  computerUseApprovalDialogDef,
  costThresholdDialogDef,
  autoModeSetupReviewDialogDef,
  AUTO_MODE_SETUP_FLAGGED_DIALOG,
  dialogNotification,
  PERMISSION_CARD_KINDS,
  acknowledgeCostThreshold,
};
