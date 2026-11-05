/**
 * remote/tools/serve/sessionApprovals.ts
 *
 * 2.1.316 新增：会话级批准的保留与需要批准/已确认信封
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-azq8n2fy.js (1), chunk-nvm0wye1.js (9)
 * attribution: placement 10
 */
import { singlePrefixRuleFor } from "../../../tools/PowerShellTool/PowerShellTool.js";
import {
  isWindowsSandboxPolicyViolation,
  MAX_SESSION_APPROVALS,
  MAX_SESSION_APPROVAL_BATCH,
} from "./servingState.js";
import { stableHashWithSalt } from "../../../utils/stableHash.js";
import { omitAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { isRepoTierFreezeHeld, getAutoModeConfig } from "../../../utils/settings/settings.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, numberSchema } from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-azq8n2fy.js:1111-1242 placement
/**
 * （切分错误，权限 UI）规则是否就是当前提供的常驻规则。
 */
function matchesOfferedWindowsSandboxRule(rule, offer) {
  let offeredRule = singlePrefixRuleFor(offer.offered, offer.toolName);
  return (
    isWindowsSandboxPolicyViolation() &&
    offeredRule !== undefined &&
    rule.toolName === offeredRule.toolName &&
    rule.ruleContent === offeredRule.ruleContent
  );
}
//@ chunk-nvm0wye1.js:6777-6865 placement
function matchesApprovedCall(approved, toolName, input) {
  return (
    toolName === approved.toolName &&
    stableHashWithSalt(toolName, omitAlias(input, [HOST_TOOL_INPUT_FIELD, DEVICE_2])) ===
      stableHashWithSalt(toolName, approved.evaluatedInput)
  );
}
//@ chunk-nvm0wye1.js:6865-7081 placement
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
//@ chunk-nvm0wye1.js:7081-8495 placement
async function keepStandingApprovals(session, permissionUpdates, facts, options) {
  if (permissionUpdates === undefined || permissionUpdates.length === 0 || !shouldShowAlwaysAllowOptions())
    return;
  let standingUpdates = sanitizePermissionUpdates(
    permissionUpdates.flatMap((update) => {
      let parsed = permissionUpdateSchema().safeParse(update);
      let [firstRule, ...extraRules] =
        parsed.success && parsed.data.type === "addRules" && parsed.data.behavior === "allow"
          ? parsed.data.rules
          : [];
      return firstRule !== undefined &&
        extraRules.length === 0 &&
        (firstRule.ruleContent?.length ?? 0) <= SANDBOX_MAX_PATH_LENGTH &&
        matchesOfferedWindowsSandboxRule(firstRule, options)
        ? [
            {
              type: "addRules",
              behavior: "allow",
              destination: "session",
              rules: [firstRule],
            },
          ]
        : [];
    }),
  );
  if (standingUpdates.length > 0) {
    session.offeredStandingUpdates = [...session.offeredStandingUpdates, ...standingUpdates].slice(
      -MAX_SESSION_APPROVALS,
    );
    logRemoteTools(facts.callId, "offered standing rule held", {
      rules: standingUpdates.length,
    });
  }
  let flattened = permissionUpdates.flatMap((update) => {
    let parsed = permissionUpdateSchema().safeParse(update);
    return parsed.success &&
      parsed.data.type === "addRules" &&
      parsed.data.behavior === "allow" &&
      parsed.data.rules.length > 0 &&
      parsed.data.rules.length <= MAX_SESSION_APPROVAL_BATCH &&
      parsed.data.rules.every(
        (rule) =>
          rule.toolName.length <= SANDBOX_MAX_PATH_LENGTH &&
          (rule.ruleContent?.length ?? 0) <= SANDBOX_MAX_PATH_LENGTH &&
          isExactCommandRule(rule, options),
      )
      ? [parsed.data]
      : [];
  });
  let sessionUpdates = sanitizePermissionUpdates(
    flattened.map((update) =>
      update.destination === "session" || update.destination === "localSettings"
        ? update
        : {
            ...update,
            destination: "session",
          },
    ),
  );
  let filtered = sessionUpdates.filter((update) => update.destination === "session");
  let filtered_2 = sessionUpdates.filter((update) => update.destination === "localSettings");
  if (
    sessionUpdates.length > 0 &&
    flattened.some((update) => update.destination !== "session" && update.destination !== "localSettings")
  )
    facts.destinationDowngraded = true;
  let heldUpdates = isRepoTierFreezeHeld()
    ? filtered_2.map((update) => ({
        ...update,
        destination: "session",
      }))
    : [];
  if (filtered.length + heldUpdates.length > 0)
    session.sessionPermissionUpdates = [
      ...session.sessionPermissionUpdates,
      ...filtered,
      ...heldUpdates,
    ].slice(-MAX_SESSION_APPROVALS);
  if (filtered_2.length > 0) await persistPermissionUpdates(filtered_2);
  if (sessionUpdates.length > 0)
    logRemoteTools(facts.callId, "standing approval kept", {
      session_rules: filtered.length,
      local_settings_rules: filtered_2.length,
      downgraded: facts.destinationDowngraded,
    });
}
//@ chunk-nvm0wye1.js:8495-8666 placement
function isExactCommandRule(rule, options) {
  let command = options.input.command;
  return (
    rule.toolName === options.toolName &&
    typeof command === "string" &&
    rule.ruleContent !== undefined &&
    rule.ruleContent === command.trim() &&
    !rule.ruleContent.includes("*")
  );
}
//@ chunk-nvm0wye1.js:8666-8824 placement
function autoModeRulesField(hostRules) {
  if (hostRules === "none") return;
  let config = asIs(getAutoModeConfig());
  let wireRules = autoModeRulesForWire(
    hostRules === "full"
      ? config
      : {
          soft_deny: config?.soft_deny,
          hard_deny: config?.hard_deny,
        },
  );
  return wireRules === undefined
    ? undefined
    : {
        auto_mode: wireRules,
      };
}
//@ chunk-nvm0wye1.js:8824-8848 placement
function asIs(autoModeConfig) {
  return autoModeConfig;
}
//@ chunk-nvm0wye1.js:8848-10059 placement
function needsApprovalEnvelope(params) {
  let message = clipText(params.ask.message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "needs_approval",
      ...(params.facts.envelope && {
        call_id: params.facts.envelope.call_id,
      }),
      target: params.target,
      ask_id: params.askId,
      tool: params.toolName,
      input: params.ask.input,
      message,
      ...(params.ask.decisionReason !== undefined && {
        decision_reason: params.ask.decisionReason,
      }),
      ...(params.ask.suggestions.length > 0 && {
        suggestions: [...params.ask.suggestions],
      }),
      classifier_eligible: params.ask.classifierEligible,
      prior_answer_ok: params.ask.priorAnswerOk,
      ...(params.ask.unreadableLineOnly && {
        unreadable_line_only: true,
      }),
      ...(params.notes.length > 0 && {
        notes: [...params.notes],
      }),
      ...(params.ask.classifierEligible && autoModeRulesField(params.hostRules)),
      elicitation: {
        mode: "form",
        message,
        requestedSchema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              enum: ["allow", "deny"],
              description: `Whether ${params.toolName} may run this call on ${params.target.name}`,
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
            ask_id: params.askId,
            ...(params.facts.envelope && {
              call_id: params.facts.envelope.call_id,
            }),
            input_fingerprint: params.inputFingerprint,
            classifier_eligible: params.ask.classifierEligible,
            prior_answer_ok: params.ask.priorAnswerOk,
          },
        },
      },
    },
    content: [
      {
        type: "text",
        text: `${params.toolName} on ${params.target.name} needs approval in this session before it runs: ${message}`,
      },
    ],
  };
}
//@ chunk-nvm0wye1.js:10059-10276 placement
function acknowledgedEnvelope(target, facts, askId) {
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "acknowledged",
      ...(facts.envelope && {
        call_id: facts.envelope.call_id,
      }),
      target,
      ask_id: askId,
    },
    content: [
      {
        type: "text",
        text: `The refusal was recorded on ${target.name} \u2014 nothing ran.`,
      },
    ],
  };
}
//@ chunk-nvm0wye1.js:10276-10309 placement
var ASK_WAIT_SCHEMA = DoctorLazy(() =>
  objectSchema({
    askWaitMs: numberSchema(),
  }),
);
export {
  sessionDeclineDenial,
  acknowledgedEnvelope,
  keepStandingApprovals,
  needsApprovalEnvelope,
  ASK_WAIT_SCHEMA,
  matchesApprovedCall,
};
