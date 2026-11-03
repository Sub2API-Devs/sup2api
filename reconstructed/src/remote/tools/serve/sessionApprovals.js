/**
 * remote/tools/serve/sessionApprovals.ts
 *
 * 2.1.316 新增：会话级批准的保留与需要批准/已确认信封
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghnps9r.js (1), chunk-ad2e1aj6.js (9)
 * attribution: placement 10
 */
import { stableHashWithSalt } from "../../../utils/stableHash.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HOST_TOOL_INPUT_FIELD, DEVICE_2 } from "../../../bridge/deviceRegistration.js";
import { clipText, autoModeRulesForWire, ANTHROPIC_REMOTETOOLEXECUTION } from "../protocolSchemas.js";
import { REMOTE_CALL_SESSION_ANSWER } from "./servedPermissionDecision.js";
import { shouldShowAlwaysAllowOptions } from "../../../utils/permissions/permissionsLoader.js";
import {
  sanitizePermissionUpdates,
  persistPermissionUpdates,
} from "../../../utils/permissions/PermissionUpdate.js";
import { permissionUpdateSchema } from "../../../utils/hooks/hookSpecificOutput.js";
import { SANDBOX_MAX_PATH_LENGTH } from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import {
  MAX_SESSION_APPROVALS,
  MAX_SESSION_APPROVAL_BATCH,
  isWindowsSandboxPolicyViolation,
} from "./servingState.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { isRepoTierFreezeHeld, getAutoModeConfig } from "../../../utils/settings/settings.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, E } from "../../../../vendor/zod/v4/classic/schemas.js";
import { singlePrefixRuleFor } from "../../../tools/PowerShellTool/PowerShellTool.js";

//@ chunk-ad2e1aj6.js:6505-6593 placement
function matchesApprovedCall(e, toolName, s) {
  return (
    toolName === e.toolName &&
    stableHashWithSalt(toolName, Uo(s, [HOST_TOOL_INPUT_FIELD, DEVICE_2])) ===
      stableHashWithSalt(toolName, e.evaluatedInput)
  );
}
//@ chunk-ad2e1aj6.js:6593-6809 placement
function sessionDeclineDenial(feedback) {
  return {
    behavior: "deny",
    message:
      feedback !== undefined && feedback.trim() !== ""
        ? clipText(feedback)
        : "The person declined this call in the session \u2014 it did not run.",
    decisionReason: {
      type: "other",
      reason: REMOTE_CALL_SESSION_ANSWER,
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-ad2e1aj6.js:6809-8223 placement
async function keepStandingApprovals(e, permissionUpdates, facts, h) {
  if (permissionUpdates === undefined || permissionUpdates.length === 0 || !shouldShowAlwaysAllowOptions())
    return;
  let r = sanitizePermissionUpdates(
    permissionUpdates.flatMap((C) => {
      let P = permissionUpdateSchema().safeParse(C);
      let [x, ...Y] =
        P.success && P.data.type === "addRules" && P.data.behavior === "allow" ? P.data.rules : [];
      return x !== undefined &&
        Y.length === 0 &&
        (x.ruleContent?.length ?? 0) <= SANDBOX_MAX_PATH_LENGTH &&
        matchesOfferedWindowsSandboxRule(x, h)
        ? [
            {
              type: "addRules",
              behavior: "allow",
              destination: "session",
              rules: [x],
            },
          ]
        : [];
    }),
  );
  if (r.length > 0) {
    e.offeredStandingUpdates = [...e.offeredStandingUpdates, ...r].slice(-MAX_SESSION_APPROVALS);
    logRemoteTools(facts.callId, "offered standing rule held", {
      rules: r.length,
    });
  }
  let flattened = permissionUpdates.flatMap((C) => {
    let P = permissionUpdateSchema().safeParse(C);
    return P.success &&
      P.data.type === "addRules" &&
      P.data.behavior === "allow" &&
      P.data.rules.length > 0 &&
      P.data.rules.length <= MAX_SESSION_APPROVAL_BATCH &&
      P.data.rules.every(
        (rule) =>
          rule.toolName.length <= SANDBOX_MAX_PATH_LENGTH &&
          (rule.ruleContent?.length ?? 0) <= SANDBOX_MAX_PATH_LENGTH &&
          isExactCommandRule(rule, h),
      )
      ? [P.data]
      : [];
  });
  let y = sanitizePermissionUpdates(
    flattened.map((C) =>
      C.destination === "session" || C.destination === "localSettings"
        ? C
        : {
            ...C,
            destination: "session",
          },
    ),
  );
  let filtered = y.filter((C) => C.destination === "session");
  let filtered_2 = y.filter((C) => C.destination === "localSettings");
  if (y.length > 0 && flattened.some((C) => C.destination !== "session" && C.destination !== "localSettings"))
    facts.destinationDowngraded = true;
  let w = isRepoTierFreezeHeld()
    ? filtered_2.map((C) => ({
        ...C,
        destination: "session",
      }))
    : [];
  if (filtered.length + w.length > 0)
    e.sessionPermissionUpdates = [...e.sessionPermissionUpdates, ...filtered, ...w].slice(
      -MAX_SESSION_APPROVALS,
    );
  if (filtered_2.length > 0) await persistPermissionUpdates(filtered_2);
  if (y.length > 0)
    logRemoteTools(facts.callId, "standing approval kept", {
      session_rules: filtered.length,
      local_settings_rules: filtered_2.length,
      downgraded: facts.destinationDowngraded,
    });
}
//@ chunk-ad2e1aj6.js:8223-8394 placement
function isExactCommandRule(rule, n) {
  let command = n.input.command;
  return (
    rule.toolName === n.toolName &&
    typeof command === "string" &&
    rule.ruleContent !== undefined &&
    rule.ruleContent === command.trim() &&
    !rule.ruleContent.includes("*")
  );
}
//@ chunk-ad2e1aj6.js:8394-8552 placement
function autoModeRulesField(hostRules) {
  if (hostRules === "none") return;
  let n = asIs(getAutoModeConfig());
  let s = autoModeRulesForWire(
    hostRules === "full"
      ? n
      : {
          soft_deny: n?.soft_deny,
          hard_deny: n?.hard_deny,
        },
  );
  return s === undefined
    ? undefined
    : {
        auto_mode: s,
      };
}
//@ chunk-ad2e1aj6.js:8552-8576 placement
function asIs(autoModeConfig) {
  return autoModeConfig;
}
//@ chunk-ad2e1aj6.js:8576-9732 placement
function needsApprovalEnvelope(e) {
  let n = clipText(e.ask.message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "needs_approval",
      ...(e.facts.envelope && {
        call_id: e.facts.envelope.call_id,
      }),
      target: e.target,
      ask_id: e.askId,
      tool: e.toolName,
      input: e.ask.input,
      message: n,
      ...(e.ask.decisionReason !== undefined && {
        decision_reason: e.ask.decisionReason,
      }),
      ...(e.ask.suggestions.length > 0 && {
        suggestions: [...e.ask.suggestions],
      }),
      classifier_eligible: e.ask.classifierEligible,
      prior_answer_ok: e.ask.priorAnswerOk,
      ...(e.notes.length > 0 && {
        notes: [...e.notes],
      }),
      ...(e.ask.classifierEligible && autoModeRulesField(e.hostRules)),
      elicitation: {
        mode: "form",
        message: n,
        requestedSchema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              enum: ["allow", "deny"],
              description: `Whether ${e.toolName} may run this call on ${e.target.name}`,
            },
            feedback: {
              type: "string",
              description: "Optional words for Claude with the decision",
            },
          },
          required: ["decision"],
        },
        _meta: {
          [ANTHROPIC_REMOTETOOLEXECUTION]: {
            ask_id: e.askId,
            ...(e.facts.envelope && {
              call_id: e.facts.envelope.call_id,
            }),
            input_fingerprint: e.inputFingerprint,
            classifier_eligible: e.ask.classifierEligible,
            prior_answer_ok: e.ask.priorAnswerOk,
          },
        },
      },
    },
    content: [
      {
        type: "text",
        text: `${e.toolName} on ${e.target.name} needs approval in this session before it runs: ${n}`,
      },
    ],
  };
}
//@ chunk-ad2e1aj6.js:9732-9949 placement
function acknowledgedEnvelope(e, facts, askId) {
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "acknowledged",
      ...(facts.envelope && {
        call_id: facts.envelope.call_id,
      }),
      target: e,
      ask_id: askId,
    },
    content: [
      {
        type: "text",
        text: `The refusal was recorded on ${e.name} \u2014 nothing ran.`,
      },
    ],
  };
}
//@ chunk-ad2e1aj6.js:9949-9982 placement
var ASK_WAIT_SCHEMA = DoctorLazy(() =>
  u({
    askWaitMs: E(),
  }),
);
//@ chunk-5ghnps9r.js:1078-1209 placement
/**
 * （切分错误，权限 UI）规则是否就是当前提供的常驻规则。
 */
function matchesOfferedWindowsSandboxRule(e, o) {
  let t = singlePrefixRuleFor(o.offered, o.toolName);
  return (
    isWindowsSandboxPolicyViolation() &&
    t !== undefined &&
    e.toolName === t.toolName &&
    e.ruleContent === t.ruleContent
  );
}
export {
  sessionDeclineDenial,
  acknowledgedEnvelope,
  keepStandingApprovals,
  needsApprovalEnvelope,
  ASK_WAIT_SCHEMA,
  matchesApprovedCall,
};
